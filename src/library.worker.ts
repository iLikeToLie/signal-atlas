import { groupLibrary } from './library.ts';
import { layoutLibrary } from './displayLayout.ts';
self.onmessage = event => {
  try {
    const { entries, quantity, settings, review } = event.data;
    const grouping = groupLibrary(entries, quantity, settings, review);
    self.postMessage({ grouping, layout: layoutLibrary(grouping.regionSet) });
  } catch (e) { self.postMessage({ error: (e as Error).message }); }
};
