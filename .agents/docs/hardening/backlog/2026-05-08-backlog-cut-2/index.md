---
title: Backlog cut 2 - mouse navigation gestures and immediate regressions
type: implementation-record
status: done
created: 2026-05-08T01:58:00
updated: 2026-05-08T01:58:00
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---

# Backlog Cut 2

## Scope

Continuation requested on 2026-05-08 after cut 1:

- `PageUp` / `PageDown` must keep the virtualized scroll position following the new keyboard selection.
- Delete operations must work from content, props, tags, and files through context menu / badges / node tertiary click.
- Files explorer must show root-level non-Markdown files such as `.png` and decorate images with `lucide-image`.
- Mouse node gestures:
  - Primary: click selects.
  - Secondary: double click activates the provider action.
  - Tertiary: `Alt+click` queues delete.
- FAB / compact menu gestures:
  - Queue secondary: process queue.
  - Queue tertiary: clear queue.
  - Filters secondary: clear filters.
  - Filters tertiary: enter Bases import.
  - View secondary: cycle operation scope.
  - Sort secondary: expand/collapse nodes.
  - View tertiary: reset to tree view.
  - Sort tertiary: reset to name descending.

## Implementation Notes

- `panelExplorer.svelte`
  - Added a serial `scrollTarget` passed to virtualized tree/grid/table views.
  - `PageUp` / `PageDown` now selects the logical target and asks the active view to reveal it.
  - Node primary click now selects only.
  - Node secondary action now runs on double click and keyboard Enter.
  - Node tertiary action now routes through `queueService.requestDelete`.
- `viewTree.svelte`, `ViewNodeGrid.svelte`, and `ViewNodeTable.svelte`
  - Added controlled scroll-to-target effects over the TanStack virtualizers.
  - Moved label clicks back into the row/tile primary selection path.
  - Added row/tile/table double-click secondary callbacks.
- `explorerFiles.ts`
  - Added `handleNodeSecondaryAction` to open files via Obsidian `openLinkText`.
  - File decoration context now forwards file extension.
- `explorerContent.ts`
  - Registered `content.delete` context action.
  - Added hover-delete and secondary open behavior.
- `explorerProps.ts` and `explorerTags.ts`
  - Added secondary action routing into the content search tab.
- `serviceDecorate.ts`
  - Added image extension detection and `lucide-image` decoration for image files.
- `navbarPillFab.svelte` and `framePages.ts`
  - Added tertiary FAB click support via `Alt+click`.
  - Queue double click now processes; queue `Alt+click` clears.
  - Filters double click clears; filters `Alt+click` enters Bases import.
- `navbarExplorer.svelte`
  - Added double-click and `Alt+click` behavior for the compact view/sort controls.

## New Follow-Up Cuts

### Cut 3 - Viewtree Chevron Click Regression

Problem: clicking the `viewtree` chevron still does not toggle expansion in the live UI. The visible effect is only the pointer becoming a hand.

Acceptance:

- Click on the chevron toggles exactly the node under the pointer.
- Chevron click must not select the row, activate secondary action, or trigger tertiary delete.
- Works after row selection, after box selection, and inside virtualized rows.
- Add an Obsidian/browser smoke test if component tests keep passing while the live UI is still broken.

### Cut 4 - View Node Sizing And `serviceViewSize`

Problem: view-tree/grid nodes with icons and nodes without icons have different visual box sizes because the box still adapts to node content.

Acceptance:

- Tree and grid node boxes use one universal stable size per view mode.
- Icon and no-icon nodes reserve the same slots.
- Add `serviceViewSize` to centralize view-size presets for the viewgrid.
- Presets should imitate Windows File Explorer icon sizes from small through extra large. Microsoft documents File Explorer layouts including Extra large icons, Large icons, Medium icons, Small icons, Details, Tiles, and Content:
  https://support.microsoft.com/en-us/windows/use-a-screen-reader-to-explore-and-navigate-file-explorer-in-windows-e7d3a548-87dd-459f-a991-9fde3f7ce927
- Proposed initial preset ids: `small`, `medium`, `large`, `extra-large`.
- The service should return tile width, tile height, icon size, label line clamp, and gap values.
- Add user-facing control later in the view menu after the service and grid adapter are stable.

## Verification

Focused verification completed during implementation:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerContent.test.ts test/unit/components/framePages.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts test/component/navbarQueueDoubleClickClear.test.ts test/component/navbarPillDoubleClickClear.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerProps.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerContent.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/navbarExplorerClickWeights.test.ts test/component/navbarToolbarMenuPlacement.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerContent.test.ts test/unit/components/explorerProps.test.ts test/unit/components/explorerTags.test.ts test/unit/components/framePages.test.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceFilesIndex.test.ts test/unit/services/serviceFileQueue.test.ts test/unit/services/serviceFnR.test.ts --fileParallelism=false`
  - Passed: 9 files, 86 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/navbarQueueDoubleClickClear.test.ts test/component/navbarPillDoubleClickClear.test.ts test/component/navbarExplorerClickWeights.test.ts test/component/navbarToolbarMenuPlacement.test.ts --fileParallelism=false`
  - Passed: 8 files, 69 tests.
- `pnpm run check`
  - Passed: `svelte-check found 0 errors and 0 warnings`.
- `pnpm run lint`
  - Passed: 0 warnings and 0 errors.
- `pnpm run build`
  - Passed: `tsc -noEmit -skipLibCheck && vp build && node scripts/sync-test-build.mjs`.
- Scoped `git diff --check` exited 0 for touched product/test/doc files. Git emitted only CRLF-normalization notices.

Final lint/check/build verification is complete with 0 lint/check warnings.
