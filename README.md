# Signal Atlas

A local visual library of coordinated emitter observations. Retain synchronized event recordings, compare selected windows across frequency, PRI and pulse width, and build reviewed patterns with provenance, variants and uncertainty. React, TypeScript and Vite; transactional IndexedDB on one analyst's browser/device.

[Agility library guide](docs/agility-library.md) · [Roadmap](ROADMAP.md) · [Verification](VERIFICATION.md) · [Published app](https://iliketolie.github.io/signal-atlas/)

## v0.1.7 release candidate

Prepared locally on `codex/v0.1.7-map`. Publishing, merging and creation of the `v0.1.7` tag remain pending. The published app may show an earlier release.

The primary screen is one continuous **Observation map**, replacing the paginated directory and separate Cycle explorer navigation. Each observation window has one stable tile. Toggle **Similarity / Emitter** to arrange those same tiles by selected-parameter behaviour or stable emitter/candidate islands.

- Select **Frequency, PRI, PW**, or any nonempty combination. Similarity groups require every pair's whole windows to pass the threshold with sufficient simultaneous evidence for every selected parameter. Incomplete observations remain in **Insufficient evidence**; emitter arrangement dims them inside their own island.
- Select a tile to highlight **all qualifying observation windows**, including unreviewed destinations. Draw eight strongest connections initially and expand the limit. Full-window matches rank before temporal partial matches. Solid reviewed, dashed full-window and dash-dot partial links and their percentage labels render above tiles. The persistent legend explains review colours, line styles and resemblance percentages.
- Drag, scroll, pinch, use keyboard arrows/+/-/0, **Fit map**, **Focus selected** or **Focus matches**. Zoom progresses from status markers to selected-channel traces and detailed names/badges. Similarity changes animate tile positions; reduced motion is respected. Proximity is an approximate browsing aid.
- Search/profile/status filters dim in place. **Hide nonmatches** removes them from display without repacking islands. **Browse all observation windows** reaches offscreen tiles.

Import JSON/CSV or paste an event table, declare units/profile, preview, then save its intact original and an unreviewed full-recording window. Additional named numeric channels remain in the inspector and exports. Missing values remain missing; mixed-emitter separation happens upstream.

Review the exact source/target intervals and absolute ranges before accepting support or variants. Unreviewed destinations require explicit pattern creation; several supported interpretations require an explicit choice. Cross-emitter acceptance keeps separate cards and reviewed relationships. **Create new pattern** and **Leave unresolved** remain available. Historical relationship diagnostics are labelled and cannot be reused as a current review.

## Local development

Node.js 24+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

| Command | Purpose |
| --- | --- |
| `pnpm controls:generate` | Reproduce frozen synchronized controls |
| `pnpm controls:pilot` | Generate the optional 1M-event workload in ignored artifacts |
| `pnpm generate` | Reproduce historical cycle catalogue/layouts |
| `python scripts/check-agility-map.py` | Map gestures, masks, layering, filters and review acceptance |
| `python scripts/check-agility-browser.py` | Import, review, history, failed-write and backup flow |
| `python scripts/check-agility-pilot.py --ui-path /artifacts/agility-production/index.html` | All-window production capacity benchmark |

Browser harnesses require Python Playwright and Chromium; set `ATLAS_TEST_URL` and `CHROMIUM_PATH` as needed. They use only the explicitly isolated `?sandbox=pilot` databases.

## Storage and practical limits

Export **Backup library** before clearing browser data or moving origin. Preview a validated replace or conflict-aware merge; originals, annotations and revision history are included. Old schema-1 backups default absent parameter masks to all three after integrity validation. Legacy browser keys/raw values remain recoverable through migration and backup. Earlier cycle source/data are retained for historical reproducibility.

The pilot retains **1M source events, 50 profiles and 500 windows**, with a 100K-event largest recording, and verifies complete backup/restore. All **499 other windows** are compared for a selected window. On the measured Windows Chrome run, full grouping took about **43 s**, matching **11 s**, and view-switch maxima were **69 ms desktop / 304 ms at 4× CPU throttling**. The latter misses the provisional 200 ms constrained budget. Workers preserve an interactive map and permit superseding/cancelling work; these observations are not hardware guarantees.

Matching uses at most 128 observed features per window and bounded contiguous candidates. Long-window endpoints and recall are approximate. Synthetic checks do not establish measured-emitter accuracy; thresholds/weights, physical devices, other browsers, browser quota and worker peak memory need further validation. See [Verification](VERIFICATION.md).
