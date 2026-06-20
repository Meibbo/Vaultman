---
title: Agent room
type: spec-index
status: active
parent: "[[docs/work/pkm-ai/index|PKM-AI]]"
created: 2026-05-11T02:34:55
updated: 2026-05-11T03:29:20
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
  - agent/coordination
---

# Agent Room

## Purpose

Define a repo-local coordination room for parallel Vaultman agents. The room
lets agents see active runs, claim tasks and scopes, publish heartbeats, send
messages, and inspect stale or conflicting work before editing.

This spec implements the user's requested direction after the Pi-crew spike:
validate Pi-crew first, then build the PKM-AI contract instead of adopting
Pi-crew wholesale.

## Source Inputs

- [[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]
- [[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination-shard-2|Pi-crew source inspection shard]]
- [[docs/work/pkm-ai/research/2026-05-11-pi-crew-runtime-spike|Pi-crew isolated runtime spike]]
- Existing `.agents/tools/pkm-ai/manage-tasks.mjs`
- Current docs policy in [[docs/architecture/policies/docs|docs policy]]
- Current context policy in [[docs/architecture/policies/context|context policy]]

## Design Thesis

PKM-AI needs a durable coordination layer, not another Markdown handoff file.
Markdown remains the human-readable record; `agent-room` is the machine-readable
live state and message bus agents consult before and during work.

The first implementation should be a TypeScript or JavaScript CLI/API script
that writes JSON and JSONL under `.agents/state`. A dashboard or chat UI can be
added after the file contract is stable.

## Shards

- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/01-state-contract|01 State Contract]]
- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/02-command-contract|02 Command Contract]]
- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/03-implementation-plan|03 Implementation Plan]]
- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/04-status-and-objective-bridge|04 Status And Objective Bridge]]
- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/05-implementation-log|05 Implementation Log]]
- [[docs/work/pkm-ai/specs/2026-05-11-agent-room/06-comfort-layer|06 Comfort Layer]]

## Implementation Status

First CLI implementation is complete in `.agents/tools/pkm-ai/agent-room.mjs`.
The implementation log records commands, tests, and remaining product direction.

Comfort layer is also implemented:

- `node .agents/tools/pkm-ai/pkm.mjs room ...`
- `node .agents/tools/pkm-ai/agent-room.mjs dashboard`
- `node .agents/tools/pkm-ai/agent-room.mjs handoff`
- read commands can resolve the latest run when `--run` is omitted.

## Non-Goals

- Do not make Pi-crew a required runtime dependency.
- Do not spawn agents from `agent-room` in the first version.
- Do not auto-edit product code, commit, merge, clean worktrees, or delete dirty
  state.
- Do not replace `.agents/docs/current/status.md` or
  `.agents/docs/current/handoff.md`; keep those as compact human route indexes.
- Do not rely on multiple agents manually editing the same Markdown table.

## Core Concepts

`run`: One coordinated user request or work wave.

`agent`: One concrete agent session participating in a run. The owner id should
be explicit, for example `codex-main`, `codex-worker-a`, `claude-reviewer`, or
`gemini-scout`.

`task`: One independently grabbable unit of work. It can mirror an objective
from `manage-tasks.mjs`, a plan task, or an ad-hoc run task.

`scope`: A file, folder, route, doc shard, test file, or semantic area an agent
intends to touch.

`claim`: A leased owner/token record that grants temporary authority over a
task or scope.

`heartbeat`: A recent liveness record for an agent or task.

`mailbox`: Append-only messages for run-level or task-level communication.

## Minimal State Root

Use `.agents/state` so AI workflow state stays under the branch-permitted AI
files area and remains excluded from `main` by branch policy.

```text
.agents/state/
  runs/{runId}/manifest.json
  runs/{runId}/tasks.json
  runs/{runId}/events.jsonl
  runs/{runId}/agents/{agentId}/status.json
  runs/{runId}/mailbox/inbox.jsonl
  runs/{runId}/mailbox/outbox.jsonl
  runs/{runId}/mailbox/delivery.json
  runs/{runId}/mailbox/tasks/{taskId}/inbox.jsonl
  runs/{runId}/mailbox/tasks/{taskId}/outbox.jsonl
  locks/{runId}.lock
```

## Status Vocabulary

Run statuses:

```text
queued, planning, running, blocked, completed, failed, cancelled
```

Task statuses:

```text
todo, in-progress, waiting, blocked, question, done, failed, cancelled, skipped
```

The task vocabulary intentionally preserves PKM-AI's existing objective states
from `manage-tasks.mjs` while borrowing Pi-crew's distinction between
`waiting`, terminal failure, cancellation, and skip states.

## First Version Acceptance

The first implementation is acceptable when these are true:

1. An agent can create or resume a run without manually editing Markdown.
2. An agent can claim a task and move it to `in-progress`.
3. A second agent can see the active claim before touching the same task or
   scope.
4. An agent can claim one or more scopes such as files or folders.
5. Conflicting active scope claims are detected and reported.
6. Agents can send run-level and task-level messages.
7. Agents can acknowledge messages.
8. Heartbeats mark stale agents without deleting their claims automatically.
9. `agent-room status --json` gives the current room state in one command.
10. `manage-tasks.mjs` objective state can be read and optionally updated from
    `agent-room` task transitions.

## Recommended Sequence

1. Implement the file contract and lock/atomic-write helpers.
2. Implement run/task/claim/status commands.
3. Implement scope claim conflict detection.
4. Implement mailbox commands.
5. Implement heartbeat and stale detection.
6. Bridge objective states to `manage-tasks.mjs`.
7. Add a compact dashboard or TUI only after the CLI contract is proven.

## Open Decisions

- TypeScript versus JavaScript implementation. JavaScript fits current
  `.agents/tools/pkm-ai/*.mjs`; TypeScript gives stronger schemas if the repo's
  agent tooling starts compiling TS.
- Whether `scope` claims should be path-only in v1 or include semantic scopes
  like `route:pkm-ai` and `module:view-grid`.
- Whether stale claim takeover requires explicit `--force` or a two-step
  `request-takeover` mailbox flow. The safer v1 default is explicit `--force`.
