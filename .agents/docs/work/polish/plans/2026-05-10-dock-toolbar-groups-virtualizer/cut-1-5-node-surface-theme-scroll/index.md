---
title: Dock Toolbar Cut 1.5 Node Surface Theme And Scroll Plan
type: agent-plan
status: done
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/index|Dock Toolbar Groups Virtualizer]]"
created: 2026-05-10T19:53:58
updated: 2026-05-11T23:28:00
tags:
  - agent/plan
  - polish
  - vaultman/product
created_by: codex
updated_by: codex
---

# Dock Toolbar Cut 1.5 Node Surface Theme And Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use TDD for every behavioral change. Do not commit unless the user explicitly asks.

**Goal:** Insert a small, verified cut before Cut 2 that normalizes node decoration, generic queue-badge actions, Props search labels, ViewTree scrolling, theme/node-surface settings, scrollable compact controls, and grouped Queue child-row presentation.

**Architecture:** Keep semantic decoration decisions in services (`serviceViews`, new `serviceTheme`, new `serviceScroll`) and keep Svelte views as renderers. Split behavior into independent facets so separate agents can implement without sharing write scope except for the final integration pass.

**Tech Stack:** Svelte 5 runes, SCSS modules, Vitest unit/component tests, existing Vaultman service/index/provider contracts.

---

## Why This Is A Separate Cut

This request touches seven surfaces that would make Cut 2 too broad if handled inline. The work should be implemented as Cut 1.5, then Cut 2 can resume settings and row-layout completion from a cleaner baseline.

## Plan Shards

- [[01-scope-and-boundaries|Scope, constraints, and file ownership]]
- [[02-tests-first|Tests-first checklist]]
- [[03-implementation-facets|Implementation facets]]
- [[04-verification-and-handoff|Verification and handoff]]

## Facet Order

1. Filter decoration and hover-primary visibility.
2. Generic queue badges and Props search category labels. Done 2026-05-10.
3. `serviceTheme`, node-surface settings, and ViewCards background controls. Done 2026-05-10.
4. `serviceScroll` for ViewTree scroll stabilization and PretextJS audit answer. Done 2026-05-10.
5. Scrollable compact controls. Done 2026-05-11.
6. Queue explorer grouped parent/child presentation. Done 2026-05-11.
7. Final Svelte autofix, focused tests, and `pnpm run check`. Done 2026-05-11.

## Non-Goals

- Do not redo the `@dnd-kit/svelte` migration.
- Do not rewrite all explorer views.
- Do not force PretextJS/service text measurement onto fixed-height views just to say it is global.
- Do not remove active-filter decoration from the Active Filters explorer itself; the default-off change applies to ordinary explorer nodes that match active filters.
- Do not commit.

## Continuation Log

### 2026-05-10 Task 2: Generic Queue Badges And Props Labels

- Added shared node badge helpers and reused them in tree, grid, cards, and table rendering.
- Added direct queue badge rendering/removal in grid, cards, and table; `panelExplorer` now wires queue removal into all node views.
- Shortened Props category labels to `Props` / `Values` in English and `Props` / `Valores` in Spanish, while preserving `searchMode = 0` / `all` defaults.
- Fresh verification:
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts test/component/viewNodeCards.test.ts test/component/viewTableSelection.test.ts test/component/toolbarMenuPlacement.test.ts --fileParallelism=false`: pass, 35/35.
  - `pnpm run check`: pass, 0 errors / 0 warnings.
- Next task was Facet 3, `serviceTheme`, node-surface settings, and ViewCards background controls.

### 2026-05-10 Task 3: serviceTheme And Node Surface Settings

- Added `src/services/serviceTheme.ts` with layout-theme normalization, legacy `native` to `default` migration, body class application, and shared Settings UI theme options.
- Added node-surface settings for matched-filter node decorations, node backgrounds, and node borders; defaults keep matched-filter decorations off and node backgrounds/borders on.
- Replaced direct theme body class toggling in `main.ts` with `applyVaultmanTheme(activeDocument.body, this.settings)`.
- Added disabled `Create your own` theme placeholder plus node-surface toggles in Settings UI.
- Added body-class SCSS controls for node backgrounds and borders across tree, grid, cards, and table surfaces while preserving state-specific visual feedback.
- Fresh verification:
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts --fileParallelism=false`: pass, 4/4.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsUI.test.ts --fileParallelism=false`: pass, 10/10.
  - Svelte autofixer for `SettingsUI.svelte`: no issues; one existing `$effect` suggestion reviewed and left unchanged because it only toggles a global body class.
  - `pnpm run check`: pass, 0 errors / 0 warnings.
- Doc health verification:
  - `node .agents/tools/pkm-ai/check-doc-health.mjs`: fail with unrelated residuals in the detachable workspace tabs spec and `.agents/docs/superpowers`.
- Next task: Facet 4, `serviceScroll` for ViewTree scroll stabilization and PretextJS audit answer.

### 2026-05-10 Task 4: serviceScroll And ViewTree Lag

- Added `src/services/serviceScroll.ts` with fixed-row fallback windowing, fixed-index scroll targeting, and a RAF-throttled element rect observer.
- Replaced `viewTree.svelte` local fallback row/rect observer logic with `serviceScroll` helpers.
- Added reactive fallback scroll state so the tree can re-render the fallback window around the current `scrollTop` when TanStack virtual rows are temporarily empty.
- Increased `TREE_OVERSCAN` from 12 to 24 for `ViewTree` only; focused fallback coverage now expects a normal wheel-sized jump around row 30 to keep row 55 rendered.
- PretextJS audit: `ViewNodeCards` uses service text measurement for dynamic card heights; tree/grid/table/list remain fixed-height surfaces and should not use PretextJS unless their row model becomes dynamic.
- Fresh verification:
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceScroll.test.ts --fileParallelism=false`: pass, 5/5.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeScrollFallback.test.ts --fileParallelism=false`: pass, 1/1.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/virtualizerItemKeys.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false`: pass, 34/34.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`: pass, 35/35.
  - `npx @sveltejs/mcp svelte-autofixer ./src/components/views/viewTree.svelte --svelte-version 5`: no issues; reviewed existing effect/bind suggestions.
  - `pnpm run check`: pass, 0 errors / 0 warnings.
- Next task was Facet 5, scrollable compact controls.

### 2026-05-11 Task 5: Scrollable Compact Controls

- Added `test/unit/styles/compactControlScroll.test.ts` for the SCSS style harness. The test first failed on missing `vm-sort-row` scroll coverage, then passed after the style fix.
- Added a shared `horizontal-control-scroll` mixin with `max-width`, `min-width: 0`, horizontal overflow, hidden scrollbars, and configurable alignment.
- Applied the mixin to compact horizontal control surfaces:
  `.vm-popup-squircles`, queue/filter island squircle rows, `.vm-squircle-row`, `.vm-viewmode-pills`, `.vm-sort-row`, `.vm-stat-scope-pills`, `.vm-tab-bar`, and `.vm-nav-dock`.
- Added fixed flex sizing to tab/squircle/stat pill children so options do not shrink away instead of overflowing.
- `pnpm run build` initially exposed a pre-existing Sass compile blocker:
  `_badges.scss` referenced `$vm-radius-xs` without exporting that token.
  Added `$vm-radius-xs` in `src/styles/_tokens.scss` and rebuilt.
- Refreshed tracked `styles.css` from the passing build.
- No `.svelte` files were touched, so no Svelte autofixer run was required for this slice.

Fresh verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/compactControlScroll.test.ts --fileParallelism=false`:
  pass, 4/4.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts --fileParallelism=false`:
  pass, 8/8.
- `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.
- `pnpm run build`: pass; Vite built `styles.css` and `main.js`, then `scripts/sync-test-build.mjs` synced build artifacts.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/compactControlScroll.test.ts test/unit/styles/nodeDecorationStyles.test.ts --fileParallelism=false`:
  pass, 6/6.
- `node .agents/tools/pkm-ai/check-doc-health.mjs`: fail on unrelated detachable/superpowers residuals.

Manual UI note:

- No live Obsidian narrow-frame smoke was run in this continuation. The slice is covered by style assertions, nav component tests, `svelte-check`, and the production build.

- Next task was Facet 6, Queue explorer grouped parent/child presentation.

### 2026-05-11 Task 6: Queue Explorer Parent/Child Presentation

- Added `src/services/serviceQueuePresentation.ts` with pure helpers for action parent labels/icons and child object-kind labels.
- `groupQueueChangesByAction` now uses the queue action label helper for parent group labels while preserving stable `queue-action:<action>` ids.
- `explorerQueue.svelte` normalizes rows after `ViewService.getModel`:
  - queue parent rows get `is-queue-parent`, the action icon, and a count badge;
  - queue child rows get `is-queue-child`, the simplified object-kind label, no operation icon, no operation badge, and no pending/deleted state;
  - child rows keep the semantic remove action, and group rows remain non-removable.
- `viewList.svelte` adds `is-counter-slot` on queue-child action wrappers and `is-inline-cancel` on the child remove button without changing generic `onAction` dispatch.
- Popup SCSS removes child row decoration and styles inline cancel in the action slot.
- `styles.css` was refreshed by the production build.

Fresh verification:

- Required red pass:
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueuePresentation.test.ts --fileParallelism=false`:
    failed before `serviceQueuePresentation` existed.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewList.test.ts --fileParallelism=false`:
    failed because queue-child action classes were missing.
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/reactiveExplorers.test.ts --fileParallelism=false`:
    failed because queue rows were not parent/child-normalized.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueuePresentation.test.ts --fileParallelism=false`:
  pass, 2/2.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewList.test.ts test/component/reactiveExplorers.test.ts --fileParallelism=false`:
  pass, 17/17.
- Svelte autofixer for `explorerQueue.svelte` and `viewList.svelte`: no issues;
  existing effect/action suggestions reviewed and left unchanged.
- `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceGroups.test.ts test/unit/services/serviceQueuePresentation.test.ts --fileParallelism=false`:
  pass, 6/6.
- `pnpm run build`: pass; Vite built `styles.css` and `main.js`, then `scripts/sync-test-build.mjs` synced build artifacts.
- `node .agents/tools/pkm-ai/check-doc-health.mjs`: fail with unrelated residuals in the detachable workspace tabs spec and `.agents/docs/superpowers`.
- Manual UI note: no live Obsidian smoke was run for the Queue island; the slice is covered by focused unit/component tests, Svelte check, and build.
- Facet 7 final sweep is recorded in [[04-verification-and-handoff|Verification and handoff]].

## Expected Final Answer From Executing Agent

The executing agent must report:

- Whether matched active-filter node decoration is default-off and opt-in through Settings.
- Whether queue badges can remove queued operations from tree/grid/cards/table.
- Whether Props search starts in `all` mode and labels are `Props`/`Values`.
- Whether ViewTree now uses `serviceScroll` and whether lag/blank gaps improved in focused tests/manual browser pass.
- Whether PretextJS/service text measurement is actually applied to every dynamic node surface; if not, state which views use it and why fixed-height views do not.
- Which settings/body classes control node backgrounds/borders and base theme variants.
- Which controls were made horizontally scrollable.
- Whether Queue child rows no longer carry operation icon/row decoration/redundant labels/boxed cancel action.
