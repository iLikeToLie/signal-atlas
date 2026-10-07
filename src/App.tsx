import { version } from '../package.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasData, Entry, Family, Point, Weights } from './types.ts';
import { families, familyInfo } from './catalogue.ts';
import { compare, sweepSeconds, DEFAULT_WEIGHTS, SHAPE_WEIGHTS, neighbours, supportedTimeUnits, supportedFrequencyUnits } from './signal.ts';
import { placeImport } from './layout.ts';
import { layoutRegions, layoutIncoming } from './displayLayout.ts';
import { DEFAULT_GROUPING, groupIncoming, validateGroupingForAtlas } from './grouping.ts';
import { loadGroupingSettings, QUANTITY_GROUPING_KEY } from './groupingStorage.ts';
import { EvaluationPanel } from './EvaluationPanel.tsx';
import type { GroupingSettings } from './grouping.ts';
import { controlInserts } from './controlInserts.ts';
import { AssignmentDetails, GroupingPanel } from './GroupingPanel.tsx';
import { downloadEntry, loadImports, parseImport, STORAGE_KEY } from './importExport.ts';
import { Atlas } from './Atlas.tsx';
import { MiniPlot, Plot } from './Plot.tsx';
import { RegionExample } from './RegionExample.tsx';

type Page = 'atlas' | 'families' | 'compare' | 'method';
function route() {
  const [path, query] = location.hash.slice(1).split('?');
  return { page: (['atlas', 'families', 'compare', 'method'].includes(path?.replace('/', '')) ? path.replace('/', '') : 'atlas') as Page, id: new URLSearchParams(query).get('id') || 'harmonic-05' };
}
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmt = (n: number) => Number(n.toPrecision(4)).toString();

function ImportDialog({ onClose, onImport, initialQuantity }: { onClose: () => void; onImport: (entry: Entry) => void; initialQuantity: 'frequency' | 'pri' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(''), [filename, setFilename] = useState('trace.csv');
  const [period, setPeriod] = useState(''), [timeUnit, setTimeUnit] = useState(''), [frequencyUnit, setFrequencyUnit] = useState(''), [sampling, setSampling] = useState('');
  const [error, setError] = useState(''), [reading, setReading] = useState(false);
  const [quantity, setQuantity] = useState(initialQuantity);
  useEffect(() => { ref.current?.showModal(); }, []);
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try { onImport(parseImport(text, filename, { quantity, period, timeUnit, frequencyUnit, sampling })); onClose(); }
    catch (e) { setError((e as Error).message); }
  };
  return <dialog ref={ref} className="import-dialog" onCancel={onClose} aria-labelledby="import-heading">
    <div className="dialog-top"><span className="eyebrow">LOCAL WORKSPACE</span><button onClick={onClose} aria-label="Close import">×</button></div>
    <h2 id="import-heading">Import a cycle</h2><p>One complete frequency or positive PRI trajectory. Matching happens on this device. PRI values are intervals between pulses; the trajectory period is the full repeating pattern.</p>
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
        <label>Endpoint convention<select aria-label="Import endpoint convention" value={sampling} onChange={e => setSampling(e.target.value)}><option value="">From file</option><option value="closed-endpoint">Closed endpoint</option><option value="uniform-open">Uniform open</option></select></label>
      </div></details>
      <p className="small-note">Closed endpoint: include t = 0 and t = T with matching values. Uniform open: N evenly spaced samples, t = iT/N; the wrap to the first sample is explicitly assumed. No automatic period detection, sorting or smoothing.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="dialog-actions"><a href={`${import.meta.env.BASE_URL}examples/${quantity === 'pri' ? 'complete-pri-cycle' : 'complete-cycle'}.json`} download>Download example ↗</a><button className="primary" disabled={!text.trim() || reading} type="submit">{reading ? 'Reading file…' : 'Import & find neighbours →'}</button></div>
      <p className="small-note">Saved in this browser only. Export a copy for safekeeping; there is no cloud sync.</p>
    </form>
  </dialog>;
}

export default function App({ frequencyAtlas, priAtlas }: { frequencyAtlas: AtlasData; priAtlas: AtlasData }) {
  const [quantity, setQuantity] = useState<'frequency' | 'pri'>('frequency');
  const atlas = quantity === 'pri' ? priAtlas : frequencyAtlas;
  const [current, setCurrent] = useState(route);
  const [storage] = useState(() => { try { return { entries: loadImports(), error: '' }; } catch (e) { return { entries: [] as Entry[], error: `Could not load saved cycles: ${(e as Error).message} Existing storage was left untouched.` }; } });
  const [imports, setImports] = useState(storage.entries);
  const [groupingStorage] = useState(() => loadGroupingSettings(frequencyAtlas, priAtlas));
  const [notice, setNotice] = useState([storage.error, groupingStorage.error].filter(Boolean).join(' '));
  const [groupingSettings, setGroupingSettings] = useState(groupingStorage.settings);
  const [demoActive, setDemoActive] = useState(false), [demoCount, setDemoCount] = useState(0);
  const [demoSettings, setDemoSettings] = useState(DEFAULT_GROUPING);
  const activeSettings = demoActive ? demoSettings : groupingSettings[quantity];
  const controls = useMemo(() => controlInserts(atlas), [atlas]);
  const [undo, setUndo] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState(''), [family, setFamily] = useState<Family | 'all'>('all'), [view, setView] = useState<'map' | 'grid'>('map');
  const [regionFilter, setRegionFilter] = useState('all');
  const [mode, setMode] = useState<'combined' | 'shape'>('combined'), [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [custom, setCustom] = useState<{ positions: Record<string, Point>; stress: number; threshold: number; key: string } | null>(null);
  const [pending, setPending] = useState(false), [importOpen, setImportOpen] = useState(false), [drawer, setDrawer] = useState(() => location.hash.includes('?id='));
  const inspectorRef = useRef<HTMLElement>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]), [compareNormalized, setCompareNormalized] = useState(false), [overlay, setOverlay] = useState(true);
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches), [speed, setSpeed] = useState(1), [phase, setPhase] = useState(0);
  const displayCycles = 3;
  const effective = mode === 'shape' ? SHAPE_WEIGHTS : weights;
  const isDefault = JSON.stringify(weights) === JSON.stringify(DEFAULT_WEIGHTS);
  const key = JSON.stringify(effective);
  const localEntries = useMemo(() => demoActive ? controls.slice(0, demoCount).map(c => c.entry) : imports.filter(e => (e.quantity || 'frequency') === quantity), [imports, quantity, demoActive, demoCount, controls]);
  const all = useMemo(() => [...atlas.entries, ...localEntries], [atlas.entries, localEntries]);
  const grouping = useMemo(() => groupIncoming(atlas, localEntries, activeSettings), [atlas, localEntries, activeSettings]);
  const regionSet = grouping.regionSet;
  const selected = all.find(e => e.id === current.id) || atlas.entries[0];
  const regionById = useMemo(() => Object.fromEntries(regionSet.regions.map(r => [r.id, r])), [regionSet]);
  const selectedRegion = regionById[regionSet.membership[selected.id]];
  const referenceLayouts = useMemo(() => ({ frequency: layoutRegions(frequencyAtlas.shapePositions, frequencyAtlas.regionSet), pri: layoutRegions(priAtlas.shapePositions, priAtlas.regionSet) }), [frequencyAtlas, priAtlas]);
  const referenceLayout = referenceLayouts[quantity];
  const regionalLayout = useMemo(() => layoutIncoming(referenceLayout, regionSet), [referenceLayout, regionSet]);
  const regionalPositions = regionalLayout.points;
  const filtered = useMemo(() => all.filter(e => (family === 'all' || e.family === family) && (regionFilter === 'all' || regionSet.membership[e.id] === regionFilter) && `${e.name} ${e.id} ${familyInfo(e.family).name} ${regionById[regionSet.membership[e.id]]?.name || ''} ${JSON.stringify(e.parameters)}`.toLowerCase().includes(query.toLowerCase())), [all, family, regionFilter, query, regionById, regionSet]);
  const ranked = useMemo(() => neighbours(selected, all, effective), [selected, all, key]);
  const basePositions = mode === 'shape' ? atlas.shapePositions : !isDefault && custom?.key === key ? custom.positions : atlas.positions;
  const stress = mode === 'shape' ? atlas.metadata.shapeStress : !isDefault && custom?.key === key ? custom.stress : atlas.metadata.stress;
  const placementCache = useRef<{ base: typeof basePositions; metric: string; points: Map<Entry, Point | null> }>({ base: basePositions, metric: key, points: new Map() });
  const positions = useMemo(() => {
    if (placementCache.current.base !== basePositions || placementCache.current.metric !== key) placementCache.current = { base: basePositions, metric: key, points: new Map() };
    const cache = placementCache.current.points;
    const p = { ...basePositions };
    for (const e of localEntries) { if (!cache.has(e)) cache.set(e, placeImport(e, atlas.entries, basePositions, effective) ?? null); const position = cache.get(e); if (position) p[e.id] = position; }
    return p;
  }, [basePositions, localEntries, key, atlas.entries]);


  useEffect(() => { const listener = () => setCurrent(route()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    if (mode === 'shape' || isDefault) { setPending(false); return; }
    setPending(true);
    const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => worker.postMessage({ entries: atlas.entries, weights: effective }), 180);
    worker.onmessage = event => { if (event.data.error) { setNotice(`Layout failed; default weights restored. ${event.data.error}`); setWeights(DEFAULT_WEIGHTS); } else setCustom({ ...event.data, key }); setPending(false); };
    worker.onerror = () => { setNotice('Layout worker failed; default weights restored.'); setWeights(DEFAULT_WEIGHTS); setPending(false); };
    return () => { clearTimeout(timer); worker.terminate(); };
  }, [key, atlas.entries]);
  useEffect(() => { setPhase(0); if (location.hash.includes('?id=')) setDrawer(true); }, [selected.id, quantity, displayCycles, speed]);
  useEffect(() => { if (drawer && matchMedia('(max-width:760px)').matches) { inspectorRef.current?.scrollTo({ top: 0 }); inspectorRef.current?.focus(); } }, [drawer, selected.id]);
  useEffect(() => {
    if (!playing || current.page !== 'atlas') return;
    let last = performance.now();
    // CSS drives the smooth sweep; React only updates the small progress readout four times per second.
    const timer = setInterval(() => { const now = performance.now(), elapsed = (now - last) / 1000; last = now; if (!document.hidden) setPhase(p => (p + elapsed * displayCycles / sweepSeconds(selected, displayCycles, speed)) % displayCycles); }, 250);
    return () => clearInterval(timer);
  }, [playing, speed, selected, displayCycles, current.page]);

  const navigate = (page: Page, id = selected.id) => { location.hash = `/${page}?id=${encodeURIComponent(id)}`; };
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
      const validated = validateGroupingForAtlas(settings, atlas);
      if (demoActive) setDemoSettings(validated);
      else { const next = { ...groupingSettings, [quantity]: validated }; localStorage.setItem(QUANTITY_GROUPING_KEY, JSON.stringify(next)); setGroupingSettings(next); }
      setRegionFilter('all'); setNotice('Grouping settings applied. Assignments replayed in insertion order.');
    } catch (e) { setNotice(`Could not apply grouping settings: ${(e as Error).message}`); }
  };
  const startDemo = () => { setDemoSettings(DEFAULT_GROUPING); setDemoCount(0); setDemoActive(true); setRegionFilter('all'); setFamily('all'); setQuery(''); setCompareIds([]); setNotice('Control demo started. Saved imports are separate and untouched.'); };
  const resetDemo = () => { setDemoCount(0); setRegionFilter('all'); setCompareIds([]); select(atlas.entries[0].id); };
  const nextControl = () => { if (demoCount < controls.length) { setDemoCount(n => n + 1); setRegionFilter('all'); setFamily('all'); setQuery(''); select(controls[demoCount].entry.id); } };
  const exitDemo = () => { setDemoActive(false); resetDemo(); setNotice('Returned to saved local cycles.'); };
  const toggleComparison = (id: string) => setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 2 ? [...ids, id] : [ids[0], id]);
  const pair = compareIds.map(id => all.find(e => e.id === id)).filter((e): e is Entry => !!e);
  const pairDistance = pair.length === 2 ? compare(pair[0], pair[1], effective) : null;
  const canOverlayOriginal = pair.length === 2 && pair[0].units.time === pair[1].units.time && pair[0].units.frequency === pair[1].units.frequency;

  return <>
    <a href="#main" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
    <header className="site-header"><a className="brand" href={`#/atlas?id=${selected.id}`} aria-label="Frequency-Agile Signal Atlas home"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="10" /><path d="M7 22C11 22 11 10 16 10S20 30 25 30S29 17 33 17" /></svg><span>Frequency-Agile<span className="brand-sub">SIGNAL ATLAS</span></span></a>
      <nav aria-label="Main navigation">{(['atlas', 'families', 'compare', 'method'] as Page[]).map(page => <a key={page} className={current.page === page ? 'active' : ''} href={`#/${page}?id=${selected.id}`}>{page === 'method' ? 'Methodology' : page === 'families' ? 'Regions' : page[0].toUpperCase() + page.slice(1)}{page === 'compare' && compareIds.length > 0 && <span className="nav-count">{compareIds.length}</span>}</a>)}</nav>
      <button className="import-button" disabled={demoActive} onClick={() => setImportOpen(true)}><span>＋</span> Import cycle</button>
    </header>
    <main id="main" tabIndex={-1}>
      <section className="intro"><div><div className="eyebrow"><span className="status-dot" /> A FIELD GUIDE TO PERIODIC FREQUENCY</div><h1>{current.page === 'atlas' ? 'Atlas' : current.page === 'families' ? 'Regions' : current.page === 'compare' ? 'Compare' : 'Methodology'}</h1><p>{current.page === 'atlas' ? 'Explore named regions, follow their neighbours, and find the patterns in between.' : current.page === 'families' ? 'Similarity regions reveal waveform character. Generator families record how it was made.' : current.page === 'compare' ? 'Keep the original scale in view, or isolate morphology with circular alignment.' : 'A transparent baseline, with assumptions you can inspect and adjust.'}</p></div><div className="catalogue-stamp"><strong>{atlas.entries.length}</strong><span>SYNTHETIC CYCLES<br />{regionSet.regions.length} NAMED REGIONS</span><span className="version">ATLAS / v{version}</span></div></section>
      {notice && <div className="notice" role="status"><span>{notice}</span>{undo && <button onClick={() => { try { saveImports(undo); setUndo(null); setNotice('Local cycle restored.'); } catch (e) { setNotice((e as Error).message); } }}>Undo removal</button>}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
      {current.page === 'atlas' && <div className="workspace">
        <aside className="family-sidebar"><div className="sidebar-title">COLLECTION <span>{all.length}</span></div><button className={`family-filter all ${family === 'all' && regionFilter === 'all' ? 'chosen' : ''}`} onClick={() => { setFamily('all'); setRegionFilter('all'); }} aria-pressed={family === 'all' && regionFilter === 'all'}><span>All patterns</span><small>{all.length}</small></button><div className="sidebar-title second">SIMILARITY GROUPS <span>{regionSet.regions.length}</span></div><div className="region-list">{regionSet.regions.map(r => <button key={r.id} className={`family-filter region-filter ${regionFilter === r.id ? 'chosen' : ''}`} aria-label={`Explore region ${r.name}`} aria-pressed={regionFilter === r.id} onClick={() => exploreRegion(r.id)}><i style={{ background: r.color }} /><span>{r.name}</span><small>{r.count}</small></button>)}</div><details className="provenance-filters"><summary>Generator provenance</summary>{families.filter(f => f.id !== 'unassigned' || localEntries.length).map(f => <button key={f.id} className={`family-filter ${family === f.id ? 'chosen' : ''}`} aria-pressed={family === f.id} onClick={() => { setFamily(f.id); setRegionFilter('all'); }}><i style={{ background: f.color }} /><span>{f.short}</span><small>{all.filter(e => e.family === f.id).length}</small></button>)}</details><div className="sidebar-note"><p>Colour follows group membership.<br />New cycles group automatically.</p><a href={`#/method?id=${selected.id}`}>How regions form →</a></div><div className="sidebar-bottom"><span className="status-dot" /> ALL PROCESSING IS LOCAL</div></aside>
        <section className="explorer" aria-label="Explore patterns"><div className="explorer-toolbar"><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search patterns" placeholder="Find a pattern, region or control…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</label><div className="segmented" aria-label="View"><button className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>Atlas</button><button className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button></div></div>
          <div className="quantity-toolbar"><span>Arrange by</span><div className="segmented quantity-toggle" data-quantity={quantity} aria-label="Atlas quantity">{([{id: 'frequency', label: 'Frequency'}, {id: 'pri', label: 'PRI'}] as const).map(q => <button key={q.id} className={quantity === q.id ? 'active' : ''} aria-pressed={quantity === q.id} onClick={() => { setQuantity(q.id); setFamily('all'); setRegionFilter('all'); setCustom(null); setDemoCount(0); setDemoSettings(DEFAULT_GROUPING); }}>{q.label}</button>)}</div><small>{quantity === 'pri' ? 'Pulse interval patterns · synthetic' : 'Frequency agility patterns'}</small></div><div className="metric-toolbar"><div className="segmented"><button className={mode === 'combined' ? 'active' : ''} aria-pressed={mode === 'combined'} onClick={() => setMode('combined')}>Shape + scale</button><button className={mode === 'shape' ? 'active' : ''} aria-pressed={mode === 'shape'} onClick={() => setMode('shape')}>Shape only</button></div><span>{filtered.length} cycles <a href={`#/method?id=${selected.id}`} aria-label="Explain proximity">ⓘ</a></span></div>
          <GroupingPanel key={`${demoActive}-${JSON.stringify(activeSettings)}`} settings={activeSettings} onApply={applyGrouping} demoActive={demoActive} controls={controls} inserted={demoCount} assignments={grouping.assignments} regionSet={regionSet} onStart={startDemo} onNext={nextControl} onReset={resetDemo} onExit={exitDemo} />
          <EvaluationPanel key={quantity} atlas={atlas} settings={activeSettings} demoActive={demoActive} onApply={applyGrouping} />
          {view === 'map' ? <Atlas entries={filtered} positions={positions} regionLayout={regionalLayout} regionPositions={regionalPositions} focusedRegion={regionFilter} onExploreRegion={exploreRegion} selectedId={selected.id} onSelect={select} pending={pending} animate={playing} onGrid={showGrid} /> : <div className="pattern-grid">{filtered.map(e => <button key={e.id} className={`pattern-card ${e.id === selected.id ? 'selected' : ''}`} onClick={() => select(e.id)} aria-pressed={e.id === selected.id}><span className="card-family" style={{ color: regionById[regionSet.membership[e.id]]?.color || '#dde5df' }}>{regionById[regionSet.membership[e.id]]?.name || 'Local / unassigned'}</span><MiniPlot entry={e} color={regionById[regionSet.membership[e.id]]?.color} /><strong>{e.name}</strong><span>{fmt(e.period)} {e.units.time} · {quantity === 'pri' ? 'ΔPRI' : 'Δf'} {fmt(e.excursion)} {e.units.frequency}</span></button>)}{!filtered.length && <p className="empty">No matching cycles. Try clearing the search or selecting another region.</p>}</div>}
          <button className="mobile-inspect" onClick={() => setDrawer(true)}>Inspect {selected.name} →</button>
          <div className="explorer-foot"><span>{mode === 'shape' ? 'MORPHOLOGY ONLY · SCALE IGNORED' : 'PERIOD & EXCURSION PRESERVED'}</span><span>{quantity === 'pri' ? 'Periodic PRI(t) · one full cycle' : 'Continuous f(t) · one full cycle'}</span></div>
        </section>
        <aside ref={inspectorRef} tabIndex={-1} className={`inspector ${drawer ? 'drawer-open' : ''}`} aria-label="Selected pattern inspector" onKeyDown={e => {
          if (!matchMedia('(max-width:760px)').matches) return;
          if (e.key === 'Escape') { e.preventDefault(); setDrawer(false); document.querySelector<HTMLButtonElement>('.mobile-inspect')?.focus(); }
          if (e.key === 'Tab') {
            const controls = [...inspectorRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), select, summary')];
            if (e.shiftKey && (document.activeElement === controls[0] || document.activeElement === inspectorRef.current)) { e.preventDefault(); controls.at(-1)?.focus(); }
            else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
          }
        }}><div className="inspector-head"><span className="eyebrow">SELECTED CYCLE</span><button className="drawer-close" aria-label="Close inspector" onClick={() => { setDrawer(false); document.querySelector<HTMLButtonElement>('.mobile-inspect')?.focus(); }}>×</button><span className="id-label">{selected.id}</span></div><div className="selected-region">{selectedRegion ? <><button style={{ color: selectedRegion.color }} onClick={() => exploreRegion(selectedRegion.id)}><i style={{ background: selectedRegion.color }} />{selectedRegion.name} <span>↗</span></button><small>{selectedRegion.count} cycles · {selectedRegion.local ? selectedRegion.provisional ? 'provisional group' : 'local group' : 'reference region'}</small></> : <><strong>Local / unassigned</strong><small>Approximate shape placement only</small></>}</div><div className="family-badge" style={{ color: familyInfo(selected.family).color }}><i style={{ background: familyInfo(selected.family).color }} />Generator · {familyInfo(selected.family).name}</div><h2>{selected.name}</h2><div className="plot-heading"><span>{quantity === 'pri' ? 'PULSE INTERVAL / TIME' : 'FREQUENCY / TIME'}</span><span>Original units</span></div><div className="cycle-controls"><span>Repeating trajectory</span><span>3 cycles</span></div><Plot key={`${selected.id}-${quantity}-${displayCycles}-${speed}`} entries={[selected]} cycles={displayCycles} pulse={{ playing, speed }} /><div className="playback"><button className="play-button" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause playback' : 'Play repeating cycle'}>{playing ? 'Ⅱ' : '▶'}</button><span>Visual sweep<small>Cycle {Math.floor(phase) + 1} / {displayCycles} · {Math.round((phase % 1) * 100)}%</small></span><label><span className="sr-only">Playback speed</span><select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">{[0.25, 0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}</select></label></div>
          <dl className="signal-stats"><div><dt>Period · T</dt><dd>{fmt(selected.period)} <small>{selected.units.time}</small></dd></div><div><dt>{quantity === 'pri' ? 'PRI excursion · ΔPRI' : 'Excursion · Δf'}</dt><dd>{fmt(selected.excursion)} <small>{selected.units.frequency}</small></dd></div><div><dt>Centre · midrange</dt><dd>{fmt(selected.centre)} <small>{selected.units.frequency}</small></dd></div><div><dt>Provenance</dt><dd className="provenance">{selected.source === 'synthetic' ? 'Synthetic' : 'Local import'}</dd></div></dl>
          {grouping.assignments[selected.id] && <AssignmentDetails assignment={grouping.assignments[selected.id]} regionSet={regionSet} calibrationDataset={activeSettings.calibration?.datasetId} />}

          <button className={`compare-add ${compareIds.includes(selected.id) ? 'added' : ''}`} onClick={() => toggleComparison(selected.id)}>{compareIds.includes(selected.id) ? '✓ In comparison · remove' : '＋ Add to comparison'}</button>
          <div className="neighbour-title"><h3>Nearest neighbours</h3><span>{mode === 'shape' ? 'SHAPE' : 'COMBINED'} DISTANCE (%)</span></div><div className="neighbours">{ranked.slice(0, 5).map((n, i) => <div className="neighbour" key={n.entry.id}><button onClick={() => select(n.entry.id)} aria-label={`Inspect neighbour ${n.entry.name}`}><span className="rank">0{i + 1}</span><MiniPlot entry={n.entry} /><span className="neighbour-name"><strong>{n.entry.name}</strong><small>{familyInfo(n.entry.family).short}</small></span><span className="distance">{n.distance < 1e-6 ? '≈ 0%' : percent(n.distance)}</span></button><button className="neighbour-add" aria-label={`Compare ${n.entry.name}`} onClick={() => { setCompareIds([selected.id, n.entry.id]); navigate('compare'); }}>↔</button></div>)}{!ranked.length && <p className="small-note">No compatible neighbours yet. Import another cycle with compatible units.</p>}</div><details className="generation"><summary>Generation & sample metadata</summary><dl><dt>Source</dt><dd>{selected.provenance.generator} v{selected.provenance.version}</dd><dt>Seed / file</dt><dd>{selected.provenance.seed ?? selected.provenance.file}</dd><dt>Samples</dt><dd>{selected.samples.length} · {selected.sampling}</dd>{Object.entries(selected.parameters).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl></details><div className="export-actions"><button onClick={() => downloadEntry(selected, 'json')}>Export JSON ↓</button><button onClick={() => downloadEntry(selected, 'csv')}>CSV ↓</button>{selected.source === 'measured' && <button className="remove-button" onClick={removeImport}>Remove local cycle</button>}</div>
        </aside>
      </div>}
      {current.page === 'families' && <><section className="families-page regions-page">{regionSet.regions.map(r => {
        const members = all.filter(e => regionSet.membership[e.id] === r.id), medoid = all.find(e => e.id === r.medoidId)!;
        const sameUnits = members.every(e => e.units.time === medoid.units.time && e.units.frequency === medoid.units.frequency);
        return <article key={r.id} className="family-panel region-panel" style={{ borderColor: r.local ? r.color : `${r.color}66` }}><div className="family-panel-head"><i style={{ background: r.color }} /><span className="eyebrow">{r.count} CYCLES · {r.local ? r.provisional ? 'PROVISIONAL GROUP' : 'LOCAL GROUP' : 'SHAPE REGION'}</span></div><h2 style={{ color: r.color }}>{r.name}</h2><p>{r.summary}</p><div className="region-ranges">{sameUnits ? <>T {fmt(Math.min(...members.map(e => e.period)))}–{fmt(Math.max(...members.map(e => e.period)))} {medoid.units.time}<br />{quantity === 'pri' ? 'ΔPRI' : 'Δf'} {fmt(Math.min(...members.map(e => e.excursion)))}–{fmt(Math.max(...members.map(e => e.excursion)))} {medoid.units.frequency}</> : 'Multiple unit labels · inspect individual cycles'}</div><div className="family-examples">{[medoid, members[Math.floor(members.length / 2)], members.at(-1)!].map((e, i) => <button key={`${e.id}-${i}`} onClick={() => { exploreRegion(r.id); select(e.id); }} aria-label={`Explore ${r.name} pattern ${e.name}`}><MiniPlot entry={e} color={r.color} /><span>{i === 0 ? 'Representative' : `${fmt(e.period)} ${e.units.time}`}</span></button>)}</div><button className="text-button" onClick={() => { exploreRegion(r.id); navigate('atlas', medoid.id); }}>Explore {r.name} →</button></article>;
      })}</section><div className="provenance-title"><span className="eyebrow">HOW THE CYCLES WERE MADE</span><h2>Generator provenance</h2><p>These labels describe generation. A similarity region can contain several generator families.</p></div><section className="families-page">{families.filter(f => f.id !== 'unassigned' || localEntries.length).map(f => {
        const members = all.filter(e => e.family === f.id);
        return <article key={f.id} className="family-panel"><div className="family-panel-head"><i style={{ background: f.color }} /><span className="eyebrow">{members.length} CYCLES</span></div><h2>{f.name}</h2><p>{f.description}</p><div className="family-examples">{[members[0], members[Math.floor(members.length / 2)], members.at(-1)!].filter(Boolean).map((e, i) => <button key={`${e.id}-${i}`} onClick={() => { select(e.id); setFamily(f.id); setRegionFilter('all'); }} aria-label={`Explore ${e.name}`}><MiniPlot entry={e} /><span>{e.parameters.diagnostic ? 'Control' : `${fmt(e.period)} ${e.units.time}`}</span></button>)}</div><button className="text-button" onClick={() => { setFamily(f.id); setRegionFilter('all'); setQuery(''); navigate('atlas'); }}>Explore family →</button></article>;
      })}</section></>}
      {current.page === 'compare' && <section className="compare-page"><div className="compare-selects">{[0, 1].map(slot => <label key={slot}><span className="eyebrow">CYCLE {slot === 0 ? 'A' : 'B'}</span><select aria-label={`Comparison cycle ${slot === 0 ? 'A' : 'B'}`} value={compareIds[slot] || ''} onChange={e => { const next = [...compareIds]; next[slot] = e.target.value; setCompareIds(next); }}><option value="">Choose a cycle…</option>{all.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>)}</div>
        {pair.length < 2 ? <div className="comparison-empty"><svg viewBox="0 0 100 54" aria-hidden="true"><path d="M0 25Q15 0 25 25T50 25T75 25T100 25" fill="none" stroke="#a5c8be" /></svg><h2>Choose two cycles to look closer.</h2><p>Use the selectors above or add cycles while exploring the atlas.</p><button className="primary" onClick={() => navigate('atlas')}>Explore the atlas →</button></div> : <>
          <div className="compare-toolbar"><div className="segmented"><button className={!compareNormalized ? 'active' : ''} aria-pressed={!compareNormalized} onClick={() => setCompareNormalized(false)}>Original units</button><button className={compareNormalized ? 'active' : ''} aria-pressed={compareNormalized} onClick={() => setCompareNormalized(true)}>Normalized shape</button></div><div className="segmented"><button className={overlay ? 'active' : ''} aria-pressed={overlay} onClick={() => setOverlay(true)}>Overlay</button><button className={!overlay ? 'active' : ''} aria-pressed={!overlay} onClick={() => setOverlay(false)}>Side by side</button></div></div>
          <p className="comparison-context">{compareNormalized ? `${displayCycles} repeats; phase aligned by circular shift (${fmt(pairDistance!.phase)} cycles). Centre and excursion normalized; original periods are ignored in this view.` : `${displayCycles} repeats each, using original time and value units. Stored period is unchanged. Shorter patterns stop after their own ${displayCycles} cycles.`}</p>
          <div className={`comparison-plots ${overlay && (compareNormalized || canOverlayOriginal) ? '' : 'split'}`}>{overlay && (compareNormalized || canOverlayOriginal) ? <article className="comparison-plot"><div className="plot-legend">{pair.map((e, i) => <span key={`${e.id}-${i}`} style={{ color: i ? '#e9b987' : familyInfo(e.family).color }}>{i ? '– –' : '━━'} {e.name}</span>)}</div><Plot entries={pair} normalized={compareNormalized} shifts={[0, pairDistance!.phase]} cycles={displayCycles} /></article> : pair.map((e, i) => <article className="comparison-plot" key={`${e.id}-${i}`}><h3>{i ? 'B' : 'A'} · {e.name}</h3><Plot entries={[e]} normalized={compareNormalized} shifts={[i ? pairDistance!.phase : 0]} cycles={displayCycles} /></article>)}</div>
          {overlay && !compareNormalized && !canOverlayOriginal && <p className="small-note">Different unit labels are shown separately to avoid a misleading shared axis. Matching converts compatible physical units.</p>}
          <div className="distance-summary"><div><span className="eyebrow">{mode === 'shape' ? 'SHAPE ONLY' : 'COMBINED'} DISTANCE (%)</span><strong>{Number.isFinite(pairDistance!.distance) ? percent(pairDistance!.distance) : 'Incompatible units'}</strong><p>Smaller is closer. Distance × 100%, not a match probability; scale differences can exceed 100%.</p></div><dl><div><dt>Morphology RMS</dt><dd>{percent(pairDistance!.shape)}</dd></div><div><dt>Period difference · |log₂ ratio|</dt><dd>{pairDistance!.period.toFixed(3)}</dd></div><div><dt>Excursion difference · |log₂ ratio|</dt><dd>{pairDistance!.excursion.toFixed(3)}</dd></div><div><dt>Circular shift · B</dt><dd>{pairDistance!.shift} / 128 samples</dd></div></dl></div>
          <table className="comparison-table"><thead><tr><th>Stored quantity</th>{pair.map((e, i) => <th key={i}>{i ? 'B' : 'A'} · {e.name}</th>)}</tr></thead><tbody>{(['period', 'excursion', 'centre'] as const).map(quantity => <tr key={quantity}><th>{quantity === 'centre' ? 'Midrange centre' : quantity[0].toUpperCase() + quantity.slice(1)}</th>{pair.map((e, i) => <td key={i}>{fmt(e[quantity])} {quantity === 'period' ? e.units.time : e.units.frequency}</td>)}</tr>)}</tbody></table>
        </>}
      </section>}
      {current.page === 'method' && <section className="method-page"><article><span className="eyebrow">01 / COMPARISON</span><h2>Cycle comparison</h2><p>Every entry is one complete periodic trajectory: frequency or pulse interval, x(t + T) = x(t). Curves are interpolated onto 128 equally spaced phases. Values are centred at the midrange and divided by their excursion.</p><p>We try all 128 circular shifts and retain the lowest RMS morphology difference. Traversal direction, frequency reflection and relative feature timing are preserved. There is no local time warping. A sub-grid start shift may leave a small numerical residual.</p><div className="formula">d² = wₛ · RMS² + wₜ · log₂(Tₐ/Tᵦ)²<br />+ wₑ · log₂(Δfₐ/Δfᵦ)² + w꜀ · centreDifference²</div><p>Centre difference is expressed relative to the pair’s mean excursion. Absolute centre value is ignored by default, an adjustable assumption. Physical units are converted to seconds for time and PRI, and Hz for frequency. Arbitrary and physical scales cannot be mixed. Shape-only matching is dimensionless and works across units.</p><h3>Adjust the combined comparison</h3><p className="small-note">Changing weights recomputes the reference atlas in a worker. The shape-only map uses morphology alone.</p><div className="weight-controls">{([{ key: 'shape', label: 'Morphology' }, { key: 'period', label: 'Period' }, { key: 'excursion', label: 'Excursion' }, { key: 'centre', label: 'Absolute centre' }] as const).map(w => <label key={w.key}><span>{w.label}</span><input type="range" min="0" max="1" step="0.05" aria-label={`${w.label} weight`} value={weights[w.key]} onChange={e => { const next = { ...weights, [w.key]: Number(e.target.value) }; if (Object.values(next).some(v => v > 0)) setWeights(next); }} /><output>{percent(weights[w.key])}</output></label>)}</div><button onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset default weights</button></article>
        <article><span className="eyebrow">02 / REGIONS</span><h2>Shape regions</h2><RegionExample atlas={atlas} /><p>The {atlas.regionSet.regions.length} coloured regions use phase-aligned, centre- and excursion-normalized RMS morphology distances. Period and excursion do not define reference region membership. They still affect the default neighbour ranking and remain visible in the inspector and comparisons.</p><p>We use deterministic alternating k-medoids. A medoid is a real representative cycle. Start with the cycle closest in total distance to the catalogue, then add the farthest uncovered representatives. Assign every cycle to its nearest representative; replace each representative with the member that minimizes total within-region distance. Repeat until unchanged, with a 30-round limit.</p><p>This catalogue {atlas.regionSet.converged ? 'converged' : 'reached the limit'} in {atlas.regionSet.iterations} rounds. Mean distance to a representative: {percent(atlas.regionSet.objective / atlas.entries.length)} normalized RMS. Twelve is a chosen browsing resolution, not an estimate of the number of natural classes. Borderline members can resemble another region.</p><p>Names such as Echo Garden and Amber Mesa are editorial metaphors inspired by representative curves, assigned after clustering. Generator labels and names have no role in membership. Changing comparison weights updates rankings and the exact MDS map; these shape regions stay stable.</p><p>Local imports are processed automatically in insertion order. Each is compared with three fixed examples per reference region (the medoid and two catalogue members) and the founder of each local group. The strongest compatible group wins if its similarity reaches the admission threshold; otherwise a new provisional group is created. A second matching example changes it to a local group. The founder stays fixed to limit drift.</p><p>Grouping defaults to 70% shape-only formula similarity, exp(−distance), and 30% classical vision, with a 65% admission threshold. You can adjust the blend and scale weights. Vision compares soft overlap of 128 × 32 normalized, phase-aligned curve images. The combined similarity is α × formula + (1 − α) × vision. Scores are heuristic similarities, not probabilities; vision is experimental and enabled in the default blend. Quantity and active unit compatibility remain required.</p><p>Grouping settings are separate from browsing weights and saved per quantity. Optional score calibration is fitted on labelled examples, with separate fit, tune and test source sets in the atlas evaluation panel. The formula/vision mappings and threshold are scoped to the quantity, reference catalogue and formula feature weights. Applying new settings, removing an import or restoring one replays the local sequence; saved cycles and settings reproduce the groups on reload. Clean references never change membership. The control demo uses a separate temporary workspace and five fixed insertions, including a near-threshold mixture.</p><a className="text-button" href="https://scikit-learn-extra.readthedocs.io/en/stable/modules/cluster.html" target="_blank" rel="noreferrer">K-medoids algorithm reference ↗</a></article>
        <article><span className="eyebrow">03 / PROJECTION</span><h2>Map layout</h2><p>The exact layout is classical metric multidimensional scaling (MDS) from actual pairwise comparison distances. Matching grids are cached to 1e-9 precision across scale variants. Two leading positive eigenvectors define the coordinates. A fixed seed makes it reproducible. Family labels have no role in positioning.</p><p>Two dimensions cannot preserve every relationship. Current exact-map distance stress is {percent(stress)}. Neighbour rankings use the full comparison, never screen positions.</p><p>The named-region view packs uninterrupted tile islands with stepped coastlines and labels over their centres near each region’s centre in the shape MDS map, then adds space between regions. Tile order follows the shape projection. Coloured outlines enclose the displayed members; they are visual envelopes, not confidence boundaries. More members require more tile area; label padding also affects island size. Gaps are added for reading and do not encode a numerical distance.</p><p>Use Exact positions to inspect the MDS map for the selected metric. Imports there use an inverse-square weighted average of their five closest compatible references. An incompatible import has no point in that exact map, while the region view displays its automatic group. New groups occupy an expandable shelf below the reference atlas; existing reference tiles stay fixed.</p><h3>Reference distance calibration</h3><p>Default combined threshold: {percent(atlas.metadata.noveltyThreshold)}. It is 1.5 times the 95th percentile of nonzero nearest-reference distances, with a floor of 15% (distance × 100%). Duplicate diagnostics are excluded from calibration. This uses synthetic controls only and needs measured-data calibration. This distance threshold documents the reference baseline. Automatic admission uses the separate similarity threshold shown in Grouping settings.</p><p>A near match suggests resemblance; a poor match suggests a candidate unfamiliar pattern. Neither proves a physical class or a new family.</p></article>
        <article><span className="eyebrow">04 / DATA & BOUNDARIES</span><h2>Signal data</h2><p>The PRI view uses independently generated positive pulse-interval trajectories for the same 1,000 signal IDs. A tile represents one synthetic signal with both frequency and PRI patterns; no physical relationship between those patterns is inferred. Switching views loads the grouping and layout computed for the selected quantity.</p><p>PRI is the interval between pulses; PRF = 1 / PRI. Pattern period T is the duration of a complete repeating agility cycle, and is separate from PRI. PRI curves are continuous synthetic interval models, not detected pulse timestamps. Physical PRI is expressed in seconds, ms or us; arbitrary PRI uses tu.</p><p>The {atlas.entries.length} deterministic examples use arbitrary time units (tu) and frequency units (fu), with seed {atlas.metadata.seed}. Excursion means maximum minus minimum instantaneous frequency. It is not occupied RF spectral bandwidth.</p><p>A repeating frequency trajectory does not imply that the underlying RF waveform phase repeats. There are no IQ samples, amplitude waveforms or spectrograms here. Generator labels describe synthetic provenance, not established emitter classes.</p><p>Clean references are immutable. Local imports are separate and processed entirely in your browser. Browser storage is specific to this origin, device and browser; export JSON or CSV before clearing it. Bundled catalogue data on GitHub Pages is public.</p><p>The visual sweep derives its duration from cycle time and playback speed, limited to 1.2–12 seconds so very fast or slow signals remain readable. It is illustrative playback; stored time values and periods are unchanged. Close-up tile sweeps are decorative and share a three-second rhythm.</p><h3>Next extensions</h3><p>Measured cycle extraction, period detection, partial-cycle matching, better similarity methods and curated families require separate validation. This baseline keeps generation, similarity, layout and rendering in separate modules.</p></article>
      </section>}
    </main>
    {compareIds.length > 0 && current.page === 'atlas' && <div className="compare-tray"><span><strong>{compareIds.length} / 2</strong> cycles in comparison</span><div>{pair.map(e => <button key={e.id} onClick={() => toggleComparison(e.id)} aria-label={`Remove ${e.name} from comparison`}>{e.name} ×</button>)}</div><button className="primary" disabled={compareIds.length < 2} onClick={() => navigate('compare')}>Compare cycles ↔</button><button aria-label="Clear comparison" onClick={() => setCompareIds([])}>×</button></div>}
    <footer className="site-footer"><span>FREQUENCY-AGILE SIGNAL ATLAS <i>/</i> AN EXPLORATORY COLLECTION</span><span>Synthetic references · local measurements · no cloud</span></footer>
    {importOpen && <ImportDialog initialQuantity={quantity} onClose={() => setImportOpen(false)} onImport={addImport} />}
  </>;
}
