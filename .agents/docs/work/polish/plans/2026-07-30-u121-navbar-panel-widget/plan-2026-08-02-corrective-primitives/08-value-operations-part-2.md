---
title: U121-003 plan 08 part 2 - Move to prop mode
type: implementation-plan-shard
status: approved
parent: "[[index|U121-003 corrective implementation plan]]"
spec: "[[../spec-2026-08-02-corrective-primitives/07-value-operations|Spec shard 07]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# 08 part 2 — `Move to prop...` hidden operation mode

Continues [[08-value-operations|plan shard 08]] and implements section B of
[[../spec-2026-08-02-corrective-primitives/07-value-operations|spec shard 07]].
Task numbering continues from 8.3.

## Why this is a mode and not a modal

The developer specified a hidden operation mode on the PanelExplorer: the
destination property is chosen with the explorer's own selection machinery. A
modal would be a second picker with its own state, its own key handling and its
own idea of what a property is, next to a panel that already selects nodes.

The consequence for implementation is that the mode is **state on the
PanelExplorer**, owned by the panelWidget generation of shard 01, and every
control it shows is a normal panelWidget node.

## Task 8.4 — The pure move-mode state machine

**Files:**

- Create: `src/logic/logicValueMoveMode.ts`
- Create: `test/unit/valueMoveMode.test.ts`

- [ ] Add table-driven tests over this lifecycle, with no DOM and no services:
  - `enter(origin)` with a non-empty origin set produces an active state whose
    `proceedEnabled` is false until at least one destination is selected;
  - `enter` with an empty origin set produces an active state with `proceed`
    **disabled**, not an empty operation;
  - both toggles start at their defaults (`append`, `move`) and each toggle flips
    independently;
  - selecting a node_value as destination registers **its parent property**;
  - selecting several node_props registers several destinations;
  - selecting the origin's own property is rejected with a stated reason and does
    not become a destination;
  - `cancel`, `escape` and re-invoking the originating action all exit without
    producing operations;
  - `exit` restores the `interactionMode` and the search-open preference that
    were captured on `enter`;
  - a provider change or a generation bump cancels the mode.
- [ ] Add tests proving `build()` returns **one operation per (origin value,
  destination property) pair**, so a partial failure is attributable and each
  pair is cancellable on its own.
- [ ] Run the suite and confirm RED because the module does not exist.
- [ ] Implement the machine as a pure reducer over an explicit state:

```ts
export interface ValueMoveModeState {
  origin: readonly OperationTarget[];
  destinations: readonly string[];
  write: 'append' | 'replace';
  origin_disposition: 'move' | 'copy';
  restore: { interactionMode: string; searchOpen: boolean };
  rejection: { destination: string; reason: string } | null;
}
```

- [ ] Keep it free of Obsidian, settings and queue imports; the adapter passes
  what it needs in.
- [ ] Re-run focused tests, confirm GREEN.

## Task 8.5 — Destination type conflict policy

**Files:**

- Create: `src/logic/logicPropMoveConflict.ts`
- Create: `test/unit/propMoveConflict.test.ts`
- Modify: `src/types/typeSettings.ts`, `src/VaultmanSettings.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

- [ ] Add tests over the matrix of `propMoveTypeConflict: 'coerce' | 'block' |
  'ask'` (default `'coerce'`):
  - `coerce` computes the **minimum type that satisfies the write** — a value
    appended into an occupied scalar makes the destination `list` — and emits the
    type change as part of the same operation, declared literally
    (`buscar: date -> list`);
  - `block` excludes incompatible destinations with their reason and lets the
    compatible ones run;
  - `ask` emits a per-destination choice for the summary modal rather than
    deciding.
- [ ] Add tests proving the coercion reuses `convertPropertyValueType` and the
  `NATIVE_SET_PROP_TYPE` sentinel, and that no second writer of `types.json`
  appears.
- [ ] Add settings tests: the key defaults to `'coerce'`, persists, and an
  unknown persisted value normalizes to the default instead of throwing.
- [ ] Run the suites and confirm RED.
- [ ] Implement the pure policy and add the setting plus its localized labels.
- [ ] Re-run focused tests, confirm GREEN, run `pnpm run check`.

## Task 8.6 — Wire the mode into the panelWidget, queue and summary

**Files:**

- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/logic/logicPanelWidgetProjection.ts`, `src/types/typePanelWidget.ts`
- Modify: `src/components/layout/searchControl.svelte`
- Modify: `src/modals/modalQueueDetails.ts`
- Create: `src/modals/modalOperationSummary.ts`
- Create: `test/unit/valueMoveModeProjection.test.ts`
- Modify: `test/unit/panelWidgetProjection.test.ts`

- [ ] Add projection tests proving that while the mode is active the toolbar slot
  holds `Proceed with selected` and `Cancel`, and that the slot returns to its
  previous node on exit. The same slot is claimed by the reveal toggle of plan
  shard 09; the two are mutually exclusive **by construction**, so assert that no
  projection produces both.
- [ ] Add tests proving the two toggle ActionCells (`append` ↔ `replace`,
  `move` ↔ `copy`) are published as trailing actions of the existing
  `searchControl.svelte` `trailingActions` contract, not as a new bar.
- [ ] Add tests proving `Proceed with selected` is also registered in the
  node_prop context menu with the same guard as the toolbar node.
- [ ] Add queue tests:
  - with `queueService.operationMode === 'stage'`, `Proceed` stages the
    operations and opens no modal — the queue's own review is the confirmation;
  - with `operationMode === 'bypass'`, `Proceed` opens the operation summary and
    queues nothing until it is confirmed;
  - the summary states, per destination: destination property and type, file
    count, `move` versus `copy`, any coercion applied, and for `replace` which
    values in which files are overwritten;
  - `modalQueueDetails` exposes a bypass toggle that switches
    `queueService.operationMode` from where the consequences are read.
- [ ] Add adversarial tests: `move` + `replace` into a destination that already
  holds the value removes the origin and reports no failure; a destination
  property absent from a file is created there; cancelling a coercing move's
  queue entry restores both the values and the destination type.
- [ ] Run the suites and confirm RED.
- [ ] Implement the adapter in `explorerProps.ts`: it owns the machine instance,
  forces `interactionMode` to `select` on enter, publishes the toolbar and search
  nodes, and dies with the panelWidget generation.
- [ ] Implement the summary modal. It renders the plan the pure logic produced;
  it computes nothing itself.
- [ ] Run the Svelte autofixer before and after on every changed `.svelte`.
- [ ] Re-run focused tests, confirm GREEN, then run `pnpm run check`,
  `pnpm run lint` and Stylelint.

## Definition of done for part 2

- The mode enters from a value node's context menu, forces `select`, publishes
  its two toggles in the SearchControl and its `Proceed`/`Cancel` in the toolbar
  slot, and exits cleanly on cancel, escape, re-invoke, provider change and Scene
  teardown, restoring interaction mode and search preference.
- One operation per (origin value, destination property) pair reaches the queue.
- Bypass never executes a composed operation without an explicit summary
  confirmation.
- `types.json` is still written by exactly one path.
- No parallel picker, no second selection store, no new mutation channel.

## Sequencing note for plan shard 09

Spec shard 07 §B step 3 says the move mode replaces the `reveal this file`
ActionNode, but that node is introduced by plan shard 09. This shard therefore
implements the **slot** and its precedence rule, and asserts the mutual exclusion
against whatever occupies the slot. Shard 09 adds the reveal toggle into the same
slot and re-points the exclusion test at it. Neither shard is blocked by the
other; the order is 08 then 09 because the slot contract is easier to state from
the side that must yield it.
