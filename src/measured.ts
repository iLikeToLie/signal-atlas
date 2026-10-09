import type { AtlasData, Entry, Point, Weights } from './types.ts';
import { DEFAULT_GROUPING, validateGroupingForAtlas } from './grouping.ts';
import type { GroupingSettings } from './grouping.ts';
import { groupLibrary } from './library.ts';
import { compatible, SHAPE_WEIGHTS } from './signal.ts';
import { distanceMatrix, embed } from './layout.ts';
import { layoutIncoming } from './displayLayout.ts';
import { newReviewWorkspace, validateReview, MAX_REVIEW_HISTORY } from './groupReviewStorage.ts';
import type { QuantityReviews } from './groupReviewStorage.ts';
import { extractCycles, validateRecording } from './recording.ts';
import type { Recording } from './recording.ts';

export const MEASURED_KEY = 'frequency-agile-atlas.measured.v1';
export function emptyAtlas(quantity: 'frequency' | 'pri'): AtlasData {
  return { quantity, workspace: 'measured', entries: [], positions: {}, shapePositions: {}, regionSet: { regions: [], membership: {}, iterations: 0, converged: true, objective: 0 }, metadata: { seed: 20261006, method: 'Observed cycles only', stress: 0, shapeStress: 0, noveltyThreshold: .65, calibration: 'Uncalibrated', weights: SHAPE_WEIGHTS } };
}
export type MeasuredState = { version: 1; recordings: Recording[]; cycles: Entry[]; settings: Record<'frequency' | 'pri', GroupingSettings>; reviews: QuantityReviews };
export function newMeasuredState(): MeasuredState {
  return { version: 1, recordings: [], cycles: [], settings: { frequency: structuredClone(DEFAULT_GROUPING), pri: structuredClone(DEFAULT_GROUPING) }, reviews: { frequency: newReviewWorkspace(emptyAtlas('frequency')), pri: newReviewWorkspace(emptyAtlas('pri')) } };
}
export function validateMeasuredState(value: unknown): MeasuredState {
  const data = value as MeasuredState;
  if (!data || data.version !== 1 || !Array.isArray(data.recordings) || data.recordings.length > 10 || !Array.isArray(data.cycles) || data.cycles.length > 100) throw new Error('Invalid measured workspace or capacity exceeded.');
  const recordings = data.recordings.map(r => validateRecording(r, r.file, r.id));
  if (new Set(recordings.map(r => r.id)).size !== recordings.length) throw new Error('Duplicate recording IDs.');
  const cycles = data.cycles.map(e => {
    const p = e.provenance, source = recordings.find(r => r.id === p?.recordingId);
    if (!source || p.windowStart === undefined || p.windowEnd === undefined || !['linear', 'hold'].includes(e.interpolation!)) throw new Error('A saved cycle has no valid recording window.');
    const restored = extractCycles(source, p.windowEnd - p.windowStart, p.windowStart, 1, e.interpolation!)[0];
    if (restored.id !== e.id || restored.period !== e.period || restored.quantity !== e.quantity || restored.units.time !== e.units?.time || restored.units.frequency !== e.units?.frequency || restored.provenance.captureId !== p.captureId || p.generator !== 'recording-extraction' || JSON.stringify(restored.samples) !== JSON.stringify(e.samples) || JSON.stringify(restored.missingTimes) !== JSON.stringify(e.missingTimes)) throw new Error('A saved cycle does not match its original observations.');
    return restored;
  });
  if (new Set(cycles.map(e => e.id)).size !== cycles.length) throw new Error('Duplicate extracted cycle IDs.');
  if (cycles.some((e, i) => cycles.slice(0, i).some(other => sameWindow(e, other)))) throw new Error('A window cannot count twice under different gap models.');
  const settings = { ...data.settings }, reviews = { ...data.reviews };
  for (const quantity of ['frequency', 'pri'] as const) {
    settings[quantity] = validateGroupingForAtlas(settings[quantity], emptyAtlas(quantity));
    const workspace = reviews[quantity];
    if (!workspace || workspace.referenceSignature !== newReviewWorkspace(emptyAtlas(quantity)).referenceSignature || !Array.isArray(workspace.history) || workspace.history.length > MAX_REVIEW_HISTORY) throw new Error('Invalid measured review history.');
    reviews[quantity] = { ...workspace, current: validateReview(workspace.current), history: workspace.history.map(validateReview) };
    const ids = new Set(cycles.filter(e => e.quantity === quantity).map(e => e.id));
    if ([reviews[quantity].current, ...reviews[quantity].history].some(r => r.groups.some(g => !ids.has(g.anchorId)) || Object.keys(r.placements).some(id => !ids.has(id)))) throw new Error('A group review refers to a missing cycle.');
  }
  return { version: 1, recordings, cycles, settings, reviews };
}
export function sameWindow(a: Entry, b: Entry) {
  return a.provenance.recordingId === b.provenance.recordingId && a.provenance.windowStart === b.provenance.windowStart && a.provenance.windowEnd === b.provenance.windowEnd;
}
export function loadMeasuredState() {
  try { const text = localStorage.getItem(MEASURED_KEY); return { state: text ? validateMeasuredState(JSON.parse(text)) : newMeasuredState(), error: '' }; }
  catch (e) { return { state: newMeasuredState(), error: `Saved measured workspace could not be read: ${(e as Error).message} Storage was left untouched. Export the saved data for recovery before continuing.` }; }
}

export function measuredProjection(entries: Entry[], weights: Weights) {
  const components: Entry[][] = [];
  for (const entry of entries) { const component = components.find(c => compatible(entry, c[0], weights)); if (component) component.push(entry); else components.push([entry]); }
  const positions: Record<string, Point> = {}; let offset = 0, stress = 0;
  for (const component of components) {
    const result = embed(distanceMatrix(component, weights));
    const min = Math.min(...result.points.map(p => p.x)), max = Math.max(...result.points.map(p => p.x));
    component.forEach((entry, i) => { positions[entry.id] = { x: result.points[i].x - min + offset, y: result.points[i].y }; });
    offset += Math.max(1, max - min) + 1; stress = Math.max(stress, result.stress);
  }
  return { positions, stress, components: components.length };
}
export function measuredView(entries: Entry[], quantity: 'frequency' | 'pri', settings: GroupingSettings, review: QuantityReviews['frequency']['current'], weights: Weights) {
  const grouping = groupLibrary(entries, quantity, settings, review);
  const layout = layoutIncoming({ points: {}, areas: [], membership: {}, labelCells: [] }, grouping.regionSet);
  const shift = 350;
  const regionLayout = { ...layout, points: Object.fromEntries(Object.entries(layout.points).map(([id, p]) => [id, { x: p.x, y: p.y - shift }])), labelCells: layout.labelCells.map(p => ({ x: p.x, y: p.y - shift })), areas: layout.areas.map(a => ({ ...a, centre: { x: a.centre.x, y: a.centre.y - shift }, bounds: { ...a.bounds, top: a.bounds.top - shift, bottom: a.bounds.bottom - shift } })) };
  return { grouping, regionLayout, ...measuredProjection(entries, weights) };
}
export type MeasuredView = ReturnType<typeof measuredView>;
