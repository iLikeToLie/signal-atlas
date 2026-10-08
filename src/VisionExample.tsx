import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AtlasData } from './types.ts';
import { DEFAULT_GROUPING, groupIncoming } from './grouping.ts';
import { controlInserts } from './controlInserts.ts';
import { compare, phaseGrid } from './signal.ts';
import { curveImage, imageSimilarity } from './vision.ts';
import { Plot } from './Plot.tsx';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Pixels({ pixels, label, color = [230, 237, 232] }: { pixels: Float32Array; label: string; color?: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    const frame = context.createImageData(128, 32);
    for (let x = 0; x < 128; x++) for (let y = 0; y < 32; y++) {
      const index = (y * 128 + x) * 4;
      frame.data.set([...color, Math.round(pixels[x * 32 + y] * 255)], index);
    }
    context.putImageData(frame, 0, 0);
  }, [pixels, color[0], color[1], color[2]]);
  return <div className="vision-pixels"><span>{label}</span><canvas ref={ref} width={128} height={32} role="img" aria-label={label}>A 128 by 32 grayscale curve image.</canvas></div>;
}

export function VisionExample({ atlas }: { atlas: AtlasData }) {
  const titleId = useId();
  const [exampleIndex, setExampleIndex] = useState(1);
  const [formulaWeight, setFormulaWeight] = useState(DEFAULT_GROUPING.formulaWeight);
  const [threshold, setThreshold] = useState(DEFAULT_GROUPING.threshold);
  const controls = useMemo(() => controlInserts(atlas), [atlas]);
  const entry = controls[exampleIndex].entry;
  const settings = useMemo(() => ({ ...DEFAULT_GROUPING, formulaWeight, threshold }), [formulaWeight, threshold]);
  const assignment = useMemo(() => groupIncoming(atlas, [entry], settings).assignments[entry.id], [atlas, entry, settings]);
  const best = assignment.candidates[0];
  const reference = atlas.entries.find(e => e.id === best.representativeId)!;
  const region = atlas.regionSet.regions.find(r => r.id === best.regionId)!;
  const images = useMemo(() => {
    const queryGrid = phaseGrid(entry), referenceGrid = phaseGrid(reference);
    const alignment = compare(entry, reference, DEFAULT_GROUPING.weights, queryGrid, referenceGrid);
    const query = curveImage(queryGrid), aligned = curveImage(referenceGrid, alignment.shift);
    return { query, aligned, phase: alignment.phase,
      intersection: query.map((value, i) => Math.min(value, aligned[i])),
      union: query.map((value, i) => Math.max(value, aligned[i])), vision: imageSimilarity(query, aligned) };
  }, [entry, reference]);
  const formulaContribution = formulaWeight * best.rawFormula;
  const visionContribution = (1 - formulaWeight) * images.vision;
  return <figure className="vision-example" aria-labelledby={titleId}>
    <figcaption id={titleId}>From curves to a grouping decision</figcaption>
    <p>Follow a synthetic query through the same scoring code used for new imports. Change the example, blend or threshold to see the result update.</p>
    <div className="vision-demo-controls">
      <label>Query example<select aria-label="Vision example query" value={exampleIndex} onChange={e => setExampleIndex(Number(e.target.value))}>{[0, 1, 2, 4].map(i => <option key={i} value={i}>{controls[i].entry.name.replace('Control insert · ', '')}</option>)}</select></label>
      <label>Formula / vision share<output>{pct(formulaWeight)} / {pct(1 - formulaWeight)}</output><input aria-label="Visual example formula share" type="range" min="0" max="1" step="0.05" value={formulaWeight} onChange={e => setFormulaWeight(Number(e.target.value))} /></label>
      <label>Admission threshold<output>{pct(threshold)}</output><input aria-label="Visual example admission threshold" type="range" min="0.01" max="1" step="0.01" value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></label>
    </div>
    <div className="vision-steps">
      <section className="vision-step" aria-label="Normalize and align curves">
        <span className="eyebrow">01 / SHARED PREPARATION</span><h3>Align the shapes</h3>
        <Plot entries={[entry, reference]} normalized shifts={[0, images.phase]} title="Query and strongest reference after normalization and circular alignment" />
        <div className="example-legend"><span>━ Query</span><span>┄ Reference</span></div>
        <p>Remove centre and excursion, sample 128 cycle phases, then circularly shift the reference by {pct(images.phase)} of a cycle. Both scoring paths use this alignment.</p>
        <div className="vision-score"><span>Formula path</span><strong>{pct(best.rawFormula)}</strong><code>F = exp(−d)</code><small>Shape distance d = {best.distance.toFixed(4)}. Lower distance gives higher similarity. Grouping scale weights, when enabled, also enter d.</small></div>
      </section>
      <section className="vision-step" aria-label="Curve image overlap">
        <span className="eyebrow">02 / IMAGE COMPARISON</span><h3>Compare the pixels</h3>
        <div className="vision-image-grid"><Pixels pixels={images.query} label="Query image" /><Pixels pixels={images.aligned} label="Aligned reference image" /><Pixels pixels={images.intersection} label="Shared intensity · min(A, B)" color={[163, 218, 194]} /><Pixels pixels={images.union} label="Total intensity · max(A, B)" color={[233, 185, 135]} /></div>
        <p>Each curve becomes a 128 × 32 image with soft edges. Bright pixels follow the curve; axes, labels and region colours are excluded.</p>
        <div className="vision-score"><span>Vision path</span><strong>{pct(images.vision)}</strong><code>V = Σ min(A, B) / Σ max(A, B)</code><small>More shared intensity relative to total intensity means a closer visual match. These enlarged images show the actual pixels used by the classical vision method.</small></div>
      </section>
      <section className="vision-step" aria-label="Weighted similarity and decision">
        <span className="eyebrow">03 / WEIGHTED RESULT</span><h3>Combine the evidence</h3>
        <div className="vision-equation"><span>Formula</span><strong>{pct(formulaWeight)} × {pct(best.rawFormula)}</strong><output>{pct(formulaContribution)}</output><span>+ Vision</span><strong>{pct(1 - formulaWeight)} × {pct(images.vision)}</strong><output>{pct(visionContribution)}</output></div>
        <div className="vision-score"><span>Combined similarity</span><strong aria-label="Visual example combined similarity">{pct(best.combined)}</strong><code>S = αF + (1 − α)V</code></div>
        <div className="vision-meter" role="img" aria-label={`Formula contributes ${pct(formulaContribution)}, vision contributes ${pct(visionContribution)}; threshold ${pct(threshold)}`}><span className="formula-contribution" style={{ width: pct(formulaContribution) }} /><span className="vision-contribution" style={{ width: pct(visionContribution) }} /><i style={{ left: pct(threshold) }} /></div>
        <div className="vision-meter-legend"><span>Formula</span><span>Vision</span><span>│ Threshold {pct(threshold)}</span></div>
        <div className={`vision-decision ${assignment.created ? 'creates' : 'joins'}`} role="status"><strong>{assignment.created ? 'Create a new group' : `Join ${region.name}`}</strong><p>Strongest candidate: {region.name}. {pct(best.combined)} {assignment.created ? '<' : '≥'} {pct(threshold)} admission threshold.</p></div>
      </section>
    </div>
    <div className="vision-candidates"><h3>Which group wins?</h3><p>For each reference group, compare its three fixed examples and keep its highest combined score. Compare all {assignment.candidates.length} groups; the strongest group joins only if it reaches the threshold. These are the top three for this query.</p><ol>{assignment.candidates.slice(0, 3).map(candidate => <li key={candidate.regionId}><span>{atlas.regionSet.regions.find(r => r.id === candidate.regionId)!.name}</span><output>{pct(candidate.combined)}</output></li>)}</ol></div>
    <p className="small-note">This example uses raw shape-only scores and temporary controls; it does not change saved settings or insert cycles. With a calibration profile, each raw score is mapped before blending. Vision measures resemblance, not a match probability, and uses image overlap rather than a trained neural network.</p>
  </figure>;
}
