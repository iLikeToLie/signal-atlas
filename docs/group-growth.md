# Group growth and review

The main atlas is a retained signal library. Synthetic examples and measured cycles follow the same admission rule. The historical fixed catalogue remains only as an evaluation fixture. Group count is discovered from admission failures; it is not forced to 12.

## Stable identity with bounded growth

Library groups keep their founder; approved splits use an actual member chosen for its strongest total similarity within the proposed subgroup. These identity anchors stay fixed during ordinary growth. A reviewed merge retires one group into another without replacing the survivor’s anchor.

Every automatic member must match at least one of the target group's fixed anchors at the admission threshold. Additional representatives can improve coverage and selection between eligible groups, but cannot admit a signal outside this anchor boundary. Thus A matching B and B matching C does not suffice to admit C to A's group. A sinusoid anchor cannot gradually migrate through a chain of fringe matches. This is a resemblance boundary, not a guarantee that every member is a mathematical sinusoid or belongs to the same physical class.

The first policy uses these heuristic margins on the active combined similarity scale:

| Rule | Initial value |
| --- | --- |
| Borderline match | Less than 8 percentage points above admission; capped at 100% |
| Competing groups | Winner leads another group by less than 5 percentage points |
| Group support in measured mode | Core members with at least 3 distinct supplied capture IDs |
| Representative coverage diversity | At least 3 distinct clear core shapes; synthetic shapes are not measured capture support |
| Additional coverage representatives | At most 2, selected deterministically for spread within the core |
| Split evidence | At least 3 distinct fringe shapes, with every pair meeting the core threshold |
| Split separation | Weakest subgroup pair exceeds each member's parent-anchor score by at least 5 percentage points |

These margins need sequential and measured-data validation. They are not confidence intervals. At very high admission thresholds, the capped core threshold can keep all non-identical examples provisional.

**Core** members are clear, unambiguous anchor matches with no reconstruction-review flag. A clean, clearly unfamiliar founder starts as core but still needs independent measured support. **Needs review** marks near-threshold matches, competing groups, new founders just below an existing group's threshold, and sparse imports whose scores use reconstructed spans. **Reviewed fringe** retains membership after review but cannot become a coverage representative. A review acknowledgment does not improve the observations or promote them to core.

Distinct support uses the canonical circular arrangement of the 128 normalized phase samples, rounded to 1e-6. Exact and grid-phase-equivalent copies count once. This is a conservative shape-support proxy, not proof of independent captures. Different noisy versions may still be distinct, and sub-grid phase/sampling differences can leave numerical residuals. Measured cycles now retain supplied capture IDs and source windows; capture independence and a validated quality classifier remain unverified. Low resemblance alone does not establish that an observation is noisy; unfamiliarity and reconstruction uncertainty are shown separately.

Measured group support is separate from representative diversity: the same sinusoid observed in three supplied captures can support a group without adding different shapes. Several windows from one capture count once, and missing capture IDs cannot establish support. IDs are supplied assertions, not verified independence. Approved extracted windows with a maximum cyclic gap of 5% can enter the core; wider gaps retain reconstruction review. This is a conservative heuristic, not a quality certification.

## Interactive example

Select **Try group review demo**: one fixed sinusoid anchor and three related third-harmonic fringe variations initially share a group under an 85% formula-only threshold. The three fringe members match each other more strongly than the parent anchor, creating a split proposal. Inspect the curves, approve the split, and undo it. Reset or close the example at any point. All its observations and decisions are generated, temporary, and isolated from the saved library.

## Reviewed splits, merges and reassignment

A single outlier or duplicated fringe does not trigger a split. The proposer partitions eligible fringe members in stable ID order into complete-link candidate clusters: every member must match every other member. It excludes protected anchors and sparse reconstruction-review inputs. Only a sufficiently coherent, separated cluster with three distinct shapes is offered. This is a deterministic candidate heuristic, not an optimal global partition.

Inspect the proposal's curves and proposed anchor, then select **Approve split**. Only the listed local members move. The parent keeps its identity anchor; the new group has its own stable ID and anchor. Subsequent imports can join it under the same anchor rule.

A proposed **merge** requires every cross-group representative pair to meet the core threshold and every transferred member to meet the surviving anchor’s admission threshold. Similar founders alone cannot justify moving an incompatible fringe. **Approve merge** retains the earlier group’s ID/name/anchor and moves all listed members. Neither group is silently merged; the prior decision snapshot supports undo.

**Keep reviewed match** records an acknowledgment. **Move to …** offers compatible alternative groups that meet the fixed-anchor threshold, in the review list and imported-cycle inspector. Identity anchors cannot be reassigned. Manual placement can override the winner but cannot bypass the anchor threshold. Local target anchors are retained explicitly so the decision survives replay.

Use **Undo last group decision** to reverse a review, reassignment, split or merge. The last 20 decision snapshots are retained, including across refresh. Original observations are never modified. Undo restores the preceding review decisions; the current cycles and settings are then replayed. Imports added since a decision remain present.

## Persistence and replay

Originals and extracted cycles remain under `frequency-agile-atlas.measured.v1`; known-cycle imports remain under `frequency-agile-atlas.imports.v1`. Live group settings use the per-quantity grouping key. Unified decisions/history now use `frequency-agile-atlas.library-review.v1`. Earlier explicit decisions are carried forward where their anchors/targets remain available. Old storage remains untouched for recovery, and targets that belonged to the old fixed partition can pause visibly.

Reviewed groups seed the next replay, with their anchors protected. Member pins apply only when they still meet the current boundary. An absent or hidden anchor, changed threshold or incompatible units can pause a decision. Undo restores prior review decisions while retaining later-arriving signals. Original observations are never edited by regrouping. Removing a recording removes its windows; its immediate removal undo restores the source data, while library decisions remain saved separately.

Failed writes leave the displayed decision state unchanged. Corrupt storage is retained for recovery and mutations are blocked. Recording export contains its legacy source-workspace reviews, not the new unified library history. Complete library backup/restore, rename, deliberate anchor replacement, proposal dismissal and structural lineage remain on the [roadmap](../ROADMAP.md).

The algorithm remains order-dependent. Fixed-catalogue accuracy does not validate discovered groups or reviewed merges/splits. Label-free stability diagnostics and measured validation remain necessary before increasing capacity.

[README](../README.md) · [Methodology](methodology.md) · [Sparse cycles](sparse-cycles.md)
