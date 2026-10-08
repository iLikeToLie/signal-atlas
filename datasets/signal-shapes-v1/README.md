# Signal Shapes v1 — one unified, unlabeled signal corpus

This is a reproducible **synthetic morphology dataset**, not measured radar data or a set of verified physical signal classes. Frequency and PRI share one manifest, split policy, source lineage and generation process. Groups are discovered from the loaded signals; the generator forms below do not define the app's families or prescribe how many groups should exist.

## Files and upload

- `signals/<split>/signal-XXXXXX.csv`: one complete cycle per file. Frequency and PRI are mixed in these folders; each file explicitly declares its quantity.
- `manifest.csv`: inventory, quantities, conditions, source lineage, leakage components, sample counts, paths and SHA-256 hashes. **No family or cluster labels.**
- `test_labels.csv`: test-only source identities, generator forms and whether that construction form was withheld from development. Keep this sealed until the scoring method and settings are frozen.
- `validation-report.json` and `independent-audit.json`: generation checks, actual split sizes and independent file audit.
- `SHA256SUMS.txt`: fingerprints of signal files and reproducibility material. `corpusSha256` fingerprints that inventory.
- `reproducibility/`: audit-only generator code, construction ledger and validation script. These contain privileged construction information and must never be supplied to a model as input features.

Extract the ZIP. In the app, choose **Import cycle** and upload an individual CSV from `signals/`. Do not upload the manifest, label file or ZIP as a cycle. The current app accepts one cycle at a time and stores up to 100 local imports; it does not bulk-import this complete corpus. Use the full corpus offline for model evaluation. It also does not accept these test labels in its existing atlas-region evaluation panel, because those would incorrectly force labels to the current fixed reference regions.

CSV format is the app's existing format, with exactly `t,f` numeric columns:

```csv
# name: signal-000001
# quantity: frequency
# period: 1.5
# time_unit: tu
# frequency_unit: fu
# sampling: closed-endpoint
# source: synthetic
t,f
```

The example above shows the header structure only. The actual files contain complete samples and all metadata; upload those files directly. For PRI, `# quantity: pri` and `# frequency_unit: tu` apply; the existing `f` column contains the positive PRI value. `t` is elapsed time. The trajectory period is the period of the repeating pattern, not an individual pulse interval.

Units `tu` and `fu` are arbitrary synthetic units. Numeric values are not claims about hardware performance. Quantities remain explicit: a common morphology encoder may process both, while physical scale comparison must respect quantity and units. The app currently resets imported provenance to local-import/measured, including synthetic exports; preserve this package's manifest as the authoritative record of synthetic provenance.

## Construction

Master seed **20261007**, generator version **1.0.0**. Every source has seven independently seeded parameters. All observations derive from that source, with separate deterministic observation seeds. Dense 4,096-phase extrema standardize the latent waveform before scale and noise are added. The generator is independent of the atlas catalogue: it copies no catalogue cycles, uses no existing memberships and consults no similarity model for labels.

Eight development construction forms explore smooth single-lobe, asymmetric triangle, rounded triangle, smooth rise/fall, sweep/dwell, multi-harmonic, saturated shoulders and periodic blends. Smooth comb and pulse-pair forms supply development probes. Triangle comb and localized chirp forms occur only in the test set. These are **generation strata**, not immutable families, physical classes, or a requirement that clustering discover twelve groups. Closely resembling forms may reasonably join, and a broad form may reasonably split.

Each of **384 latent sources** produces **six observations**: three conditions for Frequency and the same three for PRI, giving **2,304 CSVs**. The paired quantities share `source_id` and a split; they are related views, not independent evidence.

| Final split | Sources | Signal CSVs |
|---|---:|---:|
| Train | 194 | 1,164 |
| Calibration | 47 | 282 |
| Validation | 48 | 288 |
| Test | 95 | 570 |

The near-duplicate audit found ten close pairs and 375 independent leakage components. None crosses the final split boundaries. Count components, rather than 2,304 observations, when estimating independence.

| Condition | Interior samples | Total including endpoint | Gaussian noise SD / latent excursion | Timestamp jitter |
|---|---:|---:|---:|---:|
| Clean | 256 | 257 | 0% | None |
| Noisy | 128 | 129 | 1% | None |
| Sparse and jittered | 64 | 65 | 3% | Up to ±25% of nominal sample interval |

Observation period is uniform in [0.8, 3.2) tu; latent midrange is [10, 20); latent excursion is [0.7, 3.0); start phase is [0, 1). Parameters vary independently of quantity and source construction. Actual centre and excursion in the manifest are recalculated from the resulting samples; noise can change them. All timestamps are increasing and both endpoints are included. Endpoint equality is part of constructing a periodic synthetic observation: the last value explicitly repeats the first. It is not evidence that noisy measured captures close perfectly. No import-time sorting, smoothing or repair is used.

## Split discipline

Start with deterministic source splits, aiming at 60% train / 10% calibration / 10% validation / 20% test for development forms. Keep every noise, sampling, scale, phase and quantity view of a source together.

Before writing observations, compare latent shapes on a 128-phase grid after removing their constructed start phase. Connect any pair whose minimum circular RMS is at most **0.005 of normalized excursion**. Connected components receive a single split from a deterministic anchor; transitive chains are kept together. This can change the planned ratios. The final counts in `validation-report.json` are authoritative. The threshold was defined during dataset design before any model benchmarking. A finite grid/cutoff cannot prove there is no remaining resemblance; similar independent shapes are legitimate hard cases. Source and leakage-component grouping are mandatory for resampling and uncertainty estimates.

Do not move individual observations between splits to improve a metric. Do not build references, train embeddings or fit normalization from test samples. Fit preprocessing on train only, reserve calibration for distribution calibration and validation for architecture/settings decisions, then evaluate test once. Calibration and validation contain no supplied semantic labels; supervised correctness calibration would require an independently defined development-label protocol, never borrowing test labels.

## What the test labels can support

`source_id` establishes that repeated views derive from the same latent signal; it does not mean every distinct source deserves a separate group. `generator_form` is construction truth, not semantic equivalence. `exposure` describes generator withholding, not proof that every such waveform must be rejected by a similarity model.

Use test labels to audit repeat-view stability, retrieval of a known source, sensitivity to noise/sampling/phase, and behavior on construction forms absent from development. Report morphology-based findings and generator-stratified results. If evaluating source retrieval with a test support gallery, declare that protocol and keep support/query roles explicit; that differs from classifying test sources against training references.

There is no universal ground-truth cluster partition in this package. Do not report generator-label classification accuracy as proof of correct dynamic grouping. Meaningful grouping quality needs an explicit task-level definition of acceptable resemblance, independently reviewed positive/negative pairs, and eventually held-out measured captures. Do not train the discovery process to reproduce the editorial atlas names.

## Reproduce and validate

From the repository root with Node 24+ and Python 3:

```text
node scripts/generate-dataset.ts
python scripts/validate-dataset.py
```

Generation reuses the actual app parser and asserts that all CSV samples, periods and units round-trip unchanged, IDs are unique, and no exact normalized observation crosses splits. The separate Python audit verifies all hashes, file completeness, boundaries, timestamps, quantities, PRI positivity, source/component split isolation and test-label coverage. It uses only the Python standard library.

Regenerate into a fresh directory when changing the generator; freeze this version's manifest and checksums before experiments, and create a new dataset version for later changes. The copied script is audit material; rerun the repository script with its imported source modules, not the copied script in isolation. Record the dataset fingerprint, model/version, preprocessing, reference construction, tuned parameters, metric definitions and source/component bootstrap intervals with every result. Generated augmentations are not additional independent samples.
