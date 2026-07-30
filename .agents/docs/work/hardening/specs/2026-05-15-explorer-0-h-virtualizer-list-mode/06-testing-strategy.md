---
title: Testing strategy
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
  - explorer/testing
---

# Testing Strategy

The strategy is layered. Each layer corresponds to a class of guarantee the change needs to provide: component correctness, consumer regression safety, end-to-end wiring correctness, structural cleanup, and performance non-regression.

## Layer 1 — Unit tests for `ViewNodeList.svelte`

New tests live at `test/unit/components/views/ViewNodeList.test.ts` (or the project's equivalent location). Tests are written test-first against the API contract in shard 03.

### Core rendering and virtualization

- Given `rowInputs: ExplorerRowInput<NodeBase>[]`, renders rows through TanStack `createVirtualizer` with `estimateSize` plus per-row `measureElement` enabled.
- Variable-height rows reflow correctly (use jsdom + sized mocks of `getBoundingClientRect` / `ResizeObserver`).
- TanStack key stability: `getItemKey` uses `rowInputVirtualKey(row)`;
  reordering an item changes index but not key; row instance is reused (no remount).
- Empty `rowInputs` renders the outer container with the correct `role` and no rows.

### Callback behavior

- `onSelect` fires on single click with `SelectModifiers` correctly captured from `MouseEvent` (`ctrl = ctrlKey || metaKey`, `shift = shiftKey`, `alt = altKey`).
- `onActivate` fires on double-click and on Enter when a row is focused.
- `onFocus` fires on Arrow↑/↓, Home, End, PageUp, PageDown. External `focusedId` changes drive `scrollToIndex` when the row is outside the viewport.
- `onContextMenu` fires on `contextmenu` event with `(event, row)`.
- `onAction` fires on action-button click; row identity uses `rowInputCallbackId(row)` for dispatch.
- `onReorder` fires on drag-and-drop:
  - Drop position math: `'before'` when `clientY` ≤ row-rect center, `'after'` otherwise.
  - Gated by `canReorder === true && onReorder !== undefined`.
  - Disabled rows are non-draggable.

### ARIA modes

- When `onSelect` or `onFocus` is wired, container `role="listbox"`, rows `role="option"`, `aria-selected` per selected row, `aria-activedescendant` on container points at focused row's `id`.
- Otherwise, container `role="list"`, rows `role="listitem"`, no selection-related attributes.

### Selection visual

- Row gets `is-selected` class when EITHER `selectedIds.has(row.id)` OR `row.layers.state?.selected === true`. Both paths exercised.

### Group / queue-child preservation

- `is-group` class when `row.node.kind === 'group'`.
- `is-queue-child` and the inline-cancel `'remove'` action special-case preserved bit-for-bit from `viewList.svelte:88-102`. Snapshot the rendered DOM for a queue-child row pre/post migration.

### Edge cases

- DnD state-machine: ESC during drag (cancel), drag-leave-window (dragend without drop), drag-onto-self (no-op), rapid drag/drop sequences. `draggingRowId` resets correctly in every path.
- Range-select via Shift+ArrowDown / Shift+click fires `onSelect` with `shift: true`. The component does not own range semantics — the consumer applies them in `selectionService.applyClick`. Verify the modifier is passed correctly.
- Reduced motion: with `prefers-reduced-motion: reduce`, auto-scroll uses non-smooth behavior.
- RTL spot-check: render under `dir="rtl"`; ARIA roles, focus ring, DnD math, badge layout still work. One smoke test.
- Hot-reload / `$effect` cleanup: mount/unmount cycle leaves no dangling ResizeObservers, drag listeners, or TanStack subscriptions.
- Rapid row mutation: rows added/removed mid-scroll without flicker or stale `focusedId`.
- Width-change reflow: ResizeObserver on container fires; badge wrap and label truncation re-measure correctly.

## Layer 1.5 — Cross-theme and foul-detection smoke

- Render `ViewNodeList` under each `vm-theme-*` body class (`vm-theme-default`, `vm-theme-native`, `vm-theme-polish`, `vm-theme-glass`, `vm-theme-custom`). Visual smoke for layout integrity; no broken borders, no missing colors. No new theme semantics are introduced — this is regression-only.
- `serviceFoulDetection` smoke: when `vm-mode-thin` + `vm-id-native` are active on `.vm-root`, mount a queue or active-filters scenario and trigger `checkDomMimicry` (or its equivalent test entry point).
  Native-DOM emission for list rows is 0-A's job — 0-H's contract is only that the foul check does not regress (i.e., if it already asserts something about the list surface, it still passes).

## Layer 2 — Regression tests for migrated consumers

`explorerQueue.svelte` and `explorerActiveFilters.svelte` are the highest regression-risk surfaces — live users depend on them.

- Pre-step 0 task: audit existing test coverage. If absent, add basic coverage **before** the migration starts.
- Post-migration verification: the same tests pass with the new `ViewNodeList` mount and `rowInputs` props.
- DOM snapshot: capture the rendered HTML of a representative queue state and a representative active-filters state PRE-migration.
  Assert POST-migration matches byte-for-byte (or documents the intended diff — e.g., a wrapper-element class change). This is the strongest guard against silent visual regressions.

## Layer 3 — Integration test for `list` view mode

New scenario at `test/integration/panelExplorer-list-mode.test.ts` (or the project's equivalent). One scenario per affected callback path; coverage is breadth, not exhaustive provider coverage.

- A provider returns `nodes` → `panelExplorer.svelte` enters `list` mode → renders `ViewNodeList`.
- Click on a row → `selectionService.selectedIds` round-trips correctly; row's `is-selected` class appears.
- Keyboard ArrowDown / ArrowUp → focused row updates;
  `selectionService.focusedId` round-trips.
- Enter on focused row → `onActivate(node)` fires.
- Right-click on a row → `onContextMenu(event, node)` fires.
- Action button click → `onAction(action, node)` fires.
- Provider with `canReorder: true` → DnD reorder works; provider with `canReorder: false` → rows are not draggable.
- Empty provider → fallback state shown via the existing `<ViewEmptyLanding>` path at `panelExplorer.svelte:1274`.

## Layer 4 — Verification gates per migration step

Each of the five migration steps in shard 05 gates on:

- `pnpm tsc --noEmit` (or the project's typecheck command) clean.
- Lint clean.
- Full unit suite green.
- After step 5 (deletions): `git grep` of `serviceVirtualizer`, `viewList`, `viewGrid` returns zero matches in `src/` and `test/` (matches in `.agents/docs/` are acceptable historical references).

## Layer 5 — Performance smoke

`perfProbe.ts` is the project's standard performance harness with four scenarios: `tree-scroll`, `operation-badges`, `filter-select`, `filters-search`.

- Capture a **baseline** run pre-migration on a representative vault (1000+ nodes / 100+ queue items / 20+ active filters).
- Capture a **post-migration** run after step 5 on the same vault.
- Compare: no scenario regresses beyond an acceptable margin (default +10% wall-clock, +5% jank frames; tighten if the project defines stricter thresholds).
- `list` view mode has no baseline — establish a first measurement post-migration so future changes have a reference.

### Large-list and queue stress

- Mount `ViewNodeList` with 1k, 10k, and 50k `rowInputs`. Smoke-test scroll smoothness, measured-height stability, and memory across mount/unmount cycles. TanStack should handle this; explicit test protects against a misconfigured `measureElement` or `getItemKey`.
- Bulk-rename 1000 files → the queue's `ViewNodeList` renders 1000 rows → scroll, selection (if wired), and action dispatch remain responsive. This is the realistic high-water mark for the widget side.

## Test fixtures and helpers

- Reuse existing EDP-009 `ExplorerRowInput` fixtures if any (search `test/fixtures/` and `test/helpers/` for `rowInputFrom`, `makeRowInput`, etc.). If none exists, add a small `makeRowInput(overrides: Partial<ExplorerRowInput>)` helper.
- TanStack tests rely on a jsdom-mocked `ResizeObserver` and stable `getBoundingClientRect`. The four migrated capital-letter `View*` components already have working setups (`ViewNodeTable.test.ts` and similar); reuse the same mocks.
- `setIcon` adapter: provide a no-op stub `icon = (el, name) => ({ update: () => {} })` for tests that don't care about icons; provide a recording stub for tests that verify icon dispatch.

## TDD discipline

- New callback surface (`onSelect`, `onFocus`, `onActivate`, `onContextMenu`, ARIA mode switching) → tests-first. Behavior is new and unambiguous.
- Migration steps 2, 3, 5 → existing tests gate the migration. Where coverage is missing, write the regression tests first (pre-step 0).
- Deletion steps → compile + grep + suite-green is the gate. No new tests for "absence of code."
