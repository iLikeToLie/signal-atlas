# Bidirectional comparison review

Fresh read-only review covered the collapsed related rows, interval previews, bidirectional search, coverage styles and scoped review actions on `codex/v0.1.7-map`. The reviewer independently passed 16 focused tests.

An important finding reproduced a three-emitter import case: reviewing the left and right components reused one local pattern by source window ID. A failing regression test confirmed the merge. Local ownership now uses the existing scoped evidence lookup, so separate components retain separate local patterns and relationships. Destination validation also requires evidence covering the actual compared interval and channels, preventing a reviewed half from authorizing the opposite half.

The reviewer suggested resetting rows when the selected observation changes. The parent list already uses selected-window ID and library revision as its key, resetting all child rows; no further change was needed. Browser checks cover initial collapse and native keyboard reopening. A browser timing regression was fixed by starting comparison loading on the opening click, clearing previous traces synchronously.

Parent verification covers both browser suites, exact original intervals, original-data backup/restore, desktop/phone previews, root and Pages builds and production-path smoke checks. See [Verification](../../../VERIFICATION.md). No dependency or schema change, push or deployment. Search remains bounded and sampled; the demo is illustrative rather than independent hardware evidence.
