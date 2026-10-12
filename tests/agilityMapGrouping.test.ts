import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSimilarityGroups, groupScoreMatrix, symmetricWholeScore, acceptAnalysisResult } from '../src/agilityGrouping.ts';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { controlView } from './helpers/agilityMapFixtures.ts';
test('complete-link rejects similarity chains and every admitted pair meets threshold', () => {
  const ids=['a','b','c'],scores=[new Float64Array([1,.9,.6]),new Float64Array([.9,1,.9]),new Float64Array([.6,.9,1])];
  const groups=groupScoreMatrix(ids,scores,.85);
  assert.equal(groups.length,2);for(const group of groups)for(const a of group.members)for(const b of group.members)assert.ok(scores[ids.indexOf(a)][ids.indexOf(b)]+1e-12>=.85);
});
test('symmetric whole scores are conservative, ineligible and incompatible windows never merge', () => {
  const a=controlView(0),b=controlView(2),missing=controlView(5);
  assert.equal(symmetricWholeScore(a,b,DEFAULT_MATCH),symmetricWholeScore(b,a,DEFAULT_MATCH));
  const incompatible=controlView(1);incompatible.channels=incompatible.channels.map(c=>c.quantity==='frequency'?{...c,unit:'fu'}:c);
  const s={...DEFAULT_MATCH,parameters:['frequency'] as const};
  const result=buildSimilarityGroups({[a.windowId]:a,[incompatible.windowId]:incompatible},{...s,parameters:[...s.parameters]});
  assert.equal(result.groups.length,2);assert.ok(Number.isNaN(result.pairScores[0][1]));
  const r=buildSimilarityGroups({a,b,missing},DEFAULT_MATCH);assert.ok(r.ineligible[missing.windowId]);assert.equal(r.pairIds.length,2);
});
test('empty singleton repeated cached and input-permuted analysis are deterministic', () => {
  assert.equal(buildSimilarityGroups({},DEFAULT_MATCH).groups.length,0);
  const a=controlView(0),b=controlView(1);assert.equal(buildSimilarityGroups({a},DEFAULT_MATCH).groups.length,1);
  assert.deepEqual(buildSimilarityGroups({a,b},DEFAULT_MATCH),buildSimilarityGroups({b,a},DEFAULT_MATCH));
});
test('stale workspace revision mask fingerprint and selected-window results reject', () => {
  const id={workspace:'test',revision:3,settingsHash:'frequency',inputFingerprint:'v1'};
  assert.equal(acceptAnalysisResult(id,id,'a','a'),true);
  for(const different of [{...id,workspace:'demo'},{...id,revision:4},{...id,settingsHash:'pri'},{...id,inputFingerprint:'v2'}])assert.equal(acceptAnalysisResult(id,different,'a','a'),false);
  assert.equal(acceptAnalysisResult(id,id,'a','b'),false);
});
