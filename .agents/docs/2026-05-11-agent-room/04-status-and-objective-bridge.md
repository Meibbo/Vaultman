---
title: Agent room status and objective bridge
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_source: ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
shard_of: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_part: 4
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

# Agent Room Status And Objective Bridge

## Agent Status

Path:

```text
.agents/state/runs/{runId}/agents/{agentId}/status.json
```

Schema:

```json
{
  "agentId": "codex-main",
  "displayName": "Codex main session",
  "role": "coordinator",
  "status": "active",
  "currentTaskId": "task_001",
  "lastHeartbeatAt": "2026-05-11T02:34:55",
  "staleAfterMs": 300000,
  "activeScopes": ["src/components/views/ViewNodeGrid.svelte"],
  "lastMessage": "Implementing task state bridge"
}
```

Stale detection is read-time computation:

```text
now - lastHeartbeatAt > staleAfterMs
```

## Status Commands

Human status:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs status --run room_...
```

Machine status:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs status --run room_... --json
```

Required JSON fields:

```json
{
  "runId": "room_...",
  "runStatus": "running",
  "agents": [],
  "tasks": [],
  "activeClaims": [],
  "staleAgents": [],
  "scopeConflicts": [],
  "unreadMessages": []
}
```

The human status should be compact enough to paste into a handoff:

```text
Run room_... [running]
Agents: codex-main active, codex-worker-a stale
Tasks: task_001 in-progress owner=codex-main scope=.agents/tools/pkm-ai/agent-room.mjs
Conflicts: none
Unread: 2
```

## Objective Bridge

List current PKM-AI objectives through existing automation:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs objectives list --json
```

Create room tasks from objectives:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs objectives import --run room_... --agent codex-main --status todo
```

Sync a task status back to the objective file:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs objectives sync --run room_... --agent codex-main --task task_001 --token claim_abc123
```

## Status Mapping

Use this status mapping when syncing back to `manage-tasks.mjs`:

```text
todo -> todo
in-progress -> in-progress
waiting -> on-hold
blocked -> blocked
question -> question
done -> done
failed -> blocked
cancelled -> cancelled
skipped -> on-hold
```

`failed` maps to `blocked` because existing objective vocabulary does not have
a failure state. The event log should preserve the original `failed` task
status so the loss is visible.

## Bridge Rules

- Objective sync is explicit, not automatic, in v1.
- Sync requires a current task claim token.
- Importing objectives must not overwrite existing room tasks.
- A room task may point to one objective only.
- One objective may have multiple room tasks only when the user explicitly
  decomposes it.
- `objectives list --json` should delegate to `manage-tasks.mjs` rather than
  parse Markdown directly.
- If `manage-tasks.mjs` cannot expose required fields, update that script first
  with a small structured-output change.
