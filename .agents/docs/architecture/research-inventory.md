---
title: Research Inventory (standing backlog of research threads)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-29T22:58:16
created_by: claude-opus-4-7
updated_by: codex-gpt-5
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

| Topic                                                                                              | Output doc                                                                                                  | Note                                                                                                                                                                                                                                            |                                                        |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Bases user docs — filters/formulas/view-def                                                        | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/bases-interop-findings          | bases-interop-findings]]                                                                                                                                                                                                                        | operators, formula catalog, .base shape                |
| Bases internals + brownfield (our `typeFilter.ts`/`serviceBasesInterop.ts` + obsidian-bases SKILL) | bases-interop-findings                                                                                      | IN-only today; FilterType enum                                                                                                                                                                                                                  |                                                        |
| Obsidian extension-API surface (6 injection points; NO pluggable engine)                           | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-extension-api-findings | obsidian-extension-api-findings]]                                                                                                                                                                                                               | foreign = opaque embed or Bases-registered             |
| Bases dev API (`registerBasesView`/`BasesView`/`BasesEntry`/`Value.renderTo`, 1.10.0+ DOCUMENTED)  | obsidian-extension-api-findings                                                                             | Bases-OUT now spec-able                                                                                                                                                                                                                         |                                                        |
| Style sources (proto-v6 + stable↔beta)                                                             | [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index                                 | style-source-reconciliation]]                                                                                                                                                                                                                   | matrix rows 1–7                                        |
| Roadmap methodology + branch-workflow                                                              | folded into roadmap-dispatch / version-streams                                                              | done earlier                                                                                                                                                                                                                                    |                                                        |
| Multiview virtualization (no safe wholesale swap)                                                  | [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index                           | multiview-virtualization]]                                                                                                                                                                                                                      | keep TanStack; prototype virtua behind harness         |
| Dynamic Views recon + Bases-view ecosystem + Path A/B                                              | bases-interop-findings + [[docs/architecture/adr/0009-bases-interop-hybrid                                  | ADR 0009]]                                                                                                                                                                                                                                      | ~6–10 plugins on the API; **HYBRID LOCKED** 2026-05-27 |
| serviceMark persistence                                                                            | this doc + chat 2026-05-27                                                                                  | **serviceMark NOT built yet** (0 refs). Durable pattern = `saveData()`→`data.json` (pageOrder, leaf-detach), synced by default. No RAM-only marks exist. Storage decision DEFERRED into the holistic Storage Architecture research/grill below. |                                                        |

| Media-cache + IndexedDB + Obsidian Sync compat | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/storage-architecture-findings|storage-architecture-findings]] | IDB confirmed not-synced; `.obsidian/` all-or-nothing sync (no per-folder opt-out); `data.json` mod-date-flap + LWW; quality-tier cache = innovation gap; PROPOSED tier table per subsystem |
| R-DND-C — Svelte DnD library deep-dive + VM integration | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/dnd-library-findings|dnd-library-findings]] | **`dnd-kit-svelte` (HanielU)** PROPOSED — full dnd-kit feature parity, Svelte 5 compat, foreign drops via PlatformAdapter (ADR 0004). Lock = S-10 (now UNBLOCKED by R-DND-A) |
| R-DND-A — Obsidian DnD internals + hover-editor floating pattern | [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-dnd-findings|obsidian-dnd-findings]] | public DnD API mapped (`Workspace.onDragLeaf` / `getDropLocation` / `recursiveGetTarget`); private = monkey-patch via `monkey-around`; floating tiles = hover-editor pattern (popover + interact.js); editor drop = CodeMirror `domEventHandlers`. S-10 unblocked + S-11 (monkey-around + interact.js adoption) raised |

## IN PROGRESS (running)

| Topic | Why | Status |
|---|---|---|

## 2026-06-15 — Frontend stack deep research (advances several codes)

[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
(6 read-only Explore agents + verification) advances: **virtua-vs-tanstack** (TanStack Virtual internals +
shared-runtime orchestration — feeds V.D), **R-UNOCSS** (UnoCSS already wired; presetWind4 EXISTS → migration
viable), **R-UI-PRIMITIVES / S-29** (bits-ui headless strategy + FnR-breakage hypothesis), **R-CHARTS / S-23**
(LayerChart = defer to dashboard pilot), **R-DND-C** (deepened; official `@dnd-kit/svelte` likely supersedes the
HanielU port — reconcile). Open verification flags carried in the research index ledger (#9/#11/#12). render-tag
identified = Polotno html-in-canvas (N4 only).

## PENDING / BLOCKING (not started)

| Topic | Blocks | Tier |
|---|---|---|
| **Holistic Storage Architecture** (tier model + per-subsystem assignment) | gates `serviceMark` storage decision · media-cache durability · index persistence · pipeline transient state · note-frontmatter tier + scene-file-formats (dev input 2026-05-27) | NOW-ish (`storage-architecture-findings` recon DONE; awaits dev decisions S-1..S-7 — see `pending-decisions`) |
| **Dataview / Datacore interop** (R-1) — query language, codeblock syntax, value model, JS API, common import/export patterns | feeds the `.vmscene` ↔ dataview / datacore bridges (S-7) + broader interop story | LATER |
| **R-DND-B — Outliner plugin drag-outlines + Notion paragraph DnD** | complements LayoutBuilder / Workspace-profiles research; informs paragraph-as-block DnD for EditorScene | NEXT |
| **R-UNOCSS — UnoCSS for Obsidian** | style-system transition (Tailwind power, ecosystem-friendly); pkm-ai docs sweep + grill prep; verify whether the unocss skill is installed | NEXT |
| search backend — minisearch own-index vs Omnisearch bridge (H1) | content-search + FnR search half (`logicFnR*`) | NEXT |
| agentic-IDE chunk-acceptance pattern | Operations preview / diffview UX | LATER |
| PlatformAdapter monkey-patch targets (hover-editor WorkspaceLeaf patch · popout · Excalidraw · menu-intercept · ribbon-relocate) | PlatformAdapter (NOW) + SF + ForeignEmbed | NOW-ish (can be that agent's pre-read) |
| virtua vs tanstack-virtual prototype-behind-harness | V.D perf (1051ms fix) | NEXT |
| bits-ui FnR breakage diagnosis (why beta's FnR broke) | `logicFnR*` render approach | NEXT |
| `columns` plugin study | EditorScene columns codeblock | LATER |
| Obsidian Workspaces + Notion | LayoutBuilder + Workspace-profiles | LATER |
| NN (Notebook Navigator) engine internals | I.E / NN-interop | LATER |
| Bases-view ecosystem plugins for full-replace scope (calendar/gantt/kanban/charts) | Path A/B decision (partly in the Dynamic Views agent) | NEXT |
| **R-API-ENGINE — external engine API** | S-15; public renderer contract; compare Bases `registerBasesView`, Obsidian extension limits, Svelte component packaging/versioning | LATER/MAJOR |
| **R-REMOTE-PROVIDER — external providers/indexes + remote sources** | S-16/S-17; YouTube/Spotify-style fetched providers, auth/token storage, cache tiers, offline behavior, privacy prompts | LATER/MAJOR |
| **R-GESTURES — pointer/touch/sensor input grammar** | S-19; slide/swipe/drag/long-press/shake definitions, Obsidian mobile support, DeviceMotion/gyroscope availability, a11y fallbacks | LATER/MAJOR |
| **R-ONBOARDING — tutorial overlay patterns** | S-20; coach marks, game-style tutorials, Taskforge-like note-manipulation onboarding, notification-center separation | LATER |
| **R-AGENT-WRITE — privacy-preserving editor write API** | S-21; cursor-only context writing, VM action index exposure, OperationNode vs immediate editor insertion, skill/API contract | LATER/MAJOR |
| **R-GRAPH — Obsidian Graph internals + outline graph** | S-22; native graph view internals/interception feasibility, reconstruct-vs-adapter, Markmind/Markmap references, header-link nodes | LATER |
| **R-CHARTS — LayerChart next vs D3 vs Plot** | S-23; Svelte 5 LayerChart docs/llms.txt, D3/Plot extraction value, naming (`Charts`/`DataViz` not `Graph`) | LATER |
| **R-CALLOUT-MANAGER — callout/drawer/context variants** | S-24; callout managers, DrawerScene shape, right-click checkbox variant surfaces | LATER |
| **R-PROPERTIES-PARITY — native Properties behavior** | S-25; exact core Properties behavior, focused-editor reactivity, metadataCache/editor sync, mobile/native preset expectations | NEXT |
| **R-NOTION-DB-TOOLBARS — Notion database/toolbars reference** | S-30; database view richness, toolbar organization, desktop/mobile patterns, what maps to presets vs primitives | LATER |
| **R-MOBILE-WIDGETS — homescreen widget layout patterns** | S-8/S-24/S-30; placement/resize/customization patterns for aesthetic dashboard/layout-builder inspiration | LATER |
| **R-UI-PRIMITIVES — Bits UI vs shadcn-svelte vs custom** | S-29; prototype one toolbar, popover/menu, drawer, checkbox variant under Obsidian-native + Notion-like presets | NEXT |
| **R-PANELDATA — panelData/charts/widgets/spreadsheet contract** | S-27; distinguish explorer table vs dashboard/widget/chart/timer panels; evaluate scripts and bridges to Dataview/Datacore/JS Engine/MetaBind before own sandbox | NEXT |
| **View-addressing canon — DEFERRED items** | Canvas modes/orientations · Charts modes + `form` · viewScope-as-filter + `in_explorer` + multi-provider col1 (NN) + per_surface filterScene · scoped-views composition/homescreen. Canon NOW-tier LOCKED 2026-06-18 → [[docs/architecture/explorer-model/05-view-canon\|05 View Canon]] / ADR 0012 | N3 (filter/composition) / N4 (Canvas/Charts) |

## Process

- Mark DONE → move the row up + link its output doc. Add new threads as they surface.
- Prefer parallel read-only Explore agents; keep each prompt self-contained + bounded.
- This doc + zoom-out-map + open-inventory together = the "where are we / what's open" surface
  (ties to the [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|memory-routing upgrade]]).

## Status

Created 2026-05-27 at dev request (stop repeating researches). Keep current. Two threads running
(Dynamic Views + serviceMark); results fold into bases-interop-findings / a serviceMark decision.
