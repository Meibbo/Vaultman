---
title: Architecture Foundation Discovery (surfaces + interop + services + release + PKM-AI)
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-25T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/view-decomposition
  - explorer/surfaces
  - explorer/interop
  - release/discipline
  - pkm-ai/orchestration
---

# Architecture Foundation Discovery

Consolidated record of the parallel READ-ONLY research (2026-05-25/26) that widened the V.D brainstorm into a **foundation pass**. The user reframed V.D from a Tree-perf slice into a whole-system question: separate the core axes (**Surface ⟂ View ⟂ Node ⟂ Logic**), make views mountable on many surfaces, interoperate with Bases + third-party plugins, restructure the roadmap to SemVer + a beta channel, and harden the agent/doc discipline to minimize replanning churn.

Companion records:
- [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]]
- [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/index|Node Media Index + Thumbnail Cache]]
- [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/index|Node Video Provider + Cache]]
- [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|Icon Pack Cache]]
- [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
- [[docs/work/publish/index|Publish initiative]]

## Shards

- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|Decision Ledger]] — locked / proposed / deferred decisions (faithful, status-tagged, source-linked).
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/research-streams|Research Streams]] — raw findings (service web, surfaces/Bases, release/CI, plugin platform, PKM-AI, reference-plugin mount patterns) + interop verdict table + reference-plugin repos.
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-reslot|Roadmap Reslot Proposal]] — change-type + dependency-driven dynamic order + beta/stable channels.
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|Roadmap Dispatch]] — dispatch-ready dynamic action order (DAG + Now/Next/Later + cost-of-unblock + task contracts), hardens the reslot. The live multi-agent action order.
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|Open Inventory + Iteration Review]] — the single consolidated view: LOCKED this iteration + pending (carried + new). Start here for "what's the state".
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|Decision Changelog]] — audit trail of changed/superseded decisions (what → what + why).

Durable model + ADRs (architecture/): [[docs/architecture/explorer-model/index|explorer-model]] (+ [[docs/architecture/explorer-model/visuals/model-map|visual map]]) · [[docs/architecture/adr/README|ADRs]].

## Refined model (8 dimensions)

Core axes **Surface · View · Node · Logic** + cross-cutting **Navigation** (Logic sub-axis) **· Style/Theme · Process · Operations**. Durable model + taxonomy + per-axis responsibility map live in `architecture/` (explorer-model + glossary + ADRs — being written). See the Decision Ledger for the status of each decision.

## Open (gating) decisions

- Page = editor-group on native leaves/splits + layout-config (PROPOSED).
- Render ownership = data-plane vs shared render-runtime (PROPOSED; ADR candidate).
- Engine/mode release placement; Bases interop order; minisearch fork (H1).
- Q16 remaining grill branches (orchestration ownership = `panelExplorer` split, …).

## Next actions

1. Accept glossary candidates from the decision-ledger into `architecture/glossary.md`.
2. Write `architecture/explorer-model.md` (8-dimension model + taxonomy + responsibility map).
3. Write ADRs for the locked, hard-to-reverse decisions under `architecture/adr/`.
4. Generate source-backed Mermaid + Obsidian JSON Canvas (taxonomy + roadmap).
5. Roadmap reslot draft in `work/roadmap-overview.md`.
6. Resume the grill (orchestration ownership) + confirm the PROPOSED decisions.
