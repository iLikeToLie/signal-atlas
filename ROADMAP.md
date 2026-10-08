# Signal Atlas roadmap

Updated 8 October 2026. Work continues on `feature/revised-inputs`; main remains at v0.1.5. This is an ordered plan, not a dated release commitment.

**Primary use case:** a retained signal directory. Existing signals stay available while new, potentially unlabelled or imperfect observations arrive. Intake is optional. Grouping should reflect the accumulated signals, without treating the original synthetic catalogue as permanent measured classes or changing identities through uncontrolled fringe chaining.

## Implemented on the feature branch

| Capability | Current behaviour | Limit |
| --- | --- | --- |
| Retained library | Atlas is the main screen; saved complete-cycle imports, extracted cycles and originals remain across refresh | Browser-local; no shared repository or server sync |
| Optional recording intake | Unknown-period frequency/PRI recordings, reviewed recurrence suggestions and source windows; unresolved originals remain saved | Individual files; measured validation remains |
| Sparse/discontinuous cycles | Explicit linear/hold model; 8 observed points; maximum 20% cyclic gap | Coverage guards do not guarantee reconstruction accuracy |
| One live grouping rule | All visible cycles, including synthetic examples, follow anchored threshold admission; no fixed group count | Order-dependent heuristic, not a global optimum |
| Controlled group evolution | Provisional founders, bounded core coverage, source-aware support, reviewed splits and conservative merges; undo | Rename, reviewed anchor replacement and structural lineage remain planned |
| One grouped map | Separate tiles in disjoint group areas; canvas expands | 10,000-tile layout tested, not full 10,000-signal storage/rendering validation |
| Historical labelled evaluation | Frozen 12-group catalogue benchmark retained in Methodology | Does not validate evolving library groups or unlabelled stability |

The Frequency default now puts the 124 sinusoidal demo examples together, replacing the old 80/44 division. Similar thumbnails are not sufficient evidence for merging other groups: timing, lobe structure, scale settings, member quality and full-group cohesion must be inspected.

## Next priorities

| Priority | Work | Acceptance |
| --- | --- | --- |
| 1 | Durable library storage and full backup/restore | IndexedDB or a shared backend chosen to fit deployment needs; transactional original/cycle/review updates; migrated existing browser data; export/restore reproduces the library |
| 2 | Batch intake and 10,000-signal performance | Preview multiple files, deduplicate by source/window, show progress/cancellation, preserve insertion order; benchmark representative desktop/mobile workloads before raising limits |
| 3 | Indexed incremental grouping and virtualized browsing | Candidate shortlist with exact-score verification, cached normalized features, bounded representative maintenance and viewport rendering; avoid an all-pairs matrix for every arrival |
| 4 | Reviewed whole-library reassessment | Periodic candidate medoid/representative refresh, merge/split and affected-member previews; preserve stable IDs/names, record structural history, reassess after deliberate anchor replacement |
| 5 | Label-free stability diagnostics and measured validation | Source-aware order/perturbation/leave-one-capture-out checks; report fragmentation, giant groups, singletons and unstable assignments; optional reviewed labels for source-separated accuracy checks |

Current capacity remains 100 known-cycle imports, 10 originals and 100 extracted cycles, subject to browser quota. Increasing those constants alone would not deliver a usable 10,000-signal directory. The expandable grouped layout is only one component of that work.

## Rules for adapting groups

- Use the same signal comparison and admission policy for initial examples and later observations. Synthetic generator labels remain provenance rather than grouping truth.
- Keep stored samples and extraction assumptions intact. Poor coverage and ambiguous reconstruction require review; low resemblance alone does not establish noise.
- Admit clear matches or create provisional founders. Count measured acquisition support separately from representative shape diversity.
- Keep group identity stable between reviewed structural changes. Fringe members cannot drag a sinusoid anchor through successive weak matches.
- Offer splits for internally coherent separated fringes. Offer merges only when the representations agree and all transferred members fit the surviving boundary.
- Treat deliberate setting changes as full-library replays. Future background reassessment should propose changes with explanations, rather than silently replacing the directory.
- Validate stability and usefulness together: a single giant cluster can be stable, and singleton clusters can look compact. Neither establishes physical classes.

## Other retained work

Recording search still needs measured-data validation and comparison with alternative period detectors. Rename/dismissal controls, versioned structural lineage, automatic quality assessment, nonperiodic-window grouping, IQ/spectrogram extraction and pulse-timestamp PRI derivation remain extensions. CNN and WOA experiments remain archived until measured failures justify revisiting them.

[README](README.md) · [Library workflow](docs/unlabelled-workflow.md) · [Group policy](docs/group-growth.md) · [Methodology](docs/methodology.md)
