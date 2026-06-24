---
title: CSS font snapshot follow-up result
type: implementation-result
status: done
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T04:17:31
updated: 2026-05-10T04:25:27
tags:
  - agent/result
  - initiative/polish
  - explorer/views
  - cards
  - pretext
created_by: codex
updated_by: codex
---

# CSS Font Snapshot Follow-Up Result

The exact card measurement style follow-up is implemented in `HEAD`.

## Implementation

- `src/services/serviceNodeCardStyle.ts` owns the card measurement style
  contract. It exports the deterministic fallback snapshot plus helpers to
  resolve the real title/meta text styles from rendered card fields.
- `ViewNodeCards.svelte` starts with the fallback snapshot, then remeasures
  after mount and resize from `.vm-node-card-field.is-title` and
  `.vm-node-card-field.is-meta` via `activeWindow.getComputedStyle`.
- `nodeCardMeasureStyleKey(...)` prevents state churn by updating the card
  measurement style only when the resolved font, line height, letter spacing,
  whitespace, or word-break values actually change.
- Unit tests cover CSS extraction, fallback behavior, and stable style keys.
- Component coverage proves card row measurement reacts to a rendered CSS font
  snapshot instead of staying pinned to the first-slice fixed fallback.

## Superseded Notes

- The Task 5 local `CARD_MEASURE_STYLE` implementation detail is superseded.
  The fixed values remain only as `DEFAULT_NODE_CARD_MEASURE_STYLE` fallback
  for missing DOM/style contexts and deterministic test setup.
- The Task 6 deferred item "resolve exact Obsidian/Vaultman font snapshots for
  card measurement" is complete. Remaining Pretext/cards follow-up is
  drag/drop, resize handles, multiline table measurement, persisted card sizing,
  and the SVAR absorption/deletion decision.

## Verification

Verification on 2026-05-10T04:17:31:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeCardLayout.test.ts test/unit/services/serviceNodeCardStyle.test.ts`
  passed: 4 files / 18 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts test/component/viewNodeCards.test.ts test/component/panelExplorerEmpty.test.ts test/component/panelExplorerSelection.test.ts test/component/virtualizerItemKeys.test.ts --fileParallelism=false`
  passed: 5 files / 55 tests.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run lint` passed with 0 warnings / 0 errors.
- `pnpm run build` passed and synced build artifacts.
- `git diff --check -- src/services/serviceNodeCardStyle.ts src/components/views/ViewNodeCards.svelte test/unit/services/serviceNodeCardStyle.test.ts test/component/viewNodeCards.test.ts`
  exited 0.
- `npx @sveltejs/mcp svelte-autofixer ./src/components/views/ViewNodeCards.svelte --svelte-version 5`
  reported no required fixes; suggestions were the known virtualizer
  effect/bind-this cautions for this component shape.

Fresh rerun after documentation reconciliation on 2026-05-10T04:25:27:

- Focused unit command above passed again: 4 files / 18 tests.
- Focused component command above passed again: 5 files / 55 tests.
- Scoped documentation `git diff --check` exited 0 with LF-to-CRLF
  normalization warnings only.
