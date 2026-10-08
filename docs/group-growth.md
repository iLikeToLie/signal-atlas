# Group growth and review

Implemented in v0.1.5. Open **Group health & review** below Automatic grouping to inspect core/fringe counts, identity anchors, review items and split proposals. Nothing splits automatically. Review actions are disabled in the older temporary control-insertion demo. **Try group review demo** opens a separate interactive example with approval and undo enabled; it never writes workspace storage. The v0.1.6 branch also supports observed groups in an empty measured workspace.

## Stable identity with bounded growth

Reference regions keep their original memberships and three fixed catalogue anchors. New local groups keep their founder; approved splits use an actual member chosen for its strongest total similarity within the proposed subgroup. These identity anchors never move during growth.

Every automatic member must match at least one of the target group's fixed anchors at the admission threshold. Additional representatives can improve coverage and selection between eligible groups, but cannot admit a signal outside this anchor boundary. Thus A matching B and B matching C does not suffice to admit C to A's group. A sinusoid anchor cannot gradually migrate through a chain of fringe matches. This is a resemblance boundary, not a guarantee that every member is a mathematical sinusoid or belongs to the same physical class.

The first policy uses these heuristic margins on the active combined similarity scale:

| Rule | Initial value |
| --- | --- |
| Borderline match | Less than 8 percentage points above admission; capped at 100% |
| Competing groups | Winner leads another group by less than 5 percentage points |
| Group support in measured mode | Core members with at least 3 distinct supplied capture IDs |
| Group support in the synthetic atlas / coverage diversity | At least 3 distinct clear core shapes |
| Additional coverage representatives | At most 2, selected deterministically for spread within the core |
| Split evidence | At least 3 distinct fringe shapes, with every pair meeting the core threshold |
| Split separation | Weakest subgroup pair exceeds each member's parent-anchor score by at least 5 percentage points |

These margins need sequential and measured-data validation. They are not confidence intervals. At very high admission thresholds, the capped core threshold can keep all non-identical examples provisional.

**Core** members are clear, unambiguous anchor matches with no reconstruction-review flag. A clean, clearly unfamiliar founder starts as core but still needs supporting shapes. **Needs review** marks near-threshold matches, competing groups, new founders just below an existing group's threshold, and sparse imports whose scores use reconstructed spans. **Reviewed fringe** retains membership after review but cannot become a coverage representative. A review acknowledgment does not improve the observations or promote them to core.

Distinct support uses the canonical circular arrangement of the 128 normalized phase samples, rounded to 1e-6. Exact and grid-phase-equivalent copies count once. This is a conservative shape-support proxy, not proof of independent captures. Different noisy versions may still be distinct, and sub-grid phase/sampling differences can leave numerical residuals. Measured cycles now retain supplied capture IDs and source windows; capture independence and a validated quality classifier remain unverified. Low resemblance alone does not establish that an observation is noisy; unfamiliarity and reconstruction uncertainty are shown separately.

Measured group support is separate from representative diversity: the same sinusoid observed in three supplied captures can support a group without adding different shapes. Several windows from one capture count once, and missing capture IDs cannot establish support. IDs are supplied assertions, not verified independence. Approved extracted windows with a maximum cyclic gap of 5% can enter the core; wider gaps retain reconstruction review. This is a conservative heuristic, not a quality certification.

## Interactive example

Select **Try group review demo**: one fixed sinusoid anchor and three related third-harmonic fringe variations initially share a group under an 85% formula-only threshold. The three fringe members match each other more strongly than the parent anchor, creating a split proposal. Inspect the curves, approve the split, and undo it. Reset or close the example at any point. All its observations and decisions are generated, temporary, and isolated from both workspaces.

## Reviewed splits and reassignment

A single outlier or duplicated fringe does not trigger a split. The proposer partitions eligible fringe members in stable ID order into complete-link candidate clusters: every member must match every other member. It excludes protected anchors and sparse reconstruction-review inputs. Only a sufficiently coherent, separated cluster with three distinct shapes is offered. This is a deterministic candidate heuristic, not an optimal global partition.

Inspect the proposal's curves and proposed anchor, then select **Approve split**. Only the listed local members move. The parent's identity anchors and reference membership stay fixed; the new group has its own stable ID and anchor. Subsequent imports can join it under the same anchor rule.

**Keep reviewed match** records an acknowledgment. **Move to …** offers compatible alternative groups that meet the fixed-anchor threshold, in the review list and imported-cycle inspector. Identity anchors cannot be reassigned. Manual placement can override the winner but cannot bypass the anchor threshold. Local target anchors are retained explicitly so the decision survives replay.

Use **Undo last group decision** to reverse a review, reassignment or split. The last 20 decision snapshots are retained, including across refresh. Original observations are never modified. Undo restores the preceding review decisions; the current cycles and settings are then replayed. Imports added since a decision remain present.

## Persistence and replay

The measured workspace stores originals, extracted cycles, settings and per-quantity decisions/history together under `frequency-agile-atlas.measured.v1`, without catalogue dependencies. Removing a source removes its cycles and resets that quantity’s review decisions; the removal undo restores the complete previous state. Export workspace includes all this data; restore remains planned.

In the synthetic atlas, decisions and undo history are saved per quantity under `frequency-agile-atlas.group-review.v1`, scoped to the fixed reference catalogue. They are separate from saved cycles and grouping/calibration settings. Corrupt or incompatible saved review data are left untouched, with actions disabled until recovery. A storage write failure leaves the displayed review state unchanged.

Reviewed groups are seeded before replay, with their existing anchors protected; approved members are pinned if they still meet the anchor rule. Remaining imports replay in insertion order. Settings changes recheck every placement and invalidate review acknowledgments for the previous settings. An absent anchor or an incompatible/below-threshold target pauses affected decisions visibly. Restoring the removed anchor or the prior settings reactivates eligible decisions. Automatic assignments and support otherwise remain order-dependent.

Single-cycle JSON/CSV exports retain observations but do not contain review history. Workspace restore, group rename/merge, explicit proposal dismissal, capture-quality assessment and a complete sequential evaluation report remain on the [roadmap](../ROADMAP.md). Existing independent-reference evaluation still uses only the frozen catalogue anchors; its accuracy results do not validate adaptive growth or reviewed splits.

[README](../README.md) · [Methodology](methodology.md) · [Sparse cycles](sparse-cycles.md)
