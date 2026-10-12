# Signal Atlas roadmap

Updated 12 October 2026. Released baseline: v0.1.5 on `main`. Development preview: **v0.1.6-preview.2.5** on `feature/revised-inputs`, implementing stages 1–5 after the stage 0 specification, based on feature preview `d0eca9d`. Publication was approved on 12 October 2026. [Preview source](https://github.com/iLikeToLie/signal-atlas/tree/v0.1.6-preview.2.5) · [Implementation guide](docs/agility-library.md) · [Verification](VERIFICATION.md).

## Objective and primary workflow

Build a visual directory/database that comprehensively describes the coordinated agility of complex emitters across several parameters. Accumulate each emitter's observed patterns, variants, supporting evidence and uncertainties over time, using visual descriptions where text alone is inadequate.

The primary workflow is to document an emitter of interest: import an observation, inspect its coordinated parameters, compare it with stored patterns, and review whether it supports, extends or challenges the emitter's description. Similar behaviour across emitters is discoverable without implying common emitter identity.

The first usable release serves one analyst on one device. It must include automatic suggestions across the entire library, multi-parameter visualization, analyst review, durable local storage and complete backup/restore. These are parts of one usable milestone; an intermediate stage is not completion of that release.

## Implemented preview and remaining validation

| Capability | Implemented in preview 2.5 | Remaining validation or extension |
| --- | --- | --- |
| Visual directory and comparison | Patterns/Emitters, emitter-specific cards, frequency/PRI/pulse width/additional numeric channels, shared cursor/zoom, normalized/original overlays and joint plots | Analyst usability on representative measured captures |
| Recording intake | JSON/CSV preview, originals, uncertain candidates, full/narrowed windows, finite/steady/repeating observations and explicit missing measurements | Batch intake and automatic segmentation |
| Automatic suggestions | Every reviewed library pattern is considered; shared event-order/timing alignment, scale variants, contiguous partial search and channel/coverage explanations | Bounded feature search is approximate for large windows; independent measured-data ranking and interval accuracy |
| Provisional groups | Deterministic shape-based region boundaries, separate selectable cards and paginated browsing | Group usefulness and source-aware stability; boundaries are browsing aids |
| Review and relationships | Support, variants, challenges, unresolved/rejected suggestions, separate cross-emitter cards, solid/dashed links, scoped comparison, stable IDs and undo/audit history | Richer identity/annotation editing and longer sequential evaluation |
| Persistence | Atomic IndexedDB updates, full backup/replace/merge validation, legacy raw-value recovery and candidate conversion | Browser-specific quotas, actual device coverage and richer legacy recording mappings |
| Capacity and evaluation | Synthetic controls and a real browser/worker/IndexedDB workload with 1M source events, 50 profiles and 500 windows, including full restore | Physical mobile testing, measured-data usefulness and larger reviewed-pattern collections |

Current complete-link grouping and the historical catalogue remain useful exploration and reproduction tools. The new description workflow must preserve reviewed pattern identities even when automatic similarity groups change. Historical thresholds, calibration and formula/vision results do not transfer automatically to the new matcher.

## Agreed first-release requirements

### Data, attribution and accumulated descriptions

- Use synchronized pulse/event tables as the primary input. Each row has a timestamp and available parameter measurements. Frequency, PRI and pulse width anchor the first demonstration; accept additional named numeric channels with explicit units and any subset of the core channels.
- Each table represents one emitter or one analyst-selected candidate stream. Preserve uncertain attribution and source/capture provenance. Separation of mixed-emitter captures takes place upstream.
- Model emitters/candidate streams, original recordings, selected observation windows, emitter-specific patterns, variants, supporting associations, relationship links and revision history separately, with stable identifiers.
- Define a pattern through coordinated behaviour in an observed window. Support finite sequences, transitions, steady behaviour and repeating cycles; record repetition only when evidence supports it.
- Keep originals, absolute values, durations, timestamps and missing measurements intact. Make any derived representation or reconstruction explicit and traceable to its source.
- Treat scale changes as potential variants when event order and relative timing across parameters are preserved, subject to review. Changed coordination normally indicates a different pattern.
- Keep separate emitter-specific pattern cards, even when two emitters exhibit related behaviour. Each card retains that emitter's values, variants, annotations and evidence; reviewed relationships connect the cards.
- Allow incomplete observations to support only their measured channels and observed intervals. Missing pulse width, for example, neither confirms nor contradicts it; the full multi-parameter relationship remains unresolved.
- Record whether new evidence supports an existing description, extends a variant/range, introduces behaviour, or challenges a prior interpretation. Preserve the explanation and previous revision.

### Import minimum and windows

The provisional hard gate for a new event-table recording is:

- At least **16 timestamped events** spanning nonzero time.
- At least one declared parameter containing **16 valid measured values**. Missing values do not count.
- Valid, chronologically ordered timestamps; named channels with declared units; explicitly represented missing values.
- A recording identifier and an emitter or candidate-stream association, which may remain uncertain.
- Compliance with supported capacity and format limits, with actionable errors and no silent truncation.

Do not require repetition, a fixed minimum duration or changing values. The 16-measurement cutoff is an initial engineering guard, not a guarantee that a behaviour is sufficiently described. It applies to the implemented event-table workflow; legacy cycle formats retain their own validation during migration.

The default observation window covers the full recording. The analyst can narrow it or create additional windows; each retains its original bounds and recording/capture lineage. Selected windows must also pass the evidence gate before matching. Windows with insufficient evidence can remain visible for inspection with their limitation explained.

A valid imported recording's default window appears immediately as an **unreviewed observation**, with provisional grouping and dashed suggestions as background matching completes. Unresolved observations remain browsable. A recording containing several behaviours can be narrowed manually; automatic behaviour segmentation is deferred.

### Automatic suggestions and comparison

- Automatically search the **entire library**, including other emitters, for each eligible selected window. Review is required before a suggestion contributes a confirmed association or relationship.
- Prioritize coordinated shape, event order and relative timing. Show absolute parameter ranges and overall duration differences prominently; offer adjustable weights for those differences.
- Use a shared alignment across synchronized channels. Independently aligning each channel must not erase changes in their coordination. Define how global duration scaling is handled and preserve the original timing.
- Recognize possible matches to a **contiguous portion** of a longer stored pattern. Identify the corresponding intervals, preserve cross-parameter timing and mark partial support; unseen portions remain unconfirmed.
- Require sufficient overlapping measured evidence in at least two channels before describing a multi-parameter relationship. Otherwise label suggestions single-parameter or insufficiently supported. Define and validate the numerical coverage rule during specification.
- Show ranked candidates with parameter-level agreement, disagreement, missing evidence, interval coverage and match limitations. Flag weak and partial candidates explicitly. Similarity scores describe resemblance; they do not establish emitter attribution.
- Always offer **Create new pattern** and **Leave unresolved**, alongside reviewed association/variant actions. Accepting a cross-emitter match creates or links a card in the current emitter's repertoire while keeping each emitter's evidence separate.
- Version the matching method, settings and decision evidence. Ranking or group changes must not silently rewrite reviewed identities, evidence scope or relationships.
- Run matching in background workers, with progress, cancellation and protection against stale results after changing a window, settings or the collection. Indexed candidate retrieval must still search across the library and be checked against an exact baseline.

### Directory views and relationships

- Provide a **Patterns / Emitters** toggle over the same library. Patterns shows all stored pattern cards and unreviewed observations with emitter filters; Emitters opens each profile's repertoire, variants, observation history and uncertainties.
- Give pattern cards consistent compact previews of several parameters. The detail view uses aligned parameter plots, synchronized selection/cursor/zoom, absolute and normalized comparisons, and visible missing-data markers.
- Include joint-parameter and sequence views where they clarify coordination, hops, dwell timing or transitions. Every displayed description links to its supporting source windows.
- Group boundaries communicate behavioural similarity. Keep distinct selectable cards and avoid overlapping tiles; group placement is a browsing aid, not numerical proof of equivalence or identity.
- Use **solid, labelled lines** for reviewed relationships and **dashed lines** for suggestions. Selecting a card reveals its connections; **Show links** enables wider exploration. Clicking a link opens comparison and supporting evidence.
- Relationship labels distinguish the reviewed scope, such as coordinated similarity, a scale variant or a partial match. Confirming a relationship must not turn missing measurements into support for every channel.
- Preserve reviewed cards and links as new data arrive. Review/revision/undo must be explicit; automatic grouping remains provisional and can be recomputed separately.
- Keep browsing state, keyboard access, visible review status and reduced-motion behavior. Provide accessible ways to inspect relationships in addition to lines on the map.

### Storage, migration and pilot capacity

Use durable browser-local storage, with IndexedDB as the proposed implementation, transactional updates and a versioned schema. Preserve recoverable existing browser data while migrating cycles, recordings, provenance, settings and review history. Legacy separate Frequency/PRI entries must not acquire an invented synchronization relationship or emitter identity during migration.

Complete backup/restore must include originals, event values, windows, stable IDs, emitter/candidate associations, pattern variants, annotations, reviewed links, decision evidence, settings and revision/undo history. Validate versions and integrity; preview replacement or merge, make ID conflicts explicit, and leave the current library intact if restore or storage fails. Derived suggestions can be recomputed without losing the original reviewed evidence.

| Provisional pilot target | Scope |
| --- | --- |
| 100,000 events | Largest imported recording/event table |
| 1 million events | Total retained source events across the library; windows reference originals |
| About 50 emitters | Includes candidate-stream profiles where attribution remains unresolved |
| About 500 observation windows | Selected windows within recordings, including default full-recording windows; multiple windows reference one retained source |

The preview enforces the recording/event/window caps and passed the synthetic workload in Chromium. Cached bounded views, worker operations and 24-card pagination preserve originals for export. Current evidence covers a cloud desktop and a 390 × 844 viewport with 4× CPU throttling; it does not establish physical-phone performance or universal browser quota availability. Record bytes, timing and environment in the pilot report. [Details and limits](VERIFICATION.md).

## Delivery order

| Stage | Work | Acceptance |
| --- | --- | --- |
| 0 — complete in local preview 2.0 | Implementation specification and controlled dataset | [Specification](docs/agility-stage0.md), [draft contracts](spec/agility.ts) and [reproducible controls](datasets/agility-stage0-v1/README.md) define entities, PRI/time semantics, review states, shared alignment, migration, links and benchmark protocol; score/coverage tuning follows the rebuild |
| 1 — complete in preview 2.5 | Durable domain model, intake and backup/restore | JSON/CSV preview/import, original payloads, profiles/windows, atomic storage and validated complete restore; legacy values recoverable without inferred synchronization |
| 2 — complete in preview 2.5 | Multi-parameter visual directory | Patterns/Emitters, stable cards, coordinated parameter/joint plots, provenance and provisional/unresolved states |
| 3 — complete in preview 2.5 | Automatic whole-library and partial suggestions | Worker search, scale/coordination controls, contiguous intervals, unique-overlap counts, missing-evidence explanations and adjustable provisional settings |
| 4 — complete in preview 2.5 | Accumulated descriptions and reviewed relationships | Scoped support/variant/challenge decisions, separate cross-emitter cards, stable solid links, dashed suggestions, evidence inspection, undo and portable history |
| 5 — complete for synthetic preview acceptance | Integrated acceptance and capacity validation | 105 tests, browser two-emitter/import/review/failure checks, desktop/constrained view checks and 1M-event/500-window complete restore; measured/physical-device validation remains below |

Build and validate each stage incrementally. Stages 1–5 together deliver the first usable release. Automatic suggestions and partial matching are required in that release; do not defer them behind a manual-only milestone. Batch import and broader segmentation can follow once the complete description workflow works.

## First-release acceptance scenario

Use controlled synchronized recordings for two emitters and demonstrate that:

1. Import validates the agreed minimum; constants and finite nonrepeating sequences remain admissible. The original recording and its default unreviewed window appear without requiring classification.
2. A scaled observation is suggested as a variant of an existing coordinated pattern while absolute ranges and durations remain visible.
3. A change in coordination is distinguished as different behaviour even when individual channel curves look alike.
4. A partial capture identifies the corresponding contiguous interval; missing channels and unseen portions remain explicitly unsupported.
5. Analyst review produces separate emitter-specific cards and a solid labelled relationship, with each card's own evidence intact.
6. Weak and unresolved observations remain available in provisional states, with **Create new pattern** and **Leave unresolved** reachable.
7. **Patterns / Emitters**, filters, selection-revealed links, **Show links** and link inspection expose each emitter's accumulated knowledge.
8. Refresh and complete backup/restore recover originals, windows, identities, values, associations, links, settings, annotations, decisions and revision history without loss.
9. Browsing and review remain responsive at pilot scale while matching runs in the background. Cancellation or superseded work cannot overwrite the current state.
10. Adding new evidence or changing matching settings preserves reviewed card/link identities and records any challenged interpretation through an explicit revision.

Include missing and asynchronous channel coverage, steady values, scale changes, same-shape/different-coordination cases, partial intervals, duplicate/related windows, weak matches and unfamiliar behaviour in the controls. Test corrupt storage, quota failures, incompatible backups and legacy migration as well as the successful workflow.

Initial validation uses synchronized synthetic recordings with known relationships. Add analyst-reviewed measured recordings when available, keeping related captures/windows together in source-separated evaluation. Synthetic success establishes controlled behavior, not measured-data accuracy. Assess candidate ranking, partial-interval accuracy, false suggestions, missing-evidence explanations and description stability; validate the usefulness of provisional groups separately.

## Rebuild decisions and next validation

The rebuild settles the initial storage, history and matching implementation while keeping tuning provisional:

- Reassessed development defaults: 85% candidate threshold, equal shared-channel shape contribution, absolute/duration penalties initially zero, and at least 16 distinct aligned measurements. Coordination additionally requires a simultaneously overlapping channel pair. Search uses up to 128 feature points and candidate contiguous interval lengths. The legacy 65% threshold and 70/30 blend do not enter this matcher. Validate these settings and search recall with source-separated measured captures.
- Preview interaction budgets: below 100 ms on the tested desktop and below 200 ms in the constrained emulation. Small repeated view-switch samples meet these budgets on the production build; they are not a population p95 estimate. Test a physical mobile device and more browsers before broader capacity claims.
- Backup v1 covers originals and all durable structures, settings and history. Replace is one atomic transaction; merge rejects conflicting IDs and begins a new quick-undo branch while archiving all prior snapshots and decisions. Legacy keys remain untouched, and their raw values travel in the new backup after applying migration. [Exact behavior](docs/agility-library.md).

Stages 1–5 now form the tagged development preview. Next validation should use source-separated measured captures and physical devices. The 16-measurement gate, overlap adequacy, ranking settings and capacity targets remain provisional; synthetic implementation success does not establish comprehensive description quality on measured emitters.

## Later extensions and retained research

After the first usable milestone, consider batch/ZIP intake, automatic behaviour segmentation, richer categorical/modulation descriptors, shared multi-device storage, quality assessment and larger collection targets. Mixed-emitter separation, IQ/spectrogram extraction and pulse-timestamp PRI derivation require their own scope and validation.

Retain source-aware group-stability diagnostics, representative research, period-detector comparisons and historical benchmark reproduction. CNN and WOA experiments remain archived until observed failures justify revisiting them. A 10,000-tile layout alone does not establish a usable event database at that scale.

[README](README.md) · [Import formats](docs/imports.md) · [Group policy](docs/group-growth.md) · [Methodology](docs/methodology.md) · [Verification](VERIFICATION.md) · [Release history](CHANGELOG.md) · [Feature preview baseline](https://github.com/iLikeToLie/signal-atlas/tree/feature/revised-inputs)
