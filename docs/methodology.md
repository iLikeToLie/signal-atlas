# Methodology and evaluation

1,000 deterministic clean entries: 124 each from sinusoidal, triangular, rounded triangular, asymmetric rise/fall, sweep/dwell, multi-harmonic, plateau/shoulder and periodic blend generators; eight additional diagnostic controls. The original 104 entries retain their IDs and samples. Each family adds 28 morphologies × four period/excursion variants, including unequal sweep timing, varying dwell lengths, phase-warped rises and multiple lobes. Generation can vary timing; matching never time-warps it. Controls isolate circular start shifts, time scale, excursion, centre shifts, dwell timing, time reversal and frequency reflection.

Samples represent one cycle, normally 256 unique uniformly spaced samples plus the repeated endpoint. All core curves are continuous at the join; smooth analytic generators have smooth joins, while triangles have permitted corners. Sample interpolation is piecewise linear, so sampled representations do not promise differentiability. Seed, generator version, parameters, units, sampling convention and stable ID are retained. `tu` and `fu` are explicitly arbitrary time/frequency units, not carrier bands or established emitter types.

Frequency excursion is max(f) − min(f), **not occupied RF spectral bandwidth**. This is a frequency trajectory, not IQ, a spectrogram or a complete amplitude/phase waveform. Periodic instantaneous frequency does not imply periodic RF phase.

## Similarity

1. Interpolate each complete cycle onto a common **128-point phase grid**.
2. Centre at `(max(f) + min(f)) / 2`, divide by excursion, try every circular shift and retain the minimum RMS morphology distance. No reflection, reversal or local time warping is allowed.
3. Compute scale terms separately: `abs(log2(Ta/Tb))` and `abs(log2(Ea/Eb))`.
4. Combine: `d = sqrt(ws × RMS² + wt × log2(Ta/Tb)² + we × log2(Ea/Eb)² + wc × C²)`.

Defaults: morphology **0.65**, period **0.20**, excursion **0.15**, centre **0**. C is the absolute midrange-centre difference divided by the pair's mean excursion. Ignoring absolute centre is an adjustable assumption, not an established domain rule. Weights are coefficients, not probabilities, and need not sum to one. Changing them changes distance scale and the reference embedding. Physical time units s/ms/us and frequency units Hz/kHz/MHz convert to seconds/Hz before scale comparison. Arbitrary and physical scales cannot be mixed in combined comparison; no inferred conversion between them is attempted. Shape-only matching is dimensionless, so it can compare a physical observation with arbitrary synthetic references. Custom metrics only require compatible units for the scale terms whose weights are positive.

Circular shift invariance is exact for shifts on the phase grid and approximate otherwise. Interpolation, noise and coarse sampling affect precision. Relative dwell timing remains meaningful. Reversal/reflection of an asymmetric curve normally changes distance; symmetric curves can legitimately be equivalent under an allowed circular shift. Very fast features may require a larger phase grid.

## Map and imports

### Named morphology regions

The 1,000 references are partitioned into **12 shape regions**, using only the circularly aligned, normalized RMS morphology distance described above. Period, excursion and absolute centre do not define these regions. They remain meaningful in the default combined neighbour ranking and comparisons. Using morphology avoids a partition driven mainly by period/excursion scale. Changing comparison weights changes rankings and the exact metric map, while region membership and colours stay stable.

The native TypeScript implementation uses deterministic **alternating k-medoids**: select the globally most central real cycle, add the farthest uncovered representatives, assign each entry to its closest representative, and update each representative to the member with the smallest summed within-group distance. Stable IDs break numerical ties. Stop when representatives no longer change, with a 30-round limit. This catalogue converges in six rounds. The representative is a real stored cycle, not an averaged waveform. See the [algorithm overview](https://scikit-learn-extra.readthedocs.io/en/stable/modules/cluster.html); no clustering library is added.

Twelve is a chosen browsing resolution, not a statistically estimated number of natural classes. All references are assigned; this algorithm does not detect outliers or prove that every member of a region is equivalent. Borderline curves may resemble several regions. Editorial names—such as **Echo Garden**, **Orbit Loom**, **Cloudline**, **Petal Loop** and **Amber Mesa**—are assigned after clustering, inspired by the representative's form. Generator labels affect the naming text only, never membership.

For display, each region becomes an uninterrupted tile island with an irregular stepped coastline placed near its mean position in the shape MDS projection. Patches receive gaps and label padding so they do not overlap. Tile order follows the shape projection. Shaded tile footprints enclose the displayed members; these are visual boundaries, not confidence contours. More members require more tile area, but label padding also affects island size. Added gaps do not encode quantitative distances. Search/filtering preserves tile coordinates.

### Exact projection and local observations

Classical metric multidimensional scaling (MDS) double-centres squared pairwise distances; fixed-seed power iteration finds two leading positive eigenvectors. Families never determine positions. Identical normalized grids are cached across scale variants at 1e-9 numerical precision. Projection cannot preserve every relationship, particularly for non-Euclidean distances. Stress is reported in Methodology (exact combined projection approximately 0.120). Rankings always use full comparison distances, never screen positions. **Similarity projection** removes group-island packing and adds collision-free display padding around metric positions. Equivalent curves keep their original metric relationship but have separate selectable tiles; colour still indicates grouping. Waveform transitions keep destination tiles fixed to avoid crossings. The measured workspace embeds only approved observations, with incompatible unit sets shown in separate illustrative components.

In the exact map, import positions use the inverse-square weighted average of the five closest compatible **reference catalogue** entries (exact matches use the exact reference point). These are tentative interpolations, not exact out-of-sample MDS solutions; even distant inputs can fall inside the reference display. A physical import may have no compatible combined-metric neighbours or exact-map point. Switch to Shape only for unit-free matching with the arbitrary-unit synthetic catalogue. Local imports can match other compatible local imports.

In the named-region view, local tiles use their automatically assigned group colour and dashed outlines. They occupy free cells around an assigned reference island, or a new island on an expandable shelf below the references. Reference tile coordinates remain unchanged. New groups appear in filters, grid cards, the inspector and the Regions page. A region containing different unit labels reports that fact instead of combining incompatible ranges.

The reference combined-distance calibration is `max(0.15, 1.5 × p95(nonzero leave-one-out nearest-reference distances))`, approximately 0.263 with defaults. Custom combined browsing weights recalibrate this diagnostic. It is separate from automatic group admission, which uses the similarity threshold below.

## Automatic grouping and standard CV pixel overlap

`src/grouping.ts` keeps the medoid and two fixed, evenly spaced catalogue-ID examples as identity anchors per reference region, and a fixed founder per automatic local group. It can add up to two coverage representatives after three distinct clear core shapes provide support. Admission still requires a qualifying match to a fixed anchor. Near-threshold or competing matches are flagged for review, and sparse reconstruction uncertainty is reported separately from unfamiliarity. Three distinct clear core shapes support a local group; member count alone no longer confirms it.

Reference memberships and identity anchors stay fixed. Coherent, separated fringe clusters can propose a split for explicit approval; no split happens automatically. Reviews, guarded reassignment, split decisions and the last 20 undo snapshots persist per quantity. Existing reviewed groups seed the replay before remaining imports process in insertion order. Removing an anchor or changing settings can pause a decision visibly. See [Group growth and review](group-growth.md) for exact margins, representative selection, decision persistence and limitations.

Default admission uses shape-only formula feature weights, a **65%** threshold, and **70% formula / 30% vision**:

```text
formula similarity = exp(−weighted signal distance)
combined similarity = α × formula similarity + (1 − α) × vision similarity
```

The formula is the existing circularly aligned RMS/period/excursion/centre comparison. Grouping has its own weights and is unaffected by changes to browsing weights. Adding period, excursion or centre weights requires compatible arbitrary/physical unit domains, even if the formula share is zero. Frequency and PRI always group separately.

`src/vision.ts` provides the classical computer vision component enabled in the default blend: rasterize normalized curves into 128 × 32 soft grayscale images, phase-align using the signal comparison, then compute soft intersection-over-union (`sum(min(pixelA, pixelB)) / sum(max(pixelA, pixelB))`). A 1.5-pixel Gaussian line width gives small noise some tolerance. No axes, labels or colours enter the image. This baseline needs no trained model or cloud service. This is a working pattern-comparison technique, not evidence that vision improves accuracy. The scores lie in [0, 1] but are heuristic similarities, not calibrated probabilities. Thresholds and blend weights need evaluation on held-out measured examples before making accuracy claims.

Cycles persist in the existing `frequency-agile-atlas.imports.v1` key; applied grouping settings now persist separately per quantity in `frequency-agile-atlas.grouping.v2`. Existing v1 settings are read into both quantities without modifying that saved value. The v2 key is written only when settings are explicitly applied. Reload reproduces assignments from the saved sequence, settings and per-quantity group decisions in `frequency-agile-atlas.group-review.v1`. Storage write failures leave the in-memory workspace unchanged. Invalid settings fall back to defaults with a notice while preserving the saved value.

## Control-insert demonstration

**Run control demo** starts a temporary workspace with default grouping settings and no saved imports. Insert each of five fixed controls from `src/controlInserts.ts`: a clear representative match, a deterministic noisy match, an unfamiliar eleven-lobed cycle, a phase-shifted repeat of that cycle, and a borderline mixture. Each row shows its default expectation, observed action and best score. The inspector shows candidate-group scores. Controls retain synthetic provenance and can be exported as JSON/CSV.

Default outcomes for both quantities are **join, join, create, join, create**. The shifted repeat joins but does not confirm its new group, because it repeats the same normalized shape. With the 70% formula / 30% vision blend, the final mixture scores about **60.3%** for Frequency and **62.4%** for PRI, below the 65% threshold. Adjusting the blend can change these outcomes; expected labels remain tied to defaults. **Reset demo** clears inserted controls, **Exit demo** restores saved imports, and switching quantity starts that quantity's sequence at step one. Demo settings and examples never write to localStorage.


## Evaluation and score calibration

The independent-reference evaluation below validates frozen-anchor admission; it does not evaluate adaptive local growth or reviewed split quality.

Open **Evaluate and calibrate grouping** in the atlas, then **Run evaluation**. The worker compares five frozen configurations: raw formula at the legacy 82% threshold, raw formula with a tuned threshold, calibrated formula, calibrated hybrid, and the default raw 70/30 hybrid at its 65% threshold. It reports known-region assignment, unfamiliar rejection, false merges, false splits, wrong-region assignments, source bootstrap intervals, per-region coverage, mistakes, and score reliability bins. Export the dataset and complete JSON results for review.

The protocol has three source-separated roles:

1. **fit:** fit monotonic logistic mappings independently for formula similarity and vision overlap. Positive pairs match the example's labelled reference region; negative pairs include other regions and all unfamiliar examples. Match/non-match classes receive equal total weight. Parameters use standardized input scores, a nonnegative slope, bounded intercept/slope and a fixed regularizer.
2. **tune:** freeze the mappings, then select the admission threshold and blend share using balanced accuracy. Hybrid shares are 25%, 50%, or 75% formula. Ties prefer fewer unfamiliar false merges, then more formula weight, then a threshold closer to 0.5. When hybrid and formula-only tuning results tie, the recommendation stays formula-only.
3. **test:** apply the frozen configurations to the held-out sources once. Test outcomes never select the model, weights, threshold or recommendation. Repeated manual experiments against the same test set would compromise that holdout; collect fresh test sources before treating further tuning as independently validated.

Formula feature weights are held at the current grouping values during evaluation, not searched. A calibrated score is evidence under an artificial balanced pair prior, **not an operational probability**. Balanced Brier error and five-bin expected calibration error describe representative-pair agreement under that same weighting; these diagnostics are separate from actual grouping accuracy.

Every test cycle is evaluated independently against the fixed reference representatives. This protocol evaluates reference admission and region assignment; it does not benchmark order-dependent growth of local groups. Existing insertion tests exercise new founders and repeats separately. Balanced accuracy is `(correct known-region assignments / known examples + correctly rejected unfamiliar examples / unfamiliar examples) / 2`. A known cycle admitted to the wrong region is an error even if its join/new decision is correct.

**Apply calibrated settings** explicitly saves and replays the selected quantity's local cycles. Evaluation itself does not alter groups, imports or settings. Profiles record the dataset fingerprint, quantity, comparison protocol, formula weights and reference fingerprint. Changing feature weights removes the draft profile and restores the raw 65% threshold; rerun evaluation for the changed weights. An incompatible saved profile is reported and preserved while defaults are used. Frequency and PRI profiles are separate. Applying settings in the control demo stays temporary.

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
