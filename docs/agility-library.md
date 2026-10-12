# Coordinated agility library — preview 2.5

Development preview **v0.1.6-preview.2.5** implements roadmap stages 1–5 on `feature/revised-inputs`. The atlas describes an emitter through original synchronized recordings, selected observation windows and reviewed patterns that accumulate evidence over time. The earlier Frequency/PRI atlas remains available through **Cycle explorer**. [Preview source](https://github.com/iLikeToLie/signal-atlas/tree/v0.1.6-preview.2.5) · [Published app](https://iliketolie.github.io/signal-atlas/).

## Browse and build a description

**Patterns** shows reviewed cards alongside unreviewed and unresolved observations. **Emitters** shows each emitter or uncertain candidate's repertoire and observation timeline. Search and the profile filter apply to the same retained library. Pages display at most 24 cards; selecting an observation opens its evidence inspector.

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

Cross-emitter support/variant acceptance retains separate cards and creates a reviewed link. Further review revises an existing card/link without changing its ID. Single-channel, partial-channel and partial-interval links have distinct labels. Missing measurements and unseen intervals remain unsupported. A challenge from another emitter creates a challenge-bearing card for that emitter; it does not create an accepted similarity link.

Region boundaries are deterministic, provisional shared-shape browsing aids. They use sorted-ID anchor comparisons; they do not impose complete-link cohesion or define physical classes. Selecting a card reveals **solid reviewed links** and **dashed suggestions**. **Show links** expands exploration. Lines and an accessible connection list expose endpoints and scoped evidence; selecting a reviewed line opens its recorded comparison.

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

Selecting an eligible window automatically considers every reviewed pattern, including other profiles. The top eight comparable candidates are shown with weak/insufficient-evidence states. A shared monotonic event-order alignment across channels compares relative arrival timing and permits global duration scaling. Individual channels are not independently shifted, reversed or warped.

The worker searches contiguous portions of the target. Explanations retain query/target event bounds, shared time offset/scale, per-channel agreement, distinct aligned measurement counts and limitations. Matching converts compatible physical units. Original-value overlays require identical displayed units; normalized overlays can show compatible converted channels.

Development defaults: **85% threshold**, equal supported-channel shape contribution, zero absolute-level/duration penalties and **16 distinct aligned measurements** per eligible channel. Coordination additionally needs a channel pair simultaneously overlapping in 16 distinct aligned positions. Reused nearest samples do not add support. Modelled/incompatible channels do not contribute measured evidence. Without a qualifying pair the label is single-parameter; without any qualifying channel the suggested association cannot be accepted.

**Matching settings** remain adjustable. Changing them recomputes suggestions/regions without rewriting reviewed cards or links. Decisions save matcher/settings versions, score, explanation and full diagnostics. Scores describe resemblance, not probabilities or emitter identity. Steady channels lack shape information; inspect their absolute levels.

Search uses at most **128 observed feature points** per window. Candidate lengths include the full target, query feature length and quarter/half/three-quarter target lengths, with bounded starts. It is approximate for long recordings, rather than exhaustive over raw events. Partial endpoints and short-feature recall can be uncertain. Narrow windows for closer inspection. Small controls verify known coordination and intervals; they do not establish measured-data accuracy. Progress, cancellation and revision/workspace checks discard superseded results.

## Persistence, backup and recovery

Database `signal-atlas-agility`, schema 1, uses two stores. **recordings** retains original text, canonical events and hashes. **library** retains a coherent metadata snapshot with profiles, sources, windows, bounded views, patterns, variants, associations, links, decisions, settings and history. This simplifies the stage 0 proposal's many entity stores. One transaction commits affected stores; an expected revision blocks stale actions from another tab. Failed imports, quota writes or restores leave prior state intact.

Pilot caps are 100,000 events per new recording, 1 million retained events and 500 selected windows including defaults. Around 50 profiles were exercised. Browser quota/memory still apply. Sources are retained; deletion/archive and cloud sync remain extensions.

**Backup library** creates versioned JSON with originals and every durable structure, raw migrated values, diagnostics and undo snapshots. SHA-256 checks cover the payload, original text and canonical event fingerprints. **Restore backup file** validates schema, integrity, capacity, source/evidence/history references and regenerated views in a worker before offering apply.

- **Replace** applies the full validated library atomically, preserving IDs/history while advancing the transaction revision.
- **Merge** retains current matching settings, deduplicates identical IDs and rejects conflicting entities, original text hashes, raw legacy values or historical snapshots. Resolve conflicts explicitly or use replacement.
- Merge creates a quick-undo checkpoint so old snapshots cannot remove imported structures. All old/imported snapshots remain in the portable archive, and decisions remain inspectable. New reviews can be undone.
- **Undo last review** adds a reversal and restores review state. The previous snapshot and reversed review state remain in the portable archive. Recordings/windows added later remain; imports and merges are not undone.

Backup/restore run in workers and can take tens of seconds. The synthetic 1M-event backup is approximately 224 MB of JSON despite much smaller browser-stored bytes. This preview reads the full backup into worker memory; streaming/compression are extensions. Checksums verify integrity; they do not provide encryption or authenticity.

**Preview legacy migration** captures the five earlier browser keys unchanged, including originals, extraction decisions, settings, groups and undo. Valid known/extracted cycles become independent uncertain candidates with legacy provenance. PRI trajectories remain generic numeric trajectories; pulse synchronization is not invented. Eight-point historical cycles retain old validation and may be too short for new matching. Malformed entries remain recoverable as raw values with errors shown. Original measured-workspace recordings/history are retained as raw legacy data and remain accessible in Cycle explorer; they are not automatically converted to synchronized tables. Apply migration atomically, then back up. Earlier keys are not removed or overwritten.

The synthetic workspace uses a separate database. Acceptance/pilot scripts exclusively use `signal-atlas-agility-pilot-test` and its demo database, activated by `?sandbox=pilot` with a visible banner.

## Validation and next work

[Verification](../VERIFICATION.md) covers 105 tests, browser intake/review/restore/failure checks and an actual IndexedDB/worker workload with 1M events, 50 profiles and 500 windows. Production switches meet preview budgets of 100 ms desktop and 200 ms in a 4× CPU-throttled small viewport in small repeated samples; that emulation is not physical-phone testing.

Next use source-separated analyst-reviewed measured captures to assess ranking, interval recall and description quality; revisit overlap/thresholds and test more devices/browser quotas. Batch intake, segmentation, richer descriptors and shared storage follow the [roadmap](../ROADMAP.md).
