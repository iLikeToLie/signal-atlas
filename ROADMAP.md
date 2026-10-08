# Signal Atlas roadmap

Updated 8 October 2026. Pages branch release: v0.1.6; main baseline: v0.1.5. This is an ordered development plan, not a dated delivery commitment. The release/v0.1.6 branch includes the initial implementations below. Future features are not implemented unless marked complete.

**Primary use case:** import unlabelled timestamp/frequency recordings, discover repeating cycles, then discover and grow stable groups from the observations. Known labels, periods and synthetic reference groups must not be prerequisites for starting that workflow. See the [intended workflow and implementation requirements](docs/unlabelled-workflow.md).

## Current baseline and gaps

| Capability | Status | Remaining limitation |
| --- | --- | --- |
| Complete-cycle comparison and automatic local grouping | Implemented | Known-cycle dialog remains in the optional synthetic demo; measured input uses reviewed extraction |
| Sparse/discontinuous repeating cycles | Implemented in v0.1.5 | Explicit linear/hold reconstruction, 8 observed points and 20% maximum cyclic gap; extraction now accepts reviewed period suggestions |
| Fixed anchors, bounded core representatives and reviewed splits | Implemented in v0.1.5 | Measured source/capture support added in this checkout; evolving-group validation remains |
| Labelled evaluation and score calibration | Implemented | Tests independent admission against fixed reference groups; does not discover periods or assess unlabelled group stability |
| Raw-recording intake and cycle discovery | Implemented initially in v0.1.6 | Reviewed recurrence suggestions, source timeline, retained unresolved recordings and bounded extraction; measured validation remains |
| Empty measured workspace without catalogue seeds | Implemented in v0.1.6 | Observed founders, separate persistence, compatible-unit projections and reviewed splits; rename/merge and anchor replacement remain planned |
| Label-free stability diagnostics | Planned; priority 3 | Requires actual group sequences, capture lineage and transparent perturbation protocols |
| CNN and WOA experiments | Archived / not adopted | Another learned model is deferred until measured failures justify it |

The static, local-first deployment, observation preservation, comparison controls and review tooling remain useful foundations. The synthetic catalogue becomes an optional demo and comparison library in the intended workflow.

## Delivery order

| Priority | Focus | Outcome |
| --- | --- | --- |
| 1 · initial implementation complete | Raw-recording intake, reviewed extraction and period discovery | Begin with unknown-period recordings; approve supported cycles or retain unresolved observations |
| 2 · initial implementation complete | Group discovery from an empty measured workspace | Create and grow groups from observed cycles without labels or catalogue seeds |
| 3 | Source-aware growth and unlabelled stability diagnostics | Distinguish repeated evidence from independent captures; expose fragile groups |
| 4 | Batch intake and complete workspace backup/restore | Preserve recordings, extracted cycles, lineage, decisions and settings across devices |
| 5 | Measured validation and optional supervised calibration | Use reviewed labels where available to assess errors and tune policies |
| Alongside all priorities | Workers, responsiveness and browsing context | Keep recording preparation, replay and diagnostics usable at representative sizes |

Validation starts with each priority. Synthetic controls test mechanics; they do not replace measured recordings or independent acquisition coverage.

## 1. Raw recordings and cycle discovery

**Implemented initially in this checkout:** CSV/JSON without a period or label, original timeline and missing rows, linear/hold recurrence search in a worker, competing suggestions, manual period/start/count, cycle preview/approval, source/window/capture lineage and persistent unresolved recordings. See [formats, search guards and limits](docs/recordings.md). Further period-method comparisons and measured validation remain open.

- Accept timestamp/frequency observations and units without requiring a known period. Introduce separate recording validation rather than relaxing complete-cycle validation.
- Preview the original timeline, missingness and coverage. Preserve source observations and real jumps.
- Start with reviewed window selection and period hints; add candidate periods with visible recurrence evidence and harmonic ambiguity.
- Compare period-detection methods on dense, irregular, sparse and hopping observations. Confirm candidate repetition across observed windows instead of treating reconstructed gaps as evidence.
- Retain a no-supported-cycle outcome for nonperiodic, ambiguous or insufficiently covered recordings. Do not silently close endpoints.
- Store source/capture identity, recording ID, original bounds, extraction method, approved period and reconstruction assumptions.

**Acceptance:** a recording with no label or period enters the workflow; supported repeating controls yield inspectable cycles within documented tolerances; nonperiodic and ambiguous controls remain unresolved with original data intact. See [detailed requirements](docs/unlabelled-workflow.md#1-prepare-recordings-and-discover-cycles).

## 2. Groups discovered from observations

**Implemented in this checkout:** empty measured startup, observed-only grouping/projection, Frequency/PRI isolation, stable anchors, capture-aware provisional status, persisted review/split/undo, source removal/undo and optional catalogue loading. Group health includes an isolated interactive split demo. Both map views prevent tile overlap. Rename/merge and deliberate anchor replacement remain open.

- Add an empty measured workspace whose groups come solely from approved cycles. Keep the existing reference atlas as an optional demo/library.
- Reuse compatible-unit comparison, provisional founders, core/fringe review, fixed anchor admission and deliberate split approval.
- Keep identity stable while admitting variation. Include uncertainty from cycle extraction and reconstruction in the member explanation.
- Add rename/merge, reviewed anchor replacement and remaining reassignment controls with provenance and undo. Reassess memberships visibly after a deliberate identity change.
- Persist decisions independently of optional reference data. Reject incompatible synthetic calibration profiles rather than transferring them automatically.

**Acceptance:** groups form and grow without synthetic entries or class labels. A gradual chain of fringe matches cannot move an anchor. Splits and undo reproduce the intended members, and source removal/restoration has a documented outcome.

## 3. Source-aware support and label-free diagnostics

**Source bookkeeping implemented:** supplied capture IDs are counted separately from shape diversity, and the same extracted source window cannot be saved twice under another reconstruction model. Supplied IDs do not verify acquisition independence. The stability runs and diagnostics below remain planned.

- Separate independent observation support from representative diversity. A group of consistently sinusoidal captures must not require three different shapes to become supported.
- Detect exact copies and repeated extraction of the same window. Preserve supplied acquisition identity; multiple cycles from one capture remain related evidence.
- Add a Grouping stability view: shuffled insertion orders, leave-one-capture-out runs, appropriate noise/missingness controls and pairwise member co-assignment.
- Report group-count changes, fragmentation, unstable assignments, competing groups, resemblance/coverage and anchor drift. Detect trivial giant-group and singleton solutions.
- Keep these diagnostics separate from accuracy and calibrated probability. Do not invent true merge/split errors without labels.
- Compare deterministic coverage representatives against the fixed baseline; keep identity anchors protected and version any deliberate replacements.

**Acceptance:** diagnostics need no expected labels, operate without changing the actual workspace, account for source relationships and disclose what their scores mean. Measured source support can grow without requiring artificial morphology diversity.

## 4. Batch intake and workspace backup/restore

- Accept multiple CSV/JSON recordings/cycles with per-file validation, preview, insertion order, progress and cancellation; follow with corpus ZIP/manifest support.
- Export a versioned workspace containing original recordings, approved cycles/windows, stable IDs, source relationships, review/undo history and per-quantity settings.
- Preview merge/replacement on restore. Preserve old complete-cycle imports and validate catalogue/profile compatibility when the optional reference mode is used.
- Reassess the 100-import and browser-storage limits using recording-size and worker benchmarks.

**Acceptance:** backup/restore reproduces observations, extraction decisions and groups under the recorded settings; cancellation and invalid files have explicit outcomes; duplicates or incompatible profiles never silently discard data.

## 5. Measured validation and optional labels

- Extend evaluation to complete extraction/grouping sequences, including unfamiliar sources, noisy founders, repeated captures, missing spans, real jumps and shuffled orders.
- Validate period suggestions, extraction coverage and grouping stability on measured recordings before selecting defaults.
- Where reviewed labels exist, use source-separated fit/tune/test data to measure false merges/splits, wrong assignments and unfamiliar rejection. Labels remain optional for ordinary use.
- Adapt the advanced supervised panel to discovered groups rather than claiming the current fixed-reference benchmark covers that workflow.
- Compare formula-only, pixel overlap and their blend on development data; use fresh sealed test captures for later model selection.

**Acceptance:** results are reproducible, exportable and use the same operational extraction/admission paths. Test outcomes never tune the policy. Unlabelled diagnostics and labelled accuracy remain explicitly distinct.

## Responsiveness and browsing context

- Run recording preparation, period discovery, grouping/replay and repeated stability checks in cancellable workers, with progress and stale-result protection.
- Load synthetic demo catalogues only when requested. Preserve measured workspace, quantity, filters and comparisons across refreshes.
- Benchmark representative desktop/mobile recording collections before expanding limits; retain keyboard/reduced-motion behavior and verify touch interactions on a physical device.

**Acceptance:** long operations keep controls responsive; cancelled/superseded results cannot replace a workspace; restored views identify the correct quantity and available local observations.

## Next implementation scope

Validate the initial period-suggestion and observed-group policies on source-separated measured recordings. Add label-free stability diagnostics and workspace restore next. The existing complete-cycle import and synthetic atlas continue as useful secondary modes. IQ/spectrogram extraction, pulse-timestamp PRI derivation and nonperiodic-window grouping require separate extensions.

[README](README.md) · [Intended workflow](docs/unlabelled-workflow.md) · [Methodology and evaluation](docs/methodology.md) · [Release history](CHANGELOG.md)
