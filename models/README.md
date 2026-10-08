# Siamese curves v1 — experimental, not promoted

This shared CNN is an optional vision scorer in v0.1.3. Classical curve overlap remains the default: the CNN regressed on the frozen synthetic retrieval test. It introduces no fixed family vocabulary. Practical imports need no labels; local group admission still uses the selected weighted similarity and threshold.

## Data and protocol

The unified `datasets/signal-shapes-v1` corpus contains 2,304 CSV observations of 384 latent sources, with both Frequency and PRI. Every source and near-duplicate leakage component belongs to exactly one split. Training uses 194 sources, calibration 47, validation 48 and test 95. Source IDs construct repeated-observation pairs; family labels and the privileged generator ledger never enter preprocessing, training or selection. They are not required for inference.

`scripts/prepare-siamese.ts` uses the app's CSV parser and 128-phase normalization. The network sees only a 128 × 32 soft grayscale curve image. Its shared encoder has two convolutions (4 channels, 3 × 9, stride 2 × 4; 8 channels, 3 × 5, stride 2 × 2), circular horizontal and zero vertical padding, ReLU, width averaging, a 64 → 16 projection and L2 normalization. Pair training uses symmetric contrastive cross entropy, temperature 0.08, AdamW at learning rate 0.002 and weight decay 0.0001. Different source instances supply negatives; negatives from the same leakage component are masked. Independent phase-roll augmentation supplies tolerance, not guaranteed phase invariance.

One CPU run used seed 20261008, 60 epochs and batches of 48 source pairs. Validation retrieval was checked every five epochs and selected epoch 50 (73.4%). Calibration set the suggested threshold from the fifth percentile of same-source cosine similarity, mapped into [0,1] and capped at 99%. This positive-only threshold is **not validated for semantic group admission or false merges**. The checkpoint was then frozen and the test evaluated once. There was no test-based tuning or second architecture attempt.

The test gallery contains 190 clean observations of the 95 held-out sources. Its 380 noisy/sparse queries rank only same-quantity candidates. Success means retrieving the exact source first. Clean test support is allowed by this retrieval protocol; it is not training-reference classification. Formula uses circularly aligned normalized RMS (`exp(-distance)`); overlap uses the same alignment and soft pixel IoU. CNN uses independent embeddings and `(cosine + 1) / 2`. The formula/CNN blend and semantic clustering accuracy were **not** tested here.

| Test retrieval | Overall | Frequency | PRI |
|---|---:|---:|---:|
| Formula only | 85.3% | 84.7% | 85.8% |
| Curve overlap | 84.7% | 86.3% | 83.2% |
| Siamese CNN | 60.5% | 63.2% | 57.9% |

CNN minus overlap: **−24.2 percentage points**, paired 95% leakage-component bootstrap interval **−30.8 to −17.4 points** (1,000 resamples). One seed and synthetic observations do not establish measured-data reliability. Instance discrimination can separate different sources that belong in the same practical group. This checkpoint failed promotion; it is available for inspection and experiments. Future model selection needs development data and a fresh sealed test set, since these test outcomes are now public.

The complete per-query outcomes, checkpoint history and quantity breakdown are in `siamese-evaluation.json`. The shipped weights are in `src/data/siamese-model.json`; the compact UI report is `src/data/siamese-summary.json`. Corpus SHA-256: `19b1b473ba19eef418110ed862365f33c81ea8a01a8f1573d1c4dbdb89bb7047`. Model SHA-256: `389c4a78d75c5610c23595cf758928d00f0157af22d753e82067ff6d91d22d8f`.

## Reproduce

Use Node 24+, Python 3.12 and the pinned CPU dependencies in `requirements.txt`. No Python or model download is required to use the app; the small inference implementation and frozen weights ship locally.

```sh
python -m pip install --target .ml-deps -r models/requirements.txt
python scripts/validate-dataset.py
node scripts/prepare-siamese.ts
python scripts/train-siamese.py
node --test tests/siamese.test.ts
```

Training regenerates the weights, report, summary and three validation-only parity fixtures. Do not regenerate fixtures to hide an inference discrepancy: compare with the existing frozen fixtures first. Browser inference agrees with the frozen PyTorch embeddings within 0.00002 per coordinate. PyTorch version is recorded in the report; binary byte hashes can differ across platforms or dependency builds even with deterministic operations.

The existing atlas-region evaluation panel benchmarks **classical overlap** against that catalogue's labelled controls. It is a separate protocol and does not validate this CNN or accept the unified corpus's diagnostic test labels. Switching vision models discards incompatible calibration; legacy saved profiles explicitly mean overlap.
