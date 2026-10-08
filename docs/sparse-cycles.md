# Sparse and discontinuous cycles

The app can compare a supplied repeating Frequency or PRI cycle with irregular observation times, missing values or genuine jumps. A discontinuity is a change in value; a missing observation is an absence of evidence. They require different modelling choices.

This first implementation still requires a known positive period and an explicitly declared repeating cycle. It does not infer a period, infer missing pulses, or turn a nonperiodic recording into a repeating waveform. Nonperiodic windows and partial-cycle matching remain planned work.

## Choose the model

| Input | Sampling declaration | Between observed points |
| --- | --- | --- |
| Complete continuous cycle with verified endpoints | `closed-endpoint` | Linear by default; optional `hold` |
| Complete evenly spaced cycle without its repeated endpoint | `uniform-open` | Linear by default; optional `hold` |
| Irregular, sparse or incomplete observations of a known repeating cycle | `sparse-periodic` | Explicit `linear` or `hold` required |

`linear` joins adjacent observations with straight lines. `hold` retains the previous observed value until the next observation; the plotted transition is a vertical jump. Hold is a model for a piecewise-constant trajectory, not evidence that an unseen hop did not happen. Neither method sorts observed samples, smooths noise, or overwrites observed values.

Sparse periodic timestamps must be strictly increasing and within `[0, T)`. The first observation need not be at zero. The final observation connects cyclically to the first in the next cycle, using the declared method. This is an explicit periodic assumption, not unconstrained extrapolation of a recording beyond its observed window.

## Initial point and gap limits

- Require at least **8 finite observed points**. Missing rows do not count.
- Require every interval between neighbouring observed points to be at most **20% of T**, including the last-to-first cyclic interval.
- Retain the existing **8193 total-row** and **2 MB** limits. Every observed PRI must be positive, and the observed excursion must be nonzero.
- Treat JSON `f: null` and CSV blank/`null` values as missing only in `sparse-periodic` mode. Non-finite numbers and malformed values remain errors.

These are initial import guards, not experimentally validated sampling thresholds. Eight points distributed through a cycle can still miss fast features. The largest gap indicates coverage; it is not a missing-data percentage or an accuracy guarantee. No phase-grid cell is automatically labelled measured merely because the guard passed.

## Import and preview

Download the illustrative [sparse Frequency CSV](../public/examples/sparse-frequency-cycle.csv) or [sparse PRI CSV](../public/examples/sparse-pri-cycle.csv). These are examples, not real-world captures.

For CSV, declare `# sampling: sparse-periodic` and `# interpolation: hold` (or `linear`), or choose them under **CSV metadata overrides**. Supply period and units as usual. JSON declares these fields inside the object; CSV overrides do not alter JSON metadata.

```json
{
  "name": "Sparse repeating observation",
  "period": 1,
  "units": { "time": "s", "frequency": "Hz" },
  "sampling": "sparse-periodic",
  "interpolation": "hold",
  "samples": [
    { "t": 0.05, "f": 12 },
    { "t": 0.15, "f": 10 },
    { "t": 0.25, "f": 12 },
    { "t": 0.35, "f": 12 },
    { "t": 0.45, "f": 11 },
    { "t": 0.55, "f": 11 },
    { "t": 0.65, "f": 14 },
    { "t": 0.75, "f": null },
    { "t": 0.85, "f": 10 },
    { "t": 0.95, "f": null }
  ]
}
```

Select **Preview cycle** before saving. Inspect the reconstruction method, observed-point count, explicit missing-row count and largest interval. Dots identify observed points (up to 256 markers per cycle); the dashed line is the model between them. Select **Save cycle & find neighbours** to approve the periodic reconstruction and save locally. Editing the data or metadata invalidates the preview.

## Storage, exports and matching

Stored `samples` contain only the original finite observations. Explicit missing-row timestamps are retained separately as `missingTimes`. JSON retains these fields; CSV reconstructs the original ordered rows with blank values. The app generates comparison grids when needed; it does not save interpolated points as measurements. Importing an exported file and reloading saved observations preserves the chosen model.

Neighbour ranking, automatic grouping and pixel overlap use the same reconstructed trajectory on the 128-phase grid. Midrange and excursion derive from observed extrema; these models do not overshoot them. Short hops may still be lost at the comparison-grid resolution. Existing calibration on dense synthetic sources does not establish sparse/hopping-data accuracy; validate with source-separated observed data and missingness/hopping controls before changing defaults.

[Import formats](imports.md) · [Methodology](methodology.md) · [Roadmap](../ROADMAP.md) · [README](../README.md)
