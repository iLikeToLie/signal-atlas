import { useEffect, useState } from 'react';
import type { Entry } from './types.ts';
import { supportedFrequencyUnits, supportedTimeUnits } from './signal.ts';
import { extractCycles, parseRecording, recordingBounds } from './recording.ts';
import type { GapModel, PeriodSuggestion, Recording } from './recording.ts';
import { observationSummary } from './observation.ts';
import { MiniPlot, Plot } from './Plot.tsx';

const fmt = (n: number) => Number(n.toPrecision(6)).toString();
export function exampleRecording(quantity: Recording['quantity']) {
  const rows = Array.from({ length: 601 }, (_, i) => {
    const t = i / 100, phase = t % 1;
    const f = quantity === 'pri' ? 150 + 40 * Math.sin(2 * Math.PI * t) : phase < .25 ? 5.2 : phase < .5 ? 7.5 : phase < .75 ? 6 : 8;
    return `${t},${i % 100 === 42 || i % 100 === 43 ? '' : f}`;
  });
  return `# quantity: ${quantity}\n# time_unit: ms\n# ${quantity === 'pri' ? 'pri' : 'frequency'}_unit: ${quantity === 'pri' ? 'us' : 'GHz'}\nt,${quantity === 'pri' ? 'pri' : 'f'}\n${rows.join('\n')}`;
}

function RecordingPlot({ recording, start, end }: { recording: Recording; start: number; end: number }) {
  const { start: first, end: last } = recordingBounds(recording);
  const min = Math.min(...recording.samples.map(s => s.f)), max = Math.max(...recording.samples.map(s => s.f));
  const x = (t: number) => 45 + (t - first) / (last - first) * 710;
  const y = (f: number) => 155 - (f - min) / (max - min || 1) * 120;
  const stride = Math.max(1, Math.ceil(recording.samples.length / 800));
  const points = recording.samples.filter((_, i) => i % stride === 0);
  return <svg className="recording-plot" viewBox="0 0 800 195" role="img" aria-label="Original recording: observed points and missing timestamps, without periodic closure">
    <path d="M45 20V165H755" fill="none" stroke="#536f65" />
    {Number.isFinite(start) && Number.isFinite(end) && end > start && <rect x={x(Math.max(first, start))} y="22" width={Math.max(0, x(Math.min(last, end)) - x(Math.max(first, start)))} height="140" fill="#91c9af" opacity=".13" />}
    {recording.missingTimes.filter((_, i) => i % Math.max(1, Math.ceil(recording.missingTimes.length / 100)) === 0).map(t => <path key={t} d={`M${x(t)} 25V160`} stroke="#e9b987" opacity=".5" strokeDasharray="3 4" />)}
    {points.map(s => <circle key={s.t} cx={x(s.t)} cy={y(s.f)} r="1.7" fill="#b9dbc9" />)}
    <text x="45" y="185" fill="#9cb6aa" fontSize="11">{fmt(first)} {recording.units.time}</text><text x="680" y="185" fill="#9cb6aa" fontSize="11">{fmt(last)} {recording.units.time}</text>
    <text x="8" y="32" fill="#9cb6aa" fontSize="10">{fmt(max)}</text><text x="8" y="155" fill="#9cb6aa" fontSize="10">{fmt(min)}</text>
  </svg>;
}

export function RecordingPanel({ recordings, cycles, quantity, onAdd, onExtract, onExport, onRemove, disabled }: {
  recordings: Recording[]; cycles: Entry[]; quantity: Recording['quantity']; onAdd: (recording: Recording) => void;
  onExtract: (cycles: Entry[]) => void; onExport: (recording: Recording) => void; onRemove: (id: string) => void; disabled: boolean;
}) {
  const [text, setText] = useState(''), [filename, setFilename] = useState('recording.csv'), [timeUnit, setTimeUnit] = useState(''), [valueUnit, setValueUnit] = useState(''), [captureId, setCaptureId] = useState('');
  const [selectedId, setSelectedId] = useState(''), [period, setPeriod] = useState(''), [start, setStart] = useState(''), [count, setCount] = useState(1);
  const [model, setModel] = useState<GapModel>('hold'), [prepared, setPrepared] = useState<Entry[] | null>(null);
  const [suggestions, setSuggestions] = useState<PeriodSuggestion[]>([]), [searching, setSearching] = useState(false), [error, setError] = useState(''), [reading, setReading] = useState(false);
  const recording = recordings.find(r => r.id === selectedId) || recordings.filter(r => r.quantity === quantity).at(-1);
  useEffect(() => { setSelectedId(''); setValueUnit(''); setPrepared(null); }, [quantity]);
  useEffect(() => {
    setPrepared(null); setError(''); setSuggestions([]);
    if (!recording) { setSearching(false); return; }
    setPeriod(recording.periodHint ? String(recording.periodHint) : ''); setStart(String(recordingBounds(recording).start)); setCount(1);
  }, [recording?.id]);
  useEffect(() => {
    setSuggestions([]); if (!recording) return;
    setSearching(true);
    const worker = new Worker(new URL('./recording.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = event => { setSearching(false); if (event.data.error) setError(event.data.error); else setSuggestions(event.data.suggestions); };
    worker.onerror = () => { setSearching(false); setError('Period search failed. You can still supply a period and preview windows.'); };
    worker.postMessage({ recording, model }); return () => worker.terminate();
  }, [recording, model]);
  useEffect(() => { setPrepared(null); }, [period, start, count, model, recording?.id]);
  const attempt = (action: () => void) => { setError(''); try { action(); } catch (e) { setError((e as Error).message); } };
  const choosePeriod = (n: number) => { setPeriod(String(n)); if (recording) setCount(Math.max(1, Math.min(25, Math.floor((recordingBounds(recording).end - Number(start)) / n + 1e-10)))); };
  const saved = recording ? cycles.filter(e => e.provenance.recordingId === recording.id).length : 0;
  return <section className="recording-panel" aria-label="Recording intake and cycle discovery">
    <details open={!recordings.length}>
      <summary>1 · Import an unlabelled recording</summary>
      <p>Supply timestamps and frequency or positive PRI values. A period and labels are optional. Missing values can be blank/null. Up to 2 MB and 50,000 rows; originals stay in this browser.</p>
      <label className="file-drop">Choose CSV or JSON<input aria-label="Choose recording file" type="file" accept=".csv,.json" disabled={disabled || reading} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 2_000_000) { setError('Recording exceeds the 2 MB import limit.'); return; }
        setReading(true); try { setText(await file.text()); setFilename(file.name); } catch { setError('Could not read recording file.'); } finally { setReading(false); }
      }} /></label>
      <label className="field-label">Or paste recording data<textarea aria-label="Recording data" rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={'# time_unit: ms\n# frequency_unit: GHz\nt,f\n0,5.2\n…'} /></label>
      <div className="form-grid recording-fields">
        <label>CSV time unit<select aria-label="Recording time unit" value={timeUnit} onChange={e => setTimeUnit(e.target.value)}><option value="">From file</option>{supportedTimeUnits.map(u => <option key={u}>{u}</option>)}</select></label>
        <label>CSV {quantity === 'pri' ? 'PRI' : 'frequency'} unit<select aria-label="Recording value unit" value={valueUnit} onChange={e => setValueUnit(e.target.value)}><option value="">From file</option>{(quantity === 'pri' ? supportedTimeUnits : supportedFrequencyUnits).map(u => <option key={u}>{u}</option>)}</select></label>
        <label>CSV capture ID (optional)<input aria-label="Recording capture ID" value={captureId} onChange={e => setCaptureId(e.target.value)} placeholder="Same ID for the same acquisition" /></label>
      </div>
      <p className="small-note">JSON supplies its own quantity, units and optional captureId. A capture ID is your assertion of acquisition identity; filenames and repeated windows do not establish independence.</p>
      <div className="grouping-actions"><button className="primary" disabled={disabled || reading || !text.trim()} onClick={() => attempt(() => { const r = parseRecording(text, filename, { quantity, timeUnit, valueUnit, captureId }); onAdd(r); setSelectedId(r.id); setText(''); })}>Save recording & discover cycles</button><button onClick={() => { setText(exampleRecording(quantity)); setFilename(`unlabelled-${quantity}-example.csv`); setTimeUnit(''); setValueUnit(''); setCaptureId(''); }}>Paste an example recording</button></div>
    </details>
    {!!recordings.length && <div className="recording-discovery">
      <h2>2 · Review repeating cycles</h2>
      <label className="field-label">Source recording<select aria-label="Source recording" value={recording?.id || ''} onChange={e => setSelectedId(e.target.value)}>{recordings.filter(r => r.quantity === quantity).map(r => <option key={r.id} value={r.id}>{r.name} · {cycles.filter(e => e.provenance.recordingId === r.id).length ? 'cycles extracted' : 'unresolved'}</option>)}</select></label>
      {recording && <>
        <RecordingPlot recording={recording} start={Number(start)} end={Number(start) + Number(period) * count} />
        <p>{recording.samples.length} observed points · {recording.missingTimes.length} missing rows · value unit {recording.units.frequency} · {saved} saved cycles. {recording.captureId ? `Capture: ${recording.captureId}.` : 'Capture independence unknown.'}</p>
        <label className="field-label">Between observations<select aria-label="Recording gap model" value={model} onChange={e => setModel(e.target.value as GapModel)}><option value="hold">Step / hold previous value (jumps)</option><option value="linear">Linear interpolation (smooth changes)</option></select></label>
        <div className="period-suggestions" aria-live="polite"><strong>{searching ? 'Searching for repetition…' : suggestions.length ? 'Possible periods · choose one or enter your own' : 'No qualifying period found · recording remains unresolved'}</strong>
          {suggestions.map(s => <button key={s.period} aria-pressed={Number(period) === s.period} onClick={() => choosePeriod(s.period)}>{fmt(s.period)} {recording.units.time}<small>{(s.similarity * 100).toFixed(1)}% recurrence resemblance · {s.pairs} pairs · {(s.coverage * 100).toFixed(0)}% coverage · {s.repeats.toFixed(1)} repetitions</small></button>)}
        </div>
        <p className="small-note">A heuristic search compares observations across time lags, using short interpolation brackets and avoiding explicit missing spans. It needs about three repetitions and at least eight points per suggested period. Multiples and harmonics can be ambiguous; resemblance is not confidence. Nonrepeating, constant or poorly observed recordings may have no suggestion.</p>
        <div className="form-grid recording-fields"><label>Period ({recording.units.time})<input aria-label="Discovered cycle period" type="number" step="any" min="0" value={period} onChange={e => setPeriod(e.target.value)} /></label><label>First window starts at<input aria-label="Cycle window start" type="number" step="any" value={start} onChange={e => setStart(e.target.value)} /></label><label>Consecutive windows<input aria-label="Cycle window count" type="number" min="1" max="25" value={count} onChange={e => setCount(Number(e.target.value))} /></label></div>
        <div className="grouping-actions"><button disabled={disabled || searching || !period || !start} onClick={() => attempt(() => setPrepared(extractCycles(recording, Number(period), Number(start), count, model)))}>Preview cycle windows</button><button onClick={() => onExport(recording)}>Export original recording</button><button disabled={disabled} onClick={() => attempt(() => onRemove(recording.id))}>Remove recording & its cycles</button></div>
        <small>Removal resets group decisions for this quantity; you can undo the removal.</small>
        {prepared && <section className="import-preview" aria-label="Extracted cycle preview"><h3>{prepared.length} windows ready for approval</h3><Plot entries={[prepared[0]]} cycles={1} /><div className="split-examples">{prepared.map(e => <div key={e.id}><MiniPlot entry={e} /><small>{fmt(e.provenance.windowStart!)}–{fmt(e.provenance.windowEnd!)} {recording.units.time} · {e.samples.length} points · largest gap {(observationSummary(e).largestGapFraction * 100).toFixed(1)}%</small></div>)}</div><p>Preview includes modelled gaps and the repeating wrap. Original observations and window boundaries are retained. At least eight observed points and no cyclic gap over 20% are required. Approval accepts the period and gap model; it does not certify signal quality.</p><button className="primary" disabled={disabled} onClick={() => attempt(() => { onExtract(prepared); setPrepared(null); })}>Approve & group {prepared.length} cycles</button></section>}
      </>}
    </div>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
