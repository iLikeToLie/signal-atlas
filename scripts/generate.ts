import { mkdirSync, writeFileSync } from 'node:fs';
import { generateCatalogue, SEED } from '../src/catalogue.ts';
import { generatePriCatalogue } from '../src/priCatalogue.ts';
import { distanceMatrix, embed, shapeMatrix } from '../src/layout.ts';
import { DEFAULT_WEIGHTS } from '../src/signal.ts';
import { groupRegions } from '../src/regions.ts';
import type { AtlasData } from '../src/types.ts';

const pri = process.argv.includes('--pri');
const entries = pri ? generatePriCatalogue() : generateCatalogue();
console.log(`Computing reference distances for ${entries.length} cycles…`);
const shapes = shapeMatrix(entries);
const distances = distanceMatrix(entries, DEFAULT_WEIGHTS, shapes);
const combined = embed(distances, SEED);
const shape = embed(shapes, SEED);
// Ignore duplicate controls when calibrating nearest reference distances.
const nearest = distances.map(row => Math.min(...row.filter(d => d > 1e-5))).sort((a, b) => a - b);
const threshold = Math.max(0.15, nearest[Math.floor(nearest.length * 0.95)] * 1.5);
const data: AtlasData = { entries,
  regionSet: groupRegions(entries, shapes),
  positions: Object.fromEntries(entries.map((e, i) => [e.id, combined.points[i]])),
  shapePositions: Object.fromEntries(entries.map((e, i) => [e.id, shape.points[i]])),
  metadata: { seed: SEED, method: 'Classical metric MDS / two positive eigenvectors', stress: combined.stress, shapeStress: shape.stress,
    noveltyThreshold: threshold, calibration: '1.5 × 95th percentile of nonzero leave-one-out nearest distances, floor 0.15; synthetic controls only', weights: DEFAULT_WEIGHTS },
};
mkdirSync('src/data', { recursive: true });
writeFileSync(pri ? 'src/data/pri-atlas.json' : 'src/data/atlas.json', JSON.stringify(data));
mkdirSync('public/examples', { recursive: true });
const example = entries.find(e => e.id === 'control-reference')!;
writeFileSync(pri ? 'public/examples/complete-pri-cycle.json' : 'public/examples/complete-cycle.json', JSON.stringify({ name: 'Example local cycle', quantity: example.quantity || 'frequency', period: example.period, units: example.units, sampling: example.sampling, samples: example.samples }, null, 2));
console.log(`Generated ${entries.length} cycles. MDS stress ${combined.stress.toFixed(3)}; provisional novelty threshold ${threshold.toFixed(3)}.`);
