---
title: Adversarial failure model and provider pilot gates
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
  - quality/adversarial
---

# Adversarial Failure Model And Pilot Gates

## Failure Scenarios The Happy Path Misses

| Scenario | Unsafe naive result | Required PKM-AI behavior |
| --- | --- | --- |
| Provider says `completed`; Git write failed | Task closes with no artifact | Verify authoritative target; mark attempt `unknown` |
| A2A task finishes after its PKM-AI lease expired and was reassigned | Two agents' outputs compete | Quarantine stale-claim output; reconcile claim revision |
| Letta memory contradicts a newer ADR | Learned text silently overrides decision | Rank by authority and timestamp; cite contradiction |
| GBrain points at another worktree or stale source pin | Correct answer for the wrong tree | Reject missing/mismatched source manifest |
| Crew checkpoint succeeds but a resumed tool repeats a side effect | Duplicate external mutation | Stable idempotency key and side-effect receipt |
| LangGraph local pilot is promoted using production Agent Server assumptions | Licensing/deployment surprise | Separate library and server decisions in the manifest |
| New MCP server speaks 2026-07-28 while an adapter assumes 2025 semantics | Tasks/cancellation silently mis-map | Negotiate versions; fail closed on missing semantics |
| Docker/Bun/Python sidecar is down at agent startup | Entire PKM-AI boot blocks | Providers are optional health-scored dependencies |
| Provider times out after performing the action | Automatic retry duplicates it | Status `unknown`; reconcile before retry |
| Provider output contains instructions to invoke another privileged tool | Cross-provider prompt injection | Treat output as data; capability allowlist and approval gate |
| User asks to erase memory but copies exist in vectors, checkpoints and logs | Partial deletion and policy breach | Tombstone fan-out plus auditable retention result |
| Adapter upgrades while tasks are in flight | Resume decodes old state incorrectly | Pin adapter/schema version; migrate or refuse |
| Two providers expose the same tool/capability name | Wrong provider chosen | Stable namespaced capability IDs |
| Agents delegate to one another cyclically | Cost/context explosion | Hop, fan-out, token, time and monetary budgets |
| Five systems emit verbose traces into every prompt | Bridge defeats short-context goal | Store artifacts; retrieve compact evidence by reference |
| Provider's internal memory/index is corrupt | “Healthy” server returns false facts | Independent source verification and shadow comparisons |

## Distributed-Consistency Reality

The system would span plain-file agent-room state, Git, provider databases,
PGLite/Postgres, vector indexes and possibly Redis. There is no practical
cross-system transaction.

Therefore:

- “exactly once” is not a transport guarantee; it is an application-level
  idempotency and reconciliation property;
- timeouts do not mean failure;
- provider completion is an observation, not a committed PKM-AI transition;
- cancellation is a request that must be reconciled with late results;
- every state transition needs an actor, cursor, attempt and raw receipt.

Any design that represents only `todo/running/done` is too weak for federation.

## Quality Gained

- Durable workflow replay and recovery across agent context loss.
- Longitudinal memory for selected specialist agents.
- Hybrid lexical/vector/graph retrieval with explicit source topology.
- Interoperability with heterogeneous local and remote agents.
- Standard task/artifact transport through A2A and tool/data access through MCP.
- Ability to replace a capability provider without rewriting the user-facing
  skill.

## Quality Lost Versus Current PKM-AI

- Plain-file inspectability and easy manual repair.
- Fast, service-free and mostly offline startup.
- One-language operational surface.
- Fewer credentials, network boundaries and supply-chain dependencies.
- Easier deterministic debugging.
- Fewer schema migrations and fewer places where retention must be enforced.
- A smaller context vocabulary for short-window agents.

These losses are real even if every provider works as documented. Federation is
not a free capability upgrade.

## Pilot Sequence And Kill Gates

### P0 — Provider-neutral contract

Build only a fake adapter and failure-injection harness.

Pass when:

- crash-after-intent, crash-after-side-effect and late-result scenarios never
  produce a false `committed`;
- duplicate delivery produces at most one verified side effect;
- an unavailable provider does not block PKM-AI startup;
- an old schema is migrated or refused explicitly.

Kill federation if PKM-AI cannot explain an attempt from its own ledger without
opening provider internals.

### P1 — Retrieval replacement benchmark

Run GBrain read-only beside `query-docs` plus codebase-memory over the same
repository/worktree snapshots.

Measure:

- exact inventory completeness;
- stale-source and wrong-worktree detection;
- code dependency recall/precision;
- conceptual retrieval usefulness;
- indexing latency and dirty-file coverage;
- cold-start/runtime burden;
- tokens needed for a short-context agent to reach cited truth.

Promote only one active retrieval plane. A shadow provider never answers
authoritatively.

Kill GBrain adoption if it cannot prove source/worktree identity, or if the
combined current stack wins on correctness and operational simplicity.

### P2 — One durable workflow engine

Compare LangGraph JS and Microsoft Agent Framework on the same single workflow:
pause for input, crash, resume under a different agent, and verify a scoped
file mutation.

Pass when:

- every resume uses the intended checkpoint and claim revision;
- pending/late tool results are preserved;
- cancellation and `input-required` map without loss;
- the provider can be disabled while canonical PKM-AI state remains readable.

Select one. Do not retain both primary engines after the benchmark.

### P3 — Letta memory

Use one non-authoritative specialist identity. Compare against durable Markdown
plus targeted retrieval under a fixed token and cost budget.

Pass only if Letta improves cold-session task quality without increasing
contradiction rate, leaking private memory into shared context or obscuring
provenance.

Kill the pilot if memory cannot be cleanly exported, deleted and rebuilt.

### P4 — CrewAI specialist executor

Choose a task with a plausible crew advantage, such as independent research,
source criticism and synthesis.

Pass only if the Crew beats a single-agent/control workflow on a predeclared
quality rubric or latency through safe parallelism. “More agents produced more
text” is not a benefit.

Do not grant canonical writes. Do not add CrewAI merely because it was one of
the original five references.

### AutoGen compatibility

Run only when a real legacy AutoGen agent exists. No generic “future-proofing”
pilot is justified while upstream recommends a successor framework.

## System-Level Acceptance Criteria

- Zero false completion in crash/timeout/late-result injection tests.
- Zero duplicate externally visible side effects in retry tests.
- Every retrieval answer used for action carries source/worktree/freshness
  evidence.
- Every provider can be disabled independently with an explicit degraded mode.
- A zero-context short-window agent can reconstruct owner, decision, known-red
  state and next action without reading provider databases.
- Provider and protocol upgrades do not reinterpret in-flight state silently.
- Secrets and tool access are isolated per provider.
- Removal of any provider leaves Git, durable documents and PKM-AI task history
  intact.

## Final Adversarial Conclusion

Direct adoption is justified only as **competitive, replaceable providers under
one PKM-AI authority model**. Making PKM-AI a neutral message bus between five
sovereign systems would amplify the exact context-continuity problem it is meant
to solve: the next short-window agent would first have to infer which system's
state to trust.

The bridge succeeds when an agent can ignore provider internals. If operating
the bridge requires understanding all five internal state models, the
architecture has failed.
