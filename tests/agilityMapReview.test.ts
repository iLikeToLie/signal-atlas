import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewWindow,reviewTargetsForWindow,undoDecision,DEFAULT_MATCH,sha256 } from '../src/agilityModel.ts';
import { compareObservationWindows } from '../src/agilityMatching.ts';
import { validateBackup } from '../src/agilityStorage.ts';
import { mapLibrary } from './helpers/agilityMapFixtures.ts';
async function prepared(){const fixture=await mapLibrary([0,1,2,4]);let s=reviewWindow(fixture.state,'control-0','new-pattern','Root');const root=s.patterns[0];const support=compareObservationWindows(s.views['control-2'],s.views['control-0'],DEFAULT_MATCH)!.preferred!;s=reviewWindow(s,'control-2','support','A second supporting window',root.id,support.explanation,support.score);return {...fixture,state:s};}
test('review targets include exact nonrepresentative support and retain compared scope in cross-emitter history',async()=>{
  const {state:s,originals}=await prepared(),target=s.patterns[0],m=compareObservationWindows(s.views['control-1'],s.views['control-2'],DEFAULT_MATCH)!.preferred!;
  assert.equal(reviewTargetsForWindow(s,'control-2')[0].id,target.id);
  const result=reviewWindow(s,'control-1','support','Compared the supporting observation',target.id,m.explanation,m.score,target.revision);
  assert.equal(result.patterns.length,2);assert.equal(result.decisions.at(-1)!.match!.target.windowId,'control-2');assert.deepEqual(result.decisions.at(-1)!.match!.target,m.explanation.target);
  const payload={state:result,recordings:originals};await validateBackup(JSON.stringify({format:'signal-atlas-agility-backup',version:1,sha256:await sha256(JSON.stringify(payload)),payload}));
  assert.equal(undoDecision(result).patterns.length,1);
});
test('multiple targets require explicit choice, stale revisions and no-longer-present windows reject',async()=>{
  const {state:original}=await prepared(),s=reviewWindow(original,'control-2','new-pattern','Other interpretation'),targets=reviewTargetsForWindow(s,'control-2'),before=structuredClone(s),m=compareObservationWindows(s.views['control-1'],s.views['control-2'],DEFAULT_MATCH)!.preferred!;
  assert.equal(targets.length,2);assert.throws(()=>reviewWindow(s,'control-1','support','No explicit target',undefined,m.explanation),/Select/);assert.deepEqual(s,before);
  assert.throws(()=>reviewWindow(s,'control-1','support','Stale',targets[0].id,m.explanation,m.score,targets[0].revision-1),/revision|changed/);
  const missing=structuredClone(s);missing.windows=missing.windows.filter(w=>w.id!=='control-2');delete missing.views['control-2'];assert.throws(()=>reviewWindow(missing,'control-1','support','Removed target',targets[0].id,m.explanation),/changed|available/);
});
test('unreviewed or challenge-only destination does not become a pattern target implicitly',async()=>{
  const {state}=await mapLibrary([0,1,2]);assert.equal(reviewTargetsForWindow(state,'control-1').length,0);
  const s=reviewWindow(state,'control-0','new-pattern','Root'),m=compareObservationWindows(s.views['control-2'],s.views['control-0'],DEFAULT_MATCH)!.preferred!,challenged=reviewWindow(s,'control-2','challenge','Challenges root',s.patterns[0].id,m.explanation,m.score);
  assert.equal(reviewTargetsForWindow(challenged,'control-2').length,0);
});
