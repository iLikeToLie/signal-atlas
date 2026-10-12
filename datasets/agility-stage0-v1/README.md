# Agility Stage 0 v1

Controlled synchronized event data for **0.1.6-preview.2.0**. These are synthetic development controls for the planned emitter-description workflow, with no measured-emitter or accuracy claim. The current cycle atlas does not import this new schema yet.

## Contents

- 15 valid recordings, each in canonical event JSON and a corresponding CSV.
- 17 source-reference windows, including defaults, a middle interval and a deliberately short unresolved window.
- 11 expected relationship cases in [manifest.json](manifest.json).
- 9 invalid recordings for the provisional import gate and metadata checks.
- Separate emitter A/B profiles and an uncertain candidate C. Repeated capture IDs denote related evidence, not additional independent support.

| Recording | Construction |
| --- | --- |
| 0001 | Finite coordinated Frequency/PRI/pulse-width reference |
| 0002 | Same behaviour in emitter B with MHz→GHz conversion |
| 0003 | Global duration/time-channel scale ×2, Frequency range/offset variant |
| 0004 | PRI ordering shifted against unchanged Frequency/pulse-width ordering |
| 0005 | Contiguous reference events [16,48), with timestamps rebased |
| 0006 | Pulse width entirely unobserved |
| 0007 | Explicit gaps in all three channels |
| 0008 | Individually measured channels with no simultaneous overlap |
| 0009 | Steady values; no changing-value or repetition prerequisite |
| 0010 | Unfamiliar coordinated sequence |
| 0011 | Duplicate event payload and capture ID under a distinct recording ID |
| 0012 | Exactly 16 events at the import boundary |
| 0013 | Repeating sequence without a supplied period requirement |
| 0014 | Deterministically perturbed related sequence requiring review |
| 0015 | Additional numeric level channel with declared dB units |

Rows use finite strictly increasing time-of-arrival offsets in microseconds. PRI uses the preceding-event convention and can be missing for the first event. Missing values are `null` in JSON and blank in CSV. CSV metadata is a `# recording: {...}` comment followed by `t,<channel IDs>`. Original absolute scales are retained; no normalization is written into the payload.

## Reproduce and validate

Use Node.js 24+ from the repository root:

```sh
pnpm controls:generate
node --test tests/agilityStage0.test.ts
```

The manifest includes SHA-256 hashes for JSON/CSV/rejection payloads and the generator source, seed 20261012 and generator version 1.0.0. The test suite independently checks hashes, metadata, serialization, evidence counts, interval construction and byte-for-byte regeneration.

Expected relationships are construction labels, not actual model predictions or fixed score thresholds. Do not feed case labels, source-group IDs or emitter identity into similarity ranking. Keep related constructions/windows in one source group for future evaluation; these published development cases are not a sealed test set.

## Optional capacity workload

```sh
pnpm controls:pilot
```

Writes 50 source recordings, exactly 1 million source events, a largest recording of 100,000 events and 500 reference-only windows under ignored `artifacts/agility-stage0-pilot/`. The other recordings divide the remaining events; the target is not 500 recordings each containing 100,000 events. Source data are retained once. Generation validates counts/schema, not app storage, matching latency or browsing performance.

[Stage 0 specification](../../docs/agility-stage0.md) · [Draft contracts](../../spec/agility.ts) · [Roadmap](../../ROADMAP.md)
