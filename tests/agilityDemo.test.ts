import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { validateEventRecording } from '../spec/agility.ts';
import { windowView, DEFAULT_MATCH } from '../src/agilityModel.ts';
import { buildSimilarityGroups, symmetricWholeScore } from '../src/agilityGrouping.ts';
import { compareObservationWindows } from '../src/agilityMatching.ts';

const generator = new URL('../scripts/generate-agility-demo.ts', import.meta.url);
test('the separately versioned emitter demo generator exists', () => assert.ok(existsSync(generator)));
const demo = async () => (await import('../scripts/generate-agility-demo.ts')).buildDemo();
const view = (r: Awaited<ReturnType<typeof demo>>['records'][number]) => windowView(r, { id:r.id+'-full',recordingId:r.id,startEvent:0,endEvent:r.events.length,reviewState:'unreviewed' });

test('eight seeded demo recordings preserve valid positive preceding PRI and physical units', async () => {
  const a=await demo(), b=await demo();
  assert.deepEqual(a,b);assert.equal(a.records.length,8);
  assert.equal(new Set(a.records.map(r=>r.captureId)).size,8);
  for(const r of a.records){
    assert.deepEqual(validateEventRecording(r),r);
    assert.equal(r.provenance.source,'synthetic');assert.equal(r.events[0].values.pri,null);
    for(let i=1;i<r.events.length;i++){
      assert.ok(Math.abs(r.events[i].t-r.events[i-1].t-r.events[i].values.pri!)<1e-7,r.id);
      assert.ok(r.events[i].values.pulseWidth===null||r.events[i].values.pulseWidth!<r.events[i].values.pri!,r.id);
    }
    assert.ok(r.events.every(e=>e.values.pulseWidth===null||e.values.pulseWidth>0));
  }
  assert.deepEqual(a.sourceGroups.flatMap(g=>g.recordingIds).sort(),a.records.map(r=>r.id).sort());
  const dwell=a.records.find(r=>r.id==='demo-a-dwell')!;
  assert.ok(dwell.events.slice(8,16).every(e=>JSON.stringify(e.values)===JSON.stringify(dwell.events[8].values)),'Dwell states hold every descriptor inside each block.');
  const shared=a.records.find(r=>r.id==='demo-a-shared')!,other=a.records.find(r=>r.id==='demo-b-shared')!;
  for(let i=0;i<shared.events.length;i++) assert.ok(Math.abs(shared.events[i].values.frequency!-other.events[i].values.frequency!*1000)<1e-8);
});

test('shared and noisy modes group by actual whole-window evidence while C remains uncertain', async () => {
  const {records}=await demo(), views=Object.fromEntries(records.map(r=>[r.id,view(r)]));
  const groups=buildSimilarityGroups(views,DEFAULT_MATCH);
  const memberships=groups.groups.map(g=>g.members.map(id=>id.replace(/-full$/,'')).sort()).sort();
  assert.deepEqual(memberships,[['demo-a-dwell','demo-a-dwell-noisy'],['demo-a-shared','demo-b-shared'],['demo-b-hop','demo-b-hop-noisy'],['demo-b-transition']].sort());
  assert.ok(groups.ineligible['demo-c-incomplete-full']);
  assert.ok(symmetricWholeScore(views['demo-a-shared'],views['demo-b-shared'],DEFAULT_MATCH)!>.99);
  const subset=buildSimilarityGroups(views,{...DEFAULT_MATCH,parameters:['frequency','pri']});
  assert.ok(!subset.ineligible['demo-c-incomplete-full']);
  assert.equal(subset.membership['demo-c-incomplete-full'],subset.membership['demo-a-shared-full']);
});

test('a transition suggests the exact shared interval without joining the whole-mode group', async () => {
  const {records}=await demo(), a=view(records.find(r=>r.id==='demo-a-shared')!), b=view(records.find(r=>r.id==='demo-b-transition')!);
  const match=compareObservationWindows(a,b,DEFAULT_MATCH);
  assert.ok(match);
  assert.equal(match.whole?.eligible,true);assert.ok(match.whole!.score<DEFAULT_MATCH.threshold);
  assert.equal(match.partial?.eligible,true);assert.ok(match.partial!.score>.99);
  assert.deepEqual([match.partial!.explanation.target.startEvent,match.partial!.explanation.target.endEvent],[0,64]);
  assert.deepEqual(b.points.slice(0,64).map(p=>p.values),a.points.map(p=>p.values));
});

test('all seven masks enforce real evidence and dropped detections retain observed gaps', async () => {
  const {records}=await demo(),views=Object.fromEntries(records.map(r=>[r.id,view(r)]));
  const quantities=['frequency','pri','pulse-width'] as const;
  const results=[];
  for(let bits=1;bits<8;bits++){
    const parameters=quantities.filter((_,i)=>bits&(1<<i)), settings={...DEFAULT_MATCH,parameters};
    const g=buildSimilarityGroups(views,settings);
    assert.equal(!!g.ineligible['demo-c-incomplete-full'],parameters.includes('pulse-width'));
    for(const group of g.groups)for(const a of group.members)for(const b of group.members) assert.ok(symmetricWholeScore(Object.values(views).find(v=>v.windowId===a)!,Object.values(views).find(v=>v.windowId===b)!,settings)!>=settings.threshold-1e-12);
    results.push({parameters,groups:g.groups.length,ineligible:Object.keys(g.ineligible).length});
  }
  const original=records[0],before=structuredClone(original);
  const dropped=structuredClone(original);dropped.id='test-observed-dropouts';
  dropped.events=dropped.events.filter((_,i)=>![10,11,27].includes(i));
  dropped.events.forEach((e,i)=>{e.values.pri=i?e.t-dropped.events[i-1].t:null;});
  assert.deepEqual(validateEventRecording(dropped),dropped);
  assert.equal(dropped.events[10].t,original.events[12].t);
  assert.equal(dropped.events[10].values.pri,original.events.slice(10,13).reduce((n,e)=>n+e.values.pri!,0));
  assert.deepEqual(original,before);
  console.info('Demo mask outcomes:',JSON.stringify(results));
  console.info('Demo default pair scores:',JSON.stringify([['demo-a-shared','demo-b-shared'],['demo-a-dwell','demo-a-dwell-noisy'],['demo-b-hop','demo-b-hop-noisy'],['demo-a-shared','demo-a-dwell'],['demo-a-shared','demo-b-hop'],['demo-a-dwell','demo-b-hop']].map(([a,b])=>({a,b,score:symmetricWholeScore(views[a],views[b],DEFAULT_MATCH)}))));
});

test('manifest fingerprints and byte regeneration retain exact source recordings', async () => {
  const {writeDemo}=await import('../scripts/generate-agility-demo.ts');
  const root=new URL('../datasets/agility-demo-v1/',import.meta.url), temporary=mkdtempSync(join(tmpdir(),'atlas-demo-'));
  try{
    writeDemo(temporary);
    const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
    for(const r of manifest.recordings){const raw=readFileSync(new URL(r.path,root),'utf8');assert.equal(createHash('sha256').update(raw).digest('hex'),r.sha256);assert.equal(readFileSync(join(temporary,r.path),'utf8'),raw);}
    assert.equal(readFileSync(join(temporary,'manifest.json'),'utf8'),readFileSync(new URL('manifest.json',root),'utf8'));
  }finally{rmSync(temporary,{recursive:true,force:true});}
});
