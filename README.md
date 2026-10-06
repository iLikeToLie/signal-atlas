# Frequency-Agile Signal Atlas

A local-first explorer for continuous periodic frequency trajectories, with automatic incremental grouping and static hosting. React, TypeScript and Vite; no backend, external runtime scripts, API keys or chart/map dependencies. The original interaction is inspired by [Three Body Orbits](https://www.threebodyorbits.com/).

## Run locally

Use Node.js 24+ and pnpm 11.25.0 (the version in `package.json`). If pnpm is unavailable, install it with `npm install -g pnpm@11.25.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm generate
pnpm build
pnpm preview
```

The initial catalogue and two layouts are checked in. `pnpm generate` regenerates them byte-for-byte with seed 20261006. Tests use Node's built-in runner; no test framework is installed. `pnpm-workspace.yaml` permits only esbuild's dependency build script.

## Explore

- Drag the atlas to pan; scroll or pinch to zoom. The default **Named regions** view shows coloured, outlined waveform islands. Click a region or its sidebar name to focus it and inspect its representative. Toggle **Exact positions** to see the MDS projection for the selected comparison metric. Buttons and arrow keys pan/zoom/reset; tiles and region labels support Enter/Space. Grid view offers another way to browse.
- Search pattern names, region names, stable IDs, generator families and parameters. Filter by region, or open Generator provenance for the original family filters. The Regions page presents named neighbourhoods, their representatives and scale ranges, followed by generator-family cards.
- Inspect original frequency/time axes, period, excursion, midrange centre, provenance and parameters. Plots show **three cycles** by default, with cycle boundaries and a one-cycle detail option. A sweeping highlight animates the displayed repeats automatically, with pause and speed controls and reduced-motion support. Its duration derives from cycle time (tu treated as display seconds; physical time converted to seconds), limited to 1.2–12 seconds for readability. Stored values and periods are unchanged. Region labels fade at 2.3× zoom and disappear at 3.2×. From 3.5× zoom, up to 48 visible tiles share a decorative three-second sweep; waveform samples are precomputed.
- Add up to two entries to comparison, or use the neighbour's ↔ button. Original views retain absolute frequencies and time. Normalized views remove midrange centre/excursion, use cycle phase and circularly align B to A. Overlay and side-by-side views are available; unlike unit labels use separate original axes.
- Import a complete cycle to join its strongest compatible group or create a provisional group automatically. Inspect formula, vision and combined similarity scores. Open **Grouping settings** in the atlas to set the threshold and weights; **Apply & regroup** replays local cycles in insertion order. **Run control demo** opens an isolated, step-by-step example workspace for Frequency or PRI.
- Use Shape + scale for the default engineering comparison; Shape only explicitly ignores scale. Configure weights under Methodology. A worker recomputes a custom reference map. Selection lives in the URL hash and survives refresh on static hosts.

## Catalogue and model

1,000 deterministic clean entries: 124 each from sinusoidal, triangular, rounded triangular, asymmetric rise/fall, sweep/dwell, multi-harmonic, plateau/shoulder and periodic blend generators; eight additional diagnostic controls. The original 104 entries retain their IDs and samples. Each family adds 28 morphologies × four period/excursion variants, including unequal sweep timing, varying dwell lengths, phase-warped rises and multiple lobes. Generation can vary timing; matching never time-warps it. Controls isolate circular start shifts, time scale, excursion, centre shifts, dwell timing, time reversal and frequency reflection.

Samples represent one cycle, normally 256 unique uniformly spaced samples plus the repeated endpoint. All core curves are continuous at the join; smooth analytic generators have smooth joins, while triangles have permitted corners. Sample interpolation is piecewise linear, so sampled representations do not promise differentiability. Seed, generator version, parameters, units, sampling convention and stable ID are retained. `tu` and `fu` are explicitly arbitrary time/frequency units, not carrier bands or established emitter types.

Frequency excursion is max(f) − min(f), **not occupied RF spectral bandwidth**. This is a frequency trajectory, not IQ, a spectrogram or a complete amplitude/phase waveform. Periodic instantaneous frequency does not imply periodic RF phase.

### Similarity

1. Interpolate each complete cycle onto a common **128-point phase grid**.
2. Centre at `(max(f) + min(f)) / 2`, divide by excursion, try every circular shift and retain the minimum RMS morphology distance. No reflection, reversal or local time warping is allowed.
3. Compute scale terms separately: `abs(log2(Ta/Tb))` and `abs(log2(Ea/Eb))`.
4. Combine: `d = sqrt(ws × RMS² + wt × log2(Ta/Tb)² + we × log2(Ea/Eb)² + wc × C²)`.

Defaults: morphology **0.65**, period **0.20**, excursion **0.15**, centre **0**. C is the absolute midrange-centre difference divided by the pair's mean excursion. Ignoring absolute centre is an adjustable assumption, not an established domain rule. Weights are coefficients, not probabilities, and need not sum to one. Changing them changes distance scale and the reference embedding. Physical time units s/ms/us and frequency units Hz/kHz/MHz convert to seconds/Hz before scale comparison. Arbitrary and physical scales cannot be mixed in combined comparison; no inferred conversion between them is attempted. Shape-only matching is dimensionless, so it can compare a physical observation with arbitrary synthetic references. Custom metrics only require compatible units for the scale terms whose weights are positive.

Circular shift invariance is exact for shifts on the phase grid and approximate otherwise. Interpolation, noise and coarse sampling affect precision. Relative dwell timing remains meaningful. Reversal/reflection of an asymmetric curve normally changes distance; symmetric curves can legitimately be equivalent under an allowed circular shift. Very fast features may require a larger phase grid.

### Map and imports

#### Named morphology regions

The 1,000 references are partitioned into **12 shape regions**, using only the circularly aligned, normalized RMS morphology distance described above. Period, excursion and absolute centre do not define these regions. They remain meaningful in the default combined neighbour ranking and comparisons. Using morphology avoids a partition driven mainly by period/excursion scale. Changing comparison weights changes rankings and the exact metric map, while region membership and colours stay stable.

The native TypeScript implementation uses deterministic **alternating k-medoids**: select the globally most central real cycle, add the farthest uncovered representatives, assign each entry to its closest representative, and update each representative to the member with the smallest summed within-group distance. Stable IDs break numerical ties. Stop when representatives no longer change, with a 30-round limit. This catalogue converges in six rounds. The representative is a real stored cycle, not an averaged waveform. See the [algorithm overview](https://scikit-learn-extra.readthedocs.io/en/stable/modules/cluster.html); no clustering library is added.

Twelve is a chosen browsing resolution, not a statistically estimated number of natural classes. All references are assigned; this algorithm does not detect outliers or prove that every member of a region is equivalent. Borderline curves may resemble several regions. Editorial names—such as **Echo Garden**, **Orbit Loom**, **Cloudline**, **Petal Loop** and **Amber Mesa**—are assigned after clustering, inspired by the representative's form. Generator labels affect the naming text only, never membership.

For display, each region becomes an uninterrupted tile island with an irregular stepped coastline placed near its mean position in the shape MDS projection. Patches receive gaps and label padding so they do not overlap. Tile order follows the shape projection. Shaded tile footprints enclose the displayed members; these are visual boundaries, not confidence contours. More members require more tile area, but label padding also affects island size. Added gaps do not encode quantitative distances. Search/filtering preserves tile coordinates.

#### Exact projection and local observations

Classical metric multidimensional scaling (MDS) double-centres squared pairwise distances; fixed-seed power iteration finds two leading positive eigenvectors. Families never determine positions. Identical normalized grids are cached across scale variants at 1e-9 numerical precision. Projection cannot preserve every relationship, particularly for non-Euclidean distances. Stress is reported in Methodology (exact combined projection approximately 0.120). Rankings always use full comparison distances, never screen positions. **Exact positions** removes island packing; equivalent curves may overlap there. Colours still indicate the shape regions.

In the exact map, import positions use the inverse-square weighted average of the five closest compatible **reference catalogue** entries (exact matches use the exact reference point). These are tentative interpolations, not exact out-of-sample MDS solutions; even distant inputs can fall inside the reference display. A physical import may have no compatible combined-metric neighbours or exact-map point. Switch to Shape only for unit-free matching with the arbitrary-unit synthetic catalogue. Local imports can match other compatible local imports.

In the named-region view, local tiles use their automatically assigned group colour and dashed outlines. They occupy free cells around an assigned reference island, or a new island on an expandable shelf below the references. Reference tile coordinates remain unchanged. New groups appear in filters, grid cards, the inspector and the Regions page. A region containing different unit labels reports that fact instead of combining incompatible ranges.

The reference combined-distance calibration is `max(0.15, 1.5 × p95(nonzero leave-one-out nearest-reference distances))`, approximately 0.263 with defaults. Custom combined browsing weights recalibrate this diagnostic. It is separate from automatic group admission, which uses the similarity threshold below.

### Automatic grouping and optional computer vision

`src/grouping.ts` replays incoming cycles in insertion order. For each reference region it compares the medoid and two fixed, evenly spaced members in sorted catalogue-ID order. For each new local group it compares the founding example. The strongest compatible representative supplies that group's score; the strongest group wins if its score meets or exceeds the admission threshold. If every score fails, or no group has compatible active units, a new provisional group is created immediately. A second matching example changes its status to a local group. That status records sample count, not scientific validation.

Reference memberships and representatives never change. Local founders remain fixed so a chain of marginal matches cannot pull a group away from its original shape. Generator provenance is independent of grouping. Removing an entry, undoing removal, or applying new settings deterministically replays the sequence, so deleting a founder may give its surviving members a different group. Group IDs derive from founder IDs; display numbering follows the replay order.

Default admission uses shape-only formula weights, an **82%** threshold, and **100% formula / 0% vision**:

```text
formula similarity = exp(−weighted signal distance)
combined similarity = α × formula similarity + (1 − α) × vision similarity
```

The formula is the existing circularly aligned RMS/period/excursion/centre comparison. Grouping has its own weights and is unaffected by changes to browsing weights. Adding period, excursion or centre weights requires compatible arbitrary/physical unit domains, even if the formula share is zero. Frequency and PRI always group separately.

`src/vision.ts` provides an optional classical computer vision baseline: rasterize normalized curves into 128 × 32 soft grayscale images, phase-align using the signal comparison, then compute soft intersection-over-union (`sum(min(pixelA, pixelB)) / sum(max(pixelA, pixelB))`). A 1.5-pixel Gaussian line width gives small noise some tolerance. No axes, labels or colours enter the image. There is no trained model, downloaded model or cloud service. This is a working pattern-comparison technique, not evidence that vision improves accuracy. The scores lie in [0, 1] but are heuristic similarities, not calibrated probabilities. Thresholds and blend weights need evaluation on held-out measured examples before making accuracy claims.

Cycles persist in the existing `frequency-agile-atlas.imports.v1` key; applied grouping settings persist separately in `frequency-agile-atlas.grouping.v1`. Reload reproduces assignments from the saved sequence and settings. Storage write failures leave the in-memory workspace unchanged. Invalid settings fall back to defaults with a notice while preserving the saved value.

### Control-insert demonstration

**Run control demo** starts a temporary workspace with default grouping settings and no saved imports. Insert each of five fixed controls from `src/controlInserts.ts`: a clear representative match, a deterministic noisy match, an unfamiliar eleven-lobed cycle, a phase-shifted repeat of that cycle, and a borderline mixture. Each row shows its default expectation, observed action and best score. The inspector shows candidate-group scores. Controls retain synthetic provenance and can be exported as JSON/CSV.

Default frequency outcomes are **join, join, create, join, create**; PRI outcomes are **join, join, create, join, join**. The final mixture's best similarity is about **80.5%** for Frequency and **82.5%** for PRI, on opposite sides of the 82% threshold. Blending in vision can change these outcomes; expected labels remain tied to defaults. **Reset demo** clears inserted controls, **Exit demo** restores saved imports, and switching quantity starts that quantity's sequence at step one. Demo settings and examples never write to localStorage.

## Complete-cycle import formats

Use the Import cycle dialog to choose a file or paste text. It stays on this device. Provide **one complete cycle and its period**. Automatic period detection, IQ/spectrogram extraction, partial-cycle matching and automatic closure/smoothing are outside this MVP.

JSON is one object (not a top-level array):

```json
{
  "name": "My complete cycle",
  "period": 1,
  "units": { "time": "tu", "frequency": "fu" },
  "sampling": "closed-endpoint",
  "samples": [
    { "t": 0, "f": 10 },
    { "t": 0.125, "f": 10.7 },
    { "t": 0.25, "f": 11 },
    { "t": 0.375, "f": 10.7 },
    { "t": 0.5, "f": 10 },
    { "t": 0.625, "f": 9.3 },
    { "t": 0.75, "f": 9 },
    { "t": 0.875, "f": 9.3 },
    { "t": 1, "f": 10 }
  ]
}
```

CSV has exactly `t,f` columns. Metadata is in comment headers or explicitly supplied in the dialog's CSV metadata overrides:

```csv
# name: My complete cycle
# period: 1
# time_unit: tu
# frequency_unit: fu
# sampling: closed-endpoint
t,f
0,10
0.125,10.7
0.25,11
0.375,10.7
0.5,10
0.625,9.3
0.75,9
0.875,9.3
1,10
```

See [public/examples/complete-cycle.json](public/examples/complete-cycle.json) for a full export-compatible example.

Requirements: 8–8193 samples, ≤2 MB, finite numeric t/f, positive period, nonzero finite excursion, explicit supported units, t=0 start, strictly increasing timestamps. Duplicates, unordered timestamps, missing metadata and invalid files receive errors. Data is never sorted or smoothed silently.

- **closed-endpoint:** include the endpoint t=T (time tolerance `1e-9 × T`); frequency endpoints must match within `max(1e-10, 1e-6 × excursion)` in supplied frequency units. Original values within tolerance are retained, not repaired. Nonuniform sampling is allowed.
- **uniform-open:** explicitly declare N uniformly spaced samples at t=iT/N for i=0…N−1. The declared cycle wraps by interpolation to the first sample at T. Because the endpoint is absent, measured continuity cannot be independently verified; choosing this convention explicitly assumes it. Use closed-endpoint when you want boundary verification.

Imports retain original frequencies and units. Derived excursion/centre are recalculated from supplied samples, not trusted from a file. Importing a synthetic export treats it as a new local observation; it does not mutate the catalogue.

Local storage is origin/browser/device-specific, supports up to 100 imports, and is not cloud sync. JSON/CSV export and removal (with undo) are explicit. Storage failures reject additions rather than pretending persistence succeeded. Malformed saved data is left untouched and reported. Export before clearing browser storage. No imports are sent to a server or written into catalogue files.

## GitHub Pages

Repository: [iLikeToLie/signal-atlas](https://github.com/iLikeToLie/signal-atlas). The v0.1.1 release targets [GitHub Pages](https://iliketolie.github.io/signal-atlas/). Local imports remain in the browser and are excluded from the published catalogue.

The prepared [Pages workflow](.github/workflows/pages.yml) follows [official custom-workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Pull requests build/test only. Publish manually through `workflow_dispatch`, or push an explicit release update to `public/version.json` on `main`. Ordinary code pushes do not deploy. The visible app version comes from `package.json`; keep it aligned with `public/version.json`.

1. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
2. Ensure the intended branch is permitted by the `github-pages` environment's deployment protection rules. The workflow uses the branch chosen when you run it; there is no hardcoded main/master assumption.
3. Once you intentionally commit/push the files, go to **Actions → Build and deploy Signal Atlas → Run workflow** and choose the intended branch. This action publishes the app.

The workflow uses `configure-pages`'s `base_path` output, uploads `dist`, and deploys with the required `pages: write`, `id-token: write`, environment and build dependency. Vite embeds assets/worker paths using `PAGES_BASE_PATH`. Hash navigation needs no server rewrites. Assets and the example download work on `/repository-name/`, root sites and local development. No secrets are required.

Project-path rehearsal:

```sh
# POSIX shell
PAGES_BASE_PATH=/signal-atlas/ pnpm build
PAGES_BASE_PATH=/signal-atlas/ pnpm preview
```

```powershell
$env:PAGES_BASE_PATH = '/signal-atlas/'
pnpm build
pnpm preview
```

Visit `http://localhost:4173/signal-atlas/#/atlas?id=control-reference`. Public deployments expose bundled synthetic catalogue data. Local imports are never bundled.

## Code boundaries and verification

### Frequency and PRI views

The **Arrange by → Frequency / PRI** buttons switch between two precomputed atlases with matching signal IDs. Tiles animate between positions over 850 ms; reduced-motion preferences disable movement. Each view has its own morphology distances, 12 regions, MDS coordinates, representatives and neighbour rankings. Region labels overlay uninterrupted tile patches with stepped coastlines rather than convex hulls. Coast shape and spacing are display choices, not statistical boundaries.

PRI references are independent, deterministic synthetic positive interval trajectories associated with the same 1,000 frequency references. They illustrate pulse-interval agility and do not infer pulse timing from carrier frequency. Pattern period T is a whole repeating trajectory; PRI is the interval between pulses, and PRF = 1 / PRI. These continuous interval models are not pulse detections. Generate their saved atlas with `node scripts/generate.ts --pri`.

For PRI JSON imports set `"quantity": "pri"`; for CSV add `# quantity: pri` or select the CSV value type in the import dialog. The existing `t,f` columns / sample fields are retained: `t` is elapsed time and `f` holds the PRI value. Both time and PRI units must be explicit (`tu`, `s`, `ms`, `us`); the PRI unit occupies `units.frequency` / `frequency_unit` in this shared schema. Every PRI must be positive. Samples still describe one complete periodic trajectory, with the existing endpoint checks. PRI exports preserve the quantity and units, and only appear in the PRI view. Frequency imports remain in Frequency. Example: `public/examples/complete-pri-cycle.json`.

- `src/catalogue.ts`: deterministic waveform generators and provenance labels.
- `src/signal.ts`: interpolation, shift alignment, unit handling and neighbour ranking.
- `src/layout.ts`, `src/layout.worker.ts`: MDS and stable import interpolation; `src/regions.ts`: deterministic morphology grouping and editorial names; `src/displayLayout.ts`: separated region patches and tile spacing.
- `src/grouping.ts`, `src/vision.ts`: incremental admission, fixed representatives, formula/image blending and validated settings.
- `src/controlInserts.ts`, `src/GroupingPanel.tsx`: deterministic insert fixtures, isolated demo controls and score explanations.
- `src/importExport.ts`: strict import validation, export, browser persistence.
- `src/Atlas.tsx`, `src/Plot.tsx`, `src/App.tsx`: rendering and user workflow.
- `scripts/generate.ts`: reproducible immutable catalogue, default layouts and synthetic threshold.
- `tests/grouping.test.ts`: automatic join/branch, both control sequences, replay/removal, image alignment, hybrid weighting, compatibility gates, validation and 100-group map capacity.
- `tests/signal.test.ts`: periodic joins, deterministic metadata, shift invariance, scale/direction changes, unit compatibility, MDS, placement, clustering without family labels, separated region envelopes and parser/export failures.

All-shifts RMS costs O(phaseGrid²) per comparison. Pairwise layouts cache repeated normalized morphologies, reducing the work for scale variants; MDS still uses dense catalogue² matrices. Ranking is synchronous for 1,000 entries, while layout recomputation uses a worker. `ponytail:` substantially larger catalogues should precompute rankings or replace alignment with FFT correlation and use a scalable embedding. Browser persistence uses localStorage; switch to IndexedDB if import volume increases.

See [VERIFICATION.md](VERIFICATION.md) for checks actually performed and remaining verification limits.
