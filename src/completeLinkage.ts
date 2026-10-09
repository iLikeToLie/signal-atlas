export const COHESION_EPSILON = 1e-12;
export type ClusterSeed = { members: number[]; reviewId?: string };
type Edge = { a: number; b: number; av: number; bv: number; similarity: number };

// Agglomerate the strongest remaining complete-link pair. Similarity of a
// merged cluster to another is the minimum of the two previous similarities.
// The heap makes this O(n² log n), rather than rescanning every pair per merge.
// IDs are sorted by the caller and break exact ties; arrival order has no role.
export function completeLinkage(similarities: Float64Array[], threshold: number, seeds: ClusterSeed[] = similarities.map((_, i) => ({ members: [i] }))) {
  const clusters = seeds.map(s => ({ ...s, members: [...s.members].sort((a, b) => a - b) })).sort((a, b) => a.members[0] - b.members[0]);
  const active = clusters.map(() => true), versions = clusters.map(() => 0);
  const distances = clusters.map(() => new Float64Array(clusters.length));
  const heap: Edge[] = [];
  const better = (a: Edge, b: Edge) => a.similarity !== b.similarity ? a.similarity > b.similarity : a.a !== b.a ? a.a < b.a : a.b < b.b;
  const push = (edge: Edge) => {
    let i = heap.length; heap.push(edge);
    while (i > 0) { const parent = (i - 1) >> 1; if (!better(edge, heap[parent])) break; heap[i] = heap[parent]; i = parent; }
    heap[i] = edge;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (2 * i + 1 < heap.length) {
        let child = 2 * i + 1;
        if (child + 1 < heap.length && better(heap[child + 1], heap[child])) child++;
        if (!better(heap[child], last)) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  const offer = (a: number, b: number) => {
    if (clusters[a].reviewId && clusters[b].reviewId && clusters[a].reviewId !== clusters[b].reviewId) return;
    const similarity = distances[a][b];
    if (similarity + COHESION_EPSILON >= threshold) push({ a, b, av: versions[a], bv: versions[b], similarity });
  };
  for (let a = 0; a < clusters.length; a++) for (let b = a + 1; b < clusters.length; b++) {
    let similarity = 1;
    for (const i of clusters[a].members) for (const j of clusters[b].members) similarity = Math.min(similarity, similarities[i][j]);
    distances[a][b] = distances[b][a] = similarity; offer(a, b);
  }
  let merges = 0;
  while (heap.length) {
    const edge = pop(), { a, b } = edge;
    if (!active[a] || !active[b] || versions[a] !== edge.av || versions[b] !== edge.bv) continue;
    active[b] = false; versions[a]++; versions[b]++; merges++;
    clusters[a].members = [...clusters[a].members, ...clusters[b].members].sort((i, j) => i - j);
    clusters[a].reviewId ||= clusters[b].reviewId;
    for (let c = 0; c < clusters.length; c++) if (active[c] && c !== a) {
      distances[a][c] = distances[c][a] = Math.min(distances[a][c], distances[b][c]);
      offer(Math.min(a, c), Math.max(a, c));
    }
  }
  return { clusters: clusters.filter((_, i) => active[i]), merges };
}
