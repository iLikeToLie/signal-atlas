import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParameters, normalizeMatchSettings, windowEligibility } from '../src/agilityComparison.ts';
import { DEFAULT_MATCH, sha256, reviewWindow } from '../src/agilityModel.ts';
import { validateBackup } from '../src/agilityStorage.ts';
import { controlView, mapLibrary } from './helpers/agilityMapFixtures.ts';
test('parameter masks canonicalize all seven combinations and reject empty/invalid masks', () => {
  const all = ['frequency', 'pri', 'pulse-width'];
  for (let mask = 1; mask < 8; mask++) { const selected = all.filter((_, i) => mask & (1 << i)); assert.deepEqual(normalizeParameters([...selected].reverse()), selected); }
  assert.deepEqual(normalizeParameters(['pulse-width','frequency']), ['frequency','pulse-width']);
  assert.throws(() => normalizeParameters([])); assert.throws(() => normalizeParameters(['amplitude']));
  assert.deepEqual(normalizeParameters(['frequency','frequency']), ['frequency']);
});
test('old settings default to all three without rewriting history', () => {
  const old = { threshold: .85, minimumOverlap: 16, absoluteWeight: 0, durationWeight: 0 };
  assert.deepEqual(normalizeMatchSettings(old).parameters, ['frequency','pri','pulse-width']);
  assert.throws(() => normalizeMatchSettings({ ...old, parameters: [] }));
});
test('missing derived ambiguous and disjoint selected channels are ineligible', () => {
  assert.equal(windowEligibility(controlView(0), DEFAULT_MATCH).eligible, true);
  assert.equal(windowEligibility(controlView(5), DEFAULT_MATCH).eligible, false);
  assert.equal(windowEligibility(controlView(5), { ...DEFAULT_MATCH, parameters: ['frequency','pri'] }).eligible, true);
  const derived = controlView(0); derived.channels = derived.channels.map(c => c.quantity === 'frequency' ? { ...c, origin: 'derived' } : c);
  assert.equal(windowEligibility(derived, DEFAULT_MATCH).eligible, false);
  const ambiguous = controlView(0); ambiguous.channels = [...ambiguous.channels, { ...ambiguous.channels[0], id: 'other-frequency' }];
  assert.equal(windowEligibility(ambiguous, DEFAULT_MATCH).eligible, false);
  assert.equal(windowEligibility(controlView(7), { ...DEFAULT_MATCH, parameters: ['frequency','pri'] }).eligible, false);
});
test('old backup normalization verifies raw integrity first and preserves evidence originals IDs and undo', async () => {
  const { state, originals } = await mapLibrary([0]);
  const reviewed = reviewWindow(state, state.windows[0].id, 'new-pattern', 'Original identity');
  delete reviewed.settings.parameters;
  const payload = { state: reviewed, recordings: originals }, text = JSON.stringify({ format: 'signal-atlas-agility-backup', version: 1, sha256: await sha256(JSON.stringify(payload)), payload });
  const restored = await validateBackup(text);
  assert.deepEqual(restored.state.settings.parameters, ['frequency','pri','pulse-width']);
  assert.deepEqual(restored.state.decisions, reviewed.decisions); assert.deepEqual(restored.state.history, reviewed.history);
  assert.deepEqual(restored.recordings, originals); assert.deepEqual(restored.state.patterns, reviewed.patterns);
  const bad = JSON.parse(text); bad.sha256 = '0'.repeat(64); await assert.rejects(validateBackup(JSON.stringify(bad)), /integrity/);
});
