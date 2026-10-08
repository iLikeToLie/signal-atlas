import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AtlasData, Entry } from '../src/types.ts';
import { makeEntry } from '../src/catalogue.ts';
import { DEFAULT_GROUPING } from '../src/grouping.ts';
import { approveMerge, groupLibrary, librarySettings, mergeProposals } from '../src/library.ts';
import { emptyReview } from '../src/groupPolicy.ts';
import { emptyAtlas } from '../src/measured.ts';
import { newReviewWorkspace, recordReview, undoReview } from '../src/groupReviewStorage.ts';
import { layoutLibrary } from '../src/displayLayout.ts';
import { LIBRARY_REVIEW_KEY, loadLibraryReviews, newLibraryReviewWorkspace } from '../src/libraryStorage.ts';

const sine = (id: string, harmonic = 0) => makeEntry(id, id, 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p) + harmonic * Math.sin(6 * Math.PI * p), {});
const settings = { ...DEFAULT_GROUPING, formulaWeight: 1, threshold: .85 };

test('whole-library discovery replaces the forced catalogue partition without using labels', () => {
  const atlas = JSON.parse(readFileSync(new URL('../src/data/atlas.json', import.meta.url), 'utf8')) as AtlasData;
  const before = JSON.stringify(atlas);
  const result = groupLibrary(atlas.entries, 'frequency', DEFAULT_GROUPING, emptyReview());
  assert.equal(Object.keys(result.assignments).length, 1000, 'Catalogue signals are reassessed too.');
  assert.notEqual(result.regionSet.regions.length, 12, 'Group count must not be forced to the old cluster count.');
  const sineEntries = atlas.entries.filter(e => e.family === 'sinusoidal');
  assert.equal(new Set(sineEntries.map(e => result.regionSet.membership[e.id])).size, 1, 'The old 80/44 sinusoid division is reconciled by the common admission rule.');
  assert.equal(JSON.stringify(atlas), before, 'Original signals and historical benchmark remain intact.');
  const controls = [sine('one'), sine('two', .02), sine('three', .19)];
  const relabelled = controls.map(e => ({ ...e, family: 'harmonic' as const, source: 'measured' as const }));
  assert.deepEqual(groupLibrary(controls, 'frequency', settings, emptyReview()).regionSet.membership, groupLibrary(relabelled, 'frequency', settings, emptyReview()).regionSet.membership);
});

test('new arrivals retain founders; missing capture IDs and synthetic copies do not prove support', () => {
  const originals = [sine('a'), sine('b', .01), sine('c', .02)].map(e => ({ ...e, provenance: { ...e.provenance, captureId: e.id } }));
  const initial = groupLibrary(originals, 'frequency', settings, emptyReview());
  assert.equal(initial.regionSet.regions[0].provisional, true, 'Synthetic capture IDs do not count.');
  const measured = originals.map(e => ({ ...e, source: 'measured' as const }));
  assert.equal(groupLibrary(measured, 'frequency', settings, emptyReview()).regionSet.regions[0].provisional, false);
  const expanded = groupLibrary([...originals, sine('later', .18)], 'frequency', settings, emptyReview());
  for (const e of originals) assert.equal(expanded.regionSet.membership[e.id], initial.regionSet.membership[e.id]);
  assert.equal(expanded.regionSet.regions[0].medoidId, 'a');
  assert.equal(expanded.assignments.later.needsReview, true);
});

test('reviewed merge keeps the survivor, preserves every signal, and supports persisted undo', () => {
  const entries = [sine('a'), sine('b', .01), sine('c', .02)];
  const review = { ...emptyReview(), groups: [{ id: 'region-a', name: 'Stable sine', anchorId: 'a' }, { id: 'region-b', name: 'Similar sine', anchorId: 'b' }], placements: { a: 'region-a', b: 'region-b', c: 'region-b' } };
  const initial = groupLibrary(entries, 'frequency', settings, review);
  const proposal = initial.merges[0];
  assert.ok(proposal); assert.equal(proposal.targetId, 'region-a');
  const workspace = recordReview({ ...newReviewWorkspace(emptyAtlas('frequency')), current: review }, approveMerge(review, proposal, initial));
  const restored = JSON.parse(JSON.stringify(workspace));
  const merged = groupLibrary(entries, 'frequency', settings, restored.current);
  assert.equal(merged.regionSet.regions.length, 1); assert.equal(merged.regionSet.regions[0].name, 'Stable sine');
  assert.equal(merged.regionSet.regions[0].medoidId, 'a');
  assert.deepEqual(Object.keys(merged.regionSet.membership), entries.map(e => e.id));
  assert.deepEqual(groupLibrary(entries, 'frequency', settings, undoReview(restored).current), initial);
  assert.throws(() => approveMerge(review, { ...proposal, memberIds: [] }, initial), /membership changed/);
});

test('similar anchors cannot propose a merge that transfers an incompatible member', () => {
  const entries: Entry[] = [sine('a'), sine('b', .01), { ...sine('other'), quantity: 'pri' }];
  const initial = groupLibrary(entries.slice(0, 2), 'frequency', settings, { ...emptyReview(), groups: [{ id: 'region-a', name: 'A', anchorId: 'a' }, { id: 'region-b', name: 'B', anchorId: 'b' }] });
  initial.regionSet.membership.other = 'region-b';
  assert.equal(mergeProposals(entries, initial, settings).length, 0);
});

test('group map expands to give 10,000 signals separate tiles and disjoint region bounds', () => {
  const set = emptyAtlas('frequency').regionSet;
  for (let g = 0; g < 20; g++) {
    const id = `region-${g}`;
    set.regions.push({ id, name: `Group ${g}`, medoidId: `${g}-0`, count: 500, color: '#abc', summary: '', periodRange: [1, 1], excursionRange: [1, 1] });
    for (let n = 0; n < 500; n++) set.membership[`${g}-${n}`] = id;
  }
  const layout = layoutLibrary(set);
  assert.equal(Object.keys(layout.points).length, 10000);
  const buckets = new Map<string, { x: number; y: number }[]>();
  for (const p of Object.values(layout.points)) {
    const bx = Math.floor(p.x / 12), by = Math.floor(p.y / 10);
    for (let x = bx - 1; x <= bx + 1; x++) for (let y = by - 1; y <= by + 1; y++) for (const other of buckets.get(`${x},${y}`) || []) assert.ok(Math.abs(p.x - other.x) >= 12 - 1e-9 || Math.abs(p.y - other.y) >= 9 - 1e-9, 'Selectable rectangles must not overlap.');
    const key = `${bx},${by}`; buckets.set(key, [...buckets.get(key) || [], p]);
  }
  for (const a of layout.areas) for (const b of layout.areas) if (a !== b) assert.ok(a.bounds.right <= b.bounds.left || a.bounds.left >= b.bounds.right || a.bounds.bottom <= b.bounds.top || a.bounds.top >= b.bounds.bottom);
});

test('corrupt library review storage remains recoverable without writes', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === LIBRARY_REVIEW_KEY ? '{bad' : null, setItem: () => { writes++; } } });
  try {
    const legacy = { frequency: newReviewWorkspace(emptyAtlas('frequency')), pri: newReviewWorkspace(emptyAtlas('pri')) };
    assert.match(loadLibraryReviews(legacy).error, /left untouched/); assert.equal(writes, 0);
    assert.deepEqual(librarySettings(DEFAULT_GROUPING, 'frequency'), DEFAULT_GROUPING);
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('library review migration preserves earlier decisions and rejects swapped quantities', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let text: string | null = null, writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => text, setItem: () => { writes++; } } });
  try {
    const legacy = { frequency: newReviewWorkspace(emptyAtlas('frequency')), pri: newReviewWorkspace(emptyAtlas('pri')) };
    legacy.frequency.current = { ...emptyReview(), groups: [{ id: 'region-a', name: 'Reviewed group', anchorId: 'a' }], placements: { a: 'region-a' } };
    const migrated = loadLibraryReviews(legacy);
    assert.equal(migrated.error, ''); assert.deepEqual(migrated.reviews.frequency.current, legacy.frequency.current);
    text = JSON.stringify({ version: 1, frequency: newLibraryReviewWorkspace('pri'), pri: newLibraryReviewWorkspace('frequency') });
    assert.match(loadLibraryReviews(legacy).error, /Invalid library review history/);
    assert.equal(writes, 0);
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
