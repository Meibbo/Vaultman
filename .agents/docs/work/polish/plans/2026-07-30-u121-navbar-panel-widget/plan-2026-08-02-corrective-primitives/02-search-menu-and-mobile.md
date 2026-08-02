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
