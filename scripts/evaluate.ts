import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AtlasData } from '../src/types.ts';
import { syntheticEvaluationDataset, validateEvaluationDataset } from '../src/evaluationData.ts';
import { runEvaluation } from '../src/evaluation.ts';
import { SHAPE_WEIGHTS } from '../src/signal.ts';

const quantity = process.argv[2] || 'both', file = process.argv[3];
if (!['frequency', 'pri', 'both'].includes(quantity) || file && quantity === 'both') throw new Error('Usage: npm run evaluate -- [frequency|pri|both] [optional-labelled-dataset.json]. Select one quantity for a custom dataset.');
const output = resolve('artifacts');
mkdirSync(output, { recursive: true });
for (const selected of quantity === 'both' ? ['frequency', 'pri'] : [quantity]) {
  const atlas = JSON.parse(readFileSync(new URL(`../src/data/${selected === 'pri' ? 'pri-atlas' : 'atlas'}.json`, import.meta.url), 'utf8')) as AtlasData;
  const text = file ? readFileSync(file, 'utf8') : undefined;
  if (text && Buffer.byteLength(text) > 5_000_000) throw new Error('Evaluation datasets must be at most 5 MB.');
  const dataset = text ? validateEvaluationDataset(JSON.parse(text), atlas) : syntheticEvaluationDataset(atlas);
  const report = runEvaluation(atlas, dataset, SHAPE_WEIGHTS);
  writeFileSync(resolve(output, `evaluation-${selected}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(`${selected}: ${report.methods.map(m => `${m.name} ${(m.test.balancedAccuracy * 100).toFixed(1)}%`).join('; ')}`);
  console.log(`Recommendation from tune only: ${(report.recommendation.formulaWeight * 100).toFixed(0)}% formula, threshold ${(report.recommendation.threshold * 100).toFixed(1)}%. Report: artifacts/evaluation-${selected}.json`);
}
