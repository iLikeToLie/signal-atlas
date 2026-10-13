import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDemo } from '../scripts/generate-agility-demo.ts';
import { DEFAULT_MATCH, windowView, emptyLibrary, addRecording, storeRecording, reviewWindow, reviewTargetsForWindow } from '../src/agilityModel.ts';
import { compareObservationWindows } from '../src/agilityMatching.ts';
import { buildSimilarityGroups } from '../src/agilityGrouping.ts';
import { comparisonCoverage } from '../src/agilityComparison.ts';
import { relatedWindowPreview } from '../src/relatedWindowPreview.ts';
import { mapPresentation } from '../src/agilityMapPresentation.ts';
const records=buildDemo().records;
const view=(id:string)=>{const r=records.find(r=>r.id===id)!;return windowView(r,{id,recordingId:id,startEvent:0,endEvent:r.events.length,reviewState:'unreviewed'});};
test('each half of a selected composite is suggested with exact source scope and separate coverage',()=>{
  const whole=view('demo-b-transition');
  for(const [id,start] of [['demo-a-shared',0],['demo-b-hop',64]] as const){
    const half=view(id),forward=compareObservationWindows(half,whole,DEFAULT_MATCH)!,reverse=compareObservationWindows(whole,half,DEFAULT_MATCH)!;
    assert.ok(reverse.qualifying);assert.equal(reverse.preferred!.kind,'query-partial');
    assert.ok(reverse.preferred!.score>.9999);
    assert.deepEqual([reverse.preferred!.explanation.query.startEvent,reverse.preferred!.explanation.query.endEvent],[start,start+64]);
    assert.deepEqual([reverse.preferred!.explanation.target.startEvent,reverse.preferred!.explanation.target.endEvent],[0,64]);
    assert.equal(reverse.preferred!.explanation.partial,true);
    assert.deepEqual(comparisonCoverage(whole,half,reverse.preferred!),{selected:.5,related:1,kind:'partial'});
    const preview=relatedWindowPreview(whole,half,reverse.preferred!)!;
    assert.equal(preview.axis,'selected');
    assert.deepEqual([preview.startFraction,preview.endFraction],[start/128,(start+64)/128]);
    assert.deepEqual(comparisonCoverage(half,whole,forward.preferred!),{selected:1,related:.5,kind:'contained'});
    const state=emptyLibrary();state.views={[whole.windowId]:whole,[half.windowId]:half};
    assert.equal(mapPresentation(state,whole.windowId,[reverse],4,false).edges[0].kind,'partial');
    assert.ok(mapPresentation(state,whole.windowId,[reverse],4,false).edges[0].label.includes('50% covered'));
    assert.equal(mapPresentation(state,half.windowId,[forward],4,false).edges[0].kind,'contained');
  }
  const g=buildSimilarityGroups(Object.fromEntries(records.map(r=>[r.id,view(r.id)])),DEFAULT_MATCH);
  assert.equal(g.groups.length,4);assert.notEqual(g.membership[whole.windowId],g.membership['demo-a-shared']);
});
test('different cross-emitter components of one imported window retain separate local patterns',async()=>{
  let state=emptyLibrary();const demo=buildDemo();
  for(const original of demo.records){
    const r=original.id==='demo-b-hop'?{...original,streamId:'imported-hop'}:original;
    const stream=demo.streams.find(s=>s.id===r.streamId)||{...demo.streams[0],id:r.streamId,name:'Third emitter'};
    state=addRecording(state,await storeRecording(r,JSON.stringify(r),r.id+'.json'),stream);
  }
  const get=(id:string)=>state.views[state.windows.find(w=>w.recordingId===id)!.id];
  const composite=get('demo-b-transition');
  for(const id of ['demo-a-shared','demo-b-hop']){
    const half=get(id);state=reviewWindow(state,half.windowId,'new-pattern',id);
    const target=state.patterns.find(p=>p.representativeWindowId===half.windowId)!;
    const c=compareObservationWindows(composite,half,state.settings)!.preferred!;
    state=reviewWindow(state,composite.windowId,'support','Component only',target.id,c.explanation,c.score,target.revision);
  }
  const local=state.patterns.filter(p=>p.representativeWindowId===composite.windowId);
  assert.equal(local.length,2);
  assert.deepEqual(local.map(p=>state.evidence.filter(e=>p.evidenceIds.includes(e.id)).map(e=>[e.scope.startEvent,e.scope.endEvent])),[[[0,64]],[[64,128]]]);
  const inverse=compareObservationWindows(get('demo-b-hop'),composite,state.settings)!.preferred!;
  assert.deepEqual(reviewTargetsForWindow(state,composite.windowId,inverse.explanation.target).map(p=>p.id),[local[1].id]);
  assert.equal(new Set(state.relationships.map(l=>l.fromPatternId)).size,2);
});
test('query partial matches retain missing evidence gates, settings and source offsets',()=>{
  const whole=view('demo-b-transition'),half=view('demo-c-incomplete');
  assert.equal(compareObservationWindows(whole,half,DEFAULT_MATCH)!.qualifying,false);
  const subset={...DEFAULT_MATCH,parameters:['frequency','pri'] as ('frequency'|'pri')[]};
  assert.ok(compareObservationWindows(whole,half,subset)!.qualifying);
  whole.points=whole.points.map(p=>({...p,index:p.index+200}));
  const c=compareObservationWindows(whole,view('demo-b-hop'),DEFAULT_MATCH)!.preferred!;
  assert.deepEqual([c.explanation.query.startEvent,c.explanation.query.endEvent],[264,328]);
  assert.equal(comparisonCoverage(whole,view('demo-b-hop'),c).selected,.5);
  assert.equal(c.explanation.settingsHash,JSON.stringify(DEFAULT_MATCH));
});
test('reviewed component evidence cannot authorize a different half of the same composite',async()=>{
  let state=emptyLibrary();const demo=buildDemo();
  for(const r of demo.records)state=addRecording(state,await storeRecording(r,JSON.stringify(r),r.id+'.json'),demo.streams.find(s=>s.id===r.streamId)!);
  const get=(id:string)=>state.views[state.windows.find(w=>w.recordingId===id)!.id];
  const shared=get('demo-a-shared'),hop=get('demo-b-hop'),composite=get('demo-b-transition');
  state=reviewWindow(state,shared.windowId,'new-pattern','Shared component');
  state=reviewWindow(state,hop.windowId,'new-pattern','Hop component');
  const sharedPattern=state.patterns.find(p=>p.representativeWindowId===shared.windowId)!,hopPattern=state.patterns.find(p=>p.representativeWindowId===hop.windowId)!;
  const a=compareObservationWindows(composite,shared,state.settings)!.preferred!;
  state=reviewWindow(state,composite.windowId,'support','Left half only',sharedPattern.id,a.explanation,a.score,sharedPattern.revision);
  const ownShared=state.patterns.find(p=>p.representativeWindowId===composite.windowId)!;
  const inverseHop=compareObservationWindows(hop,composite,state.settings)!.preferred!;
  assert.ok(!reviewTargetsForWindow(state,composite.windowId,inverseHop.explanation.target).some(p=>p.id===ownShared.id));
  assert.throws(()=>reviewWindow(state,hop.windowId,'support','Wrong half',ownShared.id,inverseHop.explanation,inverseHop.score,ownShared.revision),/Match context changed/);
  const b=compareObservationWindows(composite,hop,state.settings)!.preferred!;
  state=reviewWindow(state,composite.windowId,'support','Right half only',hopPattern.id,b.explanation,b.score,hopPattern.revision);
  assert.ok(reviewTargetsForWindow(state,composite.windowId,inverseHop.explanation.target).some(p=>p.id===hopPattern.id));
  const scopes=state.evidence.filter(e=>e.scope.windowId===composite.windowId).map(e=>[e.scope.startEvent,e.scope.endEvent]);
  assert.ok(scopes.some(([a,b])=>a===0&&b===64));assert.ok(scopes.some(([a,b])=>a===64&&b===128));
});
