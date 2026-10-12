import test from 'node:test';
import assert from 'node:assert/strict';
import { compareObservationWindows, matchObservationWindows, qualifyingMatches } from '../src/agilityMatching.ts';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { controlView } from './helpers/agilityMapFixtures.ts';
test('selected masks distinguish changed PRI coordination while preserving shared scale variants', () => {
  const q = controlView(0), changed = controlView(3), variant = controlView(2);
  for (let mask = 1; mask < 8; mask++) {
    const parameters = (['frequency','pri','pulse-width'] as const).filter((_, i) => mask & (1 << i));
    assert.ok(compareObservationWindows(q, variant, { ...DEFAULT_MATCH, parameters })!.whole!.score > .99);
  }
  assert.ok(compareObservationWindows(q, changed, { ...DEFAULT_MATCH, parameters: ['frequency'] })!.whole!.score > .99);
  assert.ok(compareObservationWindows(q, changed, { ...DEFAULT_MATCH, parameters: ['frequency','pri'] })!.whole!.score < .85);
});
test('missing disjoint reused ambiguous and incompatible selected evidence never qualifies as combined', () => {
  const q = controlView(0);
  assert.equal(compareObservationWindows(q, controlView(5), DEFAULT_MATCH)!.qualifying, false);
  assert.equal(compareObservationWindows(q, controlView(5), { ...DEFAULT_MATCH, parameters: ['frequency','pri'] })!.qualifying, true);
  assert.equal(compareObservationWindows(q, controlView(7), { ...DEFAULT_MATCH, parameters: ['frequency','pri'] })!.qualifying, false);
  const r = controlView(0, 'short'); r.points = r.points.slice(0,16).map((p,i)=>({...p, values:{...p.values, frequency:i%2?null:p.values.frequency,pulseWidth:i%2?p.values.pulseWidth:null}})); r.count=16;
  assert.equal(compareObservationWindows(q,r,DEFAULT_MATCH)!.qualifying,false);
  const incompatible=controlView(1);incompatible.channels=incompatible.channels.map(c=>c.quantity==='frequency'?{...c,unit:'fu'}:c);
  assert.equal(compareObservationWindows(q,incompatible,DEFAULT_MATCH)!.qualifying,false);
  const ambiguous=controlView(1);ambiguous.channels=[...ambiguous.channels,{...ambiguous.channels[0],id:'secondFrequency'}];
  assert.equal(compareObservationWindows(q,ambiguous,DEFAULT_MATCH)!.qualifying,false);
});
test('whole and partial results survive separately, whole wins whenever it qualifies', () => {
  const q=controlView(4),t=controlView(0);
  const m=compareObservationWindows(q,t,DEFAULT_MATCH)!;
  assert.ok(m.whole); assert.ok(m.partial); assert.equal(m.preferred!.kind,'partial');
  assert.deepEqual([m.partial!.explanation.target.startEvent,m.partial!.explanation.target.endEvent],[16,48]);
  const low=compareObservationWindows(q,t,{...DEFAULT_MATCH,threshold:0})!;
  assert.equal(low.preferred!.kind,'whole'); assert.ok(low.partial!.score>low.whole!.score);
});
test('all unreviewed windows are candidates, self is excluded and qualifying totals are not capped', () => {
  const q=controlView(0,'query'),views=Object.fromEntries([['query',q],...Array.from({length:37},(_,i)=>{const v=controlView(1,`match-${i.toString().padStart(2,'0')}`);return [v.windowId,v] as const;})]);
  const r=matchObservationWindows(q,views,DEFAULT_MATCH);
  assert.equal(r.length,37);assert.equal(qualifyingMatches(r).length,37);assert.ok(r.every(m=>m.targetWindowId!=='query'&&m.preferred!.kind==='whole'));
});
