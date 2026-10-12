import { emptyLibrary, sha256, validateSettings, legacyRecording, storeRecording, addRecording, windowView } from './agilityModel.ts';
import type { LibraryState, StoredRecording } from './agilityModel.ts';
import { validateEventRecording } from '../spec/agility.ts';
export const AGILITY_DB = 'signal-atlas-agility';
const request = <T>(r: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error || new Error('Storage transaction aborted.')); t.onerror = () => {}; });
export class AgilityStore {
  private db: IDBDatabase;
  constructor(db: IDBDatabase) { this.db = db; }
  get name() { return this.db.name; }
  static async open(name = AGILITY_DB) {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('library'); r.result.createObjectStore('recordings', { keyPath: 'id' }); };
    const db = await request(r); db.onversionchange = () => db.close(); return new AgilityStore(db);
  }
  close() { this.db.close(); }
  async load(): Promise<LibraryState> { const t = this.db.transaction('library'); const value = (await request(t.objectStore('library').get('current'))) || emptyLibrary(); if (value.schemaVersion !== 1) throw new Error('Unsupported stored library version. Stored data were left untouched.'); return { ...value, historyArchive: value.historyArchive || [] }; }
  async recording(id: string): Promise<StoredRecording> { const value = await request(this.db.transaction('recordings').objectStore('recordings').get(id)); if (!value) throw new Error('Original recording is missing.'); return value; }
  async commit(next: LibraryState, expectedRevision: number, sources: StoredRecording[] = [], replace = false) {
    const t = this.db.transaction(['library', 'recordings'], 'readwrite'), completion = finished(t), meta = t.objectStore('library');
    try {
      const current = await request(meta.get('current')) as LibraryState | undefined;
      if ((current?.revision || 0) !== expectedRevision) throw new Error('Library changed in another tab. Reload before applying this action.');
      const result = { ...next, revision: expectedRevision + 1 }, originals = t.objectStore('recordings');
      if (replace) originals.clear();
      sources.forEach(s => originals.put(s)); meta.put(result, 'current'); await completion; return result;
    } catch (e) { try { t.abort(); } catch {} await completion.catch(() => {}); throw e; }
  }
  async backup() {
    const t = this.db.transaction(['library', 'recordings']), completion = finished(t);
    const [state, recordings] = await Promise.all([request(t.objectStore('library').get('current')), request(t.objectStore('recordings').getAll())]); await completion;
    const payload = { state: state || emptyLibrary(), recordings };
    return JSON.stringify({ format: 'signal-atlas-agility-backup', version: 1, sha256: await sha256(JSON.stringify(payload)), payload });
  }
}
const requireValue = (condition: unknown, message: string) => { if (!condition) throw new Error(`Invalid backup: ${message}`); };
export async function validateBackup(text: string): Promise<{ state: LibraryState; recordings: StoredRecording[] }> {
  const outer = JSON.parse(text); requireValue(outer.format === 'signal-atlas-agility-backup' && outer.version === 1 && outer.payload && ['string', 'object'].includes(typeof outer.payload), 'format/version');
  const encoded = typeof outer.payload === 'string' ? outer.payload : JSON.stringify(outer.payload);
  requireValue(await sha256(encoded) === outer.sha256, 'payload integrity check failed');
  const { state, recordings } = (typeof outer.payload === 'string' ? JSON.parse(outer.payload) : outer.payload) as { state: LibraryState; recordings: StoredRecording[] };
  if (state && state.historyArchive === undefined) state.historyArchive = [];
  requireValue(state?.schemaVersion === 1 && Number.isInteger(state.revision) && state.revision >= 0 && Array.isArray(recordings), 'library structure');
  for (const key of ['streams', 'sources', 'windows', 'patterns', 'variants', 'evidence', 'relationships', 'decisions', 'history', 'historyArchive', 'migrations'] as const) requireValue(Array.isArray(state[key]), key);
  requireValue(state.views && typeof state.views === 'object' && state.legacy && typeof state.legacy === 'object', 'views/legacy structure'); validateSettings(state.settings);
  for (const list of [recordings, state.streams, state.sources, state.windows, state.patterns, state.variants, state.evidence, state.relationships, state.decisions]) requireValue(list.every(x => typeof x.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(x.id) && !['constructor','prototype'].includes(x.id)) && new Set(list.map(x => x.id)).size === list.length, 'duplicate or invalid identifiers');
  requireValue(Object.keys(state.views).length === state.windows.length && Object.keys(state.views).every(id => state.windows.some(w => w.id === id)) && Object.values(state.legacy).every(v => typeof v === 'string'), 'view/legacy coverage');
  requireValue(recordings.length === state.sources.length && state.sources.reduce((n, r) => n + r.count, 0) <= 1_000_000 && state.windows.length <= 500, 'capacity or source count');
  const map = new Map<string, StoredRecording>();
  for (const s of recordings) {
    let r = s.recording;
    if (s.legacyEntry) { const old = legacyRecording(s.legacyEntry, Number(s.id.split('-').at(-1))); requireValue(JSON.stringify(old.recording.events) === JSON.stringify(r.events) && old.recording.streamId === r.streamId, 'legacy evidence mismatch'); }
    else r = validateEventRecording(r);
    requireValue(s.id === r.id && state.sources.some(i => i.id === s.id && i.count === r.events.length && i.streamId === r.streamId) && state.streams.some(p => p.id === r.streamId), 'recording reference');
    requireValue(await sha256(s.originalText) === s.originalSha256 && state.sources.find(i => i.id === s.id)!.originalSha256 === s.originalSha256, 'original integrity');
    requireValue((await storeRecording(r, s.originalText, s.file)).fingerprint === s.fingerprint && state.sources.find(i => i.id === s.id)!.fingerprint === s.fingerprint, 'recording fingerprint'); map.set(s.id, s);
  }
  for (const p of state.streams) requireValue(typeof p.id === 'string' && typeof p.name === 'string' && ['emitter', 'candidate'].includes(p.kind) && ['reviewed', 'uncertain'].includes(p.attribution), 'stream metadata');
  for (const w of state.windows) {
    const r = map.get(w.recordingId)?.recording; requireValue(r && ['unreviewed', 'associated', 'unresolved'].includes(w.reviewState), 'window source/state');
    const recomputed = windowView(r!, w); requireValue(JSON.stringify(recomputed) === JSON.stringify(state.views[w.id]), 'derived window does not match its original');
  }
  const windowMap = new Map(state.windows.map(w => [w.id, w])), patternMap = new Map(state.patterns.map(p => [p.id, p]));
  const scope = (s: { windowId: string; startEvent: number; endEvent: number; channelIds: string[] }) => {
    const w = windowMap.get(s?.windowId); requireValue(w && Number.isInteger(s.startEvent) && Number.isInteger(s.endEvent) && s.startEvent >= w.startEvent && s.endEvent <= w.endEvent && s.startEvent < s.endEvent && Array.isArray(s.channelIds) && s.channelIds.every(id => state.views[w.id].channels.some(c => c.id === id)), 'evidence scope');
  };
  for (const p of state.patterns) requireValue(state.streams.some(s => s.id === p.streamId) && state.views[p.representativeWindowId]?.streamId === p.streamId && Number.isInteger(p.revision) && p.revision > 0 && p.evidenceIds.every(id => state.evidence.some(e => e.id === id && e.patternId === p.id)) && p.variantIds.every(id => state.variants.some(v => v.id === id && v.patternId === p.id)), 'pattern references');
  for (const e of state.evidence) { requireValue(patternMap.has(e.patternId) && state.decisions.some(d => d.id === e.decisionId), 'association references'); scope(e.scope); }
  for (const v of state.variants) requireValue(patternMap.has(v.patternId) && v.evidenceIds.every(id => state.evidence.some(e => e.id === id)), 'variant references');
  for (const l of state.relationships) { requireValue(patternMap.has(l.fromPatternId) && patternMap.has(l.toPatternId) && l.fromPatternId !== l.toPatternId && state.decisions.some(d => d.id === l.decisionId), 'relationship endpoints'); scope(l.evidence.from); scope(l.evidence.to); }
  for (const d of state.decisions) { requireValue(typeof d.id === 'string' && typeof d.explanation === 'string' && Number.isFinite(Date.parse(d.timestamp)) && Array.isArray(d.evidence) && (d.score===undefined||Number.isFinite(d.score)&&d.score>=0&&d.score<=1), 'decision history'); d.evidence.forEach(scope);if(d.match){scope(d.match.query);scope(d.match.target);requireValue(Number.isFinite(d.match.sharedAlignment.timeScale)&&d.match.sharedAlignment.timeScale>0&&['multi-parameter','single-parameter','insufficient-evidence'].includes(d.match.scope),'recorded match');} }
  for (const h of [...state.history, ...state.historyArchive]) {
    requireValue(state.decisions.some(d => d.id === h.decisionId) && h.before && ['patterns', 'variants', 'evidence', 'relationships', 'windows'].every(k => Array.isArray((h.before as unknown as Record<string, unknown>)[k])), 'undo history');
    const b = h.before, pids = new Set(b.patterns.map(p => p.id));
    for (const w of b.windows) requireValue(windowMap.has(w.id) && w.recordingId === windowMap.get(w.id)!.recordingId && w.startEvent === windowMap.get(w.id)!.startEvent && w.endEvent === windowMap.get(w.id)!.endEvent && ['unreviewed', 'associated', 'unresolved'].includes(w.reviewState), 'historical window');
    for (const p of b.patterns) requireValue(state.views[p.representativeWindowId]?.streamId === p.streamId && Number.isInteger(p.revision) && p.revision > 0 && p.evidenceIds.every(id => b.evidence.some(e => e.id === id && e.patternId === p.id)) && p.variantIds.every(id => b.variants.some(v => v.id === id && v.patternId === p.id)), 'historical pattern');
    for (const e of b.evidence) { requireValue(pids.has(e.patternId) && state.decisions.some(d => d.id === e.decisionId), 'historical evidence'); scope(e.scope); }
    for (const v of b.variants) requireValue(pids.has(v.patternId) && v.evidenceIds.every(id => b.evidence.some(e => e.id === id)), 'historical variant');
    for (const l of b.relationships) { requireValue(pids.has(l.fromPatternId) && pids.has(l.toPatternId) && state.decisions.some(d => d.id === l.decisionId), 'historical relationship'); scope(l.evidence.from); scope(l.evidence.to); }
  }
  return { state, recordings };
}
export function mergeBackup(current: LibraryState, incoming: LibraryState) {
  for (const [key, text] of Object.entries(incoming.legacy)) if (key in current.legacy && current.legacy[key] !== text) throw new Error(`Conflicting legacy value ${key}. Resolve this conflict before merging.`);
  const historical = new Map([...(current.historyArchive || []), ...current.history].map(h => [h.decisionId, JSON.stringify(h.before)]));
  for (const h of [...(incoming.historyArchive || []), ...incoming.history]) if (historical.has(h.decisionId) && historical.get(h.decisionId) !== JSON.stringify(h.before)) throw new Error(`Conflicting history for decision ${h.decisionId}. Resolve this conflict before merging.`);
  for (const key of ['streams', 'sources', 'windows', 'patterns', 'variants', 'evidence', 'relationships', 'decisions'] as const) {
    const map = new Map(current[key].map(i => [i.id, JSON.stringify(i)]));
    for (const value of incoming[key]) if (map.has(value.id) && map.get(value.id) !== JSON.stringify(value)) throw new Error(`Conflicting ${key} ID ${value.id}. Use replacement or resolve this conflict before merging.`);
  }
  const next = structuredClone(current);
  for (const key of ['streams', 'sources', 'windows', 'patterns', 'variants', 'evidence', 'relationships', 'decisions'] as const) (next[key] as unknown[]) = [...current[key], ...incoming[key].filter(i => !current[key].some(j => j.id === i.id))];
  if (next.sources.reduce((n, s) => n + s.count, 0) > 1_000_000 || next.windows.length > 500) throw new Error('Merged library exceeds the pilot capacity.');
  next.views = { ...current.views, ...incoming.views }; next.legacy = { ...current.legacy, ...incoming.legacy }; next.migrations = [...new Set([...current.migrations, ...incoming.migrations])];
  // A merge creates no replay of past decisions; imported audit history remains available.
  next.historyArchive = [...(current.historyArchive || []), ...current.history, ...(incoming.historyArchive || []), ...incoming.history].filter((h, i, all) => all.findIndex(x => x.decisionId === h.decisionId) === i);
  next.history = []; return next;
}
export const LEGACY_KEYS = ['frequency-agile-atlas.imports.v1', 'frequency-agile-atlas.measured.v1', 'frequency-agile-atlas.grouping.v2', 'frequency-agile-atlas.group-review.v1', 'frequency-agile-atlas.library-review.v1'];
export async function prepareMigration(state: LibraryState, legacy: Record<string, string>) {
  let next = structuredClone(state); const stored: StoredRecording[] = [], errors: string[] = []; next.legacy = { ...next.legacy, ...legacy };
  let entries: unknown[] = [];
  for (const [key, text] of Object.entries(legacy)) {
    try { const value = JSON.parse(text); if (key.endsWith('imports.v1')) { if (!Array.isArray(value)) throw new Error('Expected a cycle list.'); entries.push(...value); } else if (key.endsWith('measured.v1')) { if (!value || !Array.isArray(value.cycles)) throw new Error('Expected source workspace.'); entries.push(...value.cycles); } }
    catch (e) { errors.push(`${key}: ${(e as Error).message}; original stored text will remain recoverable.`); }
  }
  for (let i = 0; i < entries.length; i++) {
    try { const converted = legacyRecording(entries[i], i); const source = await storeRecording(converted.recording, JSON.stringify(entries[i]), 'legacy-storage', converted.entry); next = addRecording(next, source, converted.profile); stored.push(source); }
    catch (e) { errors.push(`Legacy cycle ${i + 1}: ${(e as Error).message}`); }
  }
  next.migrations.push('legacy-v1'); return { state: next, recordings: stored, errors };
}
