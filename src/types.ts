export type Family = 'sinusoidal' | 'triangular' | 'rounded' | 'rise-fall' | 'sweep-dwell' | 'harmonic' | 'shoulders' | 'blend' | 'unassigned';
export type Sample = { t: number; f: number };
export type Entry = {
  quantity?: 'frequency' | 'pri';
  id: string; name: string; family: Family; source: 'synthetic' | 'measured';
  period: number; excursion: number; centre: number;
  units: { time: string; frequency: string };
  centreConvention: 'midrange'; sampling: 'closed-endpoint' | 'uniform-open';
  samples: Sample[]; parameters: Record<string, number | string>;
  provenance: { generator: string; version: string; seed: number | null; file?: string };
};
export type Weights = { shape: number; period: number; excursion: number; centre: number };
export type Point = { x: number; y: number };
export type Region = { id: string; name: string; color: string; medoidId: string; count: number; summary: string; periodRange: [number, number]; excursionRange: [number, number] };
export type RegionSet = { regions: Region[]; membership: Record<string, string>; iterations: number; converged: boolean; objective: number };
export type AtlasData = {
  entries: Entry[]; positions: Record<string, Point>; shapePositions: Record<string, Point>;
  regionSet: RegionSet;
  metadata: { seed: number; method: string; stress: number; shapeStress: number; noveltyThreshold: number; calibration: string; weights: Weights };
};
