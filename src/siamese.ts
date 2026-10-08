import model from './data/siamese-model.json' with { type: 'json' };
import { curveImage } from './vision.ts';

export const SIAMESE_MODEL = model;
const weights = Object.fromEntries(Object.entries(model.weights).map(([key, values]) => [key, new Float32Array(values)]));

// Exact forward pass of the small exported network: circular horizontal padding,
// zero vertical padding, ReLU, width mean, projection and L2 normalization.
function convolution(input: Float32Array, channels: number, height: number, width: number, outChannels: number, kernelWidth: number, stepX: number, name: string) {
  const nextHeight = height / 2, nextWidth = width / stepX;
  const output = new Float32Array(outChannels * nextHeight * nextWidth);
  const kernel = weights[`${name}.weight`], bias = weights[`${name}.bias`];
  for (let c = 0; c < outChannels; c++) for (let y = 0; y < nextHeight; y++) for (let x = 0; x < nextWidth; x++) {
    let value = bias[c];
    for (let i = 0; i < channels; i++) for (let ky = 0; ky < 3; ky++) {
      const row = y * 2 + ky - 1;
      if (row < 0 || row >= height) continue;
      for (let kx = 0; kx < kernelWidth; kx++) {
        const column = (x * stepX + kx - Math.floor(kernelWidth / 2) + width) % width;
        value += input[(i * height + row) * width + column] * kernel[((c * channels + i) * 3 + ky) * kernelWidth + kx];
      }
    }
    output[(c * nextHeight + y) * nextWidth + x] = Math.max(0, value);
  }
  return output;
}

export function curveEmbedding(grid: number[]) {
  if (grid.length !== 128 || grid.some(v => !Number.isFinite(v))) throw new Error('Siamese encoder requires 128 finite normalized phases.');
  const pixels = curveImage(grid), input = new Float32Array(32 * 128);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 128; x++) input[y * 128 + x] = pixels[x * 32 + y];
  const first = convolution(input, 1, 32, 128, 4, 9, 4, 'conv1');
  const second = convolution(first, 4, 16, 32, 8, 5, 2, 'conv2');
  const pooled = new Float32Array(64);
  for (let i = 0; i < 64; i++) { let sum = 0; for (let x = 0; x < 16; x++) sum += second[i * 16 + x]; pooled[i] = sum / 16; }
  const vector = new Float32Array(16), projection = weights['projection.weight'], bias = weights['projection.bias'];
  for (let i = 0; i < 16; i++) { let sum = bias[i]; for (let j = 0; j < 64; j++) sum += projection[i * 64 + j] * pooled[j]; vector[i] = sum; }
  const norm = Math.max(1e-12, Math.hypot(...vector));
  for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  return vector;
}

export function embeddingSimilarity(a: Float32Array, b: Float32Array) {
  if (a.length !== 16 || b.length !== 16 || [...a, ...b].some(v => !Number.isFinite(v))) throw new Error('Siamese comparison requires finite 16-dimensional embeddings.');
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, (dot + 1) / 2));
}
