import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCycles, parseRecording, suggestPeriods, validateRecording } from '../src/recording.ts';
import { emptyAtlas, measuredProjection, measuredView, newMeasuredState, sameWindow, validateMeasuredState } from '../src/measured.ts';
import { DEFAULT_GROUPING, groupIncoming } from '../src/grouping.ts';
import { approveSplit, emptyReview } from '../src/groupPolicy.ts';
import { SHAPE_WEIGHTS, DEFAULT_WEIGHTS } from '../src/signal.ts';
import { makeEntry } from '../src/catalogue.ts';
import { mapAnchors, spreadTiles } from '../src/displayLayout.ts';

function recording(id = 'local-recording-a', captureId?: string, quantity: 'frequency' | 'pri' = 'frequency') {
  return validateRecording({ quantity, units: { time: 'ms', frequency: quantity === 'pri' ? 'us' : 'GHz' }, captureId, samples: Array.from({ length: 601 }, (_, i) => ({ t: 100 + i / 100, f: 6 + Math.sin(2 * Math.PI * i / 100) })) }, 'unlabelled.json', id);
}

test('raw recordings need units and ordered observations, but no period or labels', () => {
  const r = recording();
  assert.equal(r.periodHint, undefined); assert.equal(r.samples[0].t, 100);
  const csv = '# time_unit: ms\n# frequency_unit: GHz\n# capture_id: capture-1\nt,f\n' + r.samples.map((s, i) => `${s.t},${i === 4 ? '' : s.f}`).join('\n');
  const parsed = parseRecording(csv, 'raw.csv', { quantity: 'frequency', timeUnit: '', valueUnit: '', captureId: '' });
  assert.equal(parsed.captureId, 'capture-1'); assert.deepEqual(parsed.missingTimes, [100.04]); assert.equal(parsed.samples.length, 600);
  assert.throws(() => validateRecording({ ...r, units: {} }), /units/);
  assert.throws(() => validateRecording({ ...r, samples: [r.samples[0], r.samples[0], ...r.samples.slice(2)] }), /increasing/);
  assert.throws(() => validateRecording({ ...r, quantity: 'pri', units: { time: 'ms', frequency: 'us' }, samples: r.samples.map(s => ({ ...s, f: -1 })) }), /positive/);
  assert.throws(() => validateRecording({ ...r, missingTimes: [r.samples[0].t] }), /cannot replace/);
});

test('period suggestions recover dense, irregular and sparse smooth recurrence and expose multiples', () => {
  const r = recording();
  for (const source of [r, { ...r, samples: r.samples.filter((_, i) => i % 11 !== 3 && i % 17 !== 4) }, { ...r, samples: r.samples.filter((_, i) => ![42, 43, 44].includes(i % 100)), missingTimes: r.samples.filter((_, i) => [42, 43, 44].includes(i % 100)).map(s => s.t) }]) {
    const suggestions = suggestPeriods(source, 'linear');
    assert.ok(suggestions.some(s => Math.abs(s.period - 1) < .002), JSON.stringify(suggestions));
    assert.ok(suggestions.some(s => Math.abs(s.period - 2) < .004), 'A multiple remains visible for review.');
    assert.ok(suggestions.every(s => s.coverage >= .5 && s.pairs >= 12));
  }
});

test('hopping signals use hold recurrence; constant, ramp, short and noisy recordings stay unresolved', () => {
  const r = recording(), hops = { ...r, samples: r.samples.map((s, i) => ({ ...s, f: [5.2, 7.5, 6, 8][Math.floor(i % 100 / 25)] })) };
  assert.ok(suggestPeriods(hops, 'hold').some(s => Math.abs(s.period - 1) < .01));
  for (const source of [{ ...r, samples: r.samples.map(s => ({ ...s, f: 6 })) }, { ...r, samples: r.samples.map(s => ({ ...s, f: s.t })) }, { ...r, samples: r.samples.slice(0, 18) }]) assert.deepEqual(suggestPeriods(source), []);
  let seed = 9;
  const noise = { ...r, samples: r.samples.map(s => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return { ...s, f: seed / 2 ** 32 }; }) };
  assert.deepEqual(suggestPeriods(noise), []);
  const gaps = { ...r, samples: r.samples.filter((_, i) => i % 100 < 12) };
  assert.deepEqual(suggestPeriods(gaps), [], 'Small observed fragments cannot certify whole-cycle recurrence.');
});

test('reviewed extraction preserves observed samples, missing rows, units and source window lineage', () => {
  const r = recording('local-recording-source', 'acquisition-1');
  r.missingTimes = [100.425];
  const cycles = extractCycles(r, 1, 100, 3, 'linear');
  assert.equal(cycles.length, 3); assert.equal(cycles[0].samples.length, 100);
  assert.deepEqual(cycles[0].samples[42], { t: r.samples[42].t - 100, f: r.samples[42].f });
  assert.deepEqual(cycles[0].missingTimes, [100.425 - 100]);
  assert.equal(cycles[1].provenance.windowStart, 101); assert.equal(cycles[1].provenance.windowEnd, 102);
  assert.equal(cycles[1].provenance.recordingId, r.id); assert.equal(cycles[1].provenance.captureId, 'acquisition-1');
  assert.deepEqual(extractCycles(r, 1, 100, 3, 'linear'), cycles);
  assert.ok(sameWindow(cycles[0], extractCycles(r, 1, 100, 1, 'hold')[0]));
  assert.throws(() => extractCycles(r, 1, 99, 1, 'linear'), /fit inside/);
  assert.throws(() => extractCycles(r, 1, 100, 7, 'linear'), /fit inside/);
  assert.throws(() => extractCycles(r, 1, 100, 26, 'linear'), /1–25/);
  assert.throws(() => extractCycles({ ...r, samples: r.samples.filter((_, i) => i % 100 < 50) }, 1, 100, 1, 'linear'), /gap/i);
});

test('explicit missing edge timestamps define recording bounds without permitting arbitrary extrapolation', () => {
  const r = recording();
  const edged = { ...r, samples: r.samples.filter(s => s.t > 100 && s.t < 106), missingTimes: [100, 106] };
  const cycles = extractCycles(edged, 1, 100, 6, 'linear');
  assert.equal(cycles.length, 6); assert.deepEqual(cycles[0].missingTimes, [0]);
  assert.throws(() => extractCycles(edged, 1, 100, 7, 'linear'), /fit inside/);
});

test('empty Frequency and PRI workspaces form groups without synthetic references', () => {
  for (const quantity of ['frequency', 'pri'] as const) {
    const cycles = extractCycles(recording(`local-${quantity}`, undefined, quantity), 1, 100, 3, 'linear');
    assert.ok(cycles.every(e => e.quantity === quantity), 'Extracted cycles explicitly retain their quantity for persistence and filtering.');
    const view = measuredView(cycles, quantity, DEFAULT_GROUPING, emptyReview(), SHAPE_WEIGHTS);
    assert.equal(emptyAtlas(quantity).entries.length, 0); assert.equal(view.grouping.regionSet.regions.length, 1);
    assert.equal(Object.keys(view.positions).length, 3); assert.equal(Object.keys(view.regionLayout.points).length, 3);
    assert.ok(cycles.every(e => view.grouping.assignments[e.id].status === 'core'));
    assert.equal(view.grouping.regionSet.regions[0].provisional, true);
    assert.equal(view.grouping.health[view.grouping.regionSet.regions[0].id].distinctCoreCaptures, 0);
  }
  assert.equal(measuredView([], 'pri', DEFAULT_GROUPING, emptyReview(), SHAPE_WEIGHTS).stress, 0);
});

test('same-capture windows count once while identical sinusoidal captures can support a group', () => {
  const first = recording('local-first', 'capture-a');
  const copies = extractCycles(first, 1, 100, 3, 'linear');
  const result = groupIncoming(emptyAtlas('frequency'), copies, DEFAULT_GROUPING);
  const id = result.regionSet.regions[0].id;
  assert.equal(result.health[id].distinctCoreCaptures, 1); assert.equal(result.regionSet.regions[0].provisional, true);
  const independent = [...copies, ...extractCycles(recording('local-second', 'capture-b'), 1, 100, 1, 'linear'), ...extractCycles(recording('local-third', 'capture-c'), 1, 100, 1, 'linear')];
  const supported = groupIncoming(emptyAtlas('frequency'), independent, DEFAULT_GROUPING);
  assert.equal(supported.health[id].distinctCoreCaptures, 3); assert.equal(supported.regionSet.regions[0].provisional, false);
  const sparse = extractCycles({ ...first, samples: first.samples.filter((_, i) => ![20, 21, 22, 23, 24, 25, 26, 27].includes(i % 100)) }, 1, 100, 1, 'linear');
  assert.equal(groupIncoming(emptyAtlas('frequency'), sparse).assignments[sparse[0].id].needsReview, true);
});

test('workspace reload reproduces windows; duplicates, altered observations and orphan reviews are rejected', () => {
  const r = recording('local-recording-decimal', 'capture-a'), state = newMeasuredState();
  state.recordings.push(r); state.cycles.push(...extractCycles(r, .999723, 100.02, 3, 'linear'));
  assert.deepEqual(validateMeasuredState(JSON.parse(JSON.stringify(state))), state);
  assert.throws(() => validateMeasuredState({ ...state, cycles: [...state.cycles, state.cycles[0]] }), /Duplicate/);
  const altered = structuredClone(state); altered.cycles[0].samples[1].f += 1;
  assert.throws(() => validateMeasuredState(altered), /original observations/);
  const orphan = structuredClone(state); orphan.reviews.frequency.current.groups.push({ id: 'region-missing', name: 'Missing', anchorId: 'missing' });
  assert.throws(() => validateMeasuredState(orphan), /missing cycle/);
  const duplicateModel = extractCycles(r, state.cycles[0].period, state.cycles[0].provenance.windowStart!, 1, 'hold')[0];
  assert.throws(() => validateMeasuredState({ ...state, cycles: [...state.cycles, duplicateModel] }), /count twice/);
});

test('similarity display separates identical tiles without changing similarity coordinates', () => {
  const coords = Object.fromEntries(Array.from({ length: 1100 }, (_, i) => [`local-${i}`, { x: 0, y: 0 }])), original = structuredClone(coords);
  const tiles = Object.values(spreadTiles(mapAnchors(coords)));
  assert.equal(tiles.length, 1100); assert.deepEqual(coords, original);
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) assert.ok(Math.abs(tiles[i].x - tiles[j].x) >= 12 || Math.abs(tiles[i].y - tiles[j].y) >= 9, `Tiles ${i} and ${j} overlap.`);
});

test('incompatible physical/arbitrary scale components produce finite separated projections', () => {
  const a = makeEntry('a', 'a', 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p), {});
  const b = { ...a, id: 'b', units: { time: 'ms', frequency: 'GHz' } };
  const result = measuredProjection([a, b], DEFAULT_WEIGHTS);
  assert.equal(result.components, 2); assert.ok(Object.values(result.positions).every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.notDeepEqual(result.positions.a, result.positions.b);
});

test('approving a split in an observed group preserves its parent founder through replay', () => {
  const entries = [0, .18, .19, .20].map((h, i) => makeEntry(`local-${i}`, `Curve ${i}`, 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p) + h * Math.sin(6 * Math.PI * p), {}));
  const settings = { ...DEFAULT_GROUPING, threshold: .85, formulaWeight: 1 }, atlas = emptyAtlas('frequency');
  const original = groupIncoming(atlas, entries, settings), parent = original.regionSet.regions[0];
  const proposal = original.health[parent.id].proposals[0]; assert.ok(proposal);
  const review = approveSplit(emptyReview(), proposal, parent.name, parent.medoidId);
  const split = groupIncoming(atlas, entries, settings, review);
  assert.equal(split.regionSet.regions.length, 2);
  assert.equal(split.regionSet.membership[entries[0].id], parent.id);
  assert.equal(split.regionSet.regions.find(r => r.id === parent.id)!.medoidId, entries[0].id);
  assert.ok(proposal.memberIds.every(id => split.regionSet.membership[id] === `split-${proposal.anchorId}`));
  assert.deepEqual(groupIncoming(atlas, entries, settings, emptyReview()), original);
  const otherFounder = makeEntry('local-other-founder', 'Other observed anchor', 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p) + .5 * Math.sin(6 * Math.PI * p), {});
  const extended = groupIncoming(atlas, [...entries, otherFounder], settings);
  assert.equal(extended.regionSet.regions.length, 2);
  const protectedReview = approveSplit(emptyReview(), extended.health[parent.id].proposals[0], parent.name, parent.medoidId, extended.regionSet);
  const protectedSplit = groupIncoming(atlas, [...entries, otherFounder], settings, protectedReview);
  assert.equal(protectedSplit.regionSet.regions.length, 3);
  assert.equal(protectedSplit.regionSet.membership[otherFounder.id], extended.regionSet.membership[otherFounder.id], 'An existing third founder cannot be absorbed by the split anchor during replay.');
});
