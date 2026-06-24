---
title: P112 Stability Polish closeout
type: item
status: completed
lifecycle: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-06-20T03:50:00
updated: 2026-06-20T19:42:24
timestamp_note: "approximate local time; timestamp command timed out during closeout"
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/hardening
  - vaultman/closeout
---

# P112 Stability Polish closeout

## Scope

Product worktree:
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

Branch: `p112-type-view-loop-fix`.

This item records the implementation closeout for
[[docs/work/hardening/specs/2026-06-20-p112-stability-polish/index|P112 Stability Polish]]
and
[[docs/work/hardening/plans/2026-06-20-p112-stability-polish/index|P112 Stability Polish implementation]].

The plan was executed after the tree indent/caret recovery item and keeps that
recovered behavior as the baseline.

## Product Commits

- `53408d1 fix(queue): project folder delete affected files`
- `4afa8b1 feat(files): add parents first sort toggle`
- `5d23732 test(queue): remove redundant folder cast`
- `3372870 fix(filters): count view filters in content scope`
- `7531279 feat(content): reveal current file in results`
- `4f946d0 feat(settings): gate explorer search highlights`
- `23c7285 fix(files): label prop counts as props`
- `3b5f0f5 fix(content): unify search scope counters`

No push, merge, tag, or `main` work was performed.

## Implemented Slices

1. Folder delete projection now stores recursive affected files on folder
   delete queue entries while preserving `targetFolder`.
2. Files sort gained an explicit `parentsFirst` state transported through
   native and popup sort controls. `nested` is now projection-only and no longer
   the implicit switch for folder hoisting.
3. Files view filters are counted in displayed filter counters, Content scope
   hint shows scoped/total files plus filter count, and the hint opens the
   Filters island.
4. Content tab has an auto-reveal action for the active file in current results,
   with notices for missing active file or active file outside the current result
   set.
5. Explorer search highlights are now gated by
   `settings.explorerSearchHighlights`, default `false`. Props and Tags keep
   search filtering but no longer apply transient highlight classes unless the
   setting is enabled.
6. Files property-count labels now display `Props` in table/grid/view/sort UI,
   while generic count labels remain available for Props and Tags.

## Follow-Up Correction - Content Scope Counters

After dev QA, the Content tab still had split counter sources:

- typing in Content search only became an active filter after async search
  completion;
- the Content preview header used `matches in Y files` from the search result,
  while the scope hint used the pre-search Files scope;
- the Filters counter depended on a separate service update path.

Product commit `3b5f0f5` fixes this by publishing a pending content-search rule
immediately through `FilterService.setContentSearchPending()`. Pending content
search counts as an active filter but does not narrow files until search results
settle. `pageFilters.svelte` now derives a single `contentScopeSummary` used by
both the scope hint and `tabContent.svelte` preview file count, and notifies
`VaultmanFrame` via `onContentFilterChanged={refreshFiles}` so Files counters
and active filters refresh from the same `FilterService` state.

Focused regression coverage added:

- `test/unit/filterService.test.ts`: pending content search is visible as an
  active filter before results narrow the scope.
- `test/unit/pageFiltersContentSource.test.ts`: Content publishes pending
  filters before async settlement and uses one scope summary for hint + preview
  file count.

## Verification

Focused RED/GREEN tests were added or updated for each slice:

- `test/unit/explorerFilesSource.test.ts`
- `test/unit/queueWarnings.test.ts`
- `test/unit/operationQueueConflictPolicy.test.ts`
- `test/unit/filesLogic.test.ts`
- `test/unit/navbarFiltersSource.test.ts`
- `test/unit/sortUiSource.test.ts`
- `test/unit/explorerSetterSource.test.ts`
- `test/unit/pageFiltersContentSource.test.ts`
- `test/unit/pageFiltersSource.test.ts`
- `test/unit/tabContentSource.test.ts`
- `test/unit/settingsDefaults.test.ts`
- `test/unit/searchHighlightFlickerSource.test.ts`
- `test/unit/searchHighlightStabilitySource.test.ts`
- `test/unit/propCountLabelSource.test.ts`

Final gate from the product worktree:

- `corepack pnpm run lint` passed.
- `corepack pnpm run check` passed with `svelte-check found 0 errors and 0 warnings`.
- `corepack pnpm run stylelint` passed.
- `corepack pnpm run test:unit` passed: 65 test files, 273 tests after
  `3b5f0f5`.
- `corepack pnpm run build` passed and synced artifacts to:
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.

Obsidian CLI verification used explicit `vault=plugin-dev` only:

- `obsidian vault=plugin-dev plugin:reload id=vaultman` returned `Reloaded: vaultman`.
- `obsidian vault=plugin-dev dev:errors` still showed two older
  `ResizeObserver loop completed with undelivered notifications` entries at
  `01:37:39` and `02:24:22`.
- `obsidian vault=plugin-dev eval code="new Date().toLocaleTimeString()"`
  returned `3:44:09 AM`, so the retained `dev:errors` entries predated the
  reload check.
- `obsidian vault=plugin-dev dev:console level=error` returned
  `No console messages captured.`

## Follow-Up

- Dev should visually validate the synced `plugin-dev` build.
- The exact Core Files expand/collapse push animation remains deferred by dev
  decision; this closeout does not attempt native-flow tree animation.
- Content search parity versus Core Search and word-count freshness remain
  separate backlog candidates, not part of this completed plan.
