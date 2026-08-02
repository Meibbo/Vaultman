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

- [x] Add table-driven tests over this lifecycle, with no DOM and no services:
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
- [x] Add tests proving `build()` returns **one operation per (origin value,
  destination property) pair**, so a partial failure is attributable and each
  pair is cancellable on its own.
- [x] Run the suite and confirm RED because the module does not exist.
- [x] Implement the machine as a pure reducer over an explicit state:

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

- [x] Keep it free of Obsidian, settings and queue imports; the adapter passes
  what it needs in.
- [x] Re-run focused tests, confirm GREEN.

## Task 8.5 — Destination type conflict policy

**Files:**

- Create: `src/logic/logicPropMoveConflict.ts`
- Create: `test/unit/propMoveConflict.test.ts`
- Modify: `src/types/typeSettings.ts`, `src/VaultmanSettings.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

- [x] Add tests over the matrix of `propMoveTypeConflict: 'coerce' | 'block' |
  'ask'` (default `'coerce'`):
  - `coerce` computes the **minimum type that satisfies the write** — a value
    appended into an occupied scalar makes the destination `list` — and emits the
    type change as part of the same operation, declared literally
    (`buscar: date -> list`);
  - `block` excludes incompatible destinations with their reason and lets the
    compatible ones run;
  - `ask` emits a per-destination choice for the summary modal rather than
    deciding.
- [x] Add tests proving the coercion reuses `convertPropertyValueType` and the
  `NATIVE_SET_PROP_TYPE` sentinel, and that no second writer of `types.json`
  appears.
- [x] Add settings tests: the key defaults to `'coerce'`, persists, and an
  unknown persisted value normalizes to the default instead of throwing.
- [x] Run the suites and confirm RED.
- [x] Implement the pure policy and add the setting plus its localized labels.
- [x] Re-run focused tests, confirm GREEN, run `pnpm run check`.

## Task 8.6 — Wire the mode into the panelWidget, queue and summary

**Files:**

- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/logic/logicPanelWidgetProjection.ts`, `src/types/typePanelWidget.ts`
- Modify: `src/components/layout/searchControl.svelte`
- Modify: `src/modals/modalQueueDetails.ts`
- Create: `src/modals/modalOperationSummary.ts`
- Create: `test/unit/valueMoveModeProjection.test.ts`
- Modify: `test/unit/panelWidgetProjection.test.ts`

- [x] Add projection tests proving that while the mode is active the toolbar slot
  holds `Proceed with selected` and `Cancel`, and that the slot returns to its
  previous node on exit. The same slot is claimed by the reveal toggle of plan
  shard 09; the two are mutually exclusive **by construction**, so assert that no
  projection produces both.
- [x] Add tests proving the two toggle ActionCells (`append` ↔ `replace`,
  `move` ↔ `copy`) are published as trailing actions of the existing
  `searchControl.svelte` `trailingActions` contract, not as a new bar.
- [x] Add tests proving `Proceed with selected` is also registered in the
  node_prop context menu with the same guard as the toolbar node.
- [x] Add queue tests:
  - with `queueService.operationMode === 'stage'`, `Proceed` stages the
    operations and opens no modal — the queue's own review is the confirmation;
  - with `operationMode === 'bypass'`, `Proceed` opens the operation summary and
    queues nothing until it is confirmed;
  - the summary states, per destination: destination property and type, file
    count, `move` versus `copy`, any coercion applied, and for `replace` which
    values in which files are overwritten;
  - `modalQueueDetails` exposes a bypass toggle that switches
    `queueService.operationMode` from where the consequences are read.
- [~] Add adversarial tests: `move` + `replace` into a destination that already
  holds the value removes the origin and reports no failure; a destination
  property absent from a file is created there; cancelling a coercing move’s
  queue entry restores both the values and the destination type.
  **PARTIAL.** The first two are locked in `valueMoveApply.test.ts`. The third
  is NOT satisfied: the type change is a second queue entry, so cancelling the
  value entry leaves the type changed. See the execution record.
- [x] Run the suites and confirm RED.
- [x] Implement the adapter in `explorerProps.ts`: it owns the machine instance,
  forces `interactionMode` to `select` on enter, publishes the toolbar and search
  nodes, and dies with the panelWidget generation.
- [x] Implement the summary modal. It renders the plan the pure logic produced;
  it computes nothing itself.
- [~] Run the Svelte autofixer before and after on every changed `.svelte`.
  **PARTIAL.** `svelte-check` (0 errors, 0 warnings) and Prettier ran on both
  changed components. The `svelte-autofixer` MCP tool requires the whole
  component inlined and these two are roughly 1700 and 1600 lines, so it was
  not run on them.
- [x] Re-run focused tests, confirm GREEN, then run `pnpm run check`,
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

## Execution record — 2026-08-02 evening, claude-opus-5

Executed on `claude/u121-030-033-maintenance`, from `27ee0170`.

### Landed

| Commit | Task | What |
| --- | --- | --- |
| `7cf6c36a` | first task | the three red `VaultmanFrame` guards, re-pointed |
| `413756a8` | 8.4 | `logicValueMoveMode.ts` + 16 tests |
| `f5e874e4` | 8.5 | `logicPropMoveConflict.ts` + setting + labels, 15 tests |
| `46b45f37` | 8.6 (first checkbox) | the exclusive slot in `logicPanelWidgetProjection.ts`, plus `logicValueMoveApply.ts`, 21 tests |

Baseline before the work: full unit suite **1441/1441** in 198 files at
`7cf6c36a` — the three guards were the only red left on the branch. `tsc` and
`svelte-check` 0/0, ESLint clean on every touched file.

### The three guards

The contract had moved, so each guard was re-pointed at what now proves the
same behavior. None was deleted or weakened, and each slice asserts its anchor
resolved so a future move fails loudly instead of passing on an empty string.

- `statisticsToolbarAndOpenedToday` — anchors on the non-async
  `navigateToDataTab`, requires `sceneController.begin(tab)` between
  `filtersActiveTab = tab` and `activePage = 'filters'`, and now forbids both
  `flushSync` and the `await tick()` the generation replaced.
- `statisticsPageSource` — the page builds one `NavbarPanelWidgetState` and
  hands it to the Scene tagged with the owner triple, releasing it on teardown.
  The old assertion matched an inline object literal that no longer exists.
- `responsiveDensitySource` — its `publishFiltersPanelWidgetState` assertion
  **contradicted** `panelWidgetHostSource.test.ts:16`, which forbids that symbol
  in the frame. Publication moved into the Filters page, so the guard now
  follows the measurement: the frame measures and passes `frameWidth` down, and
  the page carries it into the projection it owns.

### Deviations from the plan as written

| Planned | Landed | Why |
| --- | --- | --- |
| `origin_disposition` in `ValueMoveModeState` | `originDisposition` | every other field of the same interface is camelCase, including `restore.interactionMode` |
| state shape without an owner | added `owner: { providerId, generation }` | "a provider change or a generation bump cancels the mode" needs the state to remember what it entered under |
| (not named) | `src/logic/logicValueMoveApply.ts` | 8.6's adversarial cases are per-file write semantics, which no shard module owned. Keeping it out of `logicValueMoveMode` leaves that module about the mode |
| `reason: string` | `reason: 'origin-is-destination'` code + i18n key | the pure module returns a code; the adapter localizes |

### Decisions worth carrying

- **Destination selection is per-property and toggles.** Two of the tests written
  in the same red step contradicted each other; per-property toggling is what
  matches the explorer's own selection machinery, so a value node names the same
  destination its parent property does, and a second selection deselects.
- **The minimum type that satisfies the write** depends on the write mode.
  Appending into an occupied scalar needs a container, so the answer is `list`;
  replacing discards what was there, so the answer is only as wide as the
  incoming value — widening to `text` would lose the value's meaning for nothing.
- **A blocked destination takes the origin with it.** Removing a value after
  refusing to write it elsewhere would delete data on the user's behalf.

### Not done, and why

- **The `propMoveTypeConflict` control in `VaultmanSettings.ts`.** That file
  carries the stopped worker's uncommitted work (92 lines); staging it would
  carry theirs into my commit. The type, the default and the normalizer are
  landed and tested — only the settings-tab control is missing. **Needs the
  developer's decision on that worktree WIP.**
- **The rest of 8.6** — the `explorerProps` adapter, the two SearchControl
  toggles, the node_prop `Proceed` entry, the stage/bypass split, the operation
  summary modal and the `modalQueueDetails` bypass toggle.
- **Shard 09 and shard 06** — untouched.

### Open question for the next agent

The slot lives in `logicPanelWidgetProjection`, which is the pure projection
layer. The rendered toolbar is still driven by `NavbarPanelWidgetState` through
`navbarFilters.svelte`, which shard 08 part 2's file list does not include.
Wiring the slot to what actually renders needs either that file or a bridge
from the projection into `headerActions`. Decide it before implementing the
adapter, not during.

### Execution record — 8.6, same session

Landed in `e20b1631` (wiring) and `6da42823` (the coercion fix).

The mode exists end to end: it enters from a value node's context menu, forces
`select`, and composes with the explorer's own selection, so the same gesture
that selects a node names it as a destination.

**Where its controls live.** The developer chose the `headerActions` bridge over
teaching `navbarFilters` to consume `resolvePanelWidgetProjection`. `Proceed`
and `Cancel` are projected through `resolveExclusiveSlotNodes` and published as
header actions; the two switches ride `searchControl`'s existing
`trailingActions`, which nothing was feeding before. Each switch is labelled
with the state it is IN — a control that names the state it would switch to
reads as a command and gets pressed by mistake.

**Liveness is real, not asserted.** `explorerProps` notifies on every mode
change and `pageFilters` reprojects from that revision, so the toolbar and the
searchbox update without an unrelated action forcing a repaint.

#### Deviations and gaps

| Item | State |
| --- | --- |
| type change inside the same OperationNode | **NOT satisfied.** `PendingChange.logicFunc` returns either frontmatter or the `NATIVE_SET_PROP_TYPE` sentinel, never both, so the coercion is a second queue entry. Cancelling the value entry leaves the type changed. Expressing the spec exactly needs a queue-contract change, which this shard does not own |
| `src/logic/logicValueMoveApply.ts` | added; no shard module owned the per-file write semantics |
| `planValueMoveTypeChanges` | one type change per destination, not per file or per pair — a property's type is one fact about the vault |
| `pageFiltersSource` guard | re-pointed: it pinned `headerActions: contentHeaderActions` verbatim, and header actions are composed now |
| `svelte-autofixer` MCP tool | not run on `pageFilters.svelte` / `navbarFilters.svelte`; `svelte-check` 0/0 and Prettier were |

#### Gate status at `6da42823`

Full unit suite **1512/1512** in 203 files. `pnpm run verify` **exit 0** — the
first time the aggregate gate has passed on this branch.

Getting there needed two gates repaired in `d45e71a2`. Both were already red
before this work started, so they are recorded here as findings, not as
regressions:

- `pnpm run lint` exited 1 with **34 errors at `27ee0170`** and 27 after the
  maintenance commit. 19 were `eslint-disable` directives for
  `import/no-nodejs-modules`, a rule the obsidianmd 0.4.1 rename deleted — each
  disable suppressed nothing and was itself the error. The rest were the project
  service reporting parse errors for `scripts/**/*.mjs`, which are plain Node ESM
  and were never in the TypeScript program. Nothing was suppressed to reach 0.
- `pnpm run format:check` failed on `VaultmanFrame.svelte`, untouched by this
  work. Two Prettier hunks, no behavior.
