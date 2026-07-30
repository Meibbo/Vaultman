---
title: Wave 1 Agent C Service DnD Contract
type: agent-plan-shard
status: done
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/dispatch-shortcuts|Parallel dispatch shortcuts]]"
created: 2026-05-11T23:58:00
updated: 2026-05-11T23:58:00
tags:
  - agent/plan
  - polish
  - vaultman/product
created_by: codex
updated_by: codex
---

# Wave 1 Agent C Service DnD Contract

## Scope

User shorthand: `ejecuta ola 1 agente c`.

Resolved alias: Cut 4 service-only DnD/groups residuals from [[dispatch-shortcuts|Parallel dispatch shortcuts]].

Owned files for this slice:

- `src/services/serviceDnd.ts`
- `src/services/serviceDndSvelteAdapter.ts`
- `src/services/serviceGroups.ts`
- their unit tests

No Svelte views/components, tree/grid/list DnD markup, Queue presentation files, or `serviceGroups` production code were changed.

## Finding

The confirmed service-level gap was in `serviceDnd` accepted-operation resolution. A drop target declaring `accepts: ['reorder']` could still accept an `inside` drop position through the generic accepted-operation fallback. That made ambiguous `@dnd-kit/svelte` drops capable of emitting a semantic reorder result without a before/after edge.

This was service-level, not UI wiring, so it fit Agent C scope. UI wiring for real `DragDropProvider`, `createDraggable`, and `createDroppable` remains Agent F scope after Agent B.

## Implementation

- Added red-green unit coverage in `serviceDnd` for rejecting `inside` drops when the target only supports `reorder`.
- Added red-green adapter coverage proving an ambiguous `@dnd-kit/svelte` drop without edge position does not emit `onDropResult`.
- Changed `preferredAcceptedOperation` so accepted operations return `null` when no operation is compatible with the drop position, while preserving explicit layout operations, `move`, and `apply-template`.

## Verification

- Baseline:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceGroups.test.ts --fileParallelism=false`:
  pass, 19/19.
- Red run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false`:
  fail, 2 expected failures proving the ambiguous inside reorder behavior.
- Green focused run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false`:
  pass, 17/17.
- Agent C full unit gate:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceGroups.test.ts --fileParallelism=false`:
  pass, 21/21.
- First `pnpm run check`: failed on a concurrently dirty `NodeSelectionSnapshot` `selected` property mismatch in `serviceSelection.svelte.ts`.
- Repeated `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.
- `git diff --check`: pass with LF/CRLF warnings only from the dirty worktree.

## Follow-Up

Agent F should preserve the contract that `reorder` requires a before/after edge. If a DnD target only has an `inside` position, it must advertise a compatible operation such as `move`, not rely on fallback reorder behavior.
