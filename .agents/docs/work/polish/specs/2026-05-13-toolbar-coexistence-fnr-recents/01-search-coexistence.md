---
title: Search overlay coexistence + inline toolbar variant
type: spec-shard
status: draft
parent: "[[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents]]"
created: 2026-05-13T18:00:00
updated: 2026-05-13T18:00:00
tags:
  - agent/spec
  - search-island
  - overlay-state
  - toolbar
  - coexistence
created_by: opus
updated_by: opus
---

# Spec 1 — Search Overlay Coexistence + Inline Toolbar Variant

## Intent

Today the search "island" is a local Toolbar state (`searchIslandOpen`) and the queue/filters islands are full `serviceOverlayState` entries. The two families coexist geographically (search docks at top, stack islands dock above the bottom nav), but several frame-level handlers in `frameVaultman.svelte` close queue + filters reactively when other state changes (focus, route, mode toggles, etc.). The user wants all three surfaces — search, stack island (filters XOR queue), bottom nav — to be simultaneously openable at the same z-index, with only the tab content covered.

The user also asked for a configurable mode where the search input lives permanently inline in the toolbar (surrounded by other primitives) and only promotes to the overlay form on demand. The full WYSIWYG arrangement of those primitives is deferred to the theme builder (Spec 4); this shard ships a hard-coded inline layout that the builder will later replace.

## Files

- Modify: `src/services/serviceOverlayState.svelte.ts`
  - Register `search-island` as a new overlay id alongside `queue` and `active-filters`.
  - Add `isAnySearchIslandOpen` helper (or reuse existing `isOpen('search-island')`).
- Modify: `src/components/frame/frameOverlays.svelte.ts`
  - Add `toggleSearchIsland`, `openSearchIsland`, `closeSearchIsland`, mirroring the existing queue/filters pair.
  - Do **not** close queue/filters when opening search; do **not** close search when opening queue/filters. The only exclusion stays queue↔filters (unchanged).
- Modify: `src/components/frame/frameVaultman.svelte`
  - Audit every `overlays.closeQueueIsland(); overlays.closeFiltersIsland()` pair (lines `~189-190`, `~222-223`, `~284-285`, `~598`, `~720-721`, `~729-730`).
  - Keep closures that fire on **explorer route exit** (leaving the page).
  - Remove closures that fire on **focus changes, search open, or mode toggles within the explorer route** — search and stack must coexist.
- Modify: `src/components/layout/Toolbar.svelte`
  - Replace local `searchIslandOpen` state with a derived from the overlay state (subscribe via the frame's controller pattern).
  - Add an `inline` branch: when `toolbarSearchMode === 'inline'`, render the search input inline in the toolbar primitives row, flanked by the existing icon buttons (sort, view, etc. — hard-coded order for now).
  - Inline mode exposes an explicit `expand` icon button that calls `openSearchIsland()` to promote to overlay.
- Modify: `src/types/typeSettings.ts`
  - Add `toolbarSearchMode: 'island' | 'inline'` (default `'island'`).
- Modify: `src/settingsVM.ts`
  - Surface a toggle / segmented control for `toolbarSearchMode` under the existing layout settings section.
- Modify: `src/styles/popup/_islands.scss` and/or `src/styles/components/_toolbar.scss` (whichever owns the search island rules) — confirm `z-index: $vm-z-index-island` is shared and that no search-island rule pushes a higher value.

## Z-index & Geography

All three surfaces stay at `$vm-z-index-island` (50). Geographic separation prevents collision:

- Search island docks at the top of the explorer content area.
- Stack island (filters XOR queue) docks above the bottom nav.
- Bottom nav anchors the bottom of the frame.
- Backdrop (`.vm-island-backdrop`) covers tab content only (no change).

The current `_v3-nav.scss::vm-island-backdrop::before` height-mask treatment already prevents the backdrop from covering the nav. The change here is purely state-management: stop the implicit mutual exclusion between search and stack.

## Inline Toolbar Variant

When `toolbarSearchMode === 'inline'`:

1. Toolbar renders primitives left → right in a fixed order:
   `[ sort | view | search-input (flex 1) | expand-island | help ]`.
   (Final order TBD by visual review against the prototype's `proto-v4/desktop.jsx`; this is a placeholder. Spec 4 lets users reorder.)
2. The inline input drives the same `FnRIslandService.query` state so promoting to overlay (clicking `expand-island`) inherits the typed text immediately.
3. Recent searches are not shown in inline mode (they live in the overlay only). The strip would be too wide for the toolbar slot.
4. F&R "Replace" input is not shown in inline mode (overlay only).
5. The chip preview is moved to the filters island regardless of mode (handled in Spec 2).

When `toolbarSearchMode === 'island'`:

The Toolbar exposes a search icon button that opens the overlay (current UX, minus the local state — now routed through `serviceOverlayState`).

## Test Plan

Create:

- `test/component/searchIslandOverlayCoexistence.test.ts`
  - Open search + filters: both `isOpen('search-island')` and `isOpen('active-filters')` return true.
  - Open search + queue: both `isOpen('search-island')` and `isOpen('queue')` return true.
  - Filters↔queue still XOR (opening one closes the other).
  - Route-exit handler closes all three.
- `test/component/toolbarSearchInlineVariant.test.ts`
  - Toggling `toolbarSearchMode` to `'inline'` renders the input in the toolbar primitives row.
  - Typing in inline input updates `FnRIslandService.query`.
  - Clicking `expand-island` promotes to overlay; text persists.

Existing tests to update (not break):

- `test/component/searchboxIsland.test.ts`
- `test/component/searchboxIslandFlags.test.ts`
- `test/component/navbarPillFabBadges.test.ts` (z-index sanity)

## Risks

- Frame-level closure audits are surgical: misclassifying a closure as "search-related" could leave stale stack overlays after route changes.
  Mitigation: enumerate each call site in the implementation plan and classify with a one-line comment.
- Inline mode reflows the toolbar; verify against keyboard navigation order (Tab/Shift+Tab) and screen-reader labels.

## Open Questions

- Should the `expand-island` icon button live to the right of the input (cursor-natural) or as a leading affordance? Default to trailing.
- Should pressing Enter in inline mode auto-promote to the overlay so the user sees recent-searches results? Default to yes.
