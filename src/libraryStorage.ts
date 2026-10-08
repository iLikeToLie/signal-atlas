import { emptyAtlas } from './measured.ts';
import { newReviewWorkspace, validateReview, MAX_REVIEW_HISTORY } from './groupReviewStorage.ts';
import type { QuantityReviews } from './groupReviewStorage.ts';

export const LIBRARY_REVIEW_KEY = 'frequency-agile-atlas.library-review.v1';
export const newLibraryReviewWorkspace = (quantity: 'frequency' | 'pri') => {
  const workspace = newReviewWorkspace(emptyAtlas(quantity));
  return { ...workspace, referenceSignature: `${workspace.referenceSignature}:library:${quantity}` };
};
export function loadLibraryReviews(legacy: QuantityReviews): { reviews: QuantityReviews; error: string } {
  const defaults = { frequency: newLibraryReviewWorkspace('frequency'), pri: newLibraryReviewWorkspace('pri') };
  try {
    const text = localStorage.getItem(LIBRARY_REVIEW_KEY);
    if (!text) {
      // Carry forward explicit local decisions, retaining old storage for recovery.
      for (const q of ['frequency', 'pri'] as const) defaults[q] = { ...defaults[q], current: validateReview(legacy[q].current), history: legacy[q].history.map(validateReview) };
      return { reviews: defaults, error: '' };
    }
    const saved = JSON.parse(text);
    if (saved.version !== 1) throw new Error('Unsupported library review version.');
    for (const q of ['frequency', 'pri'] as const) {
      const workspace = saved[q];
      if (!workspace || workspace.referenceSignature !== defaults[q].referenceSignature || !Array.isArray(workspace.history) || workspace.history.length > MAX_REVIEW_HISTORY) throw new Error('Invalid library review history.');
      defaults[q] = { ...workspace, current: validateReview(workspace.current), history: workspace.history.map(validateReview) };
    }
    return { reviews: defaults, error: '' };
  } catch (e) {
    return { reviews: { frequency: newLibraryReviewWorkspace('frequency'), pri: newLibraryReviewWorkspace('pri') }, error: `Saved library decisions could not be read: ${(e as Error).message} Saved storage was left untouched.` };
  }
}
