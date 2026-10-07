import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasData } from './types.ts';
import type { GroupingSettings } from './grouping.ts';
import { referenceRepresentatives } from './grouping.ts';
import { weightsSignature } from './calibration.ts';
import { syntheticEvaluationDataset, validateEvaluationDataset } from './evaluationData.ts';
import type { EvaluationDataset } from './evaluationData.ts';
import type { EvaluationReport } from './evaluation.ts';

const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
const interval = (range: [number, number]) => `${pct(range[0])}–${pct(range[1])}`;
function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = { atlas: AtlasData; settings: GroupingSettings; demoActive: boolean; onApply: (settings: GroupingSettings) => void };
export function EvaluationPanel(props: Props) {
  const [opened, setOpened] = useState(false);
  return <details className="evaluation-panel" aria-label="Evaluation and calibration" onToggle={e => { if (e.currentTarget.open) setOpened(true); }}><summary>Evaluate and calibrate grouping</summary>{opened && <EvaluationContents {...props} />}</details>;
}

function EvaluationContents({ atlas, settings, demoActive, onApply }: Props) {
  const bundled = useMemo(() => syntheticEvaluationDataset(atlas), [atlas]);
  const [dataset, setDataset] = useState<EvaluationDataset>(bundled), [report, setReport] = useState<EvaluationReport | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [reading, setReading] = useState(false);
  const worker = useRef<Worker | null>(null), fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const run = () => {
    worker.current?.terminate(); setReport(null); setError(''); setBusy(true);
    const current = new Worker(new URL('./evaluation.worker.ts', import.meta.url), { type: 'module' });
    worker.current = current;
    current.onmessage = e => { if (e.data.error) setError(e.data.error); else setReport(e.data.report); setBusy(false); current.terminate(); worker.current = null; };
    current.onerror = () => { setError('Evaluation worker failed. Try again.'); setBusy(false); current.terminate(); worker.current = null; };
    // Only active representatives are needed by the worker; template selection
    // happens before this compact reference snapshot is sent.
    const entries = Object.values(referenceRepresentatives(atlas)).flat();
    const membership = Object.fromEntries(entries.map(e => [e.id, atlas.regionSet.membership[e.id]]));
    current.postMessage({ atlas: { ...atlas, entries, positions: {}, shapePositions: {}, regionSet: { ...atlas.regionSet, membership } }, dataset, weights: settings.weights });
  };
  const names = Object.fromEntries(atlas.regionSet.regions.map(r => [r.id, r.name]));
  const changedWeights = report && weightsSignature(report.weights) !== weightsSignature(settings.weights);
  const hybrid = report?.methods[3], formula = report?.methods[2];
  return <>
    <p>Compare the default weighted image model against formula-only and calibrated models. Fit score mappings, tune blend weights and the threshold, then evaluate once on separate test sources. Current formula feature weights stay fixed.</p>
    <div className="evaluation-source"><strong>{dataset.id}</strong><p>{dataset.description}</p></div>
    <div className="grouping-actions"><button className="primary" disabled={busy || reading} onClick={run}>{busy ? 'Evaluating…' : 'Run evaluation'}</button>
      {busy && <button onClick={() => { worker.current?.terminate(); worker.current = null; setBusy(false); }}>Cancel evaluation</button>}
      <button disabled={busy || reading} onClick={() => fileInput.current?.click()}>Load labelled dataset</button>
      <button disabled={busy || reading} onClick={() => { setDataset(bundled); setReport(null); setError(''); }}>Use synthetic benchmark</button>
      <button onClick={() => downloadJSON(dataset, `${dataset.id}.json`)}>Export dataset</button>
    </div>
    <input ref={fileInput} className="sr-only" type="file" tabIndex={-1} aria-label="Labelled evaluation dataset" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return; setError('');
      if (file.size > 5_000_000) { setError('Evaluation datasets must be at most 5 MB.'); e.target.value = ''; return; }
      setReading(true);
      try { setDataset(validateEvaluationDataset(JSON.parse(await file.text()), atlas)); setReport(null); }
      catch (err) { setError((err as Error).message); }
      finally { setReading(false); if (fileInput.current) fileInput.current.value = ''; }
    }} />
    <details><summary>Labelled dataset format</summary><p>Export the benchmark for a complete example. Provide version 1, an ID, quantity, description and examples. Each example needs a complete cycle entry, sourceId, split (fit, tune or test), and expectedRegionId (one of the reference IDs below, or null for unfamiliar). Keep related captures, augmentations and repeat observations under the same sourceId and in one split. Exact reference duplicates and normalized curve duplicates across splits are rejected; near-duplicate lineage depends on your labels. Every split needs both known and unfamiliar examples. Limits: 500 examples, 5 MB.</p><ul>{atlas.regionSet.regions.map(r => <li key={r.id}>{r.name}: <code>{r.id}</code></li>)}</ul></details>
    {error && <p className="error" role="alert">{error}</p>}
    {busy && <p role="status">Fitting and testing in a worker; saved imports and settings are unchanged.</p>}
    {report && <section className="evaluation-results" aria-label="Evaluation results">
      <h3>Held-out results · {report.quantity === 'pri' ? 'PRI' : 'Frequency'}</h3>
      <p>Known test coverage: {report.coveredRegionIds.length} / {report.totalRegions} reference regions. Excluded regions have no known test examples. Dataset fingerprint: <code>{report.datasetSignature}</code>.</p>
      <div className="evaluation-table"><table><caption>Independent data splits</caption><thead><tr><th>Split</th><th>Examples</th><th>Sources</th><th>Known</th><th>Unfamiliar</th></tr></thead><tbody>{report.splits.map(s => <tr key={s.split}><th>{s.split}</th><td>{s.examples}</td><td>{s.sources}</td><td>{s.known}</td><td>{s.unfamiliar}</td></tr>)}</tbody></table></div>
      <div className="evaluation-table"><table><caption>Frozen configurations on the test split</caption><thead><tr><th>Method</th><th>Formula / vision</th><th>Threshold</th><th>Balanced accuracy</th><th>Known correct</th><th>Unfamiliar rejected</th><th>False merges / splits / wrong groups</th></tr></thead><tbody>{report.methods.map(m => <tr key={m.id}><th>{m.name}<small>95% source bootstrap: {interval(m.interval)}</small></th><td>{pct(m.settings.formulaWeight)} / {pct(1 - m.settings.formulaWeight)}</td><td>{pct(m.settings.threshold)}</td><td>{pct(m.test.balancedAccuracy)}</td><td>{m.test.knownCorrect} / {m.test.known}</td><td>{m.test.unfamiliarCorrect} / {m.test.unfamiliar}</td><td>{m.test.falseMerges} / {m.test.falseSplits} / {m.test.wrongGroups}</td></tr>)}</tbody></table></div>
      <p>Balanced accuracy averages correct known-region assignment and unfamiliar rejection. False merges admit unfamiliar examples; false splits reject known examples. Each test cycle is evaluated independently against fixed reference groups; this does not test a growing sequence of local founders.</p>
      <p>Hybrid test change versus calibrated formula: <strong>{(report.pairedChange.value * 100).toFixed(1)} percentage points</strong>; paired 95% source bootstrap interval {(report.pairedChange.interval[0] * 100).toFixed(1)} to {(report.pairedChange.interval[1] * 100).toFixed(1)} points. {report.pairedChange.interval[0] > 0 ? 'The listed test sources favour hybrid scoring.' : 'This test does not establish a hybrid advantage.'} Bootstrap intervals describe these sources only; perfect scores can have a zero-width interval and do not establish unseen-data reliability.</p>
      <details><summary>Score calibration diagnostics</summary><p>Mappings use monotonic logistic fitting with equal total weight for match and non-match representative pairs. Brier error and five-bin calibration error below use the same balanced weighting on test pairs; lower is better. These are evidence scores under an artificial 50/50 prior, not operational probabilities.</p>
        <div className="evaluation-table"><table><thead><tr><th>Scores</th><th>Balanced Brier error</th><th>Balanced calibration error</th></tr></thead><tbody>{report.diagnostics.map(d => <tr key={d.name}><th>{d.name}</th><td>{d.brier === null ? 'No compatible pair coverage' : d.brier.toFixed(4)}</td><td>{d.ece === null ? 'Unavailable' : d.ece.toFixed(4)}</td></tr>)}</tbody></table></div>
        {report.diagnostics.map(d => <details key={d.name}><summary>{d.name} reliability bins</summary><div className="evaluation-table"><table><thead><tr><th>Score bin</th><th>Pairs</th><th>Mean score</th><th>Balanced match frequency</th></tr></thead><tbody>{d.bins.map(bin => <tr key={bin.lower}><th>{pct(bin.lower)}–{pct(bin.upper)}</th><td>{bin.pairs}</td><td>{bin.pairs ? pct(bin.predicted) : '—'}</td><td>{bin.pairs ? pct(bin.observed) : '—'}</td></tr>)}</tbody></table></div></details>)}
      </details>
      <details><summary>Test mistakes and per-region results</summary>{[formula, hybrid].map(m => m && <div key={m.id}><h4>{m.name}</h4><ul>{report.coveredRegionIds.map(id => { const rows = m.outcomes.filter(r => r.expectedRegionId === id); return <li key={id}>{names[id]}: {rows.filter(r => r.correct).length} / {rows.length} correct</li>; })}</ul>{m.outcomes.filter(r => !r.correct).length ? <ul>{m.outcomes.filter(r => !r.correct).map(row => <li key={row.id}>{row.id}: expected {row.expectedRegionId ? names[row.expectedRegionId] : 'unfamiliar'}, predicted {row.predictedRegionId ? names[row.predictedRegionId] : 'new group'}</li>)}</ul> : <p>No mistakes on these test examples.</p>}</div>)}</details>
      <div className="evaluation-recommendation"><strong>Tuning recommendation: {pct(report.recommendation.formulaWeight)} formula / {pct(1 - report.recommendation.formulaWeight)} vision · threshold {pct(report.recommendation.threshold)}</strong><p>This recommendation uses tune results only. Hybrid shares of 25%, 50% and 75% formula were compared with formula-only scoring; ties prefer formula-only. Feature weights were held fixed. {changedWeights && 'Formula weights changed since this run; rerun evaluation before applying.'}</p>
        <div className="grouping-actions"><button disabled={Boolean(changedWeights)} onClick={() => onApply(report.recommendation)}>Apply calibrated settings to {demoActive ? 'demo' : report.quantity}</button><button onClick={() => downloadJSON(report, `${report.datasetId}-results.json`)}>Export evaluation results</button></div>
      </div>
    </section>}
  </>;
}
