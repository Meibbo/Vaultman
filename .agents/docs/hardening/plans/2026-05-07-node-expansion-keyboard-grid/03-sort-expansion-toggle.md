---
title: Sort-view expand/collapse-all toggle
type: implementation-plan
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|node-expansion-keyboard-grid]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T01:02:22
tags:
  - agent/plan
  - explorer/expansion
  - ui/sort
created_by: antigravity
updated_by: codex
---

# Sort-View Expand/Collapse-All Toggle

## Purpose

Add a generic sort-view toggle that collapses all expanded parent nodes when any
parent is expanded, and expands all parent nodes when none are expanded.

## Files

- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `src/components/layout/navbarExplorer.svelte`
- Modify: `src/components/layout/overlays/overlaySortMenu.svelte`
- Modify if service promotion is chosen: `src/services/serviceViews.svelte.ts`
- Modify if service contract changes: `src/types/typeViews.ts`
- Modify i18n: `src/index/i18n/en.ts`
- Modify i18n: `src/index/i18n/es.ts`
- Modify styles if needed: `src/styles/popup/_sort-popup.scss`
- Test: `test/component/panelExplorerSelection.test.ts`
- Test: new or existing navbar/sort popup component test if available
- Test service if changed: `test/unit/services/serviceViews.test.ts` or
  `test/unit/services/serviceViewsZombie.test.ts`

## Architecture Decision

The button lives in `overlaySortMenu.svelte`, but the expansion state currently
lives in `panelExplorer.svelte`. Do not hardcode provider ids in the sort menu.
Use one of these implementation shapes:

1. **Preferred for this cut:** add a generic expansion command bridge from the
   active page into `NavbarExplorer`, then into `SortPopup`.
   - `PanelExplorer` exposes expansion summary and commands through bindable
     props or callbacks owned by the page.
   - `NavbarExplorer` passes `canExpandCollapseNodes`, `hasExpandedParents`,
     `onToggleAllExpandedParents` to `SortPopup`.
   - This is the least invasive if only the active filter page needs the control.

2. **Preferred if expansion will be shared broadly:** promote expansion into
   `ViewService`.
   - Add `expandedSnapshot(explorerId)`, `setExpanded(explorerId, ids)`,
     `expandMany(explorerId, ids)`, `collapseAll(explorerId)`.
   - `PanelExplorer` reads manual expansion from the service and still merges
     auto-expanded ids with manual collapsed ids.
   - `SortPopup` receives only generic command props, not the service itself.

Do not create a second expansion service unless `ViewService`'s existing
expanded storage proves incompatible.

## Parent Id Collection

- Add or reuse a helper that collects every node id with `children.length > 0`.
- The helper must walk all provider tree nodes, not just visible nodes.
- Auto-expanded ids caused by search must not permanently expand all nodes when
  the toggle is used.
- Manual collapse must override auto expansion as it does today through
  `resolveExpandedIds`.

## Button Semantics

- Label when any parent is expanded: English `Collapse all`, Spanish
  `Colapsar todo`.
- Label when no parent is expanded: English `Expand all`, Spanish
  `Expandir todo`.
- Icon when collapse action is next: `lucide-chevrons-up` or
  `lucide-minimize-2`.
- Icon when expand action is next: `lucide-chevrons-down` or
  `lucide-expand`.
- Disabled or hidden when current explorer has zero parent nodes.
- The button must be generic and work for files, tags, props, and Bases import
  providers.

## TDD Steps

- [x] Add a panel component test that renders a tree with two parent nodes,
  invokes the generic collapse-all command, and asserts both children disappear.

- [x] Add a panel component test that invokes expand-all and asserts all parent
  rows expose `aria-expanded="true"` and all child rows are present.

- [x] Add a component test for `SortPopup` or `NavbarExplorer` that verifies the
  button label/icon flips from expand-all to collapse-all based on
  `hasExpandedParents`.

- [x] Add a component test that verifies the sort popup button calls the generic
  callback and does not change sort state.

- [x] Implement parent-id collection and expand/collapse-all helpers in
  `panelExplorer.svelte` or `ViewService`, according to the chosen architecture.

- [x] Pass expansion state and command props from the active page through
  `NavbarExplorer` to `SortPopup`.

- [x] Add i18n keys:
  - `sort.expand_all_nodes`
  - `sort.collapse_all_nodes`
  - Optional tooltip key `sort.toggle_node_expansion`

## Verification Commands

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/navbarExplorer*.test.ts test/component/*sort*.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceViewsZombie.test.ts`
- `pnpm run check`
- `pnpm run lint`

## Acceptance

- Sort view has one explicit toggle for node expansion.
- Toggle collapses all expanded parent nodes when any are expanded.
- Toggle expands all parent nodes when none are expanded.
- It works generically for whichever explorer provider is active.
- It does not mutate sorting, operation scope, file selected-only mode, or search
  state.
