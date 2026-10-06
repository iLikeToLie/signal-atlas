// Classical computer vision baseline: soft overlap of standardized curve images.
// Images contain only the normalized trajectory, with no chart decoration.
export function curveImage(grid: number[], shift = 0, height = 32): Float32Array {
  const pixels = new Float32Array(grid.length * height);
  for (let x = 0; x < grid.length; x++) {
    const y = (.5 - grid[(x + shift) % grid.length]) * (height - 1);
    for (let row = 0; row < height; row++) pixels[x * height + row] = Math.exp(-.5 * ((row - y) / 1.5) ** 2);
  }
  return pixels;
}

export function imageSimilarity(a: Float32Array, b: Float32Array) {
  if (!a.length || a.length !== b.length) throw new Error('Curve images must have equal nonzero dimensions.');
  let intersection = 0, union = 0;
  for (let i = 0; i < a.length; i++) { intersection += Math.min(a[i], b[i]); union += Math.max(a[i], b[i]); }
  return union ? intersection / union : 1;
}
