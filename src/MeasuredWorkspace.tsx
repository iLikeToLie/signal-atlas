import { useEffect, useMemo, useState } from 'react';
import { version } from '../package.json';
import type { Entry } from './types.ts';
import { DEFAULT_WEIGHTS, neighbours, SHAPE_WEIGHTS } from './signal.ts';
import { emptyAtlas, loadMeasuredState, MEASURED_KEY, measuredView, sameWindow, validateMeasuredState } from './measured.ts';
import type { MeasuredState, MeasuredView } from './measured.ts';
import { approveSplit, moveMember, reviewToken } from './groupPolicy.ts';
import type { GroupReview } from './groupPolicy.ts';
import { newReviewWorkspace, recordReview, undoReview } from './groupReviewStorage.ts';
import { RecordingPanel } from './RecordingPanel.tsx';
import { GroupReviewPanel } from './GroupReviewPanel.tsx';
import { AssignmentDetails, GroupingPanel } from './GroupingPanel.tsx';
import { Atlas } from './Atlas.tsx';
import { MiniPlot, Plot } from './Plot.tsx';
import { downloadEntry } from './importExport.ts';
import { DEFAULT_GROUPING } from './grouping.ts';

function downloadJSON(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const emptyViews = { frequency: measuredView([], 'frequency', DEFAULT_GROUPING, newReviewWorkspace(emptyAtlas('frequency')).current, SHAPE_WEIGHTS), pri: measuredView([], 'pri', DEFAULT_GROUPING, newReviewWorkspace(emptyAtlas('pri')).current, SHAPE_WEIGHTS) };

export function MeasuredWorkspace({ onReference }: { onReference: () => void }) {
  const [loaded] = useState(loadMeasuredState), [state, setState] = useState(loaded.state), [notice, setNotice] = useState(loaded.error);
  const [quantity, setQuantity] = useState<'frequency' | 'pri'>('frequency'), [shapeOnly, setShapeOnly] = useState(true), [grid, setGrid] = useState(false), [selectedId, setSelectedId] = useState(''), [drawer, setDrawer] = useState(false), [playing, setPlaying] = useState(true);
  const [undoRemoval, setUndoRemoval] = useState<MeasuredState | null>(null), [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ view: MeasuredView; entries: Entry[]; quantity: 'frequency' | 'pri' }>({ view: emptyViews.frequency, entries: [], quantity: 'frequency' });
  const cycles = useMemo(() => state.cycles.filter(e => e.quantity === quantity), [state.cycles, quantity]);
  const weights = shapeOnly ? SHAPE_WEIGHTS : DEFAULT_WEIGHTS;
  useEffect(() => {
    setPending(true);
    const worker = new Worker(new URL('./measured.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = event => { setPending(false); if (event.data.error) setNotice(event.data.error); else setResult({ view: event.data.view, entries: cycles, quantity }); };
    worker.onerror = () => { setPending(false); setNotice('Grouping or map computation failed. Your recordings remain saved.'); };
    worker.postMessage({ entries: cycles, quantity, settings: state.settings[quantity], review: state.reviews[quantity].current, weights });
    return () => worker.terminate();
  }, [cycles, quantity, state.settings, state.reviews, weights]);
  const view = result.quantity === quantity ? result.view : emptyViews[quantity], entries = result.quantity === quantity ? result.entries : [];
  const selected = entries.find(e => e.id === selectedId) || entries[0];
  const nearest = useMemo(() => selected ? neighbours(selected, entries, weights).slice(0, 5) : [], [selected, entries, weights]);
  const blocked = !!loaded.error;
  const commit = (next: MeasuredState) => {
    if (blocked) throw new Error('Saved workspace needs recovery. Existing storage has been left untouched.');
    const validated = validateMeasuredState(next);
    try { localStorage.setItem(MEASURED_KEY, JSON.stringify(validated)); }
    catch { throw new Error('Browser storage is unavailable or full. Export your workspace and free space before saving. No changes were applied.'); }
    setState(validated); setUndoRemoval(null);
  };
  const attempt = (action: () => void) => { try { action(); } catch (e) { setNotice((e as Error).message); } };
  const decide = (next: GroupReview) => attempt(() => { commit({ ...state, reviews: { ...state.reviews, [quantity]: recordReview(state.reviews[quantity], next) } }); setNotice('Group decision saved. You can undo it in Group health & review.'); });
  const select = (id: string) => { setSelectedId(id); setDrawer(true); };
  const removeRecording = (id: string) => {
    const previous = state, source = state.recordings.find(r => r.id === id)!;
    commit({ ...state, recordings: state.recordings.filter(r => r.id !== id), cycles: state.cycles.filter(e => e.provenance.recordingId !== id), reviews: { ...state.reviews, [source.quantity]: newReviewWorkspace(emptyAtlas(source.quantity)) } });
    setUndoRemoval(previous); setNotice('Recording and its cycles removed. Group decisions for this quantity were reset; undo restores them.');
  };
  return <>
    <a className="skip-link" href="#measured-main">Skip to measured workspace</a>
    <header className="site-header"><a className="brand" href="#measured-main">Signal Atlas<span className="brand-sub">MEASURED WORKSPACE</span></a><div className="grouping-actions"><button onClick={() => attempt(() => downloadJSON(blocked ? localStorage.getItem(MEASURED_KEY) || '' : state, 'signal-atlas-measured-workspace.json'))}>{blocked ? 'Export saved data for recovery' : 'Export workspace'}</button><button onClick={onReference}>Open synthetic demo atlas</button></div></header>
    <main id="measured-main">
      <section className="intro"><div><span className="eyebrow">UNLABELLED RECORDINGS → REVIEWED CYCLES → DISCOVERED GROUPS</span><h1>Discover signals from observations.</h1><p>Start with timestamp/value data. Review repetition, approve usable windows, and grow groups around stable observed anchors.</p></div><div className="catalogue-stamp"><strong>{state.cycles.length}</strong><span>OBSERVED<br />CYCLES</span><span className="version">v{version} · saved locally</span></div></section>
      {!!notice && <div className="notice" role="status"><span>{notice}</span>{undoRemoval && <button onClick={() => attempt(() => { commit(undoRemoval); setNotice('Recording, cycles and group decisions restored.'); })}>Undo removal</button>}{!blocked && <button aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button>}</div>}
      <div className="measured-quantity"><div className="segmented"><button aria-pressed={quantity === 'frequency'} className={quantity === 'frequency' ? 'active' : ''} onClick={() => setQuantity('frequency')}>Frequency</button><button aria-pressed={quantity === 'pri'} className={quantity === 'pri' ? 'active' : ''} onClick={() => setQuantity('pri')}>Pulse interval (PRI)</button></div><span>Frequency and PRI form separate groups.</span></div>
      <RecordingPanel recordings={state.recordings} cycles={state.cycles} quantity={quantity} disabled={blocked} onAdd={recording => {
        if (state.recordings.length >= 10) throw new Error('The workspace supports 10 recordings. Export and remove a source before importing another.');
        commit({ ...state, recordings: [...state.recordings, recording] }); setQuantity(recording.quantity); setNotice('Original recording saved. Choose a suggested or manual period, then preview its windows.');
      }} onExtract={extracted => {
        if (state.cycles.length + extracted.length > 100) throw new Error('The workspace supports 100 extracted cycles. Export and remove a recording before adding more.');
        if (extracted.some(e => state.cycles.some(other => sameWindow(e, other)))) throw new Error('A selected window is already saved. Change the start/count; changing its gap model cannot add a duplicate.');
        commit({ ...state, cycles: [...state.cycles, ...extracted] }); select(extracted[0].id); setNotice(`${extracted.length} cycles approved. Grouping uses observed cycles only; there are no catalogue seeds.`);
      }} onExport={r => downloadJSON(r, `${r.id}.json`)} onRemove={removeRecording} />
      <section className="measured-explorer" aria-label="Measured signal groups"><h2>3 · Explore discovered groups</h2>
        <GroupingPanel key={quantity} settings={state.settings[quantity]} onApply={settings => attempt(() => { commit({ ...state, settings: { ...state.settings, [quantity]: settings } }); setNotice('Grouping settings saved; assignments are replayed in extraction order.'); })} demoActive={false} controls={[]} inserted={0} assignments={view.grouping.assignments} regionSet={view.grouping.regionSet} onStart={() => {}} onNext={() => {}} onReset={() => {}} onExit={() => {}} hideControlDemo />
        <GroupReviewPanel grouping={view.grouping} entries={entries} disabled={blocked || pending} undoCount={state.reviews[quantity].history.length} onSelect={select} onAcknowledge={id => decide({ ...state.reviews[quantity].current, acknowledged: [...state.reviews[quantity].current.acknowledged, reviewToken(id, view.grouping.assignments[id].regionId, state.settings[quantity])] })} onMove={(id, target) => decide(moveMember(state.reviews[quantity].current, id, view.grouping.regionSet, target))} onSplit={proposal => decide(approveSplit(state.reviews[quantity].current, proposal, view.grouping.regionSet.regions.find(r => r.id === proposal.regionId)!.name, view.grouping.regionSet.regions.find(r => r.id === proposal.regionId)!.medoidId, view.grouping.regionSet))} onUndo={() => attempt(() => commit({ ...state, reviews: { ...state.reviews, [quantity]: undoReview(state.reviews[quantity]) } }))} />
        {!cycles.length ? <div className="measured-empty"><h3>An empty map, ready for your signals.</h3><p>Import a recording and approve its cycles to form the first group. Unresolved recordings stay above. Try the group review demo to see how a growing group can propose a split.</p></div> : <div className="measured-map-workspace">
          <div className="explorer"><div className="explorer-toolbar"><div className="segmented"><button className={!grid ? 'active' : ''} onClick={() => setGrid(false)}>Map</button><button className={grid ? 'active' : ''} onClick={() => setGrid(true)}>Grid</button></div><div className="segmented"><button className={shapeOnly ? 'active' : ''} onClick={() => setShapeOnly(true)}>Shape only</button><button className={!shapeOnly ? 'active' : ''} onClick={() => setShapeOnly(false)}>Shape + scale</button></div></div>
            {pending && <p role="status" className="measured-pending">Updating groups and similarity projection…</p>}
            {grid ? <div className="pattern-grid">{entries.map(e => <button className="pattern-card" key={e.id} onClick={() => select(e.id)}><MiniPlot entry={e} /><strong>{e.name}</strong><small>{view.grouping.regionSet.regions.find(r => r.id === view.grouping.assignments[e.id].regionId)?.name}</small></button>)}</div> : <Atlas entries={entries} positions={view.positions} regionPositions={view.regionLayout.points} regionLayout={view.regionLayout} focusedRegion="all" onExploreRegion={id => select(view.grouping.regionSet.regions.find(r => r.id === id)!.medoidId)} selectedId={selected?.id || ''} onSelect={select} onGrid={() => setGrid(true)} pending={pending} animate={false} autoFit />}
            <p className="measured-map-note">Projection uses approved observations only · {view.grouping.regionSet.regions.length} groups · projection stress {view.stress.toFixed(3)}. {view.components > 1 && 'Incompatible physical/arbitrary unit sets are shown separately; distances between those sets have no meaning.'}</p>
          </div>
          {selected && <aside className={`inspector ${drawer ? 'drawer-open' : ''}`} aria-label="Measured signal inspector"><button className="drawer-close" aria-label="Close signal inspector" onClick={() => setDrawer(false)}>×</button><span className="eyebrow">OBSERVED CYCLE</span><h2>{selected.name}</h2><Plot entries={[selected]} cycles={3} pulse={{ playing, speed: 1 }} /><button onClick={() => setPlaying(p => !p)}>{playing ? 'Pause sweep' : 'Play sweep'}</button><p>Source window {selected.provenance.windowStart}–{selected.provenance.windowEnd} {selected.units.time} · period {Number(selected.period.toPrecision(6))} · {selected.interpolation} reconstruction.</p><p>{selected.provenance.captureId ? `Capture ID: ${selected.provenance.captureId}` : 'Capture ID not supplied; independent support is unknown.'}</p><AssignmentDetails assignment={view.grouping.assignments[selected.id]} regionSet={view.grouping.regionSet} measured onMove={blocked || pending ? undefined : (id, target) => decide(moveMember(state.reviews[quantity].current, id, view.grouping.regionSet, target))} /><button onClick={() => downloadEntry(selected, 'json')}>Export cycle JSON</button><h3>Closest observed cycles</h3>{nearest.map(n => <button className="measured-neighbour" key={n.entry.id} onClick={() => select(n.entry.id)}><MiniPlot entry={n.entry} /><span>{n.entry.name}</span></button>)}</aside>}
        </div>}
      </section>
      <p className="measured-storage-note">Browser-local workspace · 10 recordings / 100 approved cycles · export a backup before clearing browser data. Synthetic examples and labelled evaluation are available in the separate demo atlas.</p>
    </main>
  </>;
}
