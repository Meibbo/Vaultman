---
title: Explorer Model — Render + Data
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
  - explorer/engines
  - explorer/interop
---

# Render + Data

Engines/modes, node kinds, the cell/view-config bridge, and Bases IN/OUT. Term
defs: [[docs/architecture/glossary|glossary]]. Decision status:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|Decision Ledger]].

## Engines × modes × orientation

> **⚠ SUPERSEDED (2026-06-18):** the table below (`orientation = h/v`; Table as an
> engine; group-box mode) is STALE. The live canon is
> [[docs/architecture/explorer-model/05-view-canon|05 View Addressing Canon]] — orientation is rich
> (engine-specific) with h/v moved to a `direction` axis; Table is a Geometry mode; group-box is a
> composition; Charts is the 4th engine. This section will be archived to `docs/archive/` once shard
> 05 stabilizes (archive-superseded discipline). Do not treat the table below as canonical.
> *(corregido 2026-07-09 al canon 05-view-canon/ADR 0012: the canon's NOW-tier has been LOCKED and
> ADR 0012 Accepted since 2026-06-18 — this is no longer "in progress," it is superseded outright.
> The table is retained here only as historical pre-canon reference, per the canon's own Landing TODO
> to archive shard 02's engine table once stable; it has not yet been archived.)*

No fixed "5 views" — a few engines, each with modes, plus an `orientation` flag
(horizontal/vertical), plus externally registered views (Bases-out / third-party-via-Bases).

| Engine | Modes | Orientation | Notes |
|---|---|---|---|
| Linear | tree-indent · flat-list · tiles · miller/ranger | h/v | `viewList` = flat mode; `tiles` = detailed-row mode (proto viewTiles), richer than flat-list; tree-indent + horizontal = miller columns |
| Geometry | grid-icons · cards · group-box | flow h/v | cards = grid mode under the "native" preset (emits `bases-cards-*`); group-box = ContainerNode (homescreen folder); in-folder vs expand-below = expansion sub-mode |
| Table | column | transpose (rows↔columns) | tanstack-table runtime; column order/visibility from view-config |
| Canvas | mindmap · graph | dynamic/static | json-canvas-like (4th engine) |

`view-config` selects engine + mode + orientation; default = view-per-explorer,
per-level (heterogeneous) view is opt-in via the view menu or an assignable action.

## NodeKinds

`File · Prop · Tag · Content · Plugin · Snippet · Adopted · Action · Icon ·
InputBinding · Container · Operation · Theme · Layout`. `metadata` = supertype
over tag/prop/nestedprop(TBD)/value/inline-prop(`key:: value`). `Adopted` =
headers/tasks/blocks + content paragraphs belonging to a header. `status-cell`
is NOT a node.

## Cell + view-config (the layout↔view bridge)

- `Cell` = `source` ({in|cross}-provider field, incl. note-preview N lines) +
  `semantic role` (title/subtitle/meta/media/cover/badge…). Cells do not own position.
- `view-config` maps `semantic role → slot/position/order` per engine+mode;
  user-editable in the LayoutBuilder; the import/export bridge to Bases.
- Cross-provider cells = C.D generalized: any element/column may pull a field from
  another provider (e.g. a file-explorer column = a property value per file-node).

## Bases IN / OUT (Bases-grounded; see research-streams)

- **OUT**: `registerBasesView` exists (web-lab `app.js`) + emit Bases DOM (confirmed
  in `app.css`): `bases-tr/-td/-table/-thead/-tbody`, `bases-cards-item/-container/
  -cover/-label/-property`, `mod-title`, `bases-toolbar*`, `bases-view`. Our renderers
  emit these under the "native" preset.
- **IN**: translate a Bases view-def (`name`/`filters` confirmed; `type`/`order`/
  `groupBy`/`summaries`/`limit` standard) + results → our engines. Only Bases-registered
  third-party views are reachable (no generic plugin-view embed API).
- Residual API-shape gaps (`BasesView` method names, `entry.getValue`,
  `note.`/`file.`/`formula.` namespacing) → the B.P translator spec.

## serviceGroup + adopted (Node-axis composition)

- `serviceGroup`: group-by-cell-value or manual-group → `ContainerNode`s; group
  toggle on/off; convert-to-real-folder. Supersedes parts of
  [[docs/work/hardening/specs/2026-05-04-explorer-view-service/09-groups-sorting-templates|view-service/09]].
- adopted-nodes: cross-provider child composition (own service, extends
  `serviceAdoption`); chain `container→metadata→files→outline→content`; an opt-in
  enriched nav mode (vs selecting nodes as scope filters).

## Operations domain

queue + diff/**VFS** + agent-action layer (`read→plan→enqueue→preview→execute`
via the public API + the AI skill). `OperationNode` kind; the queue is an explorer
of OperationNodes. `live-preview` = a `serviceDecorate` pending-op layer (shows the
rename-op value before commit); `marks` (`serviceMark`) = durable view-state, separate.
