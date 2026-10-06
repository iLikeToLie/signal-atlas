import { distanceMatrix, embed } from './layout.ts';
import type { Entry, Weights } from './types.ts';

self.onmessage = (event: MessageEvent<{ entries: Entry[]; weights: Weights }>) => {
  try {
    const { entries, weights } = event.data;
    const distances = distanceMatrix(entries, weights), result = embed(distances);
    const nearest = distances.map(row => Math.min(...row.filter(d => d > 1e-5))).filter(Number.isFinite).sort((a, b) => a - b);
    self.postMessage({ positions: Object.fromEntries(entries.map((e, i) => [e.id, result.points[i]])), stress: result.stress, threshold: Math.max(0.15, (nearest[Math.floor(nearest.length * 0.95)] || 0.1) * 1.5) });
  } catch (error) { self.postMessage({ error: String(error) }); }
};
