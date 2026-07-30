---
title: Agent room state contract
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_source: ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
shard_of: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_part: 1
created: 2026-05-11T02:34:55
updated: 2026-05-11T02:34:55
tags:
  - agent/spec
  - agent/shard
  - initiative/pkm-ai
  - agent/coordination
created_by: codex
updated_by: codex
---

# Agent Room State Contract

## Storage Rules

- All state lives under `.agents/state`.
- All structured state is JSON or JSONL.
- Mutating commands must take a lock before writing a run.
- JSON files are written with temp-file replacement.
- JSONL files are append-only.
- Lock files are never edited by hand.
- Stale locks may be reported automatically; removal requires explicit command intent.

## Run Manifest

Path:

```text
.agents/state/runs/{runId}/manifest.json
```

Schema:

```json
{
  "schemaVersion": 1,
  "runId": "room_20260511_023455_ab12cd",
  "title": "PKM-AI coordination workflow",
  "goal": "Implement agent-room control plane",
  "status": "running",
  "createdAt": "2026-05-11T02:34:55",
  "updatedAt": "2026-05-11T02:34:55",
  "createdBy": "codex-main",
  "workspace": "c:/Users/vic_A/Desktop/vaultman",
  "source": {
    "kind": "user-request",
    "doc": "docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
  },
  "activeAgents": ["codex-main"],
  "summary": "One-line current run summary"
}
```

## Task Record

Path:

```text
.agents/state/runs/{runId}/tasks.json
```

Schema:

```json
[
  {
    "taskId": "task_001",
    "objectiveId": "optional-manage-tasks-id",
    "title": "Implement run manifest writer",
    "status": "in-progress",
    "createdAt": "2026-05-11T02:34:55",
    "updatedAt": "2026-05-11T02:34:55",
    "dependsOn": [],
    "scope": [
      {
        "kind": "file",
        "path": ".agents/tools/pkm-ai/agent-room.mjs"
      }
    ],
    "claim": {
      "owner": "codex-main",
      "token": "claim_abc123",
      "claimedAt": "2026-05-11T02:34:55",
      "leasedUntil": "2026-05-11T02:49:55"
    },
    "notes": "Current actionable note for machines and humans"
  }
]
```

Rules:

- `taskId` is stable inside a run.
- `objectiveId` is optional and points to `manage-tasks.mjs` state when present.
- `claim.token` is required for release and status transition by owner.
- A task with an unexpired claim cannot be claimed by a different owner unless `--force` is provided and an event is appended.
- Terminal tasks cannot move back to active statuses without `--reopen`.

## Scope Claim

Scope claims can be stored inline on tasks for v1. If run-level non-task scope claims are needed, add:

```text
.agents/state/runs/{runId}/scopes.json
```

Schema:

```json
[
  {
    "scopeId": "scope_001",
    "kind": "file",
    "path": "src/components/views/ViewNodeGrid.svelte",
    "owner": "codex-worker-a",
    "token": "scope_claim_abc123",
    "taskId": "task_001",
    "claimedAt": "2026-05-11T02:34:55",
    "leasedUntil": "2026-05-11T02:49:55",
    "status": "active"
  }
]
```

Conflict rules:

- Same normalized file path plus active lease is a conflict.
- Parent folder scope conflicts with child file and folder scopes.
- Semantic scopes only conflict when `kind` and `name` are identical.
- Expired claims are warnings, not automatic permission to overwrite.

## Event Log

Path:

```text
.agents/state/runs/{runId}/events.jsonl
```

Each line is one JSON object:

```json
{
  "eventId": "evt_001",
  "seq": 1,
  "time": "2026-05-11T02:34:55",
  "type": "task.claimed",
  "runId": "room_20260511_023455_ab12cd",
  "taskId": "task_001",
  "agentId": "codex-main",
  "message": "Task claimed by codex-main",
  "data": {
    "leasedUntil": "2026-05-11T02:49:55"
  }
}
```

Required event types:

```text
run.created
run.status_changed
agent.joined
agent.left
agent.heartbeat
agent.stale
task.created
task.claimed
task.claim_released
task.status_changed
scope.claimed
scope.conflict
mailbox.message
mailbox.ack
objective.synced
lock.stale
```
