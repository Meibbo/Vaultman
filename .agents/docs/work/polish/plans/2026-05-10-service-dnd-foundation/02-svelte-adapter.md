---
title: serviceDnd Svelte adapter result
type: implementation-result
status: done
parent: "[[docs/work/polish/plans/2026-05-10-service-dnd-foundation/index|service-dnd-foundation]]"
created: 2026-05-10T05:26:24
updated: 2026-05-10T05:26:24
tags:
  - agent/result
  - initiative/polish
  - explorer/views
  - dnd
created_by: codex
updated_by: codex
---

# serviceDnd Svelte Adapter Result

Second DnD slice. This adds a thin adapter from `@thisux/sveltednd` callback
shape into the semantic `serviceDnd` contract.

## Scope

This slice still does not wire DnD into tree/grid/cards/table markup and does
not expose a visible `dnd` view mode. It creates the bridge that future Svelte
components can use without coupling domain behavior to a concrete DnD library.

## Implementation

- Added `src/services/serviceDndSvelteAdapter.ts`.
- Added `test/unit/services/serviceDndSvelteAdapter.test.ts`.
- `createSvelteDndDraggableOptions(...)` builds library options with stable
  semantic `container` ids, carries `DndDragSource` as `dragData`, supports
  handle/interactive selectors, and starts `serviceDnd` on drag start.
- `createSvelteDndDroppableOptions(...)` maps library drag enter/over/drop
  callbacks to `serviceDnd.updateTarget(...)`, emits `DndDropResult` through an
  optional callback, and clears stale candidates on leave.
- Library `dropPosition: null` maps to semantic `inside`, which is needed for
  group/container drops.
- `dndContainerId(...)` centralizes stable container id generation as
  `${explorerId}:${kind}:${id}`.

## Verification

RED:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  failed first because `src/services/serviceDndSvelteAdapter` did not exist.

GREEN:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  passed: 1 file / 5 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  passed: 2 files / 12 tests.
- `pnpm exec eslint --no-warn-ignored src/services/serviceDnd.ts src/services/serviceDndSvelteAdapter.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  exited 0.
- `git diff --check -- src/services/serviceDnd.ts src/services/serviceDndSvelteAdapter.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  exited 0.

Blocked broad verification:

- `pnpm run check` currently fails on an unrelated dirty
  `src/components/views/ViewSvarFileManager.svelte` change:
  `provider.subscribe` is possibly undefined. This slice did not touch that
  file.

## Remaining DnD Work

- Wire concrete view components to the adapter.
- Add provider/domain drop handlers for reorder, move, template application,
  logical filter groups, and workspace/tab targets.
- Re-enable a visible DnD route only after a surface has real behavior.
- Add Obsidian smoke coverage once a real interactive surface exists.
