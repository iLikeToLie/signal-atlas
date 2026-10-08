# Signal Atlas roadmap

Updated 8 October 2026. Released baseline: v0.1.5, including sparse/discontinuous cycles, controlled group growth and faster Frequency inspector sweeps. This is an ordered development plan, not a dated delivery commitment. Future features listed below are not implemented unless marked complete.

The goal is to make importing, reviewing and grouping real observations dependable while preserving the local-first, static GitHub Pages application.

## Current baseline

| Capability | Status | Remaining limitation |
| --- | --- | --- |
| Automatic assignment and controlled local growth | Implemented in v0.1.5 | Fixed anchor gates, bounded core representatives and three-shape support; automatic replay remains order-dependent |
| Group review and proposed splits | Implemented in v0.1.5 | Review, guarded reassignment, approved splits and persisted undo; quality classification, rename/merge and workspace exports remain |
| Formula and standard CV pixel-overlap scoring | Implemented | The default blend has not established an accuracy advantage |
| Repeatable control-insert demonstration | Implemented | Demonstration outcomes are not an independent accuracy benchmark |
| Independent evaluation, calibration and threshold/blend tuning | Implemented | Synthetic reference admission is covered; measured-data and evolving local-group validation remain |
| Siamese CNN experiment | Archived in v0.1.4 | It underperformed frozen source retrieval and is no longer selectable in the app |
| README cleanup and focused technical documentation | Complete in v0.1.4 | Keep the roadmap and release history current |
| Sparse/discontinuous cycle import and preview | Implemented in v0.1.5 | Explicit linear/hold model, 8 observed points and 20% maximum cyclic gap; nonperiodic windows and observed-data validation remain |

## Delivery order

| Stage | Focus | Outcome |
| --- | --- | --- |
| 1 | Batch imports and workspace backup/restore | Process a collection and move a complete workspace between devices |
| 2 | Noise, ambiguity and group review | Review uncertain observations and correct assignments reversibly |
| 3 | Representative selection and controlled updates | Cover group variation without uncontrolled drift |
| 4 | Sequential and measured-data validation | Establish whether changes improve the complete grouping workflow |
| 5 | Measured-cycle preparation | Select and validate a complete cycle from a longer recording |
| Alongside stages 1–5 | Responsiveness and browsing context | Keep larger workflows responsive and preserve the user's place |

Validation work starts with each stage; stage 4 expands it into a dedicated workflow before experimental grouping behavior becomes a default.

## 1. Batch imports and workspace backup/restore

- Accept multiple CSV/JSON files, followed by ZIP/manifest support for the supplied Signal Shapes corpus.
- Preview quantity, units, names, validity and duplicate candidates before saving. Show per-file errors, progress, cancellation and the planned insertion order.
- Define exact duplicate detection separately from shape resemblance: scale variants and independent repeated captures must remain distinct observations.
- Export and restore a versioned workspace containing original cycles, stable IDs, insertion order and per-quantity grouping/calibration settings. Preserve lineage when supplied, and validate calibration compatibility on restore.
- Support deliberate merge or replacement during restore with a preview. Reassess the current 100-import limit and browser-storage capacity before accepting larger collections.

**Acceptance:** valid files import in the displayed order; invalid files produce actionable errors; cancellation has a documented outcome. Backup/restore reproduces cycles and assignments under the same catalogue/settings. Duplicate and incompatible-profile handling never silently discards data.

## 2. Noise, ambiguity and group review

**v0.1.5 progress:** [group review policy](docs/group-growth.md) implements threshold/competition review, separate reconstruction flags, three-distinct-core-shape support, reviewed splits/reassignment and per-quantity undo history. Automatic quality classification, group rename/merge and inclusion in workspace exports remain.

- Add a review state when the best score is near the threshold or the top two groups are too close. Retain candidate scores and the assignment explanation.
- Distinguish a poor-quality input from an unfamiliar but usable shape using explicit quality indicators. Any preprocessing must be opt-in, previewable and retain the original data.
- Replace confirmation by member count alone with evidence-based provisional-group promotion. Repeated or duplicate captures should not automatically count as independent evidence.
- Add local group rename, merge, split and reassignment controls with undo, provenance and explicit interaction with automatic regrouping. Reference memberships remain immutable.
- Define whether review/manual decisions persist through replay, and include them in workspace exports.

**Acceptance:** noisy and borderline controls can be reviewed without uncontrolled group proliferation; manual decisions survive refresh/restore; correction and undo reproduce the prior workspace.

## 3. Better representatives and conservative updates

**v0.1.5 progress:** core support can add two deterministic coverage examples while fixed identity anchors remain mandatory admission gates. Catalogue coverage selection and measured/sequential comparative evaluation remain. This heuristic update policy has behavioral tests, not an accuracy claim.

- Preserve reference memberships and anchor medoids while selecting additional examples for actual morphology coverage instead of sorted-ID position.
- Compare deterministic coverage selection and ordinary medoid swaps against the existing three-example baseline. WOA remains an offline research candidate only if it offers a validated benefit.
- Consider several representatives for local groups and conservative updates after independent supporting observations. Limit drift and preserve the original founder and update history.
- Version representative sets and invalidate/revalidate incompatible calibration profiles when they change.

**Acceptance:** fresh held-out sources show an acceptable balance of false merges, false splits and unfamiliar rejection. Better catalogue coverage alone is not sufficient. Selection is deterministic, and saved workspaces handle representative-version changes explicitly.

## 4. Evaluate growing groups and measured observations

- Extend evaluation from independent queries against fixed references to sequences that create and grow local groups.
- Include shuffled insertion orders, noisy founders, repeated captures, near-threshold chains, unfamiliar sources and mixed compatible/incompatible units.
- Report false merges, false splits, wrong assignments, unfamiliar rejection, group counts, order sensitivity and representative drift, with per-source/per-region results.
- Collect human-labelled measured observations and use source-separated fit/tune/test data. Expand coverage beyond the six reference regions with known synthetic evaluation coverage.
- Compare formula-only, pixel overlap and their blend using development data; use a fresh sealed test set for subsequent model selection.

**Acceptance:** results are reproducible and exportable, reflect the same sequential scoring path as the app, and keep test outcomes out of tuning. Change defaults only when the measured tradeoff supports the intended use.

## 5. Prepare complete measured cycles

- **Implemented in v0.1.5:** [sparse/discontinuous cycles](docs/sparse-cycles.md) with explicit linear/hold reconstruction, bounded cyclic gaps, observed markers, original-point/missing-timestamp preservation and import preview. The supplied period and repetition remain assumptions; point/gap guards need measured-data validation.
- Preview a longer numerical trace, select a complete cycle, rebase timestamps and inspect units, period, sampling and boundary continuity before import.
- Preserve the original recording and selected window in provenance. Never silently close, smooth or resample an input.
- Follow with period suggestions that show their evidence and allow explicit user confirmation.
- Treat partial-cycle matching as a separate later mode with its own validation and score semantics. IQ/spectrogram extraction remains a separate project extension.

**Acceptance:** the approved cycle passes existing import validation and can be exported with its selection metadata. The user can inspect every transformation and recover the original data.

## Responsiveness and browsing context

- Load the second quantity's catalogue on demand, with visible loading/retry states and intentional caching.
- Move grouping/replay into a worker before increasing import capacity; include progress, cancellation and protection against stale results after settings change.
- Preserve quantity, filters, comparison selections and relevant browsing state across refreshes. Encode reference-based views in links; local-cycle links must explain when the required workspace is absent.
- Benchmark representative collection sizes on desktop and mobile; retain keyboard navigation and reduced-motion behavior. Verify pinch interactions on a physical touch device.

**Acceptance:** larger import/regroup operations keep controls responsive; cancelled or superseded results cannot replace the current workspace; restored views identify the correct quantity and cycles.

## Next release scope

Expand sequential and measured-data validation for the v0.1.5 sparse-cycle and group-growth policies first. Then complete stage 1 workspace backup/batch import and worker support, extend the remaining stage 2 controls, and compare stage 3 representative policies through stage 4 sequential evaluation. Defer another learned model until evidence identifies a failure that formula/pixel overlap cannot address.

[README](README.md) · [Methodology and evaluation](docs/methodology.md) · [Release history](CHANGELOG.md)
