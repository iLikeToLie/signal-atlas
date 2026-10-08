import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { curveEmbedding, embeddingSimilarity } from '../src/siamese.ts';
import { DEFAULT_GROUPING, validateGrouping } from '../src/grouping.ts';

const fixtures = JSON.parse(readFileSync(new URL('./siamese-fixture.json', import.meta.url), 'utf8')) as { grid: number[]; embedding: number[] }[];
test('archived CNN forward pass agrees with frozen PyTorch embeddings', () => {
  for (const fixture of fixtures) {
    const actual = curveEmbedding(fixture.grid);
    actual.forEach((value, i) => assert.ok(Math.abs(value - fixture.embedding[i]) < 2e-5, `Embedding coordinate ${i}`));
    assert.ok(Math.abs(Math.hypot(...actual) - 1) < 1e-6);
    assert.ok(embeddingSimilarity(actual, actual) > .99999);
  }
  assert.throws(() => curveEmbedding([0, NaN]));
});
test('retired CNN settings cannot activate learned scoring', () => {
  assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, visionModel: 'siamese' }), /Only standard CV pixel overlap/);
  assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, visionModel: 'unknown' }), /Only standard CV pixel overlap/);
  assert.throws(() => validateGrouping({ ...DEFAULT_GROUPING, visionModel: 'woa-medoids' }), /Only standard CV pixel overlap/);
});
test('archived checkpoint and summary metrics match the frozen evaluation evidence', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url));
  const report = JSON.parse(read('../models/siamese-evaluation.json').toString());
  const summary = JSON.parse(read('../src/data/siamese-summary.json').toString());
  assert.equal(createHash('sha256').update(read('../src/data/siamese-model.json')).digest('hex'), report.modelSha256);
  assert.equal(summary.modelSha256, report.modelSha256);
  assert.equal(summary.datasetSha256, JSON.parse(read('../datasets/signal-shapes-v1/validation-report.json').toString()).corpusSha256);
  for (const method of summary.methods) {
    const evidence = report.test[method.id];
    assert.equal(method.recallAt1, evidence.outcomes.filter((r: { correct: boolean }) => r.correct).length / evidence.queries);
    assert.deepEqual(method.byQuantity, evidence.byQuantity);
  }
  assert.ok(report.test.cnn.recallAt1 < report.test.overlap.recallAt1);
  assert.equal(DEFAULT_GROUPING.visionModel || 'overlap', 'overlap');
});
