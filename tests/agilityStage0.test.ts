import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pilotRecordings, writeControls } from '../scripts/generate-agility-controls.ts';
import { summarizeEvents, validateEventRecording } from '../spec/agility.ts';
import type { EventRecording, ObservationWindow } from '../spec/agility.ts';

const root = fileURLToPath(new URL('../datasets/agility-stage0-v1/', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const recording = (index: number) => JSON.parse(read(`recordings/recording-${String(index).padStart(4, '0')}.json`)) as EventRecording;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

test('stage 0 recordings, windows and rejection cases have verified lineage and integrity', () => {
  assert.equal(manifest.purpose, 'development-controls-only');
  assert.equal(manifest.recordings.length, 15);
  assert.equal(manifest.windows.length, 17);
  const records = new Map<string, EventRecording>();
  for (const r of manifest.recordings) {
    assert.equal(hash(read(r.path)), r.sha256);
    assert.equal(hash(read(r.csvPath)), r.csvSha256);
    const value = validateEventRecording(JSON.parse(read(r.path)));
    assert.equal(value.id, r.id);
    assert.equal(value.provenance.source, 'synthetic');
    assert.deepEqual(summarizeEvents(value), r.summary);
    assert.ok(manifest.streams.some((s: { id: string }) => s.id === value.streamId));
    records.set(value.id, value);
  }
  for (const w of manifest.windows as ObservationWindow[]) {
    const r = records.get(w.recordingId)!;
    assert.ok(r && w.startEvent >= 0 && w.startEvent < w.endEvent && w.endEvent <= r.events.length);
  }
  for (const c of manifest.invalid) {
    assert.equal(hash(read(c.path)), c.sha256);
    assert.throws(() => validateEventRecording(JSON.parse(read(c.path))), new RegExp(c.expectedError));
  }
  const groupIds = manifest.sourceGroups.flatMap((g: { recordingIds: string[] }) => g.recordingIds);
  assert.deepEqual([...groupIds].sort(), [...records.keys()].sort(), 'Related constructions each occur in exactly one development source group.');
});

test('CSV representations retain explicit missing values, channel metadata and event order', () => {
  for (const fixture of manifest.recordings) {
    const lines = read(fixture.csvPath).trimEnd().split('\n');
    assert.ok(lines[0].startsWith('# recording: '));
    const metadata = JSON.parse(lines[0].slice('# recording: '.length));
    const headers = lines[1].split(',');
    assert.deepEqual(headers, ['t', ...metadata.channels.map((c: { id: string }) => c.id)]);
    const events = lines.slice(2).map((line: string) => {
      const cells = line.split(','); assert.equal(cells.length, headers.length);
      return { t: Number(cells[0]), values: Object.fromEntries(headers.slice(1).map((id, i) => [id, cells[i + 1] === '' ? null : Number(cells[i + 1])])) };
    });
    assert.deepEqual(validateEventRecording({ ...metadata, events }), JSON.parse(read(fixture.path)));
  }
});

test('event gate accepts steady and minimum-size observations without claiming repetition', () => {
  const steady = validateEventRecording(recording(9)), minimum = validateEventRecording(recording(12));
  assert.equal(new Set(steady.events.map(e => e.values.frequency)).size, 1);
  assert.equal(minimum.events.length, 16);
  assert.throws(() => validateEventRecording({ ...minimum, events: minimum.events.slice(0, 15) }), /16–100,000/);
  const unknownCapture = { ...steady, captureId: null };
  assert.equal(validateEventRecording(unknownCapture).captureId, null);
});

test('validation preserves originals and rejects missing metadata and invalid numerical spans', () => {
  const value = recording(1), before = structuredClone(value), result = validateEventRecording(value);
  assert.deepEqual(value, before);
  result.events[0].values.frequency = 0;
  assert.deepEqual(value, before, 'The validated result cannot mutate the original.');
  assert.throws(() => validateEventRecording({ ...value, captureId: undefined }), /identifier or explicit null/);
  const overflow = structuredClone(value);
  overflow.events[0].t = -1e308; overflow.events.at(-1)!.t = 1e308;
  assert.throws(() => validateEventRecording(overflow), /finite nonzero/);
  assert.throws(() => validateEventRecording({ ...value, time: { unit: 'us', basis: 'absolute' } }), /origin/);
});

test('joint evidence counts distinguish missing channels from disjoint observations', () => {
  const missing = summarizeEvents(recording(6)), disjoint = summarizeEvents(recording(8));
  assert.equal(missing.measuredCounts.pulseWidth, 0);
  assert.equal(missing.overlapCounts['frequency|pri'], 63);
  assert.equal(disjoint.measuredCounts.frequency, 32);
  assert.equal(disjoint.measuredCounts.pri, 32);
  assert.equal(disjoint.jointEvents, 0);
  assert.ok(Object.values(disjoint.overlapCounts).every(n => n === 0));
  assert.throws(() => summarizeEvents(recording(1), 0, 65), /source-event interval/);
  const short = { ...recording(1), events: recording(1).events.slice(0, 8) };
  assert.throws(() => validateEventRecording(short), /16–100,000/);
});

test('controlled scale variant preserves shared timing while changed coordination has a distinct joint sequence', () => {
  const base = recording(1), scaled = recording(3), changed = recording(4);
  for (let i = 0; i < base.events.length; i++) {
    assert.ok(Math.abs(scaled.events[i].t - 2 * base.events[i].t) < 1e-8);
    assert.ok(Math.abs(scaled.events[i].values.frequency! - (base.events[i].values.frequency! * 1.5 + 100)) < 1e-8);
    assert.equal(changed.events[i].values.frequency, base.events[i].values.frequency);
    assert.equal(changed.events[i].values.pulseWidth, base.events[i].values.pulseWidth);
  }
  assert.notDeepEqual(changed.events.map(e => e.values.pri), base.events.map(e => e.values.pri));
  // The PRI values of a complete interior block are the same circular sequence.
  const a = base.events.slice(8, 16).map(e => e.values.pri!);
  const b = changed.events.slice(8, 16).map(e => e.values.pri!);
  assert.deepEqual(b, [...a.slice(1), a[0]]);
});

test('partial and cross-emitter controls preserve source intervals, unit equivalence and duplicate capture identity', () => {
  const base = recording(1), other = recording(2), partial = recording(5), duplicate = recording(11);
  assert.notEqual(base.streamId, other.streamId);
  for (let i = 0; i < base.events.length; i++) assert.ok(Math.abs(other.events[i].values.frequency! * 1000 - base.events[i].values.frequency!) < 1e-8);
  partial.events.forEach((e, i) => {
    assert.deepEqual(e.values, base.events[i + 16].values);
    assert.ok(Math.abs(e.t - (base.events[i + 16].t - base.events[16].t)) < 1e-8);
  });
  assert.equal(partial.events.length, 32);
  assert.deepEqual(manifest.cases.find((c: { expectation: string }) => c.expectation === 'partial-match').targetInterval, [16, 48]);
  assert.deepEqual(duplicate.events, base.events);
  assert.equal(duplicate.captureId, base.captureId);
  assert.notEqual(duplicate.id, base.id);
});

test('stage 0 files reproduce byte for byte without introducing matcher outputs', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'signal-agility-controls-'));
  try {
    writeControls(temporary);
    const files = ['manifest.json', ...manifest.recordings.flatMap((r: { path: string; csvPath: string }) => [r.path, r.csvPath]), ...manifest.invalid.map((r: { path: string }) => r.path)];
    for (const path of files) assert.equal(readFileSync(join(temporary, path), 'utf8'), read(path), path);
    assert.ok(manifest.cases.every((c: object) => !Object.hasOwn(c, 'score') && !Object.hasOwn(c, 'threshold')));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('optional capacity workload totals 1M source events, with a 100K maximum and 500 reference windows', () => {
  let events = 0, maximum = 0, sources = 0;
  const streams = new Set<string>();
  for (const r of pilotRecordings()) {
    validateEventRecording(r); events += r.events.length; maximum = Math.max(maximum, r.events.length); sources++;
    streams.add(r.streamId);
    for (let i = 0; i < 9; i++) assert.ok(Math.floor((i + 1) * r.events.length / 9) - Math.floor(i * r.events.length / 9) >= 16);
  }
  assert.equal(events, 1_000_000); assert.equal(maximum, 100_000); assert.equal(sources, 50); assert.equal(streams.size, 50); assert.equal(sources * 10, 500);
});
