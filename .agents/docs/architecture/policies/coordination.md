---
title: Coordination policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-04T11:00:00
updated: 2026-06-04T11:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/policy
  - initiative/pkm-ai
---

# Coordination Policy

How parallel agents coordinate through the **agent-room** — the cross-stream shared brain. Normative
decisions live in [[docs/work/pkm-ai/adr/0003-coordination-shared-brain|ADR 0003]] (and ADR 0001 for the
`.ts` runtime). This file is the operational how-to: each section gives the concrete command and the rule.

Tool: `node .agents/tools/pkm-ai/agent-room.ts <resource> <action> [options]` (Node 24 runs the `.ts`
natively — no build). All actions accept `--json`; state is plain files, so reads are cheap and auditable.

## Shared-brain model

Agents are **peers — there is no master.** The first agent to create a run is recorded as `coordinator`
(role only, not authority). Every agent of this project converges on **one active room**; 5 agents in 5
worktrees = the same room. Coordination is cooperative and advisory: the room records presence, tasks,
dependencies, scope claims, mailbox messages, and an `events.jsonl` audit log. Nothing blocks an agent
from acting — agents are expected to read the room and self-regulate.

## Room resolution (one room per project, shared across worktrees)

The room lives under a **state root** resolved with this precedence:

1. `--state-root <dir>` flag, else
2. `VAULTMAN_ROOM_STATE_ROOT` env, else
3. `<git common dir>/vaultman-room` — `git rev-parse --git-common-dir`, so **every linked worktree of the
   repo resolves to the SAME room** (the common dir is shared; per-worktree `.git` files point at it), else
4. `<cwd>/.agents/state` — fallback when not in a git repo.

The room therefore lives inside `.git/` and is never tracked by git (runtime state, not source).

**Join-or-create is deterministic and atomic.** Use the `current` sentinel:

```
node .agents/tools/pkm-ai/agent-room.ts agent join --run current --agent <id> --stream <stream>
```

`--run current` routes through `ensureRun`: under a workspace lock (`<stateRoot>/ensure.lock`) it finds the
newest **running** run and joins it, else creates one — find+create span the lock, so concurrent agents
**never double-room**. `run ensure --agent <id>` does the same and reports `{ runId, created }`. Runs are
long-lived and closed explicitly (`run status --status done`); agent liveness is tracked per-agent, not
per-run, so an idle running room is reused rather than re-created.

**Never pass `--force` to `join`/`ensure`** — `--force` steals the lock unconditionally and defeats the
no-double-room guarantee. It exists only to reclaim a genuinely stuck lock by hand.

## Presence (join + heartbeat + leave)

- **Join** once at startup (above). Then **heartbeat** at turn boundaries:
  `agent heartbeat --run current --agent <id>`.
- An agent is **stale** when `now - lastHeartbeatAt > staleAfterMs` (default 300000 ms / 5 min).
  `status` / `dashboard` render stale agents as `stale`.
- **Leave** at exit: `agent leave --run current --agent <id>`.

## Stream / worktree tags

Tag presence with the git stream and the physical worktree so `status`/`dashboard`/`handoff` read
`agentId [stream @ worktree]`:

- `--stream <name>` — the logical stream: `goal` / `proto` / `canary` (=sandbox) / `beta` (=dev) /
  `stable` (=main).
- `--worktree <name>` — defaults to the basename of `git rev-parse --show-toplevel` (each linked worktree
  has its own toplevel), else the cwd basename. Resolved once on first join and reused on heartbeats.

Cross-stream scope claims are **advisory awareness**, not enforced locks — files differ per branch/worktree,
so a claim signals intent, it does not prevent edits.

## Memory boundary

- Editing **shared memory** (status / handoff / architecture / specs / plans) → `scope claim` FIRST to
  signal intent and surface conflicts (see below). Resolve conflicts/leases before writing.
- Your **own working memory** → an append-only session shard `docs/sessions/<date>-<agent>.md`. **Never
  overwrite shared memory in place** (ADR 0002). `status.md` / `handoff.md` are navigational route indexes;
  do not rewrite them while another agent holds them.

## Scope claims (advisory leases on shared surfaces)

A scope claim rides on a task. Add a task scoped to the files you will touch, then claim it:

```
agent-room.ts task add  --run current --agent <id> --title "<what>" --scope <path-or-kind:name>
agent-room.ts task claim --run current --agent <id> --task <taskId>      # holds the lease (default 300000 ms)
agent-room.ts scope conflicts --run current --scope <path>               # exits 1 + lists conflicts if held
agent-room.ts scope claim --run current --agent <id> --task <taskId> --scope <path>   # add scopes to a task
```

Path scopes nest (claiming `src/x` conflicts with `src/x/y.ts`). Scopes outside the workspace are rejected.
A claim is a lease: it expires after `--lease-ms`; an expired claim no longer conflicts.

## Dependencies (poll-based, not enforced)

Record cross-task ordering at add time; the dependency is **advisory** — the CLI does not block a claim:

```
agent-room.ts task add --run current --agent <id> --title "Downstream" --depends-on <upstreamTaskId>
```

`status`/`dashboard` show `… depends=<id>`. Pattern: agent **B polls** the room each turn (`status --json`),
sees task A is not yet `done`, and sets its own task `waiting`/`blocked` (`task status --status waiting`)
until A closes — then claims and proceeds. There is no socket/callback; readiness is discovered by polling.

## Messaging (mailbox)

```
agent-room.ts mailbox send --run current --agent <from> --to <agentId> --body "<text>" [--task <id>]
agent-room.ts mailbox read --run current --agent <id>           # messages to/from you
agent-room.ts mailbox ack  --run current --agent <id> --message <messageId>
```

Unacknowledged messages surface in `status` as `unreadMessages`. Messages may be run-scoped or task-scoped.

## Poll at the turn boundary (CLI ≠ sockets)

Coordination is **semi-real-time**: the agent-room is files driven by a CLI, not a live socket. Agents
discover each other's presence, tasks, dependencies, and messages by **polling at turn boundaries** —
heartbeat + `status --json` at the start/end of a turn. Do not expect push/interrupt; expect to read.

## Locking (implementation note)

Both the workspace `ensure.lock` and the per-run lock use one cooperative primitive: an atomic
`open(..., "wx")` create, **waiting** (spin) for a contended holder and stealing only a stale lock
(`> 60 s`) or under `--force`. Contended mutations therefore serialize and succeed instead of failing —
so simultaneous `agent join --run current` from multiple agents all land in the one room.

## Startup sequence

The mandatory zero-context startup (register presence → retrieval-first → route docs → memory boundary →
route by mode → exit) lives at the top of `AGENTS.md` ("Runtime Startup"). This policy is the detail it
links for the coordination steps.
