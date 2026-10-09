# Complete-linkage grouping and review

Tentative v0.1.6-preview.1 applies complete-linkage hierarchical clustering to the retained library: synthetic examples, measured imports and approved recording windows. The historical fixed catalogue remains an evaluation fixture. **There is no preset minimum or maximum number of groups.** An empty library has no groups; similar data can form one group; sufficiently different data can remain singletons.

## Whole-group cohesion and representatives

Start with individual signals, repeatedly merge the closest groups by their weakest cross-member similarity, and stop when the next merge would violate the threshold. Every member pair in every resulting group meets the active threshold. A matching B and B matching C cannot join distant A and C. Stable IDs resolve numerical ties; retained insertion order does not determine memberships.

The same formula/vision blend is retained: default 70% shape formula / 30% pixel overlap, at a 65% threshold. Period, excursion and centre weights remain adjustable; enabled scale terms require compatible units, and Frequency/PRI group separately. Thresholds and blend weights are resemblance heuristics, not match probabilities or measured-data accuracy claims.

After clustering, select a real central representative (medoid) by summed similarity to distinct metric-equivalent shapes. Prefer clear, well-observed members. If every candidate is uncertain, its representative remains visibly under review. Repeated copies cannot move this objective. Three distinct clear core shapes permit up to two additional coverage representatives. **Representatives never replace every-pair cohesion.** A fixed founder cannot veto an otherwise cohesive group.

A saved identity signal preserves reviewed group IDs/names. It can differ from the selected medoid and does not act as an admission boundary. Ordinary automatic groups, representatives and names can change when signals are added/removed or settings change. Explicit reviewed groups remain separate until an approved merge; this is a user constraint, not a clustering-count limit.

## Core, fringe and observation review

| Rule | Initial value |
| --- | --- |
| Borderline cohesion | Member's weakest pair less than 8 percentage points above threshold; capped at 100% |
| Competing groups | Another group fits every pair with this signal and has a representative within 5 percentage points of its own |
| Measured support | Core members with at least 3 distinct supplied capture IDs |
| Additional coverage | At least 3 distinct clear core shapes; up to 2 extra examples |
| Split evidence | At least 3 distinct fringe shapes; every subgroup pair meets the core threshold |
| Split separation | Subgroup's weakest pair exceeds each member's weakest parent-group pair by at least 5 percentage points |

Core members have clear cohesion without reconstruction or competition flags. Reviewed placements suppress already-decided group competition, but cannot suppress borderline cohesion or observation uncertainty. Acknowledgment removes the pending-review state without promoting fringe to core; it is scoped to the algorithm, group composition and current settings.

Distinct shape support uses the canonical arrangement of 128 normalized phase samples rounded to 1e-6. This is a support/cache-candidate proxy, not proof of independent captures. Score reuse separately verifies equivalence within 1e-12 and includes active scale/unit terms. Different noisy captures may remain distinct. Capture IDs are supplied assertions, not independently verified acquisitions.

Repeated windows from one capture count once; missing IDs and synthetic examples do not establish measured support. Dense approved extracted windows with maximum cyclic gap ≤5% can enter the core; wider gaps retain reconstruction review. Low resemblance alone does not identify noise.

## Review, split, merge and reassignment

**Try group review demo** shows four generated curves under an 85% formula-only complete-link threshold. A tighter three-shape subgroup can propose a split. Inspect the selected representative, approve the split and undo it. The demo never changes saved signals or decisions.

Split proposals exclude protected identity signals and observation-review inputs. Stable-ID complete-link candidates must be internally coherent and sufficiently separated from their parent. Approving a split preserves the parent's reviewed identity, creates a new reviewed subgroup and recomputes representatives. It is a conservative proposal heuristic, not a globally optimal partition.

Reviewed merge proposals require **every cross-group member pair** to meet the grouping threshold and every cross-representative pair to meet the core threshold. Approving a merge retains the target's reviewed ID/name, moves the listed members and recomputes its medoid. A representative-only match cannot justify an incompatible merged group. Automatically discovered groups already merge through the hierarchy; merge proposals primarily reconcile compatible groups kept separate by explicit decisions.

**Move to …** requires a match to every target member. Identity signals remain protected to preserve saved decisions; other members, including a selected medoid, can move when eligible. **Keep reviewed match** acknowledges review without improving observations or relaxing cohesion.

## Reassessment, persistence and undo

New arrivals, removals, synthetic visibility and grouping-setting changes recluster the visible library. The same collection/settings/review constraints produce the same memberships independently of arrival order. This greedy hierarchy is not an optimal minimum-group partition. It may fragment broad waveform families, and two close signals may remain separated because they do not fit each other's other members.

Existing review groups seed the hierarchy as explicit separate constraints. Saved placements are rechecked in stable ID order against every already-retained member; incompatible or absent targets pause visibly. Missing/hidden identity signals pause their decisions. Restoring compatible data/settings can reactivate them. Stored decisions are not erased, and regrouping never edits original observations.

Originals/windows remain in `frequency-agile-atlas.measured.v1`, known-cycle imports in `frequency-agile-atlas.imports.v1`, per-quantity settings in `frequency-agile-atlas.grouping.v2`, and unified reviews/history in `frequency-agile-atlas.library-review.v1`. Old storage remains untouched. **Undo last group decision** restores the preceding review snapshot and reclusters current signals; later-arriving data remains present. The last 20 snapshots persist across refresh. Failed writes leave the displayed decision unchanged; corrupt storage stays recoverable with mutations blocked.

Recording export contains legacy source-workspace reviews rather than complete unified library history. Full backup/restore, structural lineage, larger-library performance and measured validation remain on the [roadmap](../ROADMAP.md). Group count is unrestricted; existing signal-intake capacity and quadratic all-pairs costs remain separate limits. Historical fixed-catalogue accuracy does not validate these groups.

[README](../README.md) · [Methodology](methodology.md) · [Sparse cycles](sparse-cycles.md)
