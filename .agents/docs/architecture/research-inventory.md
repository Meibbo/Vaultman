---
title: Research Inventory (standing backlog of research threads)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - agent/navigation
  - agent/inventory
---

# Research Inventory

Standing registry of research threads — DONE (with output doc) and PENDING (with what it blocks) — so we
stop re-running the same recon and always know what's outstanding. Companion to
[[docs/architecture/zoom-out-map|zoom-out-map]] (subsystems) + the question-inventory idea. Candidate for a
`vm-zoom-out` skill to auto-regenerate. Discipline: research subagents are **read-only (Explore)** — a
general-purpose write agent once deleted 706 files; never give research write access.

## DONE (output recorded)

| Topic | Output doc | Note |
|---|---|---|
| Bases user docs — filters/formulas/view-def | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/bases-interop-findings|bases-interop-findings]] | operators, formula catalog, .base shape |
| Bases internals + brownfield (our `typeFilter.ts`/`serviceBasesInterop.ts` + obsidian-bases SKILL) | bases-interop-findings | IN-only today; FilterType enum |
| Obsidian extension-API surface (6 injection points; NO pluggable engine) | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-extension-api-findings|obsidian-extension-api-findings]] | foreign = opaque embed or Bases-registered |
| Bases dev API (`registerBasesView`/`BasesView`/`BasesEntry`/`Value.renderTo`, 1.10.0+ DOCUMENTED) | obsidian-extension-api-findings | Bases-OUT now spec-able |
| Style sources (proto-v6 + stable↔beta) | [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]] | matrix rows 1–7 |
| Roadmap methodology + branch-workflow | folded into roadmap-dispatch / version-streams | done earlier |
| Multiview virtualization (no safe wholesale swap) | [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|multiview-virtualization]] | keep TanStack; prototype virtua behind harness |
| Dynamic Views recon + Bases-view ecosystem + Path A/B | bases-interop-findings + [[docs/architecture/adr/0009-bases-interop-hybrid|ADR 0009]] | ~6–10 plugins on the API; **HYBRID LOCKED** 2026-05-27 |
| serviceMark persistence | this doc + chat 2026-05-27 | **serviceMark NOT built yet** (0 refs). Durable pattern = `saveData()`→`data.json` (pageOrder, leaf-detach), synced by default. No RAM-only marks exist. Storage decision DEFERRED into the holistic Storage Architecture research/grill below. |

## IN PROGRESS (running)

| Topic | Why | Status |
|---|---|---|
| **Media-cache + IndexedDB controls** (storage tier recon) | feeds the holistic Storage Architecture grill; dev flagged it as own research (quality tiers, IDB quotas/eviction, cache controls, vault-FS sidecars, Electron `userData`) | agent running 2026-05-27 |

## PENDING / BLOCKING (not started)

| Topic | Blocks | Tier |
|---|---|---|
| **Holistic Storage Architecture** (tier model + per-subsystem assignment) | gates `serviceMark` storage decision · media-cache durability · index persistence · pipeline transient state | NOW-ish (waits on media-cache research) |
| search backend — minisearch own-index vs Omnisearch bridge (H1) | content-search + FnR search half (`logicFnR*`) | NEXT |
| agentic-IDE chunk-acceptance pattern | Operations preview / diffview UX | LATER |
| PlatformAdapter monkey-patch targets (hover-editor WorkspaceLeaf patch · popout · Excalidraw · menu-intercept · ribbon-relocate) | PlatformAdapter (NOW) + SF + ForeignEmbed | NOW-ish (can be that agent's pre-read) |
| virtua vs tanstack-virtual prototype-behind-harness | V.D perf (1051ms fix) | NEXT |
| bits-ui FnR breakage diagnosis (why beta's FnR broke) | `logicFnR*` render approach | NEXT |
| `columns` plugin study | EditorScene columns codeblock | LATER |
| Obsidian Workspaces + Notion | LayoutBuilder + Workspace-profiles | LATER |
| NN (Notebook Navigator) engine internals | I.E / NN-interop | LATER |
| Bases-view ecosystem plugins for full-replace scope (calendar/gantt/kanban/charts) | Path A/B decision (partly in the Dynamic Views agent) | NEXT |

## Process

- Mark DONE → move the row up + link its output doc. Add new threads as they surface.
- Prefer parallel read-only Explore agents; keep each prompt self-contained + bounded.
- This doc + zoom-out-map + open-inventory together = the "where are we / what's open" surface
  (ties to the [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|memory-routing upgrade]]).

## Status

Created 2026-05-27 at dev request (stop repeating researches). Keep current. Two threads running
(Dynamic Views + serviceMark); results fold into bases-interop-findings / a serviceMark decision.
