# Constellation map and quantity transitions — 8 October 2026

- Feature preview revision `constellation-map` continues on `feature/revised-inputs`, with the development version `0.1.5-revised-inputs`.
- All nine Node test files and the TypeScript/Vite Pages-path build passed. Existing library checks cover membership independence from generator labels, reviewed merge identity/undo and 10,000 separate tiles with disjoint region bounds.
- Chromium checked short map names, retained tiles while the other quantity loads, repeated/cached Frequency/PRI transitions, animation through a camera adjustment, toggling with playback paused, and reduced-motion suppression. Canvas frames advanced during the transition; destination hit rectangles remained separate. The transition remains visible for roughly 720 ms rather than being cancelled by camera updates.
- Production browsing under `/signal-atlas/` passed Frequency/PRI nonoverlap, retained sparse intake and reload, duplicate-window refusal, source removal/undo, isolated split review and saved merge/undo. Desktop and 390 × 844 mobile checks had no runtime errors or horizontal overflow. Constellation screenshots in `artifacts/` were visually inspected and remain ignored local artifacts.
- Group names and the constellation arrangement are editorial display choices. No admission thresholds, stored observations, grouping memberships or historical catalogue data changed.

# Retained-library update — 8 October 2026

- Feature development continues on `feature/revised-inputs`, with main at v0.1.5 and no new release tag. Preview metadata revision: `retained-library`.
- All nine Node test files and the TypeScript/Vite Pages-path build passed. Seven focused library cases cover full-catalogue reassessment, label independence, stable founders, synthetic/capture support, conservative merge approval/persistence/undo, incompatible-member rejection, 10,000 separate tiles, corrupt-storage preservation and quantity-scoped review migration.
- The historical Frequency catalogue split its 124 sinusoidal examples 80/44 across two clusters. The live threshold-based library puts those examples together and currently discovers 19 groups under defaults. This demonstrates the implemented policy, not measured accuracy or natural-class discovery.
- Chromium verified all 1,000 Frequency and PRI tiles with no intersecting hit rectangles, a single grouped map, optional intake, sparse/hopping extraction preview without premature saves, refresh persistence, synthetic inclusion without deleting observations, duplicate-window refusal, source removal/undo, isolated split-demo approval/undo, and merge approval with surviving identity and undo after refresh. These flows also passed against the production build under `/signal-atlas/`.
- At 390 × 844, keyboard tile selection and inspector dismissal passed without horizontal overflow or runtime errors. Local screenshots under `artifacts/library-*.png` are ignored.
- The grouped layout handles 10,000 tile positions in a focused nonoverlap test. Browser storage capacity, 10,000-signal rendering/grouping performance, measured validation, label-free stability diagnostics and durable shared storage are not claimed complete.
- Original catalogue data, earlier browser keys and stored observations remain intact. Unified reviews use a separate quantity-scoped key; fixed-catalogue calibration stays out of discovered groups. Pages verification checks both the development version and preview revision.

# Earlier empty-workspace prototype checks — 8 October 2026 (superseded interface)

- GitHub Actions passed build, tests, catalogue reproducibility and artifact upload. The earlier release-named branch was rejected before deployment steps: `Branch "release/v0.1.6" is not allowed to deploy to github-pages due to environment protection rules.` Repository environment configuration must allow this branch. The deploy job checks the live `version.json` after publication.
- Feature packaging uses `0.1.5-revised-inputs` on `feature/revised-inputs`, keeping main unchanged. This is a development identifier based on v0.1.5, not a numbered release. The cancelled v0.1.6 tag is removed. The branch workflow deploys preview/configuration updates to GitHub Pages. Tests, production build and reproducible catalogue generation passed.

- All eight Node test files passed. Eleven new recording/workspace cases cover unlabelled intake, irregular/sparse/hopping period recovery and competing multiples, unresolved constant/ramp/noise/poor-coverage inputs, preserved windows/missing edge rows, empty Frequency/PRI grouping, supplied capture support, duplicate/reload guards, finite incompatible-unit projections, collision-free duplicate tiles, and observed-anchor preservation through split replay. The existing growth cases also pass.
- TypeScript and the GitHub Pages production build passed. No dependencies or catalogue data changed. Local documentation links resolve and `git diff --check` passed.
- Chromium at desktop and 390 px mobile widths verified unknown-period Frequency/PRI intake, explicit preview before saving, grouping solely from approved observations, refresh persistence, duplicate-window refusal, source removal/undo, separate workspace modes, mobile keyboard selection/inspector, and no horizontal page overflow. The measured start does not fetch synthetic catalogue JSON. The production preview under `/signal-atlas/` also passed intake, worker loading, approved grouping and demo split approval.
- The isolated group-health example supports inspection, split approval, undo and reset without writing measured storage. An observed split explicitly retains parent and other existing founders before replay. Both named and similarity views were checked for nonoverlapping hit rectangles across all 1,000 synthetic entries; 1,100 identical-coordinate tiles also pass pairwise nonoverlap checks. Underlying metric coordinates are unchanged by display padding. Quantity waveform crossfades keep destination tiles fixed.
- Corrupt saved measured data remain untouched with mutations disabled; the review demo still works independently. Simulated storage-write failure leaves observations unchanged. Constant recordings remain saved and unresolved, and cannot be forced into a nonzero-excursion cycle. Screenshots under `artifacts/measured-*.png` are ignored local artifacts.
- Period suggestions, 20% extraction coverage, 5% dense-core handling and three supplied-capture support are initial heuristics. Synthetic controls establish implementation behavior, not measured-data accuracy, verified acquisition independence, a fundamental-period guarantee or physical class identity. Complete workspace restore, identity editing and label-free stability diagnostics remain planned.

# v0.1.5 release checks — 8 October 2026

- Bundles controlled group growth/review and sparse/discontinuous repeating-cycle imports with faster Frequency inspector playback. Package and public release versions are 0.1.5.
- All seven Node test files and the TypeScript/Vite GitHub Pages build passed. Catalogue regeneration left the checked-in reference data and complete-cycle example unchanged.
- Chromium measured the control-reference Frequency sweep at 1.917 seconds (previously 4.8) at 1× and 0.950 seconds at 2×. PRI retained its 12-second cap. Pause, reduced-motion handling and a 390 px viewport passed without runtime exceptions. Stored periods, original observations and plot axes retain their original values.
- The controlled-group and sparse-cycle browser checks below were rerun for the release, covering explicit previews, persisted decisions, undo, per-quantity isolation, invalid/corrupt-data handling and desktop/mobile layouts.
- The initial review/growth and sparse reconstruction heuristics retain the validation limits described below.

# Controlled group growth — 8 October 2026 (local, unreleased)

- The seven-file Node suite passed. Eleven focused growth cases verify anchor drift guards in both insertion directions, bounded coverage representatives, duplicate/phase-copy support, split proposal/approval/undo, complete-link bridge rejection, reconstruction isolation, competing-group review/reassignment, settings/removal pauses, per-quantity storage and bounded undo history. Existing independent-reference evaluation parity remains covered.
- TypeScript and the production GitHub Pages build passed. Local document links resolve and `git diff --check` passed. No dependencies or reference catalogue data changed.
- Chromium at 1440 × 1000 verified proposal preview without persistence, explicit approval, refresh preservation, Frequency/PRI isolation, undo after refresh, review acknowledgment, demo isolation and corrupt-storage protection. At 390 × 844, the review panel had no horizontal overflow and approval remained reachable. No runtime exceptions were observed. Desktop/mobile screenshots were inspected and are ignored under `artifacts/group-growth-*.png`.
- A 100-import synthetic smoke check completed grouping in about 1 second in this execution environment. This is not a device performance benchmark; grouping remains on the main thread at the existing 100-import limit.
- These checks establish behavior, not grouping accuracy. The 8/5 percentage-point review/separation margins and three-shape support rule need measured, source-aware sequential validation. Sparse reconstruction inputs cannot provide automatic core support or split evidence. Shape diversity does not establish capture independence. Existing frozen-reference accuracy reports do not validate adaptive growth.

# Sparse/discontinuous cycles — 8 October 2026 (local, unreleased)

- `npm test` passed all six test files, including six new sparse-cycle cases for preserved observations/missing rows, minimum-count and cyclic-gap guards, hop boundaries, periodic reconstruction, exact step geometry, circular-shift matching, export/storage round trips, deterministic replay and reconstruction-aware fingerprints. Legacy validation and existing evaluation/grouping tests pass.
- TypeScript and the production GitHub Pages build passed. README/roadmap/technical-document local links resolve and `git diff --check` passed.
- Chromium at 1440 × 1000 verified explicit preview/save, no storage writes during preview, preview invalidation after changing the model, observed markers, Frequency/PRI imports, reload preservation and rejection of a poorly covered cycle without changing saved imports.
- At 390 × 844, the PRI preview and dialog had no horizontal overflow and save remained reachable by scrolling. Desktop/mobile screenshots were inspected; no browser runtime errors were observed. Screenshots are local and ignored under `artifacts/sparse-import-*.png`.
- This validates implementation behavior, not reconstruction accuracy on measured captures. Eight observed points and a 20% maximum cyclic interval are initial guards requiring dataset-specific validation; nonperiodic windows, missing-pulse inference and arbitrary extrapolation are outside this implementation.

# v0.1.4 verification — 8 October 2026

- `npm test` passed all five test files. Coverage includes retired CNN/unknown model rejection, non-mutating fallback for saved CNN settings, existing grouping/evaluation behavior and archived CNN parity/evidence checks.
- `PAGES_BASE_PATH=/signal-atlas/ npm run build` passed TypeScript and the Vite production build. The built index uses the GitHub Pages asset base.
- Production JavaScript contains no CNN selector, CNN walkthrough, encoder input-validation string or model architecture marker. Archived weights and reproduction code remain in the repository.
- Local links in the README, roadmap, model card and focused technical documents resolve; package and public release versions both read 0.1.4; `git diff --check` passed.
- The roadmap describes planned work, not implemented features. Browser interaction was not rerun for this release; the verification above covers tests, build output and documentation.
- Historical checks below retain their original release context.

# Evaluation and calibration verification — 7 October 2026

- All **33 named tests passed**, including fit/tune/test source separation, active-reference exclusion, duplicate/leaky dataset rejection, unchanged fitted parameters after test-label mutation, exact parity with live grouping for all test cycles and configurations, monotonic score bounds, distinct merge/split/wrong-group metrics, profile quantity/weight/catalogue scoping and non-mutating storage migration.
- TypeScript and the Vite production build passed, including the evaluation worker. Browser checks exercised both quantities, actual worker results, explicit profile application, reload, quantity isolation, feature-weight invalidation, dataset/result downloads, exported dataset reimport, leaky-source rejection and a 390 px viewport without horizontal overflow.
- Additional browser checks confirmed that the local-import inspector exposes calibrated and raw scores, and applying a calibration in the demo then exiting preserves saved imports/profiles. Exported datasets also ran successfully through the CLI. No browser console errors or runtime exceptions remained.
- `npm run evaluate` generated deterministic reports in ignored `artifacts/`. Each view has 24 fit, 24 tune and 24 test examples from disjoint source morphologies, covering six of twelve known reference regions.
- Frequency test balanced accuracy is 100.0% across raw formula, tuned formula, calibrated formula and calibrated hybrid. PRI values are 94.4%, 94.4%, 94.4% and 97.2%, respectively. Hybrid uses 75% formula / 25% vision and fixes one PRI known-region mistake. Its paired source bootstrap improvement interval is 0.0–8.3 percentage points; this does not establish a hybrid advantage.
- Tuning ties select formula-only for both views, with calibrated admission thresholds about 45.0% and 47.5%. Test outcomes do not override those recommendations. Formula pair Brier errors improve from 0.2631 to 0.0567 (Frequency) and 0.2593 to 0.0510 (PRI).
- Labels describe synthetic reference-region consistency; the original catalogue clustering saw the source templates. No human-labelled measured dataset was available, so no physical-class or measured-data accuracy claim is made. Source bootstrap intervals describe the listed sources and can collapse for perfect observed scores.
- These checks preceded publication; evaluation/calibration subsequently shipped in v0.1.2. Earlier release verification follows.

# Verification — 6 October 2026

## Automatic grouping and hybrid comparison

- All **23 named tests passed** with `node --test --test-isolation=none --test-reporter=spec tests/*.test.ts`; `npm test` also passed. New tests cover join/branch, default control outcomes for Frequency and PRI, inclusive admission thresholds, reference immutability, replay after storage round trips/removal/restoration, circular image alignment, actual weighted formula/image scores, unit/quantity compatibility, invalid settings and a 100-new-group layout with stable reference tiles.
- TypeScript and the Vite production build with `PAGES_BASE_PATH=/signal-atlas/` passed. No dependency or catalogue-data changes were needed.
- Chromium at **1440 × 1000** ran all five Frequency controls: join Orbit Loom, join Orbit Loom, create New group 01, join New group 01, create New group 02. All five matched their predefined expectations. The Regions page included 14 group cards.
- All five PRI controls matched their expectations: join Petal Loop, join Petal Loop, create New group 01, join New group 01, join New group 01. With a 70% formula / 30% vision blend, the borderline PRI example's best formula/image/combined similarities were **82.5% / 15.6% / 62.4%**, and it branched instead of joining. These illustrate the implementation, not accuracy improvements.
- Reset cleared demo insertions; exit restored the saved workspace. A clean demo session left localStorage empty. A real JSON import joined Comet Tail and retained the same assignment after reload; removal and undo restored the saved cycle.
- At **390 × 844**, the demo and inspector had no horizontal overflow (document width 390). Desktop/mobile screenshots were inspected. No browser runtime exceptions were observed. The new-group overview reserves lower viewport space for captions; selecting a different mobile cycle resets the inspector scroll to its header.
- Additional Chromium checks verified grouping settings after reload, demo isolation with existing saved imports and settings, new-group filters containing the founder/repeat pair, a visible mobile inspector close button, and recoverable notices for malformed settings and duplicate saved IDs.
- The previous verification sections below describe earlier iterations. Their unassigned-import behavior is superseded by automatic grouping. The method is heuristic, references are synthetic, and no held-out measured-data accuracy comparison was performed.

## Named-region iteration

- All **12 Node test groups passed**. New checks verify deterministic alternating k-medoids, real representative cycles, unchanged membership when generator labels or input order change, scale-variant co-membership, complete 1,000-entry coverage, twelve unique names/colours, non-overlapping region envelopes, and reserved label cells for local imports.
- Shape clustering converged in **six rounds**, with mean member-to-representative normalized RMS **0.079**. The region count is a fixed browsing choice; no natural-class or confidence claim is made.
- Regeneration retained SHA-256 `D8C6FF46B7AF5DBF3EE996B3EE49C2C951F0E152E3CD884A522AC2EF742489D7`. TypeScript and the `/signal-atlas/` production build passed. Client JavaScript is about 283 kB uncompressed; no dependency was added.
- Browser checks found twelve distinct coloured outlines and 1,000 tiles. Clicking a region focused its island and selected its representative; Enter also worked on region labels. Region-name search returned the expected membership (Amber Mesa: 167). The Regions page displayed representatives and scale ranges alongside the original generator-provenance overview.
- Switching to Exact positions preserved neighbour scores. Shape-only/combined mode changes retained all region names and memberships. A custom centre-weight worker run completed in about 2.9 seconds and changed exact-map stress to 0.228; defaults restored successfully.
- A temporary physical s/Hz import appeared as a white **unassigned** tile in the shape-region view and had no point in the incompatible combined exact map. A discovered overlap with a region name was fixed by reserving label cells; the repeated browser check found no label overlap, and the tile was selectable. Test imports were removed.
- At **390 × 844**, the region inspector and three-cycle plot fit without horizontal overflow; closing the inspector exposed the region controls. The desktop viewport was restored. No browser console warnings/errors were observed.
- The updated screenshot is `artifacts/atlas-regions.jpg`; `artifacts/atlas-preview.jpg` also reflects the new view. Both remain local and ignored by Git. The in-app Methodology page and README document the algorithm, editorial naming, metric distinction, projection limits and approximate import placement.

## Feedback iteration

- All **10 Node test groups passed** for the 1,000-entry catalogue. Added checks cover retention of the original 104 entries, the expanded smooth generators, three-cycle timing/alignment without mutation, cached matrix agreement with direct comparison, and deterministic non-overlapping tile placement with stable references when imports are added.
- Regeneration retained SHA-256 `9611831FB3BB8D42816D84341FEA562A33E66B022672BB2CFEC2D89BD10AD0D9`. Generation took about three seconds locally.
- TypeScript and the production build passed at `/signal-atlas/`. Client JavaScript is about 273 kB uncompressed; the expanded catalogue is 11.5 MB uncompressed / 2.3 MB gzip.
- Browser inspection found **1,000 separate tile positions**. Exact-position toggling preserved neighbour rankings. Pointer and keyboard selection worked, filtering retained the selected tile's position, and zoom/focus/reset showed individual waveform tiles in distinct neighbourhoods.
- The inspector defaulted to three cycles with labelled boundaries. For `blend-04`, the axis ran to 6.6 tu while stored T remained 2.2 tu; one-cycle detail ran to 2.2 tu. Playback reached cycle three, then paused successfully.
- Original comparison retained each pattern's three-cycle duration (T=1.6 and T=3.2 ended at 4.8 and 9.6 tu). Normalized overlays aligned exactly for the period-control pair on a 0–3 phase axis; side-by-side plots each displayed three repeats.
- The 1,000-entry custom-layout worker completed in about 2.8 seconds with centre weight 0.10 (stress 0.120 → 0.228); defaults restored successfully. No browser warnings or errors were observed.
- At **390 × 844**, the three-cycle plot fit without horizontal overflow. Inspector close/reopen and refresh preserved the selected route and restored the three-cycle default. Touch pinch still awaits a physical-device check.
- Updated screenshots are saved locally under `artifacts/` (ignored by Git).

## Initial build

- All **7 Node test groups passed**: deterministic 104-entry catalogue, continuous joins and smooth generator slopes, accurate metadata, circular alignment, scale/direction controls, underlying neighbour distances, deterministic MDS, stable import placement, CSV/JSON round trips, invalid data rejection, physical conversion and unit-free shape matching.
- Regeneration produced an **unchanged SHA-256 catalogue hash**.
- TypeScript checked cleanly; Vite production builds passed without chunk warnings, including `PAGES_BASE_PATH=/signal-atlas/`.
- Production and development apps both loaded all 104 references. Project-path assets, catalogue data and selected-entry hash routing worked in the in-app browser.
- Browser checks passed for mouse panning, keyboard panning/selection, zoom/reset, zoomed waveform thumbnails, family filters, search/grid, family overviews, underlying neighbour display, playback/pause/speed without changing stored period, original overlays, normalized aligned comparison and side-by-side views.
- A local complete-cycle JSON import persisted after refresh. Invalid endpoint data produced a clear error. Removal and undo worked. A physical s/Hz import remained unassigned in combined mode and found normalized shape neighbours in shape-only mode. Test imports were removed afterward.
- Custom centre weights changed the worker-computed map (reported stress changed from 0.141 to 0.254); resetting weights restored defaults. No browser console errors were observed.
- At a **390 × 844 viewport**, there was no horizontal overflow. Grid selection opened the phone inspector; closing, reopening and refreshing a selected route worked. Pointer pinch handling is implemented but was not tested on a physical touch device.
- JSON/CSV export payloads passed strict parsing round trips. Both download buttons saved files to Downloads: the JSON retained the local cycle's nine samples and period; the CSV retained 257 synthetic samples and metadata. The automation download-event listener timed out, so completion was verified by reading the saved files instead.

GitHub deployment was not run: the repository has no configured remote. The workflow and documented settings are prepared for intentional manual publication. Two-dimensional projection, approximate import placement and the synthetic novelty threshold remain methodological limitations described in the README.
# Frequency / PRI and coastline iteration

- All **13 Node test groups passed**, including paired deterministic PRI generation, positive interval validation, physical PRI unit conversion, CSV/JSON PRI round trips, both 1,000-tile layouts, and disconnected contour footprints that are not bridged by convex hulls. Original frequency catalogue preservation checks still pass.
- TypeScript and the production `/signal-atlas/` build passed. Two saved datasets are bundled: frequency 11.545 MB / 2.320 MB gzip and PRI 11.291 MB / 2.343 MB gzip. Client JavaScript is 289.38 kB / 91.96 kB gzip. No dependencies were added.
- Browser verification: Frequency and PRI retain the same selected signal ID, change the selected trajectory/units and neighbour rankings, and show 1,000 tiles in each view. Intermediate computed tile transforms differed from their final SVG target positions with a **0.85 s transition**, confirming animated movement rather than an instantaneous layout swap.
- Islands use uninterrupted tiles, irregular stepped contours, colour shading, and overlaid uppercase names. The Frequency/PRI selector works at 390 × 844 with no horizontal overflow; the temporary viewport override was reset.
- PRI import dialog defaults to the PRI value type and links to the PRI example. Parser/export checks cover interval units and invalid non-positive values. No test observations were added to browser storage.
- Methodology headings are shortened to Cycle comparison, Shape regions, Map layout, and Signal data. The data section distinguishes independently generated synthetic PRI trajectories, whole-pattern period T, and PRF = 1 / PRI.
- Browser console contained no warnings or errors. Screenshot: `artifacts/atlas-pri-coastlines.png`. PRI data are synthetic continuous interval models, not detected pulse timestamps. Reduced-motion CSS disables tile transitions and region fades.

# Zoom labels and visual sweeps

- All 14 Node test groups pass; TypeScript and production build pass. No dependencies added.
- Browser checks confirm Atlas, Regions and Compare headings. Region labels disappear at close zoom; persistent selected labels also hide, with capped hover text.
- Selected plot sweep transforms change over time. Pause freezes the selected plot and tile sweeps. Close-up Cloudline renders 48 animated tiles; Braided Current renders 16. Overview renders no tile sweeps.
- CSS drives animation over unchanged precomputed waveforms; reduced-motion styles restore static traces. Selected sweep duration is illustrative, clamped to 1.2–12 seconds. Progress text updates at 4 Hz, and skips hidden tabs.
- No browser warnings/errors observed. Screenshot: artifacts/atlas-fluid-waveforms.png.

# v0.1.2

- Imported the complete cloud working copy against 1075395. The reconstructed patch SHA-256 matched the cloud export; the release is based on the fetched v0.1.1 commit.
- All 33 Node tests passed, including enabled hybrid defaults, unit compatibility, deterministic replay, source separation, calibration scoping and live/evaluation scoring agreement. TypeScript and Vite production build passed.
- Codex browser checks confirmed v0.1.2, three-cycle inspector without a one-cycle button, percentage RMS candidate values (6.7%, 10.6%, 14.3%), percentage weights and neighbour distances, and Frequency/PRI changes with a 0.65-second CSS transform transition.
- The control demo's first entry joined Orbit Loom with formula, vision and combined scores of 100%, at the default 65% admission threshold. Demo examples were removed through Exit demo; saved imports were untouched. Screenshot: artifacts/v0.1.2-preview.png.
- A 70% formula / 30% vision blend with a 65% threshold correctly assigned all 24 tuning examples per quantity. On 24 independent test examples per quantity, balanced accuracy was 91.7% Frequency and 88.9% PRI. Legacy raw formula at 82% scored 100% and 94.4%. Keep these comparisons visible in evaluation; the default blend is experimental, not evidence of superior accuracy. Detailed reproducible reports: artifacts/evaluation-frequency.json and artifacts/evaluation-pri.json.
- Existing saved formula-only or calibrated settings are preserved. Use defaults and Apply & regroup to opt into the new blend in an existing workspace.
