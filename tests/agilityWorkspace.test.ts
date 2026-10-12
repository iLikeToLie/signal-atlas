import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControls, eventCsv } from '../scripts/generate-agility-controls.ts';
import { emptyLibrary, addRecording, addWindow, storeRecording, reviewWindow, undoDecision, parseEventInput, windowView, sha256, DEFAULT_MATCH } from '../src/agilityModel.ts';
import { validateBackup, mergeBackup, prepareMigration } from '../src/agilityStorage.ts';
import { compareWindow, matchLibrary, overviewGroups } from '../src/agilityMatching.ts';
import type { LibraryState, StoredRecording } from '../src/agilityModel.ts';
const controls = buildControls();
async function library(indices = [0, 1, 2, 3, 4, 5, 7, 9]) {
  let state = emptyLibrary(); const originals: StoredRecording[] = [];
  for (const i of indices) { const r = controls.records[i], stored = await storeRecording(r, JSON.stringify(r), `${r.id}.json`); state = addRecording(state, stored, controls.streams.find(s => s.id === r.streamId)!); originals.push(stored); }
  const root = state.windows[0].id; state = reviewWindow(state, root, 'new-pattern', 'Reference pattern'); return { state, originals, root };
}
async function backup(state: LibraryState, recordings: StoredRecording[]) { const payload = JSON.stringify({ state, recordings }); return JSON.stringify({ format: 'signal-atlas-agility-backup', version: 1, sha256: await sha256(payload), payload }); }
test('new intake parses JSON, metadata CSV, plain CSV and explicit missing values without altering originals', () => {
  const r = controls.records[0]; assert.deepEqual(parseEventInput(JSON.stringify(r), 'r.json'), r); assert.deepEqual(parseEventInput(eventCsv(r), 'r.csv'), r);
  const csv = eventCsv(r).split('\n').slice(1).join('\n'); const imported = parseEventInput(csv, 'plain.csv', { streamId: 'candidate-x', timeUnit: 'us', frequencyUnit: 'MHz', intervalUnit: 'us' });
  assert.deepEqual(imported.events, r.events); assert.equal(imported.captureId, null); assert.equal(imported.streamId, 'candidate-x');
  assert.throws(() => parseEventInput(csv, 'plain.csv'), /units|identifiers|timestamp/);
  assert.throws(() => parseEventInput(csv.replace('t,frequency', 't,t'), 'bad.csv'), /unique|metadata/);
});
test('whole-library ranking distinguishes coordinated variants from independent channel alignments', async () => {
  const { state } = await library(); const target = state.patterns[0].id;
  for (const id of ['recording-0002', 'recording-0003']) {
    const w = state.windows.find(w => w.recordingId === id)!; const m = matchLibrary(state.views[w.id], state.patterns, state.views)[0];
    assert.equal(m.patternId, target); assert.ok(m.score > .99); assert.equal(m.explanation.scope, 'multi-parameter'); assert.equal(m.explanation.partial, false);
  }
  const changed = state.windows.find(w => w.recordingId === 'recording-0004')!; assert.ok(matchLibrary(state.views[changed.id], state.patterns, state.views)[0].score < .7);
});
test('contiguous partial alignment identifies source interval and missing channels stay unsupported', async () => {
  const { state } = await library(); const partial = state.windows.find(w => w.recordingId === 'recording-0005')!, missing = state.windows.find(w => w.recordingId === 'recording-0006')!;
  const a = matchLibrary(state.views[partial.id], state.patterns, state.views)[0], b = matchLibrary(state.views[missing.id], state.patterns, state.views)[0];
  assert.equal(a.explanation.partial, true); assert.deepEqual([a.explanation.target.startEvent, a.explanation.target.endEvent], [16, 48]);
  assert.ok(!b.explanation.query.channelIds.includes('pulseWidth')); assert.ok(b.explanation.channelResults.find(c => c.channelId === 'pulseWidth')!.missing);
  const disjoint = state.windows.find(w => w.recordingId === 'recording-0008')!; assert.equal(matchLibrary(state.views[disjoint.id], state.patterns, state.views)[0].explanation.scope, 'single-parameter');
});
test('review creates emitter-specific identities and scoped cross-emitter links, with undo after new imports', async () => {
  const { state: initial, originals } = await library(); const b = initial.windows.find(w => w.recordingId === 'recording-0002')!;
  const m = matchLibrary(initial.views[b.id], initial.patterns, initial.views)[0];
  const reviewed = reviewWindow(initial, b.id, 'support', 'Same coordinated sequence observed in B.', m.patternId, m.explanation);
  assert.equal(reviewed.patterns.length, 2); assert.notEqual(reviewed.patterns[0].streamId, reviewed.patterns[1].streamId); assert.equal(reviewed.relationships.length, 1);
  assert.equal(reviewed.patterns[0].id, initial.patterns[0].id); assert.equal(reviewed.sources.length, initial.sources.length);
  const source = await storeRecording(controls.records[8], JSON.stringify(controls.records[8]), 'steady.json');
  const withLater = addRecording(reviewed, source, controls.streams[2]); const undone = undoDecision(withLater);
  assert.equal(undone.relationships.length, 0); assert.equal(undone.patterns.length, 1); assert.equal(undone.sources.length, withLater.sources.length); assert.equal(undone.windows.length, withLater.windows.length);
  assert.deepEqual(undone.historyArchive.at(-1)!.before.patterns, withLater.patterns);
  assert.deepEqual(undone.historyArchive.at(-1)!.before.relationships, withLater.relationships);
  await validateBackup(await backup(undone, [...originals, source]));
  await validateBackup(await backup(reviewed, originals));
});
test('scale variants, explicit new patterns and challenges preserve earlier evidence and decisions', async () => {
  const { state: s } = await library(); const w = s.windows.find(w => w.recordingId === 'recording-0003')!;
  const m = matchLibrary(s.views[w.id], s.patterns, s.views)[0]; const v = reviewWindow(s, w.id, 'variant', 'Twice the duration.', m.patternId, m.explanation);
  assert.equal(v.patterns.length, 1); assert.equal(v.variants.length, 1); assert.equal(v.patterns[0].revision, 2);
  const n = reviewWindow(v, w.id, 'new-pattern', 'Explicit separate pattern', m.patternId, m.explanation); assert.equal(n.patterns.length, 2);
  const challenged = reviewWindow(v, w.id, 'challenge', 'Evidence challenges the earlier range.', m.patternId, m.explanation);
  assert.equal(challenged.evidence.at(-1)!.role, 'challenge'); assert.ok(challenged.decisions.length > s.decisions.length); assert.equal(s.patterns[0].revision, 1);
});
test('windows reference retained events, reject duplicate ranges and block undersized matching', async () => {
  const { state, originals } = await library(); const s = addWindow(state, originals[0].recording, 0, 8), w = s.windows.at(-1)!;
  assert.equal(s.sources.length, state.sources.length); assert.equal(s.views[w.id].count, 8); assert.equal(matchLibrary(s.views[w.id], s.patterns, s.views).length, 0);
  assert.throws(() => addWindow(s, originals[0].recording, 0, 8), /already/); assert.throws(() => addWindow(s, originals[0].recording, -1, 5), /interval/);
});
test('backup round trip verifies hashes and semantic references before any write', async () => {
  const { state, originals } = await library(); const text = await backup(state, originals), result = await validateBackup(text);
  assert.deepEqual(result.state, state); assert.deepEqual(result.recordings, originals);
  const outer = JSON.parse(text); outer.sha256 = '0'.repeat(64); await assert.rejects(validateBackup(JSON.stringify(outer)), /integrity/);
  const changed = structuredClone(state); changed.evidence[0].scope.endEvent = 10000; await assert.rejects(validateBackup(await backup(changed, originals)), /scope/);
  const missing = originals.slice(1); await assert.rejects(validateBackup(await backup(state, missing)), /source count/);
});
test('merge retains identities and rejects conflicts instead of silently replacing', async () => {
  const { state } = await library(); assert.equal(mergeBackup(state, state).sources.length, state.sources.length);
  const modified = structuredClone(state); modified.patterns[0].name = 'Conflicting name'; assert.throws(() => mergeBackup(state, modified), /Conflicting/);
  const originals = structuredClone(state); originals.sources[0].originalSha256 = '0'.repeat(64); assert.throws(() => mergeBackup(state, originals), /Conflicting sources/);
  const legacy = { ...state, legacy: { old: 'retained original' } }; assert.throws(() => mergeBackup(legacy, { ...state, legacy: { old: 'different original' } }), /Conflicting legacy/);
  const history = structuredClone(state); history.history[0].before.windows[0].reviewState = 'unresolved'; assert.throws(() => mergeBackup(state, history), /Conflicting history/);
});
test('legacy migration retains malformed raw text and does not invent synchronization or identities', async () => {
  const old = { id: 'local-old', name: 'Old cycle', period: 1, units: { time: 'tu', frequency: 'fu' }, sampling: 'uniform-open', samples: Array.from({ length: 8 }, (_, i) => ({ t: i / 8, f: 10 + Math.sin(i / 8 * 2 * Math.PI) })) };
  const legacy = { 'frequency-agile-atlas.imports.v1': JSON.stringify([old]), 'frequency-agile-atlas.library-review.v1': '{broken' };
  const migrated = await prepareMigration(emptyLibrary(), legacy); assert.equal(migrated.recordings.length, 1); assert.equal(migrated.state.streams[0].attribution, 'uncertain'); assert.equal(migrated.state.views[migrated.state.windows[0].id].channels.length, 1); assert.deepEqual(migrated.state.legacy, legacy);
  await validateBackup(await backup(migrated.state, migrated.recordings));
});
test('overview groups are reproducible browsing aids and never mutate reviewed entities', async () => {
  const { state } = await library(), before = structuredClone(state); const groups = overviewGroups(state.views);
  assert.deepEqual(groups, overviewGroups(Object.fromEntries(Object.entries(state.views).reverse()))); assert.deepEqual(state, before);
  const a = state.windows.find(w => w.recordingId === 'recording-0001')!, variant = state.windows.find(w => w.recordingId === 'recording-0003')!;
  assert.equal(groups[a.id], groups[variant.id]);
});
test('display summaries stay bounded for gap-rich 100K-event sources and preserve observed extrema', () => {
  const r = structuredClone(controls.records[0]); r.events = Array.from({ length: 100_000 }, (_, i) => ({ t: i, values: { frequency: i % 2 ? null : i === 50000 ? 999 : 100, pri: 1, pulseWidth: 1 } }));
  const v = windowView(r, { id: 'large', recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' });
  assert.ok(v.points.length < 1000); assert.equal(v.ranges.frequency![1], 999); assert.ok(v.points.some(p => p.values.frequency === 999)); assert.ok(v.points.some(p => p.breaks.includes('frequency')));
});
test('nearest-point reuse cannot manufacture overlapping measured support', () => {
  const q = controls.records[0], r = structuredClone(q); r.events = r.events.slice(0, 16);
  r.events.forEach((e, i) => { e.values.frequency = i % 2 ? null : e.values.frequency; e.values.pulseWidth = i % 2 ? e.values.pulseWidth : null; }); r.events[0].values.pri = 8;
  const make = (r: typeof q) => windowView(r, { id: r.id, recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' });
  const m = compareWindow(make(q), make(r), DEFAULT_MATCH, true)!;
  assert.equal(m.explanation.scope, 'single-parameter'); assert.deepEqual(m.explanation.query.channelIds, ['pri']);
  assert.ok(m.explanation.channelResults.find(c => c.channelId === 'frequency')!.missing);
});
test('merge establishes an undo checkpoint without discarding portable history', async () => {
  const {state}=await library();const merged=mergeBackup(state,state);
  assert.equal(merged.history.length,0);assert.equal(merged.historyArchive.length,state.history.length);assert.deepEqual(merged.decisions,state.decisions);
  assert.throws(()=>undoDecision(merged),/no decision/);
});
test('invalid historical references are rejected before restore can enable a broken undo', async () => {
  const {state,originals}=await library();const changed=structuredClone(state);
  changed.history[0].before.patterns.push({id:'bad-pattern',streamId:'absent-profile',name:'Bad',revision:1,representativeWindowId:'absent-window',evidenceIds:[],variantIds:[],notes:''});
  await assert.rejects(validateBackup(await backup(changed,originals)),/historical pattern/);
});
test('repeated cross-emitter review retains both pattern and relationship identity with frozen diagnostics', async () => {
  const {state:s}=await library();const w=s.windows.find(w=>w.recordingId==='recording-0002')!,m=matchLibrary(s.views[w.id],s.patterns,s.views)[0];
  const first=reviewWindow(s,w.id,'support','First observation.',m.patternId,m.explanation,m.score);
  const again=reviewWindow(first,w.id,'support','Reviewed again.',m.patternId,m.explanation,m.score);
  assert.equal(again.patterns.length,first.patterns.length);assert.equal(again.relationships.length,1);assert.equal(again.relationships[0].id,first.relationships[0].id);assert.equal(again.relationships[0].revision,2);
  assert.deepEqual(again.decisions.at(-1)!.match,m.explanation);assert.equal(again.decisions.at(-1)!.score,m.score);
});
test('quoted CSV measurements and BOM input are preserved while ambiguous channel reuse is rejected', () => {
  const raw=eventCsv(controls.records[0]);const quoted=raw.split('\n').map(l=>l.startsWith('#')||!l?l:l.split(',').map(c=>'"'+c+'"').join(',')).join('\n');
  assert.deepEqual(parseEventInput('\uFEFF'+quoted,'quoted.csv'),controls.records[0]);
  const r=structuredClone(controls.records[0]);r.channels.push({...r.channels[0],id:'secondFrequency'});r.events.forEach(e=>{e.values.secondFrequency=e.values.frequency});
  const target=structuredClone(r);target.channels=[target.channels[0]];target.events.forEach(e=>{e.values={frequency:e.values.frequency}});
  const make=(r:typeof target)=>windowView(r,{id:r.id,recordingId:r.id,startEvent:0,endEvent:r.events.length,reviewState:'unreviewed'});
  const result=compareWindow(make(r),make(target),DEFAULT_MATCH,true)!;assert.equal(result.explanation.scope,'single-parameter');assert.ok(result.explanation.channelResults.find(c=>c.channelId==='secondFrequency')!.missing);
});
