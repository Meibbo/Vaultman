---
title: Research — gbrain + pi-agent (agent memory/orchestration) for PKM-AI
type: research-record
status: active
parent: "[[docs/work/pkm-ai/items/2026-06-04-multi-agent-orchestration-upgrade|multi-agent orchestration upgrade]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/pkm-ai
---

# R-GBRAIN-PI — gbrain + pi-agent research (read-only Explore, 2026-06-04)

## TL;DR for Vaultman

- **gbrain = KNOWLEDGE/retrieval layer**; **pi = ORCHESTRATION layer**. But Vaultman **already has the orchestration substrate** (`agent-room.mjs` + `.agents/state/`) → the genuinely MISSING layer is gbrain-style **retrieval + self-wiring graph**, not orchestration.
- **gbrain caveat (matches your API-aversion):** semantic embeddings need an API key (ZEROENTROPY/OPENAI).
  BUT its **self-wiring wikilink→typed-edge graph is ZERO-LLM (free)**. Borrow the graph; keep vectors optional/local.

## GBrain — HIGH confidence (github.com/garrytan/gbrain)

Garry Tan (YC), Apr 2026, **MIT**, ~14–20k stars, production-grade (powers 146k-page deploy).
- **Stack:** TypeScript/Bun (Node 18+ ok). **Storage:** Postgres-native — PGLite (WASM, zero-config) or Supabase.
- **Index = tri-layer hybrid:** pgvector (semantic) + BM25 (keyword) + Reciprocal Rank Fusion + ZeroEntropy reranker. **Self-wiring graph:** parses Markdown `[[wikilinks]]` + typed links → entity nodes + typed edges (works_at, attended, …) **with ZERO LLM calls**.
- **Perf:** P@5 49.1% / R@5 97.9%; +31.4 P@5 vs vector-only or ripgrep-BM25.
- **Beyond RAG:** synthesis layer + gap analysis; continuous memory (agents write Markdown back; auto-indexes edges; soft-deletes on git removal → diff-able memory).
- **CLI:** `gbrain query|put_page|list_entities`; HTTP MCP + OAuth2.1 thin-client; JSON out.
- **Install:** clone → `bun install` → `gbrain init`. Needs Bun/Node + Postgres (or PGLite). `ZEROENTROPY_API_KEY` (default) or `OPENAI_API_KEY` for embeddings.

## Pi — ~95% confidence (github.com/earendil-works/pi)

"Pi Coding Agent Harness" — terminal-first TS agent toolkit (npm), v0.75.2 May 2026. "Mega orchestration" = Pi + community extensions (pi-multi-agent · pi-parallel-agents · pi-orchestration · pi-messenger · pi-fleet · roach-pi). Name is ambiguous; this is the best match.
- **Orchestration patterns:** root→children (`spawn_agent`/`delegate`/`kill_agent`/`list_agents`); parallel multi-model; worktree isolation; crash recovery w/ checkpointed state; crew subprocesses (`pi --mode json`);
  config teams (`.pi/fleet.yaml`).
- **TS plugin model:** Extensions = TS classes on lifecycle events (`session_start`/`agent_end`/`model_output`);
  register tools/commands. `pi install npm:…|git:…`. awesome-pi-agent curates 40+.
- **"Which agent doing what" = file-based registry** (`~/.pi/agent/messenger/`); auto-register on session_start; cleanup on shutdown; crew checks ready tasks each `agent_end`. **NO built-in shared memory/graph** (gbrain would fill it). **Core needs no API key** (passes user's provider keys).

## Vaultman ALREADY HAS (verified 2026-06-04)

- **`agent-room.mjs` (37 KB)** CLI: `run start/list/status` · `agent join/heartbeat/leave` · `task add/claim/status/release` · `scope claim/conflicts` · `mailbox send/read/ack` · `objectives` · `status/dashboard/handoff`. Opts `--run/--agent/--json/--lease-ms/--force`. manifest `schemaVersion:1`.
- **`.agents/state/`:** `locks` (leases) · `runs` · `room_*` · `agents` · `events.jsonl` (journal) · `tasks.json` · `status.json`. Last room 2026-05-26 (claude-opus-4-7) → used then, lapsed since.
- Plus `manage-tasks.mjs` (18.8 KB), `traverse-graph.mjs` (0.5 KB, minimal), `code-index.mjs`, `manage-memory.mjs`, `record-metric.mjs`, `analyze-metrics/logs`.
- → "which agent doing what + don't collide" = `scope claim/conflicts` + `task claim` leases + `status/dashboard` + `mailbox`. **Already built.** The Codex-collision fear is solvable NOW by routing agents through agent-room (it maps 1:1 to pi-messenger/pi-fleet's file-registry pattern).

## What's genuinely missing (the real upgrade)

1. **SURFACE/route agent-room** into AGENTS.md + start.md so agents actually use it (run/join/heartbeat/ scope-claim/mailbox). Solves collision today, zero new code.
2. **gbrain-style RETRIEVAL** — grow `traverse-graph.mjs` toward gbrain's zero-LLM `[[wikilink]]`→typed-edge graph (free); add semantic search only if API/local-embeddings acceptable.
3. **min-token QUERY surface** — `agent-room status --json`/`dashboard` is the seed; add a compact "active threads / who-touches-what" answer.
4. **PKM-AI versioning** — agent-room manifest already has `schemaVersion:1`; extend system-wide.

## Borrow priority

- **HIGH (free):** route agent-room (exists, solves collision); port gbrain's zero-LLM wikilink→edge graph into `traverse-graph`.
- **MED:** gbrain hybrid vector retrieval (needs API or local model); pi lifecycle-event extension model for the `.mjs` tools.
- **LOW:** full gbrain install (Postgres) or full Pi migration (Node 22+, TS build) — borrow concepts first.

## Sources
- gbrain: github.com/garrytan/gbrain · vectorize.io/articles/what-is-gbrain · agentupdate.ai/product/gbrain
- pi: github.com/earendil-works/pi · pi.dev · github.com/qualisero/awesome-pi-agent · github.com/0xKobold/pi-orchestration
