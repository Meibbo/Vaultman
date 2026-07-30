---
title: Explorer Sub-System O — frameVaultman decomposition
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/frame
  - explorer/refactor
---

# Explorer Sub-System O — frameVaultman Decomposition

Bridge sub-system between Phase 0's 0-B (serviceTheme + token layer) and 0-A (native-DOM parity + View Feature Contract). O decomposes `src/components/frame/frameVaultman.svelte` (866 LOC) into four focused modules so that future preset consumers (Sub-system 6 Layout extension, Sub-system 7 Toolbar contract, 0-A View Feature Contract) can hook into focused shells rather than into the god component.

This spec is the formal successor to the [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|Explorer UI Vision]] entry "O — frameVaultman decomposition", which is superseded by this spec for that scope.

## Decision summary

- Extract **four new modules** under `src/components/frame/`:
  - `frameNavigation.svelte.ts` — runes class owning `activePage`, `pageOrder`, `toolsActiveTab`, `statsPreviewFile`, `filtersBaseChooseMode`, `filtersActiveTab`, surface derivations, navigation intent methods, and the T3/T4 intents.
  - `framePopups.svelte.ts` — runes class owning scope/active-filters/ search/move popup state + mutations.
  - `FrameNavbarShell.svelte` — wraps `NavbarDock` + `NavbarTabs` + island backdrop + `PopupIsland`; consumes navigation service via context.
  - `FrameDashboardShell.svelte` — wraps `Dashboard3Column` + the three dashboard snippets + viewport measurement; consumes navigation service via context.
- **State-crossing principle:** Context API with typed `Symbol` keys (`FRAME_NAVIGATION_KEY`, `FRAME_POPUPS_KEY`). First adoption of `setContext` / `getContext` in `src/components/`. Pattern established here and reused by future frame sub-systems (Theme Builder, Big Picture mode, stacked tabs).
- **T3 + T4 preservation:** `openDiffView` (T3) becomes `nav.openDiffIntent()` on the navigation service.
  `toolsActiveTab` (T4) becomes `nav.toolsActiveTab` ($state with get/set, bindable from `OperationsPage`). Frame retains only the `$effect` that registers `plugin.openDiffViewHook`.
- **Stats counters stay inline in frame.** `selectedCount` / `queuedCount` / `filterRuleCount` / `addOpCount` remain as frame `$state` because `selectedCount` is `bind:`-ed from `FiltersPage` (downstream) and the others are written from subscriptions in `onMount`. Moving them to a service crosses the "no downstream changes" line; defer to a separate sub-system if needed.
- **Window focus listeners stay inline** (~20 LOC, below the ≥30 LOC extraction threshold).
- **`FrameActionsBar` is a bogus split** — FABs already resolve via `createFramePageFabs` in `framePages.ts`; remaining inline is two `$derived` lines. Not extracted.
- **Migration as 5 commits**: services first (C1 navigation, C2 popups), shells second (C3 navbar, C4 dashboard), cleanup last (C5). Each commit TDD; each commit independently revertible; each commit gated by full unit + component suite + live `plugin-dev` smoke + `dev:errors=No errors captured.`
- **Verification floor:** DOM snapshot tests of the frame in three representative states (`page=ops`, `page=filters`, `page=statistics`) captured pre-extraction and asserted post-extraction; complemented by live smoke against `plugin-dev`.
  No screenshot pixel-diff infrastructure introduced — out of O's scope.
- **Net LOC target:** `frameVaultman.svelte` from **866 → ~350 LOC**.
  Four new files totaling ~555 LOC. T3/T4 behavior preserved bit-for-bit.

## Shards

1. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/01-context-and-motivation|Context and motivation]]
2. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/02-architecture|Architecture]]
3. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/03-api-frame-navigation-service|`FrameNavigationService` API contract]]
4. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/04-api-frame-popups-state|`FramePopupsState` API contract]]
5. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/05-api-frame-navbar-shell|`FrameNavbarShell` API contract]]
6. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/06-api-frame-dashboard-shell|`FrameDashboardShell` API contract]]
7. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/07-migration-sequence|Migration sequence (5 commits)]]
8. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/08-testing-strategy|Testing strategy]]
9. [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/09-risks-and-open-items|Risks and open items]]

## Non-goals

- **Do not modify `Dashboard3Column`, `OperationsPage`, `FiltersPage`, `NavbarDock`, `NavbarTabs`, `PopupOverlay`, `PopupIsland`, or any other downstream component.** O only restructures frame wiring;
  downstream surfaces are consumed unchanged. The frame keeps threading the same prop signatures to downstream components — only the source of those values changes (inline → service via context).
- **Do not change selection/focus authority away from `NodeSelectionService`.** `selectedCount` continues to be `bind:`-ed from `FiltersPage`, written by selection events.
- **Do not reintroduce direct VFS mutation paths.** All file mutations continue to flow through `plugin.queueService`.
- **Do not wire `preset.dock` / `preset.tabs` / `preset.toolbar.buttons` / `preset.viewModes` / `preset.nodeElements` / `preset.lockNodeElementVisibility`** — those are Sub-system 6 (Layout extension), Sub-system 7 (Toolbar contract), and 0-A (View Feature Contract) territory. O leaves the seams ready: the navigation service is the natural consumption point for `preset.dock` / `preset.tabs`; the navbar shell is the natural site for `preset.toolbar.buttons`.
- **Do not migrate SCSS to UnoCSS in the extracted modules.** That is Sub-system N's wholesale migration. New code (only) inside extracted modules prefers UnoCSS over SCSS; existing SCSS in the extracted parts stays where it is.
- **Do not add screenshot pixel-diff infrastructure.** Out of scope for O. DOM snapshot tests + live smoke are the verification floor.
- **Do not refactor `FrameViewportController`, `FrameNavReorderController`, `FrameOverlayController`, or any existing `frame/*.ts` helper.** Those are deep modules already;
  O only changes who instantiates them (frame still does, then injects into `FrameNavigationService` via constructor).
- **Do not add new feature behavior.** Pure refactor with visual + functional equivalence verified per commit.
- **Do not introduce a registry / pub-sub for `plugin.openDiffViewHook`.**
  The current `(() => void) | null` slot is already the future-proof abstraction; in-editor diff sub-system (backlog #3) will replace the implementation when it ships. O preserves the slot.

## Locked brainstorm answers

For traceability — resolved during the 2026-05-17 brainstorm and are inputs to this spec rather than open questions:

- **Extraction set:** Lean 3 + FrameNavigation (`FrameNavigationService` + `FramePopupsState` + `FrameNavbarShell` + `FrameDashboardShell`). `FrameActionsBar` dropped (bogus ~5 LOC split). `serviceFrameStats` dropped (~25 LOC, below threshold). `frameFocusBinding` dropped (~20 LOC, below threshold).
- **State-crossing principle:** Context API with typed `Symbol` keys (C+ option). Introduces `setContext` / `getContext` as a new pattern in this codebase, established by O and inherited by future sub-systems.
- **T3 + T4 placement:** Both in `FrameNavigationService`. T3 becomes `nav.openDiffIntent()`; T4 becomes `nav.toolsActiveTab` (bindable). Frame retains only the `$effect` that registers `plugin.openDiffViewHook`.
- **`FrameViewportController` access:** exposed via `nav.viewport` getter on the navigation service. Single source of viewport reference for any consumer that needs it.
- **Verification:** DOM snapshot + live smoke against `plugin-dev`.
  `obsidian-web-lab` is registered as a future-reference resource for 0-A / N / 12 but is not used by O.
- **Migration sequence:** 5 commits — services first (C1 navigation, C2 popups), shells second (C3 navbar, C4 dashboard), cleanup last (C5). Each commit TDD + independently revertible.
- **Shard count:** 9 + index, with per-module API contract shards aligned to the AGENTS.md 200-LOC navigation trigger.
- **Naming convention:** `frameNavigation.svelte.ts` / `framePopups.svelte.ts` (no `service` prefix), following precedent of `frameOverlays.svelte.ts`, `frameNavReorder.svelte.ts`, `frameViewport.ts`. Component files use PascalCase: `FrameNavbarShell.svelte`, `FrameDashboardShell.svelte`.
- **Spec path:** Vaultman convention (`.agents/docs/work/hardening/specs/...`).

## Source notes

- Authored on the `claude/explorer` branch (worktree `.claude/worktrees/jovial-wilson-f81c67`).
- Audit of `frameVaultman.svelte:1-866` against the [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|Explorer UI Vision]] candidate list found that the file is already partially decomposed (9 helpers exist under `src/components/frame/` totaling ~666 LOC outside the .svelte). The honest ≥30 LOC extractions are 3 strong (NavbarShell, DashboardShell, Popups state) + 1 marginal-but-meaningful (Navigation service). The backlog's `FrameActionsBar` (~5 LOC), `serviceFrameStats` (~25 LOC), and `frameFocusBinding` (~20 LOC) all fall below threshold and are not extracted in O.
- 0-B implementation is mid-flight at brainstorm time. Latest 0-B commits on `claude/explorer`: `da886c4`, `1410003`, `704e621`, `e614b00`, `86d4060`. O depends on 0-B's `themeService` surface being stable (which it is post-`e614b00`).
- Future preset consumers wire through these focused shells (not through the frame): `preset.dock` / `preset.tabs` will be consumed by `FrameNavigationService` (filtering surface derivations); `preset.toolbar.buttons` will be consumed by `FrameNavbarShell` (Sub-system 7); `preset.viewModes` and `preset.nodeElements` are 0-A's territory and live downstream of the frame anyway.
- Sub-system N (SCSS-to-UnoCSS migration) is the next high-priority initiative after O. The 4 extracted modules in O are designed to absorb N's migration cleanly: new code prefers UnoCSS; existing SCSS moves with the extracted code without rewrite in O.
