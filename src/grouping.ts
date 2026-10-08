import type { AtlasData, Entry, RegionSet, Weights } from './types.ts';
import { compare, compatible, phaseGrid, SHAPE_WEIGHTS } from './signal.ts';
import { curveImage, imageSimilarity } from './vision.ts';
import { calibratedScore, signature, validateCalibration, weightsSignature } from './calibration.ts';
import type { CalibrationProfile } from './calibration.ts';
import { curveEmbedding, embeddingSimilarity } from './siamese.ts';

export type GroupingSettings = { threshold: number; formulaWeight: number; weights: Weights; calibration?: CalibrationProfile; visionModel?: 'overlap' | 'siamese' };
// Synthetic tune splits support this raw hybrid threshold; measured data can recalibrate it.
export const DEFAULT_GROUPING: GroupingSettings = { threshold: .65, formulaWeight: .7, weights: SHAPE_WEIGHTS };
export const GROUPING_KEY = 'frequency-agile-atlas.grouping.v1';
export type SimilarityScore = { formula: number; vision: number | null; combined: number; distance: number; rawFormula: number; rawVision: number | null };
export type MatchScore = SimilarityScore & { regionId: string; representativeId: string };
export type Assignment = { entryId: string; regionId: string; created: boolean; reason: string; candidates: MatchScore[]; threshold: number };
export type GroupingResult = { regionSet: RegionSet; assignments: Record<string, Assignment> };

export function validateGrouping(value: unknown): GroupingSettings {
  const settings = value as GroupingSettings;
  if (!settings || !Number.isFinite(settings.threshold) || settings.threshold <= 0 || settings.threshold > 1 ||
    !Number.isFinite(settings.formulaWeight) || settings.formulaWeight < 0 || settings.formulaWeight > 1 ||
    !settings.weights || ['shape', 'period', 'excursion', 'centre'].some(k => !Number.isFinite(settings.weights[k as keyof Weights]) || settings.weights[k as keyof Weights] < 0) ||
    !['shape', 'period', 'excursion', 'centre'].some(k => settings.weights[k as keyof Weights] > 0)) throw new Error('Grouping needs a threshold in (0, 1], a formula weight in [0, 1], and nonnegative formula weights.');
  const calibration = settings.calibration === undefined ? undefined : validateCalibration(settings.calibration);
  if (settings.visionModel !== undefined && !['overlap', 'siamese'].includes(settings.visionModel)) throw new Error('Choose the overlap or Siamese vision model.');
  if (calibration && (settings.visionModel || 'overlap') !== (calibration.visionModel || 'overlap')) throw new Error('Calibration belongs to a different vision model. Remove it or recalibrate that model.');
  if (calibration && calibration.weightsSignature !== weightsSignature(settings.weights)) throw new Error('Formula weights changed. Remove calibration or rerun evaluation for these weights.');
  return { threshold: settings.threshold, formulaWeight: settings.formulaWeight, weights: { shape: settings.weights.shape, period: settings.weights.period, excursion: settings.weights.excursion, centre: settings.weights.centre }, ...(calibration ? { calibration } : {}), ...(settings.visionModel ? { visionModel: settings.visionModel } : {}) };
}

export function referenceSignature(atlas: AtlasData) {
  const reps = referenceRepresentatives(atlas);
  return signature(JSON.stringify(Object.entries(reps).sort(([a], [b]) => a.localeCompare(b)).map(([id, entries]) => [id, entries.map(e => [e.id, e.quantity || 'frequency', e.units, e.period, e.excursion, e.centre, e.samples])])));
}

export function validateGroupingForAtlas(settings: GroupingSettings, atlas: AtlasData) {
  const validated = validateGrouping(settings);
  if (validated.calibration && (validated.calibration.quantity !== (atlas.entries[0]?.quantity || 'frequency') || validated.calibration.referenceSignature !== referenceSignature(atlas))) throw new Error('Calibration belongs to another quantity or reference catalogue. Rerun evaluation.');
  return validated;
}

// Shared scoring path: evaluation and live admission use the same comparisons.
export function similarityScorer(settings: GroupingSettings) {
  validateGrouping(settings);
  const grids = new Map<Entry, number[]>(), images = new Map<Entry, Float32Array>();
  const grid = (e: Entry) => { if (!grids.has(e)) grids.set(e, phaseGrid(e)); return grids.get(e)!; };
  const image = (e: Entry) => { if (!images.has(e)) images.set(e, curveImage(grid(e))); return images.get(e)!; };
  const embeddings = new Map<Entry, Float32Array>();
  const embedding = (e: Entry) => { if (!embeddings.has(e)) embeddings.set(e, curveEmbedding(grid(e))); return embeddings.get(e)!; };
  return (entry: Entry, representative: Entry): SimilarityScore | null => {
    if (!compatible(entry, representative, settings.weights)) return null;
    const result = compare(entry, representative, settings.weights, grid(entry), grid(representative));
    const rawFormula = Math.exp(-result.distance);
    const rawVision = settings.formulaWeight < 1 ? settings.visionModel === 'siamese' ? embeddingSimilarity(embedding(entry), embedding(representative)) : imageSimilarity(image(entry), curveImage(grid(representative), result.shift)) : null;
    const formula = settings.calibration ? calibratedScore(rawFormula, settings.calibration.formula) : rawFormula;
    const vision = rawVision === null ? null : settings.calibration ? calibratedScore(rawVision, settings.calibration.vision) : rawVision;
    return { formula, vision, rawFormula, rawVision, combined: settings.formulaWeight * formula + (1 - settings.formulaWeight) * (vision ?? 0), distance: result.distance };
  };
}

// Fixed reference examples prevent accepted imports from pulling a region into new shapes.
// The medoid plus two evenly spaced catalogue members represent each reference region.
export function referenceRepresentatives(atlas: AtlasData) {
  const byId = new Map(atlas.entries.map(e => [e.id, e]));
  return Object.fromEntries(atlas.regionSet.regions.map(r => {
    const members = atlas.entries.filter(e => atlas.regionSet.membership[e.id] === r.id && e.id !== r.medoidId).sort((a, b) => a.id.localeCompare(b.id));
    return [r.id, [byId.get(r.medoidId)!, members[Math.floor(members.length / 3)], members[Math.floor(members.length * 2 / 3)]].filter((e): e is Entry => !!e)];
  }));
}

export function groupIncoming(atlas: AtlasData, incoming: Entry[], settings = DEFAULT_GROUPING): GroupingResult {
  validateGroupingForAtlas(settings, atlas);
  if (new Set([...atlas.entries, ...incoming].map(e => e.id)).size !== atlas.entries.length + incoming.length) throw new Error('Grouping requires unique signal IDs.');
  if (incoming.some(e => (e.quantity || 'frequency') !== (atlas.entries[0]?.quantity || 'frequency'))) throw new Error('Group frequency and PRI signals separately.');
  const regionSet = structuredClone(atlas.regionSet), assignments: Record<string, Assignment> = {};
  const representatives = referenceRepresentatives(atlas);
  const score = similarityScorer(settings);
  let newGroups = 0;
  for (const entry of incoming) {
    const candidates: MatchScore[] = [];
    for (const region of regionSet.regions) {
      const matches: MatchScore[] = [];
      for (const representative of representatives[region.id]) {
        // Vision cannot override an incompatible quantity or an active physical scale.
        const result = score(entry, representative);
        if (result) matches.push({ regionId: region.id, representativeId: representative.id, ...result });
      }
      matches.sort((a, b) => b.combined - a.combined || a.representativeId.localeCompare(b.representativeId));
      if (matches.length) candidates.push(matches[0]);
    }
    candidates.sort((a, b) => b.combined - a.combined || a.regionId.localeCompare(b.regionId));
    const best = candidates[0], created = !best || best.combined < settings.threshold;
    const regionId = created ? `region-${entry.id}` : best.regionId;
    if (created) {
      newGroups++;
      regionSet.regions.push({ id: regionId, name: `New group ${String(newGroups).padStart(2, '0')}`, color: `hsl(${(newGroups * 137.508 + 28) % 360} 48% 70%)`,
        medoidId: entry.id, count: 0, summary: 'A local group anchored to its first example. Membership is provisional.',
        periodRange: [entry.period, entry.period], excursionRange: [entry.excursion, entry.excursion], local: true, provisional: true });
      // Keep the founder fixed: a chain of marginal matches cannot move the group.
      representatives[regionId] = [entry];
    }
    regionSet.membership[entry.id] = regionId;
    const region = regionSet.regions.find(r => r.id === regionId)!;
    region.count++;
    if (region.local) region.provisional = region.count < 2;
    const founder = representatives[regionId][0];
    if (entry.units.time === founder.units.time) region.periodRange = [Math.min(region.periodRange[0], entry.period), Math.max(region.periodRange[1], entry.period)];
    if (entry.units.frequency === founder.units.frequency) region.excursionRange = [Math.min(region.excursionRange[0], entry.excursion), Math.max(region.excursionRange[1], entry.excursion)];
    assignments[entry.id] = { entryId: entry.id, regionId, created, candidates, threshold: settings.threshold,
      reason: created ? best ? 'No group met the similarity threshold.' : 'No group had compatible quantities and active units.' : 'The strongest group met the similarity threshold.' };
  }
  return { regionSet, assignments };
}
