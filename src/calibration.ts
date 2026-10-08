import type { Weights } from './types.ts';

export type ScoreCalibration = { mean: number; scale: number; slope: number; intercept: number };
export type CalibrationProfile = {
  protocol: 'balanced-logistic-v1'; datasetId: string; datasetSignature: string;
  quantity: 'frequency' | 'pri'; referenceSignature: string; weightsSignature: string;
  formula: ScoreCalibration; vision: ScoreCalibration;
  visionModel?: 'overlap' | 'siamese';
};
export const weightsSignature = (weights: Weights) => JSON.stringify([weights.shape, weights.period, weights.excursion, weights.centre]);
export function signature(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
const sigmoid = (x: number) => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
export function calibratedScore(score: number, model: ScoreCalibration) {
  return sigmoid(model.intercept + model.slope * (score - model.mean) / model.scale);
}

// Monotonic logistic fit with equally weighted positive/negative classes.
// This puts modalities on a shared balanced-pair evidence scale, not an
// operational match probability (real class priors are unknown).
export function fitCalibration(pairs: { score: number; match: boolean }[]): ScoreCalibration {
  const positives = pairs.filter(p => p.match).length, negatives = pairs.length - positives;
  if (!positives || !negatives || pairs.some(p => !Number.isFinite(p.score) || p.score < 0 || p.score > 1)) throw new Error('Calibration requires finite similarities and both match/non-match examples.');
  const mean = pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length;
  const scale = Math.max(.01, Math.sqrt(pairs.reduce((sum, p) => sum + (p.score - mean) ** 2, 0) / pairs.length));
  let slope = 0, intercept = 0;
  for (let iteration = 0; iteration < 1500; iteration++) {
    let ds = .01 * slope, di = 0;
    for (const pair of pairs) {
      const x = (pair.score - mean) / scale, w = .5 / (pair.match ? positives : negatives);
      const error = sigmoid(intercept + slope * x) - Number(pair.match);
      ds += w * error * x; di += w * error;
    }
    slope = Math.max(0, Math.min(30, slope - .2 * ds));
    intercept = Math.max(-30, Math.min(30, intercept - .2 * di));
  }
  return { mean, scale, slope, intercept };
}

export function validateCalibration(value: unknown): CalibrationProfile {
  const p = value as CalibrationProfile;
  const valid = (m: ScoreCalibration) => m && [m.mean, m.scale, m.slope, m.intercept].every(Number.isFinite) && m.mean >= 0 && m.mean <= 1 && m.scale >= .01 && m.scale <= 1 && m.slope >= 0 && m.slope <= 30 && Math.abs(m.intercept) <= 30;
  if (!p || p.protocol !== 'balanced-logistic-v1' || !['frequency', 'pri'].includes(p.quantity) ||
    [p.datasetId, p.datasetSignature, p.referenceSignature, p.weightsSignature].some(v => typeof v !== 'string' || !v || v.length > 200) || (p.visionModel !== undefined && !['overlap', 'siamese'].includes(p.visionModel)) || !valid(p.formula) || !valid(p.vision)) throw new Error('Invalid score calibration profile.');
  return { ...p, formula: { ...p.formula }, vision: { ...p.vision } };
}
