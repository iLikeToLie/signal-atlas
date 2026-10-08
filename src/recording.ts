import type { Entry, Sample } from './types.ts';
import { supportedFrequencyUnits, supportedTimeUnits } from './signal.ts';
import { validateCycle } from './importExport.ts';
import { signature } from './calibration.ts';

export type Recording = {
  id: string; name: string; file: string; quantity: 'frequency' | 'pri';
  units: Entry['units']; samples: Sample[]; missingTimes: number[];
  captureId?: string; periodHint?: number;
};
export type PeriodSuggestion = { period: number; similarity: number; pairs: number; coverage: number; repeats: number };
export type GapModel = 'linear' | 'hold';
export function recordingBounds(recording: Recording) {
  return { start: Math.min(recording.samples[0].t, recording.missingTimes[0] ?? Infinity), end: Math.max(recording.samples.at(-1)!.t, recording.missingTimes.at(-1) ?? -Infinity) };
}
const fail = (message: string): never => { throw new Error(message); };
const safeId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && !['__proto__', 'constructor', 'prototype'].includes(v);

export function validateRecording(value: unknown, file = 'recording.json', id = `local-recording-${crypto.randomUUID()}`): Recording {
  const data = value as Record<string, unknown>;
  if (!data || typeof data !== 'object' || !safeId(id)) fail('Invalid recording.');
  const quantity = data.quantity ?? 'frequency';
  if (quantity !== 'frequency' && quantity !== 'pri') fail('Quantity must be frequency or pri.');
  const units = data.units as Entry['units'];
  if (!units || !supportedTimeUnits.includes(units.time) || !(quantity === 'pri' ? supportedTimeUnits : supportedFrequencyUnits).includes(units.frequency)) fail('Supply supported time and value units.');
  if (!Array.isArray(data.samples) || data.samples.length > 50_000) fail('A recording supports up to 50,000 timestamp/value rows.');
  const samples: Sample[] = [], missingTimes: number[] = [];
  let previous = -Infinity;
  for (const row of data.samples as Sample[]) {
    if (!row || typeof row.t !== 'number' || !Number.isFinite(row.t) || row.t <= previous) fail('Recording timestamps must be finite and strictly increasing.');
    previous = row.t;
    if (row.f === null || row.f === undefined) missingTimes.push(row.t);
    else {
      if (typeof row.f !== 'number' || !Number.isFinite(row.f) || quantity === 'pri' && row.f <= 0) fail('Observed values must be finite; PRI values must be positive.');
      samples.push({ t: row.t, f: row.f });
    }
  }
  if (samples.length < 8) fail('A recording needs at least 8 observed points.');
  if (!Number.isFinite(samples.at(-1)!.t - samples[0].t) || !Number.isFinite(Math.max(...samples.map(s => s.f)) - Math.min(...samples.map(s => s.f)))) fail('Recording duration and value range must be finite.');
  if (data.missingTimes !== undefined) {
    if (!Array.isArray(data.missingTimes) || data.missingTimes.length + samples.length > 50_000 || data.missingTimes.some(t => typeof t !== 'number' || !Number.isFinite(t))) fail('Invalid missing timestamps.');
    missingTimes.push(...data.missingTimes as number[]);
  }
  missingTimes.sort((a, b) => a - b);
  const observedTimes = new Set(samples.map(s => s.t));
  if (new Set(missingTimes).size !== missingTimes.length || missingTimes.some(t => observedTimes.has(t))) fail('Missing timestamps must be unique and cannot replace observed points.');
  if (!Number.isFinite(Math.max(samples.at(-1)!.t, missingTimes.at(-1) ?? -Infinity) - Math.min(samples[0].t, missingTimes[0] ?? Infinity))) fail('Recording duration must be finite, including missing timestamps.');
  const captureId = data.captureId;
  if (captureId !== undefined && !safeId(captureId)) fail('Capture ID must be a nonempty string of at most 200 characters.');
  const periodHint = data.periodHint ?? data.period;
  if (periodHint !== undefined && (typeof periodHint !== 'number' || !Number.isFinite(periodHint) || periodHint <= 0)) fail('A supplied period must be positive and finite.');
  return { id, name: typeof data.name === 'string' ? data.name.slice(0, 100) : file.slice(0, 100), file: file.slice(0, 200), quantity: quantity as Recording['quantity'], units: { ...units }, samples, missingTimes, ...(captureId ? { captureId: captureId as string } : {}), ...(periodHint ? { periodHint: periodHint as number } : {}) };
}

export function parseRecording(text: string, file: string, options: { quantity: Recording['quantity']; timeUnit: string; valueUnit: string; captureId: string }): Recording {
  if (new TextEncoder().encode(text).length > 2_000_000) fail('Recording exceeds the 2 MB import limit.');
  if (text.trim().startsWith('{')) return validateRecording(JSON.parse(text), file);
  const meta: Record<string, string> = {}, rows: { t: number; f: number | null }[] = [];
  let header = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    if (line.startsWith('#')) { const match = line.match(/^#\s*([a-z_]+)\s*:\s*(.+)$/i); if (match) meta[match[1].toLowerCase()] = match[2].trim(); continue; }
    if (!header) { if (!/^t\s*,\s*(f|pri)$/i.test(line)) fail('CSV needs a t,f (or t,pri) header.'); header = true; continue; }
    const cells = line.split(',');
    if (cells.length !== 2 || !cells[0].trim()) fail('Every CSV row needs one timestamp and one value column.');
    rows.push({ t: Number(cells[0]), f: !cells[1].trim() || cells[1].trim().toLowerCase() === 'null' ? null : Number(cells[1]) });
  }
  const captureId = options.captureId.trim() || meta.capture_id;
  return validateRecording({ name: meta.name || file, quantity: meta.quantity || options.quantity, units: { time: options.timeUnit || meta.time_unit, frequency: options.valueUnit || meta.frequency_unit || meta.pri_unit }, samples: rows, ...(captureId ? { captureId } : {}), ...(meta.period ? { period: Number(meta.period) } : {}) }, file);
}

export function medianSpacing(recording: Recording) {
  const gaps = recording.samples.slice(1).map((s, i) => s.t - recording.samples[i].t).sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

// Evidence comes from observed points and short local brackets, never a periodic wrap.
export function suggestPeriods(recording: Recording, model: GapModel = 'linear'): PeriodSuggestion[] {
  const samples = recording.samples, start = samples[0].t, end = samples.at(-1)!.t, span = end - start;
  const spacing = medianSpacing(recording), excursion = Math.max(...samples.map(s => s.f)) - Math.min(...samples.map(s => s.f));
  if (excursion <= 1e-12 || samples.length < 24) return [];
  const minimum = Math.max(8 * spacing, span / 200), maximum = span / 2.8;
  if (minimum >= maximum) return [];
  const stride = Math.max(1, Math.ceil(samples.length / 384));
  const score = (period: number): PeriodSuggestion => {
    let squared = 0, pairs = 0, possible = 0, j = 0;
    for (let i = 0; i < samples.length; i += stride) {
      const a = samples[i], target = a.t + period;
      if (target > end) break;
      possible++;
      while (j + 1 < samples.length && samples[j + 1].t <= target) j++;
      const b = samples[j], c = samples[j + 1];
      if (!c || c.t - b.t > spacing * 3.01) continue;
      // Explicit missing rows also prevent a bracket from being recurrence evidence.
      const missingIndex = lowerBound(recording.missingTimes, b.t);
      if (recording.missingTimes[missingIndex] < c.t) continue;
      const f = model === 'hold' ? b.f : b.f + (c.f - b.f) * (target - b.t) / (c.t - b.t);
      squared += ((a.f - f) / excursion) ** 2; pairs++;
    }
    return { period, similarity: pairs ? Math.exp(-3 * Math.sqrt(squared / pairs)) : 0, pairs, coverage: possible ? pairs / possible : 0, repeats: span / period };
  };
  const steps = 600, step = (maximum - minimum) / steps;
  const coarse = Array.from({ length: steps + 1 }, (_, i) => score(minimum + i * step));
  const peaks = coarse.filter((s, i) => i > 0 && i < steps && s.similarity >= coarse[i - 1].similarity && s.similarity >= coarse[i + 1].similarity).sort((a, b) => b.similarity - a.similarity).slice(0, 16);
  const refined = peaks.map(peak => {
    let best = peak, width = step;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = -10; i <= 10; i++) { const candidate = score(best.period + i * width / 10); if (candidate.period >= minimum && candidate.period <= maximum && candidate.similarity > peak.similarity) peak = candidate; }
      best = peak; width /= 10;
    }
    return best;
  }).filter(s => s.similarity >= .85 && s.pairs >= 12 && s.coverage >= .5 && supportedWindows(recording, s.period) >= 2).sort((a, b) => a.period - b.period);
  return refined.filter((s, i) => !refined.slice(0, i).some(p => Math.abs(s.period - p.period) < spacing)).slice(0, 5);
}

function supportedWindows(recording: Recording, period: number) {
  let supported = 0;
  const start = recording.samples[0].t, end = recording.samples.at(-1)!.t;
  for (let i = 0; i < Math.min(200, Math.floor((end - start) / period + 1e-10)); i++) {
    const first = start + i * period, last = first + period;
    const times = recording.samples.filter(s => s.t >= first && s.t < last).map(s => s.t - first);
    if (times.length < 8) continue;
    const gaps = times.slice(1).map((t, j) => t - times[j]);
    gaps.push(period + times[0] - times.at(-1)!);
    if (Math.max(...gaps) <= .2 * period + 1e-12) supported++;
    if (supported >= 2) break;
  }
  return supported;
}

function lowerBound(values: number[], t: number) { let low = 0, high = values.length; while (low < high) { const mid = (low + high) >>> 1; if (values[mid] < t) low = mid + 1; else high = mid; } return low; }

export function extractCycles(recording: Recording, period: number, start: number, count: number, model: GapModel): Entry[] {
  if (!Number.isFinite(period) || period <= 0 || !Number.isFinite(start) || !Number.isInteger(count) || count < 1 || count > 25 || !['linear', 'hold'].includes(model)) fail('Choose a positive period, a finite window start, 1–25 cycles, and a gap model.');
  const { start: first, end: last } = recordingBounds(recording), tolerance = Math.max(1, Math.abs(last), period) * 1e-12;
  if (start < first - tolerance || start + period * count > last + tolerance) fail('Cycle windows must fit inside the observed recording. Reduce the count or move the start.');
  return Array.from({ length: count }, (_, i) => {
    const windowStart = start + i * period, windowEnd = windowStart + period;
    const samples = recording.samples.filter(s => s.t >= windowStart && s.t < windowEnd).map(s => ({ t: s.t - windowStart, f: s.f }));
    const missingTimes = recording.missingTimes.filter(t => t >= windowStart && t < windowEnd).map(t => t - windowStart);
    const id = `local-cycle-${signature(JSON.stringify([recording.id, windowStart, windowEnd, model]))}`;
    let cycle: Entry;
    try { cycle = validateCycle({ name: `${recording.name} · window ${Number(windowStart.toPrecision(6))}`, quantity: recording.quantity, period: windowEnd - windowStart, units: recording.units, sampling: 'sparse-periodic', interpolation: model, samples, missingTimes }, recording.file, id); }
    catch (e) { fail(`Window ${i + 1}: ${(e as Error).message}`); }
    return { ...cycle!, quantity: recording.quantity, parameters: { ...cycle!.parameters, completeCycle: 'reviewed-window', reconstructionApproved: 'yes' }, provenance: { generator: 'recording-extraction', version: '1', seed: null, file: recording.file, recordingId: recording.id, ...(recording.captureId ? { captureId: recording.captureId } : {}), windowStart, windowEnd } };
  });
}
