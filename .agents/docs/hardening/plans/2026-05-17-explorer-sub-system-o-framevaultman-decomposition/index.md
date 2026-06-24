---
title: Explorer Sub-System O — frameVaultman decomposition implementation plan
type: plan-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O spec]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/frame
  - explorer/refactor
---

# Explorer Sub-System O — frameVaultman Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `src/components/frame/frameVaultman.svelte` (866 LOC) into four focused modules — `frameNavigation.svelte.ts`, `framePopups.svelte.ts`, `FrameNavbarShell.svelte`, `FrameDashboardShell.svelte` — using Svelte 5 Context API with typed `Symbol` keys for state-crossing. T3 (`openDiffViewHook`) and T4 (`toolsActiveTab` bindable) preserved bit-for-bit. Frame ends at ~350 LOC.

**Architecture:** Two runes services (`FrameNavigationService`, `FramePopupsState`) plus two shell components (`FrameNavbarShell`, `FrameDashboardShell`). Frame instantiates services + late-binds controllers (`viewport`, `navReorder`), calls `setContext(FRAME_NAVIGATION_KEY, nav)` and `setContext(FRAME_POPUPS_KEY, popups)`. Shells consume context at script-top. Five-commit migration: services first, shells second, cleanup last. Each commit independently revertible. Spec: [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O spec]].

**Tech Stack:** Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`); TypeScript 5; SCSS (existing styles move unchanged with extractions, new code prefers UnoCSS); Vitest + `@testing-library/svelte` for component tests; pnpm scripts (`pnpm check`, `pnpm verify`, `pnpm test:component`); Obsidian CLI for live `plugin-dev` smoke.

**Project commands cheat-sheet:**

| Action                    | Command                                                             |
|---------------------------|---------------------------------------------------------------------|
| Type-check                | `pnpm check`                                                        |
| Lint                      | `pnpm lint:fast` / `pnpm lint:full`                                 |
| Unit tests                | `pnpm test:unit`                                                    |
| Component tests           | `pnpm test:component`                                               |
| Full gate                 | `pnpm verify`                                                       |
| Live plugin-dev reload    | `obsidian plugin:reload id=vaultman vault=plugin-dev`               |
| Dev error capture         | `obsidian dev:errors vault=plugin-dev`                              |

---

## File structure

### Will create

| Path                                                                  | Responsibility                                                              |
|-----------------------------------------------------------------------|-----------------------------------------------------------------------------|
| `src/components/frame/frameNavigation.svelte.ts`                      | Runes class + Symbol context key. Owns activePage/pageOrder/toolsActiveTab/statsPreviewFile/filtersBaseChooseMode/filtersActiveTab + surface derivations + navigation intents (T3, T4, navigateTo, bases-import, stats). |
| `src/components/frame/framePopups.svelte.ts`                          | Runes class + Symbol context key. Owns scope/active-filters/search/move popup state + mutations. |
| `src/components/frame/FrameNavbarShell.svelte`                        | Render-only shell. Wraps `NavbarTabs` (top, conditional) + island backdrop + `PopupIsland` + `NavbarDock`. Consumes `FRAME_NAVIGATION_KEY`. |
| `src/components/frame/FrameDashboardShell.svelte`                     | Render-only shell. Wraps `Dashboard3Column` + 3 dashboard snippets. Consumes `FRAME_NAVIGATION_KEY`. |
| `test/component/frameVaultmanBaseline.test.ts`                        | Pre-step 0 baseline DOM snapshots for ops/filters/statistics states.        |
| `test/component/frameNavigationService.test.ts`                       | C1 TDD tests: constructor, all methods, **strict T3 side-effect order**, surface derivations, late-binding. |
| `test/component/framePopupsState.test.ts`                             | C2 TDD tests: 4 popup concerns, state mutations, `onStatsDirty` callback.   |
| `test/component/FrameNavbarShell.test.ts`                             | C3 TDD tests: renders NavbarTabs/NavbarDock, island backdrop, DOM byte-equivalence vs baseline. |
| `test/component/FrameDashboardShell.test.ts`                          | C4 TDD tests: 3 snippets render, dashboardEnabled=false → empty, bind: propagation, DOM byte-equivalence vs baseline. |
| `test/component/frameVaultmanIntents.test.ts`                         | Layer 3 integration: T3 round-trip through registered hook, T4 bidirectional binding, teardown clears T3 hook. |
| `test/component/_helpers/withContext.ts`                              | Test helper: wraps a component in a parent that calls `setContext(key, value)` before render. Used by shell tests to inject `nav` / `popups`. |
| `test/component/_helpers/mockFrameNavigationService.ts`               | Test double for `FrameNavigationService`: in-memory state, records method-call order for shell tests. |
| `test/component/_helpers/makeMockPlugin.ts`                           | Minimal `VaultmanPlugin` mock with the surface frame reads (filter/queue/theme/leafDetach/overlayState/openDiffViewHook). |

### Will modify

| Path                                                                  | Change                                                                       |
|-----------------------------------------------------------------------|------------------------------------------------------------------------------|
| `src/components/frame/frameVaultman.svelte`                           | 866 → ~350 LOC across C1-C5. Replace inline page/popup state + functions with service instances; add `setContext` calls; replace inline render with shell mounts; delete moved code in C5. |
| `src/components/frame/frameNavReorder.svelte.ts`                      | C3 additive: add `drawerOpen = $state(false)` field with public reactivity. No behavioral change to existing methods. |
| `test/component/frameVaultmanRootClasses.test.ts` (audit)             | C5 audit only. Verify still green; update if any moved import broke it.     |

### Will not touch (locked non-goals)

- `src/components/pages/pageTools.svelte` (`OperationsPage`) — `bind:activeTab` works via getter/setter; no prop signature change.
- `src/components/pages/pageFilters.svelte`, `src/components/pages/pageStats.svelte`.
- `src/components/layout/navbarDock.svelte`, `src/components/layout/navbarTabs.svelte`.
- `src/components/layout/overlays/layoutOverlay.svelte` (`PopupOverlay`), `src/components/layout/overlays/overlayIsland.svelte` (`PopupIsland`).
- `src/components/dashboard/Dashboard3Column.svelte`.
- `src/components/frame/frameViewport.ts`, `frameOverlays.svelte.ts`, `framePages.ts`, `frameMoves.ts`, `frameActiveFilters.ts`, `frameFiltersSearch.ts`, `frameSearchSources.ts`, `DetachedTabHost.svelte` — except the additive `drawerOpen` on `FrameNavReorderController`.

### Ground-truth references

Use these line numbers from `src/components/frame/frameVaultman.svelte` at commit `71b8dae` (sandbox tip, post `claude/explorer` merge):

- Imports + types: lines 11-83.
- Props: lines 85-94.
- `initFrameState()` + `overlays` construction: 98-108.
- Page state declarations (`pageOrder`, `pageRenderKey`, `filtersBaseChooseMode`, `statsPreviewFile`, `activePage`, `toolsActiveTab`, `pageIndex`): 111-172.
- `viewport` + `navReorder` construction: 173-186.
- `navigateTo` / `enterBasesImportMode` / `exitBasesImportMode` / `openStatsNote` / `showStatsPage` / `openDiffView`: 187-228.
- T3 hook registration `$effect`: 230-235.
- `pageIndex → applyPageTransform` + `pageOrder` validity `$effect`s: 237-246.
- Stats counters + helpers: 250-271.
- Explorer instances (`fileList`, `propExplorer`, `tagsExplorer`, `selectedFilePaths`): 273-276.
- Filters page state hub (12 declarations): 278-304.
- Layout surface derivations (`topTabItems` ... `dockUsesFramePages`): 305-311.
- Surface helpers (`itemsForSurface`, `activeForSurface`, `selectSurfaceItem`, `externalIdsForSurface`, `detachedTabIdForSurfaceItem`, `tabIdForSurfaceItem`): 313-366.
- Filters search routing `$effect`: 368-396.
- Refresh callbacks: 400-428.
- Scope popup (`scopeOptions`, `setScope`, `setFiltersOperationScope`): 432-461.
- Search popup (`searchName`, `searchFolder`, routing `$effect`): 465-473.
- Active-filters popup (`activeFilterRules`, refresh, toggle, delete): 479-496.
- Move popup (`moveTargetFiles`, `moveTargetFolder`, `movePreviews`, `queueMoves`, `attachFolderSuggest`): 502-523.
- `icon` action: 527-534.
- `bindDashboardMeasurement` + `measureFrameWidth` + `inferFrameViewportKind`: 536-568.
- Active-filters popup refresh `$effect`: 572-576.
- Lifecycle `onMount` #1 (subscriptions): 580-615.
- `elasticRootClasses` + window focus `onMount` #2: 619-637.
- `dashboardFilters` snippet: 640-656.
- `dashboardExplorer` snippet: 658-695.
- `dashboardAddons` snippet: 697-703.
- `frameIslandAndDock` snippet: 705-760.
- Main template (`.vm-view` root + `NavbarTabs` + dashboard/pages-strip branches): 762-844.
- `PopupOverlay` mount: 846-866.

Use these signatures from supporting modules (verified at `71b8dae`):

- `FrameOverlayController` constructor: `(plugin, queueComponent, activeFiltersComponent, options?: { searchIslandComponent?, onImportBases? })` — see `src/components/frame/frameOverlays.svelte.ts:18-29`. Public reads: `activePopup` (`PopupType | null`), `popupOpen` (boolean), `isIslandOpen` (boolean derived). Methods: `closePopup`, `toggleQueueIsland`, `closeQueueIsland`, `toggleFiltersIsland`, `closeFiltersIsland`, plus search-island variants.
- `FrameNavReorderController` constructor: `(options: { getPageOrder, setPageOrder, incrementRenderKey, saveOrder })` — see `src/components/frame/frameNavReorder.svelte.ts:10-23`. Public reads/actions: `isReordering`, `reorderTargetIdx`, `pillEl`, `navCollapsed`, `onNavIconPointerDown`, `onPillPointerMove`, `onPillPointerUp`, `exitReorder`, `bindNav`, `bindViewRoot`, `onCollapsedNavClick`.
- `FrameViewportController` (`src/components/frame/frameViewport.ts`): constructor `(getPageIndex: () => number)`. Methods: `applyPageTransform(boolean)`, `bindViewport`, `bindContainer`, `onContainerTransitionEnd`.
- `framePages.ts` exports: `FramePageId` (`'ops' | 'statistics' | 'filters'`), `resolveFramePageOrder`, `createFramePageLabels`, `createFramePageIcons`, `createFramePageFabs(plugin, toggleQueueIsland, toggleFiltersIsland, options)`.
- `frameActiveFilters.ts` exports: `ActiveFilterRule`, `countActiveFilterEntries`, `collectActiveFilterRules`, `describeFilterNode`.
- `frameMoves.ts` exports: `MovePreview`, `createMovePreviews`, `createMoveChanges`.

---

## Resolved open items (from spec shard 09)

The spec's shard 09 lists 7 open items. Each is resolved here before implementation starts; implementers do **not** relitigate these mid-execution. If a resolution turns out to be wrong, the C1-C5 commits are independently revertible.

| ID | Item | Resolution | Rationale |
|----|------|------------|-----------|
| **O1** | `Service` / `State` suffix vs `Controller` | **Keep `Service` / `State` as spec'd.** Class names: `FrameNavigationService`, `FramePopupsState`. | Spec default; class semantics differ from existing `*Controller` (the new classes own state + intents; controllers wrap DOM/lifecycle behavior). File names match `frameOverlays.svelte.ts` / `frameNavReorder.svelte.ts` precedent (no `service` prefix). |
| **O2** | Filters-search routing `$effect` placement | **Stays inline in frame.** The `$effect` reading `filtersActiveTab`/`filtersSearchByTab`/`filtersSearchCategory` and dispatching to `propExplorer`/`tagsExplorer`/`fileList`/`plugin.contentIndex` remains where it is today (frame lines 368-396). | Effect consumes `fileList`/`propExplorer`/`tagsExplorer` which live as frame `$state` (bound from `FiltersPage`). Moving the effect into the service would force 3+ getter accessors into the constructor signature — violates the no-downstream-changes principle. |
| **O3** | `addOpCount` reactivity trigger | **Defer to impl-time check.** Verify during C1 that `addOpCount = $derived.by(...)` still re-evaluates after `updateStats()` writes to `queuedCount` / `filterRuleCount`. If not, add a private `queueVersion = $state(0)` in frame, increment in `onQueueChanged` callback, reference inside the `$derived.by` body (`void queueVersion;`). | The derivation iterates `plugin.queueService.listTransactions()` fresh on each evaluation, but Svelte 5 only re-runs derivations when tracked dependencies change. Today `addOpCount` re-fires because `queuedCount` change triggers a render that reads it. Post-O the surface is identical; if a regression appears, queueVersion is the documented patch. |
| **O4** | `detachedTabs` source | **Drop the frame `$state`; nav proxies `plugin.leafDetachService`.** `FrameNavigationService` exposes `get detachedTabs(): LeafDetachState` which returns `plugin.leafDetachService?.getState() ?? {}`. Shells read `nav.detachedTabs`. Frame keeps the `unsubLeafDetach` subscription (in `onMount`) for the side-effect of triggering `updateStats()`, but no longer maintains a parallel `$state`. | Per spec shard 09 recommendation. Eliminates redundant state synchronization; `leafDetachService` is the canonical source. |
| **O5** | `drawerOpen` move into `FrameNavReorderController` | **Yes, add `drawerOpen = $state(false)` to the controller.** Public getter via runes auto-expose; `bind:drawerOpen={nav.navReorder.drawerOpen}` works from the shell. | Reorder controller already owns dock-element state (`pillEl`, `navCollapsed`, `isReordering`). `drawerOpen` colocates with related state. Additive change — does not modify any existing method. |
| **O6** | `bindDashboardMeasurement` placement | **Stays in frame.** `frameViewportWidth`, `measuredViewportKind`, `dashboardViewportKind`, `dashboardEnabled`, `bindDashboardMeasurement`, `measureFrameWidth`, `inferFrameViewportKind` all remain in `frameVaultman.svelte`. Shell receives `dashboardEnabled` as a prop. | Preserves the ResizeObserver target (`.vm-view`); no wrapper-element diff. Shell becomes a pure render concern: given inputs, render dashboard or nothing. |
| **O7** | Pre-step 0 commit shape | **Own commit.** `test(O): baseline DOM snapshots for frameVaultman` lands before C1. C1 then references the snapshot in its own tests. | Aligns with "small reviewable commits" principle. Pre-step 0 is read-only relative to production code — must not be tangled with the C1 navigation extraction. |

---

## Plan shards

| # | Shard | Commits produced |
|---|-------|------------------|
| 0 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/00-pre-step-baseline\|00 — Pre-step baseline]] | `test(O): baseline DOM snapshots for frameVaultman` |
| 1 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/01-frame-navigation-service\|01 — FrameNavigationService extraction]] | `feat(O): extract FrameNavigationService` (C1) |
| 2 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/02-frame-popups-state\|02 — FramePopupsState extraction]] | `feat(O): extract FramePopupsState` (C2) |
| 3 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/03-frame-navbar-shell\|03 — FrameNavbarShell extraction]] | `feat(O): extract FrameNavbarShell` (C3) |
| 4 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/04-frame-dashboard-shell\|04 — FrameDashboardShell extraction]] | `feat(O): extract FrameDashboardShell` (C4) |
| 5 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/05-frame-cleanup\|05 — Frame cleanup]] | `refactor(O): frame cleanup` (C5) |
| 6 | [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/06-verification-gates\|06 — Verification gates]] | (none; gate checklist per commit) |

---

## Tools and gates

Local gates after **every** commit:

- `pnpm check` (svelte-check + tsc) — must return 0 errors. Pre-existing warnings tolerated.
- `pnpm verify` (lint + check + build + unit + component) — full suite green.
- Baseline DOM snapshots from `00-pre-step-baseline` — must remain byte-equivalent unless a documented diff is captured in the commit message (C3 / C4 may add a wrapper element if measurement requires it — see shard).
- Live `plugin-dev` smoke: `obsidian plugin:reload id=vaultman vault=plugin-dev`, exercise the relevant scenario per commit's shard, then `obsidian dev:errors vault=plugin-dev` must return `No errors captured.`

Commit policy (per `AGENTS.md`):

- One logical commit per commit number (C1 through C5). Pre-step 0 is its own commit.
- Commit message format: `feat(O): ...` for additions, `refactor(O): ...` for moves, `test(O): ...` for the baseline.
- Use HEREDOC for multi-line bodies.
- Do not skip hooks (`--no-verify`).
- Do not push or merge.

---

## Reading order for the executing engineer

1. Read [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O spec index]] + all 9 spec shards.
2. Read this plan index.
3. Before each commit, read the matching plan shard fully.
4. After each commit, run `pnpm verify` + the per-shard live smoke + dev:errors.
5. Do not interleave commits. Each one must land green before starting the next.

---

## Risk acknowledgment

The spec's shard 09 enumerates 8 risks (R1-R8). Each is mitigated within this plan:

- **R1 (visual parity drift from $effect / mount ordering)** — baseline snapshots (shard 00) + per-commit live smoke (shard 06).
- **R2 (bind: to runes class getter/setter)** — POC test in shard 01 step 1.2 verifies before T4 refactor; fallback to explicit `activeTab` + `onActiveTabChange` documented.
- **R3 (context API as new pattern)** — runtime guard in each shell's `getContext` call throws clear error; shell unit tests assert the missing-context case.
- **R4 (T3 bit-for-bit equivalence)** — `openDiffIntent` order assertion test in shard 01 is **mandatory** before implementation (Red → Green TDD).
- **R5 (stats counter split asymmetry)** — non-extraction is explicit; counters stay inline.
- **R6 (larger PR review surface)** — 5 commits, each independently reviewable and revertible.
- **R7 (Sub-system N collision)** — build order locked; new code prefers UnoCSS but existing SCSS moves unchanged.
- **R8 (late-binding fragility)** — `nav.viewport`/`nav.navReorder` getters throw if `attachViewport`/`attachNavReorder` not called; unit tests cover the "before attach" branch.

---

## Execution handoff

Plan complete. Saved to `.agents/docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/`.

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per commit with two-stage review between commits. Faster iteration; isolated context per commit. Uses `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute commits in the current session using `superpowers:executing-plans`. Batch execution with checkpoints for review.

Given the 5-commit serial dependency (C1 must land before C2, etc., with the API contract finalized in C1), subagent-driven is the better fit: each subagent gets the plan + the prior commit's diff as context, drives a single commit to green, and hands off.

**Bootstrap prompt for the impl session:**

> Implement the Sub-system O plan at `.agents/docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index.md` against the canonical branch (currently `sandbox`; the `claude/explorer` merge is at commit `71b8dae`). Use `superpowers:subagent-driven-development` (recommended). The spec is at the sibling `specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/` folder — read it first if you haven't. Execute commits in order: pre-step 0 → C1 → C2 → C3 → C4 → C5. Each commit must land `pnpm verify` green + baseline DOM snapshots green + live `plugin-dev` smoke clean + `obsidian dev:errors vault=plugin-dev` returning `No errors captured.` All file paths and line numbers in the plan are ground-truthed against the current sandbox tip (`71b8dae`); re-verify at the start of each commit if drift is suspected.
