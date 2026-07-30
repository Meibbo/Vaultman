---
title: P112 Stability Polish
type: spec
status: completed
lifecycle: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-06-20T02:00:27
updated: 2026-06-20T03:50:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/spec
  - vaultman/hardening
glossary_candidates:
  - folder target
  - affected files
  - parentsFirst
  - scope counter
  - view filter
---

# P112 Stability Polish

## Status

Completed in product commits recorded by [[docs/work/hardening/items/2026-06-20-p112-stability-polish-closeout|P112 Stability Polish closeout]].

Drafted after the P112 tree recovery build (`3d42010`) was validated by the dev as visually acceptable.

The exact Core Files expand/collapse push animation is deferred by dev decision. This spec can keep row-motion regressions from returning, but it does not attempt to replace the current virtual tree with Obsidian's native-flow animation model.

## Product Goal

Close the next stable `1.1.2` polish set without reopening the broad regressions recovered during the P112 rollback work. The shared rule is: counters, sort order, badges, and labels must describe the user's current scope, not an internal implementation detail.

## Vocabulary

- **Folder target**: a queued operation whose primary target is a folder path. It can be valid even when the folder contains zero files.
- **Affected files**: the recursive `TFile[]` set under a folder target. This is the count users need before a delete or move.
- **parentsFirst**: a Files sort preference that hoists folder nodes before file nodes among siblings. It is separate from `nested`.
- **nested**: a projection mode. `on` renders hierarchy and indentation; `off` renders all files as level-1 path rows.
- **view filter**: a per-explorer filter such as file type grouping/type selection. It affects the visible result set and displayed counters even when it is not stored in `FilterService.activeFilter`.
- **scope counter**: the `visible/total files` count shown to explain the active Files or Content candidate set.

## Non Goals

- No rewrite of the content-search backend in this slice. The reported gap versus Core Search (`newes` finding fewer matches) remains a separate promoted item if the dev wants search-engine parity.
- No word-count freshness work here.
- No new worktree unless the implementation plan later proves a branch-isolation need.
- No AI docs in the product worktree, no push, no `main` changes.

## Code Anchors

- Folder projection and sorting: `src/logic/logicsFiles.ts`, `src/logic/logicFolderQueue.ts`, `src/components/containers/explorerFiles.ts`.
- Operation queue semantics: `src/services/serviceOperationQueue.ts`, `src/logic/logicQueueWarnings.ts`.
- Sort state/UI transport: `src/types/typeUI.ts`, `src/components/layout/navbarFilters.svelte`, `src/components/layout/popupSort.svelte`, `src/logic/logicSort.ts`.
- Filter and content scope: `src/VaultmanFrame.svelte`, `src/services/serviceFilter.ts`, `src/components/pages/pageFilters.svelte`, `src/components/pages/tabContent.svelte`.
- Search highlight and labels: `src/types/typeSettings.ts`, `src/VaultmanSettings.ts`, `src/components/layout/viewTree.ts`, `src/components/layout/viewNodeTable.ts`, `src/components/containers/explorerProps.ts`, `src/components/containers/explorerTags.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`.

## Slice 1 - Folder Operation Projection

Folders shown in the Files tree are valid operation targets and must surface operation cells/badges. Staging a folder delete must compute the recursive affected-file set with the existing folder helper and store it on the queued change while preserving `targetFolder`.

Acceptance:

- A folder delete for `stress-test-data` reports the recursive file count, including files inside nested subfolders.
- Empty folder delete remains a valid folder-target operation, but its affected-file count is `0`.
- Queue badges appear on the folder target row and on visible affected descendants when appropriate.
- Queue execution still trashes/deletes the folder once; it must not delete every child individually and then delete the parent again.
- Warnings and summaries distinguish "folder target exists" from "affected files count".

Likely implementation shape:

- `_queueFolderDelete(folder)` should call `_filesInsideFolder(folder)` and pass that set into the queue payload.
- `OperationQueue.isFolderDeleteChange` should key on `targetFolder`, not on `files.length === 0`.
- `targetCountForQueuedChange` should expose affected-file count for folder deletes, while conflict policy keeps a separate folder-target validity check.

Focused tests:

- `logicFolderQueue` or `explorerFilesSource` guard for recursive delete payload.
- `queueWarnings.test.ts` for folder target vs affected count.
- `operationQueue*` tests for single folder execution semantics.

## Slice 2 - Files Sort And Parents First

`nested` and folder-first sorting are separate controls. Turning `nested=off` must flatten projection only; it must not silently be the only way to get normal file sort order. The sort menu needs a separate Files-only toggle:
`Parents First` on/off, separated from order fields and grouping/type filters by menu dividers.

Acceptance:

- `nested=off + mtime desc` shows the newest file in the vault first, independent of folders.
- `nested=on + parentsFirst=on` preserves current folder-hoist behavior.
- `nested=on + parentsFirst=off` sorts sibling folder/file nodes by the active comparator without a folder-hoist pass.
- File type view filtering/grouping remains visible as an active view filter and has a clear action.
- Native and popup sort menus transport the same `parentsFirst` value.

Likely implementation shape:

- Extend `ExplorerSortState` with `parentsFirst?: boolean`; default Files to `true` for compatibility.
- Add a private `parentsFirst` field to `ExplorerFiles`, include it in `_sortState`, `setSortBy`, and external sort state callbacks.
- Add an option to `FilesLogic.buildFileTree(..., { parentsFirst })`; current `sortTree` split of folders/files runs only when `parentsFirst` is true.
- Preserve `buildFlatFileNodes` as pure file projection with caller order intact.

Focused tests:

- `filesLogic.test.ts` for nested tree order with both `parentsFirst` values.
- `explorerFilesSource.test.ts`, `navbarFiltersSource.test.ts`, and `sortUiSource.test.ts` for state/UI transport.

## Slice 3 - View Filters And Scope Counters

Counters must explain the active result set. If a type filter/grouping or content search narrows the visible set, the counter cannot keep saying `X/X files` as though the full vault is visible.

Acceptance:

- Files scope text and the Filters island count include current-tab view filters such as file type selection.
- The active filter clear menu exposes a clear action for the current view filter.
- Content tab shows a clickable scope hint in the form `scoped/total files` plus active filter count; clicking it opens FilterScene through the existing `onOpenFilters` callback.
- Content search candidates are drawn from the same user scope as Files: global filters plus current relevant view filters, excluding the content-search rule itself while calculating the search candidate base.
- Once content search results are committed through `setContentSearchRule`, the content search rule counts as another active filter.

Likely implementation shape:

- Keep `FilterService` as owner of global filter rules.
- Introduce a lightweight current-view filter summary in the frame/page layer instead of stuffing view-only state into `FilterService.activeFilter`.
- Derive displayed `filterRuleCount` and active `filteredCount` from global rules plus current-tab view filters.
- Reuse existing `getFilesIgnoringContentSearch(true)` for content-search base scope, then intersect view filters when applicable.

Focused tests:

- `filterService.test.ts` for content search exclusion semantics.
- `pageFiltersContentSource.test.ts` / `pageFiltersSource.test.ts` for content scope hint and filter count transport.
- Files source tests for type-filter counter and clear action wiring.

## Slice 4 - Content Auto Reveal Current File

The Content tab needs an auto-reveal action for the currently active Markdown file. This is a navigation affordance, not a new search rule.

Acceptance:

- A header action in Content reveals and focuses the active Markdown file if it exists in current content results.
- If no Markdown file is active, or the active file is outside the current scoped results, the action is disabled or emits a small Notice without changing filters.
- Reveal respects current sorting and virtual scroll.

Likely implementation shape:

- Get the active Markdown file from Obsidian workspace APIs already used in `pageFilters.svelte`.
- Add a Content header action beside existing sort/expand actions.
- Add a `tabContent` reveal seam that scrolls to and marks the row by path.

Focused tests:

- `pageFiltersSource.test.ts` for action creation.
- `tabContentSource.test.ts` or a focused DOM/source test for path-based reveal seam.

## Slice 5 - Explorer Search Highlight Setting

Search highlighting should be a user setting and consistent across explorers. Default is off because the dev prefers the calmer Files behavior and prior highlight flicker was a regression source.

Acceptance:

- Settings exposes one global toggle: explorer search highlights on/off.
- Default is off.
- When off, Props, Tags, and Files do not apply `vaultman-search-highlight` from explorer search.
- When on, explorers may highlight matching rows/cards, but row signatures must not include highlight-only state and the highlight must not drive global row rerender churn.

Likely implementation shape:

- Add `explorerSearchHighlights: boolean` to `VaultmanSettings` and `DEFAULT_SETTINGS`.
- Gate `searchHighlightIds` creation/usage at explorer boundaries.
- Keep existing row-signature anti-flicker contract.

Focused tests:

- `settingsDefaults.test.ts` for default off.
- Existing search highlight stability/flicker source tests updated to assert highlight is gated and row signatures stay stable.

## Slice 6 - Rename Prop Count Labels To Props

The Files property-count cell should be labeled `Props`, not `Count` or `Prop Count`, to avoid confusion with word count and other counters.

Acceptance:

- View-mode pill label is `Props` in English and Spanish.
- Files table/grid/header label is `Props`, not `# Props`, unless there is a constrained column where the icon-only treatment is already standard.
- Files sort label for the property-count metric does not display generic `Count` when the active tab is Files.

Likely implementation shape:

- Update `viewmode.pill.prop_count`, `files.col.props`, and Files-specific sort/menu label mapping.
- Avoid renaming internal sort id `count` in this patch unless the implementation plan proves it is low risk.

Focused tests:

- Update `propCountLabelSource.test.ts`.
- Add or update a sort-label source test for Files if no coverage exists.

## Verification Contract

Implementation should land in small commits per slice or per tightly-coupled pair. Run focused tests before any full gate. Before final closeout:

- `corepack pnpm run lint`
- `corepack pnpm run check`
- `corepack pnpm run stylelint`
- `corepack pnpm run test:unit`
- `corepack pnpm run build`
- Obsidian CLI only with explicit `vault=plugin-dev`: reload, open relevant surface, targeted DOM checks, and `dev:errors`. If the CLI times out, report the timeout and do not fall back to the personal vault.

## Plan Handoff

After dev review of this spec, use `writing-plans` to create the implementation plan. The first implementation cut should start with Slice 1 because folder operation projection has the clearest user-risk and test seam.
