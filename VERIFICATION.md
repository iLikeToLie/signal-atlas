# Interactive methodology explanations — 12 October 2026

User-approved additions on `codex/v0.1.7-map`: interactive numerical waveform comparisons, an exact partial-interval picture and a complete-link grouping illustration.

- Two added tests reproduced absent comparison scopes/illustration inputs, then passed. The methodology suite is **4/4**; the full named suite is **140/141**, with only the unchanged inherited deprecated catalogue equality failure described below.
- Root and `/signal-atlas/` TypeScript/Vite builds pass. The matcher, grouping algorithm, schema, storage, datasets and lockfile are unchanged.
- Extended Chromium acceptance passes example selection, parameter masks changing the actual score and plotted channels, absolute-penalty changes, exact `[16,48)` partial scope with 32 supported/32 unsupported target events, grouping threshold transitions (two/one/three groups), preserved applied map parameters/threshold, and existing navigation/camera/review/map checks. No runtime errors or overflow at 1440/768/390 pixels.
- Desktop/mobile comparison and grouping screenshots were inspected. The comparison reuses the existing shared cursor and coordinated zoom. The diagram's 92/90/78 scores are explicitly illustrative and evidence-complete; membership runs the actual complete-link function.
- Controls are local to the methodology sandbox; saved settings, observations and review history are unaffected. The original calculated five-case summary remains available in a collapsed section.
- Fresh read-only review found no actionable issues and independently passed 4/4 methodology tests, additional single/combined parameter and high-overlap cases, and visual checks. [Review record](docs/superpowers/reviews/2026-10-12-interactive-methodology-review.md).

These changes remain local. Synthetic examples do not establish measured-data accuracy; physical touch hardware and other browser engines were not checked.

# Matching presentation, methodology and one-word names — 12 October 2026

Approved phases 1–2 on `codex/v0.1.7-map`, plus the requested one-word similarity-island names. Changes are local; no push, tag, merge or deployment was performed.

- Named Node suite on macOS / Node v24.21.0: **138/139 pass**. All seven added tests pass. The unchanged inherited PRI catalogue deep-equality test fails on 417 floating-point differences, maximum `9.71445146547012e-17`, with no structural differences. Frozen catalogues, stage-0 controls, matcher, grouping boundary and schema are unchanged. This suite is not described as fully green.
- Focused layout, presentation and methodology suites: **13/13 pass**. RED→GREEN coverage includes four default suggestions with uncapped highlights, bounded label sizing, badge/card collision avoidance, offscreen badge suppression, actual worked-example calculations and 40 unique one-word island names while emitter attribution remains unchanged.
- Root and `/signal-atlas/` TypeScript/Vite builds pass; locked dependencies remain unchanged. Local documentation links and whitespace checks pass.
- Chromium acceptance passed the phases 1–2 map flow: seven masks, 38 windows/37 highlights, four default suggestions, expansion to 8/all, no card/badge overlaps, methodology navigation with retained selection/camera and focus return, 1440/768/390 viewports, review target/race guards, filtering, reduced motion, emulated pinch and workspace isolation. Final rerun also passes rendered one-word names, 0.03/6 zoom limits, maximum 20-pixel badge height and readable methodology body typography. No runtime errors or document overflow.
- Desktop map/methodology screenshots were inspected. Definition-list typography was corrected to use the page's readable body font rather than inherited inspector statistics styling.
- Both built URL paths (`/` and `/signal-atlas/`) load all 15 demo windows and five methodology examples, retain the four-line default and return to the map without failed requests or runtime errors. Desktop/mobile methodology previews were inspected.
- Fresh final review independently passes 26 focused tests, with no analytical or data-integrity findings. Its detached offscreen-badge finding was reproduced and fixed in one RED→GREEN pass; [review and scope rulings](docs/superpowers/reviews/2026-10-12-matching-methodology-review.md). No second review was requested.
- A targeted Chromium check pans connections offscreen through 12 steps: no detached badges remain and keyboard activation still opens comparison evidence.

No physical touch hardware, other browser engine, ignored cloud pilot artifacts, measured-signal accuracy or new million-event pilot was checked. The emitter narrative choice is recorded; synthetic-data changes remain in later phases. Historical verification below retains its original version-specific scope and environment.

# v0.1.7 — observation map release candidate, 12 October 2026

Prepared locally from `9fa26df` (preview 2.5) on `codex/v0.1.7-map`. Package/public metadata: **0.1.7 / observation-map / v0.1.7**; metadata prepares the tag identifier and does not create a release. Merge, tag and publication are pending.

- **132 named tests pass**. New suites cover all seven masks, strict simultaneous evidence, missing/derived/ambiguous channels, whole-first and temporal partial matching, every-pair complete linkage, deterministic nonoverlapping geometry, camera/edge invariants, all-match highlighting and exact reviewed destination scopes/revisions. Old import/merge/undo/hash/history and frozen-control reproduction remain green.
- Installed Chrome **154.0.8037.98** on Windows, **1440×1000 / 390×844**, passes actual map navigation, seven masks, fixed emitter placement, dim/hide without repacking, source/target inspector, full/partial ordering, all 37 highlights with eight initial lines, expandable totals, keyboard tiles/links, wheel anchoring, panning and **CDP-emulated pinch**, interrupted animation and reduced motion. A hit test on a rendered label crossing a tile resolves to the connector, confirming actual stacking. Multiple supported patterns require explicit selection; an unreviewed destination requires creation. Delayed grouping during workspace switches retains the new observation and rejects stale scene data. Zero-match Focus matches is disabled. No runtime errors or horizontal overflow.
- The preserved browser flow passes JSON/CSV modal preview/cancel/save, intact originals and shared physical overlay axes, variants, cross-emitter reviewed links, historical scoped comparisons, partial [16,48), missing-channel diagnostics, unresolved retention, narrower windows, undo after arrivals, reload, full backup/replace equality, corrupt-backup rejection, injected write rollback and stale revisions.
- The **production-path pilot** retains **1,000,000 events, 50 sources/profiles, 500 windows and 50 reviewed patterns**. Largest source: 100,000 events. Ten profiles deliberately lack PW, leaving **400 eligible / 100 insufficient-evidence windows** under the three-channel mask. Matching checks all **499 destinations**; grouping processes **79,800 eligible pairs**. Scene model contains 500 windows even when viewport culling mounts fewer tiles. Cancellation preserves saved evidence.

Observed pilot results (one Windows run, 12 logical processors, reported 32 GB device memory):

| Measurement | Observed |
| --- | ---: |
| Largest modal preview / save | 1.006 s / 0.840 s |
| Initial 500-window scene metadata | 454 ms |
| Initial grouping ready | 47.03 s |
| Metered grouping worker | 42.95 s |
| Metered selected-window matching | 11.02 s |
| Suggestions visible | 11.39 s |
| Desktop view-switch maximum, 10 samples | 68.6 ms |
| 390×844, 4× CPU-throttled maximum, 6 samples | 303.8 ms |
| Full backup | 211,465,770 bytes |
| Backup + validation + atomic replacement | 16.03 s |
| Reported main-page heap | 54.1 MB |

The desktop sample meets the 100 ms target; the constrained sample **misses the 200 ms target**. These maxima are observations, not p95 estimates or hardware guarantees. The first run exposed 418/1603 ms view switches: caching bounded display traces, skipping invisible overview traces and replacing huge echoed identity payloads reduced work. Complete grouping/matching remains slow at the pilot ceiling and is performed in workers with progress/cancellation. Main-page heap excludes worker heaps; peak aggregate memory and quota durability were not measured.

The million-event backup round trip preserves exact counts, pattern identities and all derived views. IndexedDB usage estimate was 12.5 MB on this browser; this is browser compression/accounting, not a portable storage requirement. Test databases are isolated from the retained analyst library. Reports and screenshots remain in ignored `artifacts/`.

Reproduce with Node 24 / pnpm dependencies and Python Playwright + Chromium:

```sh
pnpm test
pnpm build
pnpm generate
pnpm controls:pilot
# Build with PAGES_BASE_PATH=/artifacts/agility-production/ and --outDir artifacts/agility-production.
# Start pnpm dev; set CHROMIUM_PATH/ATLAS_TEST_URL for the local environment if needed.
python scripts/check-agility-map.py
python scripts/check-agility-browser.py
python scripts/check-agility-pilot.py --ui-path /artifacts/agility-production/index.html
```

Windows execution used installed Node entrypoints for TypeScript/Vite because the pnpm wrapper failed realpath in the sandbox; dependencies and lockfile were unchanged. Frozen generator line endings are pinned to LF for byte-hash reproduction. Python Playwright was installed from PyPI only under ignored artifacts, without project dependency changes. Final root, /signal-atlas/ and isolated production builds pass TypeScript/Vite. Browser verification of both production URL paths loads all 15 demo windows, 14 destinations, exact original comparison intervals and v0.1.7 metadata with no failed assets/workers or runtime errors. Historical catalogue generation and git whitespace checks pass. A fresh whole-branch review found no Critical issues and three Important interaction issues; one fix pass corrects comparison races, transition focus and display-filter focus, with RED→GREEN browser regressions and a 132-test green suite. Misleading guide paragraphs were also corrected. [Review findings, decisions and deferred minors](docs/superpowers/reviews/2026-10-12-v0.1.7-map-review.md).

Limitations: synthetic construction controls do not validate measured-emitter accuracy or analyst description quality. Search retains at most 128 observed features and bounded candidate intervals; long-window endpoints and recall are approximate. Physical phones, other browsers, quota behavior and worker peak memory remain unvalidated. Earlier Cycle explorer source/data and raw legacy recovery are retained; the old explorer is no longer primary navigation.

Historical verification follows with its original version-specific scope.

# v0.1.6-preview.2.5 — stages 1–5, 12 October 2026

Validated locally before publishing the development preview after stage 0. Package/public metadata identify `0.1.6-preview.2.5`, revision `emitter-agility-library`, stage 5. The [guide](docs/agility-library.md) documents the implemented storage, matching and review semantics; the [Pages workflow](.github/workflows/pages.yml) verifies the deployed version/revision.

Publication uses the connected GitHub app when local Git credentials are unavailable. The workflow's explicit metadata tag is validated against the package version and created only after the build passes, with an existing-tag identity guard.

- The full suite passed **105 named tests across 12 files** using `node --test --test-isolation=none --test-reporter=spec tests/*.test.ts`. Sixteen new workspace cases cover intake, shared alignment/scale/changed-coordination, exact controlled partial intervals, missing evidence, unit/channel ambiguity, unique measured overlap, stable cross-emitter identities/diagnostics, variants/challenges, undo after later imports, full backup references/history, bounded gap-rich views and legacy recovery.
- Final merge checks reject different original text hashes, conflicting raw legacy values and conflicting historical snapshots, in addition to entity-ID conflicts. A merge archives both quick-undo branches without discarding audit decisions; subsequent undo cannot remove imported structures. Focused workspace tests were rerun after these checks were added.
- Chromium **151.0.7922.173**, 1440 × 1000 and 390 × 844, passed real modal JSON/CSV preview/cancel/save with intact originals, automatic suggestions, synthetic variant review, cross-emitter separate cards/solid links, keyboard inspection of recorded links, partial `[16,48)` comparison, missing-channel diagnostics, unresolved retention, Patterns/Emitters, additional windows, undo, refresh and full backup/replace equality. Original-value overlay coordinates were checked against both recordings on a shared physical axis. Corrupt backups leave the revision intact. Injected quota-write failure and stale revision both reject without partial recording/metadata writes. No runtime errors or horizontal overflow; screenshots were visually inspected.
- The capacity script uses an isolated test database and production UI. It exercises **1 million retained events, 50 recordings/profiles, a maximum 100,000-event source, 500 selected windows and 50 seeded reviewed patterns**, with 24 visible cards per directory page. Matching finishes in a worker; a complete approximately 224 MB backup validates and restores while retaining exact event/window counts, reviewed identities and derived views. This exercises actual IndexedDB transactions, rather than only constructing arrays.
- Small production view-switch samples meet the preview budgets of **100 ms desktop / 200 ms constrained**. The constrained run uses a 390 × 844 viewport with **4× CPU throttling** on Linux Chromium, not a physical phone. Reported upper observed latency is the maximum of ten/six samples, not an estimated population p95. First visible cards appear within the proposed 2-second budget. Timings, source import, suggestions, heap and storage estimates are recorded in the ignored pilot JSON report; main-page heap excludes worker memory.
- Root and `/signal-atlas/` TypeScript/Vite builds pass; the latter uses project-path assets and worker chunks. `npm run generate` reproduces historical catalogues without tracked data changes. Dependencies and lockfile are unchanged. Local documentation links and whitespace checks pass.

The final production pilot on Linux x86_64 Chromium reported three logical processors and 8 GB device memory. The 100,000-event modal preview took **960 ms** including file availability, or **883 ms** from the ready-to-parse state; save took **842 ms**, with the complete original's SHA-256 verified. Limiting the read-only editor excerpt to 4,000 characters removed the earlier approximately 25-second full-file DOM layout without truncating stored data. First visible cards took **476 ms**, suggestions **3.20 s**, and upper observed view switches **38 ms desktop / 110 ms constrained**. Backup plus full validation/replacement took **16.32 s**, with **223,814,092 backup bytes**, approximately 26.7 MB IndexedDB usage and 25.0 MB reported main-page JS heap. These are one cloud workload's observations, not universal performance guarantees; worker peak memory was not measured.

Reproduce with existing Node 24 dependencies and Python Playwright/Chromium:

```sh
node --test --test-isolation=none --test-reporter=spec tests/*.test.ts
npm run build
PAGES_BASE_PATH=/signal-atlas/ npm run build -- --outDir artifacts/preview25-pages
npm run controls:pilot
PAGES_BASE_PATH=/artifacts/agility-production/ npm run build -- --outDir artifacts/agility-production
npm run dev
```

In another terminal at the repository root:

```sh
python scripts/check-agility-browser.py
python scripts/check-agility-pilot.py --ui-path /artifacts/agility-production/index.html
```

Set `ATLAS_TEST_URL` or `CHROMIUM_PATH` if necessary. These scripts run only in `signal-atlas-agility-pilot-test` and its demo database using the visible `?sandbox=pilot` mode. Reports/screenshots/downloaded synthetic backups remain ignored under `artifacts/`. No user library or GitHub resource is modified.

Limits: controls are construction-labelled synthetic development cases, not a held-out measured-emitter benchmark. Matching uses at most 128 observed features, bounded contiguous interval candidates and provisional thresholds; long-window endpoints/recall are approximate. The capacity workload has 50 reviewed patterns, so it does not establish latency for 500 distinct reviewed patterns. Browser quota, backup worker peak memory, actual mobile devices, other browsers and analyst description quality need broader testing. Legacy measured-workspace recordings/history remain recoverable as raw data; only valid known/extracted cycles receive new candidate mappings. The Cycle explorer remains available.

Historical verification below retains its original scope and claims.

# v0.1.6-preview.2.0 — stage 0, 12 October 2026

- Prepared locally from feature commit `d0eca9d`, preserving the approved emitter-description roadmap. Version metadata identifies `0.1.6-preview.2.0` / `stage-0-specification`. No GitHub release or deployment was performed.
- `node --test --test-isolation=none --test-reporter=spec tests/*.test.ts` passed **89 named tests across 11 test files**, including nine new stage 0 cases. Explicit no-isolation output verifies the named cases rather than just file-level summaries.
- New checks cover schema rejection/immutability, minimum and steady inputs, unknown capture provenance, explicit missing values, pairwise overlap, shared-scale/changed-coordination controls, source-relative partial intervals, cross-emitter/unit equivalence, duplicate capture identity, payload hashes, CSV/JSON agreement and byte-for-byte fixture regeneration.
- Fifteen synchronized synthetic recordings, 17 reference windows, 11 construction-labelled relationship cases and nine rejection controls are checked in. Expected cases are development labels, not outputs from an implemented matcher or an accuracy benchmark.
- The optional workload generator was validated in memory at exactly 1 million source events, 50 sources, a maximum 100,000-event recording and 500 window references. This validates workload construction, not browser database capacity, matching latency or interactive performance.
- `npm run build` and `PAGES_BASE_PATH=/signal-atlas/ npm run build -- --outDir artifacts/preview2-pages` passed TypeScript and Vite. Package/public metadata and both build outputs agree; the built UI contains the preview version and the project-path index uses `/signal-atlas/assets/`. npm invoked the existing build script because the environment's pnpm attempted to create an unavailable global store; dependencies and lockfile were unchanged.
- All 39 local links in the roadmap, specification, dataset guide and README resolved. Whitespace checks passed. No application UI interactions were rerun: this stage adds specification/contracts/controls and version metadata, retaining the prior cycle atlas behavior. The new event-table importer, emitter views, coordinated matcher, reviewed relationship UI and IndexedDB restoration remain planned.
- `npm run generate` reproduced both historical catalogues and the complete-cycle examples without tracked changes. The reference data are unchanged from the feature baseline.

# Complete-link grouping — 9 October 2026

- Tentative v0.1.6 development preview: `0.1.6-preview.1` on `feature/revised-inputs`, revision `complete-linkage`. No final v0.1.6 release tag is created.
- All 80 Node tests (ten test files), TypeScript, and the production GitHub Pages build passed. Catalogue regeneration left the reference data and complete-cycle example unchanged; `git diff --check` passed. No dependencies were added.
- Tests compare the heap implementation with a naive complete-link oracle, reject similarity chains, cover empty/singleton/1,100-group results without group-count limits, verify every pair within full-catalogue groups, input-order and label independence, distinct-copy medoids, active scales/units, incompatible saved placements, review acknowledgments, and reviewed merge identity/undo.
- Default synthetic-library results are 30 Frequency groups and 29 PRI groups. The weakest within-group similarities are respectively 65.09% and 65.40%, above the 65% threshold. Local grouping took roughly 4.9 and 3.7 seconds; these timings are not a device benchmark. `triangular-080` and `triangular-109` remain separate because their surrounding groups fail the every-pair merge rule, rather than a fixed founder comparison.
- Production-path Chromium checks passed Frequency/PRI grouping, representative/cohesion explanations, isolated split approval/undo without storage writes, saved merge/reload/undo with identity preservation, and unchanged saved signals. Desktop and 390 × 844 mobile checks had no runtime errors or horizontal overflow. Visually inspected screenshots under `artifacts/complete-link-*.png` remain ignored local artifacts.
- These checks validate implementation behavior, not measured-data grouping accuracy. The existing 70/30 formula/vision blend and 65% default threshold are unchanged. Complete linkage can separate overlapping groups; results remain sensitive to the similarity metric and threshold. Memory and clustering costs grow quadratically with library size, with heap processing adding a logarithmic factor; large-library browser performance is not established.

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
