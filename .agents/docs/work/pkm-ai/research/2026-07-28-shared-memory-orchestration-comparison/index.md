---
title: Shared-memory multi-agent orchestration comparison
type: research
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-28
updated: 2026-07-28
created_by: codex-gpt5-20260728
updated_by: codex-gpt5-20260728
tags:
  - agent/work
  - initiative/pkm-ai
  - research/multi-agent
  - research/memory
  - architecture/c2
---

# Shared-Memory Multi-Agent Orchestration Comparison

External adversarial review of the proposed PKM-AI C2 architecture: mandatory
protocol, deterministic thin control plane, and a skill as its human-facing
interface.

## Verdict

C2 remains the right direction, but the previously proposed contract is not
sufficiently strong.

The comparison supports:

- keeping the skill separate from deterministic state management;
- separating live coordination, durable knowledge and indexed projections;
- task-scoped recovery and explicit preflight;
- bounded, progressively disclosed context.

It contradicts or qualifies four earlier claims:

1. A recovery capsule cannot be only a disposable derived view. An immutable
   checkpoint must preserve what was observed at a specific execution boundary,
   even if a separate current view can be rebuilt.
2. One task scope is not enough for retrieval. Execution ownership can be
   task-scoped, but context needs explicit slices across task, initiative,
   workspace, policy and optional private-agent memory.
3. A non-empty file scope does not prove isolation. Structural dependencies,
   worktrees and dirty unindexed changes can create collisions outside the
   declared paths.
4. A preflight snapshot is not necessarily consistent while other agents are
   writing. It needs source cursors, compare-and-swap revisions and an explicit
   consistency grade.

## Systems Compared

| System | Primary role | Shared memory | Retrieval | Durability / coordination | Main PKM-AI lesson |
| --- | --- | --- | --- | --- | --- |
| LangGraph | Stateful orchestration runtime | Thread state plus cross-thread Store | Optional semantic Store | Step checkpoints, pending writes, replay | State boundaries and idempotent side effects must be mechanical |
| CrewAI | Crews and deterministic Flows | Crew memory, hierarchical scopes and slices | Vector plus recency and importance | Flow state, read barriers, background drains | Task ownership and retrieval visibility need different scope models |
| Letta | Persistent agent runtime and memory | Shared blocks and shared archives | Archival semantic search | Persistent agents; shared blocks are last-write-wins | Shared writable text is unsafe without CAS or append-only merging |
| AutoGen | Event-driven multi-agent runtime | Pluggable Memory protocol | Chroma/Redis vector extensions | Agent/team state and distributed runtime | Saving a running team can be inconsistent; pause/resume is adapter-owned |
| GBrain + Minions / gstack | Memory substrate plus durable job primitives | Git-backed brain, team slices, job inboxes | Vector + BM25 + RRF + graph; code brain | Two-phase jobs, leases, transactions, idempotency keys | Bind every projection to its source/worktree and expose health, provenance and gaps |

## Required Revisions To C2

1. Split the capsule into an **immutable checkpoint** and a **recomputed current
   reconciliation view**.
2. Add a versioned execution ledger with `pending -> committed | failed |
   unknown` side-effect receipts.
3. Make every mutating operation carry an idempotency key.
4. Replace path-only ownership with path + symbol/dependency impact, when the
   structural index is fresh enough to support it.
5. Add a projection manifest for frontmatter, BM25, vectors and code graph:
   source root, worktree ID, HEAD, dirty fingerprint, generated time, coverage
   and health.
6. Distinguish execution scope from memory visibility. Use read-only context
   slices for policies and shared knowledge; grant writes only to an explicit
   task/initiative scope.
7. Add a read barrier: retrieval cannot claim freshness until pending index
   writes are drained or declared incomplete.
8. Generate snapshots with an agent-room event cursor and CAS revision. Mark a
   snapshot `consistent`, `fuzzy` or `conflicted`; do not imply atomicity.
9. Define reducer/merge semantics per shared field. Never use whole-document
   last-write-wins for shared coordination state.
10. Version capsule schema and protocol logic; refuse or migrate incompatible
    in-flight checkpoints.
11. Add retention and garbage collection for tasks, checkpoints, events and
    stale index sources.
12. Evaluate with failure injection, concurrent writers, branch/worktree
    switches, stale projections and cold-resume agents under a fixed token
    budget.

## Shards

- [[docs/work/pkm-ai/research/2026-07-28-shared-memory-orchestration-comparison/01-evidence-ledger|01 — Evidence ledger]]
- [[docs/work/pkm-ai/research/2026-07-28-shared-memory-orchestration-comparison/02-adversarial-findings|02 — Adversarial findings]]
- [[docs/work/pkm-ai/research/2026-07-28-shared-memory-orchestration-comparison/03-revised-c2-contract|03 — Revised C2 contract]]

## Evidence Quality

All architectural claims use official documentation, source repositories or
maintainer changelogs. Vendor-reported benchmarks are labelled as such and are
not treated as independent proof. Product documentation was accessed on
2026-07-28 and may evolve.
