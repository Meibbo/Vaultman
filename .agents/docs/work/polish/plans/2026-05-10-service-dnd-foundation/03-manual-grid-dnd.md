---
title: manual grid DnD continuation
type: implementation-result
status: done
parent: "[[docs/work/polish/plans/2026-05-10-service-dnd-foundation/index|serviceDnd semantic foundation]]"
created: 2026-05-10T06:58:00
updated: 2026-05-10T06:58:00
tags:
  - agent/result
  - initiative/polish
  - explorer/views
  - dnd
created_by: codex
updated_by: codex
---

# Manual Grid DnD Continuation

This slice fixes the blocked `pnpm run check` from the previous DnD slice and
adds an opt-in manual DnD mode for the node grid.

## Scope

- Add a manually toggled drag mode from the sort menu.
- Allow node tiles in the grid to use native drag events when the mode is
  active.
- Preserve normal box selection behavior while the mode is inactive.
- Reorder grid siblings locally with snappy visual feedback.
- Populate native `DataTransfer` payloads so drops outside the grid can inject
  Obsidian-compatible embeds or text into workspace/editor targets.

This slice does not persist manual order into provider metadata yet. It also
does not implement tree/cards/table adapters.

## Implementation

- Fixed the blocked check in `ViewSvarFileManager.svelte` by guarding optional
  `provider.subscribe` before subscribing.
- Added `src/services/serviceManualDnd.ts` as a thin manual-mode layer over the
  semantic `serviceDnd` boundary.
- Added manual-mode setting state with `manualDndEnabled`, defaulting to
  `false`.
- Added a sort-menu toggle with localized labels:
  - `sort.manual_dnd`;
  - `sort.manual_dnd.desc`.
- Propagated the toggle through `pageFilters`, `navbarExplorer`, tab wrappers,
  `panelExplorer`, and `ViewNodeGrid`.
- `ViewNodeGrid` now sets `draggable` on tiles only while manual DnD is active.
- Manual drag start writes:
  - `text/plain`;
  - `text/markdown`;
  - `application/vnd.vaultman.node+json`.
- Workspace payload mapping:
  - file/content nodes become `![[path]]`;
  - tag nodes become `#tag`;
  - property nodes become `property: `;
  - value nodes become `property: value`;
  - unknown nodes fall back to their visible label.
- Local grid drops produce semantic reorder results and `panelExplorer` applies
  sibling-level reorder to the in-memory tree.
- `_grid.scss` adds grab cursors, drop-target styling, and a reduced-motion
  fallback for the snappy drag transition.

## Tests

- Added `test/unit/services/serviceManualDnd.test.ts`.
- Extended `overlaySortMenu.test.ts` for the new toggle.
- Extended `viewGridSelection.test.ts` to protect box selection while manual DnD
  is inactive and exercise manual native drag/drop while active.
- Added an isolated `pageFiltersChooseMode.test.ts` case that verifies the sort
  menu toggle persists `plugin.settings.manualDndEnabled` and applies the grid
  manual-DnD class.

## Verification

Fresh verification from this slice:

- `pnpm run check` passed: 0 errors / 0 warnings.
- `pnpm run lint` passed: 0 warnings / 0 errors.
- `pnpm run build` passed and synced build artifacts.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceManualDnd.test.ts`
  passed: 1 file / 5 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceManualDnd.test.ts`
  passed: 3 files / 17 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/overlaySortMenu.test.ts --fileParallelism=false`
  passed: 1 file / 5 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts --fileParallelism=false`
  passed: 1 file / 18 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageFiltersChooseMode.test.ts -t "manual DnD" --fileParallelism=false`
  passed: 1 test, 6 skipped.
- `git diff --check` across touched files exited 0. Git reported only CRLF
  normalization warnings for already edited working-copy files.

The full `pageFiltersChooseMode.test.ts` file did not finish within the local
244 s timeout during final verification. Before this slice's final verification,
the new manual-DnD case passed inside that file while two older queue/FnR cases
failed because `queueService.add` was not called.

## Remaining Work

- Persist manual reorder into the provider/domain layer instead of keeping it
  local to `panelExplorer` state.
- Add explicit editor/workspace drop handling if native Obsidian targets do not
  consume the Markdown payload consistently.
- Extend manual DnD adapters to tree/cards/table only after grid semantics are
  accepted.
