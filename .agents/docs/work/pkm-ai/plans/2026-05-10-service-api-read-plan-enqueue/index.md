---
title: Service API read plan enqueue
type: implementation-plan
status: done
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T08:07:57
updated: 2026-05-10T08:17:21
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Service API Read Plan Enqueue

## Goal

Implement the first product `serviceAPI` slice for Agent Control Plane Module
5. The API exposes only supervised read, plan, and enqueue operations. It must not execute queued work or mutate vault files directly.

## Preconditions

- Queue `pending` now derives from staged `transactions`:
  [[docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index|queue-contract-repair]].
- Operation scope now verifies selected files against visible filtered files:
  [[docs/work/pkm-ai/plans/2026-05-10-selected-visible-scope-verification/index|selected-visible-scope-verification]].
- Phase 5 spec acceptance requires read/plan/enqueue only, no direct destructive mutation, and response payloads with counts, affected paths or nodes, validation errors, rollback limits, and summaries.

## Contract

Create `src/services/serviceAPI.ts` with a small host-injected service:

- `read()`
  - returns index counts and index revision health;
  - returns verified operation scope using `resolveVerifiedOperationScopeFiles`;
  - reports missing or unknown index revisions as validation errors/warnings.
- `plan(request)`
  - accepts one or more existing `PendingChange` values;
  - validates target files and computes affected paths;
  - classifies destructive risk;
  - returns a queueable operation group without calling queue APIs.
- `enqueue(plan, options)`
  - refuses invalid plans;
  - refuses destructive plans unless `options.confirmed === true`;
  - calls only `queueService.add(change)` for accepted changes;
  - never calls `execute`, vault APIs, file manager APIs, or adapter APIs.

Response payloads must always include:

- `counts`;
- `affectedPaths`;
- `affectedNodeIds`;
- `validationErrors`;
- `rollbackLimits`;
- `summary`.

## TDD Plan

1. RED: add `test/unit/services/serviceAPI.test.ts`.
2. Assert `read()` reports index counts, verified scope, and revision warnings.
3. Assert `plan()` validates changes and does not enqueue.
4. Assert `enqueue()` rejects destructive work without confirmation and queues confirmed plans through `queueService.add` only.
5. GREEN: implement the minimum service needed for those tests.
6. Refactor only inside `serviceAPI.ts` if duplication obscures the contract.

## Verification Plan

Focused:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceAPI.test.ts`

Scope/regression:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceAPI.test.ts`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`
- `git diff --check -- src/services/serviceAPI.ts test/unit/services/serviceAPI.test.ts .agents/docs/work/pkm-ai/plans/2026-05-10-service-api-read-plan-enqueue/index.md .agents/docs/work/pkm-ai/index.md .agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`
- `node .agents/tools/pkm-ai/check-doc-health.mjs`

## Status

- [x] Read current route docs, handoff, spec shards, queue, scope, and type contracts.
- [x] Create this plan.
- [x] Add RED tests.
- [x] Implement minimal `serviceAPI`.
- [x] Run verification.
- [x] Record evidence here and link the plan from PKM-AI indexes.

## Evidence

RED:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceAPI.test.ts` failed because `../../../src/services/serviceAPI` did not exist.

GREEN and regression:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceAPI.test.ts` passed: 1 file, 3 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceAPI.test.ts` passed: 3 files, 35 tests.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` exited 0 after `tsc`, Vite build, and sync. The external Obsidian reload tail printed the known `vault=plugin-dev` command error.
- `pnpm exec tsc -noEmit -skipLibCheck` passed.
- `pnpm exec vp build` passed directly.
- Scoped `git diff --check` passed with only CRLF warnings on existing Markdown.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still reports global `doc health: FAIL (48)`, with no `service-api-read-plan-enqueue` path hit.

Implemented files:

- `src/services/serviceAPI.ts`
- `test/unit/services/serviceAPI.test.ts`

Updated indexes:

- [[docs/work/pkm-ai/index|PKM-AI index]]
- [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]
