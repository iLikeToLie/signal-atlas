# Complete-cycle imports

For unknown-period or longer recordings, use the measured workspace and [recording intake](recordings.md). This page describes the known-cycle path in the optional synthetic demo atlas.

Use the Import cycle dialog to choose a file or paste text, preview, then save. It stays on this device. Provide **a known repeating cycle and its period**. [Sparse/discontinuous cycles](sparse-cycles.md) have an explicit reconstruction path; Reviewed period suggestions are available for raw recordings; IQ/spectrogram extraction, nonperiodic-window grouping and partial-cycle matching remain outside this implementation.

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

See [public/examples/complete-cycle.json](../public/examples/complete-cycle.json) for a full export-compatible example.

For closed-endpoint/uniform-open inputs: 8–8193 samples, ≤2 MB, finite numeric t/f, positive period, nonzero finite excursion, explicit supported units, t=0 start, strictly increasing timestamps. Duplicates, unordered timestamps, missing metadata and invalid files receive errors. Data is never sorted or smoothed silently.

- **closed-endpoint:** include the endpoint t=T (time tolerance `1e-9 × T`); frequency endpoints must match within `max(1e-10, 1e-6 × excursion)` in supplied frequency units. Original values within tolerance are retained, not repaired. Nonuniform sampling is allowed.
- **uniform-open:** explicitly declare N uniformly spaced samples at t=iT/N for i=0…N−1. The declared cycle wraps by interpolation to the first sample at T. Because the endpoint is absent, measured continuity cannot be independently verified; choosing this convention explicitly assumes it. Use closed-endpoint when you want boundary verification.
- **sparse-periodic:** declare `interpolation: linear` or `hold`, use observed timestamps in `[0, T)`, and provide at least 8 finite observed points with no cyclic gap over 20% of T. Null/blank observations retain their missing timestamps. See the [schema, coverage checks and examples](sparse-cycles.md).

The optional `interpolation` JSON field / `# interpolation:` CSV header also selects step/hold for complete hopping cycles. Omitting it on the legacy formats retains linear interpolation. Sparse mode always requires an explicit method.

Imports retain original frequencies and units. Derived excursion/centre are recalculated from supplied samples, not trusted from a file. Importing a synthetic export treats it as a new local observation; it does not mutate the catalogue.

Local storage is origin/browser/device-specific, supports up to 100 imports, and is not cloud sync. JSON/CSV export and removal (with undo) are explicit. Storage failures reject additions rather than pretending persistence succeeded. Malformed saved data is left untouched and reported. Export before clearing browser storage. No imports are sent to a server or written into catalogue files.

## PRI imports

For PRI JSON imports set `"quantity": "pri"`; for CSV add `# quantity: pri` or select the CSV value type in the import dialog. The existing `t,f` columns / sample fields are retained: `t` is elapsed time and `f` holds the PRI value. Both time and PRI units must be explicit (`tu`, `s`, `ms`, `us`); the PRI unit occupies `units.frequency` / `frequency_unit` in this shared schema. Every PRI must be positive. Samples still describe one complete periodic trajectory, with the existing endpoint checks. PRI exports preserve the quantity and units, and only appear in the PRI view. Frequency imports remain in Frequency. See the [complete PRI example](../public/examples/complete-pri-cycle.json).


[Back to the README](../README.md).
