# Curve-image matching feasibility, 2026-10-12

The bounded synthetic spike found no improvement over the current numerical matcher. At a fixed 0.85 comparison cutoff, the 70% numerical / 30% adapted-pixel probe rejected four additional labelled positive pairs; pixel-only rejected 41. The 36-window complete-link experiment changed from 15 numerical groups to 18 blended groups (20 pixel groups). This supports keeping pixels experimental, with no product integration or proposed default change.

These are construction checks, **not measured accuracy or a calibrated pixel threshold**. No real observations, trained model, human ground-truth study, or held-out measured corpus were used.

## Pinned primary sources

The inspected workspace HEAD was `5f96968475042b475e727bf580a2c4ac6152b2ec`; refreshed `origin/main` remained `946cbdb978b7b8651bc4079d52f06df3a39ce698`. The workspace `src/vision.ts` was verified byte-identical to that main commit.

* Main's [curveImage, lines 3–10](https://github.com/iLikeToLie/signal-atlas/blob/946cbdb978b7b8651bc4079d52f06df3a39ce698/src/vision.ts#L3-L10) renders a normalized scalar trajectory into 32 rows by default using a Gaussian width of 1.5 pixels. Its index modulo permits circular shifts. [imageSimilarity, lines 12–18](https://github.com/iLikeToLie/signal-atlas/blob/946cbdb978b7b8651bc4079d52f06df3a39ce698/src/vision.ts#L12-L18) computes soft min/max intersection-over-union, not feature extraction by a learned vision model.
* The old catalogue [grouping defaults, lines 9–11](https://github.com/iLikeToLie/signal-atlas/blob/946cbdb978b7b8651bc4079d52f06df3a39ce698/src/grouping.ts#L9-L11) use 0.7 formula weight and 0.65 threshold. [Lines 50–56](https://github.com/iLikeToLie/signal-atlas/blob/946cbdb978b7b8651bc4079d52f06df3a39ce698/src/grouping.ts#L50-L56) supply a numerical comparison's shift to image overlap. Neither the old calibration nor its 0.65 cutoff is transported here.
* Current [numerical alignment and evidence, lines 40–65](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/agilityMatching.ts#L40-L65) match event-index fractions jointly, skip missing values/breaks, require distinct supported measurements, and track simultaneous selected-channel evidence. [Lines 71–72](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/agilityMatching.ts#L71-L72) combine normalized shape error and shared relative-time error. Current [defaults, line 11](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/agilityModel.ts#L11) are provisional 0.85 with Frequency/PRI/PW selected and minimum overlap 16.
* [Selected-channel resolution and window eligibility, lines 12–32](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/agilityComparison.ts#L12-L32) require unambiguous supplied channels and sufficient simultaneous measurements. [Symmetric whole-window grouping, lines 9–19](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/agilityGrouping.ts#L9-L19) uses the weaker direction and [actual completeLinkage](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/src/completeLinkage.ts#L9-L65), rather than accepting a nearest representative.
* [Stage0 constructions and fixture intent](https://github.com/iLikeToLie/signal-atlas/blob/5f96968475042b475e727bf580a2c4ac6152b2ec/scripts/generate-agility-controls.ts#L43-L96) supply unit conversion, scale, changed PRI coordination, contiguous partial, missing/disjoint measurements, duplicate lineage and noise examples. Their review/evidence labels are not classifier truth labels.

## Exact test adaptation

`artifacts/pixel-matching-spike/run.ts` imports the actual vision functions unchanged, plus the actual current numerical matcher, selected-channel resolver, eligibility checker and complete-link implementation. Everything surrounding curve-image rasterization is a **test adaptation**, not main's original matcher:

1. Take the current bounded sampled WindowView points (maximum 128). Align every selected channel through one event-index fraction mapping and nearest target point. There is no independent-channel shift, interpolation, cycle inference or repeated-cycle extension. A 64-event synthetic view retains those events.
2. Normalize each channel independently by its observed min/max inside the compared query/target interval to `[-0.5, 0.5]`. Positive scale/offset and compatible unit conversion therefore cancel. Actual numerical selected-evidence gating checks compatibility; pixels do not establish units or measure absolute levels. Two constant channels use the central curve; constant-versus-varying gets zero agreement to retain the current morphology policy.
3. Rasterize each channel with shift zero, height 32 and main's Gaussian width. At a position lacking any selected measured channel, or marked by a channel break in either view, zero **both** image columns. No missing sample is interpolated across a break. Joint masking is stricter than the numerical matcher's per-channel shape accumulation, so their supports can differ. Placeholder zero values used before masking are not evidence. Empty masked overlap can have an uninformative numerical image score; the actual selected-evidence gate prevents acceptance.
4. Arithmetic mean of per-channel soft IoU is stored separately as `rawPixel`. `pixelScore` multiplies that by `exp(-2*sqrt(mean(shared normalized time error²)))`, using the same aligned positions where all channels are present. This added temporal penalty is current-policy-inspired adaptation, **not unchanged main behavior**. Absolute and duration weights remain zero in the fixed current settings.
5. Acceptance requires actual numerical `selectedEvidenceComplete` and actual eligibility of both windows. Pixel-only here means replacing the score under those gates; it cannot bypass them. Blend is the preselected historical-weight probe `0.7*numeric + 0.3*pixelScore`; the cutoff stays 0.85 throughout. No weights, row heights, blur widths or cutoffs were fitted to the outcomes.
6. Partial pixels only rerank the current numerical matcher's proposed contiguous target interval. `partial.pixelRerank` is **not an independent pixel subsequence search**, retrieval improvement or full-window grouping edge.
7. `unsafeCircular` separately maximizes each channel's circular pixel alignment, ignores shared time and masking, and averages those maxima. It is intentionally unsuitable for nonperiodic observations and is never used for eligibility/grouping.

## Workload and results

There are 398 directional cases: 14 comparisons to Stage0's first recording; six construction families (step, hop, dwell, steady, ramp, curved) × eight deterministic seeds × eight transformations. The latter cover positive affine scale/offset, value noise at 0.004/0.015/0.04 of prescribed channel excursions, event-time jitter, reversed PRI, independently rotated PRI and disjoint measurement supports. Frequency/PW stay unchanged in the PRI adversaries. Step/ramp/curved/steady templates recur across seeds; seeded hop/dwell levels and noise differ. This is six families, not 398 statistically independent observations.

The audit labels 236 positive resemblance cases, 83 negative coordination/shape cases, 78 unresolved cases and one known partial interval. Constant-plus-noise cases are unresolved: adding varying noise to an exactly constant channel changes the current constant/varying morphology classification. Stage0's duplicate is positive *shape resemblance* with shared-lineage caveat, not independent identity/support evidence; missing/noisy/extra-channel Stage0 labels are kept descriptive. Those taxonomy corrections preceded the final run after the first draft's index-based Stage0 labels were checked against the actual fixture intent. They do not alter scores or thresholds.

| Fixed-cutoff result on labelled cases | Numerical | Adapted pixel | 70/30 probe |
|---|---:|---:|---:|
| Positive pair rejections (“false splits” within these constructions) | 0 | 41 | 4 |
| Negative pair acceptances (“false merges” within these constructions) | 0 | 0 | 0 |
| Incomplete-evidence cases accepted (51 ineligible cases) | 0 | 0 | 0 |
| Complete-link groups, 36-window diagnostic | 15 | 20 | 18 |

The cutoff is shared for a historical-weight sensitivity probe, **not separately calibrated for each technique**. Added rejections/group separations can therefore reflect score compression under an uncalibrated cutoff; they do not establish definitive relative predictive performance. Across the 236 eligible labelled positives and 83 eligible labelled negatives, numerical scores had a minimum positive of 0.864 and maximum negative of 0.488 (descriptive gap 0.377). The blend had minimum positive 0.799 and maximum negative 0.571 (gap 0.229); pixel scores had minimum positive 0.648 and maximum negative 0.764 (overlapping ranges). Positive/negative medians were numerical 0.994/0.315, pixel 0.980/0.689, blend 0.990/0.427. These constructions give numerical and blended scores separable ranges, while pixels preserve exact affine invariance but compress noise positives and reward the two unchanged channels in coordination negatives. No separation improvement is observed here; other observations or calibrated representations could differ.

Full precision and every case/interval are in `results.json`; `scores.csv` is the compact whole-window table. Selected examples:

| Case ID | Numerical | Raw pixel | Pixel + time | Blend | Observation |
|---|---:|---:|---:|---:|---|
| `stage0-0-1` | 1.000 | 1.000 | 1.000 | 1.000 | MHz/GHz equivalent |
| `stage0-0-2` | 1.000 | 1.000 | 1.000 | 1.000 | Shared time/amplitude scale-offset survives |
| `stage0-0-3` | 0.334 | ~0.662 | 0.662 | ~0.432 | Changed PRI coordination rejected |
| `stage0-0-4` | 0.245 | 0.089 | 0.087 | 0.197 | Whole-window fails; numerical interval `[16,48)` reranks to pixel 1.000 |
| `stage0-0-6` | 0.877 | 0.702 | 0.702 | 0.825 | Missing-value fixture was numerically eligible; hybrid removes acceptance; fixture has no claimed cutoff truth |
| `hop-2-noise-0.04` | 0.899 | 0.710 | 0.710 | 0.842 | Added split at fixed cutoff |
| `dwell-2-noise-0.04` | 0.872 | 0.652 | 0.652 | 0.806 | Added split at fixed cutoff |
| `dwell-6-noise-0.015` | 0.944 | 0.840 | 0.840 | 0.913 | Pixel-only split; blend retains numerical acceptance |
| `step-1-pri-circular` | 0.225 | 0.707 | 0.707 | 0.369 | Joint approach rejects; unsafe independent circular score is 1.000 |
| `steady-1-noise-0.004` | 0.018 | 0.000 | 0.000 | 0.013 | Constant/varying policy affects even small noise; unresolved |

All 48 affine-scale construction pairs retain acceptance. The 40 nonsteady PRI-circular negatives have unsafe independent-channel scores above 0.999 while the joint fixed-cutoff decisions reject them. Averaging unchanged channels still gives appreciable raw image similarity to changed coordination (the step example is 0.707); a lower transferred catalogue cutoff would require separate validation.

The four added blended positive rejections are `hop-2-noise-0.04`, `dwell-2-noise-0.04`, `dwell-6-noise-0.04`, and `dwell-8-noise-0.04`. In addition, `stage0-0-6` loses its current eligible acceptance, without a ground-truth match label. No numerically rejected case became blended accepted, and no labelled positive was rescued by pixels.

Grouping computes both directed **whole-window** scores, takes their minimum under actual evidence gates, and supplies that matrix to actual `completeLinkage`. It uses four views per family at seed 1 (base, affine, medium noise, reversed PRI), plus base/high-noise seed 2 for each family. Seed-2 group diagnostics were added after the first 24-window grouping was unchanged; this is a deliberately enriched regression diagnostic, not a held-out group benchmark. Relative to numeric groups, hybrid separates noisy hop-2 and dwell-2 pairs, and separates curved-2's high-noise member from a wider complete-link group even though its own base-pair blend passes. That last case demonstrates why pairwise positives do not guarantee unchanged groups. Pixel-only additionally separates the step/ramp high-noise members. Full group membership is preserved in the JSON; no group is inferred from partial matches.

## Timing and reproducibility

The first finalized run used Node `v24.21.0`, Darwin `27.0.0`, arm64, reported CPU `Apple A18 Pro`. Warm timing uses one 64-event hop pair, ten warm-up calls followed by nine repeats of 100 directed whole-pair calls; that run's median per call was:

| Operation | Median ms / directed pair |
|---|---:|
| Current numerical whole-window comparison | 0.0412 |
| Adapted pixel calculation alone | 0.1070 |
| Numerical gate + pixel/blend calculation | 0.1465 |

These are local warm microbenchmarks, not universal application latency. Pixel-only timing excludes numeric eligibility enforcement; the gated blend includes it. Group bidirectionality adds work, and independent circular scanning is intentionally not a production-performance candidate. The first finalized complete spike command took approximately 3.4 seconds including assertions, all directional partial reranks, groups, warm timings and output writing. An independent parent-agent rerun exited 0 with the same 398 cases, rejection counts 0/41/4, and group counts 15/20/18; repeat medians were 0.041238 ms numerical, 0.104105 ms pixel, and 0.142985 ms gated blend. `results.json` contains that latest repeat's timing values; the table records the first finalized run.

Run from the repository root (Node 24+; existing project dependencies):

```sh
node artifacts/pixel-matching-spike/run.ts
```

The script self-checks exact image identity, affine positives, disjoint evidence rejection, and the unsafe circular coordination counterexample. Derived outputs are written only into ignored `artifacts/pixel-matching-spike/`. No source, production tests, package files, schema, datasets, matching controls or UI were changed by this spike; no commit/branch operation was performed.

## Recommendation and limits

Keep the numerical matcher and current eligibility policies. The unchanged curve renderer is reusable as an explanatory diagnostic, but this spike provides no evidence for adding its overlap score to current decisions. Even conservative reranking must retain complete selected evidence and shared alignment; reranking the same numerical-selected interval is complementary presentation, not independently retrieved support.

Skipped real-capture validation, calibration fitting, image subsequence search and browser/full-suite checks. Main's blur/height and the provisional current cutoff are not calibrated together; bounded sampling, interval-dependent min/max sensitivity, constant-channel noise treatment and joint-support masking remain material limits. Behaviour resemblance and shared source lineage do not establish emitter identity.
