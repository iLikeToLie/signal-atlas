import { buildControls } from '../../scripts/generate-agility-controls.ts';
import { emptyLibrary, addRecording, storeRecording, windowView } from '../../src/agilityModel.ts';
import type { LibraryState, StoredRecording } from '../../src/agilityModel.ts';
const controls = buildControls();
export function controlView(index: number, id = `control-${index}`) {
  const r = controls.records[index];
  return windowView(r, { id, recordingId: r.id, startEvent: 0, endEvent: r.events.length, reviewState: 'unreviewed' });
}
export async function mapLibrary(indices = controls.records.map((_, i) => i)) {
  let state: LibraryState = emptyLibrary(); const originals: StoredRecording[] = [];
  for (const i of indices) {
    const r = controls.records[i], original = await storeRecording(r, JSON.stringify(r), `${r.id}.json`);
    state = addRecording(state, original, controls.streams.find(s => s.id === r.streamId)!);
    const w = state.windows.at(-1)!, oldId = w.id; w.id = `control-${i}`;
    state.views[w.id] = { ...state.views[oldId], windowId: w.id }; delete state.views[oldId]; originals.push(original);
  }
  return { state, originals };
}
