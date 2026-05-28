---
title: Resume Grill Prompt — Architecture / proto design
type: agent-handoff
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-26T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/handoff
  - explorer/view-decomposition
---

# Resume Grill Prompt

Paste the block below into a fresh chat (Vaultman repo) to resume the architecture / proto-design
grill where the 2026-05-27 close left off. Prior 2026-05-26 version archived:
[[docs/archive/pkm-ai/active-docs/2026-05-27T000000-handoff-status-superseded-sections|2026-05-27 superseded sections archive]].

```text
Mode: grill/brainstorm (resume the Vaultman architecture + proto-design grill). Caveman chat ok; docs/code FULL detail.

Read first (in order):
- AGENTS.md -> .agents/docs/start.md -> .agents/docs/current/status.md -> .agents/docs/current/handoff.md
  (the "NEXT AGENT START HERE — Architecture + Style + Version-streams grill closed (2026-05-27)" section).
Then the consolidated state + hubs:
- .agents/docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory.md   <- READ FIRST: LOCKED + pending (state)
- .../decision-ledger.md + .../decision-changelog.md   <- per-decision detail + what changed & why
- .../roadmap-dispatch.md   <- live action order (note gaps: Style/Theme + Kbd/API/NN not yet slotted)
- .agents/docs/architecture/explorer-model/ (index + 01-responsibility-map, 02-render-and-data, 03-surfaces-and-interaction, 04-panels-axons-mutation-layout, visuals/model-map)
- .agents/docs/architecture/adr/ (0001-0008, ALL Accepted) + glossary.md
- .../2026-05-26-style-source-reconciliation/ (index + proto-v6-sidebar-map)
- .../2026-05-27-version-streams-distillation/index.md
- .agents/docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade.md

Then invoke the grill-with-docs skill and resume, in priority order:
1. PROTO DESIGN INTEGRATION grill (lead). proto design is the rolling prototype stream in C:\Users\vic_A\Downloads\vaultman (proto v7 ships ~2026-05-28). Classify each piece ADOPT/RESHAPE/MAP/ADD/FIX/DROP/DEFER/SUPERSEDE; map SNAPSHOTS, do not chase the rolling stream; re-translate jsx->svelte. Islands = Scenes; FiltersIsland->logicProps/Tags and FnR island->logicFnR* are near-term UX targets.
2. Complete the unified roadmap: fold the Style/Theme axis (N/UnoCSS, ThemeBuilder, color, bits-ui) + Keyboard/API/NN into roadmap-dispatch.
3. Resolve open decisions (see open-inventory): style row 7 (selection color accent vs text-faint), ActionNode refinements (opensOverlay/anim-by-order/binding-cell), islands on a large surface, version-stream pre-release labels + per-channel versioning + promotion gates.
4. Parking-lot grills (each its own): preset taxonomy (style/layout/load/workspace), install preset selector (barebones/core-native/polish), serviceUnload/load-preset (USER-FACING granularity, NOT publish), plugin-provider intercepts core plugins, serviceMark god-object decomposition, LayoutBuilder+Workspace-profiles (research Obsidian Workspaces + Notion).
Separate tracks (other agents): the publish initiative (stable=v1.0.0-continuation reconcile + branch/channel mechanics + mis-release fix); per-sub-system SPEC->PLAN->Issues (gated on dev greenlight).

Discipline (LEARNED this iteration — enforce):
- Caveman applies to CHAT only; docs/code = full detail and fidelity.
- ARCHIVE FIRST: before removing substantial content from current/status, current/handoff, specs, plans, or policies, run .agents/tools/pkm-ai/archive-active-doc.mjs (or create the archive doc) and link it. Never overwrite silently. (This was violated 2026-05-27 and fixed retroactively — do not repeat.)
- Record every changed/superseded decision in decision-changelog.md (what -> what + why); keep open-inventory.md updated as items lock or close.
- One grill question at a time, WITH your recommended answer. Surface code<->doc contradictions.
- created_by/updated_by = your agent-model (e.g. claude-opus-4-7). Keep docs health-clean: node .agents/tools/pkm-ai/check-doc-health.mjs (line-limit tiered: <=200 clean / 201-300 soft-WARN, alert the dev / >300 hard, split into a new shard).
- Do NOT start per-sub-system SPECS/PLANS/Issues until grilled and the dev greenlights.
```
