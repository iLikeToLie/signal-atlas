import { align, combineDistances, phaseGrid, neighbours, DEFAULT_WEIGHTS } from './signal.ts';
import type { Entry, Point, Weights } from './types.ts';

export function shapeMatrix(entries: Entry[]) {
  // Cache identical normalized grids across scale variants, to 1e-9 numerical precision.
  const signatures = new Map<string, number>(), unique: number[][] = [];
  const indices = entries.map(entry => {
    const grid = phaseGrid(entry), signature = grid.map(v => Math.round(v * 1e9)).join(',');
    if (!signatures.has(signature)) { signatures.set(signature, unique.length); unique.push(grid); }
    return signatures.get(signature)!;
  });
  const shapes = unique.map(() => unique.map(() => 0));
  for (let i = 0; i < unique.length; i++) for (let j = i + 1; j < unique.length; j++) shapes[i][j] = shapes[j][i] = align(unique[i], unique[j]).shape;
  return indices.map(i => indices.map(j => shapes[i][j]));
}

export function distanceMatrix(entries: Entry[], weights = DEFAULT_WEIGHTS, shapes = shapeMatrix(entries)) {
  const matrix = entries.map(() => entries.map(() => 0));
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) matrix[i][j] = matrix[j][i] = combineDistances(entries[i], entries[j], shapes[i][j], weights).distance;
  return matrix;
}

// Classical metric MDS. Fixed-seed power iteration, no family labels or random islands.
export function embed(distances: number[][], seed = 20261006) {
  const n = distances.length, d2 = distances.map(row => row.map(d => d * d));
  const means = d2.map(row => row.reduce((a, b) => a + b, 0) / n);
  const mean = means.reduce((a, b) => a + b, 0) / n;
  const b = d2.map((row, i) => row.map((d, j) => -0.5 * (d - means[i] - means[j] + mean)));
  const components: number[][] = [], eigenvalues: number[] = [];
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 2 ** 32 - 0.5; };
  // A diagonal shift makes the dominant algebraic (positive) eigenvalues dominant in magnitude.
  const bound = Math.max(...b.map(row => row.reduce((s, x) => s + Math.abs(x), 0)));
  for (let axis = 0; axis < 2; axis++) {
    let v = Array.from({ length: n }, random);
    for (let iteration = 0; iteration < 800; iteration++) {
      let next = b.map((row, i) => row.reduce((s, x, j) => s + x * v[j], 0) + bound * v[i]);
      const average = next.reduce((s, x) => s + x, 0) / n;
      next = next.map(x => x - average);
      for (const u of components) {
        const projection = next.reduce((s, x, i) => s + x * u[i], 0);
        next = next.map((x, i) => x - projection * u[i]);
      }
      const length = Math.hypot(...next) || 1;
      next = next.map(x => x / length);
      const change = Math.hypot(...next.map((x, i) => x - v[i]));
      v = next;
      if (change < 1e-11) break;
    }
    const eigenvalue = v.reduce((s, x, i) => s + x * b[i].reduce((sum, y, j) => sum + y * v[j], 0), 0);
    const pivot = v.reduce((best, x, i) => Math.abs(x) > Math.abs(v[best]) ? i : best, 0);
    if (v[pivot] < 0) v = v.map(x => -x);
    components.push(v); eigenvalues.push(Math.max(0, eigenvalue));
  }
  const points = Array.from({ length: n }, (_, i) => ({ x: components[0][i] * Math.sqrt(eigenvalues[0]), y: components[1][i] * Math.sqrt(eigenvalues[1]) }));
  let error = 0, total = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { error += (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) - distances[i][j]) ** 2; total += distances[i][j] ** 2; }
  return { points, stress: Math.sqrt(error / (total || 1)) };
}

export function placeImport(entry: Entry, reference: Entry[], positions: Record<string, Point>, weights: Weights) {
  const nearest = neighbours(entry, reference, weights).slice(0, 5);
  if (!nearest.length) return null;
  if (nearest[0].distance < 1e-8) return positions[nearest[0].entry.id];
  let x = 0, y = 0, total = 0;
  for (const neighbour of nearest) {
    const weight = 1 / Math.max(1e-6, neighbour.distance) ** 2;
    x += positions[neighbour.entry.id].x * weight; y += positions[neighbour.entry.id].y * weight; total += weight;
  }
  return { x: x / total, y: y / total };
}
