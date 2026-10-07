import type { AtlasData, Weights } from './types.ts';
import type { GroupingSettings, MatchScore } from './grouping.ts';
import { DEFAULT_GROUPING, referenceRepresentatives, referenceSignature, similarityScorer, validateGrouping } from './grouping.ts';
import { calibratedScore, fitCalibration, weightsSignature } from './calibration.ts';
import type { CalibrationProfile } from './calibration.ts';
import { datasetSignature, SPLITS, validateEvaluationDataset } from './evaluationData.ts';
import type { EvaluationDataset, Split } from './evaluationData.ts';

export type PreparedExample = { id: string; sourceId: string; split: Split; expectedRegionId: string | null; pairs: MatchScore[] };
export type Outcome = { id: string; sourceId: string; expectedRegionId: string | null; predictedRegionId: string | null; score: number; correct: boolean };
export type Metrics = { total: number; known: number; unfamiliar: number; knownCorrect: number; unfamiliarCorrect: number; falseMerges: number; falseSplits: number; wrongGroups: number; balancedAccuracy: number };
export type EvaluationMethod = { id: string; name: string; settings: GroupingSettings; tuning: Metrics; test: Metrics; interval: [number, number]; outcomes: Outcome[] };
export type CalibrationDiagnostic = { name: string; brier: number | null; ece: number | null; bins: { lower: number; upper: number; pairs: number; predicted: number; observed: number }[] };
export type EvaluationReport = {
  protocol: 'source-separated-evaluation-v1'; datasetId: string; datasetSignature: string; description: string; quantity: 'frequency' | 'pri';
  referenceSignature: string; weights: Weights; splits: { split: Split; examples: number; sources: number; known: number; unfamiliar: number }[];
  coveredRegionIds: string[]; totalRegions: number; methods: EvaluationMethod[]; recommendation: GroupingSettings;
  pairedChange: { versus: string; value: number; interval: [number, number] }; diagnostics: CalibrationDiagnostic[];
};

export function prepareEvaluation(atlas: AtlasData, dataset: EvaluationDataset, weights: Weights): PreparedExample[] {
  const data = validateEvaluationDataset(dataset, atlas);
  const score = similarityScorer({ ...DEFAULT_GROUPING, weights, formulaWeight: .5 });
  const representatives = referenceRepresentatives(atlas);
  return data.examples.map(e => ({ id: e.entry.id, sourceId: e.sourceId, split: e.split, expectedRegionId: e.expectedRegionId,
    pairs: Object.entries(representatives).flatMap(([regionId, reps]) => reps.flatMap(rep => {
      const result = score(e.entry, rep);
      return result ? [{ ...result, regionId, representativeId: rep.id }] : [];
    })) }));
}

export function predict(example: PreparedExample, settings: GroupingSettings): Outcome {
  const candidates = example.pairs.map(pair => {
    const formula = settings.calibration ? calibratedScore(pair.rawFormula, settings.calibration.formula) : pair.rawFormula;
    const vision = settings.calibration ? calibratedScore(pair.rawVision!, settings.calibration.vision) : pair.rawVision!;
    return { ...pair, combined: settings.formulaWeight * formula + (1 - settings.formulaWeight) * vision };
  }).sort((a, b) => b.combined - a.combined || a.regionId.localeCompare(b.regionId) || a.representativeId.localeCompare(b.representativeId));
  const best = candidates[0];
  const predictedRegionId = best && best.combined >= settings.threshold ? best.regionId : null;
  return { id: example.id, sourceId: example.sourceId, expectedRegionId: example.expectedRegionId, predictedRegionId, score: best?.combined ?? 0, correct: predictedRegionId === example.expectedRegionId };
}

export function evaluateOutcomes(rows: Outcome[]): Metrics {
  const known = rows.filter(r => r.expectedRegionId !== null), unfamiliar = rows.filter(r => r.expectedRegionId === null);
  const knownCorrect = known.filter(r => r.correct).length, unfamiliarCorrect = unfamiliar.filter(r => r.correct).length;
  return { total: rows.length, known: known.length, unfamiliar: unfamiliar.length, knownCorrect, unfamiliarCorrect,
    falseMerges: unfamiliar.length - unfamiliarCorrect, falseSplits: known.filter(r => r.predictedRegionId === null).length,
    wrongGroups: known.filter(r => r.predictedRegionId !== null && !r.correct).length,
    balancedAccuracy: .5 * (knownCorrect / (known.length || 1) + unfamiliarCorrect / (unfamiliar.length || 1)) };
}

// Only the tune split is accepted here. No test labels participate in selection.
export function tuneSettings(examples: PreparedExample[], base: GroupingSettings, shares: number[]): { settings: GroupingSettings; metrics: Metrics } {
  if (!examples.length || examples.some(e => e.split !== 'tune')) throw new Error('Parameter selection requires the tune split only.');
  let selected: { settings: GroupingSettings; metrics: Metrics } | undefined;
  for (const formulaWeight of shares) {
    const scores = examples.map(e => predict(e, { ...base, formulaWeight, threshold: 1 }).score);
    const distinct = [...new Set([0, 1, ...scores])].sort((a, b) => a - b);
    const thresholds = [1, ...distinct.slice(1).map((score, i) => (score + distinct[i]) / 2)].filter(t => t > 0 && t <= 1);
    for (const threshold of thresholds) {
      const settings = { ...base, formulaWeight, threshold }, metrics = evaluateOutcomes(examples.map(e => predict(e, settings)));
      const prior = selected;
      if (!prior || metrics.balancedAccuracy > prior.metrics.balancedAccuracy + 1e-12 ||
        (Math.abs(metrics.balancedAccuracy - prior.metrics.balancedAccuracy) < 1e-12 &&
          (metrics.falseMerges < prior.metrics.falseMerges || metrics.falseMerges === prior.metrics.falseMerges &&
            (formulaWeight > prior.settings.formulaWeight || formulaWeight === prior.settings.formulaWeight && Math.abs(threshold - .5) < Math.abs(prior.settings.threshold - .5))))) selected = { settings, metrics };
    }
  }
  return selected!;
}

function sourceInterval(rows: Outcome[], comparison?: Outcome[]): [number, number] {
  const groups = new Map<string, Outcome[]>();
  rows.forEach(r => groups.set(r.sourceId, [...(groups.get(r.sourceId) || []), r]));
  const known = [...groups.values()].filter(g => g[0].expectedRegionId !== null), novel = [...groups.values()].filter(g => g[0].expectedRegionId === null);
  const others = new Map(comparison?.map(r => [r.id, r]));
  let state = 20261007;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 2 ** 32; };
  const values = Array.from({ length: 500 }, () => {
    const sample = [known, novel].flatMap(pool => Array.from({ length: pool.length }, () => pool[Math.floor(random() * pool.length)]).flat());
    const result = evaluateOutcomes(sample).balancedAccuracy;
    return comparison ? result - evaluateOutcomes(sample.map(r => others.get(r.id)!)).balancedAccuracy : result;
  }).sort((a, b) => a - b);
  return [values[12], values[487]];
}

function diagnostic(name: string, pairs: { score: number; match: boolean }[]): CalibrationDiagnostic {
  const positives = pairs.filter(p => p.match).length, negatives = pairs.length - positives;
  if (!positives || !negatives) return { name, brier: null, ece: null, bins: [] };
  const weight = (match: boolean) => .5 / (match ? positives : negatives);
  const brier = pairs.reduce((sum, p) => sum + weight(p.match) * (p.score - Number(p.match)) ** 2, 0);
  let ece = 0;
  const bins = Array.from({ length: 5 }, (_, i) => {
    const lower = i / 5, upper = (i + 1) / 5;
    const members = pairs.filter(p => p.score >= lower && (p.score < upper || i === 4 && p.score <= upper));
    const mass = members.reduce((sum, p) => sum + weight(p.match), 0);
    const predicted = members.reduce((sum, p) => sum + weight(p.match) * p.score, 0) / (mass || 1);
    const observed = members.reduce((sum, p) => sum + weight(p.match) * Number(p.match), 0) / (mass || 1);
    ece += mass * Math.abs(predicted - observed);
    return { lower, upper, pairs: members.length, predicted, observed };
  });
  return { name, brier, ece, bins };
}

export function runEvaluation(atlas: AtlasData, dataset: EvaluationDataset, weights: Weights): EvaluationReport {
  validateGrouping({ ...DEFAULT_GROUPING, weights });
  const prepared = prepareEvaluation(atlas, dataset, weights);
  const fit = prepared.filter(e => e.split === 'fit'), tune = prepared.filter(e => e.split === 'tune'), test = prepared.filter(e => e.split === 'test');
  const labelledPairs = (examples: PreparedExample[], key: 'rawFormula' | 'rawVision') => examples.flatMap(e => e.pairs.map(p => ({ score: p[key]!, match: e.expectedRegionId === p.regionId })));
  const profile: CalibrationProfile = { protocol: 'balanced-logistic-v1', quantity: dataset.quantity, datasetId: dataset.id, datasetSignature: datasetSignature(dataset),
    referenceSignature: referenceSignature(atlas), weightsSignature: weightsSignature(weights),
    formula: fitCalibration(labelledPairs(fit, 'rawFormula')), vision: fitCalibration(labelledPairs(fit, 'rawVision')) };
  const raw = { ...DEFAULT_GROUPING, weights, formulaWeight: 1, threshold: .82 }, calibrated = { ...raw, calibration: profile };
  // Freeze choices from tune before evaluating any test label.
  const tunedRaw = tuneSettings(tune, raw, [1]);
  const formula = tuneSettings(tune, calibrated, [1]);
  const hybrid = tuneSettings(tune, calibrated, [.25, .5, .75]);
  const recommendation = hybrid.metrics.balancedAccuracy > formula.metrics.balancedAccuracy + 1e-12 ||
    Math.abs(hybrid.metrics.balancedAccuracy - formula.metrics.balancedAccuracy) < 1e-12 && hybrid.metrics.falseMerges < formula.metrics.falseMerges ? hybrid.settings : formula.settings;
  const methods = [
    { id: 'raw-default', name: 'Raw formula · 82% threshold', settings: raw },
    { id: 'raw-tuned', name: 'Raw formula · tuned threshold', settings: tunedRaw.settings },
    { id: 'calibrated-formula', name: 'Calibrated formula', settings: formula.settings },
    { id: 'calibrated-blend', name: 'Calibrated hybrid', settings: hybrid.settings },
    { id: 'raw-hybrid-default', name: 'Default hybrid · 70% formula / 30% vision', settings: { ...DEFAULT_GROUPING, weights } },
  ].map(method => {
    const outcomes = test.map(e => predict(e, method.settings));
    return { ...method, tuning: evaluateOutcomes(tune.map(e => predict(e, method.settings))), test: evaluateOutcomes(outcomes), interval: sourceInterval(outcomes), outcomes };
  });
  const testFormula = labelledPairs(test, 'rawFormula'), testVision = labelledPairs(test, 'rawVision');
  const final = methods[3], baseline = methods[2];
  return { protocol: 'source-separated-evaluation-v1', datasetId: dataset.id, datasetSignature: profile.datasetSignature, quantity: dataset.quantity, description: dataset.description,
    referenceSignature: profile.referenceSignature, weights: { ...weights },
    splits: SPLITS.map(split => { const rows = prepared.filter(e => e.split === split); return { split, examples: rows.length, sources: new Set(rows.map(e => e.sourceId)).size, known: rows.filter(e => e.expectedRegionId !== null).length, unfamiliar: rows.filter(e => e.expectedRegionId === null).length }; }),
    coveredRegionIds: [...new Set(test.filter(e => e.expectedRegionId !== null).map(e => e.expectedRegionId!))].sort(), totalRegions: atlas.regionSet.regions.length,
    methods, recommendation,
    pairedChange: { versus: baseline.name, value: final.test.balancedAccuracy - baseline.test.balancedAccuracy, interval: sourceInterval(final.outcomes, baseline.outcomes) },
    diagnostics: [diagnostic('Raw formula', testFormula), diagnostic('Calibrated formula', testFormula.map(p => ({ ...p, score: calibratedScore(p.score, profile.formula) }))),
      diagnostic('Raw vision', testVision), diagnostic('Calibrated vision', testVision.map(p => ({ ...p, score: calibratedScore(p.score, profile.vision) })))],
  };
}
