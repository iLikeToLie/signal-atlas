import { suggestPeriods } from './recording.ts';
import type { Recording, GapModel } from './recording.ts';
self.onmessage = (event: MessageEvent<{ recording: Recording; model: GapModel }>) => {
  try { self.postMessage({ suggestions: suggestPeriods(event.data.recording, event.data.model) }); }
  catch (e) { self.postMessage({ error: (e as Error).message }); }
};
