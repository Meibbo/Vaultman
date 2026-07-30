---
title: Provider fit and authority boundaries
type: research-shard
status: proposed
lifecycle: active
parent: "[[docs/work/pkm-ai/research/2026-07-29-provider-federation-bridge-analysis/index|provider federation analysis]]"
created: 2026-07-29T02:16:22
updated: 2026-07-29T02:16:22
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/work
  - initiative/pkm-ai
  - research/multi-agent
  - architecture/federation
---

# Provider Fit And Authority Boundaries

## LangGraph

### What direct adoption buys

The JavaScript library has first-class checkpoint persistence by execution step, threads, pending writes, replay and a cross-thread Store. Official checkpointers include SQLite, Postgres, MongoDB and Redis ([persistence documentation](https://docs.langchain.com/oss/javascript/langgraph/persistence)).
That is materially stronger than reconstructing a half-finished workflow from a prose handoff.

Agent Server adds assistants, threads, runs, queues and durable backing services ([Agent Server](https://docs.langchain.com/langsmith/agent-server)). It also exposes an A2A endpoint with Agent Cards, streaming and task lookup ([A2A endpoint](https://docs.langchain.com/langsmith/server-a2a)).

### Boundary and hidden cost

LangGraph's library is MIT ([license](https://github.com/langchain-ai/langgraph/blob/main/LICENSE)), but production Agent Server deployment is a separate platform/licensing decision.
The CLI documentation distinguishes local development from licensed production deployment ([CLI](https://docs.langchain.com/langsmith/cli)).

LangGraph must not own PKM-AI task claims or Git truth. Its checkpoint is authoritative only for its internal execution. PKM-AI stores the mapping from `pkmai_attempt_id` to `thread_id/run_id`, plus an immutable observation receipt.

### Disposition

Strong candidate for the one durable workflow slot. Prefer the JS library for a local pilot because the repository already runs Node 24; evaluate Agent Server only if remote A2A and managed queues justify the license and infrastructure.

## CrewAI

### What direct adoption buys

CrewAI combines autonomous Crews with deterministic, event-driven Flows and persisted state ([Flows](https://docs.crewai.com/en/concepts/flows)). Its current memory model supports shared scopes, read-only slices, semantic/recency/ importance ranking, consolidation and background writes ([memory](https://docs.crewai.com/en/concepts/memory)). Checkpoints can use JSON or SQLite/WAL ([checkpointing](https://docs.crewai.com/en/concepts/checkpointing)).

CrewAI can consume local and remote MCP servers with tool filtering ([MCP integration](https://docs.crewai.com/en/mcp/overview)). It is a Python framework under MIT ([repository](https://github.com/crewaiinc/crewai)).

### Boundary and hidden cost

CrewAI overlaps both the primary workflow slot and the memory slot. Its automatic checkpoint writes are documented as best-effort: a failed checkpoint write can be logged while execution continues. Background memory writes need a read barrier before PKM-AI can claim freshness.

The open-source documentation establishes MCP consumption, not a generic provider-neutral A2A server for a Crew. PKM-AI would need a Python sidecar and an A2A/HTTP wrapper, or an enterprise deployment surface. “It supports MCP” does not make it symmetrical with an MCP server.

### Disposition

Do not make CrewAI a second control plane. Admit it only as a bounded specialist executor—for example, a research-and-critique crew—with no canonical writes and with structured artifacts, budgets and verification.

## Letta

### What direct adoption buys

Letta exposes persistent agents through REST plus TypeScript/Python clients and can be self-hosted ([platform overview](https://docs.letta.com/guides/get-started/intro), [repository](https://github.com/letta-ai/letta)). Its self-hosted path uses Docker; external Postgres requires pgvector ([Postgres configuration](https://docs.letta.com/guides/docker/postgres/)).
Agents can consume remote MCP tools ([MCP overview](https://docs.letta.com/guides/mcp/overview)).

This is the most differentiated provider: it offers longitudinal agent identity and editable memory rather than only workflow checkpoints.

### Boundary and hidden cost

Learned memory can become stale, contradictory or overconfident. It must be retrieved as attributed advice and compared against current ADRs, Git and project documents. No Letta block may silently become accepted project truth.
Per-turn cost and memory growth also need PKM-AI budgets; recent releases contain numerous context/compaction fixes ([releases](https://github.com/letta-ai/letta/releases)).

### Disposition

Optional private/longitudinal memory for named specialist agents. Not a shared task registry, project knowledge authority or universal memory for every short session.

## AutoGen And Microsoft Agent Framework

### Current upstream reality

AutoGen now states that it is in maintenance mode and directs new projects to Microsoft Agent Framework ([AutoGen repository](https://github.com/microsoft/autogen)). Its distributed runtime is experimental ([distributed runtime](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/distributed-agent-runtime.html)), and the team API warns that saving state while a team is running may be inconsistent ([team state API](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html)).

Microsoft Agent Framework is the successor path and supplies typed workflow graphs, orchestration and checkpoints under MIT ([migration guide](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/), [workflow docs](https://learn.microsoft.com/en-us/agent-framework/workflows/workflows), [license](https://github.com/microsoft/agent-framework/blob/main/LICENSE)).

### Disposition

Do not introduce AutoGen as a new core runtime. Preserve an adapter only if an actual AutoGen agent must interoperate. Compare Microsoft Agent Framework against LangGraph for the one workflow slot; do not adopt both merely to retain the original list of five.

This upstream change demonstrates why PKM-AI must bind to capabilities and protocol versions, not vendor names.

## GBrain

### What direct adoption buys

GBrain combines vector HNSW, BM25, reciprocal-rank fusion and graph retrieval ([retrieval architecture](https://github.com/garrytan/gbrain/blob/master/docs/architecture/RETRIEVAL.md)).
It supports local PGLite, remote brains and split-engine worktree topologies through MCP ([topologies](https://github.com/garrytan/gbrain/blob/master/docs/architecture/topologies.md)).
Its repository guidance deliberately separates the permanent brain repository from a replaceable agent/code repository ([repo architecture](https://github.com/garrytan/gbrain/blob/master/docs/guides/repo-architecture.md)).

Those are directly relevant to the current overlap between `query-docs` and codebase-memory.

### Boundary and hidden cost

GBrain explicitly does not provide a global orchestrator; agents select brain aliases. A wrong alias or source pin can therefore query the wrong code/worktree.
The ecosystem has already fixed worktree source-ID collisions by adding per-worktree source pins ([gstack changelog](https://github.com/garrytan/gstack/blob/main/CHANGELOG.md)).

The package requires Bun and carries PGLite/Postgres, pgvector, tree-sitter and MCP dependencies ([package manifest](https://github.com/garrytan/gbrain/blob/master/package.json)).
It overlaps strongly with two live PKM-AI retrieval systems. Running all three as equal peers would create triple indexing, freshness and source-manifest problems.

### Disposition

The strongest direct-replacement candidate in the set, but only after a read-only benchmark. If selected, it should consolidate an active retrieval slot, not become a third permanent index.

## Local Feasibility Snapshot

Observed on 2026-07-29:

| Runtime | Local state | Consequence |
| --- | --- | --- |
| Node | v24.15.0 available | LangGraph JS and PKM-AI adapters fit naturally |
| Python | 3.11 and 3.13 available; `uv` available | CrewAI/MAF sidecars are feasible |
| Bun | Not installed | GBrain needs a Bun/WSL installation spike |
| Docker | CLI installed; daemon did not answer within 30 seconds | Letta is not currently a zero-step local service |

These are deployment-friction signals, not permanent blockers. A production decision requires a clean-machine installation test and an offline/degraded-mode test.
