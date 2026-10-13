# Signal Atlas

A local visual library of coordinated emitter observations. Retain synchronized event recordings, compare selected windows across frequency, PRI and pulse width, and build reviewed patterns with provenance, variants and uncertainty. React, TypeScript and Vite; transactional IndexedDB on one analyst's browser/device.

[Agility library guide](docs/agility-library.md) · [Roadmap](ROADMAP.md) · [Verification](VERIFICATION.md) · [Published app](https://iliketolie.github.io/signal-atlas/)

## v0.1.8 — observation comparisons

Development and release branch: `main`. v0.1.8 includes the observation-map and comparison work from the former development branches. The Pages workflow validates and publishes release updates from `main`; the existing `v0.1.8` tag retains the initial release commit. See [deployment instructions](docs/deployment.md) and [verification](VERIFICATION.md).

The primary screen is one continuous **Observation map**, replacing the paginated directory and separate Cycle explorer navigation. Each observation window has one stable tile. Toggle **Similarity / Emitter** to arrange those same tiles by selected-parameter behaviour or stable emitter/candidate islands.

- Select **Frequency, PRI, PW**, or any nonempty combination. Similarity groups require every pair's whole windows to pass the threshold with sufficient simultaneous evidence for every selected parameter. Incomplete observations remain in **Insufficient evidence**; emitter arrangement dims them inside their own island.
- Select a tile to highlight **all qualifying observation windows**, including unreviewed destinations. Draw four strongest connections initially and expand to 8/24/64/all. Full-window matches rank before temporal partial matches. Teal dashed links show full matches, violet dashed links show partial coverage of the selected window, and amber dash-dot links show selected windows contained in related windows. Reviewed links stay solid. Zoom-aware badges avoid cards and each other; dense badges can be omitted while connection actions retain the full evidence.
- Press **Compare observation windows** in the inspector to open its dedicated matching view while the map stays visible. Rows start collapsed; expand a title to see aligned parameter traces, the actual matched interval and coverage of both windows. The list grows naturally with one inspector scrollbar. **Back to observation** restores the details. A composite can show each known half at **100% resemblance · 50% coverage of selected**; coverage counts source events and does not reduce the resemblance score.
- Open **Methodology** for the numerical workflow and formulas, interactive waveform comparisons, an exact partial-interval diagram and a complete-link grouping illustration. Its exploration controls stay separate from saved map settings. Return with the selected observation and camera intact. [Technical explanation](docs/methodology.md).
- Similarity islands use simple one-word names such as Vega and Lyra. Names are browsing labels; emitter profile names and numerical grouping remain unchanged.
- Drag, scroll, pinch, use keyboard arrows/+/-/0, **Fit map**, **Focus selected** or **Focus matches**. Zoom progresses from status markers to selected-channel traces and detailed names/badges. Similarity changes animate tile positions; reduced motion is respected. Proximity is an approximate browsing aid.
- Search/profile/status filters dim in place. **Hide nonmatches** removes them from display without repacking islands. **Browse all observation windows** reaches offscreen tiles.
- **Try synthetic workspace** opens an eight-recording narrative: shared A/B behaviour, distinctive modes, a transition and incomplete C. **Open previous synthetic controls** retains access to the old isolated control workspace. [Construction, references and reproduction](datasets/agility-demo-v1/README.md).

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
