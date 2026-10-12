# Observation-map methodology — v0.1.7

The current observation map compares numerical Frequency, PRI and pulse-width measurements in synchronized event windows. It uses no pixel comparison, CNN, image embedding or learned matcher. Open **Methodology** in the application for the workflow, applied settings and worked examples calculated by the current matcher.

## Interactive explanations

- **Try the comparison:** Choose one of five synthetic cases and toggle Frequency/PRI/PW. Green source traces and dashed orange target traces show the original compared interval with shared hover/zoom. Adjust absolute-level/duration penalties to see the actual matcher’s score change. This is a local sandbox initialized from map settings; **Use map settings** resets its controls without writing to the library.
- **Partial-match diagram:** The full target’s event strip highlights only the eligible partial candidate’s exact source indices. The middle-window example supports `[16,48)`; its unseen ends remain gray. The picture distinguishes the partial candidate from the whole-window score used for grouping.
- **Complete-link illustration:** Three assumed-eligible windows have explicitly illustrative symmetric pair scores: A–B 92%, B–C 90%, A–C 78%. Moving its separate threshold runs the existing grouping function. At 85%, A/B join but C cannot bridge the weak A/C pair; at 78% all join, and above 92% all separate. Node colours show actual resulting membership. These inputs illustrate the grouping rule and are not signal measurements or new calibration.

The defaults/applied-settings table continues to describe the retained map. Exploration controls never apply map settings or create observations/reviews. Diagrams include text descriptions and outcomes; all controls work with a keyboard.

## From imported observations to reviewed evidence

1. Validate a JSON/CSV recording, declared profile, units, strictly increasing event times and explicit missing values. Preserve the original file, provenance and capture identity.
2. Save an unreviewed full-recording window. Additional windows reference exact start-inclusive/end-exclusive event indices; they do not replace their source.
3. Build channel ranges, measured counts and numerical views. Matching retains at most 128 sampled points from each window; originals remain available for inspection and export.
4. A worker compares every observation window using the applied parameter selection. It assesses whole windows and bounded contiguous target intervals, preserving shared channel coordination.
5. Recompute provisional similarity groups across eligible whole windows. Each pair must satisfy the group boundary; incomplete windows remain in insufficient evidence. Input/settings changes can alter the hierarchy and memberships.
6. Arrange the same windows by numerical similarity or retained emitter/candidate attribution. Proximity is an approximate browsing aid, not a distance score.
7. An analyst creates a reviewed pattern, accepts scoped support/a variant, challenges an interpretation, rejects a suggestion or leaves an observation unresolved. Suggestions and automatic similarity groups do not create reviewed interpretations or establish emitter identity.

Implementation: `spec/agility.ts`, `src/agilityModel.ts`, `src/agilityStorage.ts`, `src/agilityOperations.ts`, `src/useAgilityMapAnalysis.ts`, `src/agilityMap.worker.ts`.

## Selected evidence and shared alignment

Select Frequency, PRI, PW, or any nonempty combination. Resolve each selected quantity to an unambiguous supplied channel with compatible units. Missing, derived/modelled, ambiguous or incompatible selected channels cannot confirm complete selected evidence.

The matcher samples event order and uses a shared monotonic alignment across channels. It compares relative times within each candidate interval, allowing a global duration scale. It does not independently shift PRI, reverse channels, use circular cycle alignment or apply dynamic time warping to erase changed coordination.

Count distinct aligned source/target indices. Repeated alignment positions do not increase support. Complete selected evidence requires enough aligned measurements in every selected channel and enough simultaneous distinct aligned events for the selected combination. The default minimum is 16.

Implementation: `src/agilityComparison.ts`, `src/agilityMatching.ts`.

## Exact similarity function

\[
S(A,B)=\exp[-4D_{shape}-2D_{time}-w_aD_{absolute}-w_dD_{duration}].
\]

For a varying channel, normalize its values to its observed range: \(u=(x-lo)/(hi-lo)\). The code divides through by a magnitude before calculating this ratio to guard extreme numerical values. Steady channels have no varying shape evidence and require an explicit steady-versus-varying case; absolute values remain visible even when their penalty is disabled.

Let \(M\) be the supported channels and \(n_c\) their aligned measured positions. Then:

\[
D_{shape}=\sqrt{\frac1{|M|}\sum_{c\in M}\frac1{n_c}\sum_j(u^A_{cj}-u^B_{cj})^2}.
\]

Selected channels contribute equally to the aggregate. An incomplete comparison can retain a diagnostic score from supported channels; that score does not bypass selected-evidence eligibility.

Using the positions with supporting measurements and relative event times \(\tau=(t-t_{start})/T\):

\[
D_{time}=\sqrt{\frac1N\sum_j(\tau^A_j-\tau^B_j)^2}.
\]

For each channel's bounds, define \(m_c=\max(|lo_A|,|hi_A|,|lo_B|,|hi_B|,\text{Number.MIN_VALUE})\):

\[
D_{absolute}=\frac1{|M|}\sum_c\left|\frac{lo_A/2+hi_A/2}{m_c}-\frac{lo_B/2+hi_B/2}{m_c}\right|.
\]

For compatible durations converted into the same time domain:

\[
D_{duration}=|\log_2(T_A)-\log_2(T_B)|.
\]

The implementation computes the log terms separately for duration and unit factors to avoid an overflowing intermediate ratio. A doubled duration contributes 1. Positive duration weight requires compatible time domains.

Current defaults from `DEFAULT_MATCH`:

| Setting | Default |
|---|---:|
| Selected channels | Frequency + PRI + PW |
| Candidate threshold | 0.85 |
| Fixed shape coefficient | 4 |
| Fixed timing coefficient | 2 |
| Absolute-level weight | 0 |
| Duration weight | 0 |
| Minimum distinct aligned overlap | 16 |

The threshold is a decision boundary, not a blending weight. Scores are resemblance, not probabilities, calibrated confidence or emitter identity. The in-app methodology table also shows the library's applied values; editing unapplied settings does not change those examples.

## Whole-window grouping and partial suggestions

For complete whole-window evidence in both directions:

\[
G(A,B)=\min(S_{whole}(A,B),S_{whole}(B,A)).
\]

`symmetricWholeScore` returns no eligible pair score if either direction lacks complete selected evidence. `completeLinkage` begins with singleton eligible windows, merges the pair of groups with the strongest minimum cross-group score, updates merged scores by taking minima, and stops below the threshold. Every pair in a resulting group must pass; similarity to one representative alone is insufficient. Stable window IDs order inputs and ties. The representative maximizes summed whole-window pair similarity within the resulting group.

This is a greedy hierarchy, not a fixed classifier, an optimal minimum-group partition or proof of physical classes. Adding observations or changing applied settings recomputes eligible grouping. Complete linkage can fragment a broad family. Missing or inadequate selected evidence stays separate rather than being assigned through a partial score.

Suggestion search considers full target length, query-length-sized candidates and bounded quarter/half/three-quarter target lengths, each at least 16 sampled points. Candidate starts use a bounded stride and include the final possible start. It is not an exhaustive search over every original subsequence. Diagnostic intervals map back to source indices; long-window endpoints are approximate.

Full-window suggestions rank before partial suggestions, then by score and stable target ID. All qualifying targets highlight. Four strongest suggestion lines appear initially, expandable to 8/24/64/all. Reviewed links are separate from that cap. A partial suggestion confirms only its contiguous interval and never establishes whole-window grouping.

Implementation: `src/agilityGrouping.ts`, `src/completeLinkage.ts`, `src/agilityMatching.ts`, `src/agilityMapPresentation.ts`.

## Worked examples and limitations

The in-app examples use immutable stage-0 recordings and call the current matcher with applied settings:

- Unit-equivalent A/B recordings: Frequency values in MHz versus GHz preserve behaviour but retain separate profiles.
- Scale/level variant: global time scale and Frequency/PRI/PW range changes preserve coordination when their optional penalties are zero.
- Changed PRI order: Frequency alone can agree while selecting PRI exposes disagreement.
- Contained middle interval: a high partial resemblance score does not imply whole-window group membership.
- Missing PW: a three-parameter comparison cannot confirm PW; selecting only observed parameters can change eligibility.

Synthetic construction labels are not inputs to grouping and are not measured-emitter validation. Matching uses bounded sampled views; inspect original intervals before review. Overlapping windows and duplicate captures do not become independent supporting evidence. Supplied event-level Frequency/PRI/PW are not IQ, a spectrogram or an intra-pulse waveform; one scalar Frequency value cannot describe an entire chirp.

Similarity arrangement displays provisional behavioural groups; emitter arrangement displays retained attribution. Similar behaviour can belong to different emitters and one emitter can have several patterns. Neither layout assigns identity from resemblance.

The deprecated cycle-based formulas, pixel overlap and historical evaluation remain archived in [Legacy cycle methodology](legacy-cycle-methodology.md); they are not the current observation-map method. [Library guide](agility-library.md) · [Verification](../VERIFICATION.md) · [README](../README.md).
