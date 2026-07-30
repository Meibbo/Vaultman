---
title: "PKM-AI 0003 — Coordination model: shared-brain-on-disk (no master agent)"
type: adr
status: active
parent: "[[docs/work/pkm-ai/adr/README|pkm-ai adr]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI 0003 — Coordination Model: Shared-Brain-on-Disk

**Decision status:** Accepted (dev-directed 2026-06-04). **Date:** 2026-06-04.

## Context

Multiple agents (Claude, Codex) work in parallel across streams (goal/stable/proto) and collide on shared memory (`status.md`/`handoff.md` dirty 2026-06-04). The dev wants **peers coordinating via a shared brain on disk — NOT a master/proprietary orchestrator agent** — with semi-real-time awareness and dependency waiting ("B needs A done → B awaits A"). `agent-room.mjs` already implements the substrate but is unmandated/lapsed (last room 2026-05-26).

## Decision

PKM-AI coordination = **file-based shared-brain** via `agent-room.mjs` + `.agents/state/`. Peers, no master;
the disk state IS the coordinator.

- **Presence:** `agent join` + `heartbeat` (liveness; stale heartbeat → lease expiry).
- **Work claims:** `scope claim` before touching a shared region; `scope conflicts` warns/blocks on overlap.
- **Memory boundary (own vs shared):** shared edits REQUIRE a scope claim; per-agent memory = own session shard (PKM-AI / S-12), never overwrite shared in place.
- **Messaging:** `mailbox send/read/ack` for A↔B.
- **Dependencies:** task `dependsOn[]` + `scope[]` + `waiting`/`blocked`/`question` statuses ALREADY EXIST in agent-room (verified by smoke-test 2026-06-04). B's task `dependsOn` A's; B polls A's status each turn.
  Nothing to add to the schema — only the POLL CONVENTION + the mandate are new.
- **Reactivity:** `events.jsonl` = the feed; agents **poll at turn boundaries** — CLI agents are not live sockets, so this is *semi*-real-time (turn-granular), not push.
- **Mandate:** enforced by the AGENTS.md runtime-startup sequence (PKM-AI runtime-startup ADR, pending) — without the mandate the substrate stays unused (today's failure).
- **Cross-stream SHARED room (dev 2026-06-04):** room state lives at a SHARED root resolved via `git rev-parse --git-common-dir` (all git worktrees of the repo share the common `.git`) → **ONE project room across streams** (goal/stable/proto), not per-worktree. Configurable `roomStateRoot` (default = common-dir; absolute path for separate clones / cross-machine). Agents tag `stream` + `worktree`.
  Cross-stream scope-claims are ADVISORY awareness (files differ per branch); the shared coordination surface = presence + mailbox + task `dependsOn` + `events.jsonl`. Builds in S2 (agent-room `--state-root` resolution
  + atomic race-safe `ensure-run` join-or-create — no double-room on simultaneous starts).

## Consequences

- Agents are mutually aware + non-colliding via leases/scopes; dependency waiting without a master agent.
- Works with monthly-plan CLIs — no API keys, no live server, no proprietary orchestrator.
- Cost: polling latency (turn-granular, not instant); requires the mandate + an agent-room smoke-test + the `depends_on` addition.

## Alternatives considered

- **Master orchestrator agent:** rigid + proprietary — explicitly rejected by the dev.
- **status/handoff free-for-all:** the current collision problem.
- **External memory MCP / live sockets:** infra + API cost; deferred (S-14).
