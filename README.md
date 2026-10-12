# Signal Atlas

A visual directory of coordinated emitter agility across frequency, PRI, pulse width and additional numeric parameters. Keep original recordings, inspect selected windows, compare their coordination, and accumulate each emitter's reviewed patterns, variants and uncertainties over time. Built with React, TypeScript and Vite, using transactional browser-local IndexedDB storage.

[Published app](https://iliketolie.github.io/signal-atlas/) · [Agility library guide](docs/agility-library.md) · [Roadmap](ROADMAP.md) · [Verification](VERIFICATION.md)

## Preview 2.5

**v0.1.6-preview.2.5** implements roadmap stages 1–5 on `feature/revised-inputs`. The preview tag records the implementation; the [Pages workflow](.github/workflows/pages.yml) publishes this branch when its version metadata changes. [Preview source](https://github.com/iLikeToLie/signal-atlas/tree/v0.1.6-preview.2.5).

The main screen has **Patterns / Emitters** views of the same retained library. A new synchronized event-table import creates an unreviewed full-recording window. Automatic suggestions compare it against every reviewed pattern in the library, including other emitters and contiguous portions of longer patterns. Review records scoped support, variants, challenges or unresolved evidence. Cross-emitter acceptance creates separate cards joined by a reviewed relationship.

```mermaid
flowchart LR
    R[Original synchronized recording] --> W[Selected observation windows]
    W --> C[Compare coordinated parameters]
    L[Stored emitter patterns] --> C
    C --> D[Analyst review]
    D --> L
    D --> U[Retained unresolved evidence]
    L --> V[Patterns / Emitters directory]
    L --> B[Complete backup and restore]
```

Cards show coordinated parameter previews. The inspector provides shared cursor/zoom, original and normalized comparisons, joint-parameter plots, source windows, ranked suggestions and saved evidence. Region boundaries are provisional browsing aids. Solid lines represent reviewed relationships; dashed lines represent suggestions. An accessible connection list also opens their evidence.

The pilot was exercised with **100,000 events in the largest recording, 1 million retained events, 50 profiles and 500 selected windows**, including a complete backup/restore. Suggestions use bounded observed features and provisional settings; synthetic checks do not establish measured-data accuracy. [Specification and controls](docs/agility-stage0.md) · [Verification evidence](VERIFICATION.md).

## Run locally

Use Node.js 24+ and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run the Node test suite |
| `pnpm build` | Type-check and build the static app |
| `pnpm preview` | Preview the production build |
| `pnpm generate` | Regenerate the historical synthetic catalogue and benchmark layouts |
| `pnpm evaluate` | Write historical fixed-catalogue evaluation reports |
| `pnpm controls:generate` | Reproduce the stage 0 synchronized event controls |
| `pnpm controls:pilot` | Generate the optional 1M-event capacity workload under ignored `artifacts/` |

## Using the agility library

- **Add observation:** upload JSON/CSV or paste a synchronized numeric table, select an emitter or candidate profile, declare units, preview, then save. The original and a full-recording window are retained without requiring a classification.
- **Describe behaviour:** select a card, inspect shared timing and parameter coverage, and create narrower windows using source-event bounds. Missing measurements break traces and remain unsupported in matching explanations.
- **Build the repertoire:** review ranked suggestions with an explanation. Create a new pattern, accept scoped support or a variant, record a challenge, or leave the observation unresolved. Reviewed IDs and decision evidence survive settings changes.
- **Explore connections:** switch Patterns/Emitters, filter by profile, select a card to reveal its links, or enable Show links. Open a relationship to inspect its recorded scopes and comparison.
- **Protect the library:** export complete backups, preview a validated replace or merge, and undo recent reviews. Preview legacy migration preserves all earlier browser values for recovery. The synthetic workspace is separate from the retained library.

Storage belongs to the browser origin and device. Keep backups before clearing site data or changing the hosting address. There is no server or cloud sync. See the [guide](docs/agility-library.md) for formats, migration, restore semantics and matching limitations.

## Retained Cycle explorer

**Cycle explorer** opens the earlier separate Frequency/PRI atlas, with 1,000 synthetic examples per quantity and its original browser keys. Its controls, limits and methodology below apply to that explorer. They do not define the new synchronized event workflow.

- **Browse existing signals:** switch Frequency/PRI with a brief waveform transition, search/filter groups, pan/zoom, or use Grid. The current map stays visible while the other quantity loads; unchanged completed views are reused. Transitions respect reduced-motion preferences. Synthetic examples are included initially and clearly marked. **Hide synthetic examples** shows saved measured cycles alone without deleting either source.
- **Add known cycles:** **Import cycle** accepts complete-cycle CSV/JSON, including sparse or discontinuous data. Preview before saving.
- **Add unknown-period data when needed:** open **Recordings & new inputs**, save the original recording, inspect proposed periods and approve usable windows. Labels are optional. Ambiguous or nonrepeating sources stay saved and unresolved. [Recording walkthrough](docs/recordings.md).
- **Inspect and compare:** select a signal for its units, provenance, original/reconstructed curve and match explanation. Compare two signals in original units or normalized, phase-aligned form. Frequency sweeps retain the faster v0.1.5 playback.
- **Review growth:** **Group health & review** shows core/fringe members, uncertain matches, split and merge proposals. Decisions require explicit action and support undo. **Try group review demo** provides an isolated split example. [Group policy](docs/group-growth.md).
- **Regroup deliberately:** **Grouping settings → Apply & regroup library** reclusters every visible signal under the chosen threshold and feature weights. It reassesses synthetic examples too. Comparison weights affect neighbours and pair comparison separately.
- **Evaluate carefully:** Methodology contains the historical labelled fixed-catalogue benchmark. It does not validate evolving library groups, and its fitted calibration is not applied to them.

The Cycle explorer retains its older limits of **100 known-cycle imports, 10 recordings and 100 extracted cycles**, subject to browser quota. Its recording intake accepts up to 50,000 rows / 2 MB. The new agility library has separate limits and complete backup/restore; legacy values become part of its backup after migration is applied.

## Sparse and discontinuous cycles, visually

A **gap** is an unobserved value. A **jump** is an abrupt change. A repeating cycle can contain both.

[![Visual guide: missing observations versus real jumps, linear versus hold reconstruction from the same eight observations, and the end-to-start cyclic gap.](docs/illustrations/sparse-cycles-guide.png)](docs/illustrations/sparse-cycles-guide.svg)

Green dots are observations; dashed curves are the selected model. **Linear** connects points; **hold** keeps the previous value until the next observation. Original values and missing timestamps remain intact.

Sparse cycles need an approved period, **at least 8 observed points**, **no cyclic gap above 20% of the period**, and an explicit reconstruction choice. These guards check coverage and do not guarantee accuracy. [Visual guide and import details](docs/sparse-cycles.md).

## How groups evolve

The historical 12-way partition remains only as a benchmark. The live library uses **complete-linkage hierarchical clustering**: start with individual shapes, merge the closest groups, and stop when further merging would put any member pair below the similarity threshold. **There is no preset minimum or maximum number of groups.** With the unchanged default 65% threshold and 70% formula / 30% vision blend, the bundled examples produce 30 Frequency groups and 29 PRI groups. These are measured outputs of the heuristic, not target counts or physical classes.

Each group selects a central real member (a medoid) after clustering. Distinct metric-equivalent shapes count once, so repeated copies cannot bias representative selection. Prefer clear, well-observed members; up to two additional core examples describe coverage. Representatives do not control admission: every member must fit every other member. Capture support still needs three distinct supplied **measured** capture IDs, separately from shape diversity.

New arrivals, removals and settings changes reassess the visible library. Automatic memberships, representatives and names can change; arrival order does not affect the same collection/settings. Explicit reviewed groups retain saved identities and names, with placements paused visibly when they fail whole-group cohesion. Review, reassignment, splits and compatible merges preserve original signals and persisted undo history.

Two similar signals can still belong to separate groups if they do not fit each other's other members. For example, Triangular 080 and 109 match each other at 69.82% but remain separated in the full default catalogue under the every-pair rule. Their separation no longer depends on a fixed founder veto. The stricter cohesion rule can fragment broad families; the threshold and scoring blend still need measured-data validation.

## Data and scope

The demo contains eight generator families and diagnostic controls, with stable IDs and provenance. `tu` and `fu` are arbitrary units. Excursion is max(f) − min(f), not occupied RF bandwidth. PRI trajectories are independently generated interval examples, not inferred from carrier frequency.

The separate [Signal Shapes v1 corpus](datasets/signal-shapes-v1/README.md) provides 2,304 complete-cycle CSVs and a [verified ZIP](datasets/signal-shapes-v1.zip) for the Cycle explorer. The new [synchronized controls](datasets/agility-stage0-v1/README.md) exercise finite and repeating multi-parameter windows. IQ/spectrogram extraction and pulse-timestamp PRI derivation remain extensions.

## Unsuccessful improvement attempts

These experiments are retained as project history and are not selectable in the web app.

### WOA-medoids

The Whale Optimization Algorithm (WOA) medoid approach was an attempted improvement that was not adopted. This checkout contains no WOA implementation or benchmark report, so no quantitative result is claimed here. The historical benchmark catalogue retains deterministic alternating k-medoids; live library grouping uses threshold-based discovery.

### Siamese CNN

A shared CNN encoded normalized curve images into 16-value embeddings and compared them using mapped cosine similarity. It failed to improve frozen synthetic exact-source retrieval:

| Method | Held-out retrieval at rank 1 |
| --- | ---: |
| Formula only | 85.3% |
| Standard CV pixel overlap | 84.7% |
| Siamese CNN | 60.5% |

The CNN trailed pixel overlap by **24.2 percentage points**. These results measure exact-source retrieval from clean support galleries, not semantic grouping accuracy; the formula/CNN blend was not benchmarked. The [archived model card](models/README.md), [complete evaluation](models/siamese-evaluation.json), frozen weights and reproduction scripts remain available.

Saved CNN grouping settings activate defaults with a notice and remain untouched until new settings are explicitly applied. The app no longer loads or offers the CNN scorer.

## Development and deployment

| Area | Main files |
| --- | --- |
| Agility domain and intake | `spec/agility.ts`, `src/agilityModel.ts` |
| Transactional library and backup | `src/agilityStorage.ts` |
| Coordinated matching and workers | `src/agilityMatching.ts`, `src/agility.worker.ts` |
| Directory and parameter plots | `src/AgilityApp.tsx`, `src/AgilityPlot.tsx`, `src/agility.css` |
| Catalogue and comparisons | `src/catalogue.ts`, `src/priCatalogue.ts`, `src/signal.ts` |
| Regions and maps | `src/regions.ts`, `src/layout.ts`, `src/displayLayout.ts` |
| Grouping and pixel vision | `src/grouping.ts`, `src/groupPolicy.ts`, `src/vision.ts` |
| Evaluation and calibration | `src/evaluation.ts`, `src/evaluationData.ts`, `src/calibration.ts` |
| Imports and persistence | `src/importExport.ts`, `src/groupingStorage.ts`, `src/groupReviewStorage.ts` |
| UI and background work | `src/App.tsx`, `src/Atlas.tsx`, `src/Plot.tsx`, `src/*worker.ts` |

Tests cover synchronized import, shared alignment, partial and missing evidence, review identities, backup integrity/history, legacy recovery and the earlier cycle algorithms. Browser acceptance and pilot scripts use a separate test database. See [VERIFICATION.md](VERIFICATION.md) for checks performed, reproduction commands and remaining limits.

The [GitHub Pages workflow](.github/workflows/pages.yml) builds/tests pull requests. Deployment runs manually or when an explicit preview update changes `public/version.json` on `feature/revised-inputs`; changes to the Pages workflow also deploy; ordinary code pushes do not deploy. See [deployment setup and project-path checks](docs/deployment.md). Release history is in [CHANGELOG.md](CHANGELOG.md).
