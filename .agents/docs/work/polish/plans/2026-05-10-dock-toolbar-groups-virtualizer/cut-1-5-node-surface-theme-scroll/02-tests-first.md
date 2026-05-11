---
title: Cut 1.5 Tests First
type: agent-plan-shard
status: planned
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/cut-1-5-node-surface-theme-scroll/index|Cut 1.5 Node Surface Theme And Scroll Plan]]"
created: 2026-05-10T19:53:58
updated: 2026-05-10T21:29:48
tags:
  - agent/plan
  - polish
created_by: codex
updated_by: codex
---

# Tests First

## Facet 1: Matched Filter Decoration And Hover Primary

- [x] Update `test/unit/services/serviceViews.test.ts`.
  - Default `new ViewService()` must not project `badges.filters`, `highlights.filter`, or `state.activeFilter` onto normal prop/tag/file rows matched by `activeFilters`.
  - `new ViewService({ showMatchedFilterDecorations: () => true })` must preserve the old matched-filter projection.
  - Active Filter explorer entries with `getDecorationContext: () => ({ kind: 'filter' })` must still produce filter badges/highlights.
- [x] Update `test/unit/components/explorerProps.test.ts`.
  - Default props explorer value nodes matched by active filters must not contain `is-active-filter`, filter badges, or filter highlights.
  - Opt-in plugin `viewService` with `showMatchedFilterDecorations: () => true` must preserve old visible decoration.
- [x] Update `test/component/viewTreeHoverBadges.test.ts`.
  - The hover badge matching the configured primary action must not receive `is-primary-action`.
- [x] Update `test/component/viewGridHoverBadges.test.ts`.
  - Same no-primary-visual assertion for grid hover badges.

## Facet 2: Generic Queue Badges And Props Labels

- [x] Add direct queue-badge tests for `ViewNodeGrid`, `ViewNodeCards`, and `ViewNodeTable`.
  - Mount with a node/row containing `badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }]`.
  - Click the rendered badge.
  - Expect `onBadgeDoubleClick(0)`.
  - Assert the click does not trigger the row/card/tile primary click callback.
- [x] Add/adjust a toolbar category-label test.
  - Props category toggle labels must be `Props` and `Values`, not `Property names` or `Property values`.
  - Props initial search category must remain index `0`/`all`.

## Facet 3: Theme And Node Surface Settings

- [x] Create `test/unit/services/serviceTheme.test.ts`.
  - `normalizeLayoutTheme('native')` returns `default`.
  - `normalizeLayoutTheme('default')`, `polish`, `glass`, and `custom` return themselves.
  - Unknown values return `default`.
  - `applyVaultmanTheme(body, settings)` toggles only the expected body classes.
  - Node backgrounds/borders settings toggle `vm-node-backgrounds-off` and `vm-node-borders-off`.
- [x] Update `test/component/settingsUI.test.ts`.
  - Theme dropdown renders Default, Polish, Glass, and disabled Create your own.
  - Toggles persist:
    - matched active-filter node decorations
    - node backgrounds
    - node borders
  - Mount still does not autosave.

## Facet 4: ViewTree Scroll Service

- [x] Create `test/unit/services/serviceScroll.test.ts`.
  - Fixed fallback rows compute start/end from `scrollTop`, row height, viewport height, item count, and overscan.
  - Scroll target helper returns unchanged scroll top when row is already visible.
  - Scroll target helper returns start-aligned or end-aligned top when row is outside viewport.
- [x] Update or add `test/component/viewTreeSelection.test.ts` coverage.
  - When TanStack virtual rows are temporarily empty, fallback rows include the visible window around the current scroll position.
  - Overscan should be large enough to avoid a blank gap for a normal wheel-sized jump.

## Facet 5: Scrollable Compact Controls

- [ ] Add style tests if the repo has style assertions for the target file; otherwise include these in manual verification.
  - `.vm-popup-squircles`, `.vm-squircle-row`, nav docks/tab bars, and menu pills expose horizontal overflow without hiding options.

## Facet 6: Queue Explorer Parent/Child Presentation

- [ ] Update `test/component/reactiveExplorers.test.ts` or add a focused `explorerQueue` component test.
  - Queue group parent row shows the action label/count and the action icon.
  - Queue child row label is only the item kind, for example `value`, not `property delete value`.
  - Queue child row has no operation badge and no operation icon.
  - Individual remove action is rendered as an inline cancel in the counter/action slot, without a visible duplicate label box.
- [ ] Update `test/component/viewList.test.ts`.
  - `ViewList` keeps generic action behavior.
  - Queue child classes only alter placement/presentation; `onAction` still receives the semantic action and row.

## Required Failure Pass

Run focused tests before production edits and record expected failures:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts test/unit/components/explorerProps.test.ts test/unit/services/serviceTheme.test.ts test/unit/services/serviceScroll.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeHoverBadges.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewNodeCards.test.ts test/component/settingsUI.test.ts test/component/reactiveExplorers.test.ts test/component/viewList.test.ts --fileParallelism=false
```
