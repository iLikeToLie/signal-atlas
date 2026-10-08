import type { Entry, Weights } from './types.ts';

export const PHASE_SAMPLES = 128;
export const DEFAULT_WEIGHTS: Weights = { shape: 0.65, period: 0.2, excursion: 0.15, centre: 0 };
export const SHAPE_WEIGHTS: Weights = { shape: 1, period: 0, excursion: 0, centre: 0 };
const timeUnits: Record<string, number> = { s: 1, ms: 1e-3, us: 1e-6, tu: 1 };
const frequencyUnits: Record<string, number> = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, fu: 1 };
export const supportedTimeUnits = Object.keys(timeUnits);
export const supportedFrequencyUnits = Object.keys(frequencyUnits);

// Visual playback only: keep very fast/slow physical cycles readable without changing stored time.
export function sweepSeconds(entry: Entry, cycles = 1, speed = 1) {
  const seconds = entry.period * timeUnits[entry.units.time] * cycles / speed;
  return entry.quantity === 'pri'
    ? Math.max(1.2, Math.min(12, seconds))
    : Math.max(.9, Math.min(4.8, seconds / 2.5));
}

export function compatible(a: Entry, b: Entry, weights = DEFAULT_WEIGHTS) {
  const arbitrary = (unit: string) => unit === 'fu' || unit === 'tu';
  return (a.quantity || 'frequency') === (b.quantity || 'frequency') &&
    (weights.period === 0 || arbitrary(a.units.time) === arbitrary(b.units.time)) &&
    ((weights.excursion === 0 && weights.centre === 0) || arbitrary(a.units.frequency) === arbitrary(b.units.frequency));
}

export function sampleAt(entry: Entry, phase: number): number {
  const samples = entry.samples;
  const wrapped = phase % 1;
  const t = (entry.interpolation === 'hold' || entry.sampling === 'sparse-periodic'
    ? wrapped < 0 ? wrapped + 1 : wrapped
    : ((phase % 1 + 1) % 1)) * entry.period;
  let low = 0, high = samples.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (samples[mid].t <= t) low = mid; else high = mid - 1;
  }
  // Sparse cycles may start after phase zero. Bridge only within the explicitly
  // declared periodic model; never extrapolate a nonperiodic recording.
  if (t < samples[0].t) {
    const a = samples.at(-1)!, b = samples[0];
    if (entry.interpolation === 'hold') return a.f;
    return a.f + (b.f - a.f) * (t + entry.period - a.t) / (b.t + entry.period - a.t);
  }
  const a = samples[low], b = samples[low + 1] || { t: entry.period, f: samples[0].f };
  if (entry.interpolation === 'hold') return a.f;
  const next = low + 1 < samples.length ? b : { ...b, t: entry.period + samples[0].t };
  return a.f + (next.f - a.f) * (t - a.t) / (next.t - a.t || 1);
}

export function phaseGrid(entry: Entry, n = PHASE_SAMPLES): number[] {
  return Array.from({ length: n }, (_, i) => (sampleAt(entry, i / n) - entry.centre) / entry.excursion);
}

export function repeatSamples(entry: Entry, cycles = 1, normalized = false, shift = 0) {
  return Array.from({ length: 256 * cycles + 1 }, (_, i) => {
    const phase = i / 256;
    const frequency = sampleAt(entry, phase + shift);
    return { t: normalized ? phase : phase * entry.period, f: normalized ? (frequency - entry.centre) / entry.excursion : frequency };
  });
}

// Draw observed knots exactly. Duplicate x coordinates give hold models vertical
// jumps instead of inventing ramps between adjacent frequency/PRI observations.
export function plotSamples(entry: Entry, cycles = 1, normalized = false, shift = 0) {
  if (entry.interpolation !== 'hold' && entry.sampling !== 'sparse-periodic') return repeatSamples(entry, cycles, normalized, shift);
  const samples = entry.sampling === 'closed-endpoint' ? entry.samples.slice(0, -1) : entry.samples;
  const knots = samples.map((s, i) => ({
    phase: ((s.t / entry.period - shift) % 1 + 1) % 1,
    value: s.f,
    before: samples[(i + samples.length - 1) % samples.length].f,
  })).sort((a, b) => a.phase - b.phase);
  const points = [{ t: 0, f: sampleAt(entry, shift) }];
  for (let cycle = 0; cycle <= cycles; cycle++) for (const knot of knots) {
    const t = cycle + knot.phase;
    if (t <= 0 || t > cycles) continue;
    if (entry.interpolation === 'hold') points.push({ t, f: knot.before });
    points.push({ t, f: knot.value });
  }
  if (points.at(-1)!.t < cycles) points.push({ t: cycles, f: sampleAt(entry, cycles + shift) });
  return points.map(s => ({ t: normalized ? s.t : s.t * entry.period, f: normalized ? (s.f - entry.centre) / entry.excursion : s.f }));
}

export function align(a: number[], b: number[]) {
  // ponytail: brute-force shifts are small at 128 samples; use FFT correlation for much larger grids.
  if (a.length !== b.length || !a.length) throw new Error('Alignment requires equal, non-empty phase grids.');
  let best = Infinity, shift = 0;
  for (let k = 0; k < a.length; k++) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[(i + k) % a.length]) ** 2;
    if (sum < best) { best = sum; shift = k; }
  }
  return { shape: Math.sqrt(best / a.length), shift, phase: shift / a.length };
}

export function compare(a: Entry, b: Entry, weights = DEFAULT_WEIGHTS, aGrid = phaseGrid(a), bGrid = phaseGrid(b)) {
  const morphology = align(aGrid, bGrid);
  return { ...morphology, ...combineDistances(a, b, morphology.shape, weights) };
}

export function combineDistances(a: Entry, b: Entry, shape: number, weights = DEFAULT_WEIGHTS) {
  if (Object.values(weights).some(w => !Number.isFinite(w) || w < 0) || !Object.values(weights).some(w => w > 0)) throw new Error('Weights must be non-negative, with at least one positive weight.');
  const period = Math.abs(Math.log2((a.period * timeUnits[a.units.time]) / (b.period * timeUnits[b.units.time])));
  const scaleA = (a.quantity === 'pri' ? timeUnits : frequencyUnits)[a.units.frequency];
  const scaleB = (b.quantity === 'pri' ? timeUnits : frequencyUnits)[b.units.frequency];
  const excursion = Math.abs(Math.log2((a.excursion * scaleA) / (b.excursion * scaleB)));
  const centre = Math.abs(a.centre * scaleA - b.centre * scaleB) / ((a.excursion * scaleA + b.excursion * scaleB) / 2);
  const weighted = (weight: number, value: number) => weight ? weight * value ** 2 : 0;
  const distance = compatible(a, b, weights) ? Math.sqrt(weighted(weights.shape, shape) + weighted(weights.period, period) + weighted(weights.excursion, excursion) + weighted(weights.centre, centre)) : Infinity;
  return { period, excursion, centre, distance };
}

export function neighbours(entry: Entry, entries: Entry[], weights = DEFAULT_WEIGHTS) {
  const grid = phaseGrid(entry);
  return entries.filter(e => e.id !== entry.id).map(other => ({ entry: other, ...compare(entry, other, weights, grid) }))
    .filter(n => Number.isFinite(n.distance)).sort((a, b) => a.distance - b.distance || a.entry.id.localeCompare(b.entry.id));
}
