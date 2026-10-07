import type { AtlasData, Entry } from './types.ts';
import { makeEntry } from './catalogue.ts';
import { phaseGrid, sampleAt } from './signal.ts';
import { referenceRepresentatives } from './grouping.ts';
import { signature } from './calibration.ts';
import { validateCycle } from './importExport.ts';

export type Split = 'fit' | 'tune' | 'test';
export type EvaluationExample = { sourceId: string; split: Split; expectedRegionId: string | null; entry: Entry };
export type EvaluationDataset = { version: 1; id: string; quantity: 'frequency' | 'pri'; description: string; examples: EvaluationExample[] };
export const SPLITS: Split[] = ['fit', 'tune', 'test'];

// Detect exact morphology duplicates regardless of centre, excursion or a grid shift.
// Near-duplicates still require honest sourceId lineage from the dataset author.
export function morphologyKey(entry: Entry) {
  const grid = phaseGrid(entry).map(v => Math.round(v * 1e8));
  return Array.from({ length: grid.length }, (_, k) => [...grid.slice(k), ...grid.slice(0, k)].join(',')).sort()[0];
}

export function syntheticEvaluationDataset(atlas: AtlasData): EvaluationDataset {
  const quantity = atlas.entries[0].quantity || 'frequency';
  const excluded = new Set(Object.values(referenceRepresentatives(atlas)).flat().map(morphologyKey));
  const used = new Set<string>(), examples: EvaluationExample[] = [];
  for (const region of atlas.regionSet.regions) {
    const pool: { entry: Entry; key: string }[] = [];
    for (const entry of atlas.entries.filter(e => atlas.regionSet.membership[e.id] === region.id && !e.id.startsWith('control-')).sort((a, b) => a.id.localeCompare(b.id))) {
      const key = morphologyKey(entry);
      if (excluded.has(key) || used.has(key)) continue;
      used.add(key); pool.push({ entry, key });
    }
    // Each split gets a distinct source morphology; small islands are explicitly
    // uncovered rather than borrowing reference exemplars or leaking a parent.
    if (pool.length < 3) continue;
    pool.sort((a, b) => signature(a.key + '20261007').localeCompare(signature(b.key + '20261007')));
    SPLITS.forEach((split, index) => {
      const { entry: source, key } = pool[index];
      [.006, .025, .06].forEach((noise, variant) => {
        const phase = (index * 31 + variant * 17 + 9) / 128;
        const fn = (p: number) => (sampleAt(source, p + phase) - source.centre) / source.excursion + noise * (Math.sin(2 * Math.PI * (19 + variant) * p + index) + .4 * Math.cos(2 * Math.PI * 29 * p));
        const entry = makeEntry(`local-eval-${quantity}-${split}-${source.id}-${variant}`, `Evaluation · ${region.name} · noise ${noise}`, 'unassigned', source.period * [1.17, .73, 1.41][variant], source.excursion * [1.23, .81, 1.52][variant], source.centre + source.excursion * .17, fn, { evaluationSource: source.id, noise });
        entry.quantity = quantity; entry.units = { ...source.units };
        entry.provenance = { generator: 'evaluation-perturbation', version: '1.0.0', seed: 20261007 };
        examples.push({ sourceId: `shape-${signature(key)}`, split, expectedRegionId: region.id, entry });
      });
    });
  }
  SPLITS.forEach((split, index) => {
    for (let j = 0; j < 6; j++) {
      const lobes = 8 + index * 6 + j;
      const reference = atlas.entries[0];
      const entry = makeEntry(`local-eval-${quantity}-${split}-novel-${lobes}`, `Evaluation · unfamiliar ${lobes}-lobe cycle`, 'unassigned', reference.period, reference.excursion, reference.centre,
        p => Math.sin(2 * Math.PI * lobes * p + .37) + .25 * Math.cos(2 * Math.PI * (lobes + 3) * p) + .08 * Math.sin(2 * Math.PI * p), { evaluationLobes: lobes });
      entry.quantity = quantity; entry.units = { ...reference.units };
      entry.provenance = { generator: 'evaluation-novel', version: '1.0.0', seed: 20261007 };
      examples.push({ sourceId: `novel-lobes-${lobes}`, split, expectedRegionId: null, entry });
    }
  });
  return { version: 1, id: `synthetic-region-consistency-v1-${quantity}`, quantity,
    description: 'Synthetic reference-region consistency benchmark. Labels come from immutable catalogue membership, not the evaluated scores. Source morphologies are absent from active representatives and disjoint between splits. The catalogue clustering originally saw these source cycles; this is not an independent physical-class benchmark.', examples };
}

export function validateEvaluationDataset(value: unknown, atlas: AtlasData): EvaluationDataset {
  const data = value as EvaluationDataset;
  if (!data || data.version !== 1 || typeof data.id !== 'string' || !data.id.trim() || data.id.length > 120 || data.quantity !== (atlas.entries[0].quantity || 'frequency') || !Array.isArray(data.examples) || data.examples.length < 6 || data.examples.length > 500) throw new Error('Provide a version 1 dataset with an ID, the selected quantity, and 6–500 labelled examples.');
  const regions = new Set(atlas.regionSet.regions.map(r => r.id));
  const ids = new Set<string>(), sourceSplits = new Map<string, Split>(), sourceLabels = new Map<string, string | null>(), shapes = new Map<string, Split>();
  const excluded = new Set(Object.values(referenceRepresentatives(atlas)).flat().map(morphologyKey));
  const examples = data.examples.map((item, i) => {
    if (!item || !SPLITS.includes(item.split) || typeof item.sourceId !== 'string' || !item.sourceId.trim() || item.sourceId.length > 120 || (item.expectedRegionId !== null && !regions.has(item.expectedRegionId))) throw new Error(`Example ${i + 1}: use fit/tune/test, a sourceId, and a valid reference region ID or null for unfamiliar.`);
    const previous = sourceSplits.get(item.sourceId);
    if (previous && previous !== item.split) throw new Error(`Source ${item.sourceId} occurs across splits. Keep all variants of a source together.`);
    if (sourceLabels.has(item.sourceId) && sourceLabels.get(item.sourceId) !== item.expectedRegionId) throw new Error(`Source ${item.sourceId} has conflicting labels.`);
    sourceSplits.set(item.sourceId, item.split); sourceLabels.set(item.sourceId, item.expectedRegionId);
    const entry = validateCycle(item.entry, 'labelled evaluation', item.entry?.id || `local-eval-${data.quantity}-${i}`);
    if ((entry.quantity || 'frequency') !== data.quantity || typeof entry.id !== 'string' || !/^local-eval-[\w-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error(`Example ${i + 1}: cycle IDs must be unique local-eval- IDs and match the dataset quantity.`);
    ids.add(entry.id);
    const shape = morphologyKey(entry), priorShape = shapes.get(shape);
    if (excluded.has(shape)) throw new Error(`Example ${i + 1} duplicates an active reference curve. Use independent observations.`);
    if (priorShape && priorShape !== item.split) throw new Error(`Example ${i + 1} repeats the same normalized curve across splits.`);
    shapes.set(shape, item.split);
    return { sourceId: item.sourceId, split: item.split, expectedRegionId: item.expectedRegionId, entry };
  });
  for (const split of SPLITS) {
    const rows = examples.filter(e => e.split === split);
    if (!rows.some(e => e.expectedRegionId !== null) || !rows.some(e => e.expectedRegionId === null)) throw new Error(`${split} needs both known-region and unfamiliar examples.`);
  }
  return { version: 1, id: data.id, quantity: data.quantity, description: typeof data.description === 'string' ? data.description.slice(0, 2000) : 'User-labelled evaluation dataset.', examples };
}

export const datasetSignature = (data: EvaluationDataset) => signature(JSON.stringify(data.examples.map(e => [e.sourceId, e.split, e.expectedRegionId, e.entry.quantity || 'frequency', e.entry.period, e.entry.units, e.entry.samples])));
