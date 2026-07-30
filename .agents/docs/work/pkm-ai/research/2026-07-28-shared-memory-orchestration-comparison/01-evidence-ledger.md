---
title: Shared-memory orchestration evidence ledger
type: research-shard
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/research/2026-07-28-shared-memory-orchestration-comparison/index|shared-memory orchestration comparison]]"
created: 2026-07-28
updated: 2026-07-28
created_by: codex-gpt5-20260728
updated_by: codex-gpt5-20260728
tags:
  - agent/work
  - initiative/pkm-ai
  - research/evidence
---

# Evidence Ledger

## 1. LangGraph

**Primary sources**

- [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Functional API and idempotency](https://docs.langchain.com/oss/python/langgraph/functional-api)
- [Subgraph persistence](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)
- [Concurrent graph updates](https://docs.langchain.com/oss/python/langgraph/errors/INVALID_CONCURRENT_GRAPH_UPDATE)
- [Double-text concurrency strategies](https://docs.langchain.com/langsmith/double-texting)

**Observed design**

- Checkpointers store thread-scoped execution state; Stores hold cross-thread application memory.
- State is checkpointed at graph-step boundaries. Successful parallel-node writes can survive another node failing in the same superstep.
- Replay can execute downstream nodes and external calls again.
- Side effects therefore require task wrappers and idempotency.
- Parallel writes to the same state key need an explicit reducer.
- Parent and subgraph state use different namespaces; shared Store is required for cross-boundary memory.
- Server concurrency exposes explicit enqueue, reject, interrupt and rollback policies instead of treating overlapping runs as one undifferentiated case.

**PKM-AI implication**

The task capsule cannot substitute for an execution log. PKM-AI needs atomic step boundaries, reducer semantics, idempotency receipts and an explicit overlapping-run policy.

**Confidence:** high. Current official documentation.

## 2. CrewAI

**Primary sources**

- [Unified Memory](https://docs.crewai.com/en/concepts/memory)
- [Framework architecture](https://docs.crewai.com/core-concepts/Agents)

**Observed design**

- A Crew shares one Memory by default; an agent can instead receive a scoped private view.
- Hierarchical scopes restrict a subtree. Slices combine disjoint scopes and can be read-only.
- Recall uses vector similarity plus recency and importance.
- Background memory writes are drained before recall, establishing a read barrier.
- The encoding pipeline can use an LLM to infer scope, importance and categories and can consolidate similar memories by keep/update/delete.
- Flows separate deterministic orchestration from autonomous Crews.

**PKM-AI implication**

Execution ownership and retrieval visibility are not the same dimension. A task should own one write scope while reading a deliberate slice of task, initiative and policy memory. PKM-AI should adopt the read barrier, but reject unreviewed LLM-driven deletion for architectural memory.

**Confidence:** high for documented behavior; medium for operational quality because no independent benchmark was used.

## 3. Letta

**Primary sources**

- [Shared memory blocks](https://docs.letta.com/v1-sdk/memory/memory-blocks)
- [Parallel execution with shared archival memory](https://docs.letta.com/guides/agents/multi-agent-parallel-execution/)
- [Agent-facing memory patterns](https://docs.letta.com/guides/get-started/for-agents)

**Observed design**

- The same persistent memory block can be attached to multiple agents.
- Blocks are always in context, have explicit size limits and can be read-only.
- Shared archives provide semantic retrieval for material that should not stay continuously in context.
- Letta explicitly warns that concurrent block modifications are last-write-wins and can lose updates.
- Agents need archival tools attached explicitly; shared storage existing does not mean the agent can use it.

**PKM-AI implication**

A single shared Markdown capsule would recreate a documented lost-update failure. Shared state must be append-only or CAS-protected, with read-only mounts for policy and durable knowledge. Tool discovery must be verified, not assumed.

**Confidence:** high. Current official documentation includes the concurrency warning.

## 4. Microsoft AutoGen

**Primary sources**

- [Agent and runtime](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/agent-and-agent-runtime.html)
- [Message and communication](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/message-and-communication.html)
- [Team state](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html)
- [Memory and vector RAG](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/memory.html)
- [Distributed runtime](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/distributed-agent-runtime.html)

**Observed design**

- The runtime manages agent identity, lifecycle and direct/broadcast messages.
- Team state serializes participant states plus the group manager.
- AutoGen warns that saving a team while it is running may yield inconsistent state.
- Pause/resume hooks are no-ops unless each custom agent implements them.
- The Memory protocol is pluggable; ChromaDB and Redis vector stores are extensions, not the coordination truth.
- Distributed runtime is documented as experimental.

**PKM-AI implication**

Presence plus mailbox is not enough. Checkpointing needs a quiescent boundary or an explicitly fuzzy snapshot, and each runtime adapter must declare what it can actually pause, resume and serialize. Broadcast also needs durable subscription/delivery semantics.

**Confidence:** high. Official stable API documentation; distributed behavior is explicitly experimental.

## 5. GBrain, Minions And gstack Code Brain

**Primary sources**

- [GBrain architecture and capabilities](https://github.com/garrytan/gbrain)
- [Hybrid and graph retrieval](https://github.com/garrytan/gbrain/blob/master/docs/architecture/RETRIEVAL.md)
- [Two-repo architecture](https://github.com/garrytan/gbrain/blob/master/docs/guides/repo-architecture.md)
- [Thin harness, fat skills](https://github.com/garrytan/gbrain/blob/master/docs/ethos/THIN_HARNESS_FAT_SKILLS.md)
- [Minions changelog](https://github.com/garrytan/gbrain/blob/master/CHANGELOG.md)
- [gstack worktree-aware code-brain changelog](https://github.com/garrytan/gstack/blob/main/CHANGELOG.md)

**Observed design**

- Markdown in a Git brain repo is the durable system of record; Postgres, pgvector and graph structures are projections.
- GBrain separates replaceable agent behavior/operational state from durable world knowledge and deliberately does not index the agent repo.
- Retrieval combines HNSW vectors, BM25, RRF, reranking and typed graph traversal. Vector similarity is explicitly insufficient for exact names and relationships.
- Results expose evidence attribution, gap analysis and index health.
- Minions adds durable jobs, depth/child limits, timeouts, leases, transactions, idempotency keys and two-phase completion.
- The maintainer changelog documents real failures: a half-installed migration, sibling-completion races, silent source-attach failures, stale orphan sources and cross-worktree index collisions.
- gstack fixed code retrieval by binding a source ID to each absolute worktree, writing a local `.gbrain-source` pin and removing legacy sources.

**PKM-AI implication**

C2's skill/tool boundary is supported, but its retrieval model is incomplete.
It needs typed retrieval routing and explicit projection-to-worktree binding.
The GBrain failure history also shows that health labels and migrations require end-to-end round-trip verification, not successful command exit alone.

**Confidence:** high for documented mechanisms and admitted incidents.
GBrain's BrainBench numbers are vendor-reported on a generated corpus and are supporting evidence, not independent validation.

## Local Corroboration

The local codebase-memory index reports `ready` with 17,662 nodes and 30,615 edges, yet its change detector returned 864 changed files. Separately, `query-docs` was observed with hundreds of documents newer than its cache.

This demonstrates locally that:

> `ready` is service health, not projection freshness.

Every PKM-AI adapter therefore needs a freshness contract stronger than a single boolean status.
