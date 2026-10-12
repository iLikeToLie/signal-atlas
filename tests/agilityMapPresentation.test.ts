import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPresentation,filterWindowIds,windowStatus } from '../src/agilityMapPresentation.ts';
import { compareObservationWindows } from '../src/agilityMatching.ts';
import { emptyLibrary,DEFAULT_MATCH } from '../src/agilityModel.ts';
import { controlView,mapLibrary } from './helpers/agilityMapFixtures.ts';
test('all 37 destinations highlight while eight whole-first suggestion edges draw and expansion retains total',()=>{
  const state=emptyLibrary(),q=controlView(0,'q');state.views.q=q;
  const matches=Array.from({length:37},(_,i)=>compareObservationWindows(q,controlView(1,`w-${i}`),DEFAULT_MATCH)!);
  const shown=mapPresentation(state,'q',matches,8,false);assert.equal(shown.highlightedIds.size,37);assert.equal(shown.drawnSuggestionCount,8);assert.equal(shown.qualifyingCount,37);
  assert.ok(shown.edges.every(e=>e.kind==='whole'));const expanded=mapPresentation(state,'q',matches,100,false);assert.equal(expanded.drawnSuggestionCount,37);assert.equal(expanded.qualifyingCount,37);
  const partial=compareObservationWindows(controlView(4,'q'),controlView(0,'partial'),DEFAULT_MATCH)!;assert.equal(mapPresentation(state,'q',[partial,...matches],8,false).edges[0].kind,'whole');
});
test('status/filter metadata retain full collection and partial-channel candidates do not highlight',async()=>{
  const {state}=await mapLibrary([0,1,5]);state.windows[1].reviewState='unresolved';state.windows[2].reviewState='associated';
  assert.equal(windowStatus(state.windows[1]),'unresolved');assert.equal(windowStatus(state.windows[2]),'reviewed');
  const before=structuredClone(state);assert.equal(filterWindowIds(state,{search:'',profileId:'',status:'unresolved'}).size,1);assert.deepEqual(state,before);
  const m=compareObservationWindows(state.views['control-0'],state.views['control-5'],DEFAULT_MATCH)!;
  assert.equal(mapPresentation(state,'control-0',[m],8,false).highlightedIds.size,0);assert.equal(mapPresentation(state,'',[],8,false).edges.length,0);
});
test('reviewed exact evidence links are separate from the eight suggestion cap',()=>{
  const state=emptyLibrary();state.relationships=[{id:'link',fromPatternId:'p1',toPatternId:'p2',revision:1,kind:'coordinated-similarity',decisionId:'decision',evidence:{from:{windowId:'q',startEvent:0,endEvent:16,channelIds:['frequency']},to:{windowId:'target',startEvent:0,endEvent:16,channelIds:['frequency']}}}];
  const q=controlView(0,'q'),matches=Array.from({length:12},(_,i)=>compareObservationWindows(q,controlView(1,`w-${i}`),DEFAULT_MATCH)!);
  const p=mapPresentation(state,'q',matches,8,false);assert.equal(p.edges.length,9);assert.equal(p.edges[0].kind,'reviewed');assert.equal(p.drawnSuggestionCount,8);
});
