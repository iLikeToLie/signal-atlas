import type { Entry, Family } from './types.ts';

export const SEED = 20261006;
export const families: { id: Family; name: string; short: string; color: string; description: string }[] = [
  { id: 'sinusoidal', name: 'Sinusoidal', short: 'Sine', color: '#8fcfc3', description: 'One smooth rise and fall. A reference for gradual, single-lobed motion.' },
  { id: 'triangular', name: 'Triangular', short: 'Triangle', color: '#deb783', description: 'Linear sweeps with corners. Rise and return durations can differ.' },
  { id: 'rounded', name: 'Rounded triangles', short: 'Rounded', color: '#c9d69a', description: 'Triangle-like trajectories with rounded extrema and smooth joins.' },
  { id: 'rise-fall', name: 'Asymmetric rise & fall', short: 'Rise / fall', color: '#d394a4', description: 'Unequal feature timing with a smooth, continuous return.' },
  { id: 'sweep-dwell', name: 'Sweep & dwell', short: 'Dwell', color: '#a6b6dc', description: 'Smooth transitions separated by low and high frequency dwells.' },
  { id: 'harmonic', name: 'Multi-harmonic', short: 'Harmonic', color: '#b7a0d3', description: 'Interfering harmonics create multiple lobes and unequal shoulders.' },
  { id: 'shoulders', name: 'Plateaus & shoulders', short: 'Shoulders', color: '#83b5c6', description: 'Smooth saturation and harmonic shoulders redistribute dwell timing.' },
  { id: 'blend', name: 'Periodic blends', short: 'Blend', color: '#c9b59f', description: 'Continuous transitions between generator forms, including unusual controls.' },
  { id: 'unassigned', name: 'Local / unassigned', short: 'Local', color: '#dce4e1', description: 'Imported cycles. Matches are tentative; provenance is never reclassified.' },
];
export const familyInfo = (id: Family) => families.find(f => f.id === id)!;
const tau = 2 * Math.PI;
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mod = (t: number) => (t % 1 + 1) % 1;
function riseFall(p: number, split: number, smooth: boolean) {
  const u = p < split ? p / split : (1 - p) / (1 - split);
  return 2 * (smooth ? ease(u) : u) - 1;
}
export function trajectory(family: Family, p: number, q: number) {
  p = mod(p);
  const sine = Math.sin(tau * p);
  const split = 0.2 + q * 0.6;
  switch (family) {
    case 'sinusoidal': return sine;
    case 'triangular': return riseFall(p, split, false);
    case 'rounded': return Math.asin((0.55 + 0.4 * q) * sine);
    case 'rise-fall': return riseFall(p, split, true);
    case 'sweep-dwell': {
      const low = 0.06 + q * 0.17, rise = 0.18 + q * 0.1, high = 0.18 + (1 - q) * 0.16;
      if (p < low) return -1;
      if (p < low + rise) return 2 * ease((p - low) / rise) - 1;
      if (p < low + rise + high) return 1;
      return 1 - 2 * ease((p - low - rise - high) / (1 - low - rise - high));
    }
    case 'harmonic': return sine + (0.15 + q * 0.65) * Math.sin(2 * tau * p + 0.3 + q * 2) + q * 0.32 * Math.cos(3 * tau * p + 0.6);
    case 'shoulders': return Math.tanh((1.1 + 3 * q) * (sine + 0.25 * Math.sin(3 * tau * p + q)));
    case 'blend': return (1 - q) * riseFall(p, 0.28, true) + q * (sine + 0.42 * Math.sin(3 * tau * p + 1.2));
    default: return sine;
  }
}

// Extra morphology controls; phase warping is part of generation, never matching.
export function expandedTrajectory(family: Family, phase: number, shape: number) {
  const q = shape / 27;
  const warp = 0.6 * Math.sin(shape * 1.7);
  const p = mod(phase + warp * Math.sin(tau * phase) / tau);
  const sine = Math.sin(tau * p);
  switch (family) {
    case 'sinusoidal': return sine;
    case 'triangular': return riseFall(mod(phase), 0.08 + 0.84 * q, false);
    case 'rounded': return Math.asin((0.35 + 0.64 * q) * sine);
    case 'rise-fall': return riseFall(p, 0.1 + 0.8 * q, true);
    case 'sweep-dwell': {
      const low = 0.025 + q * 0.24, rise = 0.1 + (shape % 4) * 0.05;
      const high = 0.05 + (1 - q) * 0.32;
      if (p < low) return -1;
      if (p < low + rise) return 2 * ease((p - low) / rise) - 1;
      if (p < low + rise + high) return 1;
      return 1 - 2 * ease((p - low - rise - high) / (1 - low - rise - high));
    }
    case 'harmonic': {
      const lobes = 1 + shape % 5;
      return 0.3 * sine + Math.sin(lobes * tau * p + q * 1.8) + (0.1 + q * 0.65) * Math.sin((lobes + 1) * tau * p + 0.5 + q * 2.4);
    }
    case 'shoulders': return Math.tanh((1 + q * 5) * (sine + 0.3 * Math.sin(3 * tau * p + q * 2) + 0.15 * Math.cos(2 * tau * p)));
    case 'blend': return (1 - q) * riseFall(p, 0.18 + q * 0.4, true) + q * (sine + 0.6 * Math.sin((2 + shape % 3) * tau * p + 1.2));
    default: return sine;
  }
}

export function makeEntry(id: string, name: string, family: Family, period: number, excursion: number, centre: number, fn: (phase: number) => number, parameters: Entry['parameters']): Entry {
  const n = 256;
  const raw = Array.from({ length: n }, (_, i) => fn(i / n));
  const min = Math.min(...raw), range = Math.max(...raw) - min;
  const samples = raw.map((f, i) => ({ t: i / n * period, f: centre + excursion * ((f - min) / range - 0.5) }));
  samples.push({ t: period, f: samples[0].f });
  return { id, name, family, source: 'synthetic', period, excursion, centre, units: { time: 'tu', frequency: 'fu' }, centreConvention: 'midrange', sampling: 'closed-endpoint', samples, parameters, provenance: { generator: 'atlas-periodic', version: '1.0.0', seed: SEED } };
}

export function generateCatalogue(): Entry[] {
  const entries: Entry[] = [];
  for (const family of families.slice(0, 8)) {
    for (let i = 0; i < 12; i++) {
      const q = (i % 6) / 5;
      entries.push(makeEntry(`${family.id}-${String(i + 1).padStart(2, '0')}`, `${family.name} ${String(i + 1).padStart(2, '0')}`, family.id,
        [1, 1.3, 1.7, 2.2][i % 4], [1, 1.35, 1.8][Math.floor(i / 4)], 10 + (i % 3) * 2,
        p => trajectory(family.id, p, q), { shapeParameter: q, variant: i + 1 }));
    }
    // Preserve the original twelve IDs and samples; add 28 morphologies × four scale variants.
    for (let shape = 0; shape < 28; shape++) for (let scale = 0; scale < 4; scale++) {
      const variant = 13 + shape * 4 + scale;
      const entry = makeEntry(`${family.id}-${String(variant).padStart(3, '0')}`, `${family.name} ${String(variant).padStart(3, '0')}`, family.id,
        [0.8, 1.1, 1.6][shape % 3] * [1, 1.85][scale % 2],
        [0.7, 0.95, 1.3, 1.8][Math.floor(shape / 3) % 4] * [1, 1.7][Math.floor(scale / 2)],
        10 + shape % 5 * 2,
        p => expandedTrajectory(family.id, p, shape),
        { shapeIndex: shape, shapeParameter: shape / 27, scaleVariant: scale + 1, phaseWarp: family.id === 'triangular' ? 0 : 0.6 * Math.sin(shape * 1.7), ...(family.id === 'harmonic' ? { lobes: 1 + shape % 5 } : {}) });
      entry.provenance.version = '1.1.0';
      entries.push(entry);
    }
  }
  const fn = (p: number) => trajectory('sweep-dwell', p, 0.35) + 0.11 * Math.sin(tau * p + 0.2);
  const diagnostic = (id: string, name: string, p = 1.6, e = 1.4, c = 12, f = fn, kind = id) => makeEntry(id, name, 'blend', p, e, c, f, { diagnostic: kind });
  entries.push(
    diagnostic('control-reference', 'Control · asymmetric cycle'),
    diagnostic('control-shift', 'Control · shifted start', 1.6, 1.4, 12, p => fn(mod(p + 0.25))),
    diagnostic('control-period', 'Control · double period', 3.2),
    diagnostic('control-excursion', 'Control · double excursion', 1.6, 2.8),
    diagnostic('control-centre', 'Control · shifted centre', 1.6, 1.4, 30),
    diagnostic('control-timing', 'Control · longer upper dwell', 1.6, 1.4, 12, p => trajectory('sweep-dwell', p, 0.85) + 0.11 * Math.sin(tau * p + 0.2)),
    diagnostic('control-reversal', 'Control · time reversal', 1.6, 1.4, 12, p => fn(mod(-p))),
    diagnostic('control-reflection', 'Control · frequency reflection', 1.6, 1.4, 12, p => -fn(p)),
  );
  return entries;
}
