import { useEffect,useMemo,useRef } from 'react';
import { DEFAULT_MATCH } from './agilityModel.ts';
import type { MatchSettings } from './agilityModel.ts';
import { normalizeParameters,parameterLabel } from './agilityComparison.ts';
import { methodologyExamples } from './agilityMethodology.ts';

export function MethodologyPage({settings,onBack}:{settings:MatchSettings;onBack:()=>void}){
  const heading=useRef<HTMLHeadingElement>(null),examples=useMemo(()=>methodologyExamples(settings),[settings]);
  useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});},[]);
  const parameters=normalizeParameters(settings.parameters);
  return <article className="methodology-page" aria-label="Signal Atlas methodology">
    <span className="eyebrow">HOW THE OBSERVATION MAP WORKS</span><h1 ref={heading} tabIndex={-1}>From observations to evidence.</h1>
    <p className="methodology-lead">Signal Atlas compares coordinated numerical measurements across Frequency, PRI and pulse width. Similarity helps you explore behaviour; an analyst decides what the evidence supports.</p>
    <section aria-labelledby="workflow-title"><h2 id="workflow-title">The complete workflow</h2><ol className="methodology-flow">
      <li><strong>Import and validate</strong><p>Declare the emitter or candidate profile, units and event times. Invalid recordings are rejected; missing measurements remain missing.</p></li>
      <li><strong>Retain the source</strong><p>Save the intact original and a full-recording observation window. Additional windows reference exact start-inclusive, end-exclusive event intervals.</p></li>
      <li><strong>Represent the evidence</strong><p>Build numerical channel ranges and counts. Keep observed event order, gaps and provenance; use up to 128 sampled points for matching.</p></li>
      <li><strong>Compare the library</strong><p>A worker compares all observation windows using the selected parameters. Shared alignment preserves their coordination; whole and bounded partial intervals have separate evidence scopes.</p></li>
      <li><strong>Recompute similarity groups</strong><p>Eligible whole windows form complete-link groups. Every pair must pass the threshold; insufficient evidence stays separate. New inputs or applied settings can change memberships.</p></li>
      <li><strong>Inspect and review</strong><p>The map displays provisional relationships. Create a reviewed pattern, accept scoped support or a variant, challenge an interpretation, or leave it unresolved. Originals and review history stay retained.</p></li>
    </ol></section>
    <section aria-labelledby="score-title"><h2 id="score-title">What the score measures</h2><p>This observation-window matcher uses numerical shape and timing. It uses no pixel comparison, image embedding, CNN or other learned model.</p>
      <div className="methodology-formula" role="math" aria-label="Similarity equals the exponential of minus four times shape error, minus two times timing error, minus absolute weight times absolute error, minus duration weight times duration error">S = exp(−4D<sub>shape</sub> − 2D<sub>time</sub> − w<sub>a</sub>D<sub>absolute</sub> − w<sub>d</sub>D<sub>duration</sub>)</div>
      <dl className="methodology-terms">
        <dt>D<sub>shape</sub> · normalized shape</dt><dd>Each varying channel is normalized within its observed range. Shape error is the square root of the mean of the channels’ mean squared aligned errors. Selected channels contribute equally; a steady channel has no varying shape evidence.</dd>
        <dt>D<sub>time</sub> · relative event timing</dt><dd>Root mean squared error between aligned event times, expressed relative to each compared interval’s duration. One monotonic event-order alignment is shared across channels. PRI cannot be shifted independently to hide changed coordination.</dd>
        <dt>D<sub>absolute</sub> · absolute level</dt><dd>Mean channel midrange difference, normalized by the largest absolute bound for each pair. This penalty matters when w<sub>a</sub> is positive; ranges remain inspectable even when the weight is zero.</dd>
        <dt>D<sub>duration</sub> · duration scale</dt><dd>Absolute log<sub>2</sub> ratio of unit-compatible durations. Doubling duration gives an error of 1. This penalty matters when w<sub>d</sub> is positive.</dd>
      </dl>
      <h3>Defaults and your applied settings</h3><div className="methodology-table"><table><thead><tr><th>Parameter</th><th>Default</th><th>Applied in your map</th></tr></thead><tbody>
        <tr><th>Comparison channels</th><td>{DEFAULT_MATCH.parameters!.map(parameterLabel).join(' + ')}</td><td>{parameters.map(parameterLabel).join(' + ')}</td></tr>
        <tr><th>Candidate threshold</th><td>{DEFAULT_MATCH.threshold*100}%</td><td>{settings.threshold*100}%</td></tr>
        <tr><th>Shape / timing coefficients</th><td>4 / 2</td><td>4 / 2</td></tr>
        <tr><th>Absolute-level weight w<sub>a</sub></th><td>{DEFAULT_MATCH.absoluteWeight}</td><td>{settings.absoluteWeight}</td></tr>
        <tr><th>Duration weight w<sub>d</sub></th><td>{DEFAULT_MATCH.durationWeight}</td><td>{settings.durationWeight}</td></tr>
        <tr><th>Minimum aligned measurements</th><td>{DEFAULT_MATCH.minimumOverlap}</td><td>{settings.minimumOverlap}</td></tr>
      </tbody></table></div><p>Thresholds and weights are provisional development settings. The threshold is a decision boundary, not a blending weight. Percentages express resemblance, not probability or emitter identity.</p>
    </section>
    <section aria-labelledby="groups-title"><h2 id="groups-title">Why windows share a group</h2><p>Grouping compares whole windows in both directions and uses the smaller score:</p><div className="methodology-formula" role="math">G(A,B) = min(S<sub>whole</sub>(A,B), S<sub>whole</sub>(B,A))</div>
      <p>Both comparisons must have complete evidence for every selected parameter, including sufficient distinct simultaneous aligned measurements. Missing, modelled, ambiguous or incompatible selected channels cannot confirm a match. Reusing a sampled point does not add evidence.</p>
      <p>Complete linkage begins with individual eligible windows and merges the groups with the strongest minimum cross-group score, stopping below the threshold. Every pair in a resulting group must pass. A strong match to one representative is insufficient; collection growth can rearrange the greedy hierarchy. Groups are recomputed rather than assigned by a fixed classifier.</p>
      <p>A partial suggestion supports only a contiguous target interval. It never qualifies two whole windows for a group. Reviewed patterns are analyst interpretations; automatic similarity groups do not create those interpretations.</p>
      <h3>Similarity arrangement and emitter arrangement</h3><p>The same windows move between two arrangements. Similarity islands organize qualifying behaviour; emitter islands organize retained profile attribution. A and B can share behaviour while remaining separate profiles. Map proximity is an approximate browsing aid, not numerical distance or identification confidence.</p>
    </section>
    <section aria-labelledby="examples-title"><h2 id="examples-title">Worked examples, calculated now</h2><p>These synthetic construction controls use your applied comparison channels, threshold and weights. The displayed outcomes come from the current matcher, not stored expected percentages. They do not change your library.</p>
      <div className="methodology-examples">{examples.map(e=><section key={e.id} data-methodology-example={e.id}><h3>{e.name}</h3><p>{e.description}</p><strong>{e.score===null?'No comparable score':`${(e.score*100).toFixed(1)}% resemblance`}</strong><p className="small-note">{e.kind==='partial'?'Partial interval':e.kind==='whole'?'Whole-window comparison':e.kind==='partial-channel'?'Incomplete selected channels':'Insufficient evidence'} · {e.qualifying?'qualifying suggestion':'not a qualifying suggestion'} · {e.groupable?'pair passes whole-window group boundary':'pair does not pass whole-window group boundary'}</p></section>)}</div>
    </section>
    <section aria-labelledby="limits-title"><h2 id="limits-title">What remains uncertain</h2><ul><li>Matching samples at most 128 points per window and searches bounded candidate intervals. Long-window recall and partial endpoints are approximate; narrow the source window to inspect original events.</li><li>Synthetic controls demonstrate intended software behaviour. They establish neither measured-data accuracy nor physical emitter identity.</li><li>Supplied event-level Frequency/PRI/PW values are not a complete RF waveform. One frequency value per event does not describe an intra-pulse chirp, IQ or a spectrogram.</li><li>Duplicate or overlapping captures do not become independent supporting evidence. Analyst review retains exact source intervals and uncertainty.</li></ul></section>
    <button className="primary" onClick={onBack}>Return to observation map</button>
  </article>;
}
