import { runEvaluation } from './evaluation.ts';

self.onmessage = event => {
  try { self.postMessage({ report: runEvaluation(event.data.atlas, event.data.dataset, event.data.weights) }); }
  catch (error) { self.postMessage({ error: (error as Error).message }); }
};
