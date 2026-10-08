import { compare, phaseGrid } from './signal.ts';
import type { Entry, Weights } from './types.ts';

let catalogues: Record<string, Entry[]> = {};
const grids = new WeakMap<Entry, number[]>();
const grid = (entry: Entry) => { if (!grids.has(entry)) grids.set(entry, phaseGrid(entry)); return grids.get(entry)!; };
self.onmessage = event => {
  if (event.data.type === 'init') { catalogues = event.data.catalogues; return; }
  const { id, quantity, selectedId, local, weights } = event.data as { id: number; quantity: string; selectedId: string; local: Entry[]; weights: Weights };
  try {
    const entries = [...catalogues[quantity], ...local], selected = entries.find(e => e.id === selectedId)!;
    const queryGrid = grid(selected);
    const rows = entries.filter(e => e.id !== selected.id).map(entry => ({ entry, ...compare(selected, entry, weights, queryGrid, grid(entry)) }))
      .filter(row => Number.isFinite(row.distance)).sort((a, b) => a.distance - b.distance || a.entry.id.localeCompare(b.entry.id)).slice(0, 5);
    self.postMessage({ id, rows });
  } catch (error) { self.postMessage({ id, error: (error as Error).message }); }
};
