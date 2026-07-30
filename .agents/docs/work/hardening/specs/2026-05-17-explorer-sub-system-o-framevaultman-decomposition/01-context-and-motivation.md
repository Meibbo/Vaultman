---
title: Context and motivation
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O frameVaultman decomposition]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - explorer/frame
  - explorer/refactor
---

# Context And Motivation

## The god component pressure

`src/components/frame/frameVaultman.svelte` is the top-level container component of Vaultman's main view. At 866 LOC across one file, it mixes responsibilities that have grown over the project's lifetime:

| Cluster | LOC | Status |
|---|---:|---|
| Imports + props plumbing | ~80 | Necessary infrastructure |
| Page navigation state (activePage, pageOrder, navigateTo, pageIndex, $effects) | ~50 | **In-frame today** |
| Bases import mode entry/exit | ~10 | **In-frame today** |
| Stats preview entry (openStatsNote, showStatsPage, statsPreviewFile) | ~15 | **In-frame today** |
| T3 — openDiffView + plugin.openDiffViewHook $effect | ~15 | **In-frame today** |
| Stats counters (selectedCount, queuedCount, filterRuleCount, addOpCount, updateStats, renderAddonsStats) | ~25 | Crosses bind: boundary with FiltersPage |
| Explorer instances ($state declarations for fileList / propExplorer / tagsExplorer / selectedFilePaths) | ~5 | Bound through to FiltersPage |
| Filters page state (12 $state declarations) | ~15 | Bound through to FiltersPage |
| Layout surface resolution (itemsForSurface / activeForSurface / selectSurfaceItem / externalIdsForSurface / detachedTabIdForSurfaceItem / tabIdForSurfaceItem + derivations) | ~70 | **In-frame today** |
| Filters search routing $effect | ~30 | **In-frame today** |
| Refresh callbacks (refreshFiles / refreshActiveFilterHighlights / refreshQueue) | ~30 | **In-frame today** |
| Scope popup state | ~25 | **In-frame today** |
| Search popup state + effect | ~15 | **In-frame today** |
| Active filters popup state + handlers | ~20 | **In-frame today** |
| Move popup state + handlers | ~25 | **In-frame today** |
| Icon Svelte action | ~10 | Frame-local helper |
| Dashboard viewport measurement (bindDashboardMeasurement / measureFrameWidth / inferFrameViewportKind / state + derivations) | ~40 | **In-frame today** |
| Active filters popup refresh $effect | ~6 | Frame-only orchestration |
| Lifecycle onMount #1 (subscriptions) | ~35 | Frame-local lifecycle |
| Theme window focus binding (elasticRootClasses + onWindowFocus/Blur + onMount #2) | ~20 | **In-frame today** |
| Per-page FAB derivation (pageFabs + leftFab / rightFab) | ~30 | **In-frame today** |
| Dashboard snippets (filters, explorer, addons) | ~65 | **In-frame today** |
| Frame island + dock snippet | ~55 | **In-frame today** |
| Main markup (NavbarTabs + page-or-dashboard branch) | ~80 | **In-frame today** |
| PopupOverlay mount | ~20 | Frame-local |

**Reality vs the backlog framing.** The [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|backlog entry "O"]] described "~13 mixed responsibilities" and proposed six initial extraction candidates. The audit done during the 2026-05-17 brainstorm confirms:

- The file is already **partially decomposed**. Nine helpers exist under `src/components/frame/` totaling ~666 LOC outside the .svelte:
  `frameActiveFilters.ts`, `frameFiltersSearch.ts`, `frameMoves.ts`, `frameNavReorder.svelte.ts`, `frameOverlays.svelte.ts`, `framePages.ts`, `frameSearchSources.ts`, `frameViewport.ts`, `DetachedTabHost.svelte`. The reorder controller, overlay controller, viewport controller, page FAB/icon/label factories, move computation, and filter-search state are all already extracted.
- Of the backlog's six candidates, the **honest ≥30 LOC** clusters remaining in-frame are three strong (NavbarShell, DashboardShell, Popups state) plus one marginal-but-meaningful (Navigation service). `FrameActionsBar` is a bogus split: FAB resolution lives in `framePages.ts`, FAB rendering lives inside `NavbarDock`, and the inline residue is two `$derived` lines. `serviceFrameStats` (~25 LOC) and `frameFocusBinding` (~20 LOC) fall below the ≥30 LOC threshold and stay inline.
- The result: O extracts **4 modules**, not 6.

## Why decompose now

Three pressures align on this sub-system:

### 1. Future preset consumption pressure

0-B declares `preset.dock`, `preset.tabs`, `preset.toolbar.buttons`, `preset.viewModes`, `preset.nodeElements`, `preset.lockNodeElementVisibility` as declare-only fields. Future sub-systems wire them:

- **Sub-system 6 (Layout extension)** — `preset.dock` / `preset.tabs` filter the surfaces visible in the frame's dock and tabs. The natural consumer is `FrameNavigationService`, which already owns the surface derivations (`itemsForSurface` / `activeForSurface` / `dockItems` / `topTabItems`). Adding preset filtering becomes a localized change to one runes class. Without O, the same change scatters across 866 LOC of `frameVaultman`.
- **Sub-system 7 (Toolbar contract)** — `preset.toolbar.buttons` filters which buttons render in the toolbar. The natural consumer is `FrameNavbarShell` (which already renders the dock including its FAB slots). Adding the toolbar registry becomes a localized change in the shell.
- **0-A (View Feature Contract)** — `preset.viewModes` and `preset.nodeElements` live downstream of the frame anyway (inside `panelExplorer` and the view components). O leaves these untouched but ensures the frame is no longer a barrier between the preset definitions (in `themeService`) and the view-level consumers.

Decomposing before the preset wiring lands means each preset field hooks into a small, focused module instead of into the god component.

### 2. God component anti-pattern

Beyond the preset pressure, 866 LOC in one component creates specific maintenance problems:

- **Refactor blast radius.** Any change to navigation, popups, or layout has to be understood against the entire file.
- **AI agent context window pressure.** Multi-agent workflows (Claude / Codex) reading the frame burn ~17K tokens just to understand the top-level container. Decomposing the file into ~350 LOC + four 100-170 LOC modules drops the per-task read footprint significantly.
- **Test surface friction.** Component tests for the frame today mount everything to test anything. Per-module tests in O can exercise `FrameNavigationService.navigateTo()` or `FramePopupsState.toggleFilterRule()` in isolation.

### 3. Sub-system N alignment

Sub-system N (SCSS-to-UnoCSS migration, high priority post-O) will touch many of the same files. If N runs against the god component, the diff is large and visually risky. If N runs against four focused modules, the migration is incremental and locally reviewable.

The build order recommendation from the backlog is `0-B → O → 0-A → N → 12`. O is the bridge that makes N safer.

## What stays the same after O

The frame's **external contract** is unchanged:

- `frameVaultman.svelte` exports the same default component.
- Same props: `{ plugin, activeWindow, viewportKind }`.
- Same renderable surfaces: `NavbarTabs` at top (when configured), `NavbarDock` at bottom, `Dashboard3Column` or the pages-strip viewport in the middle, `PopupIsland` and `PopupOverlay` for islands and popups.
- Same `plugin.openDiffViewHook` slot behavior (T3).
- Same `OperationsPage` / `FiltersPage` / `StatisticsPage` mount semantics including `bind:activeTab` and all the filters page bindings (T4 and the FiltersPage state hub).
- Same `addOpCount` derivation visible to consumers.
- Same window focus binding behavior (Faint Mode tracks the active window in pop-out scenarios).

What changes is **where** each piece of state and logic lives, **how** state crosses module boundaries (Context API instead of local `$state`), and **how many LOC** the frame's component file contains.

## Locked constraints from `current/handoff.md`

Non-negotiable preservation contracts that O must respect:

- T3 — `openDiffViewHook` selects Tools tab `file_diff`.
- T4 — `OperationsPage` is bound to `toolsActiveTab` in both the page strip and the dashboard explorer.
- No direct VFS mutation paths.
- No change to selection / focus authority away from `NodeSelectionService`.

These are enforced by per-commit live smoke and the unit test in `frameNavigationService.test.ts` that asserts the side-effect order of `openDiffIntent()`.
