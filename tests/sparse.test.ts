import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseImport, validateCycle, exportEntry, loadImports, STORAGE_KEY } from '../src/importExport.ts';
import { sampleAt, phaseGrid, plotSamples, compare, SHAPE_WEIGHTS } from '../src/signal.ts';
import { observationSummary } from '../src/observation.ts';
import { groupIncoming, similarityScorer, DEFAULT_GROUPING, referenceSignature } from '../src/grouping.ts';
import { datasetSignature } from '../src/evaluationData.ts';
import type { EvaluationDataset } from '../src/evaluationData.ts';
import type { AtlasData } from '../src/types.ts';

const input = () => ({ period: 1, units: { time: 's', frequency: 'Hz' }, sampling: 'sparse-periodic', interpolation: 'hold',
  samples: [.05, .15, .25, .35, .45, .55, .65, .75, .85, .95].map((t, i) => ({ t, f: [12, 10, 12, 12, 11, 11, 14, null, 10, null][i] })) });

test('sparse import preserves measured values and missing timestamps, with explicit bounded reconstruction', () => {
  const raw = input(), before = structuredClone(raw), entry = validateCycle(raw);
  assert.deepEqual(raw, before);
  assert.equal(entry.samples.length, 8);
  assert.deepEqual(entry.missingTimes, [.75, .95]);
  assert.deepEqual(entry.samples, raw.samples.filter(s => s.f !== null));
  const summary = observationSummary(entry);
  assert.equal(summary.observedPoints, 8); assert.equal(summary.missingPoints, 2);
  assert.ok(Math.abs(summary.largestGapFraction - .2) < 1e-12);
  assert.equal(entry.centre, 12); assert.equal(entry.excursion, 4);
  assert.throws(() => validateCycle({ ...raw, interpolation: undefined }), /explicit interpolation/);
  assert.throws(() => validateCycle({ ...raw, interpolation: 'spline' }), /linear or hold/);
  assert.throws(() => validateCycle({ ...raw, samples: raw.samples.map((s, i) => i === 0 ? { ...s, f: null } : s) }), /at least 8 observed/);
});

test('count alone cannot admit sparse coverage or fill an unbounded wrap gap', () => {
  const raw = input();
  assert.throws(() => validateCycle({ ...raw, samples: Array.from({ length: 8 }, (_, i) => ({ t: i / 100, f: i + 1 })) }), /Largest gap.*including the wrap/);
  const internalGap = Array.from({ length: 8 }, (_, i) => ({ t: [.01, .02, .03, .04, .45, .6, .75, .9][i], f: i + 1 }));
  assert.throws(() => validateCycle({ ...raw, samples: internalGap }), /Largest gap/);
  assert.throws(() => validateCycle({ ...raw, samples: raw.samples.map((s, i) => i === 0 ? { ...s, t: -1 } : s) }), /within \[0, period\)/);
  assert.throws(() => validateCycle({ ...raw, samples: [...raw.samples, { t: 1, f: 12 }] }), /without a repeated endpoint/);
  assert.throws(() => validateCycle({ ...raw, samples: [...raw.samples].reverse() }), /duplicate or unordered/);
  assert.throws(() => validateCycle({ ...raw, missingTimes: [.75] }), /must be unique/);
  assert.throws(() => validateCycle({ ...raw, samples: raw.samples.map((s, i) => i === 0 ? { ...s, f: NaN } : s) }), /finite number/);
  assert.throws(() => validateCycle({ ...raw, quantity: 'pri', units: { time: 's', frequency: 'ms' }, samples: raw.samples.map((s, i) => i === 0 ? { ...s, f: 0 } : s) }), /greater than zero/);
});

test('hold retains hopping jumps and linear filling stays between observations across the periodic seam', () => {
  const hold = validateCycle(input()), linear = validateCycle({ ...input(), interpolation: 'linear' });
  assert.equal(sampleAt(hold, .2), 10); assert.equal(sampleAt(linear, .2), 11);
  assert.equal(sampleAt(hold, .15), 10, 'An exact observed hop belongs to its new dwell.');
  assert.equal(sampleAt(hold, 0), 10); assert.ok(Math.abs(sampleAt(linear, 0) - 11.5) < 1e-12);
  assert.equal(sampleAt(hold, .95), 10); assert.ok(Math.abs(sampleAt(linear, .95) - 11) < 1e-12);
  assert.equal(sampleAt(hold, 1), sampleAt(hold, 0));
  assert.equal(sampleAt(hold, -.1), sampleAt(hold, .9));
  for (const entry of [hold, linear]) {
    assert.ok(phaseGrid(entry).every(v => Number.isFinite(v) && Math.abs(v) <= .5));
    for (const s of entry.samples) assert.ok(Math.abs(sampleAt(entry, s.t) - s.f) < 1e-10);
  }
  assert.ok(compare(hold, linear, SHAPE_WEIGHTS).shape > .05, 'Holds and ramps must not silently become equivalent.');
  const shift = .125, raw = input();
  const shifted = validateCycle({ ...raw, samples: raw.samples.map(s => ({ ...s, t: (s.t + shift) % 1 })).sort((a, b) => a.t - b.t) });
  assert.ok(compare(hold, shifted, SHAPE_WEIGHTS).shape < 1e-10);
});

test('step rendering includes exact horizontal dwells and vertical jumps in original and aligned repeated plots', () => {
  const entry = validateCycle(input()), points = plotSamples(entry, 3);
  assert.equal(points[0].t, 0); assert.equal(points.at(-1)!.t, 3);
  const hop = points.filter(p => Math.abs(p.t - .15) < 1e-12);
  assert.deepEqual(hop.map(p => p.f), [12, 10]);
  for (let i = 1; i < points.length; i++) assert.ok(points[i].t === points[i - 1].t || points[i].f === points[i - 1].f, 'Every segment is horizontal or vertical.');
  const aligned = plotSamples(entry, 3, true, .125);
  assert.equal(aligned.at(-1)!.t, 3);
  assert.ok(aligned.every(p => Math.abs(p.f) <= .5));
  assert.ok(aligned.every((p, i) => !i || p.t >= aligned[i - 1].t));
});

test('CSV/JSON and local storage retain reconstruction choice and explicit missing rows', () => {
  const entry = validateCycle(input(), 'sparse.csv', 'local-sparse-test');
  for (const format of ['json', 'csv'] as const) {
    const restored = parseImport(exportEntry(entry, format), `sparse.${format}`);
    assert.deepEqual(restored.samples, entry.samples); assert.deepEqual(restored.missingTimes, entry.missingTimes);
    assert.equal(restored.interpolation, 'hold'); assert.equal(restored.sampling, 'sparse-periodic');
    assert.deepEqual(phaseGrid(restored), phaseGrid(entry));
  }
  const csv = exportEntry(entry, 'csv');
  assert.match(csv, /0.75,\n/); assert.match(csv, /# interpolation: hold/);
  assert.equal(parseImport(csv.replace('0.75,\n', '0.75,null\n'), 'missing.csv').samples.length, 8);
  for (const quantity of ['frequency', 'pri']) {
    const example = parseImport(readFileSync(new URL(`../public/examples/sparse-${quantity}-cycle.csv`, import.meta.url), 'utf8'), 'example.csv');
    assert.equal(example.quantity || 'frequency', quantity);
    assert.equal(example.samples.length, 8); assert.equal(example.missingTimes!.length, 2);
  }
  assert.throws(() => parseImport(csv.replace('# sampling: sparse-periodic', '# sampling: closed-endpoint').replace('0.05,12', '0,12'), 'strict.csv'), /finite number/);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify([entry]) : null } });
    const restored = loadImports()[0];
    assert.deepEqual(restored.samples, entry.samples); assert.deepEqual(restored.missingTimes, entry.missingTimes);
    assert.equal(restored.interpolation, entry.interpolation);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('sparse matching and replay use the declared reconstruction, and evaluation fingerprints include it', () => {
  const atlas = JSON.parse(readFileSync(new URL('../src/data/atlas.json', import.meta.url), 'utf8')) as AtlasData;
  const a = validateCycle(input(), 'a.csv', 'local-sparse-a'), b = validateCycle(input(), 'b.csv', 'local-sparse-b');
  const before = structuredClone(a), settings = { ...DEFAULT_GROUPING, formulaWeight: 1 };
  assert.equal(similarityScorer(settings)(a, b)!.combined, 1);
  const result = groupIncoming(atlas, [a, b], settings);
  assert.equal(result.regionSet.membership[a.id], result.regionSet.membership[b.id]);
  assert.deepEqual(groupIncoming(atlas, [a, b].map(e => validateCycle(JSON.parse(exportEntry(e, 'json')), e.name, e.id)), settings), result);
  assert.deepEqual(a, before);
  const dataset: EvaluationDataset = { version: 1, id: 'sparse-test', quantity: 'frequency', description: '', examples: [{ sourceId: 'sparse-source', split: 'fit', expectedRegionId: null, entry: a }] };
  assert.notEqual(datasetSignature(dataset), datasetSignature({ ...dataset, examples: [{ ...dataset.examples[0], entry: { ...a, interpolation: 'linear' } }] }));
  const medoidId = atlas.regionSet.regions[0].medoidId;
  assert.notEqual(referenceSignature(atlas), referenceSignature({ ...atlas, entries: atlas.entries.map(e => e.id === medoidId ? { ...e, interpolation: 'hold' } : e) }));
});
