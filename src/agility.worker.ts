import { matchLibrary, overviewGroups } from './agilityMatching.ts';
import { parseEventInput, storeRecording, windowView, addWindow, addRecording } from './agilityModel.ts';
import { validateBackup, AgilityStore, mergeBackup } from './agilityStorage.ts';
self.onmessage = async event => {
  const { id, kind, ...data } = event.data;
  try {
    if (kind === 'match') { const value = matchLibrary(data.query, data.patterns, data.views, data.settings, done => { if (done % 10 === 0 || done === data.patterns.length) self.postMessage({ id, progress: done }); }); self.postMessage({ id, value }); }
    else if (kind === 'groups') self.postMessage({ id, value: overviewGroups(data.views, data.settings) });
    else if (kind === 'parse') { const r = parseEventInput(data.text, data.file, data.options), s = await storeRecording(r, data.text, data.file); self.postMessage({ id, value: { recording: { id: r.id, name: r.name, streamId: r.streamId, captureId: r.captureId, provenance: r.provenance }, fingerprint: s.fingerprint, preview: windowView(r, { id: 'preview', recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' }) } }); }
    else if (kind === 'restore') { const value = await validateBackup(data.text || await data.file.text()); self.postMessage({ id, value: { state: value.state, recordingCount: value.recordings.length } }); }
    else if (['backup', 'restore-apply', 'window', 'view', 'original', 'import'].includes(kind)) {
      const store = await AgilityStore.open(data.dbName);
      try {
        let value: unknown;
        if (kind === 'backup') value = new Blob([await store.backup()], { type: 'application/json' });
        else if (kind === 'restore-apply') { const incoming = await validateBackup(await data.file.text()), current = await store.load(); value = await store.commit(data.mode === 'merge' ? mergeBackup(current, incoming.state) : incoming.state, data.expectedRevision, incoming.recordings, data.mode === 'replace'); }
        else if (kind === 'import') { const r = parseEventInput(data.text, data.file, data.options); r.id = data.recordingId; const stored = await storeRecording(r, data.text, data.file), current = await store.load(); value = await store.commit(addRecording(current, stored, data.profile), data.expectedRevision, [stored]); }
        else { const source = await store.recording(data.recordingId); if (kind === 'original') value = { blob: new Blob([source.originalText], { type: source.file.endsWith('.csv') ? 'text/csv' : 'application/json' }), name: source.file }; else if (kind === 'view') value = windowView(source.recording, { id: data.windowId, recordingId: source.id, startEvent: data.startEvent, endEvent: data.endEvent, reviewState: 'associated' }); else value = await store.commit(addWindow(await store.load(), source.recording, data.startEvent, data.endEvent), data.expectedRevision); }
        self.postMessage({ id, value });
      } finally { store.close(); }
    }
  } catch (e) { self.postMessage({ id, error: (e as Error).message }); }
};
