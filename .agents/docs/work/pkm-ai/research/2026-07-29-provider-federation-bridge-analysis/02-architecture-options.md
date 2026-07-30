---
title: Provider federation architecture options and bridge contract
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

# Architecture Options And Bridge Contract

## Option A — Five Co-Equal Engines

PKM-AI routes work among LangGraph, CrewAI, Letta, AutoGen and GBrain while each retains its own tasks, memory, checkpoints and retries.

### Advantage

Maximum immediate exposure to each product's native capabilities.

### Failure

There is no single answer to “who owns this task?”, “did this side effect happen?”, “which memory is current?” or “what should resume after a crash?”.
PKM-AI becomes a sixth orchestrator that reconciles five incompatible internal models after the fact.

**Verdict: reject outside an integration laboratory.**

## Option B — Capability Federation Under PKM-AI Authority

PKM-AI owns policy, identities, claims, reconciliation and the cross-provider ledger. One provider at a time fills each capability slot:

- durable workflow;
- specialist execution;
- longitudinal memory;
- retrieval/code intelligence.

Other providers may observe in shadow mode but cannot mutate canonical state.

### Advantage

Captures differentiated provider value while retaining one recovery story and one source of truth per field.

### Cost

PKM-AI must implement a real control-plane contract: adapters, receipts, reconciliation, security policy, health/freshness and lifecycle management. This is materially more work than a thin skill wrapper.

**Verdict: recommended target architecture.**

## Option C — Standards-First Broker, Providers Added Gradually

PKM-AI first implements provider-neutral A2A and MCP boundaries plus the ledger.
Providers enter only through pilots and may be replaced.

A2A 1.0 defines discovery, tasks, messages, artifacts, streaming and long-running agent collaboration ([specification](https://github.com/a2aproject/A2A/blob/main/docs/specification.md)).
MCP defines the agent-to-tool/data boundary ([2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28)).
They are complementary, not substitutes.

### Advantage

Best reversibility and least vendor lock-in.

### Cost

Native support is uneven. LangGraph Agent Server exposes A2A, but CrewAI, Letta, GBrain and legacy AutoGen cannot all be assumed to expose the same current protocol surface. Wrappers remain necessary.

The 2026-07-28 MCP release is also a breaking protocol transition ([release note](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)).
Version negotiation and a compatibility floor are mandatory.

**Verdict: use this as the implementation sequence for option B.**

## Comparative Score

Scores are architectural judgment from 1 (poor) to 5 (strong). “Leverage” means access to provider-native capability; it is not vendor marketing.

| Criterion | A: five peers | B: bounded federation | C: standards broker first |
| --- | ---: | ---: | ---: |
| One recovery story | 1 | 5 | 4 |
| Provider leverage | 5 | 4 | 2 initially |
| Correctness under crash | 1 | 4 | 4 |
| Replaceability | 2 | 4 | 5 |
| Local/offline simplicity | 1 | 3 | 4 initially |
| Operational burden | 1 | 3 | 4 initially |
| Time to one useful pilot | 2 | 4 | 3 |
| Long-term fit for heterogeneous agents | 3 | 5 | 5 |

## Minimal Bridge Contract

### Capability manifest

Every adapter publishes:

```text
provider_id
adapter_version
capability_slots[]
native_protocols[{name, version, role=client|server}]
transport
health
degraded_modes[]
required_runtimes[]
required_secrets[]
data_locations[]
retention_policy
```

The bridge refuses an invocation when the required capability or protocol version is not declared.

### Source manifest

Every retrieval or code result includes:

```text
source_id
absolute_source_root
git_common_dir
worktree_root
head
dirty_fingerprint
source_cursor
generated_at
coverage
freshness = fresh | stale | partial | unknown
```

This extends the revised C2 projection manifest. A provider cannot translate `health=ready` into `fresh=true` without this evidence.

### Cross-system task identity

PKM-AI records:

```text
pkmai_task_id
pkmai_attempt_id
claim_revision
provider_id
provider_agent_id
provider_task_id
provider_thread_or_context_id
input_checkpoint_id
idempotency_key
protocol_version
started_at
last_observed_at
result_artifact_ids[]
status = pending | running | input-required | committed | failed | unknown
```

Provider IDs are observations, never replacements for the PKM-AI task ID.

### Mutation protocol

1. Validate task claim, scope, source and capability manifest.
2. Persist a `pending` intent plus stable idempotency key.
3. Invoke exactly one provider.
4. Preserve the raw response and provider cursor.
5. Verify Git/files/docs or the relevant external authority.
6. Mark the attempt `committed`, `failed` or `unknown`.
7. Refresh/invalidate affected retrieval projections.
8. Publish a compact agent-room event.

This is an outbox/saga protocol. Do not attempt an atomic dual write across JSONL, Git, Postgres, PGLite and provider databases.

### Output trust boundary

Provider output enters as a quarantined artifact with:

- producer and model identity;
- inputs and source cursors;
- citations/evidence;
- tool/side-effect receipts;
- verification status;
- cost, time and context budget;
- explicit uncertainty and unsupported claims.

Only deterministic verification or a human/agent review can promote it into a canonical document or completion transition.

## Routing Rules

| Request | Route |
| --- | --- |
| Live ownership or scope | PKM-AI agent-room only |
| Exact current file state | Git/filesystem only |
| Conceptual/document retrieval | Active retrieval provider through MCP |
| Code dependency/impact | Active code-graph provider through MCP |
| Resumable deterministic workflow | Primary workflow provider through A2A/local adapter |
| Open-ended specialist collaboration | Optional CrewAI/MAF/LangGraph delegated agent |
| Personal longitudinal recall | Optional Letta slice, attributed and read-only |
| Accepted design truth | Open and cite the durable source document |

## Security Contract

- Per-provider tool allowlists; never expose the whole MCP catalog by default.
- Separate credentials and least-privilege filesystem/network scopes.
- Human approval remains in PKM-AI for destructive or external side effects.
- Cap delegation depth and total task fan-out to prevent cyclic agent calls.
- Treat retrieved/provider text as untrusted content, not control instructions.
- Record data residency and propagate retention/deletion tombstones to every projection and memory provider.
- Pin adapter/protocol versions for every in-flight attempt.

The bridge is a security boundary, not only a transport translator.
