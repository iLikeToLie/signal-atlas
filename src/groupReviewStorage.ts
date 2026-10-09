import type { AtlasData } from './types.ts';
import { referenceSignature } from './grouping.ts';
import { emptyReview } from './groupPolicy.ts';
import type { GroupReview } from './groupPolicy.ts';

export const REVIEW_KEY = 'frequency-agile-atlas.group-review.v1';
export const MAX_REVIEW_HISTORY = 20;
export type ReviewWorkspace = { referenceSignature: string; current: GroupReview; history: GroupReview[] };
export type QuantityReviews = Record<'frequency' | 'pri', ReviewWorkspace>;
export const newReviewWorkspace = (atlas: AtlasData): ReviewWorkspace => ({ referenceSignature: referenceSignature(atlas), current: emptyReview(), history: [] });

export function validateReview(value: unknown): GroupReview {
  const r = value as GroupReview;
  const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && !['__proto__', 'constructor', 'prototype'].includes(v);
  if (!r || !Array.isArray(r.groups) || !r.placements || typeof r.placements !== 'object' || Array.isArray(r.placements) || Object.keys(r.placements).length > 10000 || !Array.isArray(r.acknowledged) || r.acknowledged.length > 10000 || !r.acknowledged.every(id)) throw new Error('Invalid saved group review.');
  if (r.groups.some(g => !g || !id(g.id) || !id(g.anchorId) || !id(g.name) || !g.id.startsWith('region-') && !g.id.startsWith('split-')) || new Set(r.groups.map(g => g.id)).size !== r.groups.length || new Set(r.groups.map(g => g.anchorId)).size !== r.groups.length || Object.entries(r.placements).some(([k, v]) => !id(k) || !id(v))) throw new Error('Invalid saved group anchors or placements.');
  return { groups: r.groups.map(g => ({ id: g.id, name: g.name, anchorId: g.anchorId })), placements: { ...r.placements }, acknowledged: [...new Set(r.acknowledged)] };
}

export function loadGroupReviews(frequencyAtlas: AtlasData, priAtlas: AtlasData): { reviews: QuantityReviews; error: string } {
  const defaults = { frequency: newReviewWorkspace(frequencyAtlas), pri: newReviewWorkspace(priAtlas) };
  try {
    const text = localStorage.getItem(REVIEW_KEY);
    if (!text) return { reviews: defaults, error: '' };
    const saved = JSON.parse(text);
    if (saved.version !== 1) throw new Error('Unsupported group review version.');
    for (const quantity of ['frequency', 'pri'] as const) {
      const workspace = saved[quantity];
      if (!workspace || workspace.referenceSignature !== defaults[quantity].referenceSignature || !Array.isArray(workspace.history) || workspace.history.length > MAX_REVIEW_HISTORY) throw new Error('Group review belongs to another reference catalogue or has invalid undo history.');
      defaults[quantity] = { referenceSignature: workspace.referenceSignature, current: validateReview(workspace.current), history: workspace.history.map(validateReview) };
      const atlas = quantity === 'pri' ? priAtlas : frequencyAtlas;
      if ([defaults[quantity].current, ...defaults[quantity].history].some(state => state.groups.some(g => atlas.regionSet.regions.some(r => r.id === g.id)))) throw new Error('A reviewed group cannot replace a reference group.');
    }
    return { reviews: defaults, error: '' };
  } catch (e) {
    return { reviews: { frequency: newReviewWorkspace(frequencyAtlas), pri: newReviewWorkspace(priAtlas) }, error: `Saved group review could not be read: ${(e as Error).message} Decisions are inactive; saved review storage was left untouched.` };
  }
}

export function recordReview(workspace: ReviewWorkspace, next: GroupReview): ReviewWorkspace {
  return { ...workspace, current: validateReview(next), history: [...workspace.history, workspace.current].slice(-MAX_REVIEW_HISTORY) };
}

export function undoReview(workspace: ReviewWorkspace): ReviewWorkspace {
  if (!workspace.history.length) return workspace;
  return { ...workspace, current: workspace.history.at(-1)!, history: workspace.history.slice(0, -1) };
}
