---
title: Settings, styles, docs, and verification
type: implementation-plan
status: completed
parent: "[[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|node-expansion-keyboard-grid]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T02:25:00
tags:
  - agent/plan
  - ui/settings
  - ui/styles
  - verification
created_by: antigravity
updated_by: codex
---

# Settings, Styles, Docs, And Verification

## Purpose

Make the changes durable: settings persist, labels exist in both languages,
styles preserve hit targets and accessibility, and verification is run in the
safe order for this repo.

## Settings Scope

- Add `gridHierarchyMode?: 'folder' | 'inline'` to
  `src/types/typeSettings.ts`.
- Add default `gridHierarchyMode: 'folder'` to `DEFAULT_SETTINGS`.
- Add Settings UI control in the existing Grid section:
  - English label: `Grid hierarchy mode`
  - Spanish label: `Modo de jerarquia del grid`
  - Options:
    - `Folder navigation`
    - `Inline expansion`
- Preserve current optional grid fields:
  `gridRenderMode`, `gridEditableColumns`, `gridLivePreviewColumns`,
  `gridColumns`, `gridRenderChunkSize`.
- Update `settingsUI.test.ts` so mounting still does not mutate settings or call
  `saveSettings`.

## Sort Toggle I18n Scope

- English:
  - `sort.expand_all_nodes`: `Expand all`
  - `sort.collapse_all_nodes`: `Collapse all`
  - `sort.toggle_node_expansion`: `Toggle node expansion`
- Spanish:
  - `sort.expand_all_nodes`: `Expandir todo`
  - `sort.collapse_all_nodes`: `Colapsar todo`
  - `sort.toggle_node_expansion`: `Alternar expansion de nodos`

## Style Scope

- Tree:
  - `.vm-tree-toggle` must have a stable hit target.
  - `.vm-tree-row-surface` remains the visual selected/focused/active surface.
  - `.vm-selection-box` remains visual-only with `pointer-events: none`.
  - Badges stay above row visuals only where they are actual badge targets.
- Sort popup:
  - Add one compact icon button in the vertical or control row without pushing
    existing sort pills out of their container.
  - Button must have visible focus treatment and accessible label.
- Grid folder mode:
  - Toolbar is dense and utilitarian, not card-like.
  - Breadcrumb text must truncate without overlapping buttons.
  - Buttons use icons with tooltips/labels.
- Grid inline mode:
  - Expanded parent tile spans all columns.
  - Nested grid margin and boundary differentiate children from sibling parents.
  - Avoid variable row height layout jumps.

## Verification Order

Do not run Vite/Svelte verification commands in parallel because this repo has
known transient resolver issues.

Run narrow tests first:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsUI.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/logic/logicKeyboard.test.ts`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceViewsZombie.test.ts`

Then broad checks:

- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`

Then scoped whitespace check:

- `git diff --check -- src/components/views/viewTree.svelte src/components/views/ViewNodeGrid.svelte src/components/containers/panelExplorer.svelte src/components/layout/navbarExplorer.svelte src/components/layout/overlays/overlaySortMenu.svelte src/components/layout/GridNavigationToolbar.svelte src/types/typeSettings.ts src/types/typeViews.ts src/services/serviceViews.svelte.ts src/index/i18n/en.ts src/index/i18n/es.ts src/styles/explorer/_virtual-list.scss src/styles/explorer/_tree.scss src/styles/data/_grid.scss src/styles/popup/_sort-popup.scss test/component/viewTreeSelection.test.ts test/component/panelExplorerSelection.test.ts test/component/viewGridSelection.test.ts test/component/settingsUI.test.ts test/unit/logic/logicKeyboard.test.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceViewsZombie.test.ts`

## Manual Smoke

Use Obsidian CLI smoke only after unit/component/build pass:

- Open Vaultman filters page.
- In tree mode, click parent chevrons near the icon gutter.
- Drag a selection rectangle over rows, then immediately click a parent chevron.
- Click direct and inherited badges.
- Use `ArrowLeft` on child, `ArrowLeft` again on parent, and `ArrowRight` on
  collapsed parent.
- Open sort view and toggle expand-all/collapse-all.
- Switch to grid folder mode and navigate into a parent, then Back, Forward, Up,
  Refresh, and breadcrumb root.
- Switch to inline mode if implemented and verify parent tile chevron expansion
  with nested child grid.
- Run `dev:errors` and analyze logs before declaring clean.

## Completion Notes

- Inline mode is now implemented, not gated. The settings dropdown enables and
  persists `Inline expansion`.
- Scoped inline completion tests passed for `viewGridSelection`,
  `panelExplorerSelection`, and `settingsUI` together with 36 tests after a
  local Vite cache clear recovered the known transient resolver issue.
- `pnpm run check` and `pnpm run lint` passed. `pnpm run build` failed once on
  the known transient `svelte` resolver issue from `src/types/typeFrame.ts`,
  then passed on immediate sequential rerun without code changes.
- Scoped `git diff --check` passed for the inline implementation, style,
  generated `styles.css`, and tests.
- Obsidian CLI smoke reloaded and opened Vaultman with
  `gridHierarchyMode: 'inline'`; after clearing an unrelated older
  `notebook-navigator` error, `obsidian dev:errors` reported no captured errors.

## Documentation Updates

- Link this plan from `current/status.md` and `current/handoff.md` only as a
  compact current-work pointer.
- If implementation starts, create a research or execution record under
  `.agents/docs/work/hardening/research/` or `.agents/docs/work/hardening/items/`
  for observed hit-target evidence and Windows 11 parity notes.
- Do not move AI docs to `main`.

## Acceptance

- Settings persist without mount-time mutation.
- English and Spanish labels exist for all new controls.
- Styles preserve distinct selection, focus, active, hover, badge, and chevron
  states.
- All narrow tests, broad checks, build, scoped diff check, and Obsidian smoke
  pass before implementation is called complete.
