# Synthetic narrative demo v1

Eight reproducible scalar-event recordings illustrate shared behaviours across A/B, each profile's distinctive mode, a transition, and incomplete C. Attribution and initial reviewed patterns are supplied demonstration context. Similarity neither assigns an emitter nor proves identity. This is a related synthetic construction set, not independent measured captures or an accuracy benchmark.

| Recordings | Construction | Default three-parameter outcome |
|---|---|---|
| A/B shared stagger | Same finite stepped carrier/staggered PRI/PW template, MHz versus GHz representation | One similarity group; separate A/B cards and profiles |
| A dwell / perturbed dwell | Eight pulses per held joint state, eight states; paired small perturbations | One distinctive group |
| B jittered hops / perturbed hops | Seeded hop/PW levels with PRI jitter about 600 µs | Another distinctive group |
| B stagger to hops | Shared 64-event template followed by B's 64-event template | Separate whole-window group; shared query supports `[0,64)` only |
| C missing PW | Shared Frequency/PRI with every PW explicitly null | Insufficient with all three parameters; comparable when PW is excluded |

Each ordinary recording has 64 events; the transition has 128, for 576 total events. Both arrangements use the same observation IDs. Outcomes are verified by the actual current numerical matcher at provisional defaults, not encoded into layout or grouping.

## Representation and construction

- Carrier levels: 10000, 10000.5, 10001 and 10001.5 MHz. B's shared observation stores the equivalent GHz values. These describe inter-pulse carrier changes, not intra-pulse chirps.
- Shared PRI: 250–1000 µs; held dwell PRI: 300–950 µs; B jitter: bounded uniform draws within 560–640 µs. PW palette: 40, 60, 80 and 100 µs. Every present PW is below each local PRI. These schedules and ranges are illustrative engineering choices, anchored by the worked-example scales in the [primary-reference note](../../docs/research/2026-10-12-agility-demo-design-references.md); they do not reproduce a particular radar's operating modes.
- Seed `20261012`, generator version `1.0.0`. PRNG: 32-bit LCG (`1664525`, `1013904223`, modulus `2^32`), draws in `[0,1)`. B's schedule uses seed +3; A/B perturbations use +4/+5. All finite output is rounded to 12 decimal places.
- Perturbed companions retain the same underlying schedule. Uniform scalar measurement perturbations are Frequency ±0.0045 MHz and PW ±0.2 µs. Added PRI interval perturbations are ±1 µs and are accumulated into timestamps: they change the constructed timing schedule, rather than claiming independent receiver ToA/PRI errors. No SNR or calibrated hardware model is supplied.
- `t[0]=0`, `PRI[0]=null`; each later timestamp accumulates the same preceding interval supplied on that row. The transition's first hop row supplies its 600 µs joining interval. Missing PW leaves event time and other measurements intact. Partial-window values retain original source context.
- No dropped detections, spurious pulses or interpolation occur in the published eight recordings. A focused test demonstrates dropped-detection observed-PRI semantics by preserving arrival gaps and summing intervening intervals. This is separate from null channel measurements.
- Distinct capture IDs separate records operationally. The manifest places every related template, perturbation and transition in one source group; these are not independent evaluations. Construction labels/profiles are never matcher inputs.

## Reproduction and persistence

Run `pnpm demo:generate`, then `node --test tests/agilityDemo.test.ts` (Node 24+). The manifest fingerprints each JSON original and the generator source; tests regenerate into a temporary directory and compare every recording and manifest byte for byte. Frozen `agility-stage0-v1` fixtures are unchanged.

The app opens the narrative in `signal-atlas-agility-demo-v1`, seeds only an empty workspace and preserves subsequent reviews/imports. **Open previous synthetic controls** reaches the original `signal-atlas-agility-demo` database; **Open narrative demo** returns here. The retained `signal-atlas-agility` library is unchanged. Test sandboxes use the corresponding `-pilot-test` prefixes. Backup/restore applies to the selected workspace.

No external dataset assets were incorporated. Research includes a metadata-only Turing release/license recheck, not an adoption or measured-data validation. Pixel matching remains experimental and is not used in this demo.
