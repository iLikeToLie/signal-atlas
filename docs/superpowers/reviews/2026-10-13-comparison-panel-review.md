# Inspector comparison view review

User chose a second view inside the existing right-hand inspector, retaining the visible map. Reviewed uncommitted changes against `8a30ba8`: prominent launcher, Back navigation, full-height matching list, naturally expanding rows, taller charts and preserved scoped matching/review actions.

Fresh read-only review identified two issues. Back left match-dependent actions enabled while their evidence was hidden; a delayed historical comparison could reopen the panel after Back. Browser regression tests reproduced both failures before fixes. Match actions now require the visible matching panel, and historical navigation opens the panel at request start rather than async completion. Back therefore remains effective while originals load.

Parent verification covers launcher/Back keyboard focus, source navigation, initial collapse, uncapped list height, desktop/phone layout, original comparison loads, historical race, scoped review and original-preserving backup/restore. Existing map/methodology regression checks and production builds are recorded in [Verification](../../../VERIFICATION.md). No matching formula, schema or dependency changes.
