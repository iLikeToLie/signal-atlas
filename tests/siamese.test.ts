import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { curveEmbedding, embeddingSimilarity } from '../src/siamese.ts';
import { DEFAULT_GROUPING, similarityScorer, validateGrouping } from '../src/grouping.ts';
import { controlInserts } from '../src/controlInserts.ts';
import type { AtlasData } from '../src/types.ts';

const fixtures = JSON.parse(readFileSync(new URL('./siamese-fixture.json', import.meta.url), 'utf8')) as { grid: number[]; embedding: number[] }[];
test('browser CNN forward pass agrees with frozen PyTorch embeddings', () => {
  for (const fixture of fixtures) {
    const actual = curveEmbedding(fixture.grid);
    actual.forEach((value, i) => assert.ok(Math.abs(value - fixture.embedding[i]) < 2e-5, `Embedding coordinate ${i}`));
    assert.ok(Math.abs(Math.hypot(...actual) - 1) < 1e-6);
    assert.ok(embeddingSimilarity(actual, actual) > .99999);
  }
  assert.throws(() => curveEmbedding([0, NaN]));
});
test('learned scorer preserves physical compatibility and formula weighting', () => {
  const atlas = JSON.parse(readFileSync(new URL('../src/data/atlas.json', import.meta.url), 'utf8')) as AtlasData;
  const a = controlInserts(atlas)[0].entry, b = controlInserts(atlas)[1].entry;
  const settings = { ...DEFAULT_GROUPING, visionModel: 'siamese' as const };
  const score = similarityScorer(settings)(a, b)!;
  assert.ok(score.rawVision !== null && score.rawVision >= 0 && score.rawVision <= 1);
  assert.ok(Math.abs(score.combined - (.7 * score.formula + .3 * score.vision!)) < 1e-12);
  assert.equal(similarityScorer(settings)(a, { ...b, quantity: 'pri' }), null);
  assert.throws(() => validateGrouping({ ...settings, visionModel: 'unknown' }));
});
test('shipped checkpoint and UI metrics match the frozen evaluation evidence', () => {
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
