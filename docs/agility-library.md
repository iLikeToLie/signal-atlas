# Coordinated agility library — v0.1.7 map

Local **v0.1.7 release candidate** on `codex/v0.1.7-map`; publishing is pending. Original synchronized recordings, selected observation windows and reviewed emitter-specific patterns form one retained library. The primary map replaces the directory and separate Cycle explorer navigation.

## Browse and build a description

Toggle **Similarity / Emitter** over the same observation tiles. Select any nonempty combination of **Frequency / PRI / PW**. Similarity groups use complete linkage: every pair must meet the threshold on whole windows with sufficient simultaneously aligned measurements for every selected parameter. Changing parameters animates regrouping. Emitter islands stay fixed while matches update. Incomplete windows appear in an **Insufficient evidence** area in similarity, or dimmed inside their emitter island.

Drag, wheel/pinch, keyboard arrows/+/-/0, **Fit map**, **Focus selected** and **Focus matches** control the camera. Overview shows status markers; middle zoom selected-parameter traces; close zoom names/review badges. Group proximity is approximate. Search/profile/review-status filters dim in place; optional **Hide nonmatches** does not repack. **Browse all observation windows** supplies accessible offscreen navigation.

Cards preview available parameters on shared timing. The inspector provides synchronized cursor/zoom, normalized/original values, a joint-parameter scatter plot coloured by event order, source bounds and original export. Missing measurements break traces. Lines connect observed display samples; no inferred periodic reconstruction is stored. Large views use bounded observed samples with minima, maxima and gap masks, while original events remain intact.

An import's default full-recording window needs no classification. To describe a transition or finite behaviour inside a recording, open **Source windows and sequence timing** and add bounds using event indices **[start, end)**. The end index is exclusive. Windows reference one original rather than duplicating source events. Exact duplicate bounds are rejected; overlapping windows share lineage.

Review requires a name or explanation:

| Action | Stored result |
| --- | --- |
| Create new pattern | A stable card in this profile's repertoire, backed by the selected measured window |
| Accept scoped support | An association for the measured channels and matched interval |
| Accept as variant | A reviewed variant with its explanation and scoped evidence |
| Challenge interpretation | A challenge association and explicit revision, retaining earlier evidence |
| Leave unresolved | A browsable unresolved observation with its original intact |
| Reject suggestion | A recorded rejection; no supporting association |

Cross-emitter support/variant acceptance retains separate cards and creates a reviewed link. Further review revises an existing card/link without changing its ID. Temporal partial suggestions carry a Partial label; incomplete-channel diagnostics remain unresolved in the inspector and do not draw combined-match suggestions. Missing measurements and unseen intervals remain unsupported. A challenge from another emitter creates a challenge-bearing card for that emitter; it does not create an accepted similarity link.

Region boundaries are deterministic provisional browsing aids. Similarity membership requires complete-link whole-window cohesion for every selected parameter; regions do not define physical emitter classes. Selecting a card reveals **solid reviewed links**, **dashed whole-window suggestions** and **dash-dot temporal partial suggestions**. **Show links** expands exploration. Lines and an accessible connection list expose endpoints and scoped evidence; selecting a reviewed line opens its recorded comparison.

## Import JSON or CSV

**Add observation** accepts uploaded or pasted tables with a profile association, then preview and save. Preview does not write the library. Uploaded text is read-only and shows at most 4,000 characters; the complete original is parsed and saved. **Use a pasted copy instead** permits editing a separate input. Profiles may be analyst-attributed emitters or uncertain candidate streams. Mixed-emitter separation happens upstream.

A new recording requires at least 16 finite, strictly increasing timestamps over nonzero time, one supplied channel with 16 valid measurements, an ID/profile association and declared channel names/quantities/units. Missing values do not count. Steady, finite and repeating behaviours are admissible. At most 100,000 events are accepted per recording; file uploads are capped at 80 MB without truncation. Shorter selected windows remain inspectable but cannot qualify for matching or create a reviewed pattern.

JSON follows the [event contract](../spec/agility.ts); see a [complete example](../datasets/agility-stage0-v1/recordings/recording-0001.json). Metadata includes schemaVersion 1, id, name, streamId, captureId (or null), time, channels, events and provenance. Each event has `t` and a `values` map containing every channel, using null for missing measurements. `origin: "supplied"` distinguishes observed values from modelled channels.

CSV accepts equivalent JSON metadata in a leading `# recording: {...}` comment, as in [this example](../datasets/agility-stage0-v1/recordings/recording-0002.csv). Its first column is `t`, `time` or `timestamp`; other headers match channel IDs in order. Blank cells and literal `null` denote missing measurements. Quoted numeric fields, BOM and CRLF are accepted; numeric fields must fit on one line.

For plain CSV, enter a profile ID and declare time, frequency and interval units in the import panel. This table is valid with time `ms`, frequency `MHz` and intervals `us`:

```csv
t,frequency,pri,pulseWidth
0,900,,2
1,901,1000,2
2,903,1000,3
3,902,1000,2
4,900,1000,2
5,902,1000,4
6,904,1000,3
7,903,1000,2
8,901,1000,2
9,902,1000,3
10,905,1000,4
11,904,1000,3
12,902,1000,2
13,903,1000,3
14,906,1000,4
15,905,1000,3
```

Supplied PRI means the interval preceding that row's event; the first PRI can be null. Timestamp-derived PRI is not inferred. Time supports s/ms/us/ns or arbitrary `tu`; frequency supports Hz/kHz/MHz/GHz or `fu`. Additional columns need **Channel definitions JSON** listing every parameter in column order, such as a supplied `numeric` channel with a `dB` unit. JSON and metadata-bearing CSV retain embedded units; the profile association can be overridden explicitly. Unknown capture IDs remain unknown.

## Suggestions and their scope

Selecting a window considers **every other observation window**, including unreviewed/unresolved windows and other emitters. A shared monotonic event-order alignment compares all selected channels together, relative timing and coordinated shape, permitting a global duration scale. Channels are not independently shifted/reversed/warped. Full-window and contiguous temporal partial results are retained separately; qualifying full-window results rank first. Weak and partial-channel diagnostics remain explicit and never supply a combined percentage/highlight/group membership.

Every qualifying tile is highlighted. Initially the four strongest suggestion connections appear, with **4 of N matches** and an expandable 8/24/64/all limit. All-window totals are never capped at four; reviewed relationships are separate from this suggestion cap. **Solid** lines represent reviewed relationships, **dashed** full-window suggestions, **dash-dot** temporal partial suggestions. Labels show compact percentages at preview zoom and full scope at detail zoom; focus/hover reveals overview badges. Badges avoid visible cards and each other; when no nearby clear position exists, inspect the connection or the inspector's suggestion list for full evidence. The persistent legend separates card states, connection types and group outlines. Percentages measure resemblance, not probability or emitter identity. Hidden connections are excluded from the drawn count.

Open **Methodology** in the header for the complete import-to-review workflow, current numerical formulas, defaults alongside applied settings, evidence gates and worked examples calculated by the matcher. Returning preserves the library, selected observation, filters and map camera. The old formula/pixel method is deprecated; see [Observation-map methodology](methodology.md).

Explanations retain exact source-relative query/target bounds, shared time offset/scale, agreement/disagreement, missing measurements and lineage limitations. The inspector shows absolute ranges and duration differences prominently. Additional numeric channels remain visible and exportable, but map matching controls select the three core quantities. Original-value overlays require identical displayed units; normalized overlays support compatible unit conversions.

Defaults: **85% threshold**, equal selected-channel shape contribution, zero absolute-level/duration penalties and **16 distinct, simultaneously aligned measurements for every selected parameter**. Reused nearest samples add no support. Missing/modelled/incompatible/ambiguous channels cannot confirm a combined match. **Matching settings** adjust absolute and duration influence without changing reviewed identities/history; decisions retain the settings/matcher diagnostics used at review time.

Acceptance requires analyst review. For an unreviewed destination, **Inspect target / create reviewed pattern** navigates to explicit creation. Multiple patterns supported by the exact destination window require a **Destination pattern** choice. The selected pattern revision is captured and guarded on write. Selecting a saved reviewed relationship loads its actual compared intervals and labels the score **Historical reviewed comparison**, disabling current acceptance until a fresh comparison is chosen. **Create new pattern** and **Leave unresolved** remain available.

Search uses at most **128 observed feature points** per window. Candidate lengths include the full target, query feature length and quarter/half/three-quarter lengths, with bounded starts. It is approximate over long recordings; endpoints and short-feature recall can be uncertain. Narrow windows to inspect original events. Steady channels lack shape information; inspect absolute levels. Worker progress, cancellation, workspace/revision/input/selection guards discard superseded results. Old schema-1 backups normalize absent parameter masks to all three only after validating the original payload hash; saved historical settings strings are unchanged.

## Persistence, backup and recovery

Database `signal-atlas-agility`, schema 1, uses two stores. **recordings** retains original text, canonical events and hashes. **library** retains a coherent metadata snapshot with profiles, sources, windows, bounded views, patterns, variants, associations, links, decisions, settings and history. This simplifies the stage 0 proposal's many entity stores. One transaction commits affected stores; an expected revision blocks stale actions from another tab. Failed imports, quota writes or restores leave prior state intact.

Pilot caps are 100,000 events per new recording, 1 million retained events and 500 selected windows including defaults. Around 50 profiles were exercised. Browser quota/memory still apply. Sources are retained; deletion/archive and cloud sync remain extensions.

**Backup library** creates versioned JSON with originals and every durable structure, raw migrated values, diagnostics and undo snapshots. SHA-256 checks cover the payload, original text and canonical event fingerprints. **Restore backup file** validates schema, integrity, capacity, source/evidence/history references and regenerated views in a worker before offering apply.

- **Replace** applies the full validated library atomically, preserving IDs/history while advancing the transaction revision.
- **Merge** retains current matching settings, deduplicates identical IDs and rejects conflicting entities, original text hashes, raw legacy values or historical snapshots. Resolve conflicts explicitly or use replacement.
- Merge starts a new active undo branch so old snapshots cannot remove imported structures. All old/imported snapshots remain in the portable archive, and decisions remain inspectable. New reviews can be undone; the merge itself has no quick-undo checkpoint.
- **Undo last review** adds a reversal and restores review state. The previous snapshot and reversed review state remain in the portable archive. Recordings/windows added later remain; imports and merges are not undone.

Backup/restore run in workers and can take tens of seconds. The synthetic 1M-event backup is approximately 211 MB of JSON despite much smaller browser-stored bytes. This preview reads the full backup into worker memory; streaming/compression are extensions. Checksums verify integrity; they do not provide encryption or authenticity.

**Preview legacy migration** captures the five earlier browser keys unchanged, including originals, extraction decisions, settings, groups and undo. Valid known/extracted cycles become independent uncertain candidates with legacy provenance. PRI trajectories remain generic numeric trajectories; pulse synchronization is not invented. Eight-point historical cycles retain old validation and may be too short for new matching. Malformed entries remain recoverable as raw values with errors shown. Original measured-workspace recordings/history are retained as raw legacy data and remain recoverable from the preserved legacy values in complete backups; they are not automatically converted to synchronized tables. Apply migration atomically, then back up. Earlier keys are not removed or overwritten.

The [synthetic narrative demo](../datasets/agility-demo-v1/README.md) uses a separate versioned database, `signal-atlas-agility-demo-v1`. Eight related constructions explain shared A/B behaviour, distinctive modes, a transition and incomplete C. It seeds only an empty workspace and retains later reviews/imports. **Open previous synthetic controls** accesses the preserved `signal-atlas-agility-demo` database; **Open narrative demo** returns to the new story. Neither changes the retained library. Acceptance/pilot scripts exclusively use `signal-atlas-agility-pilot-test` and its separate demo databases, activated by `?sandbox=pilot` with a visible banner.

## Validation and next work

[Verification](../VERIFICATION.md) covers 132 tests, map and browser intake/review/restore/failure checks, plus a production IndexedDB/worker workload with 1M events, 50 profiles and 500 candidate windows (499 destinations). Observed view-switch maxima were 69 ms desktop and 304 ms in a 4× CPU-throttled small viewport: desktop meets its 100 ms target, while constrained hardware misses 200 ms. Emulation is not physical-phone testing.

Next use source-separated analyst-reviewed measured captures to assess ranking, interval recall and description quality; revisit overlap/thresholds and test more devices/browser quotas. Batch intake, segmentation, richer descriptors and shared storage follow the [roadmap](../ROADMAP.md).
