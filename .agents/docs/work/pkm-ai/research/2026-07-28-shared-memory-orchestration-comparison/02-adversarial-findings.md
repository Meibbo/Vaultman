---
title: Adversarial findings against PKM-AI C2
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
  - research/adversarial
---

# Adversarial Findings

## F1 — Rebuildable Is Not Replayable

The prior design treated the capsule as a disposable materialized view. If retrieval ranking, documents, HEAD or room events change, rebuilding returns a different context. LangGraph persists step results precisely because replaying external and nondeterministic operations is unsafe.

**Revision:** preserve an immutable checkpoint describing what the agent observed, plus a separate current reconciliation view.

## F2 — Task Scope Is Too Narrow For Memory

A task ID is an appropriate execution boundary, but not a sufficient retrieval namespace. Agents need project policy, initiative decisions, task-specific state and sometimes private scratch memory. CrewAI's scopes and slices expose this distinction.

**Revision:** one write scope per task; explicit read-only slices across shared memory. Do not expose the whole corpus by default.

## F3 — File Claims Miss Structural Collisions

Two agents can edit different files while changing the same API, call path, schema or generated artifact. GBrain/gstack's code brain and the local codebase-memory graph reveal relationships that path overlap cannot.

**Revision:** augment scope checks with symbol and dependency impact when the code graph is fresh. An uncertain or stale graph produces a warning, never a false guarantee.

## F4 — Snapshot Consistency Was Undefined

AutoGen warns that saving a running team can produce inconsistent state. The same applies when PKM-AI reads room tasks, Git and indexes while Claude or another agent continues writing.

**Revision:** attach source cursors/timestamps and a consistency grade:
`consistent`, `fuzzy` or `conflicted`. Use a brief mutation barrier only where strict atomicity is worth its cost.

## F5 — Freshness Is Projection-Specific

Frontmatter, BM25, vectors and code graph can each be at a different epoch.
Claude's `query-docs` work guards the frontmatter cache but explicitly does not make a separate retrieval/vector cache fresh.

**Revision:** record one manifest entry per projection, including source root, HEAD, dirty fingerprint, generation time, document/symbol coverage and health.

## F6 — Preflight Does Not Protect Post-Preflight Side Effects

Another agent can claim overlapping work after preflight, or a compacted agent can repeat a partially completed external action. LangGraph and GBrain Minions both require idempotency around recoverable tasks.

**Revision:** revalidate ownership immediately before mutation and issue an idempotency key plus `pending` receipt before every nontrivial side effect.

## F7 — Whole-Capsule Writes Lose Updates

Letta documents last-write-wins for concurrent shared block updates. A shared capsule Markdown file would have the same failure.

**Revision:** append immutable events and materialize the current view using field-specific reducers. Update the view with compare-and-swap revision, never blind overwrite.

## F8 — Worktree Identity Is Missing

gstack recorded silent wrong-source code results when sibling worktrees shared one index identity. A branch name or repository remote is insufficient because multiple worktrees can share both.

**Revision:** bind every projection and capsule to absolute Git common-dir, absolute worktree root, HEAD, branch and dirty fingerprint. Refuse silent fallback to another indexed source.

## F9 — Shared Read Does Not Imply Shared Write

Letta read-only blocks and CrewAI read-only slices separate visibility from mutation rights. PKM-AI currently relies mostly on social discipline and scope claims.

**Revision:** expose policy and architecture as read-only views; permit writes only through a claimed task/initiative adapter with actor provenance.

## F10 — Automatic Consolidation Can Destroy Audit History

CrewAI can ask an LLM to update or delete similar memories. That is useful for preferences but unsafe for architectural decisions, known-red tests and dev corrections.

**Revision:** use explicit supersession edges and retain prior records.
Automatic consolidation may propose changes but cannot erase durable PKM-AI memory.

## F11 — Retention Is Part Of Correctness

LangGraph warns that checkpoints grow without bound. The current agent-room already contains stale active agents and historical in-progress tasks that make the default snapshot too large to use.

**Revision:** define retention, archive and compaction by state. Keep active views bounded while preserving an addressable audit trail.

## F12 — Protocol Upgrades Can Break In-Flight Recovery

AutoGen notes saved-state compatibility changes. LangGraph warns that changing task order can break replay. GBrain shipped and then repaired a partially applied Minions migration.

**Revision:** store capsule schema, protocol version, workflow hash and adapter versions. Resume must migrate, drain or refuse incompatible checkpoints.

## F13 — Message Delivery Needs Durable Subscriptions

AutoGen distinguishes direct messages from topic broadcasts and notes that a topic without subscribers delivers nothing. PKM-AI mailbox read is mandatory, but our mailbox contained no notice about Claude's `query-docs` task.

**Revision:** agents subscribe to task, scope and initiative events. Maintain a per-agent acknowledged cursor and surface missed relevant events during preflight.

## F14 — Retrieval Must Route By Question Type

GBrain's evidence shows vector, lexical and graph retrieval fail on different query classes. Status inventory is a predicate query; code impact is graph traversal; exact identifiers are lexical; conceptual recall benefits from vectors.

**Revision:** add a deterministic query router. Never answer every memory question through one vector index or one generic `query-docs` call.

## F15 — Evaluation Must Exercise Recovery, Not Just Retrieval

Retrieval benchmarks do not prove that a new agent can safely continue a dirty task. GBrain's own changelog shows bugs caught only by real Postgres concurrency tests and write-search round trips.

**Revision:** create a PKM-AI continuity benchmark with:

- clean and unclean termination at every side-effect boundary;
- two agents writing related and unrelated scopes;
- branch and worktree switches;
- stale frontmatter, vector and code indexes independently;
- protocol upgrade with an in-flight checkpoint;
- cold resume by a different model without transcript;
- fixed 2K/4K/8K context budgets;
- external action whose result is ambiguous after timeout.
