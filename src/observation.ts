import type { Entry, Sample } from './types.ts';

// Initial import guards, not evidence of sufficient sampling for every signal.
export const MIN_OBSERVED_POINTS = 8;
export const MAX_SPARSE_GAP_FRACTION = .2;

export function cycleGaps(samples: Sample[], period: number) {
  return samples.map((sample, i) => ({
    start: sample.t,
    end: i + 1 < samples.length ? samples[i + 1].t : period + samples[0].t,
  }));
}

export function observationSummary(entry: Entry) {
  const observedPoints = entry.samples.length - Number(entry.sampling === 'closed-endpoint');
  const largestGapFraction = Math.max(...cycleGaps(entry.samples, entry.period).map(g => (g.end - g.start) / entry.period));
  return { observedPoints, missingPoints: entry.missingTimes?.length || 0, largestGapFraction };
}
