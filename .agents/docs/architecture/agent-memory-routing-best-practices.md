---
title: Agent Memory + Routing — Best Practices Recon (2025–2026)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-28T00:00:00
updated: 2026-05-28T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - agent/process
  - agent/memory
---

# Agent Memory + Routing — Best Practices Recon

Light read-only recon (2026-05-28) against current industry practice (2025–2026) for multi-agent AI dev workflows: knowledge-base structuring · cross-session memory · decision capture · coordination patterns.
Validates what we do well + surfaces specific gaps with priority + effort.

## What we already do well (validated by external sources)

- **AGENTS.md bootloader → status / handoff → architecture cluster** — matches the emerging bootloader-driven workflow pattern (FlowHunt 2026 · InfoWorld) + Anthropic's Managed Agents memory pattern (status/handoff = navigation indexes <200 lines, link to detail).
- **ADR discipline** — Nygard-style minimal (status / context / decision / consequences / alternatives / references) matches AWS, Microsoft Azure Well-Architected, TechTarget. Rare-decisions criterion (hard-to-reverse · surprising · trade-off) is canonical.
- **Sharding strategy** — accept growth + shard with manifests vs compressing detail away. Sound for long-context agents traversing dense decision spaces.
- **CONTEXT-FORMAT.md + canonical + dev glossaries** — domain language formalization prevents agent drift.
- **decision-changelog** — supersession audit trail (rare; teams usually overwrite silently).

## Gaps + priority actions

| Prio | Gap | Action | Status (2026-05-28) |
|---|---|---|---|
| **P0** | No timestamped append-only session log (each session's start/end + summary + next-action + git-hash) | Created [[docs/sessions/session-log\|`docs/sessions/session-log.md`]] | **DONE this session** |
| **P0** | ADR frontmatter missing `date` / `session-id` / `supersedes` / `superseded-by` (have created_by / updated_by) | Add fields to ADR template + retrofit ADRs 0001–0009 | **QUEUED** (cheap; do incrementally) |
| **P1** | No explicit decision-graph showing supersession + dependency between ADRs | Created [[docs/architecture/decision-graph\|`decision-graph.md`]] (Mermaid + table) | **DONE this session** (seed) |
| **P1** | Concurrent agent writes to `status.md` / `handoff.md` could race (last-write-wins) | Adopt **append-only**: agents write to their own `.agents/sessions/<date>-<agent>.md` shard + append a one-liner index to session-log | **PARKED → S-12** (workflow change; dev confirm) |
| **P2** | No semantic-tag topic index for cross-session queries ("all decisions about persistence", "all research about DnD") | Create `docs/architecture/topic-index.md` with `#sync` / `#dnd` / `#bases` / `#perf` tags on every key doc | **PARKED → S-13** |
| **P3** | No queryable memory layer (Memorix / AgentMemory MCP servers exist + work with Claude Code / Cursor / Codex / Gemini CLI) | Evaluate MCP memory server; integrate if ROI clear | **PARKED → S-14** |
| **P1** | Handoff / status entries lack git-hash provenance + wall-clock timestamps | Bump session-log to include git-hash; treat status entries as journal lines | **PARTIAL** — session-log has timestamps + agent-model; git-hash next |
| **P2** | No "new-since-date" delta surface (fresh agents re-derive what changed) | Status / checkpoint gain a "Changed since 2026-05-XX → see session-log" pointer | **DONE this session** (status pointer added) |

## Overengineering risk = minimal

Sources flag overreach in formal DAG / task-queue orchestration when agents run sequentially. We do run sequentially (with read-only parallel research subagents); we should NOT bolt on heavyweight orchestration. The append-only journal pattern (P1 → S-12) is the only coordination upgrade that fits our cadence.

## Action log — applied 2026-05-28 (this session)

1. Wrote `.agents/sessions/session-log.md` (P0).
2. Wrote `docs/architecture/decision-graph.md` (P1 seed).
3. Wrote this doc (`agent-memory-routing-best-practices.md`) for cross-session reference.
4. Parked S-12 / S-13 / S-14 in `pending-decisions`.
5. Updated `2026-05-28-checkpoint.md` to point at the new docs.
6. Status carries a "Changed since" pointer to the session log.

## Sources

- FlowHunt — "Multi-Agent AI Systems in 2026" (flowhunt.io/blog/multi-agent-ai-system).
- InfoWorld — "Multi-Agent AI Workflows" (infoworld.com/article/4035926).
- Anthropic Managed Agents — multi-agent docs (platform.claude.com/docs/en/managed-agents/multi-agent).
- session-handoff pattern (agentpedia.codes/agent-skills/workflow/session-handoff).
- Memorix MCP server (github.com/AVIDS2/memorix).
- AgentMemory.dev (producthunt.com/products/agent-memory-dev).
- Mnemis dual-route retrieval (arxiv.org/pdf/2602.15313).
- SwiftMem query-aware indexing (arxiv.org/pdf/2601.08160).
- AWS Prescriptive ADR Guidance (docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records).
- Microsoft Azure ADR framework (learn.microsoft.com/azure/well-architected/architect-role/architecture-decision-record).
- TechTarget ADR best practices.

## Status

Recon captured. P0 done; P1 seeded + 1 parked; P2/P3 parked as S-13/S-14. Re-visit when (a) parallel agents become routine, (b) status churn outgrows append-only journaling, or (c) ADR count crosses ~25.
