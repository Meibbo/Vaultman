---
title: U121-003 plan 02 - search menu and mobile
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 02 — SearchControl, MenuSession and mobile toolbar

## Task 2.1 — Extract one atomic SearchControl

**Files:**

- Create: `src/components/layout/searchControl.svelte`
- Create: `test/unit/searchControlSource.test.ts`
- Modify: `src/components/layout/navbarFilters.svelte`

- [ ] Load `svelte-code-writer` and `svelte-core-bestpractices`; look up the
  Svelte 5 event/prop syntax used by neighbouring components before editing.
- [ ] Add source/component tests requiring one root `.search-input-container`,
  one text input, and configured `clear`, `category` and `create` ActionCells as
  descendants of that root in both inline and wrapped modes.
- [ ] Add tests forbidding a second magnifier element/pseudo-element, automatic
  close on blur/resize/provider refresh, and provider code inside SearchControl.
- [ ] Run the focused test and confirm RED because SearchControl is still an
  inline snippet in `navbarFilters.svelte`.
- [ ] Extract `searchControl.svelte` with a narrow prop contract:

```ts
type SearchControlProps = {
  value: string;
  placeholder: string;
  ownRow: boolean;
  trailingActions: readonly PanelWidgetNode[];
  onValueChange(value: string): void;
  onAction(action: PanelWidgetNode): void;
};
```

- [ ] Keep the input and every configured trailing ActionCell inside the same
  root for its full lifetime. `ownRow` changes only a class/data attribute.
- [ ] Preserve Core classes `.search-input-container`, `.search-input-clear-button`
  and the native input class. Suppress only the container's decorative magnifier
  because the adjacent Search ActionNode already supplies it.
- [ ] Search stays open until the Search ActionNode is invoked again. Clear,
  category and create act without closing it.
- [ ] Run the Svelte autofixer on both changed components, correct all findings,
  then confirm the focused test GREEN.

## Task 2.2 — Restore native focus and second-row overflow behavior

**Files:**

- Modify: `test/unit/panelWidgetOverflow.test.ts`
- Modify: `test/unit/toolbarOverflowStrategy.test.ts`
- Modify: `test/unit/panelWidgetRegressions.test.ts`
- Modify: `src/logic/logicPanelWidgetOverflow.ts`
- Modify: `src/components/layout/navbarFilters.svelte`
- Modify: `src/components/layout/searchControl.svelte`
- Modify: `styles.css`

- [ ] Add geometry-model tests proving that SearchControl moves to a full-width
  row before toolbar ActionNodes condense, while ToolCase remains in row one.
- [ ] Add a boundary-oscillation test proving repeated equal measurements return
  an equal layout signature and cannot cause a ResizeObserver feedback loop.
- [ ] Add source guards for Core classes and the exact focused token
  `var(--icon-color-focused)` plus `var(--background-modifier-hover)`; forbid the
  Vaultman `active` accent on the Search ActionNode.
- [ ] Run focused tests and confirm RED on current wrap/condense and active-color
  behavior.
- [ ] Make `searchNeedsOwnRow` the first layout decision. Only the remaining row-one
  width enters the condensed packer; SearchControl is never an overflow candidate.
- [ ] Set wrapped SearchControl to a single full-width flex/grid item; its internal
  trailing actions must not become independent layout children.
- [ ] Apply `.is-active` to the Search ActionNode only while SearchControl is open,
  and let Core's focused icon/background variables style it. Do not give the
  button rounded search-box geometry.
- [ ] Reuse Core toolbar/search selectors and variables from Web Lab evidence;
  do not copy a visually similar custom gradient or focus animation.
- [ ] Coalesce ResizeObserver work to one frame and write only when the computed
  layout signature changes.
- [ ] Run Stylelint, the Svelte autofixer and focused tests; confirm GREEN.

## Task 2.3 — Enforce one MenuSession per Scene panelWidget

**Files:**

- Create: `src/logic/logicMenuSession.ts`
- Create: `test/unit/menuSession.test.ts`
- Modify: `src/components/layout/navbarFilters.svelte`
- Modify: `src/VaultmanFrame.svelte`

- [ ] Add tests for: same ActionNode toggles its menu closed; a different action
  replaces it; provider generation change closes it; Scene destroy closes it;
  repeated calls never leave more than one menu.
- [ ] Run the suite and confirm RED because `MenuSession` does not exist.
- [ ] Implement a DOM-independent owner around the native `Menu` handle:

```ts
export interface NativeMenuHandle {
  hide(): void;
  onHide(callback: () => void): void;
}
export interface MenuSessionOwner { key: string; generation: number }
export class MenuSession {
  toggle(owner: MenuSessionOwner, open: () => NativeMenuHandle): void;
  replace(owner: MenuSessionOwner, open: () => NativeMenuHandle): void;
  closeGeneration(generation: number): void;
  close(): void;
}
```

- [ ] Store owner key plus Scene generation internally. Native menu creation stays
  in the renderer; the session owns only lifecycle and at-most-one semantics.
- [ ] Register `onHide` for every opened native Menu so outside-click/Escape clears
  the session only when that exact handle still owns it.
- [ ] Route every toolbar/provider/ToolCase menu opening in `navbarFilters.svelte`
  through this session and preserve Obsidian `setParentElement(buttonEl)` hooks.
- [ ] Close the session on accepted provider transition and Scene teardown.
- [ ] Re-run the focused suite and `panelWidgetRegressions.test.ts`; confirm GREEN.

## Task 2.4 — Make mobile toolbar visibility and theme hooks safe

**Files:**

- Modify: `test/unit/settingsIaSource.test.ts`
- Modify: `test/unit/settingsDefaults.test.ts`
- Modify: `src/VaultmanSettings.ts`
- Modify: `src/VaultmanFrame.svelte`
- Modify: `src/components/layout/navbarFilters.svelte`
- Modify: `styles.css`

- [ ] Add tests proving effective visibility is always `true` on mobile while the
  persisted desktop `showToolbar` value remains unchanged.
- [ ] Add a source test proving the hide-toolbar Setting is omitted when
  `Platform.isMobile` and remains available on desktop.
- [ ] Add CSS/source guards requiring native `.nav-header`,
  `.nav-buttons-container` and `.nav-action-button` hooks and forbidding a custom
  solid mobile toolbar background.
- [ ] Run focused tests and confirm RED.
- [ ] Resolve runtime visibility as `Platform.isMobile ? true : settings.showToolbar`.
- [ ] Omit the setting row on mobile; do not rewrite the saved value.
- [ ] Remove Vaultman CSS that overrides Core's toolbar gradient/vertical
  positioning. Keep only structural declarations Core does not supply.
- [ ] Validate Default, Baseline and Velocity by class anatomy first; visual smoke
  remains mandatory in shard 06.
- [ ] Run the Svelte autofixer, `pnpm run stylelint`, focused tests and
  `pnpm run check`.

## Task 2.5 — Commit the search/menu/mobile slice

- [ ] Inspect the diff for duplicated search children or provider-specific menu
  branches.
- [ ] Stage only the files in tasks 2.1–2.4.
- [ ] Commit code-only as `fix: restore native search and menu lifecycle`.
- [ ] Record the hash without staging `.agents/`.

## Execution record — 2026-08-02 evening, claude-opus-5

The developer reported that the searchbox's three trailing cells had been
rendering on their own line, outside the box, for more than twelve hours — in
both the inline and the wrapped mode, and on mobile. This shard owns that
defect: task 2.1 ("keep the input and every configured trailing ActionCell
inside the same root") and task 2.2 ("its internal trailing actions must not
become independent layout children").

Fixed in `f29fab4c`.

### Bookkeeping discrepancy found first

The handoff state table records shard 02 as **done**. Every checkbox in this
file is still `- [ ]`. The component landed in `3722b7d0`
(`fix: restore native search and menu lifecycle`), so part of the shard did run,
but the shard was never reconciled with its own checklist.

### Cause

Read from `obsidian-web-lab/obsidian/app.css`, not from memory:

```css
.search-input-container { position: relative; }          /* app.css:5107-ish */
.search-input-clear-button { position: absolute; ... }
.input-right-decorator { position: absolute; top: 50%; ... }
.search-input-container input:not(:placeholder-shown) ~ .input-right-decorator {
  inset-inline-end: calc(var(--input-icon-inset) + 28px);
}
```

Core's container is **relative, not flex**. Its trailing controls are positioned
absolutely over the input, and Core already shifts the decorator aside when the
clear button appears.

Vaultman put `.vaultman-filters-search-mode` and `.vaultman-filters-search-create`
in that container as **plain children**. `styles.css` gave each of them
`display: flex` (making each button an internal flex box) but never gave the
container `display: flex` — verified: no rule anywhere sets it, in any variant,
which is why the defect appears identically on desktop and phone. A plain child
of a non-flex block is a block box, so both dropped under the full-width input.
The absolutely centred clear button then centred over a two-line box, which is
why the developer counted three cells out of place rather than two.

### Fix, Core-first

The two cells share one `.input-right-decorator` — the slot Core already ships
for this exact need. Core positions and vertically centres it and already moves
it aside for the clear button, so the controls compose with the clear button
instead of competing for the same corner.

The only declarations added are the flex row **inside** the decorator, which
Core has no class for, and the input padding that reserves its width.

Making the container a flex row was the alternative and was rejected: it would
fight Core's absolute clear button rather than compose with it, which is the
failure mode the "never hand-roll what Core ships" rule exists to prevent.

Also corrected: the phone sizing rule named a Vaultman clear-button class the
component never rendered, so it matched nothing on phones. It now targets Core's
`.search-input-clear-button` and covers the trailing actions too.

### Why no gate caught it

`searchControlSource.test.ts` is this shard's guard and did not test the shard's
requirement. Task 2.1 asked for the cells to be **descendants of that root**; the
suite asserted only that the container class appeared once, that there was one
`<input>`, that there was no second magnifier, that nothing closed on blur, and
that `navbarFilters` imported the component. All true while the defect shipped.

Re-pointed. It now asserts containment, the decorator slot, and that the
container is not turned into a hand-rolled flex row.

**Two of the new guards first passed vacuously**: `styles.css?raw` resolves to an
empty string under the CSS pipeline, so every `stylesSource` assertion was
comparing against `''`. `propertyValueWidgetsSource.test.ts:11` already
documented this. The stylesheet is now read from disk the way the other
stylesheet guards do, and the guard immediately caught a real leftover.

### Still true after the fix

`trailingActions` had **no producer at all** until `e20b1631` earlier today:
`git log -S "trailingActions=" -- src/components/layout/navbarFilters.svelte`
returns only that commit. The prop existed in the contract from `3722b7d0` and
defaulted to `[]` for the whole life of the component.

### Gates

Suite **1538/1538** in 204 files. Stylelint clean, `format:check` clean, check
0/0. **Geometry is not proven by any of these** — the live smoke in shard 06 is
what confirms it.
