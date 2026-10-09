import { version } from '../package.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasData, Entry, Family, Weights } from './types.ts';
import { families, familyInfo } from './catalogue.ts';
import { compare, DEFAULT_WEIGHTS, SHAPE_WEIGHTS, supportedTimeUnits, supportedFrequencyUnits } from './signal.ts';

import { layoutLibrary } from './displayLayout.ts';
import { groupLibrary, approveMerge, librarySettings } from './library.ts';
import type { MergeProposal } from './library.ts';
import { loadLibraryReviews, LIBRARY_REVIEW_KEY } from './libraryStorage.ts';
import { emptyAtlas, loadMeasuredState } from './measured.ts';
import { DEFAULT_GROUPING, validateGroupingForAtlas } from './grouping.ts';
import { loadGroupingSettings, QUANTITY_GROUPING_KEY } from './groupingStorage.ts';
import { EvaluationPanel } from './EvaluationPanel.tsx';
import type { GroupingSettings } from './grouping.ts';
import { AssignmentDetails, GroupingPanel } from './GroupingPanel.tsx';
import { GroupReviewPanel } from './GroupReviewPanel.tsx';
import { approveSplit, emptyReview, moveMember, reviewToken } from './groupPolicy.ts';
import type { GroupReview, SplitProposal } from './groupPolicy.ts';
import { loadGroupReviews, recordReview, undoReview } from './groupReviewStorage.ts';
import { downloadEntry, loadImports, parseImport, STORAGE_KEY } from './importExport.ts';
import { MAX_SPARSE_GAP_FRACTION, MIN_OBSERVED_POINTS, observationSummary } from './observation.ts';
import { Atlas } from './Atlas.tsx';
import { MiniPlot, Plot } from './Plot.tsx';
import { useNeighbours } from './useNeighbours.ts';
import { VisionExample } from './VisionExample.tsx';
import { MeasuredWorkspace } from './MeasuredWorkspace.tsx';
import atlasUrl from './data/atlas.json?url';
import priAtlasUrl from './data/pri-atlas.json?url';

type Page = 'atlas' | 'families' | 'compare' | 'method';
function route() {
  const [path, query] = location.hash.slice(1).split('?');
  return { page: (['atlas', 'families', 'compare', 'method'].includes(path?.replace('/', '')) ? path.replace('/', '') : 'atlas') as Page, id: new URLSearchParams(query).get('id') || 'harmonic-05' };
}
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmt = (n: number) => Number(n.toPrecision(4)).toString();
const EMPTY_ENTRIES: Entry[] = [];

function ImportDialog({ onClose, onImport, initialQuantity }: { onClose: () => void; onImport: (entry: Entry) => void; initialQuantity: 'frequency' | 'pri' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(''), [filename, setFilename] = useState('trace.csv');
  const [period, setPeriod] = useState(''), [timeUnit, setTimeUnit] = useState(''), [frequencyUnit, setFrequencyUnit] = useState(''), [sampling, setSampling] = useState('');
  const [interpolation, setInterpolation] = useState(''), [prepared, setPrepared] = useState<Entry | null>(null);
  const [error, setError] = useState(''), [reading, setReading] = useState(false);
  const [quantity, setQuantity] = useState(initialQuantity);
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => { setPrepared(null); }, [text, filename, quantity, period, timeUnit, frequencyUnit, sampling, interpolation]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      if (!prepared) { setPrepared(parseImport(text, filename, { quantity, period, timeUnit, frequencyUnit, sampling, interpolation })); return; }
      onImport(prepared); onClose();
    }
    catch (e) { setError((e as Error).message); }
  };
  return <dialog ref={ref} className="import-dialog" onCancel={onClose} aria-labelledby="import-heading">
    <div className="dialog-top"><span className="eyebrow">LOCAL WORKSPACE</span><button onClick={onClose} aria-label="Close import">×</button></div>
    <h2 id="import-heading">Import a cycle</h2><p>One complete repeating frequency or positive PRI trajectory, including jumps or missing observations. Supply its period; a nonperiodic recording needs a different workflow. Matching happens on this device.</p>
    <form onSubmit={submit}>
      <label className="field-label">CSV value type <select aria-label="CSV value type" value={quantity} onChange={e => { setQuantity(e.target.value as 'frequency' | 'pri'); setFrequencyUnit(''); }}><option value="frequency">Frequency</option><option value="pri">Pulse interval (PRI)</option></select></label>
      <label className="file-drop">Choose CSV or JSON<span>Up to 2 MB · 8–8193 samples</span><input aria-label="Choose cycle file" type="file" accept=".csv,.json,text/csv,application/json" onChange={async event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 2_000_000) { setError('File exceeds the 2 MB local import limit.'); return; }
        setReading(true); setError('');
        try { setText(await file.text()); setFilename(file.name); } catch { setError('Could not read this file. Try pasting its contents.'); }
        finally { setReading(false); }
      }} /></label>
      <label className="field-label">Or paste a complete cycle<textarea aria-label="Cycle data" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={'# period: 1\n# time_unit: tu\n# frequency_unit: fu\n# sampling: closed-endpoint\nt,f\n…'} spellCheck={false} /></label>
      <details className="import-options"><summary>CSV metadata overrides</summary><p>Leave blank to use file metadata. JSON requires metadata inside the object.</p><div className="form-grid">
        <label>Period<input aria-label="Import period" type="number" min="0" step="any" value={period} onChange={e => setPeriod(e.target.value)} placeholder="From file" /></label>
        <label>Time unit<select aria-label="Import time unit" value={timeUnit} onChange={e => setTimeUnit(e.target.value)}><option value="">From file</option>{supportedTimeUnits.map(u => <option key={u}>{u}</option>)}</select></label>
        <label>{quantity === 'pri' ? 'PRI unit' : 'Frequency unit'}<select aria-label={quantity === 'pri' ? 'Import PRI unit' : 'Import frequency unit'} value={frequencyUnit} onChange={e => setFrequencyUnit(e.target.value)}><option value="">From file</option>{(quantity === 'pri' ? supportedTimeUnits : supportedFrequencyUnits).map(u => <option key={u}>{u}</option>)}</select></label>
        <label>Sampling convention<select aria-label="Import endpoint convention" value={sampling} onChange={e => setSampling(e.target.value)}><option value="">From file</option><option value="closed-endpoint">Closed endpoint</option><option value="uniform-open">Uniform open</option><option value="sparse-periodic">Sparse periodic · fill cyclic gaps</option></select></label>
        <label>Between observed points<select aria-label="Import interpolation" value={interpolation} onChange={e => setInterpolation(e.target.value)}><option value="">From file (legacy default: linear)</option><option value="linear">Linear interpolation</option><option value="hold">Step / hold previous value</option></select></label>
      </div></details>
      <p className="small-note">Closed endpoint verifies f(0) = f(T). Uniform open uses evenly spaced points. Sparse periodic needs an explicit linear or step/hold model, at least {MIN_OBSERVED_POINTS} observed points, and no gap over {MAX_SPARSE_GAP_FRACTION * 100}% of the cycle, including its wrap. Blank/null values are missing only in sparse mode. Hold preserves jumps; it does not recover unseen hops.</p>
      {prepared && <section className="import-preview" aria-label="Cycle import preview"><h3>Preview before saving</h3><Plot entries={[prepared]} cycles={1} /><p>{observationSummary(prepared).observedPoints} observed points · {observationSummary(prepared).missingPoints} explicit missing rows · largest interval {percent(observationSummary(prepared).largestGapFraction)} of T.</p><p>Model: {prepared.interpolation === 'hold' ? 'step / hold previous value' : 'linear interpolation'}. {prepared.sampling === 'sparse-periodic' ? 'The cycle and gap filling, including the wrap, are assumptions you approve when saving. Original observations and missing timestamps are retained; scores include reconstructed spans.' : 'Original samples are retained.'} These point/gap limits do not establish measured-data accuracy.</p></section>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="dialog-actions"><a href={`${import.meta.env.BASE_URL}examples/${quantity === 'pri' ? 'complete-pri-cycle' : 'complete-cycle'}.json`} download>Complete example ↗</a><a href={`${import.meta.env.BASE_URL}examples/sparse-${quantity}-cycle.csv`} download>Sparse example ↗</a><button className="primary" disabled={!text.trim() || reading} type="submit">{reading ? 'Reading file…' : prepared ? 'Save cycle & find neighbours →' : 'Preview cycle →'}</button></div>
      <p className="small-note">Saved in this browser only. Export a copy for safekeeping; there is no cloud sync.</p>
    </form>
  </dialog>;
}

export default function App({ frequencyAtlas, priAtlas }: { frequencyAtlas?: AtlasData; priAtlas?: AtlasData } = {}) {
  const [catalogues, setCatalogues] = useState(frequencyAtlas && priAtlas ? { frequencyAtlas, priAtlas } : null), [catalogueError, setCatalogueError] = useState('');
  useEffect(() => {
    if (catalogues) return;
    const controller = new AbortController(); setCatalogueError('');
    Promise.all([atlasUrl, priAtlasUrl].map(async url => { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw new Error('Catalogue could not be loaded.'); return await response.json() as AtlasData; }))
      .then(([frequencyAtlas, priAtlas]) => setCatalogues({ frequencyAtlas, priAtlas }))
      .catch(e => { if (!controller.signal.aborted) setCatalogueError(e.message); });
    return () => controller.abort();
  }, [catalogues]);
  return catalogues ? <LibraryApp {...catalogues} /> : <div className="notice" role="status">{catalogueError || 'Loading signal library…'}</div>;
}

function LibraryApp({ frequencyAtlas, priAtlas }: { frequencyAtlas: AtlasData; priAtlas: AtlasData }) {
  const [quantity, setQuantity] = useState<'frequency' | 'pri'>('frequency');
  const atlas = quantity === 'pri' ? priAtlas : frequencyAtlas;
  const [current, setCurrent] = useState(route);
  const [storage] = useState(() => { try { return { entries: loadImports(), error: '' }; } catch (e) { return { entries: [] as Entry[], error: `Could not load saved cycles: ${(e as Error).message} Existing storage was left untouched.` }; } });
  const [imports, setImports] = useState(storage.entries);
  const [groupingStorage] = useState(() => loadGroupingSettings(frequencyAtlas, priAtlas));
  const [measuredStorage] = useState(loadMeasuredState);
  const [measuredState, setMeasuredState] = useState(measuredStorage.state);
  const [recordingsOpen, setRecordingsOpen] = useState(false);
  const [includeSynthetic, setIncludeSynthetic] = useState(() => { try { return localStorage.getItem('frequency-agile-atlas.include-synthetic') !== 'false'; } catch { return true; } });
  const [reviewStorage] = useState(() => {
    const legacy = loadGroupReviews(frequencyAtlas, priAtlas);
    for (const q of ['frequency', 'pri'] as const) {
      const observed = measuredStorage.state.reviews[q].current;
      legacy.reviews[q].current = { groups: [...legacy.reviews[q].current.groups, ...observed.groups].filter((g, i, all) => all.findIndex(other => other.id === g.id) === i), placements: { ...legacy.reviews[q].current.placements, ...observed.placements }, acknowledged: [...new Set([...legacy.reviews[q].current.acknowledged, ...observed.acknowledged])] };
    }
    const migrated = loadLibraryReviews(legacy.reviews);
    return { ...migrated, error: [legacy.error, migrated.error].filter(Boolean).join(' ') };
  });
  const [reviews, setReviews] = useState(reviewStorage.reviews);
  const [notice, setNotice] = useState([storage.error, measuredStorage.error, groupingStorage.error, reviewStorage.error, Object.values(groupingStorage.settings).some(s => s.calibration) ? 'Fixed-catalogue calibration does not apply to discovered library groups. Uncalibrated defaults are active; saved settings remain available.' : ''].filter(Boolean).join(' '));
  const [groupingSettings, setGroupingSettings] = useState(() => ({ frequency: librarySettings(groupingStorage.settings.frequency, 'frequency'), pri: librarySettings(groupingStorage.settings.pri, 'pri') }));
  const activeSettings = groupingSettings[quantity];
  const [undo, setUndo] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState(''), [family, setFamily] = useState<Family | 'all'>('all'), [view, setView] = useState<'map' | 'grid'>('map');
  const [regionFilter, setRegionFilter] = useState('all');
  const [mode, setMode] = useState<'combined' | 'shape'>('combined'), [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [pending, setPending] = useState(true), [importOpen, setImportOpen] = useState(false), [drawer, setDrawer] = useState(() => location.hash.includes('?id='));
  const inspectorRef = useRef<HTMLElement>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]), [compareNormalized, setCompareNormalized] = useState(false), [overlay, setOverlay] = useState(true);
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches), [speed, setSpeed] = useState(1);
  const playbackProgress = useRef<HTMLSpanElement>(null);
  const displayCycles = 3;
  const effective = mode === 'shape' ? SHAPE_WEIGHTS : weights;
  const localEntries = useMemo(() => [...imports, ...measuredState.cycles].filter(e => (e.quantity || 'frequency') === quantity), [imports, measuredState.cycles, quantity]);
  const all = useMemo(() => [...(includeSynthetic ? atlas.entries : []), ...localEntries], [atlas.entries, localEntries, includeSynthetic]);
  const activeReview = reviews[quantity].current;
  const [result, setResult] = useState<{ quantity: 'frequency' | 'pri'; entries: Entry[]; grouping: ReturnType<typeof groupLibrary>; layout: ReturnType<typeof layoutLibrary> } | null>(null);
  const emptyGrouping = useMemo(() => groupLibrary([], quantity, DEFAULT_GROUPING, emptyReview()), [quantity]);
  // Keep the completed scene until its replacement arrives. Clearing it here
  // loses the source waveforms needed by the Frequency/PRI transition.
  const grouping = result?.grouping || emptyGrouping;
  const displayedEntries = result?.entries || EMPTY_ENTRIES;
  const displayedQuantity = result?.quantity || quantity;
  const updating = pending || displayedQuantity !== quantity;
  const regionSet = grouping.regionSet;
  const selected = displayedEntries.find(e => e.id === current.id) || displayedEntries[0] || all.find(e => e.id === current.id) || all[0];
  const regionById = useMemo(() => Object.fromEntries(regionSet.regions.map(r => [r.id, r])), [regionSet]);
  const selectedRegion = selected && regionById[regionSet.membership[selected.id]];
  const regionalLayout = result?.layout || layoutLibrary(emptyGrouping.regionSet);
  const regionalPositions = regionalLayout.points;
  const filtered = useMemo(() => displayedEntries.filter(e => (family === 'all' || e.family === family) && (regionFilter === 'all' || regionSet.membership[e.id] === regionFilter) && `${e.name} ${e.id} ${familyInfo(e.family).name} ${regionById[regionSet.membership[e.id]]?.name || ''} ${JSON.stringify(e.parameters)}`.toLowerCase().includes(query.toLowerCase())), [displayedEntries, family, regionFilter, query, regionById, regionSet]);
  const completedViews = useRef<Partial<Record<'frequency' | 'pri', { catalogue: Entry[]; imports: Entry[]; cycles: Entry[]; includeSynthetic: boolean; settings: GroupingSettings; review: GroupReview; result: NonNullable<typeof result> }>>>({});
  const { ranked, rankingPending, rankingError } = useNeighbours(includeSynthetic ? frequencyAtlas.entries : EMPTY_ENTRIES, includeSynthetic ? priAtlas.entries : EMPTY_ENTRIES, localEntries, selected, effective);
  useEffect(() => { const listener = () => setCurrent(route()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    const cached = completedViews.current[quantity];
    if (cached && cached.catalogue === atlas.entries && cached.imports === imports && cached.cycles === measuredState.cycles && cached.includeSynthetic === includeSynthetic && cached.settings === activeSettings && cached.review === activeReview) {
      setResult(cached.result); setPending(false); return;
    }
    setPending(true);
    let cancelled = false;
    const worker = new Worker(new URL('./library.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      if (cancelled) return;
      setPending(false);
      if (event.data.error) setNotice(`Grouping failed. Your saved signals remain intact. ${event.data.error}`);
      else {
        const next = { ...event.data, quantity, entries: all };
        completedViews.current[quantity] = { catalogue: atlas.entries, imports, cycles: measuredState.cycles, includeSynthetic, settings: activeSettings, review: activeReview, result: next };
        setResult(next);
      }
    };
    worker.onerror = () => { setPending(false); setNotice('Grouping failed. Your saved signals remain intact.'); };
    worker.postMessage({ entries: all, quantity, settings: activeSettings, review: activeReview });
    return () => { cancelled = true; worker.terminate(); };
  }, [all, quantity, activeSettings, activeReview]);
  useEffect(() => { if (location.hash.includes('?id=')) setDrawer(true); }, [selected?.id, quantity]);
  useEffect(() => { if (drawer && matchMedia('(max-width:760px)').matches) { inspectorRef.current?.scrollTo({ top: 0 }); inspectorRef.current?.focus(); } }, [drawer, selected?.id]);


  const navigate = (page: Page, id = selected?.id || '') => { location.hash = `/${page}?id=${encodeURIComponent(id)}`; };
  const select = useCallback((id: string) => { location.hash = `/atlas?id=${encodeURIComponent(id)}`; setDrawer(true); }, []);
  const showGrid = useCallback(() => setView('grid'), []);
  const exploreRegion = useCallback((id: string) => {
    setRegionFilter(id); setFamily('all'); setQuery(''); setView('map');
    const region = regionSet.regions.find(r => r.id === id);
    if (region) location.hash = `/atlas?id=${encodeURIComponent(region.medoidId)}`;
  }, [regionSet]);
  const saveImports = (next: Entry[]) => {
    if (storage.error) throw new Error('Saved storage could not be read. Recover it before adding or removing local cycles.');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error('Browser storage is unavailable or full. Export existing cycles and free space before importing.'); }
    setImports(next);
  };
  const addImport = (entry: Entry) => {
    if (imports.length >= 100) throw new Error('The MVP supports up to 100 local cycles. Export and remove some before adding more.');
    saveImports([...imports, entry]); setQuantity(entry.quantity || 'frequency'); select(entry.id); setQuery(''); setFamily('all'); setRegionFilter('all'); setNotice('Cycle saved locally and grouped automatically. Select it to inspect the match scores.');
  };
  const removeImport = () => {
    try { saveImports(imports.filter(e => e.id !== selected.id)); setUndo(imports); setCompareIds(ids => ids.filter(id => id !== selected.id)); navigate('atlas', atlas.entries[0].id); setNotice('Local cycle removed. You can undo this below.'); }
    catch (e) { setNotice((e as Error).message); }
  };
  const applyGrouping = (settings: GroupingSettings) => {
    try {
      const validated = validateGroupingForAtlas(settings, emptyAtlas(quantity));
      { const next = { ...groupingSettings, [quantity]: validated }; localStorage.setItem(QUANTITY_GROUPING_KEY, JSON.stringify(next)); setGroupingSettings(next); }
      setRegionFilter('all'); setNotice('Grouping settings applied. Library groups reassessed by complete linkage; every member pair meets the threshold.');
    } catch (e) { setNotice(`Could not apply grouping settings: ${(e as Error).message}`); }
  };
  const saveReviewWorkspace = (workspace: typeof reviews.frequency) => {
    if (updating || reviewStorage.error || storage.error || measuredStorage.error) throw new Error('Group decisions are unavailable while grouping is updating or saved storage needs recovery.');
    const next = { ...reviews, [quantity]: workspace };
    // One atomic storage write includes both the decision and its undo history.
    localStorage.setItem(LIBRARY_REVIEW_KEY, JSON.stringify({ version: 1, ...next }));
    setReviews(next); setRegionFilter('all');
  };
  const commitReview = (next: GroupReview, message: string) => {
    try { saveReviewWorkspace(recordReview(reviews[quantity], next)); setNotice(message); }
    catch (e) { setNotice(`Could not save group decision: ${(e as Error).message}`); }
  };
  const keepMatch = (id: string) => {
    const assignment = grouping.assignments[id];
    if (!assignment) return;
    commitReview({ ...activeReview, acknowledged: [...activeReview.acknowledged, reviewToken(id, assignment.regionId, activeSettings, assignment.reviewContext)] }, 'Match reviewed. Acknowledgment preserves the observation and cohesion checks.');
  };
  const reassign = (id: string, targetId: string) => {
    try {
      const assignment = grouping.assignments[id];
      if (!assignment || grouping.health[assignment.regionId].anchorIds.includes(id)) throw new Error('Identity anchors stay in their group.');
      if (!assignment.candidates.some(c => c.regionId === targetId && c.eligible)) throw new Error('The target must match this signal to every group member at the grouping threshold.');
      commitReview(moveMember(activeReview, id, regionSet, targetId), 'Reviewed placement saved. Use Undo last group decision to restore it.');
    } catch (e) { setNotice((e as Error).message); }
  };
  const splitGroup = (proposal: SplitProposal) => {
    try {
      const parent = regionById[proposal.regionId];
      if (!grouping.health[proposal.regionId]?.proposals.some(p => p.id === proposal.id)) throw new Error('The split proposal is no longer current.');
      commitReview(approveSplit(activeReview, proposal, parent.name, parent.local ? parent.identityAnchorId || parent.medoidId : undefined, regionSet), 'Split approved and saved locally. The parent keeps its saved identity and recomputes its representative. Undo is available in Group health & review.');
    } catch (e) { setNotice((e as Error).message); }
  };
  const undoGroupDecision = () => {
    try { saveReviewWorkspace(undoReview(reviews[quantity])); setNotice('Last group decision undone. Assignments replayed using the current cycles and settings.'); }
    catch (e) { setNotice(`Could not undo group decision: ${(e as Error).message}`); }
  };
  const mergeGroup = (proposal: MergeProposal) => {
    try {
      if (!grouping.merges.some(p => p.id === proposal.id)) throw new Error('The merge proposal is no longer current.');
      commitReview(approveMerge(activeReview, proposal, grouping), 'Merge approved. The surviving group keeps its identity; all original signals remain stored. Undo is available.');
    } catch (e) { setNotice((e as Error).message); }
  };
  const toggleSynthetic = () => {
    try { localStorage.setItem('frequency-agile-atlas.include-synthetic', String(!includeSynthetic)); setIncludeSynthetic(v => !v); setRegionFilter('all'); setFamily('all'); setNotice('Synthetic examples are demo data. Saved measured signals and original recordings remain in the library.'); }
    catch { setNotice('Could not save the display preference.'); }
  };
  const toggleComparison = (id: string) => setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 2 ? [...ids, id] : [ids[0], id]);
  const pair = compareIds.map(id => all.find(e => e.id === id)).filter((e): e is Entry => !!e);
  const pairDistance = pair.length === 2 ? compare(pair[0], pair[1], effective) : null;
  const canOverlayOriginal = pair.length === 2 && pair[0].units.time === pair[1].units.time && pair[0].units.frequency === pair[1].units.frequency;

  return <>
    <a href="#main" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
    <header className="site-header"><a className="brand" href={`#/atlas?id=${selected?.id || ''}`} aria-label="Frequency-Agile Signal Atlas home"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="10" /><path d="M7 22C11 22 11 10 16 10S20 30 25 30S29 17 33 17" /></svg><span>Frequency-Agile<span className="brand-sub">SIGNAL ATLAS</span></span></a>
      <nav aria-label="Main navigation">{(['atlas', 'families', 'compare', 'method'] as Page[]).map(page => <a key={page} className={current.page === page ? 'active' : ''} href={`#/${page}?id=${selected?.id || ''}`}>{page === 'method' ? 'Methodology' : page === 'families' ? 'Regions' : page[0].toUpperCase() + page.slice(1)}{page === 'compare' && compareIds.length > 0 && <span className="nav-count">{compareIds.length}</span>}</a>)}</nav>
      <button onClick={() => setRecordingsOpen(v => !v)}>{recordingsOpen ? 'Close recordings' : 'Recordings & new inputs'}</button><button className="import-button" onClick={() => setImportOpen(true)}><span>＋</span> Import cycle</button>
    </header>
    <main id="main" tabIndex={-1}>
      <section className="intro"><div><div className="eyebrow"><span className="status-dot" /> A FIELD GUIDE TO PERIODIC FREQUENCY</div><h1>{current.page === 'atlas' ? 'Atlas' : current.page === 'families' ? 'Regions' : current.page === 'compare' ? 'Compare' : 'Methodology'}</h1><p>{current.page === 'atlas' ? 'Your retained signal library. Add imperfect new inputs, inspect their matches, and review how groups evolve.' : current.page === 'families' ? 'Similarity regions reveal waveform character. Generator families record how it was made.' : current.page === 'compare' ? 'Keep the original scale in view, or isolate morphology with circular alignment.' : 'A transparent baseline, with assumptions you can inspect and adjust.'}</p></div><div className="catalogue-stamp"><strong>{all.length}</strong><span>STORED CYCLES<br />{regionSet.regions.length} GROUPS</span><span className="version">ATLAS / v{version}</span></div></section>
      {notice && <div className="notice" role="status"><span>{notice}</span>{undo && <button onClick={() => { try { saveImports(undo); setUndo(null); setNotice('Local cycle restored.'); } catch (e) { setNotice((e as Error).message); } }}>Undo removal</button>}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
      <div className="workspace-switch"><span>{localEntries.length} saved measured cycles · {includeSynthetic ? `${atlas.entries.length} synthetic examples included · demo data, not established physical classes` : 'synthetic examples hidden'} · {measuredState.recordings.length} saved recordings</span><button onClick={toggleSynthetic}>{includeSynthetic ? 'Hide synthetic examples' : 'Include synthetic examples'}</button></div>
      <div hidden={!recordingsOpen} className="library-intake"><MeasuredWorkspace embedded onReference={() => setRecordingsOpen(false)} onChange={setMeasuredState} onExtracted={entry => { setQuantity(entry.quantity || 'frequency'); select(entry.id); setRegionFilter('all'); setFamily('all'); setQuery(''); }} /></div>
      {current.page === 'atlas' && <div className="workspace">
        <aside className="family-sidebar"><div className="sidebar-title">COLLECTION <span>{all.length}</span></div><button className={`family-filter all ${family === 'all' && regionFilter === 'all' ? 'chosen' : ''}`} onClick={() => { setFamily('all'); setRegionFilter('all'); }} aria-pressed={family === 'all' && regionFilter === 'all'}><span>All patterns</span><small>{all.length}</small></button><div className="sidebar-title second">SIGNAL GROUPS <span>{regionSet.regions.length}</span></div><div className="region-list">{regionSet.regions.map(r => <button key={r.id} className={`family-filter region-filter ${regionFilter === r.id ? 'chosen' : ''}`} aria-label={`Explore region ${r.name}`} aria-pressed={regionFilter === r.id} onClick={() => exploreRegion(r.id)}><i style={{ background: r.color }} /><span>{r.name}</span><small>{r.count}</small></button>)}</div><details className="provenance-filters"><summary>Generator provenance</summary>{families.filter(f => f.id !== 'unassigned' || localEntries.length).map(f => <button key={f.id} className={`family-filter ${family === f.id ? 'chosen' : ''}`} aria-pressed={family === f.id} onClick={() => { setFamily(f.id); setRegionFilter('all'); }}><i style={{ background: f.color }} /><span>{f.short}</span><small>{all.filter(e => e.family === f.id).length}</small></button>)}</details><div className="sidebar-note"><p>Colour follows group membership.<br />New cycles group automatically.</p><a href={`#/method?id=${selected?.id || ''}`}>How regions form →</a></div><div className="sidebar-bottom"><span className="status-dot" /> ALL PROCESSING IS LOCAL</div></aside>
        <section className="explorer" aria-label="Explore patterns"><div className="explorer-toolbar"><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search patterns" placeholder="Find a pattern, region or control…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</label><div className="segmented" aria-label="View"><button className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>Atlas</button><button className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button></div></div>
          <div className="quantity-toolbar"><span>Arrange by</span><div className="segmented quantity-toggle" data-quantity={quantity} aria-label="Atlas quantity">{([{id: 'frequency', label: 'Frequency'}, {id: 'pri', label: 'PRI'}] as const).map(q => <button key={q.id} className={quantity === q.id ? 'active' : ''} aria-pressed={quantity === q.id} onClick={() => { setQuantity(q.id); setFamily('all'); setRegionFilter('all'); }}>{q.label}</button>)}</div><small>{quantity === 'pri' ? 'Pulse interval patterns · synthetic' : 'Frequency agility patterns'}</small></div><div className="metric-toolbar"><span>{filtered.length} cycles · grouped by signal evidence</span></div>
          <GroupingPanel key={`${quantity}-${JSON.stringify(activeSettings)}`} settings={activeSettings} onApply={applyGrouping} demoActive={false} controls={[]} inserted={0} assignments={grouping.assignments} regionSet={regionSet} onStart={() => {}} onNext={() => {}} onReset={() => {}} onExit={() => {}} hideControlDemo library />
          <GroupReviewPanel grouping={grouping} entries={displayedEntries} onSelect={select} onAcknowledge={keepMatch} onMove={reassign} onSplit={splitGroup} onUndo={undoGroupDecision} undoCount={reviews[quantity].history.length} disabled={updating || !!reviewStorage.error || !!storage.error || !!measuredStorage.error} merges={grouping.merges} onMerge={mergeGroup} defaultCollapsed />
          {view === 'map' ? <Atlas entries={filtered} regionLayout={regionalLayout} regionPositions={regionalPositions} focusedRegion={regionFilter} onExploreRegion={exploreRegion} selectedId={selected?.id || ''} onSelect={select} pending={pending} animate={playing} onGrid={showGrid} autoFit /> : <div className="pattern-grid">{filtered.map(e => <button key={e.id} className={`pattern-card ${e.id === selected?.id ? 'selected' : ''}`} onClick={() => select(e.id)} aria-pressed={e.id === selected?.id}><span className="card-family" style={{ color: regionById[regionSet.membership[e.id]]?.color || '#dde5df' }}>{regionById[regionSet.membership[e.id]]?.name || 'Local / unassigned'}</span><MiniPlot entry={e} color={regionById[regionSet.membership[e.id]]?.color} /><strong>{e.name}</strong><span>{fmt(e.period)} {e.units.time} · {displayedQuantity === 'pri' ? 'ΔPRI' : 'Δf'} {fmt(e.excursion)} {e.units.frequency}</span></button>)}{!filtered.length && <p className="empty">{pending ? 'Updating groups…' : 'No cycles in this view. Open Recordings & new inputs to add signals, or include the synthetic examples.'}</p>}</div>}
          <button className="mobile-inspect" onClick={() => setDrawer(true)}>Inspect {selected?.name || 'a cycle'} →</button>
          <div className="explorer-foot"><span>{mode === 'shape' ? 'MORPHOLOGY ONLY · SCALE IGNORED' : 'PERIOD & EXCURSION PRESERVED'}</span><span>{displayedQuantity === 'pri' ? 'Periodic PRI(t) · one full cycle' : 'Periodic f(t) · one declared cycle'}</span></div>
        </section>
        {selected && <aside ref={inspectorRef} tabIndex={-1} className={`inspector ${drawer ? 'drawer-open' : ''}`} aria-label="Selected pattern inspector" onKeyDown={e => {
          if (!matchMedia('(max-width:760px)').matches) return;
          if (e.key === 'Escape') { e.preventDefault(); setDrawer(false); document.querySelector<HTMLButtonElement>('.mobile-inspect')?.focus(); }
          if (e.key === 'Tab') {
            const controls = [...inspectorRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), select, summary')];
            if (e.shiftKey && (document.activeElement === controls[0] || document.activeElement === inspectorRef.current)) { e.preventDefault(); controls.at(-1)?.focus(); }
            else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
          }
        }}><div className="inspector-head"><span className="eyebrow">SELECTED CYCLE</span><button className="drawer-close" aria-label="Close inspector" onClick={() => { setDrawer(false); document.querySelector<HTMLButtonElement>('.mobile-inspect')?.focus(); }}>×</button><span className="id-label">{selected.id}</span></div><div className="selected-region">{selectedRegion ? <><button style={{ color: selectedRegion.color }} onClick={() => exploreRegion(selectedRegion.id)}><i style={{ background: selectedRegion.color }} />{selectedRegion.name} <span>↗</span></button><small>{selectedRegion.count} cycles · {selectedRegion.local ? selectedRegion.provisional ? 'provisional group' : 'library group' : 'library group'}</small></> : <><strong>Local / unassigned</strong><small>Waiting for grouping</small></>}</div>{selected.source === 'synthetic' && <div className="family-badge" style={{ color: familyInfo(selected.family).color }}><i style={{ background: familyInfo(selected.family).color }} />Generator · {familyInfo(selected.family).name}</div>}<h2>{selected.name}</h2><div className="plot-heading"><span>{displayedQuantity === 'pri' ? 'PULSE INTERVAL / TIME' : 'FREQUENCY / TIME'}</span><span>Original units</span></div><div className="cycle-controls"><span>Repeating trajectory</span><span>3 cycles</span></div><Plot key={`${selected.id}-${displayedQuantity}-${displayCycles}-${speed}`} entries={[selected]} cycles={displayCycles} pulse={{ playing, speed }} progress={playbackProgress} /><div className="playback"><button className="play-button" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause playback' : 'Play repeating cycle'}>{playing ? 'Ⅱ' : '▶'}</button><span>Visual sweep<small><span ref={playbackProgress}>Cycle 1 / {displayCycles} · 0%</span></small></span><label><span className="sr-only">Playback speed</span><select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">{[0.25, 0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}</select></label></div>
          <dl className="signal-stats"><div><dt>Period · T</dt><dd>{fmt(selected.period)} <small>{selected.units.time}</small></dd></div><div><dt>{displayedQuantity === 'pri' ? 'PRI excursion · ΔPRI' : 'Excursion · Δf'}</dt><dd>{fmt(selected.excursion)} <small>{selected.units.frequency}</small></dd></div><div><dt>Centre · midrange</dt><dd>{fmt(selected.centre)} <small>{selected.units.frequency}</small></dd></div><div><dt>Provenance</dt><dd className="provenance">{selected.source === 'synthetic' ? 'Synthetic' : 'Local import'}</dd></div></dl>
          {(selected.sampling === 'sparse-periodic' || selected.interpolation === 'hold') && <p className="small-note observation-notice">{observationSummary(selected).observedPoints} observed points · {observationSummary(selected).missingPoints} missing rows · largest interval {percent(observationSummary(selected).largestGapFraction)} of T. Model: {selected.interpolation === 'hold' ? 'step / hold' : 'linear'}. Matching uses the reconstructed curve. Calibration on dense synthetic data does not establish accuracy for sparse or hopping observations.</p>}
          {grouping.assignments[selected.id] && <AssignmentDetails assignment={grouping.assignments[selected.id]} regionSet={regionSet} measured calibrationDataset={activeSettings.calibration?.datasetId} onMove={!updating && !reviewStorage.error && !storage.error && !measuredStorage.error ? reassign : undefined} />}

          <button className={`compare-add ${compareIds.includes(selected.id) ? 'added' : ''}`} onClick={() => toggleComparison(selected.id)}>{compareIds.includes(selected.id) ? '✓ In comparison · remove' : '＋ Add to comparison'}</button>
          <div className="neighbour-title"><h3>Nearest neighbours</h3><span>{mode === 'shape' ? 'SHAPE' : 'COMBINED'} DISTANCE (%)</span></div><div className="neighbours">{ranked.slice(0, 5).map((n, i) => <div className="neighbour" key={n.entry.id}><button onClick={() => select(n.entry.id)} aria-label={`Inspect neighbour ${n.entry.name}`}><span className="rank">0{i + 1}</span><MiniPlot entry={n.entry} /><span className="neighbour-name"><strong>{n.entry.name}</strong><small>{familyInfo(n.entry.family).short}</small></span><span className="distance">{n.distance < 1e-6 ? '≈ 0%' : percent(n.distance)}</span></button><button className="neighbour-add" aria-label={`Compare ${n.entry.name}`} onClick={() => { setCompareIds([selected.id, n.entry.id]); navigate('compare'); }}>↔</button></div>)}{!ranked.length && <p className="small-note">{rankingPending ? 'Finding nearest neighbours…' : rankingError || 'No compatible neighbours yet. Import another cycle with compatible units.'}</p>}</div><details className="generation"><summary>Generation & sample metadata</summary><dl><dt>Source</dt><dd>{selected.provenance.generator} v{selected.provenance.version}</dd><dt>Seed / file</dt><dd>{selected.provenance.seed ?? selected.provenance.file}</dd><dt>Samples</dt><dd>{selected.samples.length} · {selected.sampling}</dd>{Object.entries(selected.parameters).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl></details><div className="export-actions"><button onClick={() => downloadEntry(selected, 'json')}>Export JSON ↓</button><button onClick={() => downloadEntry(selected, 'csv')}>CSV ↓</button>{selected.provenance.recordingId ? <button onClick={() => setRecordingsOpen(true)}>Manage source recording</button> : selected.source === 'measured' && <button className="remove-button" onClick={removeImport}>Remove local cycle</button>}</div>
        </aside>}
      </div>}
      {current.page === 'families' && <><section className="families-page regions-page">{regionSet.regions.map(r => {
        const members = displayedEntries.filter(e => regionSet.membership[e.id] === r.id), medoid = displayedEntries.find(e => e.id === r.medoidId)!;
        const sameUnits = members.every(e => e.units.time === medoid.units.time && e.units.frequency === medoid.units.frequency);
        return <article key={r.id} className="family-panel region-panel" style={{ borderColor: r.local ? r.color : `${r.color}66` }}><div className="family-panel-head"><i style={{ background: r.color }} /><span className="eyebrow">{r.count} CYCLES · {r.local ? r.provisional ? 'PROVISIONAL GROUP' : 'LOCAL GROUP' : 'SHAPE REGION'}</span></div><h2 style={{ color: r.color }}>{r.name}</h2><p>{r.summary}</p><div className="region-ranges">{sameUnits ? <>T {fmt(Math.min(...members.map(e => e.period)))}–{fmt(Math.max(...members.map(e => e.period)))} {medoid.units.time}<br />{displayedQuantity === 'pri' ? 'ΔPRI' : 'Δf'} {fmt(Math.min(...members.map(e => e.excursion)))}–{fmt(Math.max(...members.map(e => e.excursion)))} {medoid.units.frequency}</> : 'Multiple unit labels · inspect individual cycles'}</div><div className="family-examples">{[medoid, members[Math.floor(members.length / 2)], members.at(-1)!].map((e, i) => <button key={`${e.id}-${i}`} onClick={() => { exploreRegion(r.id); select(e.id); }} aria-label={`Explore ${r.name} pattern ${e.name}`}><MiniPlot entry={e} color={r.color} /><span>{i === 0 ? 'Representative' : `${fmt(e.period)} ${e.units.time}`}</span></button>)}</div><button className="text-button" onClick={() => { exploreRegion(r.id); navigate('atlas', medoid.id); }}>Explore {r.name} →</button></article>;
      })}</section><div className="provenance-title"><span className="eyebrow">HOW THE CYCLES WERE MADE</span><h2>Generator provenance</h2><p>These labels describe generation. A similarity region can contain several generator families.</p></div><section className="families-page">{families.filter(f => f.id !== 'unassigned' || localEntries.length).map(f => {
        const members = all.filter(e => e.family === f.id);
        return <article key={f.id} className="family-panel"><div className="family-panel-head"><i style={{ background: f.color }} /><span className="eyebrow">{members.length} CYCLES</span></div><h2>{f.name}</h2><p>{f.description}</p><div className="family-examples">{[members[0], members[Math.floor(members.length / 2)], members.at(-1)!].filter(Boolean).map((e, i) => <button key={`${e.id}-${i}`} onClick={() => { select(e.id); setFamily(f.id); setRegionFilter('all'); }} aria-label={`Explore ${e.name}`}><MiniPlot entry={e} /><span>{e.parameters.diagnostic ? 'Control' : `${fmt(e.period)} ${e.units.time}`}</span></button>)}</div><button className="text-button" onClick={() => { setFamily(f.id); setRegionFilter('all'); setQuery(''); navigate('atlas'); }}>Explore family →</button></article>;
      })}</section></>}
      {current.page === 'compare' && <section className="compare-page"><div className="segmented"><button aria-pressed={mode === 'combined'} onClick={() => setMode('combined')}>Compare shape + scale</button><button aria-pressed={mode === 'shape'} onClick={() => setMode('shape')}>Compare shape only</button></div><div className="compare-selects">{[0, 1].map(slot => <label key={slot}><span className="eyebrow">CYCLE {slot === 0 ? 'A' : 'B'}</span><select aria-label={`Comparison cycle ${slot === 0 ? 'A' : 'B'}`} value={compareIds[slot] || ''} onChange={e => { const next = [...compareIds]; next[slot] = e.target.value; setCompareIds(next); }}><option value="">Choose a cycle…</option>{all.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>)}</div>
        {pair.length < 2 ? <div className="comparison-empty"><svg viewBox="0 0 100 54" aria-hidden="true"><path d="M0 25Q15 0 25 25T50 25T75 25T100 25" fill="none" stroke="#a5c8be" /></svg><h2>Choose two cycles to look closer.</h2><p>Use the selectors above or add cycles while exploring the atlas.</p><button className="primary" onClick={() => navigate('atlas')}>Explore the atlas →</button></div> : <>
          <div className="compare-toolbar"><div className="segmented"><button className={!compareNormalized ? 'active' : ''} aria-pressed={!compareNormalized} onClick={() => setCompareNormalized(false)}>Original units</button><button className={compareNormalized ? 'active' : ''} aria-pressed={compareNormalized} onClick={() => setCompareNormalized(true)}>Normalized shape</button></div><div className="segmented"><button className={overlay ? 'active' : ''} aria-pressed={overlay} onClick={() => setOverlay(true)}>Overlay</button><button className={!overlay ? 'active' : ''} aria-pressed={!overlay} onClick={() => setOverlay(false)}>Side by side</button></div></div>
          <p className="comparison-context">{compareNormalized ? `${displayCycles} repeats; phase aligned by circular shift (${fmt(pairDistance!.phase)} cycles). Centre and excursion normalized; original periods are ignored in this view.` : `${displayCycles} repeats each, using original time and value units. Stored period is unchanged. Shorter patterns stop after their own ${displayCycles} cycles.`}</p>
          <div className={`comparison-plots ${overlay && (compareNormalized || canOverlayOriginal) ? '' : 'split'}`}>{overlay && (compareNormalized || canOverlayOriginal) ? <article className="comparison-plot"><div className="plot-legend">{pair.map((e, i) => <span key={`${e.id}-${i}`} style={{ color: i ? '#e9b987' : familyInfo(e.family).color }}>{i ? '– –' : '━━'} {e.name}</span>)}</div><Plot entries={pair} normalized={compareNormalized} shifts={[0, pairDistance!.phase]} cycles={displayCycles} /></article> : pair.map((e, i) => <article className="comparison-plot" key={`${e.id}-${i}`}><h3>{i ? 'B' : 'A'} · {e.name}</h3><Plot entries={[e]} normalized={compareNormalized} shifts={[i ? pairDistance!.phase : 0]} cycles={displayCycles} /></article>)}</div>
          {overlay && !compareNormalized && !canOverlayOriginal && <p className="small-note">Different unit labels are shown separately to avoid a misleading shared axis. Matching converts compatible physical units.</p>}
          <div className="distance-summary"><div><span className="eyebrow">{mode === 'shape' ? 'SHAPE ONLY' : 'COMBINED'} DISTANCE (%)</span><strong>{Number.isFinite(pairDistance!.distance) ? percent(pairDistance!.distance) : 'Incompatible units'}</strong><p>Smaller is closer. Distance × 100%, not a match probability; scale differences can exceed 100%.</p></div><dl><div><dt>Morphology RMS</dt><dd>{percent(pairDistance!.shape)}</dd></div><div><dt>Period difference · |log₂ ratio|</dt><dd>{pairDistance!.period.toFixed(3)}</dd></div><div><dt>Excursion difference · |log₂ ratio|</dt><dd>{pairDistance!.excursion.toFixed(3)}</dd></div><div><dt>Circular shift · B</dt><dd>{pairDistance!.shift} / 128 samples</dd></div></dl></div>
          <table className="comparison-table"><thead><tr><th>Stored quantity</th>{pair.map((e, i) => <th key={i}>{i ? 'B' : 'A'} · {e.name}</th>)}</tr></thead><tbody>{(['period', 'excursion', 'centre'] as const).map(quantity => <tr key={quantity}><th>{quantity === 'centre' ? 'Midrange centre' : quantity[0].toUpperCase() + quantity.slice(1)}</th>{pair.map((e, i) => <td key={i}>{fmt(e[quantity])} {quantity === 'period' ? e.units.time : e.units.frequency}</td>)}</tr>)}</tbody></table>
        </>}
      </section>}
      {current.page === 'method' && <section className="method-page"><article><span className="eyebrow">01 / COMPARISON</span><h2>Cycle comparison</h2><p>Every entry is one complete periodic trajectory: frequency or pulse interval, x(t + T) = x(t). Curves are resampled onto 128 equally spaced phases using linear interpolation or an explicitly selected step/hold model. Sparse periodic imports preserve observed points and missing timestamps, and require at least 8 observed points with no cyclic gap over 20% of T. These guards do not establish measured-data accuracy. Values are centred at the midrange and divided by their excursion.</p><p>We try all 128 circular shifts and retain the lowest RMS morphology difference. Traversal direction, frequency reflection and relative feature timing are preserved. There is no local time warping. A sub-grid start shift may leave a small numerical residual.</p><div className="formula">d² = wₛ · RMS² + wₜ · log₂(Tₐ/Tᵦ)²<br />+ wₑ · log₂(Δfₐ/Δfᵦ)² + w꜀ · centreDifference²</div><p>Centre difference is expressed relative to the pair’s mean excursion. Absolute centre value is ignored by default, an adjustable assumption. Physical units are converted to seconds for time and PRI, and Hz for frequency. Arbitrary and physical scales cannot be mixed. Shape-only matching is dimensionless and works across units.</p><h3>Adjust the combined comparison</h3><p className="small-note">These weights affect pair comparisons and nearest neighbours. Grouping settings govern library membership; the map always displays groups.</p><div className="weight-controls">{([{ key: 'shape', label: 'Morphology' }, { key: 'period', label: 'Period' }, { key: 'excursion', label: 'Excursion' }, { key: 'centre', label: 'Absolute centre' }] as const).map(w => <label key={w.key}><span>{w.label}</span><input type="range" min="0" max="1" step="0.05" aria-label={`${w.label} weight`} value={weights[w.key]} onChange={e => { const next = { ...weights, [w.key]: Number(e.target.value) }; if (Object.values(next).some(v => v > 0)) setWeights(next); }} /><output>{percent(weights[w.key])}</output></label>)}</div><button onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset default weights</button></article>
        <article><span className="eyebrow">02 / GROUPS</span><h2>A growing signal library</h2><p>Every stored cycle, including synthetic examples, follows complete-linkage hierarchical clustering. Starting from individual shapes, the closest groups merge while every member pair meets the similarity threshold. There is no preset minimum or maximum group count. Arrival order and generator labels do not determine membership.</p><p>Each group selects a central real representative from its distinct member shapes. Clear core members can add coverage representatives; repeated copies do not bias the central representative. New signals and setting changes reassess the visible library, so automatic membership and representatives can change. Explicit reviewed groups retain their identities when compatible with whole-group cohesion. Capture support counts measured observations only.</p><p>Group health proposes coherent fringe splits and conservative merges. Review a proposal before applying it; saved group identities and undo are retained. New observations and grouping settings reassess the complete visible library. Saved signals and originals are not discarded.</p></article>
        <article><span className="eyebrow">03 / MAP</span><h2>One map, arranged by groups</h2><p>Colour shows group membership. Each cycle occupies its own tile; regions and the canvas expand to accommodate their members. Map spacing is for readability and does not encode a numerical similarity distance. Use Compare and nearest neighbours to inspect waveform differences.</p><p>Synthetic examples are demonstration inputs, not measured classes. Hiding them retains your measured cycles and original recordings, and rebuilds the view from those signals. Reviewed placements whose anchors are hidden pause visibly.</p></article>
        <article><span className="eyebrow">BENCHMARK</span><h2>Fixed-catalogue evaluation</h2><p>This optional labelled benchmark evaluates admission against the historical synthetic reference catalogue. It does not validate the discovered library groups or establish measured-data accuracy. Its calibrated settings are not applied to the library.</p><EvaluationPanel key={quantity} atlas={atlas} settings={DEFAULT_GROUPING} demoActive={false} onApply={() => {}} benchmarkOnly /></article>
        <article><span className="eyebrow">04 / DATA & BOUNDARIES</span><h2>Signal data</h2><p>The PRI view uses independently generated positive pulse-interval trajectories for the same 1,000 signal IDs. A tile represents one synthetic signal with both frequency and PRI patterns; no physical relationship between those patterns is inferred. Switching views loads the grouping and layout computed for the selected quantity.</p><p>PRI is the interval between pulses; PRF = 1 / PRI. Pattern period T is the duration of a complete repeating agility cycle, and is separate from PRI. PRI curves are continuous synthetic interval models, not detected pulse timestamps. Physical PRI is expressed in seconds, ms or us; arbitrary PRI uses tu.</p><p>The {atlas.entries.length} deterministic examples use arbitrary time units (tu) and frequency units (fu), with seed {atlas.metadata.seed}. Excursion means maximum minus minimum instantaneous frequency. It is not occupied RF spectral bandwidth.</p><p>A repeating frequency trajectory does not imply that the underlying RF waveform phase repeats. There are no IQ samples, amplitude waveforms or spectrograms here. Generator labels describe synthetic provenance, not established emitter classes.</p><p>Original samples remain intact while their group membership can evolve through reviewed decisions. Measured imports are retained and processed entirely in your browser. Browser storage is specific to this origin, device and browser; export JSON or CSV before clearing it. Bundled catalogue data on GitHub Pages is public.</p><p>The visual sweep derives its duration from cycle time and playback speed. Frequency playback runs 2.5 times faster, limited to 0.9–4.8 seconds per full sweep to convey speed while remaining readable. PRI playback uses a 1.2–12 second range. It is illustrative playback; stored time values and periods are unchanged. Close-up tile sweeps are decorative and share a three-second rhythm.</p><h3>Next extensions</h3><p>Measured-data validation, label-free stability diagnostics, storage for larger libraries and deliberate anchor replacement remain planned. This baseline keeps generation, similarity, layout and rendering in separate modules.</p></article>
        <article className="vision-method" id="visual-matching"><span className="eyebrow">05 / FORMULA + VISION</span><h2>How pair scoring works</h2><VisionExample atlas={atlas} /></article>
      </section>}
    </main>
    {compareIds.length > 0 && current.page === 'atlas' && <div className="compare-tray"><span><strong>{compareIds.length} / 2</strong> cycles in comparison</span><div>{pair.map(e => <button key={e.id} onClick={() => toggleComparison(e.id)} aria-label={`Remove ${e.name} from comparison`}>{e.name} ×</button>)}</div><button className="primary" disabled={compareIds.length < 2} onClick={() => navigate('compare')}>Compare cycles ↔</button><button aria-label="Clear comparison" onClick={() => setCompareIds([])}>×</button></div>}
    <footer className="site-footer"><span>FREQUENCY-AGILE SIGNAL ATLAS <i>/</i> AN EXPLORATORY COLLECTION</span><span>Synthetic references · local measurements · no cloud</span></footer>
    {importOpen && <ImportDialog initialQuantity={quantity} onClose={() => setImportOpen(false)} onImport={addImport} />}
  </>;
}
