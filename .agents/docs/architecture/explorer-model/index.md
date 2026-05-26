---
title: Explorer Architecture Model
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - explorer/view-decomposition
  - explorer/model
---

# Explorer Architecture Model

Canonical structural model for Vaultman's Explorer and surfaces, from the
2026-05-26 foundation brainstorm. Term definitions live in
[[docs/architecture/glossary|glossary]]; per-decision status (LOCKED / PROPOSED /
DEFERRED) lives in
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|Decision Ledger]].
This doc states the structure; it does not restate decisions or term defs.

## The 8 dimensions

Core axes (orthogonal — a change on one should not force changes on the others):

- **Surface** — where content mounts + its layout region/lifecycle.
- **View** — how rows are rendered (pure renderer).
- **Node** — what is rendered (data atom + providers/indexes).
- **Logic** — what alters it (selection, dnd, decorate, action, grouping).

Cross-cutting:

- **Navigation** (a Logic sub-axis) — movement incl. Nav3D (x/y/z depth); DEFERRED detail.
- **Style/Theme** — tokens + ThemeBuilder; the "native" chameleon preset swaps DOM vocabulary.
- **Process** — agent/doc discipline, T.G test gates, publish release safety, agent-action API + AI skill.
- **Operations** — queue + diff/VFS + the agent-action layer; spans the core axes.

## Composition stack

| Layer | Construct | Dimension | Real code (today) |
|---|---|---|---|
| Composition | `frame ⊃ pages ⊃ tabs` (dock/tabbar/tiles/floating) | Surface | `frameVaultman`, `Dashboard3Column` |
| Surface-host | `tab` mounts a `Scene` (also: modal, pop-up, cmenu, codeblock) | Surface | `vaultman-tab-*`, `DetachedTabHost` |
| Scene | `{panels + primitives}` (excl. bars); movable; presets→explorer-builder | Surface+Node+Logic | *(unnamed today)* |
| Panel | `{engine + provider(s) + config}`: explorer-panel \| dashboard-panel | Surface/View boundary | `panelExplorer` |
| View | render engine instance (pure) | View | `views/*` |
| Overlays (cross) | bars (dock/toolbar/ribbon/statusbar pop-up), popover, cmenu, selection-box, drag-ghost, sticky, modal | — | `Toolbar`, `modals/` |
| Node | providers + indexes (files/metadata/content/media/search) | Node | `providers/*`, `index/*` |
| Logic | selection/dnd/decorate/badge/fnr/group/keyboard/action-routing | Logic | `services/*` |

`page` = PROPOSED editor-group on native Obsidian leaves/splits + `layout-config`.
`bars` are an overlay layer owned by the page/surface; a Scene only *declares* the
bars it wants, and the page-level LayoutModel resolver renders them per active Scene.

## Data flow

```text
provider (Node) -> snapshot -> render-projection (data-plane, DOM-free)
  -> render-runtime (shared, DOM: virtualize/scroll/measure/resize/dnd)
  -> View (pure renderer)
view-config bridges layout/theme <-> view (cell role -> slot/order).
Bases: IN = translate view-def/results -> our engines; OUT = registerBasesView + emit bases-* DOM.
```

## Shards

- [[docs/architecture/explorer-model/01-responsibility-map|01 Responsibility map]]
  — per-responsibility current→target owner (the Q16 grill artifact) + render ownership.
- [[docs/architecture/explorer-model/02-render-and-data|02 Render + data]]
  — engines × modes × orientation, NodeKinds, cell + view-config + Bases IN/OUT.

## Status

8-dimension model = LOCKED (Y4). Most structure LOCKED; `page=editor-group` and the
2-layer render ownership are PROPOSED (ADR candidates). Navigation/Controls are
DEFERRED. See the Decision Ledger for each item.
