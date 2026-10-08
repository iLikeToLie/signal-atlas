import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exportEntry, parseImport, validateCycle } from '../src/importExport.ts';
import { morphologyKey } from '../src/evaluationData.ts';
import type { Entry } from '../src/types.ts';

// Dataset labels describe construction, never a score or atlas region assignment.
const VERSION = '1.0.0', SEED = 20261007, TAU = 2 * Math.PI;
const ROOT = resolve('datasets/signal-shapes-v1');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const scriptHash = sha(readFileSync(new URL(import.meta.url)));
function random(key: string) {
  let state = Number.parseInt(sha(`${SEED}:${key}`).slice(0, 8), 16);
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 2 ** 32; };
}
const wrap = (p: number) => ((p % 1) + 1) % 1;
const smooth = (x: number) => x ** 3 * (10 - 15 * x + 6 * x ** 2);
const triangle = (p: number, split: number) => 2 * (p < split ? p / split : (1 - p) / (1 - split)) - 1;
const known = ['smooth-single-lobe', 'asymmetric-triangle', 'rounded-triangle', 'smooth-rise-fall', 'sweep-dwell', 'multi-harmonic', 'saturated-shoulders', 'periodic-blend'];
type Split = 'train' | 'calibration' | 'validation' | 'test';
type Source = { id: string; family: string; split: Split; status: string; parameters: number[]; normalized: (p: number) => number; morphologyHash: string; leakageGroup?: string };
type Row = { signal_id: string; source_id: string; leakage_group_id: string; split: Split; quantity: string; condition: string; sample_count: number; noise_sd_excursion: number; time_jitter_fraction: number; phase_offset: number; period: number; centre: number; excursion: number; relative_path: string; sha256: string; clean_morphology_sha256: string };

function shape(family: string, p: number, q: number[]) {
  p = wrap(p + q[6]);
  const warped = wrap(p + (.1 + .65 * q[0]) * Math.sin(TAU * p) / TAU + .15 * (q[5] - .5) * Math.sin(2 * TAU * p) / (2 * TAU));
  const s = Math.sin(TAU * warped), split = .15 + .7 * q[1];
  switch (family) {
    case 'smooth-single-lobe': return s + (.01 + .2 * q[2]) * Math.sin(2 * TAU * warped + TAU * q[3]);
    case 'asymmetric-triangle': return triangle(warped, split);
    case 'rounded-triangle': return Math.asin((.4 + .57 * q[2]) * s);
    case 'smooth-rise-fall': return 2 * smooth(warped < split ? warped / split : (1 - warped) / (1 - split)) - 1;
    case 'sweep-dwell': {
      const low = .03 + .19 * q[1], rise = .12 + .15 * q[2], high = .06 + .24 * q[3];
      return warped < low ? -1 : warped < low + rise ? 2 * smooth((warped - low) / rise) - 1 : warped < low + rise + high ? 1 : 1 - 2 * smooth((warped - low - rise - high) / (1 - low - rise - high));
    }
    case 'multi-harmonic': return .35 * s + Math.sin((2 + Math.floor(q[1] * 3)) * TAU * warped + 2 * q[2]) + (.15 + .5 * q[3]) * Math.sin(5 * TAU * warped + 3 * q[4]);
    case 'saturated-shoulders': return Math.tanh((1.3 + 3.7 * q[1]) * (s + (.1 + .25 * q[2]) * Math.sin(3 * TAU * warped + q[3])));
    case 'periodic-blend': return (.25 + .5 * q[2]) * triangle(warped, split) + (.75 - .5 * q[2]) * (s + .4 * Math.sin(3 * TAU * warped + 2 * q[3]));
    case 'withheld-smooth-comb': return Math.sin((7 + Math.floor(q[1] * 6)) * TAU * p) + (.1 + .3 * q[2]) * Math.sin(13 * TAU * p + q[3]);
    case 'withheld-triangle-comb': return triangle(wrap((7 + Math.floor(q[1] * 6)) * p), .2 + .6 * q[2]) + .15 * Math.sin(TAU * p + q[3]);
    case 'withheld-pulse-pair': {
      const pulse = (c: number, w: number) => Math.exp(-.5 * (wrap(p - c + .5) - .5) ** 2 / w ** 2);
      return pulse(.2 + .1 * q[1], .012 + .012 * q[2]) + (.4 + .5 * q[3]) * pulse(.65 + .1 * q[4], .015 + .01 * q[5]);
    }
    case 'withheld-localized-chirp': {
      const d = wrap(p - .5 + .5) - .5, width = .08 + .06 * q[1];
      return Math.exp(-.5 * (d / width) ** 2) * Math.sin(TAU * ((8 + 4 * q[2]) * d + (6 + 4 * q[3]) * d ** 2)) + .06 * Math.sin(TAU * p);
    }
    default: throw new Error(`Unknown family ${family}`);
  }
}

const sources: Source[] = [];
function source(family: string, index: number, split: Split, status: string) {
  const rng = random(`source:${family}:${index}`), parameters = Array.from({ length: 7 }, rng);
  const values = Array.from({ length: 4096 }, (_, i) => shape(family, i / 4096, parameters));
  const low = Math.min(...values), high = Math.max(...values), centre = (low + high) / 2;
  const normalized = (p: number) => (shape(family, p, parameters) - centre) / (high - low);
  const samples = Array.from({ length: 128 }, (_, i) => ({ t: i / 128, f: 2 + normalized(i / 128) }));
  samples.push({ t: 1, f: samples[0].f });
  const clean = validateCycle({ period: 1, units: { time: 'tu', frequency: 'fu' }, sampling: 'closed-endpoint', samples });
  sources.push({ id: `src-${sha(`${family}:${index}`).slice(0, 16)}`, family, split, status, parameters, normalized, morphologyHash: sha(morphologyKey(clean)) });
}

for (const family of known) {
  const order = Array.from({ length: 40 }, (_, i) => i).sort((a, b) => sha(`${SEED}:split:${family}:${a}`).localeCompare(sha(`${SEED}:split:${family}:${b}`)));
  order.forEach((index, i) => source(family, index, i < 24 ? 'train' : i < 28 ? 'calibration' : i < 32 ? 'validation' : 'test', 'known-generator-family'));
}
for (const family of ['withheld-smooth-comb', 'withheld-pulse-pair']) for (let i = 0; i < 16; i++) source(family, i, i < 8 ? 'calibration' : 'validation', 'unfamiliar-development-family');
for (const family of ['withheld-triangle-comb', 'withheld-localized-chirp']) for (let i = 0; i < 16; i++) source(family, i, 'test', 'unfamiliar-test-only-family');
// Anonymous, deterministically shuffled IDs prevent labels from appearing in signal filenames.
sources.sort((a, b) => sha(`${SEED}:order:${a.id}`).localeCompare(sha(`${SEED}:order:${b.id}`)));
assert.equal(new Set(sources.map(s => s.id)).size, sources.length);
assert.equal(new Set(sources.map(s => s.morphologyHash)).size, sources.length, 'Duplicate clean source morphologies are forbidden.');

// Join nearly identical latent shapes before writing observations. Phase and physical
// scale cannot make a source independent. This cutoff is fixed before model scoring.
const nearDuplicateRms = .005, limit = 128 * nearDuplicateRms ** 2;
const grids = sources.map(src => Array.from({ length: 128 }, (_, i) => src.normalized(i / 128 - src.parameters[6])));
const parent = sources.map((_, i) => i), closePairs: [string, string][] = [];
const root = (i: number): number => parent[i] === i ? i : (parent[i] = root(parent[i]));
function close(a: number[], b: number[]) {
  for (let shift = 0; shift < 128; shift++) {
    let sum = 0;
    for (let i = 0; i < 128; i++) { sum += (a[i] - b[(i + shift) % 128]) ** 2; if (sum > limit) break; }
    if (sum <= limit) return true;
  }
  return false;
}
for (let i = 0; i < sources.length; i++) for (let j = i + 1; j < sources.length; j++) if (close(grids[i], grids[j])) {
  parent[root(j)] = root(i); closePairs.push([sources[i].id, sources[j].id]);
}
const components = new Map<number, Source[]>();
sources.forEach((src, i) => { const key = root(i); components.set(key, [...(components.get(key) || []), src]); });
for (const component of components.values()) {
  // Test-only construction forms must never enter development through a component.
  assert.ok(component.every(src => src.status === component[0].status), 'Near duplicates crossed construction exposure strata. Redesign generators.');
  const anchor = component.slice().sort((a, b) => sha(`${SEED}:anchor:${a.id}`).localeCompare(sha(`${SEED}:anchor:${b.id}`)))[0];
  const leakageGroup = `group-${sha(component.map(src => src.id).sort().join(':')).slice(0, 16)}`;
  for (const src of component) { src.split = anchor.split; src.leakageGroup = leakageGroup; }
}

const profiles = [{ name: 'clean', n: 256, noise: 0, jitter: 0 }, { name: 'noisy', n: 128, noise: .01, jitter: 0 }, { name: 'sparse-jittered', n: 64, noise: .03, jitter: .25 }];
const rows: Row[] = [], sourceRows: object[] = [], testLabels: object[] = [], fingerprints = new Map<string, Split>();
let number = 0;
for (const src of sources) {
  sourceRows.push({ source_id: src.id, leakage_group_id: src.leakageGroup, split: src.split, generator_form: src.family, construction_stratum: src.status, parameters: src.parameters, clean_morphology_sha256: src.morphologyHash });
  for (const quantity of ['frequency', 'pri'] as const) for (const profile of profiles) {
    const signalId = `signal-${String(++number).padStart(6, '0')}`, rng = random(`${src.id}:${quantity}:${profile.name}`);
    const period = .8 + 2.4 * rng(), centre = 10 + 10 * rng(), excursion = .7 + 2.3 * rng(), phase = rng();
    const normal = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(TAU * rng());
    const samples = Array.from({ length: profile.n }, (_, i) => {
      const t = (i + (i ? profile.jitter * (2 * rng() - 1) : 0)) / profile.n * period;
      return { t, f: centre + excursion * (src.normalized(t / period + phase) + profile.noise * normal()) };
    });
    // Periodic synthetic observations repeat the first value exactly at the declared endpoint.
    samples.push({ t: period, f: samples[0].f });
    const data = { name: signalId, ...(quantity === 'pri' ? { quantity } : {}), period, units: { time: 'tu', frequency: quantity === 'pri' ? 'tu' : 'fu' }, sampling: 'closed-endpoint', samples };
    const checked = validateCycle(data, signalId, `local-${signalId}`);
    const entry: Entry = { ...checked, source: 'synthetic', provenance: { generator: 'signal-shapes-dataset', version: VERSION, seed: SEED }, parameters: { sourceId: src.id, condition: profile.name } };
    const relativePath = `signals/${src.split}/${signalId}.csv`, text = exportEntry(entry, 'csv') + '\n';
    const roundTrip = parseImport(text, `${signalId}.csv`);
    assert.deepEqual(roundTrip.samples, entry.samples);
    assert.equal(roundTrip.period, period); assert.deepEqual(roundTrip.units, entry.units);
    assert.equal(roundTrip.quantity || 'frequency', quantity);
    const fingerprint = morphologyKey(entry), previousSplit = fingerprints.get(fingerprint);
    assert.ok(!previousSplit || previousSplit === src.split, 'A normalized observation crossed splits.');
    fingerprints.set(fingerprint, src.split);
    mkdirSync(resolve(ROOT, `signals/${src.split}`), { recursive: true });
    writeFileSync(resolve(ROOT, relativePath), text);
    rows.push({ signal_id: signalId, source_id: src.id, leakage_group_id: src.leakageGroup!, split: src.split, quantity, condition: profile.name, sample_count: samples.length, noise_sd_excursion: profile.noise, time_jitter_fraction: profile.jitter, phase_offset: phase, period, centre: checked.centre, excursion: checked.excursion, relative_path: relativePath, sha256: sha(text), clean_morphology_sha256: src.morphologyHash });
    if (src.split === 'test') testLabels.push({ signal_id: signalId, source_id: src.id, generator_form: src.family, exposure: src.status === 'known-generator-family' ? 'generator-seen-in-development' : 'generator-withheld-from-development' });
  }
}
const columns = Object.keys(rows[0]);
const cell = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
writeFileSync(resolve(ROOT, 'manifest.csv'), columns.join(',') + '\n' + rows.map(row => columns.map(k => cell(row[k as keyof Row])).join(',')).join('\n') + '\n');
mkdirSync(resolve(ROOT, 'reproducibility'), { recursive: true });
writeFileSync(resolve(ROOT, 'reproducibility/source-ledger.json'), JSON.stringify(sourceRows, null, 2) + '\n');
const labelColumns = Object.keys(testLabels[0]);
writeFileSync(resolve(ROOT, 'test_labels.csv'), labelColumns.join(',') + '\n' + testLabels.map(row => labelColumns.map(k => cell((row as Record<string, unknown>)[k])).join(',')).join('\n') + '\n');
writeFileSync(resolve(ROOT, 'reproducibility/generate-dataset.ts'), readFileSync(new URL(import.meta.url)));
writeFileSync(resolve(ROOT, 'reproducibility/validate-dataset.py'), readFileSync(new URL('./validate-dataset.py', import.meta.url)));
const moduleFingerprints = Object.fromEntries(['src/importExport.ts', 'src/evaluationData.ts', 'src/signal.ts', 'src/grouping.ts', 'src/calibration.ts', 'src/catalogue.ts', 'src/types.ts', 'package.json', 'pnpm-lock.yaml'].map(file => [file, sha(readFileSync(resolve(file)))]));
writeFileSync(resolve(ROOT, 'reproducibility/module-fingerprints.json'), JSON.stringify(moduleFingerprints, null, 2) + '\n');
const counts = Object.fromEntries((['train', 'calibration', 'validation', 'test'] as Split[]).map(split => [split, { sources: sources.filter(s => s.split === split).length, signals: rows.filter(r => r.split === split).length, developmentFormSources: sources.filter(s => s.split === split && s.status === 'known-generator-family').length, withheldFormSources: sources.filter(s => s.split === split && s.status !== 'known-generator-family').length }]));
const files = [...rows.map(r => r.relative_path), 'manifest.csv', 'test_labels.csv', 'reproducibility/source-ledger.json', 'reproducibility/generate-dataset.ts', 'reproducibility/validate-dataset.py', 'reproducibility/module-fingerprints.json'];
const checksums = files.sort().map(file => `${sha(readFileSync(resolve(ROOT, file)))}  ${file}`).join('\n') + '\n';
writeFileSync(resolve(ROOT, 'SHA256SUMS.txt'), checksums);
const report = { dataset: 'signal-shapes-v1', version: VERSION, seed: SEED, generatorSha256: scriptHash, corpusSha256: sha(checksums), sources: sources.length, signals: rows.length, developmentGeneratorForms: known, developmentProbeForms: ['withheld-smooth-comb', 'withheld-pulse-pair'], testOnlyGeneratorForms: ['withheld-triangle-comb', 'withheld-localized-chirp'], counts, nearDuplicateAudit: { normalizedRmsCutoff: nearDuplicateRms, phaseGrid: 128, connectedComponents: components.size, closePairs: closePairs.length, closePairsAcrossFinalSplits: closePairs.filter(([a, b]) => sources.find(src => src.id === a)!.split !== sources.find(src => src.id === b)!.split).length }, checks: { allCsvParsedByApp: true, numericSamplesPreserved: true, duplicateCleanSourceMorphologies: 0, exactNormalizedObservationsAcrossSplits: 0, sharedSourceIdsAcrossSplits: 0 }, labelMeaning: 'Test-only generator construction labels; not atlas regions, measured physical classes, or prescribed final groups.', provenanceCaveat: 'Current app imports reset provenance to local-import/measured; retain this manifest as the synthetic source of truth.' };
writeFileSync(resolve(ROOT, 'validation-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
