---
title: Delete-conflict modal and ops-log tab
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - ui/perf
  - explorer/badges
created_by: claude
updated_by: claude
---

# Phase 4 — Delete-Conflict Modal And Ops-Log Tab

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/02-hover-badges-and-ops-log|Hover badges and ops log]]

## Tasks (Delete Conflict)

- [x] Add `OperationQueueService.requestDelete(nodeId)` returning a
      promise that resolves once the modal flow finishes.
- [x] Create `src/components/modals/modalDeleteConflict.svelte`
      listing conflicting ops by kind + label.
- [x] On confirm, drop conflicting ops via
      `OperationQueueService.dropForNode(nodeId, kinds)`, then queue
      the delete. On cancel, no-op.
- [x] Route the `delete` hover badge click through `requestDelete`.

## Tasks (Ops Log + PerfMeter)

- [x] Create `src/services/perfMeter.ts` with `time`, `timeAsync`,
      and a `subscribe(handler)` API.
- [x] Create `src/services/serviceOpsLog.svelte.ts`: ring buffer
      capped at `opsLogRetention` (default 1000). Subscribes to
      `PerfMeter`, `OperationQueueService` events, plugin lifecycle
      hooks.
- [x] Add boot-time markers in `main.ts`:
      `PerfMeter.mark('vaultman:boot:start')` at `onload` first
      line; `PerfMeter.mark('vaultman:boot:end')` in
      `onLayoutReady`.
- [x] Sample other plugins via `app.plugins.plugins` snapshot diff
      across boot window. Record per-plugin deltas.
- [x] Wrap each Vaultman command callback with `PerfMeter.timeAsync`
      so latency is recorded.
- [x] Wrap `serviceFilter.eval`, `serviceFnRIsland.submit`, and
      `LeafDetachService.detach/attach` similarly.
- [x] New tab `pageToolsOpsLog.svelte` rendered in `pageTools`:
      virtualized list, kind/free-text filter, clear-log button.

## Tests

- [x] `test/unit/services/serviceQueueDeletePurge.test.ts` — confirm
      drops conflicting ops; cancel preserves them.
- [x] `test/unit/services/perfMeter.test.ts` — sync + async timing
      records.
- [x] `test/unit/services/serviceOpsLog.test.ts` — retention cap,
      subscriber fan-out, clear-log purges only the buffer.
- [x] `test/component/modalDeleteConflict.test.ts` — confirm/cancel.
- [x] `test/component/panelExplorerDeleteConflict.test.ts` —
      hover-delete on a node with active ops opens modal.
- [x] `test/component/pageToolsOpsLog.test.ts` — list renders,
      filter narrows, clear-log empties buffer.

## Verification

- [x] Focused unit + component runs.
- [x] `pnpm run check && pnpm run lint && pnpm run build`.

## Stop Conditions

- Stop if `app.plugins` lacks load events and snapshot-diff timing
  is unreliable. Record only Vaultman's own boot timings until a
  better signal exists.
- Stop if buffer churn during heavy queue activity hurts FPS. Move
  buffer writes off the main thread or batch them.
