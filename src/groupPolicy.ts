import type { Entry, RegionSet } from './types.ts';
import type { Assignment, GroupingSettings, SimilarityScore } from './grouping.ts';
import { phaseGrid } from './signal.ts';
import { signature } from './calibration.ts';
import { observationSummary } from './observation.ts';

// These are conservative review heuristics, not calibrated confidence intervals.
export const CORE_MARGIN = .08;
export const COMPETITION_MARGIN = .05;
export const MIN_CORE_SHAPES = 3;
export const MAX_ADDITIONAL_REPRESENTATIVES = 2;
export type ReviewedGroup = { id: string; name: string; anchorId: string };
export type GroupReview = { groups: ReviewedGroup[]; placements: Record<string, string>; acknowledged: string[] };
export const emptyReview = (): GroupReview => ({ groups: [], placements: {}, acknowledged: [] });
export type SplitProposal = { id: string; regionId: string; memberIds: string[]; anchorId: string; cohesion: number; distinctShapes: number };
export type GroupHealth = { regionId: string; anchorIds: string[]; representativeIds: string[]; coreIds: string[]; fringeIds: string[]; reviewIds: string[]; distinctCoreShapes: number; distinctCoreCaptures?: number; cohesion?: number; proposals: SplitProposal[] };
export type Scorer = (a: Entry, b: Entry) => SimilarityScore | null;

export function reviewToken(entryId: string, regionId: string, settings: GroupingSettings, context?: string) {
  return signature(JSON.stringify([entryId, regionId, settings, ...(context ? [context] : [])]));
}

// Phase-equivalent copies supply membership, not additional shape support.
// Distinct shapes are only a support proxy: capture independence is not inferred.
export function shapeKey(entry: Entry) {
  const grid = phaseGrid(entry).map(v => Math.round(v * 1e6));
  let key = '';
  for (let i = 0; i < grid.length; i++) {
    const candidate = [...grid.slice(i), ...grid.slice(0, i)].join(',');
    if (!key || candidate < key) key = candidate;
  }
  return key;
}

export function coreThreshold(settings: GroupingSettings) { return Math.min(1, settings.threshold + CORE_MARGIN); }
export function reconstructionReview(entry: Entry) {
  // Approval permits densely observed extracted cycles to enter the core. Wider
  // gaps still need quality review; this 5% rule is a conservative heuristic.
  if (entry.parameters.reconstructionApproved === 'yes' && entry.provenance.generator === 'recording-extraction' && observationSummary(entry).largestGapFraction <= .05 + 1e-12) return [];
  return entry.sampling === 'sparse-periodic' ? ['Gap reconstruction needs observation review; similarity includes modelled spans.'] : [];
}

export function coverageRepresentatives(anchors: Entry[], core: Entry[], score: Scorer, keyFor = shapeKey) {
  const selected = [...anchors], seen = new Set(anchors.map(keyFor));
  const pool = core.filter(e => !anchors.some(a => a.id === e.id)).sort((a, b) => a.id.localeCompare(b.id));
  while (selected.length < anchors.length + MAX_ADDITIONAL_REPRESENTATIVES) {
    const candidates = pool.filter(e => !seen.has(keyFor(e))).map(e => ({ entry: e, distance: Math.min(...selected.map(r => 1 - (score(e, r)?.combined ?? 0))) }));
    candidates.sort((a, b) => b.distance - a.distance || a.entry.id.localeCompare(b.entry.id));
    if (!candidates.length) break;
    selected.push(candidates[0].entry); seen.add(keyFor(candidates[0].entry));
  }
  return selected;
}

export function groupHealth(regionSet: RegionSet, incoming: Entry[], assignments: Record<string, Assignment>, anchors: Record<string, Entry[]>, representatives: Record<string, Entry[]>, settings: GroupingSettings, score: Scorer, keyFor = shapeKey, measured = false): Record<string, GroupHealth> {
  const health: Record<string, GroupHealth> = {};
  for (const region of regionSet.regions) {
    const members = incoming.filter(e => regionSet.membership[e.id] === region.id);
    const core = members.filter(e => assignments[e.id].status === 'core');
    const fringe = members.filter(e => assignments[e.id].status !== 'core');
    const info: GroupHealth = { regionId: region.id, anchorIds: anchors[region.id].map(e => e.id), representativeIds: representatives[region.id].map(e => e.id), coreIds: core.map(e => e.id), fringeIds: fringe.map(e => e.id), reviewIds: members.filter(e => assignments[e.id].needsReview).map(e => e.id), distinctCoreShapes: new Set(core.map(keyFor)).size, proposals: [] };
    health[region.id] = info;
    if (measured) info.distinctCoreCaptures = new Set(core.filter(e => e.source === 'measured').map(e => e.provenance.captureId).filter((id): id is string => !!id)).size;
    if (region.local) region.provisional = (measured ? info.distinctCoreCaptures! : info.distinctCoreShapes) < MIN_CORE_SHAPES;

    // Complete-link candidates: every pair must be close. One bridge cannot join
    // two unrelated fringes. Reconstructed inputs and protected anchors stay out.
    const eligible = fringe.filter(e => !info.anchorIds.includes(e.id) && !reconstructionReview(e).length && assignments[e.id].anchorSimilarity !== null).sort((a, b) => a.id.localeCompare(b.id));
    const clusters: Entry[][] = [];
    for (const entry of eligible) {
      const cluster = clusters.find(c => c.every(other => (score(entry, other)?.combined ?? 0) >= coreThreshold(settings)));
      if (cluster) cluster.push(entry); else clusters.push([entry]);
    }
    for (const cluster of clusters) {
      const distinctShapes = new Set(cluster.map(keyFor)).size;
      if (distinctShapes < MIN_CORE_SHAPES) continue;
      let cohesion = 1;
      for (const entry of cluster) for (const other of cluster) if (entry !== other) cohesion = Math.min(cohesion, score(entry, other)?.combined ?? 0);
      if (cluster.some(e => cohesion < assignments[e.id].anchorSimilarity! + COMPETITION_MARGIN)) continue;
      const ranked = cluster.map(entry => ({ entry, total: cluster.reduce((sum, other) => sum + (score(entry, other)?.combined ?? 0), 0) })).sort((a, b) => b.total - a.total || a.entry.id.localeCompare(b.entry.id));
      const memberIds = cluster.map(e => e.id);
      info.proposals.push({ id: signature(JSON.stringify([region.id, memberIds])), regionId: region.id, memberIds, anchorId: ranked[0].entry.id, cohesion, distinctShapes });
    }
  }
  return health;
}

export function retainObservedAnchors(review: GroupReview, regionSet: RegionSet) {
  const next = structuredClone(review);
  for (const region of regionSet.regions.filter(r => r.local)) {
    const identity = region.identityAnchorId || region.medoidId;
    if (!next.groups.some(g => g.id === region.id)) next.groups.push({ id: region.id, name: region.name, anchorId: identity });
    next.placements[identity] = region.id;
  }
  return next;
}

export function approveSplit(review: GroupReview, proposal: SplitProposal, parentName: string, parentAnchorId?: string, regionSet?: RegionSet) {
  const next = regionSet ? retainObservedAnchors(review, regionSet) : structuredClone(review), id = `split-${proposal.anchorId}`;
  if (next.groups.some(g => g.id === id)) throw new Error('This split already exists. Undo it before approving another split with the same anchor.');
  // An observed parent has no permanent catalogue anchor to preseed replay.
  // Preserve it explicitly before the new child anchor can attract its founder.
  if (parentAnchorId && !next.groups.some(g => g.id === proposal.regionId)) {
    next.groups.push({ id: proposal.regionId, name: parentName, anchorId: parentAnchorId });
    next.placements[parentAnchorId] = proposal.regionId;
  }
  next.groups.push({ id, name: `Split from ${parentName}`.slice(0, 100), anchorId: proposal.anchorId });
  for (const memberId of proposal.memberIds) next.placements[memberId] = id;
  return next;
}

export function moveMember(review: GroupReview, entryId: string, regionSet: RegionSet, targetId: string) {
  const next = retainObservedAnchors(review, regionSet), target = regionSet.regions.find(r => r.id === targetId);
  if (!target) throw new Error('The target group is no longer available.');
  if (regionSet.regions.some(r => (r.identityAnchorId || r.medoidId) === entryId)) throw new Error('Identity anchors stay in their group.');
  next.placements[entryId] = targetId;
  return next;
}
