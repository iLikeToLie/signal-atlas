import type { AtlasData, Entry, RegionSet, Weights } from './types.ts';
import { compare, compatible, phaseGrid, SHAPE_WEIGHTS } from './signal.ts';
import { curveImage, imageSimilarity } from './vision.ts';
import { calibratedScore, signature, validateCalibration, weightsSignature } from './calibration.ts';
import type { CalibrationProfile } from './calibration.ts';
import { COMPETITION_MARGIN, CORE_MARGIN, MIN_CORE_SHAPES, coreThreshold, coverageRepresentatives, emptyReview, groupHealth, reconstructionReview, reviewToken, shapeKey } from './groupPolicy.ts';
import type { GroupHealth, GroupReview } from './groupPolicy.ts';

export type GroupingSettings = { threshold: number; formulaWeight: number; weights: Weights; calibration?: CalibrationProfile; visionModel?: 'overlap' };
// Synthetic tune splits support this raw hybrid threshold; measured data can recalibrate it.
export const DEFAULT_GROUPING: GroupingSettings = { threshold: .65, formulaWeight: .7, weights: SHAPE_WEIGHTS };
export const GROUPING_KEY = 'frequency-agile-atlas.grouping.v1';
export type SimilarityScore = { formula: number; vision: number | null; combined: number; distance: number; rawFormula: number; rawVision: number | null };
export type MatchScore = SimilarityScore & { regionId: string; representativeId: string; anchorSimilarity: number; eligible: boolean };
export type Assignment = { entryId: string; regionId: string; created: boolean; reason: string; candidates: MatchScore[]; threshold: number; anchorSimilarity: number | null; status: 'core' | 'fringe' | 'review'; needsReview: boolean; reviewReasons: string[]; manual: boolean };
export type GroupingResult = { regionSet: RegionSet; assignments: Record<string, Assignment>; health: Record<string, GroupHealth>; reviewWarnings: string[] };

export function validateGrouping(value: unknown): GroupingSettings {
  const settings = value as GroupingSettings;
  if (!settings || !Number.isFinite(settings.threshold) || settings.threshold <= 0 || settings.threshold > 1 ||
    !Number.isFinite(settings.formulaWeight) || settings.formulaWeight < 0 || settings.formulaWeight > 1 ||
    !settings.weights || ['shape', 'period', 'excursion', 'centre'].some(k => !Number.isFinite(settings.weights[k as keyof Weights]) || settings.weights[k as keyof Weights] < 0) ||
    !['shape', 'period', 'excursion', 'centre'].some(k => settings.weights[k as keyof Weights] > 0)) throw new Error('Grouping needs a threshold in (0, 1], a formula weight in [0, 1], and nonnegative formula weights.');
  const calibration = settings.calibration === undefined ? undefined : validateCalibration(settings.calibration);
  if (settings.visionModel !== undefined && settings.visionModel !== 'overlap') throw new Error('Only standard CV pixel overlap is supported. Apply default grouping settings to replace saved experimental settings.');
  if (calibration && (settings.visionModel || 'overlap') !== (calibration.visionModel || 'overlap')) throw new Error('Calibration belongs to a different vision model. Remove it or recalibrate that model.');
  if (calibration && calibration.weightsSignature !== weightsSignature(settings.weights)) throw new Error('Formula weights changed. Remove calibration or rerun evaluation for these weights.');
  return { threshold: settings.threshold, formulaWeight: settings.formulaWeight, weights: { shape: settings.weights.shape, period: settings.weights.period, excursion: settings.weights.excursion, centre: settings.weights.centre }, ...(calibration ? { calibration } : {}), ...(settings.visionModel ? { visionModel: settings.visionModel } : {}) };
}

export function referenceSignature(atlas: AtlasData) {
  const reps = referenceRepresentatives(atlas);
  return signature(JSON.stringify(Object.entries(reps).sort(([a], [b]) => a.localeCompare(b)).map(([id, entries]) => [id, entries.map(e => [e.id, e.quantity || 'frequency', e.units, e.period, e.excursion, e.centre, e.samples, ...(e.interpolation ? [e.interpolation] : []), ...(e.sampling === 'sparse-periodic' ? [e.sampling] : []), ...(e.missingTimes?.length ? [e.missingTimes] : [])])])));
}

export function validateGroupingForAtlas(settings: GroupingSettings, atlas: AtlasData) {
  const validated = validateGrouping(settings);
  if (validated.calibration && (atlas.workspace === 'measured' || validated.calibration.quantity !== (atlas.quantity || atlas.entries[0]?.quantity || 'frequency') || validated.calibration.referenceSignature !== referenceSignature(atlas))) throw new Error('Calibration belongs to another quantity or reference catalogue. Rerun evaluation.');
  return validated;
}

// Shared scoring path: evaluation and live admission use the same comparisons.
export function similarityScorer(settings: GroupingSettings) {
  validateGrouping(settings);
  const grids = new Map<Entry, number[]>(), images = new Map<Entry, Float32Array>();
  const grid = (e: Entry) => { if (!grids.has(e)) grids.set(e, phaseGrid(e)); return grids.get(e)!; };
  const image = (e: Entry) => { if (!images.has(e)) images.set(e, curveImage(grid(e))); return images.get(e)!; };
  return (entry: Entry, representative: Entry): SimilarityScore | null => {
    if (!compatible(entry, representative, settings.weights)) return null;
    const result = compare(entry, representative, settings.weights, grid(entry), grid(representative));
    const rawFormula = Math.exp(-result.distance);
    const rawVision = settings.formulaWeight < 1 ? imageSimilarity(image(entry), curveImage(grid(representative), result.shift)) : null;
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

export function groupIncoming(atlas: AtlasData, incoming: Entry[], settings = DEFAULT_GROUPING, review: GroupReview = emptyReview()): GroupingResult {
  validateGroupingForAtlas(settings, atlas);
  if (new Set([...atlas.entries, ...incoming].map(e => e.id)).size !== atlas.entries.length + incoming.length) throw new Error('Grouping requires unique signal IDs.');
  if (incoming.some(e => (e.quantity || 'frequency') !== (atlas.quantity || atlas.entries[0]?.quantity || 'frequency'))) throw new Error('Group frequency and PRI signals separately.');
  const regionSet = structuredClone(atlas.regionSet), assignments: Record<string, Assignment> = {};
  const anchors = referenceRepresentatives(atlas), representatives = { ...anchors };
  const scorer = similarityScorer(settings), cache = new Map<Entry, Map<Entry, SimilarityScore | null>>();
  const score = (a: Entry, b: Entry) => {
    if (!cache.has(a)) cache.set(a, new Map());
    const row = cache.get(a)!;
    if (!row.has(b)) row.set(b, scorer(a, b));
    return row.get(b)!;
  };
  const reviewWarnings: string[] = [], byId = new Map(incoming.map(e => [e.id, e])), keys = new Map<Entry, string>();
  const keyFor = (e: Entry) => { if (!keys.has(e)) keys.set(e, shapeKey(e)); return keys.get(e)!; };
  const addLocalGroup = (id: string, name: string, anchor: Entry, color: string) => {
    regionSet.regions.push({ id, name, color, medoidId: anchor.id, count: 0,
      summary: 'A local group with a fixed identity anchor. Only clear core matches can extend its representatives.',
      periodRange: [anchor.period, anchor.period], excursionRange: [anchor.excursion, anchor.excursion], local: true, provisional: true });
    anchors[id] = [anchor]; representatives[id] = [anchor];
  };
  for (const group of review.groups) {
    const anchor = byId.get(group.anchorId);
    if (!anchor) { reviewWarnings.push(`${group.name}: decision paused because its anchor is absent. Undo the removal to restore it.`); continue; }
    if (anchors[group.id]) throw new Error('A reviewed group cannot replace a reference group.');
    const hue = parseInt(signature(group.id).slice(0, 6), 16) % 360;
    addLocalGroup(group.id, group.name, anchor, `hsl(${hue} 48% 70%)`);
  }
  let newGroups = review.groups.length;
  for (const entry of incoming) {
    const candidates: MatchScore[] = [];
    for (const region of regionSet.regions) {
      const matches: SimilarityScore[] = anchors[region.id].map(r => score(entry, r)).filter((s): s is SimilarityScore => s !== null);
      const anchorSimilarity = Math.max(...matches.map(s => s.combined));
      const scored: MatchScore[] = [];
      for (const representative of representatives[region.id]) {
        // Vision cannot override an incompatible quantity or an active physical scale.
        const result = score(entry, representative);
        if (result) scored.push({ regionId: region.id, representativeId: representative.id, anchorSimilarity, eligible: anchorSimilarity >= settings.threshold, ...result });
      }
      scored.sort((a, b) => b.combined - a.combined || a.representativeId.localeCompare(b.representativeId));
      if (scored.length) candidates.push(scored[0]);
    }
    candidates.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.combined - a.combined || a.regionId.localeCompare(b.regionId));
    const requested = review.groups.find(g => g.anchorId === entry.id)?.id || review.placements[entry.id];
    const pinned = requested ? candidates.find(c => c.regionId === requested && c.eligible) : undefined;
    if (requested && !pinned) reviewWarnings.push(`${entry.name}: reviewed placement paused; its target is absent, incompatible or below the current anchor threshold.`);
    const best = pinned || candidates.find(c => c.eligible), created = !best;
    const regionId = created ? `region-${entry.id}` : best.regionId;
    if (created) {
      newGroups++;
      addLocalGroup(regionId, `New group ${String(newGroups).padStart(2, '0')}`, entry, `hsl(${(newGroups * 137.508 + 28) % 360} 48% 70%)`);
    }
    regionSet.membership[entry.id] = regionId;
    const region = regionSet.regions.find(r => r.id === regionId)!;
    region.count++;
    const founder = anchors[regionId][0];
    if (entry.units.time === founder.units.time) region.periodRange = [Math.min(region.periodRange[0], entry.period), Math.max(region.periodRange[1], entry.period)];
    if (entry.units.frequency === founder.units.frequency) region.excursionRange = [Math.min(region.excursionRange[0], entry.excursion), Math.max(region.excursionRange[1], entry.excursion)];
    const anchorSimilarity = best?.anchorSimilarity ?? 1;
    const qualityReasons = reconstructionReview(entry), reviewReasons = [...qualityReasons];
    const isAnchor = anchors[regionId].some(a => a.id === entry.id);
    if (created && candidates[0] && candidates[0].anchorSimilarity >= settings.threshold - CORE_MARGIN) reviewReasons.push('Nearest prior group is just below admission: review before treating this as an unfamiliar shape.');
    if (!created && !isAnchor) {
      if (anchorSimilarity < coreThreshold(settings)) reviewReasons.push('Borderline anchor match: near the admission threshold.');
      const competitor = candidates.find(c => c.regionId !== regionId && c.eligible);
      if (competitor && best!.combined - competitor.combined < COMPETITION_MARGIN) reviewReasons.push('Competing groups have similar scores.');
    }
    const acknowledged = review.acknowledged.includes(reviewToken(entry.id, regionId, settings));
    const needsReview = reviewReasons.length > 0 && !acknowledged && !(pinned && !qualityReasons.length);
    const core = !reviewReasons.length;
    assignments[entry.id] = { entryId: entry.id, regionId, created, candidates, threshold: settings.threshold, anchorSimilarity,
      status: needsReview ? 'review' : core ? 'core' : 'fringe', needsReview, reviewReasons, manual: !!pinned,
      reason: created ? candidates.length ? 'No group met the fixed-anchor admission threshold. A candidate unfamiliar shape starts a provisional group.' : 'No group had compatible quantities and active units.' : pinned ? 'Reviewed placement applied within the fixed-anchor boundary.' : 'The strongest eligible group met the fixed-anchor admission threshold.' };
    const coreMembers = incoming.filter(e => assignments[e.id]?.regionId === regionId && assignments[e.id].status === 'core');
    if (new Set(coreMembers.map(keyFor)).size >= MIN_CORE_SHAPES) representatives[regionId] = coverageRepresentatives(anchors[regionId], coreMembers, score, keyFor);
  }
  // Reviewed groups may temporarily have no eligible members after a settings change.
  regionSet.regions = regionSet.regions.filter(r => !r.local || r.count > 0);
  const health = groupHealth(regionSet, incoming, assignments, anchors, representatives, settings, score, keyFor, atlas.workspace === 'measured');
  return { regionSet, assignments, health, reviewWarnings };
}
