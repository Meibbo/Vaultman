---
title: Incremental migration sequence
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H virtualizer + list mode]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/views
---

# Incremental Migration Sequence

The migration is structured as five small, individually reviewable steps.
Each step ends with all type-checks and tests green; no step depends on the next being landed.

## Pre-step 0 — Test gap audit

Before touching production code, grep `test/` for existing tests that exercise `explorerQueue.svelte`, `explorerActiveFilters.svelte`, and any direct test of `viewList.svelte`. The migration assumes a regression-test floor for both widget consumers.

- If basic render + action-dispatch + reorder coverage exists for both consumers, proceed.
- If absent for either consumer, add minimal coverage **first**. The added tests assert the current rendered DOM and callback firing behavior; they pass against today's `viewList.svelte` and serve as the guard for steps 2 and 3.

## Step 1 — Rewrite `viewList.svelte` on TanStack in place

- File: `src/components/views/viewList.svelte`. Keep the filename for this step; the rename happens in step 2.
- Replace the import of `Virtualizer` from `serviceVirtualizer.svelte` with `createVirtualizer` from `@tanstack/svelte-virtual`. Mirror the setup pattern used by `viewTree.svelte:3,244` exactly, including the `$effect` + `untrack` + `setOptions` discipline that the migrated views adopted to avoid TanStack/virtual#866.
- Replace the fixed-height `model.virtualization.rowHeight` math with TanStack `estimateSize: () => 32` plus `measureElement` for per-row height measurement. Use `getItemKey: (i) => rowInputVirtualKey(rows[i])` once `rows` accepts row inputs in step… actually no — in step 1 the props still take `model: ExplorerRenderModel<NodeBase>`, so use the existing `row.id` for the item key. Switching the key generator to `rowInputVirtualKey` happens in step 4.
- Behavior is byte-identical to today: same callbacks, same DOM, same classes. Only the virtualizer underneath has changed.
- Verification: TypeScript compile clean; full unit suite green; the pre-step-0 consumer tests still green. Visual smoke against `explorerQueue` and `explorerActiveFilters` if a manual scenario exists.

## Step 2 — Rename `viewList.svelte` → `ViewNodeList.svelte`

- Move `src/components/views/viewList.svelte` → `src/components/views/ViewNodeList.svelte`.
- Update the two import sites:
  - `src/components/containers/explorerQueue.svelte:4` and the usage at `:142` (`<ViewList … />` → `<ViewNodeList … />`).
  - `src/components/containers/explorerActiveFilters.svelte:4` and the usage at `:243`.
- Update any internal references inside the renamed file (the default Svelte component name follows the filename in IDEs, but explicit usages or test imports must be updated by grep).
- Update test imports / snapshots that name `viewList` or `ViewList`.
  Grep `test/` for both spellings and update.
- Verification: TypeScript clean; full unit suite green; consumer tests green.

## Step 3 — Migrate consumers' row payload to `ExplorerRowInput`

This step changes the consumer side, not the component. `ViewNodeList` keeps its current `model: ExplorerRenderModel<NodeBase>` prop after step 2; the consumers continue to pass `model`. In step 3 the consumers switch from passing `model` to passing `rowInputs` (and other EDP-009-shaped props), while `ViewNodeList`'s old `model` prop is retained temporarily as a backward-compat path.

- Implement a temporary back-compat in `ViewNodeList`: accept either `rowInputs?: readonly ExplorerRowInput<NodeBase>[]` OR `model?: ExplorerRenderModel<NodeBase>`. When only `model` is provided, internally adapt via `model.rows.map(rowInputFromViewRow)` and reconstruct the capabilities (`canReorder = model.capabilities.canDrag && canDrop`).
- Migrate `explorerQueue.svelte` to pass `rowInputs` directly. The queue continues to build `ExplorerRenderModel<NodeBase>` for its own internal use; at the call site, transform via `rowInputs={model.rows.map(rowInputFromViewRow)}` and `canReorder={model.capabilities.canDrag && model.capabilities.canDrop}`.
- Migrate `explorerActiveFilters.svelte` similarly.
- Verification: TypeScript clean; consumer tests green; the back-compat `model` path is exercised by a regression test (e.g. a test that passes only `model` and asserts the same rendered DOM).

## Step 4 — Add Explorer-mode surface and wire the `list` view mode

- In `ViewNodeList.svelte`, add the Explorer-mode props (`onSelect`, `onActivate`, `onFocus`, `onContextMenu`, `selectedIds`, `focusedId`) and their behavior (ARIA mode switch, keyboard navigation, auto-scroll on `focusedId` change). All are optional; existing widget consumers stay quiet.
- Switch the item key generator to `getItemKey: (i) => rowInputVirtualKey(rows[i])` so reordering doesn't remount; this also requires the back-compat model adapter to produce stable identifiers for `rowInputFromViewRow` rows.
- Add the `list` branch to `src/components/containers/panelExplorer.svelte` per shard 04. Build `listRowInputs` from `nodes` (reusing existing per-mode builder logic as documented in shard 04).
- Add the `vm-list-container` CSS scoping if not already present.
- Verification: TypeScript clean; full unit suite green; the new `ViewNodeList` unit tests (Explorer-mode callbacks, ARIA, keyboard, auto-scroll, range select) green; the new integration test for `list` view mode in `panelExplorer` green.

## Step 5 — Remove the back-compat path and delete dead code

- Remove the legacy `model: ExplorerRenderModel<NodeBase>` prop and its internal adapter from `ViewNodeList.svelte`. The component now only accepts `rowInputs`.
- Confirm `explorerQueue.svelte` and `explorerActiveFilters.svelte` pass `rowInputs` exclusively. No `model={…}` mounts remain.
- Delete `src/components/views/viewGrid.svelte`. Re-verify zero references with `git grep viewGrid src/ test/`.
- Delete `src/services/serviceVirtualizer.svelte.ts`. Re-verify zero references with `git grep -E 'serviceVirtualizer|\\bVirtualizer\\b' src/ test/` (excluding TanStack `Virtualizer` mentions — qualify by import path).
- Verification gates:
  - `pnpm tsc --noEmit` (or the project's typecheck command) clean.
  - Lint clean.
  - Full unit suite green.
  - `git grep` of the deleted symbols returns empty in `src/` and `test/` (matches in `.agents/docs/` are acceptable — those are historical references that future spec authors will clean up).
  - `perfProbe` scenarios (`tree-scroll`, `operation-badges`, `filter-select`, `filters-search`) match the pre-migration baseline within an acceptable margin (defined in shard 06).

## Rollback strategy

Each step is its own commit. If step N regresses something not caught by tests, revert just that commit; earlier steps remain valid in-flight work and can stay landed. Because `ViewNodeList` retains the `model={…}` back-compat path through step 4, consumers can be reverted to the legacy mount with no component-side change.
