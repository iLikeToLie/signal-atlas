import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeEvents, validateEventRecording } from '../spec/agility.ts';
import type { Channel, EventRecording, EventRow, ObservationWindow, StreamProfile } from '../spec/agility.ts';

export const CONTROL_SEED = 20261012;
export const CONTROL_VERSION = '1.0.0';
export const CONTROL_ROOT = 'datasets/agility-stage0-v1';
const round = (n: number) => Number(n.toFixed(9));
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const channels: Channel[] = [
  { id: 'frequency', name: 'Frequency', quantity: 'frequency', unit: 'MHz', origin: 'supplied' },
  { id: 'pri', name: 'Pulse repetition interval', quantity: 'pri', unit: 'us', origin: 'supplied', priConvention: 'preceding-event' },
  { id: 'pulseWidth', name: 'Pulse width', quantity: 'pulse-width', unit: 'us', origin: 'supplied' },
];
function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
function rows(count = 64, repeat = false, shift = 0): EventRow[] {
  const frequency = [100, 120, 110, 145, 130, 105, 135, 115];
  const pri = [8, 12, 7, 10, 6, 11, 9, 13];
  const width = [.8, 1.2, .7, 1, .6, 1.1, .9, 1.3];
  let t = 0;
  return Array.from({ length: count }, (_, i) => {
    const block = repeat ? 0 : Math.floor(i / 8), p = i % 8;
    const interval = pri[(p + shift) % 8] + block * .25;
    if (i) t += interval;
    return { t: round(t), values: { frequency: round(frequency[p] + block ** 2 * 1.5), pri: i ? round(interval) : null, pulseWidth: round(width[p] + block * .04) } };
  });
}
function recording(index: number, streamId: string, events: EventRow[], definitions = channels): EventRecording {
  const suffix = String(index).padStart(4, '0');
  return { schemaVersion: 1, id: `recording-${suffix}`, name: `Control observation ${index}`, streamId, captureId: `capture-${suffix}`,
    time: { unit: 'us', basis: 'relative' }, channels: structuredClone(definitions), events,
    provenance: { source: 'synthetic', generator: 'agility-stage0-controls', generatorVersion: CONTROL_VERSION, seed: CONTROL_SEED } };
}
type Case = {
  id: string; queryWindowId: string; targetWindowId: string;
  expectation: 'equivalent' | 'scale-variant' | 'different-coordination' | 'partial-match' | 'partial-channels' | 'insufficient-overlap' | 'weak-candidate' | 'unfamiliar' | 'duplicate-source';
  notes: string; targetInterval?: [number, number];
};
export function buildControls() {
  const streams: StreamProfile[] = [
    { id: 'emitter-A', name: 'Synthetic emitter A', kind: 'emitter', attribution: 'reviewed', notes: 'Controlled example; no measured emitter claim.' },
    { id: 'emitter-B', name: 'Synthetic emitter B', kind: 'emitter', attribution: 'reviewed', notes: 'Separate profile even when behaviour resembles A.' },
    { id: 'candidate-C', name: 'Synthetic unresolved stream C', kind: 'candidate', attribution: 'uncertain', notes: 'Behavioural matches do not establish its identity.' },
  ];
  const base = rows(), records: EventRecording[] = [];
  records.push(recording(1, 'emitter-A', structuredClone(base)));
  records.push(recording(2, 'emitter-B', base.map(e => ({ t: e.t, values: { ...e.values, frequency: round(e.values.frequency! / 1000) } })), channels.map(c => c.id === 'frequency' ? { ...c, unit: 'GHz' } : c)));
  records.push(recording(3, 'emitter-A', base.map(e => ({ t: round(e.t * 2), values: { frequency: round(e.values.frequency! * 1.5 + 100), pri: e.values.pri === null ? null : round(e.values.pri * 2), pulseWidth: round(e.values.pulseWidth! * 2) } }))));
  records.push(recording(4, 'emitter-B', rows(64, false, 1)));
  const start = base[16].t;
  records.push(recording(5, 'emitter-B', base.slice(16, 48).map(e => ({ t: round(e.t - start), values: { ...e.values } }))));
  records.push(recording(6, 'emitter-A', base.map(e => ({ ...e, values: { ...e.values, pulseWidth: null } }))));
  records.push(recording(7, 'emitter-B', base.map((e, i) => ({ ...e, values: { frequency: i % 5 ? e.values.frequency : null, pri: i % 3 ? e.values.pri : null, pulseWidth: i % 4 ? e.values.pulseWidth : null } }))));
  records.push(recording(8, 'candidate-C', base.map((e, i) => ({ ...e, values: { frequency: i < 32 ? e.values.frequency : null, pri: i >= 32 ? e.values.pri : null, pulseWidth: null } }))));
  records.push(recording(9, 'candidate-C', Array.from({ length: 32 }, (_, i) => ({ t: i * 10, values: { frequency: 200, pri: i ? 10 : null, pulseWidth: 1 } }))));
  const unfamiliar = random(CONTROL_SEED + 10);
  records.push(recording(10, 'candidate-C', base.map(e => ({ t: e.t, values: { ...e.values, frequency: round(90 + 80 * unfamiliar()), pulseWidth: round(.4 + unfamiliar()) } }))));
  records.push({ ...recording(11, 'emitter-A', structuredClone(base)), captureId: records[0].captureId });
  records.push(recording(12, 'emitter-A', rows(16)));
  records.push(recording(13, 'emitter-B', rows(64, true)));
  const noise = random(CONTROL_SEED + 14); let t = 0;
  records.push(recording(14, 'emitter-B', base.map((e, i) => {
    const interval = e.values.pri === null ? null : round(e.values.pri + (noise() - .5) * .4);
    if (i) t += interval!;
    return { t: round(t), values: { frequency: round(e.values.frequency! + (noise() - .5) * 1.4), pri: interval, pulseWidth: round(e.values.pulseWidth! + (noise() - .5) * .06) } };
  })));
  records.push(recording(15, 'emitter-A', base.map((e, i) => ({ t: e.t, values: { ...e.values, level: round(-20 + Math.sin(i / 8)) } })), [...channels, { id: 'level', name: 'Relative level', quantity: 'numeric', unit: 'dB', origin: 'supplied' }]));
  records.forEach(validateEventRecording);
  const windows: ObservationWindow[] = records.map(r => ({ id: `${r.id}-full`, recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' }));
  windows.push({ id: 'recording-0001-middle', recordingId: records[0].id, startEvent: 16, endEvent: 48, reviewState: 'unreviewed' });
  windows.push({ id: 'recording-0001-too-short', recordingId: records[0].id, startEvent: 0, endEvent: 8, reviewState: 'unresolved' });
  const pair = (index: number, expectation: Case['expectation'], notes: string): Case => ({ id: `case-${String(index).padStart(2, '0')}`, queryWindowId: `recording-${String(index).padStart(4, '0')}-full`, targetWindowId: 'recording-0001-full', expectation, notes });
  const cases: Case[] = [
    pair(2, 'equivalent', 'Convert MHz/GHz explicitly. Retain separate emitter-specific cards and reviewed links.'),
    pair(3, 'scale-variant', 'Global time scale 2; frequency offset/range change. Coordination and event order survive.'),
    pair(4, 'different-coordination', 'PRI dwell order is circularly shifted while Frequency and pulse width are unchanged. Do not align each channel independently.'),
    { ...pair(5, 'partial-match', 'Only the contiguous middle is observed. No evidence for unseen ends.'), targetInterval: [16, 48] },
    pair(6, 'partial-channels', 'Frequency/PRI support is possible; pulse width remains wholly unobserved.'),
    pair(7, 'partial-channels', 'Missing values are explicit; report pairwise overlap and revisit eligibility after matcher tuning.'),
    pair(8, 'insufficient-overlap', 'Each channel has measurements but no event has two measured channels. Multi-parameter coordination is unsupported.'),
    pair(10, 'unfamiliar', 'Leave unresolved or create new pattern; ranking never establishes attribution.'),
    pair(11, 'duplicate-source', 'Same capture and event payload; not an independent observation of support.'),
    pair(14, 'weak-candidate', 'Perturbed candidate requires review; no numeric score or cutoff is asserted by this fixture.'),
    pair(15, 'partial-channels', 'Core channels agree; the target has no level channel. Missing target level cannot confirm it.'),
  ];
  const invalid: { id: string; expectedError: string; value: unknown }[] = [];
  const bad = (id: string, expectedError: string, edit: (r: EventRecording) => void) => {
    const value = structuredClone(records[0]); edit(value); invalid.push({ id, expectedError, value });
  };
  bad('too-few-events', '16–100,000', r => { r.events = r.events.slice(0, 15); });
  bad('too-few-measurements', '16 measured', r => { r.events.forEach((e, i) => { if (i >= 15) for (const c of r.channels) e.values[c.id] = null; }); });
  bad('unordered-time', 'strictly increasing', r => { r.events[20].t = r.events[19].t; });
  bad('missing-unit', 'units', r => { r.channels[0].unit = ''; });
  bad('missing-stream', 'identifiers', r => { r.streamId = ''; });
  bad('omitted-value', 'explicitly', r => { delete r.events[5].values.pulseWidth; });
  bad('negative-pri', 'positive', r => { r.events[5].values.pri = -1; });
  bad('duplicate-channel', 'unique', r => { r.channels.push(structuredClone(r.channels[0])); });
  bad('only-derived', 'supplied', r => { r.channels.forEach(c => { c.origin = 'derived'; c.derivation = 'Synthetic derivation for rejection control.'; }); });
  return { streams, records, windows, cases, invalid };
}

export function eventCsv(recording: EventRecording) {
  const { events, ...metadata } = recording;
  return `# recording: ${JSON.stringify(metadata)}\n` + ['t', ...recording.channels.map(c => c.id)].join(',') + '\n' +
    events.map(e => [e.t, ...recording.channels.map(c => e.values[c.id] ?? '')].join(',')).join('\n') + '\n';
}
/** Optional capacity workload: 50 sources, 1M retained events, 500 reference-only windows. */
export function* pilotRecordings(): Generator<EventRecording> {
  const template = rows(64, true);
  for (let index = 0; index < 50; index++) {
    const count = index === 0 ? 100_000 : index === 49 ? 18_384 : 18_367;
    let t = 0;
    const events = Array.from({ length: count }, (_, i) => {
      const source = template[i % template.length], interval = source.values.pri ?? 8;
      if (i) t += interval;
      return { t: round(t), values: { ...source.values, pri: i ? interval : null } };
    });
    yield recording(index + 100, `pilot-emitter-${index + 1}`, events);
  }
}
export function writeControls(output = resolve(CONTROL_ROOT)) {
  const { streams, records, windows, cases, invalid } = buildControls();
  const write = (path: string, text: string) => { mkdirSync(dirname(resolve(output, path)), { recursive: true }); writeFileSync(resolve(output, path), text); return sha(text); };
  const recordings = records.map(record => {
    const path = `recordings/${record.id}.json`, csvPath = `recordings/${record.id}.csv`;
    return { id: record.id, path, sha256: write(path, json(record)), csvPath, csvSha256: write(csvPath, eventCsv(record)), summary: summarizeEvents(record) };
  });
  const rejected = invalid.map(c => { const path = `invalid/${c.id}.json`; return { id: c.id, path, sha256: write(path, json(c.value)), expectedError: c.expectedError }; });
  write('manifest.json', json({ schemaVersion: 1, datasetId: 'agility-stage0-v1', generatorVersion: CONTROL_VERSION, seed: CONTROL_SEED,
    purpose: 'development-controls-only', generatorSha256: sha(readFileSync(fileURLToPath(import.meta.url))), streams, recordings, windows, cases, invalid: rejected,
    sourceGroups: [{ id: 'related-base-construction', recordingIds: records.filter((_, i) => ![8, 9, 12].includes(i)).map(r => r.id) }, { id: 'steady-construction', recordingIds: [records[8].id] }, { id: 'unfamiliar-construction', recordingIds: [records[9].id] }, { id: 'repeating-construction', recordingIds: [records[12].id] }] }));
  return { recordings: records.length, windows: windows.length, cases: cases.length, invalid: invalid.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pilot')) {
    const output = resolve('artifacts/agility-stage0-pilot'); mkdirSync(output, { recursive: true });
    let eventCount = 0; const windows: ObservationWindow[] = [], sources: string[] = [], streams: StreamProfile[] = [];
    for (const r of pilotRecordings()) {
      validateEventRecording(r); writeFileSync(resolve(output, `${r.id}.json`), json(r)); eventCount += r.events.length; sources.push(r.id);
      streams.push({ id: r.streamId, name: `Synthetic pilot profile ${streams.length + 1}`, kind: 'emitter', attribution: 'reviewed', notes: 'Capacity construction only.' });
      windows.push({ id: `${r.id}-full`, recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' });
      for (let i = 0; i < 9; i++) windows.push({ id: `${r.id}-part-${i + 1}`, recordingId: r.id, startEvent: Math.floor(i * r.events.length / 9), endEvent: Math.floor((i + 1) * r.events.length / 9), reviewState: 'unreviewed' });
    }
    writeFileSync(resolve(output, 'manifest.json'), json({ schemaVersion: 1, purpose: 'capacity-workload-only', streams, sources, eventCount, windows }));
    console.log(`Wrote ${eventCount} events, ${sources.length} recordings and ${windows.length} windows to ${output}. This does not benchmark the app.`);
  } else console.log('Generated stage 0 controls:', writeControls());
}
