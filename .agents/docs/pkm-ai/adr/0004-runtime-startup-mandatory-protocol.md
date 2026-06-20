---
title: PKM-AI 0004 — Runtime-startup sequence + mandatory protocol
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

# PKM-AI 0004 — Runtime-Startup Sequence + Mandatory Protocol

**Decision status:** Accepted (dev-directed 2026-06-04). **Date:** 2026-06-04.
## Context
The substrate exists (agent-room/0003, lifecycle/0002, retrieval) but nothing MANDATES it → optional →
unused (agent-room lapsed since 2026-05-26; status/handoff free-for-all). `AGENTS.md` is the ONE file every
zero-context agent reads first, but today it only *routes* (read start→status→handoff); it doesn't enforce
presence, scope-claims, retrieval-first, or lifecycle. The dev: make a **visible priority hierarchy** that
every new thread executes — "escribir en AGENTS.md todo el runtime startup del agente".
## Decision

`AGENTS.md` carries a numbered, **mandatory Runtime Startup Sequence** — the visible priority hierarchy —
that every agent executes before work. Lean: the sequence is imperative; detail lives in linked docs.

```
RUNTIME STARTUP (mandatory, in order)
0. Identify: agent+model · stream · task_size · read PKM-AI version (0005).
1. agent-room run join + heartbeat          (presence; 0003)
2. RETRIEVAL-FIRST: query index top-k        (BM25/graph; NOT read-all; lifecycle-ranked, 0002)
3. status/handoff = route only · session-log last entry
4. BOUNDARY:
     shared-memory edit → scope claim         (conflicts/leases; 0003)
     own memory         → own session-shard    (never overwrite shared; 0002 / S-12)
5. Route by mode/intent
6. EXIT: append session-log + scope release + agent leave
```

- **Mandatory, not advisory:** skipping join/scope-claim = out of protocol. Micro-commands (`status:`,
  `next:`) may take a read-only fast path but still register presence (step 1).
- Enforces 0002 (lifecycle: step 2 ranking + step 4 own/shared) + 0003 (coordination: steps 1/4/6).
- The actual `AGENTS.md` rewrite is **execution** (Phase 3), shown as a diff before applying — this ADR
  decides the sequence + that it is mandatory.

## Consequences

- Discipline becomes mandatory + visible at the bootloader → tools actually used, collisions prevented,
  sandbox-accumulation curbed. Fixes the root-cause gap.
- `AGENTS.md` grows modestly; kept lean via pointers to detail docs.
- Requires the rewrite + an agent-room smoke-test (0003 gate) before it can be mandated for real.

## Alternatives considered

- **Passive router (status quo):** optional → unused (the failure we are fixing).
- **Protocol only in `start.md`:** less authoritative than `AGENTS.md`, the true bootloader.
- **Per-agent goodwill / convention:** demonstrably fails (agent-room lapsed unused).
