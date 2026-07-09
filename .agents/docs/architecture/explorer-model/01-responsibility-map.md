---
title: Explorer Model — Responsibility Map
type: architecture
status: active
parent: "[[docs/architecture/explorer-model/index|Explorer Architecture Model]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - explorer/view-decomposition
  - explorer/responsibilities
---

# Responsibility Map

Per-responsibility assignment: where it lives TODAY (tangled) vs the TARGET owner
under the 8-dimension model. This is the artifact for the Q16 grill (node vs
explorer vs view). LOC/paths from the service-web research
([[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/research-streams|streams]]).

## Current → target

| # | Responsibility | Current owner (tangled) | Target owner | Dimension |
|---|---|---|---|---|
| 1 | data fetch / index | providers (files/props/tags/…) **+ logic + Obsidian-binding** | provider (data only) | Node |
| 2 | snapshot (rows/visibleIds/idToIndex) | `logicExplorerSnapshot` (pure) ✓ | keep | Logic (pure) |
| 3 | **projection** (flatten, parent/ancestor/subtree, cell-placement) | inside `viewTree.svelte` ✗ | render-projection builder (per engine) | Logic (data-plane) |
| 4 | **decoration** (badges/icons/highlights/fields/live-preview) | `serviceDecorate` 107 + computed in views ✗ | `serviceDecorate` → descriptors on projection | Logic |
| 5 | selection / focus / active | `serviceSelection` 277 ✓ | keep (contract) | Logic |
| 6 | dnd | `serviceDnd` 322 + `serviceManualDnd` 220 | keep; dnd-kit interaction in runtime | Logic + render-runtime |
| 7 | action / cmenu / keyboard (A.R ✓) | `serviceRowAction`/`serviceKeyboardNav` ✓ | ActionProvider → ActionNodes | Logic |
| 8 | **row render** (DOM/markup/virtualizer) | the 5 views (also do 3+4) ✗ | View (pure) + shared render-runtime | View |
| 9 | **mount / host** | `panelExplorer` + `ViewHost` + `VaultmanFrame` (braided) ✗ | Surface adapters + Scene | Surface |
| 10 | **orchestration** (expansion/search/sort/badge-bubble/selection-auth) | `panelExplorer` 1275 LOC ✗ | Panel-scoped orchestrators (P.D); Scene composes | Surface+Logic |
| 11 | grouping | not built | `serviceGroup` → ContainerNodes | Logic→Node |
| 12 | navigation (incl Nav3D) | not isolated | Navigation controller | Logic sub-axis (DEFERRED) |
| 13 | operations (queue/diff/VFS) | `serviceQueue`/`serviceDiff` | Operations domain + `OperationNode` | Operations |
| 14 | style / theme / layout | `serviceTheme`/`serviceLayout` | ThemeBuilder + LayoutBuilder | Style/Theme |

Bold rows (3,4,8,9,10) = today mis-placed (mostly inside `viewTree` 1188 LOC +
`panelExplorer` 1275 LOC). Fixing them = the core of V.D + P.D + N.R. Note (2026-05-26
code check): `ViewHost.svelte` is now 260 LOC — already slimmed to a pure view-mode
switch (mounts the engine + holds `ViewHostService` for viewMode/preset/mask), so the
Surface⟂View braid is mostly cut there; `panelExplorer` is the sole remaining god-object.

## First structural move (LOCKED, Q4)

Extract pure logic out of the god-providers/views first:
`logicFiles` · `logicProps` · `logicTags` · `logicBadge` · `logicFnR*`. Then
decouple view mounts from provider sync via an explicit host service. Only then
build the shared primitive (N.R) + view shells (V.D).

## Render ownership — 2 layers (PROPOSED; ADR candidate)

"View = pure renderer" means pure of DATA, not pure of its DOM runtime. Split:

| Concern | Owner | Layer |
|---|---|---|
| visible order · indices (`idToIndex`) · grouping · cell-placement · decoration descriptors · applied size-marks | render-projection builder (per engine) | **Data-plane (Logic, DOM-free)** |
| virtualizer (tanstack-virtual) · scroll element/state · visible-range | `serviceVirtualizer` (shared) | **Render-runtime (View-side, shared)** |
| text/height measurement (pretext) | `serviceTextMeasure` (shared) | Render-runtime |
| node-resizer (drag resize) | runtime emits a **size-mark** → `serviceMark` (durable) → projection re-reads | runtime emits; data-plane consumes |
| table columns/sort/selection (tanstack-table) | Table engine runtime (order/visibility from view-config) *(corregido 2026-07-09 al canon 05-view-canon/ADR 0012: "Table" is a Geometry MODE, not a separate engine — read as "Geometry(table) runtime")* | Render-runtime |
| dnd interaction (dnd-kit) | shared dnd runtime → intent → `serviceDnd`/`serviceManualDnd` → operations/reorder-marks | Render-runtime emits; Logic decides |

Keys: the render-runtime is **shared across engines** (one virtualizer/measure/dnd
layer, not reimplemented per engine — that duplication is today's `viewTree`
1051 ms p99). The node-resizer never mutates a node directly; it emits a durable
size-mark that flows back through the data-plane.

## Resolved (2026-05-26 grill)

- Orchestration ownership: **Panel-scoped controllers** + panel **kinds** + Selection/Dnd as
  scope-generic **axons** + **input→action** routing. Detail:
  [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|04 panels / axons / mutation / layout]].
- `page = editor-group` (ADR 0007) and the 2-layer render ownership (ADR 0008) = **Accepted**.
- Remaining micro-opens: `panelContent` vs `ContentNode`; the `PanelHandle` contract shape.
