import results from './data/siamese-summary.json';

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
export function SiameseExperiment() {
  return <article className="vision-method siamese-experiment" id="siamese-experiment">
    <span className="eyebrow">06 / LEARNED VISION · EXPERIMENTAL</span><h2>Siamese CNN: a shared shape encoder</h2>
    <p>Two curve images pass through the same small convolutional network. Each becomes a 16-value, unit-length embedding. Similar embeddings point in similar directions; their cosine supplies the vision score. The encoder uses one unified Frequency and PRI corpus and receives no family labels, units or chart decoration.</p>
    <div className="siamese-pipeline" role="img" aria-label="Query and reference curve images pass through the same CNN weights into two embeddings. Cosine similarity becomes the vision score, then blends with formula similarity.">
      <div><span>Query image · 128 × 32</span><span>Reference image · 128 × 32</span></div><b aria-hidden="true">→</b>
      <div className="shared-encoder"><strong>Same CNN weights</strong><small>2 convolutions → pooling → projection</small></div><b aria-hidden="true">→</b>
      <div><span>Query embedding · 16 values</span><span>Reference embedding · 16 values</span></div><b aria-hidden="true">→</b>
      <div><strong>Vision V = (cosine + 1) / 2</strong><span>Combine: S = αF + (1 − α)V</span><small>Formula F = exp(−distance)</small></div>
    </div>
    <p>Training pairs are different observations of the same synthetic source. Random phase shifts encourage phase tolerance. Different sources act as contrastive negatives, except sources in the same leakage component. This learns instance resemblance; different sources can still belong to the same practical group.</p>
    <div className="evaluation-table"><table><caption>Frozen test: correct source retrieved first</caption><thead><tr><th>Scoring method</th><th>Overall</th><th>Frequency</th><th>PRI</th></tr></thead><tbody>{results.methods.map(method => <tr key={method.id}><th>{method.name}</th><td>{pct(method.recallAt1)}</td><td>{pct(method.byQuantity.frequency)}</td><td>{pct(method.byQuantity.pri)}</td></tr>)}</tbody></table></div>
    <p>{results.queries} noisy or sparse queries searched a gallery of {results.gallery} clean observations from {results.testSources} held-out sources, with candidates restricted to the same quantity. All observations of each source and near-duplicate component stay in one split. Training used 194 sources; validation selected epoch {results.selectedEpoch}; calibration supplied a provisional similarity threshold before the test was opened.</p>
    <div className="evaluation-recommendation"><strong>Decision: keep curve overlap as the default</strong><p>CNN change versus overlap: {(results.pairedChange.value * 100).toFixed(1)} percentage points. The paired 95% component bootstrap interval is {(results.pairedChange.componentBootstrap95[0] * 100).toFixed(1)} to {(results.pairedChange.componentBootstrap95[1] * 100).toFixed(1)} points. This experiment did not improve retrieval.</p></div>
    <p>Try it under Atlas → Grouping settings → Vision model → Siamese CNN, then Apply &amp; regroup. The formula blend and dynamic local group creation still apply. Switching models removes incompatible score calibration. Its suggested threshold describes same-source consistency, not validated semantic group admission.</p>
    <p className="small-note">One seed, synthetic data only. Retrieval from clean test support is not family classification, clustering accuracy or measured-data validation. The formula/CNN blend has not been benchmarked by this report. Model changes need fresh held-out evaluation data now that this test has been inspected.</p>
  </article>;
}
