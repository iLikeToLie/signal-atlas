import type { Entry, Sample } from './types.ts';
import { supportedTimeUnits, supportedFrequencyUnits } from './signal.ts';
import { cycleGaps, MAX_SPARSE_GAP_FRACTION, MIN_OBSERVED_POINTS } from './observation.ts';

export type ImportOptions = { name?: string; quantity?: 'frequency' | 'pri'; period?: string | number; timeUnit?: string; frequencyUnit?: string; sampling?: string; interpolation?: string };
const invalid = (message: string): never => { throw new Error(message); };
const numeric = (value: unknown, label: string) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return invalid(`${label} must be a finite number.`);
  const n = Number(value);
  return Number.isFinite(n) ? n : invalid(`${label} must be a finite number.`);
};

export function validateCycle(value: unknown, file = 'local trace', id?: string): Entry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('JSON must contain one cycle object.');
  const data = value as Record<string, unknown>;
  const quantity = data.quantity ?? 'frequency';
  if (quantity !== 'frequency' && quantity !== 'pri') return invalid('Quantity must be frequency or pri.');
  const period = numeric(data.period, 'Period');
  if (period <= 0) return invalid('Period must be greater than zero.');
  const units = data.units as Record<string, unknown> | undefined;
  if (!units || !supportedTimeUnits.includes(String(units.time)) || !(quantity === 'pri' ? supportedTimeUnits : supportedFrequencyUnits).includes(String(units.frequency))) return invalid(quantity === 'pri' ? 'Provide explicit elapsed-time and PRI units: tu, s, ms or us.' : 'Provide explicit units: time tu, s, ms or us; frequency fu, Hz, kHz, MHz or GHz.');
  const sampling = data.sampling;
  if (sampling !== 'closed-endpoint' && sampling !== 'uniform-open' && sampling !== 'sparse-periodic') return invalid('Declare sampling as closed-endpoint, uniform-open or sparse-periodic.');
  const sparse = sampling === 'sparse-periodic', interpolation = data.interpolation;
  if (interpolation !== undefined && interpolation !== 'linear' && interpolation !== 'hold') return invalid('Interpolation must be linear or hold.');
  if (sparse && interpolation === undefined) return invalid('Sparse periodic cycles need an explicit interpolation: linear or hold. This assumes a repeating cycle, including its wrap gap.');
  if (!Array.isArray(data.samples) || data.samples.length < 8 || data.samples.length > 8193) return invalid('Provide 8–8193 samples for one complete cycle.');
  const missingTimes: number[] = [];
  let previous = -Infinity;
  const samples: Sample[] = data.samples.flatMap((sample: unknown, i) => {
    if (!sample || typeof sample !== 'object') return invalid(`Sample ${i + 1} needs t and f values.`);
    const s = sample as Record<string, unknown>;
    const t = numeric(s.t, `Time at row ${i + 1}`);
    if (!sparse && i === 0 && t !== 0) return invalid('The selected cycle must start at t = 0. Rebase timestamps explicitly before import.');
    if (t <= previous) return invalid(`Timestamps must be strictly increasing: duplicate or unordered time at row ${i + 1}.`);
    previous = t;
    if (sparse && (s.f === null || typeof s.f === 'string' && ['', 'null'].includes(s.f.trim().toLowerCase()))) { missingTimes.push(t); return []; }
    return [{ t, f: numeric(s.f, `Frequency at row ${i + 1}`) }];
  });
  if (data.missingTimes !== undefined) {
    if (!sparse || !Array.isArray(data.missingTimes)) return invalid('Missing timestamps are supported only for sparse-periodic cycles.');
    missingTimes.push(...data.missingTimes.map((t, i) => numeric(t, `Missing timestamp ${i + 1}`)));
  }
  if (sparse) {
    if (samples.length < MIN_OBSERVED_POINTS) return invalid(`Sparse cycles need at least ${MIN_OBSERVED_POINTS} observed points; missing values do not count.`);
    const times = [...samples.map(s => s.t), ...missingTimes];
    if (times.length > 8193 || new Set(times).size !== times.length) return invalid('Sparse observations and missing timestamps must be unique, with at most 8193 total rows.');
    if (times.some(t => t < 0 || t >= period)) return invalid('Sparse timestamps must be within [0, period), without a repeated endpoint. Rebase the cycle explicitly.');
    const maxGap = Math.max(...cycleGaps(samples, period).map(g => (g.end - g.start) / period));
    if (maxGap > MAX_SPARSE_GAP_FRACTION + 1e-12) return invalid(`Largest gap is ${(maxGap * 100).toFixed(1)}% of the cycle; sparse filling allows at most ${MAX_SPARSE_GAP_FRACTION * 100}%, including the wrap gap. Add observed points or select a better-covered cycle.`);
    missingTimes.sort((a, b) => a - b);
  }
  const min = Math.min(...samples.map(s => s.f)), max = Math.max(...samples.map(s => s.f));
  if (quantity === 'pri' && min <= 0) return invalid('Every PRI value must be greater than zero.');
  const excursion = max - min;
  if (!Number.isFinite(excursion) || excursion <= 1e-12) return invalid('The cycle must have a finite, non-zero frequency excursion.');
  const tolerance = Math.max(1e-10, excursion * 1e-6);
  if (sampling === 'closed-endpoint') {
    if (Math.abs(samples.at(-1)!.t - period) > period * 1e-9) return invalid('A closed cycle must include the endpoint at t = period.');
    if (Math.abs(samples[0].f - samples.at(-1)!.f) > tolerance) return invalid('Boundary mismatch: f(0) must equal f(T) within 1e-6 of the excursion. No closure or smoothing was applied.');
    if (samples.at(-2)!.t >= period) return invalid('Interior timestamps must be less than the period.');
  } else if (sampling === 'uniform-open') {
    const dt = period / samples.length;
    if (samples.some((s, i) => Math.abs(s.t - i * dt) > period * 1e-9)) return invalid('Uniform-open samples must be at t = i × period / N, without the repeated endpoint.');
  }
  return {
    id: id || `local-${crypto.randomUUID()}`, name: String(data.name || file).slice(0, 120), family: 'unassigned', source: 'measured',
    ...(quantity === 'pri' ? { quantity: 'pri' as const } : {}), period, excursion, centre: (min + max) / 2, units: { time: String(units.time), frequency: String(units.frequency) },
    sampling, centreConvention: 'midrange', samples,
    ...(interpolation ? { interpolation } : {}), ...(missingTimes.length ? { missingTimes } : {}),
    parameters: { importConvention: sampling, boundaryTolerance: tolerance, completeCycle: 'user-provided', ...(sparse ? { reconstruction: interpolation as string, maxGapFraction: MAX_SPARSE_GAP_FRACTION, periodicWrap: 'user-declared' } : {}) },
    provenance: { generator: 'local-import', version: '1.0.0', seed: null, file },
  };
}

export function parseImport(text: string, filename: string, options: ImportOptions = {}) {
  if (text.length > 2_000_000) return invalid('File exceeds the 2 MB local import limit.');
  if (filename.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
    let data: unknown;
    try { data = JSON.parse(text); } catch { return invalid('Invalid JSON. Use a single object containing period, units, sampling and samples.'); }
    return validateCycle(data, filename);
  }
  const metadata: Record<string, string> = {};
  const rows: string[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.trim().startsWith('#')) {
      const match = line.match(/^\s*#\s*([\w-]+)\s*:\s*(.*?)\s*$/);
      if (match) metadata[match[1]] = match[2];
    } else rows.push(line);
  }
  if (rows.shift()?.trim().toLowerCase() !== 't,f') return invalid('CSV needs exactly two columns with header t,f. Metadata lines start with #.');
  const samples = rows.map((line, i) => {
    const cells = line.split(',');
    if (cells.length !== 2) return invalid(`CSV row ${i + 2} must have exactly two numeric values.`);
    return { t: cells[0].trim(), f: cells[1].trim() };
  });
  return validateCycle({ quantity: metadata.quantity || options.quantity || 'frequency', name: options.name || metadata.name || filename, period: options.period || metadata.period,
    units: { time: options.timeUnit || metadata.time_unit, frequency: options.frequencyUnit || metadata.frequency_unit },
    sampling: options.sampling || metadata.sampling,
    ...((options.interpolation || metadata.interpolation) ? { interpolation: options.interpolation || metadata.interpolation } : {}), samples }, filename);
}

export function exportEntry(entry: Entry, format: 'json' | 'csv') {
  if (format === 'json') return JSON.stringify(entry, null, 2);
  return [
    `# name: ${entry.name.replace(/[\r\n]/g, ' ')}`, `# quantity: ${entry.quantity || 'frequency'}`, `# period: ${entry.period}`, `# time_unit: ${entry.units.time}`,
    `# frequency_unit: ${entry.units.frequency}`, `# sampling: ${entry.sampling}`,
    ...(entry.interpolation ? [`# interpolation: ${entry.interpolation}`] : []),
    `# source: ${entry.source}`, `# id: ${entry.id}`, `# excursion: ${entry.excursion}`, `# centre: ${entry.centre}`,
    `# centre_convention: ${entry.centreConvention}`, `# generator: ${entry.provenance.generator}`,
    `# generator_version: ${entry.provenance.version}`, `# seed: ${entry.provenance.seed ?? 'none'}`,
    `# parameters: ${JSON.stringify(entry.parameters)}`, 't,f',
    ...[...entry.samples, ...(entry.missingTimes || []).map(t => ({ t, f: '' }))].sort((a, b) => a.t - b.t).map(s => `${s.t},${s.f}`),
  ].join('\n');
}

export function downloadEntry(entry: Entry, format: 'json' | 'csv') {
  const blob = new Blob([exportEntry(entry, format)], { type: format === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `${entry.id}.${format}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const STORAGE_KEY = 'frequency-agile-atlas.imports.v1';
export function loadImports(): Entry[] {
  const text = localStorage.getItem(STORAGE_KEY);
  if (!text) return [];
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || data.length > 100) return invalid('Local storage is invalid. Export or recover saved data before replacing it.');
  const entries = data.map((entry: Entry) => {
    if (typeof entry.id !== 'string' || !/^local-[\w-]+$/.test(entry.id)) return invalid('Invalid saved entry ID. Stored data has been left untouched.');
    return validateCycle(entry, entry.provenance?.file, entry.id);
  });
  if (new Set(entries.map(e => e.id)).size !== entries.length) return invalid('Saved entry IDs must be unique. Stored data has been left untouched.');
  return entries;
}
