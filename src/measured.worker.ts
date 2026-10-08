import { measuredView } from './measured.ts';
self.onmessage = event => {
  try { const { entries, quantity, settings, review, weights } = event.data; self.postMessage({ view: measuredView(entries, quantity, settings, review, weights) }); }
  catch (e) { self.postMessage({ error: (e as Error).message }); }
};
