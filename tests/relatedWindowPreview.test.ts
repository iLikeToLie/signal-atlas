import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { controlView } from './helpers/agilityMapFixtures.ts';
import { compareObservationWindows } from '../src/agilityMatching.ts';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { sampledPoints } from '../src/agilityComparison.ts';

test('inline related-window preview geometry exists',()=>assert.ok(existsSync(new URL('../src/relatedWindowPreview.ts',import.meta.url))));
const geometry=async()=> (await import('../src/relatedWindowPreview.ts')).relatedWindowPreview;
test('equal whole windows overlay selected channels and converted units across the full extent',async()=>{
  const a=controlView(0),b=controlView(1),c=compareObservationWindows(a,b,DEFAULT_MATCH)!.preferred!;
  const p=(await geometry())(a,b,c)!;
  assert.deepEqual([p.startFraction,p.endFraction],[0,1]);
  assert.equal(p.channels.length,3);
  for(const channel of p.channels){assert.equal(channel.supported,true);assert.equal(channel.queryPath,channel.matchPath);}
});
test('partial overlays occupy the actual middle interval rather than stretching across the target',async()=>{
  const a=controlView(4),b=controlView(0),c=compareObservationWindows(a,b,DEFAULT_MATCH)!.preferred!;
  const p=(await geometry())(a,b,c)!;
  assert.deepEqual([p.startEvent,p.endEvent,p.startFraction,p.endFraction],[16,48,.25,.75]);
  for(const channel of p.channels){assert.equal(channel.queryPath,channel.matchPath);assert.notEqual(channel.contextPath,channel.matchPath);}
});
test('source-relative offsets and unequal whole windows use evidence scope, not counts or duration guesses',async()=>{
  const a=controlView(0),b=controlView(2);
  b.points=b.points.map(p=>({...p,index:p.index+100}));b.duration*=3;
  const c=compareObservationWindows(a,b,DEFAULT_MATCH)!.preferred!;
  const preview=await geometry(),p=preview(a,b,c)!;
  assert.deepEqual([p.windowStart,p.windowEnd,p.startEvent,p.endEvent,p.startFraction,p.endFraction],[100,164,100,164,0,1]);
  const short=controlView(4),whole=compareObservationWindows(short,a,DEFAULT_MATCH)!.whole!;
  const w=preview(short,a,whole)!;
  assert.deepEqual([w.startFraction,w.endFraction],[0,1]);
  assert.equal(preview({...a,windowId:'stale-selection'},b,c),null);
});
test('missing or incompatible channels have no comparison overlay and gaps remain broken',async()=>{
  const a=controlView(5),b=controlView(0),c=compareObservationWindows(a,b,DEFAULT_MATCH)!.preferred!;
  const preview=await geometry(),p=preview(a,b,c)!;
  const pw=p.channels.find(c=>c.quantity==='pulse-width')!;
  assert.equal(pw.supported,false);assert.equal(pw.queryPath,'');assert.equal(pw.matchPath,'');
  const gap=controlView(0,'gap');gap.points[20].values.frequency=null;gap.points[21].breaks=['frequency'];
  const g=preview(b,gap,compareObservationWindows(b,gap,DEFAULT_MATCH)!.whole!)!;
  assert.ok((g.channels[0].contextPath.match(/M/g)||[]).length>=2);
  assert.ok((g.channels[0].queryPath.match(/M/g)||[]).length>=2);
  const incompatible=controlView(1,'incompatible');incompatible.channels[0].unit='fu';
  const bad=preview(b,incompatible,compareObservationWindows(b,incompatible,DEFAULT_MATCH)!.preferred!)!;
  assert.equal(bad.channels[0].supported,false);
  const dense=controlView(0,'dense-query');dense.count=512;
  dense.points=Array.from({length:512},(_,i)=>({...structuredClone(b.points[i%64]),index:i,t:i*10,breaks:[]}));
  dense.duration=5110;dense.counts={frequency:512,pri:504,pulseWidth:512};
  const sparse=structuredClone(dense);sparse.windowId='dense-target';
  const samples=new Set(sampledPoints(sparse).map(p=>p.index)),missing=sparse.points.find(p=>p.index>100&&!samples.has(p.index))!;
  missing.values.frequency=null;
  const sampledGap=preview(dense,sparse,compareObservationWindows(dense,sparse,DEFAULT_MATCH)!.whole!)!;
  assert.ok((sampledGap.channels[0].queryPath.match(/M/g)||[]).length>=2,'Selected overlay must break across omitted target gaps.');
});
test('steady versus varying morphology stays visible and selected masks limit the preview',async()=>{
  const a=controlView(0),b=controlView(8),settings={...DEFAULT_MATCH,parameters:['frequency'] as ('frequency')[]};
  const p=(await geometry())(a,b,compareObservationWindows(a,b,settings)!.whole!)!;
  assert.equal(p.channels.length,1);
  assert.notEqual(p.channels[0].queryPath,p.channels[0].matchPath);
  assert.ok(new Set([...p.channels[0].queryPath.matchAll(/[,](\d+\.\d+)/g)].map(m=>m[1])).size>1);
});
