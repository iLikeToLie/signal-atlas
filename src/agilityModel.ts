import { summarizeEvents, validateEventRecording } from '../spec/agility.ts';
import type { Channel, EventRecording, ObservationWindow, StreamProfile, PatternRecord, PatternVariant, EvidenceAssociation, ReviewedRelationship, ReviewDecision, MatchExplanation } from '../spec/agility.ts';
import { validateCycle } from './importExport.ts';
import type { Entry } from './types.ts';
import { normalizeMatchSettings } from './agilityComparison.ts';
import type { ComparisonQuantity } from './agilityMapTypes.ts';
export type { EventRecording, Channel, ObservationWindow, StreamProfile, MatchExplanation };
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export const MATCH_VERSION = 'coordinated-events-v1';
export type MatchSettings = { threshold: number; absoluteWeight: number; durationWeight: number; minimumOverlap: number; parameters?: ComparisonQuantity[] };
export const DEFAULT_MATCH: MatchSettings = { threshold: .85, absoluteWeight: 0, durationWeight: 0, minimumOverlap: 16, parameters: ['frequency', 'pri', 'pulse-width'] };
export type ViewPoint = { index: number; t: number; values: Record<string, number | null>; breaks: string[] };
export type WindowView = { windowId: string; streamId: string; recordingId: string; name: string; source: string; captureId: string | null; timeUnit: string; count: number; duration: number; channels: Channel[]; counts: Record<string, number>; overlap: Record<string, number>; points: ViewPoint[]; ranges: Record<string, [number, number] | null> };
export type SourceInfo = { id: string; name: string; streamId: string; count: number; captureId: string | null; fingerprint: string; originalSha256: string; source: string; file: string };
export type StoredRecording = { id: string; recording: EventRecording; originalText: string; file: string; fingerprint: string; originalSha256: string; legacyEntry?: Entry };
export type ReviewSnapshot = Pick<LibraryState, 'patterns' | 'variants' | 'evidence' | 'relationships' | 'windows'>;
export type LibraryState = {
  schemaVersion: 1; revision: number; streams: StreamProfile[]; sources: SourceInfo[]; windows: ObservationWindow[];
  views: Record<string, WindowView>; patterns: PatternRecord[]; variants: PatternVariant[]; evidence: EvidenceAssociation[];
  relationships: ReviewedRelationship[]; decisions: ReviewDecision[]; history: { decisionId: string; before: ReviewSnapshot }[]; historyArchive: { decisionId: string; before: ReviewSnapshot }[];
  settings: MatchSettings; legacy: Record<string, string>; migrations: string[];
};
export const emptyLibrary = (): LibraryState => ({ schemaVersion: 1, revision: 0, streams: [], sources: [], windows: [], views: {}, patterns: [], variants: [], evidence: [], relationships: [], decisions: [], history: [], historyArchive: [], settings: { ...DEFAULT_MATCH }, legacy: {}, migrations: [] });
export async function sha256(text: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join(''); }
export async function storeRecording(recording: EventRecording, originalText: string, file: string, legacyEntry?: Entry): Promise<StoredRecording> {
  return { id: recording.id, recording, originalText, file, ...(legacyEntry ? { legacyEntry } : {}), originalSha256: await sha256(originalText), fingerprint: await sha256(JSON.stringify({ time: recording.time, channels: recording.channels, events: recording.events })) };
}
export function windowView(r: EventRecording, w: ObservationWindow): WindowView {
  const events = r.events.slice(w.startEvent, w.endEvent), summary = summarizeEvents(r, w.startEvent, w.endEvent);
  const ranges: WindowView['ranges'] = {}, indices = new Set([0, events.length - 1]);
  const step = Math.max(1, Math.ceil(events.length / 64));
  for (const c of r.channels) {
    let low = Infinity, high = -Infinity;
    for (let start = 0; start < events.length; start += step) {
      let minIndex = -1, maxIndex = -1, missingAdded = false;
      for (let i = start; i < Math.min(events.length, start + step); i++) {
        const v = events[i].values[c.id];
        if (v === null) { if (!missingAdded) { indices.add(i); missingAdded = true; } continue; }
        low = Math.min(low, v); high = Math.max(high, v);
        if (minIndex < 0 || v < events[minIndex].values[c.id]!) minIndex = i;
        if (maxIndex < 0 || v > events[maxIndex].values[c.id]!) maxIndex = i;
      }
      indices.add(start); if (minIndex >= 0) indices.add(minIndex); if (maxIndex >= 0) indices.add(maxIndex);
    }
    ranges[c.id] = low === Infinity ? null : [low, high];
  }
  const ordered = [...indices].sort((a, b) => a - b); let previous = -1;
  const points = ordered.map(i => {
    const breaks = r.channels.filter(c => events.slice(previous + 1, i).some(e => e.values[c.id] === null)).map(c => c.id);
    previous = i; return { index: w.startEvent + i, t: events[i].t, values: { ...events[i].values }, breaks };
  });
  return { windowId: w.id, streamId: r.streamId, recordingId: r.id, name: r.name, source: r.provenance.source, captureId: r.captureId, timeUnit: r.time.unit, count: events.length, duration: events.at(-1)!.t - events[0].t, channels: r.channels, counts: summary.measuredCounts, overlap: summary.overlapCounts, points, ranges };
}
export function addRecording(state: LibraryState, stored: StoredRecording, profile: StreamProfile): LibraryState {
  if (state.windows.length >= 500) throw new Error('The 500-window pilot limit has been reached.');
  if (state.sources.some(s => s.id === stored.id)) throw new Error('Recording ID already exists. Choose a new recording ID or inspect the existing source.');
  if (state.sources.reduce((n, r) => n + r.count, stored.recording.events.length) > 1_000_000) throw new Error('The 1 million retained-event pilot limit would be exceeded.');
  const r = stored.recording, next = structuredClone(state);
  const existing = next.streams.find(s => s.id === profile.id);
  if (profile.id !== r.streamId) throw new Error('Recording and profile associations disagree.');
  if (!existing) next.streams.push(profile);
  next.sources.push({ id: stored.id, name: r.name, streamId: r.streamId, count: r.events.length, captureId: r.captureId, fingerprint: stored.fingerprint, originalSha256: stored.originalSha256, source: r.provenance.source, file: stored.file });
  const w: ObservationWindow = { id: uid('window'), recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' };
  next.windows.push(w); next.views[w.id] = windowView(r, w); return next;
}
export function addWindow(state: LibraryState, r: EventRecording, startEvent: number, endEvent: number) {
  if (state.windows.length >= 500) throw new Error('The 500-window pilot limit has been reached.');
  if (state.windows.some(w => w.recordingId === r.id && w.startEvent === startEvent && w.endEvent === endEvent)) throw new Error('This source window already exists.');
  const next = structuredClone(state), w: ObservationWindow = { id: uid('window'), recordingId: r.id, startEvent, endEvent, reviewState: 'unreviewed' };
  next.views[w.id] = windowView(r, w); next.windows.push(w); return next;
}
const snapshot = (s: LibraryState): ReviewSnapshot => structuredClone({ patterns: s.patterns, variants: s.variants, evidence: s.evidence, relationships: s.relationships, windows: s.windows });
export function reviewWindow(state: LibraryState, windowId: string, action: 'new-pattern' | 'support' | 'variant' | 'challenge' | 'leave-unresolved' | 'reject-suggestion', name: string, targetId?: string, match?: MatchExplanation, score?: number) {
  const next = structuredClone(state), window = next.windows.find(w => w.id === windowId), view = next.views[windowId];
  if (!window || !view) throw new Error('Observation is no longer available.');
  if (!['leave-unresolved', 'reject-suggestion'].includes(action) && (view.count < 16 || !Object.values(view.counts).some(n => n >= 16))) throw new Error('A reviewed pattern needs at least 16 measured events. Keep this window unresolved until more evidence is available.');
  if (!name.trim()) throw new Error('Add a name or explanation for the decision.');
  if (action === 'new-pattern' && state.patterns.some(p=>p.representativeWindowId===windowId)) throw new Error('This window already represents a reviewed pattern. Select another interval for a new behaviour, or add support/variants to the existing pattern.');
  const before = snapshot(state), decisionId = uid('decision');
  const measured = view.channels.filter(c => c.origin === 'supplied' && view.counts[c.id] > 0).map(c => c.id);
  const scope = (action !== 'new-pattern' ? match?.query : undefined) || { windowId, startEvent: window.startEvent, endEvent: window.endEvent, channelIds: measured };
  let own = action === 'new-pattern' ? undefined : next.patterns.find(p => p.id === targetId && p.streamId === view.streamId);
  if (!own && action !== 'new-pattern') own = next.patterns.find(p=>p.streamId===view.streamId && (p.representativeWindowId===windowId || p.evidenceIds.some(id=>next.evidence.find(e=>e.id===id)?.scope.windowId===windowId)));
  const target = action === 'new-pattern' ? undefined : next.patterns.find(p => p.id === targetId);
  if (['support', 'variant', 'challenge'].includes(action) && !target) throw new Error('Select an existing pattern to review.');
  if (match && action !== 'new-pattern' && (match.query.windowId !== windowId || !target || match.target.windowId !== target.representativeWindowId)) throw new Error('Match context changed. Run suggestions again.');
  if (match?.scope === 'insufficient-evidence' && ['support', 'variant', 'challenge'].includes(action)) throw new Error('Common evidence is below the matching minimum. Create a separately reviewed pattern or leave this relationship unresolved.');
  const decision: ReviewDecision = { id: decisionId, timestamp: new Date().toISOString(), action, windowId, explanation: name, evidence: [scope], ...(match ? { matcherVersion: match.matcherVersion, settingsHash: match.settingsHash, match: structuredClone(match) } : {}), ...(score === undefined ? {} : { score }) };
  if (action === 'leave-unresolved') window.reviewState = 'unresolved';
  else if (action !== 'reject-suggestion') {
    if (!own) {
      own = { id: uid('pattern'), streamId: view.streamId, name: action === 'new-pattern' ? name : `${target?.name || name} · ${next.streams.find(s => s.id === view.streamId)?.name || view.streamId}`, revision: 0, representativeWindowId: windowId, evidenceIds: [], variantIds: [], notes: '' };
      next.patterns.push(own);
    }
    own.revision++; decision.patternId = own.id;
    const evidence: EvidenceAssociation = { id: uid('evidence'), patternId: own.id, patternRevision: own.revision, decisionId, role: action === 'variant' ? 'variant' : action === 'challenge' ? 'challenge' : 'support', scope };
    next.evidence.push(evidence); own.evidenceIds.push(evidence.id); window.reviewState = 'associated';
    if (action === 'variant') { const variant: PatternVariant = { id: uid('variant'), patternId: own.id, evidenceIds: [evidence.id], description: name }; next.variants.push(variant); own.variantIds.push(variant.id); }
    if (action === 'challenge') own.notes = `${own.notes}\n${name}`.trim();
    if (target && target.streamId !== view.streamId && match && action !== 'challenge') {
      const old = next.relationships.find(l=>l.fromPatternId===own!.id && l.toPatternId===target.id);
      const relationship: ReviewedRelationship = { id: old?.id || uid('link'), fromPatternId: own.id, toPatternId: target.id, revision: (old?.revision || 0)+1, kind: match.scope === 'single-parameter' ? 'single-parameter-similarity' : match.partial ? 'partial-match' : match.channelResults.some(c => c.missing) ? 'partial-channel-similarity' : action === 'variant' ? 'scale-variant' : 'coordinated-similarity', evidence: { from: scope, to: match.target }, decisionId };
      if(old) next.relationships[next.relationships.indexOf(old)]=relationship; else next.relationships.push(relationship); decision.relationshipId = relationship.id; decision.evidence.push(match.target);
    }
  }
  next.decisions.push(decision); next.history.push({ decisionId, before }); return next;
}
export function undoDecision(state: LibraryState) {
  const next = structuredClone(state), undo = next.history.pop(); if (!undo) throw new Error('There is no decision to undo.');
  const reversalId = uid('decision');
  next.historyArchive.push(undo, { decisionId: reversalId, before: snapshot(state) });
  // Preserve windows added after the decision; undo affects review, never source data.
  const restoredIds = new Set(undo.before.windows.map(w => w.id));
  Object.assign(next, undo.before, { windows: [...undo.before.windows, ...state.windows.filter(w => !restoredIds.has(w.id))] });
  next.decisions.push({ id: reversalId, timestamp: new Date().toISOString(), action: 'undo', reversesDecisionId: undo.decisionId, explanation: 'Reversed the most recent reviewed decision.', evidence: [] }); return next;
}
export function validateSettings(value: MatchSettings) {
  return normalizeMatchSettings(value);
}
export function parseEventInput(text: string, file: string, options?: { streamId?: string; timeUnit?: string; frequencyUnit?: string; intervalUnit?: string; channels?: Channel[] }) {
  text = text.replace(/^\uFEFF/, '');
  if (text.trim().startsWith('{')) { const r = JSON.parse(text); if (options?.streamId) r.streamId = options.streamId; return validateEventRecording(r); }
  const metadataLine = text.split(/\r?\n/).find(l => l.startsWith('# recording: '));
  const metadata = metadataLine ? JSON.parse(metadataLine.slice(13)) : null;
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  const fields = (line: string) => { const values: string[] = []; let value = '', quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; } else if (c === ',' && !quoted) { values.push(value.trim()); value = ''; } else value += c; } if (quoted) throw new Error('Unclosed CSV quote; numeric fields must fit on one line.'); values.push(value.trim()); return values; };
  const headers = lines.length ? fields(lines.shift()!) : [];
  if (!['t', 'time', 'timestamp'].includes(headers[0]) || headers.length < 2 || new Set(headers).size !== headers.length) throw new Error('CSV needs unique t/time/timestamp and parameter headers.');
  const defs: Channel[] = options?.channels?.length ? options.channels : metadata?.channels || headers.slice(1).map(h => {
    const key = h.toLowerCase().replace(/[_ -]/g, '');
    if (['frequency', 'freq', 'f'].includes(key)) return { id: h, name: h, quantity: 'frequency', unit: options?.frequencyUnit || '', origin: 'supplied' };
    if (['pri', 'pulsewidth', 'pw'].includes(key)) return { id: h, name: h, quantity: key === 'pri' ? 'pri' : 'pulse-width', unit: options?.intervalUnit || '', origin: 'supplied', ...(key === 'pri' ? { priConvention: 'preceding-event' } : {}) };
    throw new Error(`Declare channel metadata (name, quantity and unit) for ${h}.`);
  });
  if (defs.map(c => c.id).join(',') !== headers.slice(1).join(',')) throw new Error('Channel definitions must match CSV columns in order.');
  const number = (v: string) => { if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(v)) throw new Error('CSV measurements must be decimal numbers, blank or null.'); return Number(v); };
  const events = lines.map((l, row) => { const v = fields(l); if (v.length !== headers.length || v[0] === '') throw new Error(`Invalid CSV row ${row + 2}.`); return { t: number(v[0]), values: Object.fromEntries(defs.map((c, i) => [c.id, v[i + 1] === '' || v[i + 1] === 'null' ? null : number(v[i + 1])])) }; });
  return validateEventRecording({ ...(metadata || {}), schemaVersion: 1, id: metadata?.id || uid('recording'), name: metadata?.name || file, streamId: options?.streamId || metadata?.streamId, captureId: metadata?.captureId ?? null, time: metadata?.time || { unit: options?.timeUnit, basis: 'relative' }, channels: defs, events, provenance: metadata?.provenance || { source: 'measured', file } });
}
export function legacyRecording(value: unknown, index: number) {
  const e = validateCycle(value, 'legacy-storage', `local-legacy-${index}`), channelId = e.quantity === 'pri' ? 'legacy-pri' : 'frequency';
  const r: EventRecording = { schemaVersion: 1, id: `legacy-recording-${index}`, name: e.name, streamId: `legacy-candidate-${index}`, captureId: e.provenance.captureId || null, time: { unit: e.units.time as EventRecording['time']['unit'], basis: 'relative' }, channels: [{ id: channelId, name: e.quantity === 'pri' ? 'Legacy PRI trajectory' : 'Frequency', quantity: e.quantity === 'pri' ? 'numeric' : 'frequency', unit: e.units.frequency, origin: 'supplied' }], events: [...e.samples.map(s => ({ t: s.t, values: { [channelId]: s.f as number | null } })), ...(e.missingTimes || []).map(t => ({ t, values: { [channelId]: null } }))].sort((a, b) => a.t - b.t), provenance: { source: 'legacy', file: e.provenance.file || 'legacy-storage' } };
  return { recording: r, entry: e, profile: { id: r.streamId, name: `Unattributed legacy: ${e.name}`, kind: 'candidate' as const, attribution: 'uncertain' as const, notes: 'Legacy numerical trajectory; no pulse synchronization or emitter identity inferred.' } };
}
