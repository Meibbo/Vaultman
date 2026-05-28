---
title: Explorer Model — Visual Map
type: visual-map
status: active
parent: "[[docs/architecture/explorer-model/index|Explorer Architecture Model]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/visual
  - explorer/model
---

# Explorer Model — Visual Map

## Sources

- [explorer-model](../index.md) · [responsibility map](../01-responsibility-map.md) · [render + data](../02-render-and-data.md)
- [decision ledger](../../../work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger.md)
- [ADRs](../../adr/README.md) · [glossary](../../glossary.md)

## 8 dimensions

```mermaid
flowchart TB
  core["Core axes (orthogonal)"]
  core --> Surface
  core --> View
  core --> Node
  core --> Logic
  cross["Cross-cutting"]
  cross --> Navigation["Navigation (Logic sub-axis)"]
  cross --> Style["Style / Theme"]
  cross --> Process
  cross --> Operations["Operations (spans axes)"]
```

## Data flow (render pipeline)

```mermaid
flowchart LR
  prov["provider (Node)"] --> snap["snapshot"]
  snap --> proj["render-projection<br/>data-plane, DOM-free"]
  proj --> rt["render-runtime<br/>shared DOM"]
  rt --> view["View (pure renderer)"]
  vc["view-config<br/>(superset of Bases view-def)"] -. role to slot .-> proj
  bases["Bases IN / OUT"] -. translate / emit bases-* .-> vc
  rt -. size-marks .-> proj
```

## Composition stack

```mermaid
flowchart TD
  frame["frame"] --> page["page = editor-group (ADR 0007)"]
  page --> tab["tab = surface"]
  tab --> scene["Scene {panels + primitives}"]
  scene --> panel["Panel {engine + provider + config}"]
  panel --> engine["View engine × mode × orientation"]
  bars["bars / overlays (page layer)"] -. declared by .-> scene
  surfaces["other surfaces: modal · pop-up · cmenu · codeblock"] -. host .-> scene
```

## Render ownership (ADR 0008, Accepted)

```mermaid
flowchart LR
  subgraph data["Data-plane (Logic, DOM-free)"]
    order["order · idToIndex · grouping · cell-placement · decoration descriptors · size-marks"]
  end
  subgraph runtime["Render-runtime (View-side, SHARED)"]
    virt["tanstack-virtual · scroll · pretext measure · node-resizer · tanstack-table · dnd-kit"]
  end
  order --> virt --> View
```

## Status

| Decision | Status | Source |
| --- | --- | --- |
| 8-dimension model | accepted | [ADR 0001](../../adr/0001-eight-dimension-model.md) |
| View = pure renderer | accepted | [ADR 0002](../../adr/0002-view-pure-renderer.md) |
| Cell + view-config (Bases-aligned) | accepted | [ADR 0003](../../adr/0003-cell-view-config-bases-aligned.md) |
| PlatformAdapter + Fragility Registry | accepted | [ADR 0004](../../adr/0004-platform-adapter-fragility-registry.md) |
| ActionNode unification | accepted | [ADR 0005](../../adr/0005-actionnode-unification.md) |
| Publish channel split | accepted | [ADR 0006](../../adr/0006-publish-channel-split.md) |
| Page = editor-group | accepted | [ADR 0007](../../adr/0007-page-editor-group.md) |
| Render ownership 2-layer | accepted | [ADR 0008](../../adr/0008-render-ownership-two-layer.md) |

Detailed responsibility ownership (current → target) is the table in
[01-responsibility-map](../01-responsibility-map.md), not duplicated here.
