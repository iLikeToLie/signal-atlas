import type { Entry, RegionSet } from './types.ts';
import { emptyAtlas } from './measured.ts';
import { DEFAULT_GROUPING, similarityScorer, validateGroupingForAtlas } from './grouping.ts';
import type { Assignment, GroupingResult, GroupingSettings, MatchScore, SimilarityScore } from './grouping.ts';
import { COMPETITION_MARGIN, MIN_CORE_SHAPES, coreThreshold, coverageRepresentatives, groupHealth, reconstructionReview, retainObservedAnchors, reviewToken, shapeKey } from './groupPolicy.ts';
import type { GroupReview } from './groupPolicy.ts';
import { signature } from './calibration.ts';
import { nameLibraryGroups } from './groupNames.ts';
import { COHESION_EPSILON, completeLinkage } from './completeLinkage.ts';
import type { ClusterSeed } from './completeLinkage.ts';

export type MergeProposal = { id: string; sourceId: string; targetId: string; memberIds: string[]; weakestAdmission: number; representativeCohesion: number };

// Collapse only metric-equivalent copies (verified to numerical precision),
// never merely similar shapes. Repeated scale variants share comparisons and
// count once in medoid selection. Active scales remain part of the cache key.
function libraryScores(entries: Entry[], settings: GroupingSettings) {
  const scorer = similarityScorer(settings), buckets = new Map<string, Entry[]>();
  const equivalent = new Map<Entry, Entry>(), classes = new Map<Entry, number>(), shapes = new Map<Entry, string>();
  for (const entry of entries) {
    const shape = shapeKey(entry); shapes.set(entry, shape);
    const key = JSON.stringify([shape,
      ...(settings.weights.period ? [entry.units.time, entry.period] : []),
      ...(settings.weights.excursion ? [entry.units.frequency, entry.excursion] : []),
      ...(settings.weights.centre ? [entry.units.frequency, entry.centre, entry.excursion] : [])]);
    const pool = buckets.get(key) || [];
    const match = pool.find(other => (scorer(entry, other)?.combined ?? 0) >= 1 - COHESION_EPSILON);
    const representative = match || entry;
    if (!match) { pool.push(entry); buckets.set(key, pool); classes.set(entry, classes.size); }
    equivalent.set(entry, representative);
  }
  const cache = new Map<number, Map<number, SimilarityScore | null>>();
  const score = (a: Entry, b: Entry) => {
    let left = equivalent.get(a)!, right = equivalent.get(b)!;
    let i = classes.get(left)!, j = classes.get(right)!;
    if (i > j) { [i, j] = [j, i]; [left, right] = [right, left]; }
    if (!cache.has(i)) cache.set(i, new Map());
    const row = cache.get(i)!;
    if (!row.has(j)) row.set(j, scorer(left, right));
    return row.get(j)!;
  };
  return { score, classFor: (e: Entry) => classes.get(equivalent.get(e)!)!, keyFor: (e: Entry) => shapes.get(e)! };
}

export function groupLibrary(supplied: Entry[], quantity: 'frequency' | 'pri', settings: GroupingSettings, review: GroupReview) {
  validateGroupingForAtlas(settings, emptyAtlas(quantity));
  if (new Set(supplied.map(e => e.id)).size !== supplied.length) throw new Error('Grouping requires unique signal IDs.');
  if (supplied.some(e => (e.quantity || 'frequency') !== quantity)) throw new Error('Group frequency and PRI signals separately.');
  const entries = [...supplied].sort((a, b) => a.id.localeCompare(b.id));
  const { score, classFor, keyFor } = libraryScores(entries, settings);
  const indices = new Map(entries.map((e, i) => [e.id, i]));
  const similarities = entries.map(() => new Float64Array(entries.length));
  for (let i = 0; i < entries.length; i++) {
    similarities[i][i] = 1;
    for (let j = i + 1; j < entries.length; j++) similarities[i][j] = similarities[j][i] = score(entries[i], entries[j])?.combined ?? 0;
  }
  const fits = (i: number, members: number[]) => members.every(j => similarities[i][j] + COHESION_EPSILON >= settings.threshold);
  const reviewWarnings: string[] = [], seeds: ClusterSeed[] = [], pinned = new Map<number, string>();
  const reviewed = new Map(review.groups.map(g => [g.id, g]));
  // Reviewed groups constrain membership, not representative choice. Conflicts
  // with whole-group cohesion pause visibly without changing stored decisions.
  for (const group of [...review.groups].sort((a, b) => a.id.localeCompare(b.id))) {
    const i = indices.get(group.anchorId);
    if (i === undefined) { reviewWarnings.push(`${group.name}: decision paused because its identity anchor is absent.`); continue; }
    seeds.push({ members: [i], reviewId: group.id }); pinned.set(i, group.id);
  }
  for (const [id, target] of Object.entries(review.placements).sort(([a], [b]) => a.localeCompare(b))) {
    const i = indices.get(id);
    if (i === undefined || pinned.has(i)) continue;
    const seed = seeds.find(s => s.reviewId === target);
    if (!seed || !fits(i, seed.members)) { reviewWarnings.push(`${entries[i].name}: reviewed placement paused; its target is absent, incompatible or fails complete-link cohesion.`); continue; }
    seed.members.push(i); pinned.set(i, target);
  }
  for (let i = 0; i < entries.length; i++) if (!pinned.has(i)) seeds.push({ members: [i] });
  const { clusters, merges } = completeLinkage(similarities, settings.threshold, seeds);
  const regionSet: RegionSet = { regions: [], membership: {}, iterations: merges, converged: true, objective: 0 };
  const anchors: Record<string, Entry[]> = {}, representatives: Record<string, Entry[]> = {};
  const memberIndices = new Map<string, number[]>(), memberCohesion = new Map<number, number>();
  const reserved = new Set(clusters.flatMap(c => c.reviewId ? [c.reviewId] : []));
  for (const cluster of clusters) {
    const members = cluster.members, distinct = [...new Set(members.map(i => classFor(entries[i])))];
    const unique = distinct.map(c => members.find(i => classFor(entries[i]) === c)!);
    for (const i of members) memberCohesion.set(i, Math.min(...members.map(j => similarities[i][j])));
    const observed = members.filter(i => !reconstructionReview(entries[i]).length);
    const clear = observed.filter(i => memberCohesion.get(i)! + COHESION_EPSILON >= coreThreshold(settings));
    const pool = clear.length ? clear : observed.length ? observed : members;
    // Choose a central real member using distinct shapes, so a burst of copies
    // cannot drag the representative. Prefer clear, well-observed candidates.
    const total = (i: number) => unique.reduce((sum, j) => sum + similarities[i][j], 0);
    const medoid = [...pool].sort((a, b) => {
      const delta = total(b) - total(a);
      return Math.abs(delta) > COHESION_EPSILON ? delta : a - b;
    })[0];
    let id = cluster.reviewId || `region-${entries[members[0]].id}`;
    if (!cluster.reviewId) {
      const base = id; let suffix = 0;
      while (reserved.has(id)) id = `${base}-${++suffix}`;
      reserved.add(id);
    }
    const identity = cluster.reviewId ? entries[indices.get(reviewed.get(cluster.reviewId)!.anchorId)!] : entries[members[0]];
    const representative = entries[medoid], memberEntries = members.map(i => entries[i]);
    const cohesion = Math.min(...members.map(i => memberCohesion.get(i)!));
    regionSet.regions.push({ id, name: reviewed.get(id)?.name || 'New group 01', color: `hsl(${parseInt(signature(id).slice(0, 6), 16) % 360} 48% 70%)`,
      medoidId: representative.id, identityAnchorId: identity.id, count: members.length, local: true, provisional: true,
      summary: `Complete-link group; weakest member pair ${(cohesion * 100).toFixed(1)}%. Representative selected from distinct member shapes.`,
      periodRange: [Math.min(...memberEntries.map(e => e.period)), Math.max(...memberEntries.map(e => e.period))],
      excursionRange: [Math.min(...memberEntries.map(e => e.excursion)), Math.max(...memberEntries.map(e => e.excursion))] });
    anchors[id] = [identity]; representatives[id] = [representative]; memberIndices.set(id, members);
    for (const i of members) { regionSet.membership[entries[i].id] = id; regionSet.objective += 1 - similarities[i][medoid]; }
  }
  const assignments: Record<string, Assignment> = {};
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i], regionId = regionSet.membership[entry.id];
    const candidates: MatchScore[] = regionSet.regions.map(region => {
      const representative = entries[indices.get(region.medoidId)!], result = score(entry, representative);
      if (!result) return null;
      const cohesion = Math.min(...memberIndices.get(region.id)!.map(j => similarities[i][j]));
      return { ...result, regionId: region.id, representativeId: representative.id, anchorSimilarity: cohesion, eligible: cohesion + COHESION_EPSILON >= settings.threshold };
    }).filter((c): c is MatchScore => c !== null);
    candidates.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.combined - a.combined || a.regionId.localeCompare(b.regionId));
    const cohesion = memberCohesion.get(i)!, own = candidates.find(c => c.regionId === regionId)!;
    const reviewReasons = reconstructionReview(entry);
    if (cohesion + COHESION_EPSILON < coreThreshold(settings)) reviewReasons.push('Borderline group cohesion: a member pair is near the grouping threshold.');
    if (!pinned.has(i) && candidates.some(c => c.regionId !== regionId && c.eligible && own.combined - c.combined < COMPETITION_MARGIN)) reviewReasons.push('Other groups also meet this signal’s complete-link threshold.');
    const reviewContext = `complete-link-v1:${signature(JSON.stringify(memberIndices.get(regionId)!.map(j => entries[j].id)))}`;
    const acknowledged = review.acknowledged.includes(reviewToken(entry.id, regionId, settings, reviewContext));
    const needsReview = reviewReasons.length > 0 && !acknowledged;
    const manual = pinned.get(i) === regionId;
    assignments[entry.id] = { entryId: entry.id, regionId, created: false, candidates, threshold: settings.threshold,
      anchorSimilarity: cohesion, cohesion, reviewContext, needsReview, reviewReasons, manual,
      status: needsReview ? 'review' : reviewReasons.length ? 'fringe' : 'core',
      reason: manual ? 'Reviewed placement retained within the complete-link boundary.' : 'Grouped by complete linkage: every member pair meets the similarity threshold. Representatives are selected after grouping.' };
  }
  // Representatives describe coverage; they never replace the every-pair rule.
  for (const region of regionSet.regions) {
    const core = memberIndices.get(region.id)!.map(i => entries[i]).filter(e => assignments[e.id].status === 'core');
    if (new Set(core.map(keyFor)).size >= MIN_CORE_SHAPES) representatives[region.id] = coverageRepresentatives(representatives[region.id], core, score, keyFor);
  }
  const health = groupHealth(regionSet, entries, assignments, anchors, representatives, settings, score, keyFor, true);
  for (const region of regionSet.regions) health[region.id].cohesion = Math.min(...memberIndices.get(region.id)!.map(i => memberCohesion.get(i)!));
  nameLibraryGroups(regionSet, entries, review);
  const grouping: GroupingResult = { method: 'complete-linkage', regionSet, assignments, health, reviewWarnings };
  return { ...grouping, merges: mergeProposals(entries, grouping, settings, score) };
}

export function mergeProposals(entries: Entry[], grouping: GroupingResult, settings: GroupingSettings, score = similarityScorer(settings)): MergeProposal[] {
  const byId = new Map(entries.map(e => [e.id, e])), proposals: MergeProposal[] = [];
  const regions = grouping.regionSet.regions;
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const target = regions[i], source = regions[j];
    const targetHealth = grouping.health[target.id], sourceHealth = grouping.health[source.id];
    if (!targetHealth.coreIds.length || !sourceHealth.coreIds.length) continue;
    const targetIds = Object.keys(grouping.regionSet.membership).filter(id => grouping.regionSet.membership[id] === target.id);
    const memberIds = Object.keys(grouping.regionSet.membership).filter(id => grouping.regionSet.membership[id] === source.id);
    let weakestAdmission = 1;
    for (const a of targetIds) {
      for (const b of memberIds) weakestAdmission = Math.min(weakestAdmission, score(byId.get(a)!, byId.get(b)!)?.combined ?? 0);
      if (weakestAdmission + COHESION_EPSILON < settings.threshold) break;
    }
    if (weakestAdmission + COHESION_EPSILON < settings.threshold) continue;
    let representativeCohesion = 1;
    for (const a of targetHealth.representativeIds) for (const b of sourceHealth.representativeIds) representativeCohesion = Math.min(representativeCohesion, score(byId.get(a)!, byId.get(b)!)?.combined ?? 0);
    if (representativeCohesion + COHESION_EPSILON >= coreThreshold(settings)) proposals.push({ id: signature(JSON.stringify([source.id, target.id, memberIds, settings])), sourceId: source.id, targetId: target.id, memberIds, weakestAdmission, representativeCohesion });
  }
  return proposals;
}

export function approveMerge(review: GroupReview, proposal: MergeProposal, grouping: GroupingResult) {
  if (proposal.sourceId === proposal.targetId || !grouping.regionSet.regions.some(r => r.id === proposal.sourceId) || !grouping.regionSet.regions.some(r => r.id === proposal.targetId)) throw new Error('This merge is no longer available.');
  const members = Object.keys(grouping.regionSet.membership).filter(id => grouping.regionSet.membership[id] === proposal.sourceId);
  if (JSON.stringify(members) !== JSON.stringify(proposal.memberIds)) throw new Error('Group membership changed. Review the updated merge proposal.');
  const next = retainObservedAnchors(review, grouping.regionSet);
  next.groups = next.groups.filter(g => g.id !== proposal.sourceId);
  for (const id of members) next.placements[id] = proposal.targetId;
  return next;
}

export function librarySettings(settings: GroupingSettings, quantity: 'frequency' | 'pri') {
  return validateGroupingForAtlas(settings.calibration ? structuredClone(DEFAULT_GROUPING) : settings, emptyAtlas(quantity));
}
