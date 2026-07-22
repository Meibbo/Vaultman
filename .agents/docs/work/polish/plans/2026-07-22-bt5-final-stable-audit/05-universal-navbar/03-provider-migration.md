---
title: BT5 final stable audit plan — Navbar provider migration
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Universal Navbar]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, navbar, statistics]
---

# Statistics and provider migration

## Task 15 — BT5-046 migrate all scenes to one Navbar contract

**Modify:**

- `src/logic/logicNavbarContributions.ts`
- `src/components/layout/navbarPanelWidget.svelte`
- `src/components/layout/navbarTabs.svelte`
- `src/components/pages/pageFilters.svelte`
- `src/components/pages/pageStatistics.svelte`
- `src/VaultmanFrame.svelte`
- `test/unit/navbarContributions.test.ts`
- `test/unit/statisticsPageSource.test.ts`
- `test/unit/statisticsToolbarAndOpenedToday.test.ts`
- `test/unit/statisticsScope.test.ts`
- `test/unit/toolbarOverflowStrategy.test.ts`

### 15.1 Red — complete scene/tab menu parity

Table-driven tests for active Files, Props, Tags, Text, Snippets, Plugins and Statistics must show the same eligible scene controls. Statistics' tab menu contains Toolbar, Snippets, Plugins and Statistics itself; Index is omitted because it is not a scene. No provider may invent a private host or private overflow strategy.

### 15.2 Red — Statistics scope is a provider action

Move `scopeOptions`, `openScopeMenu`, and `statisticsHeaderActions` out of the page into a Statistics contribution adapter/model. Tests assert a scope action exists, its icon/label/checked choice reflect `vault/folder/current`, and selecting an option updates the existing statistics scope pipeline without duplicating calculations.

### 15.3 Green — remove page-owned Navbar code

- Pages expose state/data callbacks only.
- Provider adapters declare tabs, search, view, cells, sort, scope and action nodes.
- Shared host applies label visibility, glyph color, commands, context menus and measured overflow uniformly.
- Files loses its special overflow branch; every provider feeds the same ordered action list.
- Saved toolbar settings migrate/retain values; do not reset a user's strategy.
- Toolbar hide/peek affects the one host and leaves no page-local spacer.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/navbarContributions.test.ts test/unit/navbarFiltersSource.test.ts test/unit/statisticsPageSource.test.ts test/unit/statisticsToolbarAndOpenedToday.test.ts test/unit/statisticsScope.test.ts test/unit/toolbarOverflowStrategy.test.ts test/unit/contentSearchScope.test.ts
pnpm run stylelint
pnpm run check
pnpm run format:check
git diff --check
```

### 15.4 Runtime matrix and commit

- [ ] Switch rapidly through all seven providers; one host updates without stale actions.
- [ ] Statistics scope menu changes data and survives navigation.
- [ ] Every provider exercises Condensed, Scroll and Wrap at min/wide widths.
- [ ] Toolbar hide/peek and tab-label settings work across Data and Statistics.
- [ ] No duplicated toolbar DOM or duplicate action IDs.
- [ ] Apply BT5-059 top-edge fix now if it was waiting on this host.

Commit: `refactor(navbar): migrate provider contributions`.

## Adversarial boundary after Task 15

Test no actions, one oversized action, live language change, command action insertion, provider teardown during resize, mobile orientation change, Statistics async refresh, and a future provider with no search/sort. Document any feature the generic contract cannot express before calling the architecture complete.
