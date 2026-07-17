---
title: PKM-AI Architecture Decision Records (sub-project)
type: adr-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI ADRs (sub-project scope)

Decisions about the **agent-operations sub-project** (docs system + `.agents/tools/` tooling + agent
workflow/discipline) — SEPARATE from the product-architecture ADRs at
[[docs/architecture/adr/README|architecture/adr]] (those govern the Vaultman plugin). Kept apart so
tooling decisions don't pollute product decisions. Nygard-style.

Note: wikilinks in the table escape the alias pipe as `\|` so the linter does not split cells.

| ID | Title | Status |
|----|-------|--------|
| [[docs/work/pkm-ai/adr/0001-scripts-typescript-migration\|0001]] | Scripts → TypeScript via Node native type-stripping | Accepted |
| [[docs/work/pkm-ai/adr/0002-memory-lifecycle-states\|0002]] | Memory lifecycle states + pruning | Accepted |
| [[docs/work/pkm-ai/adr/0003-coordination-shared-brain\|0003]] | Coordination model: shared-brain-on-disk (no master agent) | Accepted |
| [[docs/work/pkm-ai/adr/0004-runtime-startup-mandatory-protocol\|0004]] | Runtime-startup sequence + mandatory protocol | Accepted |
| [[docs/work/pkm-ai/adr/0005-pkm-ai-versioning\|0005]] | PKM-AI versioning system | Accepted |
| [[docs/work/pkm-ai/adr/0006-retrieval-channel-pluggable-embeddings\|0006]] | Retrieval channel: pluggable embeddings + vector store (default local) | Accepted |

**Decisions 0001–0006 locked · agent-room smoke ✓ · spec ✓.** Next: **plan** (slice S1–S6 → plan-shards +
tracer-bullet issues). Hub: [[docs/work/pkm-ai/items/2026-06-04-multi-agent-orchestration-upgrade|multi-agent orchestration upgrade]].
