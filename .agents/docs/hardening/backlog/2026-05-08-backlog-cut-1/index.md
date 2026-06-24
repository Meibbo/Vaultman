---
title: Backlog cut 1 - navigation, queue removal, files, and rename safety
type: implementation-record
status: done
created: 2026-05-08T00:30:00
updated: 2026-05-08T00:30:00
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---

# Backlog Cut 1

## Scope

First implementation cut from the user backlog started on 2026-05-08:

- Keyboard navigation: `ArrowLeft` / `ArrowRight` must act on the keyboard-focused node, not the last DOM-focused or selected row.
- Keyboard paging: `PageUp` / `PageDown` should move node focus while keyboard navigation has an active node; native scroll remains available when no node is active.
- Queue removal: individual items must be removable from the explorer queue.
- Files explorer: show every vault file type, not only Markdown files.
- File rename safety: queued renames must preserve the original file extension, even when the user input omits or changes the extension.
- Verification must finish with zero lint warnings/errors.

## Implementation Notes

- `src/components/containers/panelExplorer.svelte`
  - Added logical keyboard target resolution so left/right expansion follows the current keyboard node.
  - Added clamped page navigation by visible-node order.
  - Preserved native page scroll when no focused or selected node exists.
- `src/services/serviceQueue.svelte.ts`
  - Fixed `OperationQueueService.remove(id)` so a single op removal emits the expected queue changed event.
- `src/index/indexFiles.ts` and `src/components/containers/explorerFiles.ts`
  - Switched Files explorer source data to `vault.getFiles()` where available, falling back to Markdown-only APIs only when required.
  - Kept active filter trees and selected-only mode as narrowing sources.
- `src/services/serviceFileQueue.ts` and `src/services/serviceFnR.ts`
  - Added per-file rename target normalization that preserves each original extension.
  - Multi-file FnR rename handoffs now normalize the final target per selected file.
- Lint cleanup required to satisfy the user's zero-warning requirement:
  - `tabViewMenuDetach.svelte` now uses writable `$derived` instead of capturing prop values at initialization.
  - `useDoubleClick.ts` uses an Obsidian-compatible active-window timer fallback that still works under jsdom tests.
  - Minor ESLint fixes in `main.ts`, `badgeRegistry.ts`, `serviceFnRIsland.svelte.ts`, `serviceFnRTemplate.ts`, `serviceLeafDetach.ts`, and `explorerProps.ts`.

## Tests Added Or Updated

- `test/component/panelExplorerSelection.test.ts`
  - Arrow-left acts on keyboard-focused child.
  - PageDown/PageUp move keyboard focus when active.
  - PageDown keeps native scroll when no node is active.
- `test/unit/services/serviceQueue.test.ts`
  - Individual staged op removal emits exactly one changed event.
- `test/unit/services/serviceFilesIndex.test.ts`
  - Files index includes non-Markdown vault files.
- `test/unit/components/explorerFiles.test.ts`
  - Files explorer renders non-Markdown files without an active filter tree.
- `test/unit/services/serviceFileQueue.test.ts`
  - Rename queue preserves extension when input omits or changes it.
- `test/unit/services/serviceFnR.test.ts`
  - Multi-file rename handoff preserves each selected file extension.

## Verification

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceFilesIndex.test.ts test/unit/components/explorerFiles.test.ts test/unit/services/serviceFileQueue.test.ts test/unit/services/serviceFnR.test.ts test/unit/services/serviceSelection.test.ts test/unit/services/serviceOperationsIndex.test.ts test/unit/services/badgeRegistry.test.ts test/unit/services/serviceFnRIsland.test.ts test/unit/services/serviceLeafDetach.test.ts --fileParallelism=false`
  - Passed: 10 files, 106 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/tabViewMenuDetach.test.ts test/component/navbarQueueDoubleClickClear.test.ts test/component/navbarPillDoubleClickClear.test.ts --fileParallelism=false`
  - Passed: 6 files, 55 tests.
- `pnpm run lint`
  - Passed: 0 warnings, 0 errors.
- `pnpm run check`
  - Passed: `svelte-check found 0 errors and 0 warnings`.
- `pnpm run build`
  - Passed: `tsc -noEmit -skipLibCheck && vp build && node scripts/sync-test-build.mjs`.
- Scoped `git diff --check` for touched product/test files exited 0.

## Residual Backlog

The remaining user backlog is not completed in this cut:

- Configurable mouse primary/secondary/tertiary click behavior on nodes and FABs.
- Multi-selected badge ops and contradiction warning popup.
- Filter ingestion from selection box, props, and tags.
- TabContent reactive search progress and incremental result rendering.
