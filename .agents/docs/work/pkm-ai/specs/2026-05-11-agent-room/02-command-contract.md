---
title: Agent room command contract
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_source: ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
shard_of: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_part: 2
created: 2026-05-11T02:34:55
updated: 2026-05-11T03:29:20
tags:
  - agent/spec
  - agent/shard
  - initiative/pkm-ai
  - agent/coordination
created_by: codex
updated_by: codex
---

# Agent Room Command Contract

## Script

Preferred v1 path:

```text
.agents/tools/pkm-ai/agent-room.mjs
```

Reason: existing PKM-AI automation already uses `.mjs` scripts under `.agents/tools/pkm-ai`, including `manage-tasks.mjs`.

Comfort wrapper:

```text
node .agents/tools/pkm-ai/pkm.mjs room ...
```

## Global Flags

```text
--run <runId|latest|current>
--agent <agentId>
--json
--lease-ms <milliseconds>
--force
--dry-run
```

Rules:

- `--json` must produce machine-readable output and no decorative prose.
- Mutating commands fail if `--agent` is missing.
- `--force` must append an event explaining what was overridden.
- `--dry-run` must validate and report the intended mutation without writing.

## Run Commands

Create or resume a run:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs run start --agent codex-main --title "PKM-AI agent room" --goal "Build coordination state"
```

Expected JSON:

```json
{
  "ok": true,
  "runId": "room_20260511_023455_ab12cd",
  "status": "running",
  "stateRoot": ".agents/state/runs/room_20260511_023455_ab12cd"
}
```

List runs:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs run list --json
```

Set run status:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs run status --run room_... --agent codex-main --status blocked --reason "Waiting for user decision"
```

## Agent Commands

Join a run:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs agent join --run room_... --agent codex-worker-a --role worker
```

Heartbeat:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs agent heartbeat --run room_... --agent codex-worker-a --task task_001 --message "Editing tests"
```

Leave:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs agent leave --run room_... --agent codex-worker-a
```

## Task Commands

Create task:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs task add --run room_... --agent codex-main --title "Add lock helper" --scope ".agents/tools/pkm-ai/agent-room.mjs"
```

Claim task:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs task claim --run room_... --agent codex-worker-a --task task_001 --lease-ms 900000
```

Transition task:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs task status --run room_... --agent codex-worker-a --task task_001 --status in-progress --token claim_abc123
```

Release task:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs task release --run room_... --agent codex-worker-a --task task_001 --token claim_abc123
```

## Scope Commands

Claim scopes:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs scope claim --run room_... --agent codex-worker-a --task task_001 --scope "src/components/views/ViewNodeGrid.svelte" --scope ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
```

Check conflicts:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs scope conflicts --run room_... --scope "src/components/views"
```

Conflict output:

```json
{
  "ok": false,
  "conflicts": [
    {
      "scope": "src/components/views/ViewNodeGrid.svelte",
      "owner": "codex-worker-a",
      "taskId": "task_001",
      "leasedUntil": "2026-05-11T02:49:55"
    }
  ]
}
```

## Mailbox Commands

Send a run-level message:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs mailbox send --run room_... --agent codex-main --to codex-worker-a --body "Pause before touching ViewNodeTable"
```

Send a task-level message:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs mailbox send --run room_... --agent codex-main --task task_001 --to codex-worker-a --body "Scope conflict detected"
```

Read mailbox:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs mailbox read --run room_... --agent codex-worker-a --json
```

Acknowledge message:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs mailbox ack --run room_... --agent codex-worker-a --message msg_001
```
