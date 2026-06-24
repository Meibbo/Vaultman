---
title: Hover badges and ops log
type: design-spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/spec
  - explorer/badges
  - ui/perf
created_by: claude
updated_by: claude
---

# Hover Badges, Delete Conflict, And Ops Log

## Badge Primitive

Replace ad-hoc per-adapter badge ordering with a single registry. Badges
render in a fixed order: `set, rename, convert, delete, filter`.
`convert` is omitted from hover render but kept in the registry for
queue-display purposes. Badges drop the surrounding box style across
explorers; hover state = faint icon-only, active state = normal text
weight.

```ts
type BadgeKind = 'set' | 'rename' | 'convert' | 'delete' | 'filter';
const ORDER: BadgeKind[] = ['set','rename','convert','delete','filter'];
```

`BadgeRegistry` query API:

- `visibleHoverBadges(node, activeOpsByNode): BadgeKind[]`
- `activeBadges(node, activeOpsByNode): BadgeKind[]`

`activeOpsByNode` is derived from `OperationQueueService`. A hover
badge of kind `K` is hidden if `K` already exists in
`activeOpsByNode[nodeId]` (no duplicate ops on a single node).

## Delete Conflict

When `delete` is the active op for a node:

- `BadgeRegistry.visibleHoverBadges` returns `['filter']` only.
- Other badges are not rendered for that node.

When the user attempts to add `delete` to a node that already has other
ops in queue:

1. `OperationQueueService.requestDelete(nodeId)` opens a confirmation
   modal listing the conflicting ops.
2. Modal copy: "Esto descartará las operaciones [list] sobre [label].
   ¿Continuar?".
3. On confirm: drop conflicting ops, queue delete. On cancel: no-op.

Modal lives in `modalDeleteConflict.svelte`. Confirmation routes back
through queue API; no direct queue mutation from view.

## Ops Log Tab

New tab in `pageTools`: **Ops log**. Sources:

| Source | Event |
|--------|-------|
| `OperationQueueService` | op start, op commit, op undo |
| Plugin lifecycle | boot start, boot end, per-plugin load enter/leave |
| Vaultman commands | command invoked, command resolved (latency ms) |
| Vaultman services | filter eval, FnR submit, leaf detach (timed) |

Helper: `PerfMeter`.

```ts
class PerfMeter {
  static time<T>(label: string, fn: () => T): T;
  static async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  // emits OpsLogRecord { ts, label, durationMs, kind }
}
```

Buffer: ring of `OpsLogRecord`, default cap **1000**, configurable in
settings (`opsLogRetention: number`). Cap reached → drop oldest.

UI:

- Virtualized list (TanStack) with timestamp, kind, label, ms (when
  applicable), and op id.
- Filter controls: by `kind`, by free-text label.
- Clear-log button purges the buffer only — never the queue.

Plugin boot timing:

- Mark `t0` in plugin `onload` first line.
- Mark `tEnd` in `onLayoutReady` callback.
- For other plugins: subscribe to `app.plugins` events (or sample
  `app.plugins.plugins` over the boot window) to record load deltas.
  If Obsidian doesn't expose load events, fall back to a pre/post
  snapshot diff captured during Vaultman boot.

## Acceptance

- Hover over a node with no active ops: 4 hover badges render in
  fixed order (`set rename delete filter`), faint, no box.
- Hover over a node with `rename` queued: 3 hover badges (`set delete
  filter`).
- Hover over a node with `delete` queued: only `filter` renders.
- Adding `delete` over an existing op opens the conflict modal with
  the correct op list.
- Ops log records every queue start/commit/undo with non-zero ms for
  async ops.
- `PerfMeter.time` works synchronously and returns the wrapped value.
- Buffer never exceeds cap.

## Anti-Goals

- No global mutable badge order array exported from a view component.
- No console mirror tab (out of scope per user).
- No silent op drops without modal confirmation.
- No log persistence across reloads (in-memory only) unless a future
  iteration adds it.
