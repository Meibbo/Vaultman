---
title: Current PKM-AI readiness and query-docs relationship
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
  - architecture/federation
  - tooling/retrieval
---

# Current PKM-AI Readiness And Query-Docs Relationship

## “Control Plane” Is A Target, Not The Current State

The current agent-room is a useful deterministic coordination substrate, but it
is not yet a distributed control plane.

The normative
[[docs/architecture/policies/coordination|coordination policy]] explicitly says:

- claims and coordination are cooperative/advisory;
- nothing mechanically blocks an agent from acting;
- agents learn updates by polling at turn boundaries, not push delivery;
- state is stored in auditable plain files under the Git common directory;
- separate commands change terminal task status and release its claim.

That model is sufficient for cooperative local agents. It is too weak to broker
remote runtimes that retry, finish late, lose connectivity or mutate external
systems.

## Live Invariant Probe

The 2026-07-29 room snapshot contained a concrete example:

- `task_053` had `status=done`;
- its `claim` object still named `claude-opus-5`;
- its lease expired later rather than being cleared by the terminal transition;
- `task_054`, whose agent ran the separate release command, had no claim.

This is not evidence that Claude's work was incomplete. It is evidence that the
current CLI permits a terminal task and an attached claim to coexist. Human/
agent protocol closes the gap today; a federated control plane cannot rely on
every remote adapter remembering the second command.

Before provider federation, PKM-AI needs mechanical invariants such as:

- terminal transition atomically releases or invalidates the active claim;
- attempt state and task state cannot advance without matching revisions;
- late results are retained but cannot commit under a stale claim;
- intent/result receipts survive a crash;
- retry and cancellation semantics are explicit;
- event cursors do not imply an atomic snapshot of Git and external stores.

The provider-neutral P0 harness in
[[docs/work/pkm-ai/research/2026-07-29-provider-federation-bridge-analysis/03-adversarial-failure-model|the failure-model shard]]
is therefore prerequisite work, not adapter polish.

## Why Claude's Query-Docs Work Is Central

The active
[[docs/work/pkm-ai/items/2026-07-28-retrieval-discovery-audit/index|retrieval and discovery audit]]
is directly related to this federation decision.

It established that the existing document retrieval layer was not merely
missing semantic sophistication. Its higher-risk defects were:

- agents were not reliably discovering the structured query path;
- a stale cache could answer confidently;
- document and retrieval indexes covered different corpora;
- vector coverage was partial;
- workflow status vocabulary was not normalized.

The F1-F5 work gives PKM-AI a substantially stronger incumbent:

- structured inventory/status queries with staleness evidence;
- lifecycle-aware document retrieval;
- incremental semantic indexing and explicit coverage;
- a known interface short-context agents can discover at startup.

GBrain must therefore compete against the **post-audit combination** of
`query-docs` and codebase-memory, not against the pre-audit failure state.

## Possible Outcomes Of The GBrain Benchmark

1. **Replace both retrieval systems.** GBrain proves structured document
   completeness, code graph quality, dirty-worktree identity and hybrid
   retrieval in one operational plane.
2. **Replace codebase-memory only.** `query-docs` remains the deterministic
   frontmatter/inventory path while GBrain supplies code/semantic retrieval.
3. **Stay with the current pair.** The incumbent wins on correctness,
   Windows/Node fit and operational simplicity.
4. **Use GBrain only as a shadow evaluator.** It finds useful related evidence
   but cannot meet source/worktree or completeness gates.

Running all three permanently is the default outcome to avoid, not a harmless
transitional state.

## Readiness Conclusion

The first direct implementation should not be “install five providers.” It
should be:

1. finish and freeze the current retrieval baseline;
2. harden PKM-AI's task/attempt invariants;
3. define provider-neutral A2A/MCP manifests and receipts;
4. add providers one capability slot at a time.

The eventual continuity skill remains the interface, but it cannot compensate
for missing mechanical invariants with better prompt instructions.
