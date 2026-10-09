# Methodology and evaluation

1,000 deterministic clean entries: 124 each from sinusoidal, triangular, rounded triangular, asymmetric rise/fall, sweep/dwell, multi-harmonic, plateau/shoulder and periodic blend generators; eight additional diagnostic controls. The original 104 entries retain their IDs and samples. Each family adds 28 morphologies × four period/excursion variants, including unequal sweep timing, varying dwell lengths, phase-warped rises and multiple lobes. Generation can vary timing; matching never time-warps it. Controls isolate circular start shifts, time scale, excursion, centre shifts, dwell timing, time reversal and frequency reflection.

Samples represent one cycle, normally 256 unique uniformly spaced samples plus the repeated endpoint. All core curves are continuous at the join; smooth analytic generators have smooth joins, while triangles have permitted corners. Sample interpolation is piecewise linear, so sampled representations do not promise differentiability. Seed, generator version, parameters, units, sampling convention and stable ID are retained. `tu` and `fu` are explicitly arbitrary time/frequency units, not carrier bands or established emitter types.

Frequency excursion is max(f) − min(f), **not occupied RF spectral bandwidth**. This is a frequency trajectory, not IQ, a spectrogram or a complete amplitude/phase waveform. Periodic instantaneous frequency does not imply periodic RF phase.

## Similarity

1. Interpolate each complete cycle onto a common **128-point phase grid**.
2. Centre at `(max(f) + min(f)) / 2`, divide by excursion, try every circular shift and retain the minimum RMS morphology distance. No reflection, reversal or local time warping is allowed.
3. Compute scale terms separately: `abs(log2(Ta/Tb))` and `abs(log2(Ea/Eb))`.
4. Combine: `d = sqrt(ws × RMS² + wt × log2(Ta/Tb)² + we × log2(Ea/Eb)² + wc × C²)`.

Defaults: morphology **0.65**, period **0.20**, excursion **0.15**, centre **0**. C is the absolute midrange-centre difference divided by the pair's mean excursion. Ignoring absolute centre is an adjustable assumption, not an established domain rule. Weights are coefficients, not probabilities, and need not sum to one. Changing them changes pair distances and neighbour rankings; the map remains arranged by groups. Physical time units s/ms/us and frequency units Hz/kHz/MHz/GHz convert to seconds/Hz before scale comparison. Arbitrary and physical scales cannot be mixed in combined comparison; no inferred conversion between them is attempted. Shape-only matching is dimensionless, so it can compare a physical observation with arbitrary synthetic references. Custom metrics only require compatible units for the scale terms whose weights are positive.

Circular shift invariance is exact for shifts on the phase grid and approximate otherwise. Interpolation, noise and coarse sampling affect precision. Relative dwell timing remains meaningful. Reversal/reflection of an asymmetric curve normally changes distance; symmetric curves can legitimately be equivalent under an allowed circular shift. Very fast features may require a larger phase grid.

## Persistent library, discovered groups and map

`src/library.ts` builds a symmetric pair-similarity matrix for the full visible collection: synthetic examples, complete-cycle imports and approved recording windows. It uses the existing formula/vision blend, with no scoring-weight changes in this preview. `src/completeLinkage.ts` performs deterministic agglomerative complete linkage: merge the two clusters with the strongest minimum cross-member similarity, update merged similarities by taking minima, and stop when the best remaining merge falls below the threshold. No minimum or maximum group count is imposed. Stable signal IDs break numerical ties; arrival order and generator labels do not select membership.

The heap-based implementation uses O(n²) storage and O(n² log n) heap operations. Equivalent normalized shapes reuse scores only after equivalence is verified within 1e-12; active scale weights and unit compatibility remain part of that verification. The rounded 1e-6 shape signature is only a cache candidate/support proxy, not sufficient evidence for equivalence. All comparisons and admission boundaries tolerate 1e-12 floating-point residuals. The initial 1,000 examples remain within the worker-based preview's scale; full 10,000-signal grouping is not validated.

Each group's medoid maximizes summed combined similarity to its distinct metric-equivalent member shapes. Candidate medoids prefer members with clear cohesion and no reconstruction-review flag; if none are clear, choose among well-observed members, or retain a visibly uncertain representative when every member needs observation review. Repeated copies count once in this objective. Clear core diversity can add two coverage representatives, but representative choice never weakens the every-pair boundary.

At unchanged defaults, the full catalogue produces **30 Frequency groups / 29 PRI groups**. These are results, not requested counts. Triangular 080 and 109 still occupy separate groups despite their 69.82% mutual similarity: whole-group cohesion, rather than a founder's 64.37% score, controls the boundary. Complete linkage can fragment a broad family, and collection growth can change automatic memberships. It is a greedy hierarchy, not an optimal minimum-group partition or proof of physical classes.

Explicit reviewed groups constrain clustering, retain their stored identities/names, and do not merge automatically with each other. Their saved member placements must pass every-pair cohesion; missing identities or incompatible placements pause with warnings, leaving stored decisions recoverable. Representatives are recomputed even in reviewed groups. Acknowledgments are scoped to algorithm, group composition and settings. Source support, reconstruction review, conservative split/merge proposals and persisted undo remain separate. [Exact policy](group-growth.md).

The historical catalogue's 12-way alternating k-medoids partition is retained only for reproducibility and fixed-reference evaluation. Its memberships and calibration results do not validate this complete-link library grouping.

`layoutLibrary` allocates separate hex-grid tiles within disjoint group areas and expands the canvas. Colour shows membership. There is one map; no exact/similarity-position mode. Spacing, area outlines and group order do not encode numerical distance or confidence. Filters keep the completed layout's coordinates; a regroup or collection growth can change area sizes and positions. Neighbour ranking and Compare use actual signal distances.

## Automatic grouping and standard CV pixel overlap

Default admission uses shape-only formula feature weights, a **65%** threshold, and **70% formula / 30% vision**:

```text
formula similarity = exp(−weighted signal distance)
combined similarity = α × formula similarity + (1 − α) × vision similarity
```

The formula is the existing circularly aligned RMS/period/excursion/centre comparison. Grouping has its own weights and is unaffected by changes to browsing weights. Adding period, excursion or centre weights requires compatible arbitrary/physical unit domains, even if the formula share is zero. Frequency and PRI always group separately.

`src/vision.ts` provides the classical computer vision component enabled in the default blend: rasterize normalized curves into 128 × 32 soft grayscale images, phase-align using the signal comparison, then compute soft intersection-over-union (`sum(min(pixelA, pixelB)) / sum(max(pixelA, pixelB))`). A 1.5-pixel Gaussian line width gives small noise some tolerance. No axes, labels or colours enter the image. This baseline needs no trained model or cloud service. This is a working pattern-comparison technique, not evidence that vision improves accuracy. The scores lie in [0, 1] but are heuristic similarities, not calibrated probabilities. Thresholds and blend weights need evaluation on held-out measured examples before making accuracy claims.

Known-cycle imports remain in `frequency-agile-atlas.imports.v1`, originals/extracted windows remain in `frequency-agile-atlas.measured.v1`, and applied per-quantity settings use `frequency-agile-atlas.grouping.v2`. Unified library review decisions and the last 20 undo snapshots use `frequency-agile-atlas.library-review.v1`. Existing explicit decisions are carried forward where possible; absent old catalogue targets pause visibly. Older review storage stays untouched for recovery. Invalid data and failed writes do not overwrite recoverable storage.

The synthetic-inclusion preference is a view choice: hiding examples removes them from the active clustering collection without deleting stored measured data. Decisions with hidden anchors pause until those anchors return. Fixed-catalogue calibrated scores and thresholds cannot transfer to discovered groups; uncalibrated defaults are used with a notice, preserving saved profiles.

## Review demonstration and historical controls

**Try group review demo** is an isolated complete-link group with a tighter subgroup available for a reviewed split. Its decisions never write library storage. The five fixed inserts in `src/controlInserts.ts` remain test fixtures for the historical reference-admission benchmark, rather than live discovery expectations.

## Evaluation and score calibration

The independent-reference evaluation below validates frozen-anchor admission; it does not evaluate adaptive local growth or reviewed split quality.

Open **Evaluate and calibrate grouping** (historical fixed-catalogue benchmark) in the atlas, then **Run evaluation**. The worker compares five frozen configurations: raw formula at the legacy 82% threshold, raw formula with a tuned threshold, calibrated formula, calibrated hybrid, and the default raw 70/30 hybrid at its 65% threshold. It reports known-region assignment, unfamiliar rejection, false merges, false splits, wrong-region assignments, source bootstrap intervals, per-region coverage, mistakes, and score reliability bins. Export the dataset and complete JSON results for review.

The protocol has three source-separated roles:

1. **fit:** fit monotonic logistic mappings independently for formula similarity and vision overlap. Positive pairs match the example's labelled reference region; negative pairs include other regions and all unfamiliar examples. Match/non-match classes receive equal total weight. Parameters use standardized input scores, a nonnegative slope, bounded intercept/slope and a fixed regularizer.
2. **tune:** freeze the mappings, then select the admission threshold and blend share using balanced accuracy. Hybrid shares are 25%, 50%, or 75% formula. Ties prefer fewer unfamiliar false merges, then more formula weight, then a threshold closer to 0.5. When hybrid and formula-only tuning results tie, the recommendation stays formula-only.
3. **test:** apply the frozen configurations to the held-out sources once. Test outcomes never select the model, weights, threshold or recommendation. Repeated manual experiments against the same test set would compromise that holdout; collect fresh test sources before treating further tuning as independently validated.

Formula feature weights are held at the current grouping values during evaluation, not searched. A calibrated score is evidence under an artificial balanced pair prior, **not an operational probability**. Balanced Brier error and five-bin expected calibration error describe representative-pair agreement under that same weighting; these diagnostics are separate from actual grouping accuracy.

Every test cycle is evaluated independently against the fixed reference representatives. This protocol evaluates reference admission and region assignment; it does not benchmark order-dependent growth of local groups. Existing insertion tests exercise new founders and repeats separately. Balanced accuracy is `(correct known-region assignments / known examples + correctly rejected unfamiliar examples / unfamiliar examples) / 2`. A known cycle admitted to the wrong region is an error even if its join/new decision is correct.

The benchmark can export its recommendation and results, but the library UI does not apply fixed-catalogue calibration to discovered groups. Profiles remain tied to their dataset, quantity, comparison protocol, formula weights and historical reference fingerprint. Evaluation does not alter library groups, imports or settings.

### Bundled synthetic benchmark and its limits

There are 72 fresh query cycles per quantity: **24 fit, 24 tune and 24 test**, each split containing 18 known-region variants from six distinct source morphologies plus six unfamiliar sources. Each known source supplies three deterministic noise levels with shifted phase, changed period/excursion and shifted centre. Unfamiliar cycles use separately generated high-lobe trajectories. Seed: **20261007**. These are separate from the demonstration inserts.

Source morphology signatures are canonicalized over all 128 circular shifts and rounded to 1e-8. Exact active representative curves are excluded, and normalized duplicate sources cannot cross splits. Only six of the twelve reference regions have enough additional distinct morphologies for all three roles; the other regions have **no known test coverage** and are listed as excluded. Labels come from the immutable catalogue membership of each source, rather than the score or threshold being tested.

The original catalogue clustering saw these source templates. This is a **synthetic reference-region consistency benchmark**, not evidence for physical emitter classes, an independent clustering holdout, or measured-data accuracy. A 500-replicate stratified bootstrap resamples whole known/unfamiliar source groups, keeping their variants together. Paired hybrid changes use the same source samples. Intervals describe observed source variability only; with perfect observed scores they can collapse to zero width and do not imply unseen-data certainty.

The shipped raw 70% formula / 30% pixel-overlap blend at a 65% threshold scored **91.7% Frequency** and **88.9% PRI** balanced test accuracy in the v0.1.2 release checks. The legacy raw formula-only configuration at an 82% threshold scored **100.0%** and **94.4%** on the same held-out synthetic sources. The default blend therefore has not established an accuracy advantage. Existing saved profiles are preserved; evaluation recommendations are applied explicitly.

Calibrated profile results, distinct from the shipped raw default:

| Quantity | Raw formula | Calibrated formula | Calibrated hybrid (75% formula) | Tune-only recommendation |
| --- | ---: | ---: | ---: | --- |
| Frequency | 100.0% | 100.0% | 100.0% | Formula-only; threshold 45.0% |
| PRI | 94.4% | 94.4% | 97.2% | Formula-only; threshold 47.5% |

Values are balanced test accuracy on **24 examples / 12 sources** per view. PRI hybrid improves one known assignment, but its paired change interval is **0.0–8.3 percentage points**, so this small test does not establish a hybrid advantage. Calibration improves balanced pair Brier error: formula **0.2631 → 0.0567** for Frequency and **0.2593 → 0.0510** for PRI. Neither change in score scaling alone establishes better grouping accuracy.

### Human-labelled measured examples

Use **Load labelled dataset** to evaluate your own complete cycles against the displayed reference regions. Export the bundled dataset as a complete schema example:

```json
{
  "version": 1,
  "id": "measured-capture-study-1",
  "quantity": "frequency",
  "description": "Human-labelled captures from separate acquisition sessions",
  "examples": [
    {
      "sourceId": "acquisition-session-a-signal-1",
      "split": "fit",
      "expectedRegionId": "region-blend-025",
      "entry": { "id": "local-eval-capture-1", "...": "complete-cycle fields" }
    }
  ]
}
```

The abbreviated example shows structure, not a runnable complete dataset. Each entry needs the existing complete-cycle schema (period, units, sampling and samples); use unique `local-eval-` IDs. For PRI, declare quantity `pri` on both the dataset and each cycle. Labels are a reference region ID or `null` for unfamiliar. Each of fit/tune/test needs both known and unfamiliar examples. All related captures, repeated observations and augmentations must share one `sourceId` and one split, with consistent labels. The loader rejects cross-split source IDs, exact normalized curve duplication across splits, active representative duplicates, invalid region labels and malformed cycles. Near-duplicate lineage and label quality remain the dataset author's responsibility. Limits: 500 examples / 5 MB. Dataset imports are temporary evaluation data, not saved signal imports.

Run the same protocol without a browser:

```bash
npm run evaluate
npm run evaluate -- frequency path/to/labelled-dataset.json
```

The default command writes reproducible reports to ignored local `artifacts/evaluation-frequency.json` and `artifacts/evaluation-pri.json`. The CLI uses shape-only formula weights; the browser uses current grouping feature weights. Neither route publishes data or changes saved grouping settings.


[Back to the README](../README.md).
