---
title: Agent room comfort layer
type: spec-shard
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_source: ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
shard_of: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_part: 6
created: 2026-05-11T03:29:20
updated: 2026-05-11T03:29:20
tags:
  - agent/spec
  - agent/shard
  - initiative/pkm-ai
  - agent/coordination
created_by: codex
updated_by: codex
---

# Agent Room Comfort Layer

## Purpose

Make the durable room contract usable from memory during active work without
forcing agents to type the full script path or repeatedly look up the latest
run id.

## Wrapper

Use the `pkm.mjs` wrapper when typing manually:

```powershell
node .agents/tools/pkm-ai/pkm.mjs room status --json
node .agents/tools/pkm-ai/pkm.mjs room dashboard
node .agents/tools/pkm-ai/pkm.mjs room handoff
```

The package script remains available:

```powershell
npm run room -- status --json
```

Run from `.agents/tools/pkm-ai` for `npm run room`.

## Latest Run Resolution

Read commands resolve the latest run when `--run` is omitted. Explicit
`--run latest` and `--run current` are equivalent.

This applies to:

- `status`
- `dashboard`
- `handoff`
- `mailbox read`

Mutating task, scope, mailbox-send, and agent commands should still pass an
explicit run id during real use so the action is auditable.

## Dashboard

```powershell
node .agents/tools/pkm-ai/agent-room.mjs dashboard
```

`dashboard` is a compact terminal view, not a full TUI:

```text
Run room_... [running]
Agents: codex-main active
Tasks: task_001 in-progress Implement feature owner=codex-main
Conflicts: none
Unread: 0
```

## Handoff

```powershell
node .agents/tools/pkm-ai/agent-room.mjs handoff
```

`handoff` prints Markdown only. It does not write to
`.agents/docs/current/handoff.md` automatically.

Expected shape:

```markdown
## Agent Room Handoff

- Run: room_...
- Status: running
- Agents: codex-main active
- Active claims: 1
- Scope conflicts: 0
- Unread messages: 0
```
