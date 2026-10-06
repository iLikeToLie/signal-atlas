import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AtlasData, Entry } from '../src/types.ts';
import { DEFAULT_GROUPING, groupIncoming, validateGrouping } from '../src/grouping.ts';
import { controlInserts } from '../src/controlInserts.ts';
import { curveImage, imageSimilarity } from '../src/vision.ts';
import { compare, phaseGrid, DEFAULT_WEIGHTS, SHAPE_WEIGHTS } from '../src/signal.ts';
import { validateCycle, loadImports, STORAGE_KEY } from '../src/importExport.ts';
import { layoutIncoming, layoutRegions } from '../src/displayLayout.ts';

const atlases = ['atlas', 'pri-atlas'].map(file => JSON.parse(readFileSync(new URL(`../src/data/${file}.json`, import.meta.url), 'utf8')) as AtlasData);
const atlas = atlases[0];

test('fixed control inserts join, branch, repeat, and probe the threshold for both quantities', () => {
  for (const source of atlases) {
    const before = structuredClone(source), controls = controlInserts(source);
    assert.deepEqual(controls, controlInserts(source));
    for (const control of controls) assert.doesNotThrow(() => validateCycle(control.entry));
    const result = groupIncoming(source, controls.map(c => c.entry));
    for (const control of controls) {
      const assignment = result.assignments[control.entry.id];
      assert.equal(assignment.created, control.expected === 'create', control.entry.name);
      if (control.expectedGroup) assert.equal(assignment.regionId, control.expectedGroup);
    }
    const firstNew = result.regionSet.regions.find(r => r.id === `region-${controls[2].entry.id}`)!;
    assert.equal(firstNew.provisional, false); assert.ok(firstNew.count >= 2);
    assert.equal(firstNew.medoidId, controls[2].entry.id);
    assert.equal(result.regionSet.regions.reduce((sum, r) => sum + r.count, 0), source.entries.length + controls.length);
    for (const entry of source.entries) assert.equal(result.regionSet.membership[entry.id], source.regionSet.membership[entry.id]);
    assert.deepEqual(source, before, 'Reference data must remain immutable.');
  }
});

test('storage round trip reproduces assignments; removing and restoring an entry replays deterministically', () => {
  const controls = controlInserts(atlas).map(c => c.entry);
  const imports = controls.map(e => validateCycle(e, 'control.json', e.id));
  const result = groupIncoming(atlas, imports);
  const restored = JSON.parse(JSON.stringify(imports)).map((e: Entry) => validateCycle(e, e.provenance.file, e.id));
  assert.deepEqual(groupIncoming(atlas, restored), result);
  const withoutFounder = imports.filter(e => e.id !== imports[2].id);
  const replay = groupIncoming(atlas, withoutFounder);
  assert.ok(!replay.regionSet.membership[imports[2].id]);
  assert.equal(replay.assignments[imports[3].id].created, true);
  assert.equal(replay.regionSet.membership[imports[3].id], `region-${imports[3].id}`);
  assert.deepEqual(groupIncoming(atlas, imports), result);
});

test('threshold is inclusive; increasing it can branch a borderline example', () => {
  const noisy = controlInserts(atlas)[1].entry;
  const score = groupIncoming(atlas, [noisy]).assignments[noisy.id].candidates[0].combined;
  assert.equal(groupIncoming(atlas, [noisy], { ...DEFAULT_GROUPING, threshold: score }).assignments[noisy.id].created, false);
  assert.equal(groupIncoming(atlas, [noisy], { ...DEFAULT_GROUPING, threshold: score + .001 }).assignments[noisy.id].created, true);
});

test('vision compares standardized images and preserves circular alignment', () => {
  const controls = controlInserts(atlas), a = controls[2].entry, b = controls[3].entry;
  const aGrid = phaseGrid(a), bGrid = phaseGrid(b), alignment = compare(a, b, SHAPE_WEIGHTS);
  assert.equal(imageSimilarity(curveImage(aGrid), curveImage(aGrid)), 1);
  assert.ok(imageSimilarity(curveImage(aGrid), curveImage(bGrid, alignment.shift)) > .999999);
  assert.ok(imageSimilarity(curveImage(aGrid), curveImage(phaseGrid(controls[0].entry))) < .5);
  assert.throws(() => imageSimilarity(new Float32Array(), new Float32Array()));
});

test('hybrid scoring blends actual formula and image scores; disabled vision is omitted', () => {
  const entry = controlInserts(atlas)[1].entry;
  const formulaOnly = groupIncoming(atlas, [entry]).assignments[entry.id];
  assert.ok(formulaOnly.candidates.every(c => c.vision === null && c.combined === c.formula));
  const hybrid = groupIncoming(atlas, [entry], { ...DEFAULT_GROUPING, formulaWeight: .7 }).assignments[entry.id];
  for (const candidate of hybrid.candidates) {
    assert.ok(candidate.vision !== null);
    assert.ok(Math.abs(candidate.combined - (.7 * candidate.formula + .3 * candidate.vision!)) < 1e-12);
    assert.ok(candidate.combined >= 0 && candidate.combined <= 1);
  }
  const visionOnly = groupIncoming(atlas, [entry], { ...DEFAULT_GROUPING, formulaWeight: 0 }).assignments[entry.id];
  assert.ok(visionOnly.candidates.every(c => c.combined === c.vision));
});

test('vision cannot bypass active unit compatibility; cross-quantity insertion is rejected', () => {
  const entry = { ...controlInserts(atlas)[0].entry, units: { time: 's', frequency: 'Hz' } };
  const result = groupIncoming(atlas, [entry], { ...DEFAULT_GROUPING, formulaWeight: 0, weights: DEFAULT_WEIGHTS });
  assert.equal(result.assignments[entry.id].created, true);
  assert.deepEqual(result.assignments[entry.id].candidates, []);
  assert.equal(groupIncoming(atlas, [entry]).assignments[entry.id].created, false, 'Shape-only remains unit-free.');
  assert.throws(() => groupIncoming(atlas, [controlInserts(atlases[1])[0].entry]), /separately/);
  assert.throws(() => groupIncoming(atlas, [entry, entry]), /unique/);
});

test('dynamic layout covers all members without moving reference tiles, and supports 100 new groups', () => {
  const base = layoutRegions(atlas.shapePositions, atlas.regionSet);
  const controls = controlInserts(atlas).map(c => c.entry);
  const grouped = groupIncoming(atlas, controls).regionSet;
  const layout = layoutIncoming(base, grouped);
  for (const id of Object.keys(base.points)) assert.deepEqual(layout.points[id], base.points[id]);
  assert.equal(Object.keys(layout.points).length, 1005);
  assert.equal(new Set(Object.values(layout.points).map(p => `${p.x},${p.y}`)).size, 1005);
  for (const region of grouped.regions) assert.ok(layout.areas.find(a => a.region.id === region.id));
  const expanded = structuredClone(atlas.regionSet);
  for (let i = 0; i < 100; i++) {
    const id = `local-capacity-${i}`, regionId = `region-${id}`;
    expanded.membership[id] = regionId;
    expanded.regions.push({ ...expanded.regions[0], id: regionId, medoidId: id, name: `New group ${i + 1}`, count: 1, local: true, provisional: true });
  }
  const full = layoutIncoming(base, expanded);
  assert.equal(Object.keys(full.points).length, 1100);
  assert.equal(new Set(Object.values(full.points).map(p => `${p.x},${p.y}`)).size, 1100);
  for (const id of Object.keys(base.points)) assert.deepEqual(full.points[id], base.points[id]);
  assert.ok(full.points['local-capacity-99'].y > 295);
});

test('grouping settings reject invalid numbers and zero formula weights', () => {
  assert.deepEqual(validateGrouping(JSON.parse(JSON.stringify(DEFAULT_GROUPING))), DEFAULT_GROUPING);
  for (const threshold of [0, -1, NaN, Infinity, 1.01]) assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, threshold }));
  for (const formulaWeight of [-1, NaN, Infinity, 1.01]) assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, formulaWeight }));
  assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, weights: { shape: 0, period: 0, excursion: 0, centre: 0 } }));
});

test('duplicate saved IDs are reported without modifying recoverable storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const entry = controlInserts(atlas)[0].entry, saved = JSON.stringify([entry, entry]);
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === STORAGE_KEY ? saved : null, setItem: () => { writes++; } } });
  try { assert.throws(() => loadImports(), /unique.*untouched/); assert.equal(writes, 0); }
  finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
