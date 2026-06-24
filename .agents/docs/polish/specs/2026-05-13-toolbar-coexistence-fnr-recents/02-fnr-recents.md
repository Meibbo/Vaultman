---
title: F&R two-input + recent searches row stepper
type: spec-shard
status: draft
parent: "[[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents]]"
created: 2026-05-13T18:00:00
updated: 2026-05-13T18:00:00
tags:
  - agent/spec
  - search-island
  - fnr
  - recent-searches
  - toolbar
created_by: opus
updated_by: opus
---

# Spec 2 — F&R Two-Input + Recent Searches Row Stepper

## Intent

The v4 prototype's search island shows a numbered "Stacked · N" preview
between the input and the suggestion pills. The user wants that preview
removed from the search island and rendered exclusively inside the filters
island (chips already exist there as filter rows; only the *presentation*
moves). The vacated space inside the search island is reclaimed by a
second input — the **Replace** field — which gives the surface its "Find
& Replace" identity. The "Common in {tab}" suggestion section becomes a
"Recent searches · {tab}" strip with an inline row-count stepper.

## Files

- Modify: `src/components/layout/Toolbar.svelte`
  - Remove the `Stacked · N` block from the search island body.
  - Add a **Replace** input directly below the **Find** input:
    - B2 default: collapsed behind an `F&R` pill (toggle button). Pill
      lives in the section label row next to the find input. Click expands
      a row containing the replace input + an Apply action.
    - B1 mode (when `fnrReplaceAlwaysVisible === true`): replace input is
      always rendered; pill becomes an inline collapse affordance, or is
      removed entirely (TBD during component build).
  - Rename the section label `Common in {tab}` → `Recent searches · {tab}`.
  - Add an inline stepper to the section label row: `[ − ] N rows [ + ]`.
    Default `N = 4`. Range `1..8`. Stepper writes through to setting
    `recentSearchesRows`; reading uses the same setting.
  - Chip wrapping: render recent-search chips inside a flex container with
    `flex-wrap: wrap`. Use a measured-row helper to truncate the list so
    the strip never exceeds `N` rows. Truncation drops oldest first.
  - Recent searches source: existing `searchHistory` prop, filtered by
    active tab. Per-tab list — when active tab changes, the strip swaps
    history scope.
- Modify: `src/services/serviceFnRIsland.svelte.ts`
  - Verify that the service already exposes a replacement-pattern field
    (read `FnRIslandSnapshot` and the existing `setQuery` / setters).
    If not, add a `replacement` field with a `setReplacement(value)`
    setter and include it in `FnRIslandSnapshot`.
  - The Apply button in the search island dispatches the current
    `(query, replacement, flags, mode)` snapshot through the existing
    `FnRIslandDispatch` path.
- Modify: `src/components/containers/explorerActiveFilters.svelte` —
  this is the file registered through `frameOverlays` as
  `activeFiltersComponent`.
  - Confirm the filter rows already render chips selected during a search
    session. If yes, no body change required (filters island always
    showed them; we are just removing the duplicate preview in the search
    island).
  - If not, plumb the selection callback so a chip selected in the search
    island appears as a filter row in the filters island, regardless of
    filters-island visibility.
- Modify: `src/types/typeSettings.ts`
  - Add `fnrReplaceAlwaysVisible: boolean` (default `false`).
  - Add `recentSearchesRows: number` (default `4`, clamp range
    `1..8`).
- Modify: `src/settingsVM.ts`
  - Surface both toggles + the row-count input under the existing search/
    F&R settings section. Use the standard primitive form controls already
    employed by `settingsVM.ts`.
- Modify: `src/styles/popup/_islands.scss` and/or the search-island
  partial:
  - New CSS rules:
    - `.vm-search-replace-row` — replace input layout when expanded.
    - `.vm-search-recent` — chip strip with `flex-wrap: wrap` and
      `max-height: calc(var(--recent-row-height) * var(--recent-row-cap))`.
    - `.vm-recent-stepper` — `−` / number / `+` stepper, monospace digit.
  - Remove `.vm-search-stack` rules from the search island scope (they
    relocated to the filters island, where they already exist as filter
    rows).

## Apply / Rename / Replace Semantics

The Apply button label adapts to active tab + mode:

| Active tab | Default action  | Button label | FnR mode      |
| ---------- | --------------- | ------------ | ------------- |
| Props      | Rename property | `Rename`     | `'rename'`    |
| Tags       | Rename tag      | `Rename`     | `'rename'`    |
| Files      | Rename file     | `Rename`     | `'rename'`    |
| Content    | Replace text    | `Replace`    | `'replace'`   |

When the Replace field is empty (B2 collapsed or B1 with blank value), the
Apply button reverts to `Apply` and acts as a pure filter commit — no
rename/replace dispatched, no destructive operation.

## Recent Searches Behavior

- Source: existing `searchHistory` prop (already plumbed in
  `Toolbar.svelte`). Filtered by active tab (per-tab list — the
  `onSearchHistoryCommit` callback must store the active tab alongside the
  search string; if it currently stores only strings, extend the
  serialization in `searchHistory` and `onSearchHistoryCommit`).
- Display: chips with the syntax `"<query>"` and an `×` to remove from
  history. Clicking the chip body fills the find input.
- Row cap: `recentSearchesRows` (default 4). Use a measured-row helper —
  the chip strip wraps naturally; rows past the cap are truncated (oldest
  dropped). When the user lowers the cap below the current count, the UI
  truncates immediately.
- Stepper: `−` disables at 1; `+` disables at 8. Persists through
  `recentSearchesRows`.

## Test Plan

Create:

- `test/component/searchIslandFnRTwoInput.test.ts`
  - B2 default: pill renders, replace input hidden, clicking expands the
    row.
  - B1 setting: replace input always visible.
  - Apply button label adapts to active tab.
  - Empty replace + apply = filter commit, no destructive dispatch.
- `test/component/recentSearchesRowStepper.test.ts`
  - Default 4 rows.
  - Stepper `−` / `+` clamped 1..8.
  - Chip strip truncates oldest when cap shrinks.
  - Per-tab history isolation (props ≠ tags chips).
- `test/unit/services/serviceFnRIslandReplacement.test.ts`
  - `setReplacement` updates snapshot.
  - `submit()` dispatches a payload containing both query and
    replacement.

Existing tests to update:

- `test/component/searchboxIsland.test.ts` (removal of stacked block).
- `test/component/searchboxIslandFlags.test.ts` (no flag-state changes).

## Risks

- If `searchHistory` is currently a flat `string[]`, extending to
  per-tab `{ term, tab }[]` is a small migration. Existing consumers
  (`historyItems = searchHistory.slice(0, 3)` at `Toolbar.svelte:179`)
  need to be updated.
- Removing the stacked block from the search island must not orphan the
  chips. Verify the filters island already renders them — if any chip is
  only visible inside the old search-island preview, plumb a callback.

## Open Questions

- Should `recentSearchesRows` apply globally, or per-tab? Default global
  (one setting drives all four tab strips). Theme builder may split it
  later.
- Replace input syntax: should it inherit `regex/wholeWord/matchCase`
  flags from the find input, or have its own? Inherit (single shared
  flag set) — matches the existing `FnRIslandFlags` shape.
