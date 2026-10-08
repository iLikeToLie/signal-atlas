# Frequency-Agile Signal Atlas

A local-first explorer for periodic Frequency and PRI trajectories. Browse synthetic waveform regions, compare complete cycles, and import your own observations for automatic grouping. Built with React, TypeScript and Vite; runs entirely in the browser with no backend or API keys. Interaction is inspired by [Three Body Orbits](https://www.threebodyorbits.com/).

[Open the app](https://iliketolie.github.io/signal-atlas/) · [Methodology](docs/methodology.md) · [Import formats](docs/imports.md) · [Roadmap](ROADMAP.md) · [Verification](VERIFICATION.md)

## Run locally

Use Node.js 24+ and pnpm 11.25.0. If needed, install pnpm with `npm install -g pnpm@11.25.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Other commands:

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run the Node test suite |
| `pnpm build` | Type-check and build the static app |
| `pnpm preview` | Preview the production build |
| `pnpm generate` | Regenerate the checked-in catalogue and layouts (seed 20261006) |
| `pnpm evaluate` | Write local synthetic grouping evaluation reports |

## Using the atlas

- **Browse:** switch between Frequency and PRI, pan/zoom the atlas, search or filter regions, or use the grid. Named regions arrange curves into coloured islands; **Exact positions** shows the metric MDS projection.
- **Inspect and compare:** select a curve to see its units, period, excursion and provenance. Add two curves to comparison for original or normalized, phase-aligned views. Plots show three cycles with playback controls; Frequency inspector sweeps run faster while keeping a readable pace.
- **Import:** upload or paste a repeating cycle as JSON or CSV, preview it, then save for automatic grouping. Sparse/discontinuous cycles support explicit linear or step/hold reconstruction with point/gap checks. See [formats](docs/imports.md) and [sparse cycles](docs/sparse-cycles.md).
- **Adjust grouping:** set the threshold, formula/vision blend and formula feature weights under **Grouping settings**, then **Apply & regroup**. Browsing weights are configured separately under Methodology.
- **Review growth:** inspect core/fringe membership and uncertain matches under **Group health & review**. Approve coherent fringe splits, keep or reassign matches, and undo decisions. See [group growth policy](docs/group-growth.md).
- **Check outcomes:** **Run control demo** opens a temporary five-insert workspace. **Evaluate and calibrate grouping** fits, tunes and tests settings on separate source splits; it can also load human-labelled examples.

Imports, applied settings and group review decisions are stored in this browser, separately for Frequency and PRI. Up to 100 imports are supported. Export JSON/CSV before clearing browser storage; there is no cloud sync. Demo and evaluation data are temporary. Selection uses hash URLs so refresh works on static hosts.

## How matching works

Each quantity has 1,000 deterministic synthetic references arranged into 12 morphology regions. Reference regions use alternating k-medoids over normalized, circularly aligned RMS shape distances. Region names are browsing labels, not physical emitter classes. Local imports never change reference membership.

**Standard CV pixel overlap is the only vision method in the app.** Curves are normalized onto 128 phases, circularly aligned, rasterized into 128 × 32 soft grayscale images, and compared with soft pixel intersection-over-union. It requires no training or cloud service.

Automatic grouping defaults to **70% formula / 30% pixel overlap**, a **65% admission threshold**, and shape-only formula weights:

```text
formula similarity = exp(−weighted signal distance)
combined similarity = α × formula similarity + (1 − α) × pixel overlap
```

Each reference region supplies three fixed identity anchors; each new local group keeps its founder. Clear core support can add up to two coverage representatives, but every admission must still match a fixed anchor. Three distinct clear core shapes support a local group; a repeated copy alone does not. Coherent fringe clusters produce split proposals for review. Imports are replayed in insertion order when settings change or an import is removed/restored. Frequency and PRI group separately, and active scale terms require compatible units.

Neighbour browsing defaults to shape/period/excursion weights of **0.65 / 0.20 / 0.15**, with centre weight **0**. **Shape only** removes scale terms. Matching allows circular phase shifts, but no time warping, reversal or reflection. Map positions approximate distances; rankings use the full metric.

Scores are heuristic similarities, not probabilities. Synthetic evaluations do not establish measured-data accuracy. The [methodology reference](docs/methodology.md) covers normalization, units, map construction, grouping, calibration, benchmark results and limitations.

## Data and scope

The catalogue contains eight generator families plus diagnostic controls, with provenance and stable IDs. `tu` and `fu` are arbitrary units. Frequency excursion is max(f) − min(f), not occupied RF bandwidth. PRI curves are independently generated positive interval trajectories associated with the same reference IDs; they are not inferred from carrier frequency.

The separate [Signal Shapes v1 corpus](datasets/signal-shapes-v1/README.md) provides **2,304 uploadable CSVs**, source/component splits, integrity audits and a [verified ZIP](datasets/signal-shapes-v1.zip). The app imports one CSV at a time, not the ZIP or manifest.

Inputs must declare a repeating trajectory with an explicit period and supported units. Sparse mode requires at least 8 observed points, no cyclic gap over 20% of the period, and an explicit reconstruction method. Original observations and missing timestamps are retained; these initial guards do not guarantee measured-data accuracy. Nonperiodic windows, automatic period detection, IQ/spectrogram extraction and partial-cycle matching remain outside the current scope. See [imports](docs/imports.md) and [sparse cycles](docs/sparse-cycles.md).

## Unsuccessful improvement attempts

These experiments are retained as project history and are not selectable in the web app.

### WOA-medoids

The Whale Optimization Algorithm (WOA) medoid approach was an attempted improvement that was not adopted. This checkout contains no WOA implementation or benchmark report, so no quantitative result is claimed here. The catalogue continues to use deterministic alternating k-medoids.

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
| Catalogue and comparisons | `src/catalogue.ts`, `src/priCatalogue.ts`, `src/signal.ts` |
| Regions and maps | `src/regions.ts`, `src/layout.ts`, `src/displayLayout.ts` |
| Grouping and pixel vision | `src/grouping.ts`, `src/groupPolicy.ts`, `src/vision.ts` |
| Evaluation and calibration | `src/evaluation.ts`, `src/evaluationData.ts`, `src/calibration.ts` |
| Imports and persistence | `src/importExport.ts`, `src/groupingStorage.ts`, `src/groupReviewStorage.ts` |
| UI and background work | `src/App.tsx`, `src/Atlas.tsx`, `src/Plot.tsx`, `src/*worker.ts` |

Tests cover matching invariants, unit compatibility, grouping/replay, imports, evaluation leakage, calibration, storage and archived CNN reproduction. See [VERIFICATION.md](VERIFICATION.md) for checks performed and remaining limits. Dense pairwise layouts and all-shifts alignment are intended for this catalogue size; larger datasets need a more scalable approach.

The [GitHub Pages workflow](.github/workflows/pages.yml) builds/tests pull requests. Deployment runs manually or when an explicit release update changes `public/version.json` on `main`; ordinary code pushes do not deploy. See [deployment setup and project-path checks](docs/deployment.md). Release history is in [CHANGELOG.md](CHANGELOG.md).
