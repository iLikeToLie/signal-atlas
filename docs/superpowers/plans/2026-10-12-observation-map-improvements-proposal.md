# Signal Atlas observation-map improvements: development proposal

**Date:** 12 October 2026, Asia/Singapore.
**Status:** Phases 1–2 approved for native execution. Shared behaviours plus distinctive modes approved as the later emitter story; physical parameter ranges and demo implementation remain for phases 3–4.
**Working branch:** `codex/v0.1.7-map`, starting at `c0da4fbd021a2d870985f2e75ebe4b402d25f2e9`.
**Version policy:** v0.1.5 is deprecated, per the current user instruction. It is not a design reference or implementation target. The `v0.1.7` tag resolves to `db449ab05451ab68fc093459f42275ea09f988e3`; this proposal follows the explicitly requested branch head.

**Additional authorized change:** Use simple one-word similarity-group names instead of 01/02 labels. Reuse the existing editorial name pool; preserve emitter profile names, analytical IDs, membership and insufficient-evidence semantics.

## Goal and scope

Improve the existing observation map's matching explanations, zoom readability and emitter demonstration. Explain the implemented numerical methodology accurately, then introduce reproducible radar-inspired observations within the current event-table model.

Keep the retained library, original recordings, selected windows, reviewed relationships, separate emitter profiles, keyboard access and reduced-motion behavior. Suggestions and similarity groups remain provisional; resemblance does not establish emitter identity. No model replacement, calibration change, dependency addition, database migration or publication is included in the initial UI phase.

## Context obtained

Inspected the branch source, dataset generator, schema, tests, workflow, README, roadmap, verification record, stage-0 contract, library guide and existing v0.1.7 design/plan/review documents. There is no repository `AGENTS.md` and no such instruction file in the workspace's ancestor directories checked during this investigation.

Accessible project/cloud history was read through the Codex chat tools:

- **Review signal-atlas branches**: coordinated matching, exact source windows, synthetic pilot scope and previous release preparation.
- **Review web app improvements**: a retained directory rather than repeated empty intake, one grouping rule, stable individual cards, constellation layout and animated parameter changes.
- **Explain example grouping behavior**: prior grouping discussion, used as historical context rather than a replacement for current source.
- **Find agile signal datasets**: source credibility, measured-versus-synthetic distinctions and adaptation limits.
- **Signal Atlas Grouping Infographic**: prior correction of illustrative formulas and confusion between numerical matching and old pixel comparison.
- **Improve Signal Atlas Matching**: origin of the current improvement brief.

These chats describe remote `/workspace/signal-atlas` development and ignored pilot artifacts. They do not provide a live cloud filesystem or a current runtime status. No managed-cloud execution/status tool is exposed in this local chat, so those ignored artifacts have not been copied or independently inspected. Prior pass/deployment claims are historical evidence, not fresh verification.

Superpowers and context-mode are installed and callable. Context-mode was used for source/output analysis and selective retrieval; native Git tools fetched and checked out the requested branch. Brainstorming frames the unresolved narrative, writing-plans structures this proposal, and systematic-debugging was used for the baseline failure. Before implementation, review the proposed design; use test-first changes for nontrivial behavior, then verification-before-completion and review. Recommended execution is native work in this chat because the changes share the same small set of map components.

## Current implementation and implications

| Area | Actual implementation | Implication |
|---|---|---|
| Entry and application | `src/main.tsx`, `src/AgilityApp.tsx` | The observation map is primary; there is no router dependency to extend. |
| Intake and originals | `src/AgilityIntake.tsx`, `spec/agility.ts`, `src/agilityStorage.ts`, `src/agilityOperations.ts` | Imports validate units, events and provenance, preserve originals, and create observation windows. |
| Analysis lifecycle | `src/useAgilityMapAnalysis.ts`, `src/agilityMap.worker.ts` | Recompute against workspace/revision/settings identities; reject stale results. |
| Matching | `src/agilityComparison.ts`, `src/agilityMatching.ts` | Numerical selected-parameter alignment and evidence gates; no pixel or learned model in this path. |
| Similarity groups | `src/agilityGrouping.ts`, `src/completeLinkage.ts` | Bidirectional whole-window scores and complete linkage; partial matches cannot establish group membership. |
| Arrangement | `src/agilityMapLayout.ts`, `src/AgilityMap.tsx` | The same observation windows move between similarity and emitter arrangements; map distance is approximate. |
| Highlighting and ranking | `src/agilityMapPresentation.ts` | All qualifying targets highlight; whole-window suggestions precede partial ones, then sort by score and stable ID. |
| Legend | `src/AgilityMapLegend.tsx`, `src/agilityMap.css` | Status markers, card highlights, island outlines and connection samples share a compact explanation with ambiguous visual targets. |
| Connections | `src/AgilityMapConnections.tsx`, `src/agilityMapCamera.ts` | Endpoints are transformed to screen coordinates. Label boxes are fixed at 26 screen pixels high, with width based on text length; tiles shrink with zoom. Labels therefore dominate at distant zoom. |
| Default line cap | `src/AgilityApp.tsx:24`, `src/AgilityMapToolbar.tsx` | State starts at eight, and the selector starts at eight. Both must change; reviewed relationships are separate from the suggestion cap. |
| Demo | `scripts/generate-agility-controls.ts`, `datasets/agility-stage0-v1`, demo loading in `src/AgilityApp.tsx` | Fifteen control recordings load into an isolated demo database. The generator defines 17 reference windows, but the UI creates the full-recording demo windows. |

The control dataset deliberately makes A and B resemble one another. B includes unit-equivalent data, shifted PRI coordination, a partial observation, missing measurements, a repeating control and noise. A includes scale changes, incomplete PW, repeated capture identity and an extra numeric channel. Candidate C demonstrates uncertainty and insufficient evidence. These are useful software controls, but they are not a coherent operating-mode narrative or measured-emitter benchmark.

## Mathematics to explain on the methodology page

The current matcher implements:

\[
S(A,B)=\exp\{-4D_{shape}-2D_{time}-w_aD_{absolute}-w_dD_{duration}\}.
\]

- Shape is the square root of the mean of supported channels' mean squared normalized errors. Each varying channel is normalized by its own observed range, with numerical guards; steady channels need a separate explanation because they provide no varying shape evidence.
- Timing is the root mean squared difference between aligned relative event times. One monotonic event-order alignment is shared across selected parameters; the matcher does not independently shift PRI to make coordination agree.
- Absolute discrepancy is the mean normalized difference between channel midranges, using the maximum absolute bound as the denominator.
- Duration discrepancy is the absolute log-base-two ratio of compatible, unit-converted durations.
- Defaults in `DEFAULT_MATCH`: threshold `0.85`, absolute weight `0`, duration weight `0`, minimum distinct overlap `16`, selected parameters Frequency + PRI + PW.
- Settings permit an individual parameter or any nonempty combination. Every selected parameter must have sufficient evidence, including simultaneous distinct aligned measurements for the selected combination. Reused alignment positions are not new observations.
- Search retains at most 128 sampled points from each window. Partial target intervals use bounded candidate lengths/starts. Explain approximation and source-relative endpoints rather than claiming an exhaustive subsequence search.

For grouping, `symmetricWholeScore(A,B)` takes `min(S(A,B), S(B,A))` only when both whole-window comparisons have complete selected evidence. Complete linkage merges groups only when every cross-group pair reaches the threshold. Ineligible windows stay in the insufficient-evidence arrangement. Groups are recalculated across the eligible collection when inputs/settings change; this is not a fixed group classifier or a nearest-representative insertion rule.

Suggested worked examples, verified by existing controls and tests:

1. Equivalent MHz/GHz measurements can match across separate emitters.
2. Uniform scale/offset changes can resemble the base when absolute/duration weights are zero.
3. Changed PRI coordination can disagree even when individual traces look similar.
4. A contained interval can have a strong partial suggestion without joining the same whole-window similarity group.
5. Missing PW can make a three-parameter comparison ineligible despite Frequency/PRI resemblance.

Generate displayed example scores from the matcher; do not hard-code an invented percentage. Scores are resemblance, not probabilities or identity confidence.

## Delivery plan

### Phase 0: record the baseline and preserve frozen data

**Completed investigation:** On local Node v24.21.0, the explicit named suite produced 132 tests: 131 passed, one failed. The isolated failure reproduces at `tests/signal.test.ts:44`, where the retained PRI catalogue is compared with fresh generation using exact deep equality. There are 417 numeric differences, no structural differences, and maximum absolute difference `9.71445146547012e-17`. This establishes small floating-point regeneration drift; the specific runtime/platform source has not been proven.

Do not regenerate or overwrite the frozen catalogue to hide this failure. At implementation time, decide whether to record it as an inherited legacy failure or make a separate narrowly scoped numerical-tolerance test correction with strict metadata/structure checks. That decision is distinct from changing the current matcher. The existing workflow also runs catalogue generation, so reproducibility expectations need explicit treatment before release.

**Commands:** `node --test --test-isolation=none --test-reporter=spec tests/*.test.ts`; isolate with `--test-name-pattern="PRI atlas is paired" tests/signal.test.ts`.

### Phase 1: matching legend, label readability and four suggestions

**Modify:** `src/AgilityApp.tsx`, `src/AgilityMapToolbar.tsx`, `src/AgilityMapLegend.tsx`, `src/AgilityMapConnections.tsx`, `src/agilityMap.css`.
**Existing callers/interfaces:** `AgilityApp` owns `limit`; toolbar consumes `limit/setLimit`; map passes the cap into `mapPresentation` and renders connections with `camera/overview`. Preserve these interfaces unless label density requires passing the existing detail level.
**Tests:** `tests/agilityMapPresentation.test.ts`, `scripts/check-agility-map.py`.
**Docs:** `docs/agility-library.md`, README's active v0.1.7 description, and the current verification record when results are available.

- [ ] Add browser assertions for the new default and legend targets, plus a four-suggestion presentation case. Keep existing arbitrary-cap cases: calling the helper with eight must still draw eight.
- [ ] Change the app default to four and add `4 strongest` to the selector. Retain 8/24/64/all expansion. All qualifying observations still highlight; reviewed relationships remain outside the suggestion cap.
- [ ] Organize legend samples by **Cards**, **Connections** and **Group outlines**. Explicitly distinguish selected card, matching card border, review status, filtering/insufficient evidence, reviewed link, whole suggestion and partial suggestion. Use the existing colours, shapes and line patterns.
- [ ] Keep connection geometry in screen coordinates. Proposed density behavior: compact percentage badges in preview, full percentage/type text in detail, and reveal labels on focus/interaction in the distant overview. Use bounded readable text sizes rather than inverse zoom scaling. Suppress or reposition badges that collide with visible cards or other badges, retaining accessible connection names and inspector access. Confirm the behavior visually before choosing exact size/offset constants.
- [ ] Verify at zoom bounds `0.03–6`, at the overview/preview/detail transitions, and at desktop, tablet and narrow phone viewports. Exercise short, crossing and overlapping edges; partial/reviewed/full links; 4/8/all caps; Hide nonmatches; keyboard activation and reduced motion.
- [ ] Run focused map suites and existing browser checks, then full suite/build. Record the inherited legacy failure separately if still present. Update active documentation to four without rewriting historical verification claims.

**Acceptance:** Four suggestions initially, expandable without lost matches; legend samples clearly identify their visual target; connection evidence remains reachable when a visual label is reduced/hidden; labels do not cover cards across tested zooms. Matching scores, reviews, original recordings and group membership are unchanged.

**Related inherited minor:** The footer currently counts suggestions before display filtering. The previous review explicitly deferred this. Flag it during verification; correcting that count is a separate small change if required for truthful phase-1 presentation, not a matcher rewrite.

### Phase 2: dedicated methodology view

**Create:** `src/MethodologyPage.tsx`.
**Modify:** `src/AgilityApp.tsx`, `src/agilityMap.css`, `docs/methodology.md`, `docs/agility-library.md`, README.
**Verify against:** `src/agilityMatching.ts`, `src/agilityComparison.ts`, `src/agilityGrouping.ts`, `src/agilityOperations.ts`, `src/agilityStorage.ts`, `src/useAgilityMapAnalysis.ts`.
**Tests:** Extend `scripts/check-agility-map.py`; use existing `tests/agilityMapMatching.test.ts` and `tests/agilityMapGrouping.test.ts` for worked-example calculation assertions.

- [ ] Specify the current workflow: validate/import → preserve original/create window → build evidence views → worker comparison/group recomputation → provisional map → analyst review → retained pattern/evidence/relationship.
- [ ] Explain automatic similarity grouping and analyst-created patterns as distinct processes. Also explain emitter arrangement as retained attribution, not identity inferred from clustering.
- [ ] Add a header Methodology destination and a return-to-map control. Use local view state or a simple hash view, with no router dependency. Preserve library/selection/settings; ensure returning does not unnecessarily reset the map camera. If the map is kept mounted but hidden, avoid applying zero-size viewport measurements.
- [ ] Build a readable workflow diagram with native HTML/CSS or SVG and equivalent descriptive text. No image-generation or diagram dependency is needed for this small flow.
- [ ] Present the verified formula, terms, defaults, selected-channel evidence gates, grouping rule, partial/whole distinction, worked examples and approximation limits. Reuse `DEFAULT_MATCH` for live default values. Clearly distinguish implementation facts from future realism work.
- [ ] Rewrite the active portion of `docs/methodology.md` around the observation-map method. Deprecated formula/pixel descriptions must not appear as the active method.
- [ ] Verify navigation, focus return, narrow layouts, text readability, diagram accessibility, and agreement between example results and executable matcher tests. Build for both root and `/signal-atlas/` paths.

**Acceptance:** An analyst can explain why an observation matches, does not match, belongs to a group, remains insufficient, or needs review without encountering an invented pixel model or an automatic identity claim.

### Phase 3: agree the emitter narrative

This is a design decision before dataset changes. Preserve the useful similarity arrangement and use the same observation IDs in both arrangements.

| Option | Story | Advantage | Cost/limitation |
|---|---|---|---|
| Shared behaviours plus distinctive modes — recommended | A and B share one mode, each has an additional distinctive coordinated mode, and an incomplete candidate remains uncertain. | Both arrangements teach something: shared morphology across profiles and each profile's accumulated repertoire. | Requires a small new curated demo and documented construction labels; distinctive examples must not imply universally unique radar signatures. |
| One emitter, several operating modes | A's observations span repeatable modes and transitions; B resembles one A mode. | Strong explanation of why one emitter can occupy several similarity groups. | The A/B contrast is less balanced; transitions can dominate the initial demonstration. |
| Uncertain attribution and analyst review | Candidate observations progressively support, contradict or remain separate from A/B descriptions. | Demonstrates the evidence/review workflow and uncertainty. | More interaction is needed before the initial map becomes explanatory. |

**Recommendation:** Use the first option as the core map story, with candidate uncertainty as a small secondary example. Do not assign an observation's emitter from a similarity score. Do not add real platform identities or claim identification accuracy.

**User choice:** Shared behaviours plus distinctive modes. The user approved this direction; the present implementation authorization covers phases 1–2 only.

**Files after agreement:** demo loading and explanatory copy in `src/AgilityApp.tsx`, relevant emitter/island copy in `src/agilityMapLayout.ts` and `src/AgilityMap.tsx`, dataset guide and roadmap. Document the agreed story and acceptance examples before coding it.

### Phase 4: researched, reproducible synthetic observations

Depends on the phase-3 story. Research can inform that discussion before the final dataset design is approved.

**Existing contracts:** `spec/agility.ts`, `src/agilityModel.ts`, `src/agilityOperations.ts`, `src/agilityStorage.ts`.
**Create, if the recommended story is approved:** a separate `scripts/generate-agility-demo.ts` and `datasets/agility-demo-v1/` with recordings, manifest and README; add the corresponding generator script in `package.json`.
**Modify:** demo import/glob in `src/AgilityApp.tsx`, current demo browser expectations, `docs/agility-library.md`, roadmap and verification record.
**Tests:** Add a focused `tests/agilityDemo.test.ts` for the new generator and use current matching/grouping fixtures for behavior checks. Existing stage-0 controls and their byte fingerprints remain the regression suite.

- [ ] Research primary technical references for carrier-frequency agility, dwell/hop schedules, staggered/jittered PRI, PW variation, correlated parameter changes and observation noise. Record exact source-supported claims and distinguish transmitter behavior from measurement effects.
- [ ] Start from the prior dataset investigation, but recheck release contents/provenance/licensing before adoption. The [Turing institutional publication](https://www.turing.ac.uk/news/publications/turing-synthetic-radar-dataset-dataset-pulse-deinterleaving) documents a synthetic pulse-deinterleaving benchmark, and its [official dataset card](https://huggingface.co/datasets/alan-turing-institute/turing-synthetic-radar-dataset/blob/main/README.md) describes hopping/staggered behavior. These are useful research references, not measured validation of this application's matcher. No large dataset download is necessary for the initial demo.
- [ ] Choose a small number of coherent event-level modes with reproducible seeds, documented units/ranges and source-derived design rationale. Test clean modes first, then controlled noise, dropouts, partial windows and mode transitions. Preserve missingness and avoid independent channel alignment.
- [ ] Keep the current schema: event timestamps and supplied numeric Frequency/PRI/PW values, source provenance, independent captures and window intervals. Treat preceding-event PRI consistently with arrival-time construction; dropped detections require explicit observed-PRI semantics.
- [ ] Distinguish pulse-to-pulse carrier changes from an intra-pulse chirp. One scalar frequency per event cannot faithfully encode an entire chirped waveform. Explain that limitation; adding chirp parameters, IQ or waveform processing would need a separate agreed schema and renderer scope.
- [ ] Check new recordings with `validateEventRecording`, deterministic regeneration, positive PRI/PW, strictly increasing timestamps, unit-equivalence controls and exact source-window round trips.
- [ ] Measure clean/noisy pair scores, whole/partial eligibility, parameter-mask changes and complete-linkage membership against the construction rationale. Ground-truth construction labels evaluate behavior; they are never input to the grouping algorithm. Do not tune the matcher merely to force the desired story.
- [ ] Handle existing demo databases explicitly: the present loader only seeds an empty demo. Show a versioned demo destination or offer an explicit reset of the isolated demo rather than silently replacing saved state. Never reset the retained user library.
- [ ] Verify both arrangements, cross-emitter links, uncertainty, inspector intervals and backup/restore. Use the existing capacity scripts if storage or matching behavior changes; a new tiny presentation dataset alone does not justify another million-event run.

**Acceptance:** A small, coherent and visibly synthetic emitter story; reproducible records and provenance; no changes to frozen controls; expected similarity/evidence distinctions withstand controlled perturbations; no measured-data performance claim.

## Dependencies, review focus and completion gates

Order: phase 1 → phase 2 → agreed phase-3 narrative → phase-4 dataset. Phase-4 reference research can support the phase-3 discussion. UI changes do not depend on changing the matcher or data schema.

Five cases requiring explicit verification:

1. Four suggestions do not hide other qualifying cards or cap reviewed relationships.
2. Distant zoom and dense/crossing links preserve readable evidence access and keyboard activation.
3. Methodology navigation retains selected observation/workspace/camera, and examples use current settings and actual calculations.
4. Shared patterns across A/B remain separate attributed observations; incomplete channels cannot establish complete-link group membership or identity.
5. Existing demo and retained databases survive the new demo version; synthetic regeneration does not rewrite frozen control data.

Before each implementation phase, review its design and resolve its material choices. Before completion, run relevant Node/browser tests, TypeScript/Vite build and whitespace checks, inspect visual results, and document actual results. Do not describe historical cloud tests as newly passed. Publishing, tags, merging and Pages environment changes need a separate user instruction.

The checked-in Pages workflow currently targets `feature/revised-inputs`, not this branch. It is not evidence that a push to `codex/v0.1.7-map` would publish these changes. No push or deployment was performed during this investigation.

## Investigation limits

No application files, frozen datasets or runtime state were modified. No browser session, dependency install, production build, live cloud artifact inspection, physical-phone check or million-event pilot was run for this proposal. The current local named test suite and isolated numerical drift diagnosis were run. Primary reference search was accessible through the web tool; direct context-mode fetches of the institutional/dataset pages were blocked by remote HTTP 403/401 responses, so no dataset files were inspected.
