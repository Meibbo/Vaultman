---
title: U121-003 plan 05 - properties settings and touch
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 05 — Properties, placement settings and touch routing

## Task 5.1 — Correct PropScene topology and conflict semantics

**Files:**

- Modify: `test/unit/propsLogic.test.ts`
- Modify: `test/unit/propertyFlatProjection.test.ts`
- Create: `test/unit/propertyConflictReason.test.ts`
- Modify: `src/logic/logicProps.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/types/typeSettings.ts`
- Modify: `src/VaultmanSettings.ts`
- Modify: `test/unit/settingsDefaults.test.ts`
- Modify: `styles.css`

- [ ] Add nested-on tests proving properties with empty values remain projected.
- [ ] Add nested-off tests proving every row retains property identity plus value,
  rendered as `parent: value`, and no property is hidden merely because it has no
  child node.
- [ ] Add a By-type menu test requiring `All types` as the first/default option.
- [ ] Add conflict tests returning stable `reasonCode` plus user-facing
  `reasonText` for every incompatible-type branch in `COMPATIBLE_TYPES`.
- [ ] Add setting tests for `showConflictWarnings: true` by default. When false,
  visual warning badges/tooltips are hidden but validation and blocked-operation
  semantics remain active.
- [ ] Add CSS guards forbidding yellow warning border decoration on rows/cards.
- [ ] Run focused suites and confirm RED.
- [ ] Extract a pure `propertyValueConflict` result:

```ts
export type PropertyConflict = {
  reasonCode: PropertyConflictReasonCode;
  reasonText: string;
} | null;
```

- [ ] Extend `PropMeta`/semantic conflict badge data with the reason. Tooltip text
  must state what values/types conflict; renderers must not recompute it.
- [ ] Keep empty values in nested projection and build flat labels without
  discarding the property key or changing `cell_format` eligibility.
- [ ] Make `All types` the explicit initial filter; existing saved valid filters
  remain intact.
- [ ] Add `showConflictWarnings` to settings UI and persistence. Apply it only to
  visual projection, not conflict detection or OperationNode guards.
- [ ] Remove warning border selectors from Tree/Table/Cards while retaining the
  semantic badge when enabled.
- [ ] Run focused suites, Stylelint and `pnpm run check`; confirm GREEN.

## Task 5.2 — Route working Core-compatible widgets through an Operation port

> **Amended 2026-08-02.** [[07-cell-format-core-parity|Plan shard 07]] runs before
> this shard and replaces the branch chain in `renderPropertyValue` with a
> declarative render map covering all eight Core widget types. This task wires
> the interaction port into that map instead of into `if` branches, and removes
> the read-only guards from the three interactive entries. Do not reintroduce the
> branch chain, and do not make the five types added by shard 07 interactive
> here — they stay read-only until their own specification asks otherwise.

**Files:**

- Create: `src/types/typePropertyValueInteraction.ts`
- Modify: `src/utils/renderPropertyValue.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `test/unit/propertyValueWidgetsSource.test.ts`
- Create: `test/unit/propertyValueInteraction.test.ts`
- Modify: `styles.css`

- [ ] Add DOM tests proving Format off renders plain text with no leading spacer;
  Format on renders literal Core-compatible checkbox, date and datetime controls.
- [ ] Add interaction tests: checkbox `true -> false` and `false -> true`; date
  commit `2025-05-25 -> 2026-08-01`; datetime commit preserves local datetime
  format; a cancelled/unchanged edit queues zero operations.
- [ ] Add a test proving each accepted gesture calls the port exactly once and the
  renderer contains no direct metadata/vault write.
- [ ] Add a source test requiring the existing Core classes and the Daily Note
  shortcut for date, while forbidding `readOnly`, `tabIndex = -1` and blanket
  `preventDefault` on the three interactive widgets.
- [ ] Run focused tests and confirm RED on current read-only controls.
- [ ] Define the narrow port:

```ts
export interface PropertyValueInteractionPort {
  renameValue(command: {
    property: string;
    oldValue: string;
    newValue: string;
    valueType: 'checkbox' | 'date' | 'datetime';
  }): Promise<void>;
}
```

- [ ] Pass property name, raw value, resolved `PropertyInfo.widget` type, `App`
  and the port into `renderPropertyValue`; do not infer type from CSS or display
  text.
- [ ] Reuse Core DOM classes/anatomy for the controls. Use native `change`/commit
  events, stop row activation only for the control gesture, and call
  `renameValue` with normalized old/new values.
- [ ] Implement the Props adapter by routing the command to the existing
  `_replaceValueInVault`/Rename OperationNode path. Do not mutate metadata from
  the utility renderer.
- [ ] On promise rejection, restore the projected value through the normal
  operation refresh path and surface the existing error route; do not patch DOM
  state independently.
- [ ] Reduce only Vaultman-added leading padding so the control aligns with Core;
  do not recreate Core picker styling.
- [ ] Rename the View menu entry to exactly `Format` / `Formato` as appropriate.
- [ ] Run focused suites, Stylelint and `pnpm run check`; confirm GREEN.

## Task 5.3 — Migrate Open Vaultman to explicit left/right placement

**Files:**

- Modify: `src/types/typeSettings.ts`
- Modify: `src/logic/logicFrameActivation.ts`
- Modify: `src/main.ts`
- Modify: `src/VaultmanSettings.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Create: `test/unit/frameActivation.test.ts`
- Modify: `test/unit/settingsDefaults.test.ts`

- [ ] Add migration tests: legacy persisted `sidebar` becomes `left_sidebar`;
  `left_sidebar` and `right_sidebar` remain stable; malformed values fall back to
  the current safe default.
- [ ] Add routing tests proving left opens a left leaf and right opens a right leaf;
  neither may opportunistically reuse the opposite sidebar.
- [ ] Run focused tests and confirm RED.
- [ ] Replace the setting union member `sidebar` with `left_sidebar` and
  `right_sidebar`, retaining `sidebar` only as a deserialization input.
- [ ] Make `normalizeFrameActivation` perform the one-way legacy migration.
- [ ] Change the command path in `main.ts` to request the explicit workspace leaf
  for the chosen side.
- [ ] Label settings `Left sidebar` / `Right sidebar` and their Spanish equivalents.
- [ ] Re-run focused tests and confirm GREEN.

## Task 5.4 — Add touch left-to-right swipe to the existing tooltip route

**Files:**

- Create: `src/logic/logicNodeSwipe.ts`
- Create: `src/utils/nodeTooltipSwipe.ts`
- Create: `test/unit/nodeTooltipSwipe.test.ts`
- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/components/layout/viewNodeTable.ts`
- Modify: `src/components/layout/viewGrid.ts`
- Modify: `src/components/layout/viewFilesGrid.ts`
- Modify: `src/components/pages/tabContent.svelte`

- [ ] Add pure recognizer tests for one touch/pen pointer, positive horizontal
  displacement, maximum vertical drift, cancellation, pointer capture loss and
  single-fire behavior.
- [ ] Add exclusion tests for starts on checkbox, date/datetime input, link,
  button, caret, menu target or draggable handle.
- [ ] Include `.multi-select-pill-remove-button` in the exclusion set. Plan shard
  07 shipped it as a real control on property pills, so a swipe starting there
  must reach the control rather than open a tooltip.
- [ ] Add arbitration tests proving vertical scroll, horizontal scroll and drag
  win when the gesture has not crossed the tooltip threshold.
- [ ] Run focused tests and confirm RED.
- [ ] Implement a pure state machine returning `pending`, `recognized` or
  `cancelled`; use constants covered by tests rather than scattered magic values.
- [ ] Implement `bindNodeTooltipSwipe(element, getTooltipText)` as an InputRouter
  adapter that invokes the same `setTooltip`/tooltip projection already used for
  hover. It must not synthesize provider-specific tooltip text.
- [ ] Bind it to node bodies in Tree, Table, Files Table, Cards and Content/Text.
  Dispose listeners when recycled nodes change owner or views are destroyed.
- [ ] Do not block native control input, scrolling, long press or drag before the
  recognizer commits.
- [ ] Run the Svelte autofixer on `tabContent.svelte`, then focused gesture,
  tooltip, Tree and virtualization suites; confirm GREEN.

## Task 5.5 — Commit the properties/settings/touch slice

- [ ] Run `pnpm run lint`, `pnpm run check`, `pnpm run stylelint` and all focused
  tests named in this shard.
- [ ] Verify the renderer imports no metadata-write service and gesture bindings
  contain no provider-specific tooltip builder.
- [ ] Commit code-only as `fix: restore property widgets and mobile interactions`.
- [ ] Record the hash; do not stage `.agents/`.
