import type { Entry, Family, RegionSet } from './types.ts';

const colors = ['#91b6a5', '#86c9b2', '#c69ae0', '#e68583', '#8ebce1', '#d6cb79', '#e3a5c0', '#6bc5cc', '#b9ce9a', '#b9a1ee', '#d5b49a', '#e3aa71'];
const names: Record<Family, string[]> = {
  sinusoidal: ['Velvet Tide', 'Moonwater', 'Silken Orbit', 'Dawn Current', 'Silver Lagoon', 'Aurora Reach', 'Crescent Cove', 'Tidal Bloom', 'Horizon Drift', 'Solstice Bay', 'Quiet Meridian', 'Nightfall Basin'],
  triangular: ['Glass Kite', 'Switchback Ridge', 'Copper Steps'],
  rounded: ['Petal Loop', 'Cloudline', 'Soft Summit'],
  'rise-fall': ['Comet Tail', 'Crescent Run', 'Slingshot Bay'],
  'sweep-dwell': ['Lantern Harbour', 'Held Horizon', 'Stillwater Steps'],
  harmonic: ['Echo Garden', 'Braided Current', 'Ripple Crown', 'Twinwake', 'Resonance Reef', 'Knotwork Quay', 'Chorus Field', 'Prism Delta', 'Spiral Orchard', 'Lattice Bay', 'Interlace Grove', 'Starling Fold'],
  shoulders: ['Amber Mesa', 'Velvet Shelf', 'Terrace Drift'],
  blend: ['Orbit Loom', 'Knot Garden', 'Driftweave'],
  unassigned: ['Local Observatory'],
};
const forms: Record<Family, string> = {
  sinusoidal: 'a smooth rising and falling wave', triangular: 'an angular sweep and return', rounded: 'a sweep with softened corners',
  'rise-fall': 'an unequal rise and return', 'sweep-dwell': 'a sweep separated by frequency dwells', harmonic: 'a loop with interacting lobes',
  shoulders: 'a loop with shelves and shoulders', blend: 'a blend of sweep and lobe shapes', unassigned: 'a local observation',
};

// Deterministic alternating k-medoids on a supplied signal distance, never on screen coordinates.
export function groupRegions(entries: Entry[], distances: number[][], count = 12): RegionSet {
  if (!entries.length || !Number.isInteger(count) || count < 1 || distances.length !== entries.length || distances.some(row => row.length !== entries.length || row.some(d => !Number.isFinite(d) || d < 0))) throw new Error('Regions require a finite distance matrix and a positive group count.');
  const order = entries.map((_, i) => i).sort((a, b) => entries[a].id.localeCompare(entries[b].id));
  const smallest = (candidates: number[], cost: (i: number) => number) => {
    let best = candidates[0], value = cost(best);
    for (const i of candidates.slice(1)) { const next = cost(i); if (next < value - 1e-10) { best = i; value = next; } }
    return best;
  };
  let medoids = [smallest(order, i => order.reduce((sum, j) => sum + distances[i][j], 0))];
  while (medoids.length < Math.min(count, entries.length)) {
    let next = order[0], farthest = -1;
    for (const i of order) { const distance = Math.min(...medoids.map(m => distances[i][m])); if (distance > farthest + 1e-10) { next = i; farthest = distance; } }
    if (farthest < 1e-9) break;
    medoids.push(next);
  }
  const assign = () => order.map(i => ({ i, medoid: smallest(medoids, m => distances[i][m]) }));
  let iterations = 0, converged = false;
  // ponytail: dense matrices and 30 local refinement rounds fit 1,000 entries; use sampled medoids for much larger catalogues.
  for (; iterations < 30; iterations++) {
    medoids.sort((a, b) => entries[a].id.localeCompare(entries[b].id));
    const assigned = assign();
    const next = medoids.map(m => {
      const members = assigned.filter(a => a.medoid === m).map(a => a.i);
      return members.length ? smallest(members, i => members.reduce((sum, j) => sum + distances[i][j], 0)) : m;
    });
    if (next.every((m, i) => m === medoids[i])) { converged = true; iterations++; break; }
    medoids = next;
  }
  medoids.sort((a, b) => entries[a].id.localeCompare(entries[b].id));
  const assigned = assign(), usedNames = new Set<string>();
  const regions = medoids.filter(m => assigned.some(a => a.medoid === m)).map((m, index) => {
    const entry = entries[m], members = assigned.filter(a => a.medoid === m).map(a => entries[a.i]);
    // Editorial names follow the representative's form; family labels never enter clustering.
    const name = [...names[entry.family], ...Object.values(names).flat()].find(n => !usedNames.has(n))!;
    usedNames.add(name);
    return { id: `region-${entry.id}`, name, color: colors[index % colors.length], medoidId: entry.id, count: members.length,
      summary: `Centred on ${forms[entry.family]}.`,
      periodRange: [Math.min(...members.map(e => e.period)), Math.max(...members.map(e => e.period))] as [number, number],
      excursionRange: [Math.min(...members.map(e => e.excursion)), Math.max(...members.map(e => e.excursion))] as [number, number],
    };
  });
  return { regions, membership: Object.fromEntries(assigned.map(a => [entries[a.i].id, `region-${entries[a.medoid].id}`])), iterations, converged,
    objective: assigned.reduce((sum, a) => sum + distances[a.i][a.medoid], 0) };
}
