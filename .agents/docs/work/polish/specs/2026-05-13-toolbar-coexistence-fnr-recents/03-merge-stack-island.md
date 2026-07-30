---
title: Merge stack island setting (filters | queue arrow-nav shell)
type: spec-shard
status: draft
parent: "[[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents]]"
created: 2026-05-13T18:00:00
updated: 2026-05-13T18:00:00
tags:
  - agent/spec
  - stack-island
  - filters
  - queue
  - overlay-state
created_by: opus
updated_by: opus
---

# Spec 3 — Merge Stack Island Setting

## Intent

Filters and Queue islands currently render as two distinct overlay shells that share the same screen slot (bottom-above-nav) and are mutually exclusive (opening one closes the other — `frameOverlays.svelte.ts:37/63`).
The user wants an opt-in mode where the two are presented as a **single shell** with arrow-nav in the header that switches between filters mode and queue mode, with a fast transition between bodies.

This shard introduces the setting + the merged-shell component while preserving the legacy two-shell behavior as the default.

## Files

- Modify: `src/types/typeSettings.ts`
  - Add `mergedStackIsland: boolean` (default `false`).
- Modify: `src/components/frame/frameOverlays.svelte.ts`
  - When `mergedStackIsland === false`: preserve current XOR behavior with two overlay ids (`queue`, `active-filters`).
  - When `mergedStackIsland === true`:
    - Use a single overlay id `stack-island` (new).
    - Maintain internal `stackView` enum (`'filters' | 'queue'`).
    - `toggleQueueIsland()` either opens `stack-island` with `stackView='queue'` or, if already open with `stackView='queue'`, closes it. If already open with `stackView='filters'`, switches the view (no close/reopen).
    - `toggleFiltersIsland()` mirrors with `stackView='filters'`.
    - `openQueueIsland()` / `openFiltersIsland()` always force the view and ensure the overlay is open.
- Create: `src/components/popup/stackIsland.svelte`
  - Single shell rendering both bodies inside a Svelte `<svelte:component>` or conditional block with a cross-fade transition.
  - Header has:
    - Left arrow (`◀`) — set `stackView` to the other mode.
    - Centered title (`Filters` or `Operation queue`).
    - Right arrow (`▶`) — mirror.
    - The existing squircles (group, template, clear, apply, etc.) — these are mode-specific; render the squircles for the active view.
    - Close button (`×`).
  - Body cross-fades or slides over 180ms (`cubic-bezier(0.34, 1.56, 0.64, 1)` matches the existing island enter curve).
- Modify: `src/components/containers/explorerActiveFilters.svelte` and `src/components/containers/explorerQueue.svelte` — extract their bodies so the merged shell can render them without duplicating logic.
  Refactor:
  - Pull each island's body into a body component (`explorerActiveFiltersBody.svelte`, `explorerQueueBody.svelte`).
  - Pull the squircle rows into their own component or accept a slot.
  - The legacy stand-alone islands compose the body + squircles; the merged shell composes both bodies with the arrow header.
- Modify: `src/settingsVM.ts`
  - Surface a single toggle `Merge stack island` under the existing layout settings section. Subtext explains the arrow-nav swap.
- Modify: `src/styles/popup/_islands.scss`
  - Add `.vm-stack-island-merged` rule set:
    - Same shape and z-index as `%vm-island-body`.
    - Header replaces the per-island header markup; arrows use the existing `.vm-squircle` styling, sized `28px` to fit a header row.
    - Body wrapper has `position: relative; overflow: hidden;` for the cross-fade.
  - Body transition keyframes / Svelte transition wiring: a 180ms opacity fade combined with a 12px horizontal slide. Direction follows the arrow pressed (left arrow → body slides right, right arrow → body slides left).

## State Machine

Merged mode state (when `mergedStackIsland === true`):

```
       openFilters()        ▶ arrow
closed ──────────────────▶ filters ────────▶ queue
   ▲       openQueue()        ◀ arrow         │
   │   ◀──────────────────────────────────────┘
   └── close()
```

XOR mode (default) keeps the existing two-state pair (`queue` open / `active-filters` open, never both).

## Persistence

`mergedStackIsland` persists like every other key in `typeSettings.ts`.
The `stackView` internal enum **is not** persisted — it always opens to the view requested by the caller (so `openQueueIsland()` always lands on `queue`, even on first launch in merged mode).

## Test Plan

Create:

- `test/component/mergedStackIslandToggle.test.ts`
  - Default OFF: queue opens its own shell, filters opens its own shell, XOR preserved.
  - ON: opening queue then filters keeps the same shell open and only swaps `stackView`.
  - Close button closes the merged shell entirely.
- `test/component/mergedStackIslandArrowNav.test.ts`
  - Left/right arrows toggle `stackView`.
  - Transition completes within 250ms (verify final state).
  - Squircles update per active view.
- `test/unit/services/frameOverlaysMergedMode.test.ts`
  - `toggleQueueIsland()` while `stackView==='filters'` swaps view, does not close.
  - `toggleQueueIsland()` while `stackView==='queue'` closes.

Existing tests to keep green:

- All filters-island and queue-island tests must pass with `mergedStackIsland === false`.

## Risks

- Extracting the body components risks regressing the existing islands.
  Mitigation: refactor as a pure rename (move the existing body markup into the new file, import from the legacy shell wrapper).
- The transition curve may feel jarring next to the existing `vm-popup-island-enter` curve. Mitigation: reuse the same easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

## Open Questions

- Should the arrow keys (`←`/`→`) on the keyboard also swap views when the merged shell has focus? Default yes (accessibility), but verify it does not collide with input focus inside row editors.
- Should the transition use Svelte's built-in `crossfade` transition or a hand-rolled CSS class? Default to CSS class for predictable timing.
