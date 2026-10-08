# Releases

## v0.1.4 — documentation cleanup and pixel-overlap-only vision

- Simplify the README and move methodology, import schemas and deployment instructions into focused linked documents.
- Add a prioritized roadmap for batch imports, workspace backup/restore, noise review, representative improvements, sequential/measured-data validation and cycle preparation.
- Remove the CNN option, scorer integration and walkthrough from the web app. Standard CV pixel overlap remains the only vision method, alongside formula scoring.
- Preserve CNN weights, inference, training scripts and evaluation evidence as an archived experiment; keep WOA-medoids and CNN history in a separate README section.
- Reject saved CNN grouping settings with a recoverable notice and use defaults without overwriting the saved value.

## v0.1.3

- Add an optional Siamese CNN trained on one unified Frequency/PRI corpus, with local inference, frozen weights, a transparent retrieval report and PyTorch parity checks. Keep overlap as the default after the CNN failed to improve held-out retrieval.
- Include 2,304 uploadable CSV cycles, source/component split discipline, test-only diagnostic labels, independent integrity checks, reproducible generation and a verified ZIP package.
- Add an interactive visual explanation of normalization, curve image overlap, formula/vision weighting and group admission, plus the learned encoder's flow and results.
- Move nearest-neighbour ranking to a worker and playback/quantity morphing to canvas frame loops, avoiding whole-app playback rerenders and per-tile SVG transitions. Animation feel is awaiting user feedback.

# v0.1.2

- Enable weighted image comparison by default: 70% formula similarity and 30% normalized curve-image overlap, with a 65% admission threshold chosen using synthetic tuning examples. Saved settings remain intact.
- Show three cycles only in the inspector and comparison plots; remove the one-cycle selector.
- Display resemblance scores, normalized RMS distances and weights as percentages, retaining distance and similarity labels rather than presenting probabilities.
- Smooth the Frequency/PRI selector with a sliding indicator, continuous CSS tile movement, colour transitions and cached reference layouts and thumbnail paths. Respect reduced motion.

- Add a worker-based evaluation panel with independent fit/tune/test source sets, synthetic reference-region consistency fixtures, and human-labelled dataset imports.
- Fit monotonic formula/vision score mappings, tune thresholds and blend shares without using test outcomes, and compare held-out grouping errors and balanced score calibration diagnostics.
- Add source bootstrap intervals, per-region coverage/mistakes, dataset/result exports and a reproducible evaluation CLI.
- Save applied calibration profiles separately for Frequency and PRI; preserve legacy settings and reject mismatched feature weights or reference catalogues.

Validation: 33 Node tests, TypeScript/Vite build, synthetic evaluation and Codex browser checks. Default hybrid balanced accuracy on held-out synthetic sources: Frequency 91.7%, PRI 88.9%; formula-only at 82%: 100% and 94.4%. This benchmark does not establish a vision advantage or measured-data accuracy.

# v0.1.1

- Automatically assign incoming Frequency and PRI cycles to the strongest compatible group, or create a provisional group when every similarity fails.
- Add fixed representatives, stable local founders, persisted grouping settings and reproducible replay after reload, removal or undo.
- Add optional weighted formula/computer vision comparison using standardized curve-image overlap, with candidate score explanations.
- Add an isolated five-control insertion demo for both quantities, reset/exit actions, default expectations and observed outcomes.
- Display local membership throughout the atlas, filters, inspector and Regions page; extend the map for up to 100 local groups.

Validation: 23 named Node tests, TypeScript/Vite build and desktop/mobile Chromium checks. Vision is experimental and disabled by default; no trained model or dependency added.

# v0.1

Initial Frequency-Agile Signal Atlas release.

- 1,000 synthetic signals with separate Frequency and PRI atlas views and animated transitions.
- Twelve named, coloured morphology regions per view, with dense waveform tiles and zoom-aware labels.
- Three-cycle signal plots with visual sweeps, pause/speed controls and reduced-motion support.
- Neighbour search, signal comparison, local JSON/CSV imports and exports, and unit-aware comparisons.
- Interactive methodology examples explaining normalization, circular alignment, clustering and map limits.

Imports remain local and unassigned. Regions are fixed reference groupings; novelty flags and imported map positions are provisional. PRI patterns are synthetic, not extracted from pulse timestamps.

Validation: 14 Node test groups and the TypeScript/Vite production build pass.
