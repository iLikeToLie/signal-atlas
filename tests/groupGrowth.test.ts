import test from 'node:test';
import assert from 'node:assert/strict';
import type { AtlasData, Entry } from '../src/types.ts';
import { makeEntry } from '../src/catalogue.ts';
import { DEFAULT_GROUPING, groupIncoming, similarityScorer } from '../src/grouping.ts';
import { approveSplit, emptyReview, groupHealth, moveMember, reviewToken, shapeKey } from '../src/groupPolicy.ts';
import { loadGroupReviews, newReviewWorkspace, recordReview, REVIEW_KEY, undoReview, validateReview } from '../src/groupReviewStorage.ts';

const build = (id: string, harmonic: number, shift = 0): Entry => makeEntry(id, id, 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * (p + shift)) + harmonic * Math.sin(6 * Math.PI * (p + shift)), {});
const sine = build('sine', 0);
const atlas: AtlasData = { entries: [sine], regionSet: { regions: [{ id: 'sine-region', name: 'Sinusoid', medoidId: sine.id, count: 1, color: '#abc', summary: 'A sinusoid anchor.', periodRange: [1, 1], excursionRange: [2, 2] }], membership: { sine: 'sine-region' }, iterations: 1, converged: true, objective: 0 }, positions: { sine: { x: 0, y: 0 } }, shapePositions: { sine: { x: 0, y: 0 } }, metadata: { seed: 1, method: 'fixture', stress: 0, shapeStress: 0, noveltyThreshold: .2, calibration: 'fixture', weights: DEFAULT_GROUPING.weights } };
const settings = { ...DEFAULT_GROUPING, formulaWeight: 1, threshold: .85 };
const fringe = [build('fringe-a', .18), build('fringe-b', .19), build('fringe-c', .20)];

test('a chain of qualifying neighbour matches cannot expand the sinusoid anchor boundary', () => {
  const entries = [.2, .4, .6].map((b, i) => build(`bridge-${i}`, b));
  const score = similarityScorer(settings);
  assert.ok(score(entries[0], entries[1])!.combined > settings.threshold);
  assert.ok(score(entries[1], entries[2])!.combined > settings.threshold);
  assert.ok(score(sine, entries[2])!.combined < settings.threshold);
  for (const order of [entries, [...entries].reverse()]) {
    const result = groupIncoming(atlas, order, settings);
    assert.notEqual(result.assignments[entries[2].id].regionId, 'sine-region');
    assert.equal(result.regionSet.membership.sine, 'sine-region');
    assert.equal(result.regionSet.regions[0].medoidId, sine.id);
    assert.deepEqual(result.health['sine-region'].representativeIds, [sine.id]);
  }
});

test('coverage representatives need distinct clear core shapes and cannot bypass an anchor', () => {
  const core = [.02, .04, .2].map((b, i) => build(`core-${i}`, b));
  const outside = build('outside', .8), lowThreshold = { ...settings, threshold: .8 };
  const result = groupIncoming(atlas, [...core, outside], lowThreshold);
  const candidate = result.assignments.outside.candidates.find(c => c.regionId === 'sine-region')!;
  assert.ok(candidate.combined > lowThreshold.threshold, 'An adaptive coverage example is close to the query.');
  assert.ok(candidate.anchorSimilarity < lowThreshold.threshold);
  assert.equal(candidate.eligible, false);
  assert.notEqual(result.assignments.outside.regionId, 'sine-region');
  assert.equal(result.health['sine-region'].representativeIds.length, 3);
  assert.equal(result.health['sine-region'].anchorIds[0], sine.id);
});

test('duplicate and phase-equivalent repeats leave a local group provisional', () => {
  const novel = (id: string, phase: number, noise = 0) => makeEntry(id, id, 'unassigned', 1, 2, 10, p => Math.sin(22 * Math.PI * (p + phase)) + .22 * Math.sin(34 * Math.PI * (p + phase) + .4) + noise * Math.sin(10 * Math.PI * p), {});
  const founder = novel('novel', 0), repeat = novel('repeat', .125);
  assert.equal(shapeKey(founder), shapeKey(repeat));
  const duplicates = groupIncoming(atlas, [founder, repeat, { ...founder, id: 'copy' }], settings);
  assert.equal(duplicates.regionSet.regions.find(r => r.id === 'region-novel')!.provisional, true);
  assert.equal(duplicates.health['region-novel'].distinctCoreShapes, 1);
  assert.equal(duplicates.health['region-novel'].representativeIds.length, 1);
  const supported = groupIncoming(atlas, [founder, novel('variant-a', 0, .01), novel('variant-b', 0, .02)], settings);
  assert.equal(supported.regionSet.regions.find(r => r.id === 'region-novel')!.provisional, false);
  assert.equal(supported.health['region-novel'].representativeIds.length, 3);
});

test('a coherent fringe produces a proposal, and approval splits only local members with deterministic undo', () => {
  const before = structuredClone(atlas), initial = groupIncoming(atlas, fringe, settings);
  assert.ok(fringe.every(e => initial.assignments[e.id].needsReview));
  const proposal = initial.health['sine-region'].proposals[0];
  assert.equal(proposal.distinctShapes, 3);
  assert.equal(initial.regionSet.regions.length, 1, 'A proposal never splits automatically.');
  const decision = approveSplit(emptyReview(), proposal, 'Sinusoid');
  const workspace = recordReview(newReviewWorkspace(atlas), decision);
  const result = groupIncoming(atlas, fringe, settings, workspace.current);
  assert.equal(result.regionSet.regions.length, 2);
  for (const entry of fringe) assert.equal(result.assignments[entry.id].regionId, `split-${proposal.anchorId}`);
  assert.equal(result.regionSet.membership.sine, 'sine-region');
  assert.equal(result.health[`split-${proposal.anchorId}`].distinctCoreShapes, 3);
  assert.deepEqual(groupIncoming(atlas, fringe, settings, JSON.parse(JSON.stringify(workspace.current))), result);
  assert.deepEqual(groupIncoming(atlas, fringe, settings, undoReview(workspace).current), initial);
  assert.deepEqual(atlas, before);
  const fresh = build('fresh', .195);
  assert.equal(groupIncoming(atlas, [...fringe, fresh], settings, decision).assignments.fresh.regionId, `split-${proposal.anchorId}`);
});

test('a single fringe, duplicate fringe, and uncertain reconstruction cannot supply a split', () => {
  for (const entries of [fringe.slice(0, 2), [fringe[0], { ...fringe[0], id: 'duplicate-a' }, { ...fringe[0], id: 'duplicate-b' }], fringe.map(e => ({ ...e, sampling: 'sparse-periodic' as const, interpolation: 'linear' as const }))]) {
    const result = groupIncoming(atlas, entries, settings);
    assert.equal(Object.values(result.health).flatMap(h => h.proposals).length, 0);
  }
});

test('one bridge between unrelated fringe members cannot produce a complete-link split', () => {
  const result = groupIncoming(atlas, fringe, settings), anchors = { 'sine-region': [sine] };
  const tableScore = (allPairs: boolean) => (a: Entry, b: Entry) => {
    const endpoints = [a.id, b.id].sort().join(',') === 'fringe-a,fringe-c';
    const combined = a.id === b.id ? 1 : endpoints && !allPairs ? .80 : .99;
    return { combined, formula: combined, vision: null, rawFormula: combined, rawVision: null, distance: -Math.log(combined) };
  };
  assert.equal(groupHealth(structuredClone(result.regionSet), fringe, result.assignments, anchors, anchors, settings, tableScore(false))['sine-region'].proposals.length, 0);
  assert.equal(groupHealth(structuredClone(result.regionSet), fringe, result.assignments, anchors, anchors, settings, tableScore(true))['sine-region'].proposals.length, 1);
});

test('review acknowledges uncertainty without promoting it; changed settings request another review', () => {
  const result = groupIncoming(atlas, [fringe[0]], settings), review = emptyReview();
  review.acknowledged.push(reviewToken(fringe[0].id, result.assignments[fringe[0].id].regionId, settings));
  const kept = groupIncoming(atlas, [fringe[0]], settings, review).assignments[fringe[0].id];
  assert.equal(kept.needsReview, false);
  assert.equal(kept.status, 'fringe');
  assert.equal(groupIncoming(atlas, [fringe[0]], { ...settings, threshold: .86 }, review).assignments[fringe[0].id].needsReview, true);
  const sparse = { ...sine, id: 'sparse', sampling: 'sparse-periodic' as const, interpolation: 'linear' as const };
  const quality = groupIncoming(atlas, [sparse], settings).assignments.sparse;
  assert.equal(quality.created, false);
  assert.ok(quality.reviewReasons.some(r => r.includes('reconstruction')));
  assert.equal(quality.status, 'review');
});

test('competing groups are reviewed and guarded reassignment survives replay', () => {
  const second = build('second-anchor', .05), other = structuredClone(atlas);
  other.entries.push(second); other.regionSet.regions.push({ ...other.regionSet.regions[0], id: 'second-region', medoidId: second.id, name: 'Second' }); other.regionSet.membership[second.id] = 'second-region';
  const entry = build('ambiguous', .025), result = groupIncoming(other, [entry], settings);
  const a = result.assignments.ambiguous;
  assert.ok(a.reviewReasons.some(r => r.includes('Competing')));
  const target = a.candidates.find(c => c.regionId !== a.regionId)!.regionId;
  const review = moveMember(emptyReview(), entry.id, result.regionSet, target);
  const moved = groupIncoming(other, [entry], settings, review).assignments.ambiguous;
  assert.equal(moved.regionId, target);
  assert.equal(moved.manual, true);
  assert.equal(moved.status, 'fringe');
  assert.throws(() => moveMember(emptyReview(), sine.id, result.regionSet, target), /anchors stay/);
});

test('saved placements pause when settings reject them or their anchor is removed', () => {
  const initial = groupIncoming(atlas, fringe, settings), proposal = initial.health['sine-region'].proposals[0];
  const review = approveSplit(emptyReview(), proposal, 'Sinusoid');
  const removed = groupIncoming(atlas, fringe.filter(e => e.id !== proposal.anchorId), settings, review);
  assert.ok(removed.reviewWarnings.some(w => w.includes('anchor is absent')));
  assert.ok(!removed.regionSet.regions.some(r => r.id === `split-${proposal.anchorId}`));
  const strict = groupIncoming(atlas, fringe, { ...settings, threshold: 1 }, review);
  assert.ok(strict.reviewWarnings.some(w => w.includes('placement paused')));
  assert.equal(strict.assignments[proposal.anchorId].regionId, `split-${proposal.anchorId}`);
  assert.deepEqual(groupIncoming(atlas, fringe, settings, review), groupIncoming(atlas, fringe, settings, structuredClone(review)));
});

test('review storage preserves quantity isolation, undo history and malformed recoverable data', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const pri = structuredClone(atlas); pri.entries[0].quantity = 'pri';
  let text: string | null = null, writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === REVIEW_KEY ? text : null, setItem: () => { writes++; } } });
  try {
    const base = loadGroupReviews(atlas, pri).reviews;
    const proposal = groupIncoming(atlas, fringe, settings).health['sine-region'].proposals[0];
    base.frequency = recordReview(base.frequency, approveSplit(emptyReview(), proposal, 'Sinusoid'));
    text = JSON.stringify({ version: 1, ...base });
    const loaded = loadGroupReviews(atlas, pri);
    assert.equal(loaded.error, ''); assert.deepEqual(loaded.reviews, base);
    assert.deepEqual(loaded.reviews.pri.current, emptyReview());
    assert.equal(undoReview(loaded.reviews.frequency).current.groups.length, 0);
    for (const corrupt of ['{', JSON.stringify({ version: 2 }), text.replace(base.frequency.referenceSignature, 'wrong')]) {
      text = corrupt;
      assert.match(loadGroupReviews(atlas, pri).error, /left untouched/);
      assert.equal(writes, 0);
    }
    assert.throws(() => validateReview({ groups: [], placements: [], acknowledged: [] }));
    assert.throws(() => validateReview(JSON.parse('{"groups":[],"placements":{"__proto__":"bad"},"acknowledged":[]}')));
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('undo history is bounded and reverses the most recent decisions in order', () => {
  let workspace = newReviewWorkspace(atlas);
  for (let i = 0; i < 25; i++) workspace = recordReview(workspace, { ...emptyReview(), acknowledged: [String(i)] });
  assert.equal(workspace.history.length, 20);
  for (let i = 23; i >= 4; i--) {
    workspace = undoReview(workspace);
    assert.deepEqual(workspace.current.acknowledged, [String(i)]);
  }
  assert.equal(workspace.history.length, 0);
  assert.deepEqual(undoReview(workspace), workspace);
});
