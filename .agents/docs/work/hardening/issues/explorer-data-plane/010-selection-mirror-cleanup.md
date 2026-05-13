---
title: EDP-010 Selection mirror cleanup
type: issue
issue_id: EDP-010
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T17:43:16
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[009-adapter-row-contract-follow-up|EDP-009]]"
created_by: codex
updated_by: codex
---

# EDP-010 Selection Mirror Cleanup

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-d---selection-mirror-cleanup|Wave 4 Slice D]]

## What To Build

Remove or explicitly deprecate the `ViewService` selection/focus mirror after
snapshot-backed adapters consume `NodeSelectionService` projections.

## Acceptance Criteria

- [x] `ViewService` selection/focus mirror is removed or explicitly deprecated
      behind a read adapter.
- [x] Tests prove no divergence from `NodeSelectionService`.
- [x] Row state output still supports legacy layer consumers where needed.

## Implementation Notes

- Removed the independent `ViewService` `selections` and `focused` stores.
- Added a `NodeSelectionService` authority to `ViewService`; callers can inject
  the shared authority, and default `ViewService` instances create a
  `NodeSelectionService` fallback.
- `ViewService.getModel()` now reads selection ids, anchor id, focus id, and row
  selected/focused state from the authority snapshot.
- `IViewService.select()`, `clearSelection()`, and `setFocused()` are explicitly
  deprecated in the type contract and retained as compatibility delegates into
  `NodeSelectionService`, so legacy callers cannot mutate an independent mirror.
- `panelExplorer` now resolves selection authority from `plugin.selectionService`
  first, then from `plugin.viewService.selectionService`, then from a local
  fallback. Its commit bridge no longer calls `ViewService` selection/focus
  mutators; it only syncs file-selection side effects for filter scope.

## RED/GREEN Notes

- RED unit: `serviceViews.test.ts` failed because `ViewService` ignored an
  injected `NodeSelectionService` and returned an empty model selection after
  the authority selected `b`.
- RED unit: `serviceViews.test.ts` failed because deprecated
  `ViewService.select()` mutated only the old ViewService mirror and left the
  injected `NodeSelectionService` snapshot empty.
- RED component: `panelExplorerSelection.test.ts -t "row-slot click selects"`
  failed because `panelExplorer` still called
  `viewService.clearSelection/select/setFocused`.
- GREEN: `ViewService` reads/delegates through `NodeSelectionService`, and
  `panelExplorer` no longer replays selection into `ViewService`.

## Blocked By

- [[009-adapter-row-contract-follow-up|EDP-009]]

## Verification

- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts`
  - RED before implementation: 2 failed / 17 passed.
  - GREEN after implementation: 19 passed.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts -t "row-slot click selects" --fileParallelism=false`
  - RED before implementation: 1 failed / 38 skipped.
  - GREEN after implementation: 1 passed / 38 skipped.
- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceViewsZombie.test.ts test/unit/services/serviceViewTableAdapter.test.ts test/unit/services/serviceExplorerRowInput.test.ts`
  - Passed: 5 files / 51 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
  - Passed: 1 file / 39 tests.
- `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/viewNodeCards.test.ts test/component/viewTreeGridRowInputContract.test.ts test/component/viewNodeSelectionGranularity.test.ts --fileParallelism=false`
  - Passed: 6 files / 56 tests.
- Sticky tree gate:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeScrollFallback.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false`
  - Passed: 4 files / 39 tests.
- Svelte autofixer:
  - `npx @sveltejs/mcp svelte-autofixer ./src/services/serviceViews.svelte.ts --svelte-version 5`
  - `npx @sveltejs/mcp svelte-autofixer ./src/components/containers/panelExplorer.svelte --svelte-version 5`
  - No blocking issues; only broad pre-existing style suggestions.
- `pnpm run lint:full` passed.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run build:plugin` passed.
- `git diff --check` passed with CRLF conversion warnings only.

## Integration Verification

- Integrated into `claude/explorer` with merge commit
  `ca20fbe00ac7858fa1535103232363cb1c92288c`.
- Revalidated after T3/T4 integration on final head
  `d4c4225f7ce5d2e2e2b393e01e3eb63dc355b71a`:
  - EDP-010 focused unit: 2 files / 34 tests passed.
  - EDP-010 focused component: 1 file / 39 tests passed.
  - EDP regression unit gate: 7 files / 39 tests passed.
  - Component row/reveal/selection gate: 14 files / 121 tests passed.
  - Sticky tree gate: 4 files / 39 tests passed.
  - `lint:full`, `check`, `build:plugin`, and `git diff --check` passed.
