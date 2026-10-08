import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AtlasData } from '../src/types.ts';
import { calibratedScore, fitCalibration, weightsSignature } from '../src/calibration.ts';
import { DEFAULT_GROUPING, groupIncoming, referenceRepresentatives, referenceSignature, validateGrouping, validateGroupingForAtlas } from '../src/grouping.ts';
import { datasetSignature, morphologyKey, syntheticEvaluationDataset, validateEvaluationDataset } from '../src/evaluationData.ts';
import { evaluateOutcomes, predict, prepareEvaluation, runEvaluation, tuneSettings } from '../src/evaluation.ts';
import type { Outcome } from '../src/evaluation.ts';
import { SHAPE_WEIGHTS } from '../src/signal.ts';
import { GROUPING_KEY } from '../src/grouping.ts';
import { loadGroupingSettings, QUANTITY_GROUPING_KEY } from '../src/groupingStorage.ts';

const atlases = ['atlas', 'pri-atlas'].map(name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8')) as AtlasData);
const datasets = atlases.map(syntheticEvaluationDataset);
const reports = atlases.map((atlas, i) => runEvaluation(atlas, datasets[i], SHAPE_WEIGHTS));

test('benchmarks exclude active reference curves, isolate source morphologies, and disclose region coverage', () => {
  for (const [i, atlas] of atlases.entries()) {
    const dataset = datasets[i], validated = validateEvaluationDataset(dataset, atlas);
    assert.equal(validated.examples.length, 72);
    const references = new Set(Object.values(referenceRepresentatives(atlas)).flat().map(morphologyKey));
    const splits = new Map<string, string>();
    for (const e of dataset.examples) {
      assert.ok(!references.has(morphologyKey(e.entry)));
      const old = splits.get(e.sourceId); assert.ok(!old || old === e.split); splits.set(e.sourceId, e.split);
    }
    assert.equal(reports[i].coveredRegionIds.length, 6);
    assert.equal(reports[i].totalRegions, 12);
    assert.ok(reports[i].splits.every(s => s.examples === 24 && s.sources === 12 && s.known === 18 && s.unfamiliar === 6));
    assert.equal(datasetSignature(dataset), datasetSignature(syntheticEvaluationDataset(atlas)));
    assert.equal(datasetSignature(dataset), datasetSignature(validated), 'Export/import must preserve the scoring-data fingerprint.');
  }
});

test('changing held-out labels cannot alter fitted models, blend selection or thresholds', () => {
  const modified = structuredClone(datasets[0]);
  for (const e of modified.examples) if (e.split === 'test' && e.expectedRegionId) e.expectedRegionId = atlases[0].regionSet.regions[1].id;
  const changed = runEvaluation(atlases[0], modified, SHAPE_WEIGHTS), original = reports[0];
  for (const [i, method] of original.methods.entries()) {
    const next = changed.methods[i];
    assert.equal(method.settings.threshold, next.settings.threshold);
    assert.equal(method.settings.formulaWeight, next.settings.formulaWeight);
    assert.deepEqual(method.settings.calibration?.formula, next.settings.calibration?.formula);
    assert.deepEqual(method.settings.calibration?.vision, next.settings.calibration?.vision);
    assert.deepEqual(method.tuning, next.tuning);
  }
  assert.equal(original.recommendation.threshold, changed.recommendation.threshold);
  assert.equal(original.recommendation.formulaWeight, changed.recommendation.formulaWeight);
  assert.notDeepEqual(original.methods[2].test, changed.methods[2].test);
});

test('evaluation scores reproduce actual live grouping for each frozen method', () => {
  for (const [i, atlas] of atlases.entries()) {
    const data = validateEvaluationDataset(datasets[i], atlas), testExamples = data.examples.filter(e => e.split === 'test');
    for (const method of reports[i].methods) {
      for (const e of testExamples) {
        const assignment = groupIncoming(atlas, [e.entry], method.settings).assignments[e.entry.id];
        const expected = method.outcomes.find(o => o.id === e.entry.id)!;
        assert.equal(assignment.created ? null : assignment.regionId, expected.predictedRegionId);
        assert.ok(Math.abs((assignment.candidates[0]?.combined ?? 0) - expected.score) < 1e-12);
      }
    }
  }
});

test('metrics distinguish false merges, false splits and wrong known groups', () => {
  const rows: Outcome[] = [
    { id: '1', sourceId: '1', expectedRegionId: 'a', predictedRegionId: 'b', score: .9, correct: false },
    { id: '2', sourceId: '2', expectedRegionId: 'a', predictedRegionId: null, score: .1, correct: false },
    { id: '3', sourceId: '3', expectedRegionId: null, predictedRegionId: 'b', score: .9, correct: false },
    { id: '4', sourceId: '4', expectedRegionId: null, predictedRegionId: null, score: .1, correct: true },
  ];
  const result = evaluateOutcomes(rows);
  assert.equal(result.falseMerges, 1); assert.equal(result.falseSplits, 1); assert.equal(result.wrongGroups, 1); assert.equal(result.balancedAccuracy, .25);
});

test('calibration is bounded and monotonic, handles uninformative data, and rejects one-class fits', () => {
  const model = fitCalibration([{ score: .1, match: false }, { score: .2, match: false }, { score: .8, match: true }, { score: .9, match: true }]);
  const values = [0, .2, .5, .8, 1].map(s => calibratedScore(s, model));
  assert.ok(values.every(v => v >= 0 && v <= 1)); assert.deepEqual(values, [...values].sort((a, b) => a - b));
  assert.ok(values[0] < .2 && values.at(-1)! > .8);
  const flat = fitCalibration([{ score: .5, match: false }, { score: .5, match: true }]);
  assert.equal(flat.slope, 0); assert.equal(calibratedScore(.5, flat), .5);
  assert.throws(() => fitCalibration([{ score: .1, match: true }]), /both/);
});

test('profiles cannot be applied to changed quantities, reference data or feature weights', () => {
  const settings = reports[0].recommendation;
  assert.deepEqual(validateGrouping(settings), settings);
  assert.throws(() => validateGrouping({ ...settings, visionModel: 'siamese' }), /different vision model/);
  assert.throws(() => validateGrouping({ ...settings, weights: { ...SHAPE_WEIGHTS, period: .2 } }), /weights changed/);
  assert.throws(() => validateGroupingForAtlas(settings, atlases[1]), /another quantity/);
  const changed = structuredClone(atlases[0]);
  const representative = changed.entries.find(e => e.id === changed.regionSet.regions[0].medoidId)!;
  representative.samples[2].f += .01;
  assert.throws(() => validateGroupingForAtlas(settings, changed), /reference catalogue/);
  assert.throws(() => validateGrouping({ ...settings, calibration: { ...settings.calibration!, formula: { ...settings.calibration!.formula, scale: 0 } } }), /Invalid/);
});

test('dataset validation rejects source leakage, exact cross-split curves, missing classes and conflicting labels', () => {
  const modify = (fn: (data: typeof datasets[0]) => void, pattern: RegExp) => { const data = structuredClone(datasets[0]); fn(data); assert.throws(() => validateEvaluationDataset(data, atlases[0]), pattern); };
  modify(d => { d.examples.find(e => e.split === 'test')!.sourceId = d.examples[0].sourceId; }, /across splits/);
  modify(d => { const e = d.examples.find(e => e.split === 'test')!; e.entry = { ...structuredClone(d.examples[0].entry), id: e.entry.id }; }, /same normalized curve/);
  modify(d => { d.examples[1].expectedRegionId = null; }, /conflicting labels/);
  modify(d => { for (const e of d.examples) if (e.split === 'fit') e.expectedRegionId = null; }, /fit needs both/);
  modify(d => { d.examples[0].entry = { ...structuredClone(Object.values(referenceRepresentatives(atlases[0]))[0][0]), id: d.examples[0].entry.id }; }, /duplicates an active reference/);
  modify(d => { d.examples[0].expectedRegionId = 'region-does-not-exist'; }, /valid reference region/);
});

test('tuning rejects test examples and breaks equal scores toward formula-only without using test results', () => {
  const prepared = prepareEvaluation(atlases[0], datasets[0], SHAPE_WEIGHTS);
  assert.throws(() => tuneSettings(prepared.filter(e => e.split === 'test'), DEFAULT_GROUPING, [1]), /tune split only/);
  const tuning = tuneSettings(prepared.filter(e => e.split === 'tune'), DEFAULT_GROUPING, [0, .5, 1]);
  assert.equal(tuning.settings.formulaWeight, 1);
  assert.ok(predict(prepared[0], tuning.settings).score > 0);
});

test('compact worker references have the same profile identity as the live catalogue', () => {
  for (const atlas of atlases) {
    const entries = Object.values(referenceRepresentatives(atlas)).flat(), membership = Object.fromEntries(entries.map(e => [e.id, atlas.regionSet.membership[e.id]]));
    assert.equal(referenceSignature({ ...atlas, entries, regionSet: { ...atlas.regionSet, membership } }), referenceSignature(atlas));
  }
});

test('legacy settings migrate by quantity without writing storage, and calibrated v2 settings round trip', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const saved = new Map<string, string>([[GROUPING_KEY, JSON.stringify({ ...DEFAULT_GROUPING, formulaWeight: .7 })]]);
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => saved.get(key) ?? null, setItem: () => { writes++; } } });
  try {
    const legacy = loadGroupingSettings(...atlases as [AtlasData, AtlasData]);
    assert.equal(legacy.error, ''); assert.equal(legacy.settings.frequency.formulaWeight, .7); assert.equal(legacy.settings.pri.formulaWeight, .7); assert.equal(writes, 0);
    const settings = { frequency: reports[0].recommendation, pri: reports[1].recommendation };
    saved.set(QUANTITY_GROUPING_KEY, JSON.stringify(settings));
    assert.deepEqual(loadGroupingSettings(...atlases as [AtlasData, AtlasData]).settings, settings);
    saved.set(QUANTITY_GROUPING_KEY, '{broken');
    assert.match(loadGroupingSettings(...atlases as [AtlasData, AtlasData]).error, /left untouched/); assert.equal(writes, 0);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); }
  assert.equal(weightsSignature(reports[0].weights), weightsSignature(SHAPE_WEIGHTS));
});
