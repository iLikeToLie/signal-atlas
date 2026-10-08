import type { Entry } from './types.ts';
import { emptyAtlas } from './measured.ts';
import { DEFAULT_GROUPING, groupIncoming, similarityScorer, validateGroupingForAtlas } from './grouping.ts';
import type { GroupingResult, GroupingSettings } from './grouping.ts';
import { coreThreshold, retainObservedAnchors } from './groupPolicy.ts';
import type { GroupReview } from './groupPolicy.ts';
import { signature } from './calibration.ts';
import { nameLibraryGroups } from './groupNames.ts';

export type MergeProposal = { id: string; sourceId: string; targetId: string; memberIds: string[]; weakestAdmission: number; representativeCohesion: number };

// Every cycle follows the same admission rule, including the synthetic examples.
// Insertion order is retained so later arrivals cannot silently replace founders.
export function groupLibrary(entries: Entry[], quantity: 'frequency' | 'pri', settings: GroupingSettings, review: GroupReview) {
  const grouping = groupIncoming(emptyAtlas(quantity), entries, settings, review);
  nameLibraryGroups(grouping.regionSet, entries, review);
  return { ...grouping, merges: mergeProposals(entries, grouping, settings) };
}

export function mergeProposals(entries: Entry[], grouping: GroupingResult, settings: GroupingSettings): MergeProposal[] {
  const byId = new Map(entries.map(e => [e.id, e])), score = similarityScorer(settings);
  const proposals: MergeProposal[] = [];
  // Earlier groups keep their identity when a later group is merged into them.
  const regions = grouping.regionSet.regions;
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const target = regions[i], source = regions[j];
    const targetHealth = grouping.health[target.id], sourceHealth = grouping.health[source.id];
    if (!targetHealth.coreIds.length || !sourceHealth.coreIds.length) continue;
    const targetAnchors = targetHealth.anchorIds.map(id => byId.get(id)!);
    const targetExamples = targetHealth.representativeIds.map(id => byId.get(id)!);
    const sourceExamples = sourceHealth.representativeIds.map(id => byId.get(id)!);
    let representativeCohesion = 1;
    for (const a of targetExamples) for (const b of sourceExamples) representativeCohesion = Math.min(representativeCohesion, score(a, b)?.combined ?? 0);
    if (representativeCohesion + 1e-12 < coreThreshold(settings)) continue;
    const memberIds = Object.keys(grouping.regionSet.membership).filter(id => grouping.regionSet.membership[id] === source.id);
    let weakestAdmission = 1;
    for (const id of memberIds) {
      const bestAnchor = Math.max(...targetAnchors.map(a => score(byId.get(id)!, a)?.combined ?? 0));
      weakestAdmission = Math.min(weakestAdmission, bestAnchor);
      if (weakestAdmission < settings.threshold) break;
    }
    // Similar medoids alone are insufficient: every transferred member must fit.
    if (weakestAdmission >= settings.threshold) proposals.push({ id: signature(JSON.stringify([source.id, target.id, memberIds, settings])), sourceId: source.id, targetId: target.id, memberIds, weakestAdmission, representativeCohesion });
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
  // A fitted fixed-catalogue classifier is not calibrated for discovered groups.
  return validateGroupingForAtlas(settings.calibration ? structuredClone(DEFAULT_GROUPING) : settings, emptyAtlas(quantity));
}
