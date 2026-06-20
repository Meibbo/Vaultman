---
title: Queue contract repair implementation plan
type: plan-index
status: done
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T06:18:15
updated: 2026-05-10T06:24:40
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - queue
---

# Queue Contract Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans or test-driven-development to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the queue contract so `OperationQueueService.pending` and the
legacy `queue` view no longer drift from staged `transactions`.

**Architecture:** Keep `transactions` as the single source of truth for queued
file work. Reconnect `pending` and `queue` as derived logical-operation
snapshots grouped by staged op `changeId`, preserving the existing
transaction-backed queue UI and operations index. Do not implement or modify
product-facing `serviceAPI` in this slice.

**Tech Stack:** TypeScript, Svelte 5 rune-backed service class, Vitest unit
tests, existing Vaultman queue helpers.

---

## Decision

Reconnect instead of retire.

- Retiring `pending` would require changing `IOperationQueue`, stubs, and
  fallback index paths beyond the current slice.
- Maintaining a second mutable `pending` list would duplicate queue state and
  drift again when individual staged ops are removed.
- Deriving `pending` from `transactions` makes the concrete service honor the
  existing interface while preserving the current staged VFS model.

## Scope

In scope:

- `OperationQueueService.pending` returns a logical `PendingChange[]` snapshot
  derived from staged transaction ops.
- `OperationQueueService.queue` returns the same logical snapshot for legacy
  UI compatibility.
- Derived changes group repeated staged ops from one logical change by
  `changeId`.
- Removing a staged op or clearing/executing the queue updates `pending`
  automatically because it is derived from `transactions`.
- Focused unit tests prove the concrete service contract.

Out of scope:

- No `serviceAPI`.
- No selected/visible scope verification.
- No queue UI redesign.
- No broad provider rewrite.

## File Map

- Modify: `test/unit/services/serviceQueue.test.ts`
- Modify: `src/services/serviceQueue.svelte.ts`
- Update after verification: this plan's verification section

## Task 1 - RED: Concrete Queue Pending Snapshot

- [x] Add a failing unit test under
  `test/unit/services/serviceQueue.test.ts` proving `pending` and `queue`
  expose logical changes from staged transactions.

Test shape:

```ts
it('derives pending and legacy queue entries from staged transactions', async () => {
  const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
  const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
  const meta = new Map<string, CachedMetadata>([
    [fileA.path, { frontmatter: { status: 'draft' } }],
    [fileB.path, { frontmatter: { status: 'done' } }],
  ]);
  const app = mockApp({ files: [fileA, fileB], metadata: meta });
  const svc = new OperationQueueService(app);

  await svc.addAsync({
    id: 'delete-status',
    type: 'property',
    files: [fileA, fileB],
    action: 'delete',
    details: 'delete status',
    logicFunc: () => ({ [DELETE_PROP]: 'status' }),
    customLogic: false,
    property: 'status',
  });

  expect(svc.pending).toHaveLength(1);
  expect(svc.pending[0]).toMatchObject({
    id: 'delete-status',
    type: 'property',
    action: 'delete',
    details: 'delete status',
    property: 'status',
  });
  expect(svc.pending[0].files).toEqual([fileA, fileB]);
  expect(svc.queue.map((change) => change.id)).toEqual(['delete-status']);
});
```

- [x] Run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts -t "derives pending and legacy queue entries"`.

Expected RED: assertion failure because `pending` and `queue` are currently
empty in the concrete service.

## Task 2 - GREEN: Derive Pending From Transactions

- [x] Replace the stale mutable `pending = $state<PendingChange[]>([])` field
  with a `get pending(): PendingChange[]` getter.
- [x] Change the legacy `queue` getter to return the same derived snapshot
  instead of `[]`.
- [x] Add a private grouping helper that iterates `this.transactions.values()`,
  groups staged ops by `op.changeId ?? op.id`, and returns a `PendingChange`
  object for each group.
- [x] Map staged op kind back to `PendingChange.type` with the same semantics
  already used by `src/index/indexOperations.ts`:
  `find_replace_content -> content_replace`, file ops to their file change
  types, tag ops to `tag`, `apply_template -> template`, everything else to
  `property`.
- [x] Include `id`, `type`, `action`, `details`, `files`, `customLogic: true`,
  `logicFunc: () => null`, and optional `property` or `tag`.

Implementation constraints:

- Do not add a second mutable queue list.
- Do not touch `serviceAPI`.
- Do not change transaction ingest semantics except where the RED test
  requires the derived snapshot.
- Preserve existing dirty changes in `serviceQueue.svelte.ts`.

- [x] Re-run the focused RED command and require PASS.

## Task 3 - Contract Regression: Updates After Removal

Status: not added as a separate after-green test. The RED test for Task 1
proved the stale concrete contract and Task 2 implemented derivation from
`transactions`, so existing `remove`/`removeOp` tests now exercise the same
source of truth without adding a test that passed immediately after the
implementation. Future queue-contract work can add a removal-specific RED test
before changing removal semantics.

- [x] Covered by existing removal tests plus derived `pending` implementation.

- [x] Existing focused service queue suite run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts`.

Result: no standalone removal-specific command was run because the proposed
test was not added in this TDD cycle.

## Task 4 - Verification

- [x] Run focused queue unit:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts`.
- [x] Run operations-index unit because it owns the abstract queue fallback:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationsIndex.test.ts`.
- [x] Run scoped type/lint/build only if the focused queue changes pass:
  `pnpm run check`;
  `pnpm run lint`;
  `pnpm run build`.
- [x] Run scoped whitespace:
  `git diff --check -- src/services/serviceQueue.svelte.ts test/unit/services/serviceQueue.test.ts .agents/docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index.md .agents/docs/work/pkm-ai/index.md .agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`.

## Verification Log

- RED:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts -t "derives pending and legacy queue entries"`
  failed with `expected [] to have a length of 1 but got 0`.
- GREEN:
  same focused command passed with 1 test and 26 skipped.
- Queue suite:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts`
  passed with 27 tests.
- Operations index:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationsIndex.test.ts`
  passed with 8 tests.
- `pnpm run check`: 0 errors and 0 warnings.
- `pnpm run lint`: 0 warnings and 0 errors.
- `pnpm run build`: passed; Vite transformed 552 modules and synced artifacts.
- Scoped `git diff --check`: passed with only CRLF replacement warnings.
- `check-doc-health`: global FAIL (47), no `queue-contract-repair` path hit.
- `serviceAPI` was not touched.
