---
title: V.D Tree/List/Notebook Navigator Pipeline Discovery
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/research
  - initiative/hardening
  - explorer/performance
  - explorer/view-decomposition
  - explorer/virtualization
created_by: codex
updated_by: codex
---

# V.D Tree/List/Notebook Navigator Pipeline Discovery

Discovery record for the View Decomposition (`V.D`) workstream. It converts the 2026-05-25 code reading of Vaultman `viewTree`, Vaultman `ViewNodeList`, and Notebook Navigator navigation/list pipelines into durable evidence for the next implementation agent.

The narrow conclusion is that Notebook Navigator is not faster because its rows are visually lighter. Its navigation rows and file rows are often heavier than Vaultman's tree rows. It is faster because the render component consumes a final visible linear item list, while Vaultman's `viewTree.svelte` still owns a large part of the data pipeline.

## Shards

1. [[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/01-source-map-and-evidence|Source map and evidence ledger]]
2. [[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/02-pipeline-comparison|Three-way pipeline comparison]]
3. [[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/03-performance-hypotheses|Performance hypotheses and instrumentation targets]]

## Companion Spec

- [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection spec]]

## Executive Answer

`ViewNodeList` is fast because it is already a flat render adapter. Notebook Navigator is fast because it makes its tree look like a flat render adapter before render. Vaultman's `viewTree` is slower because it remains both a view and a tree projection engine.

The next V.D implementation should not begin with overscan tuning. It should split the Tree render pipeline so `viewTree.svelte` receives a visible, pre-decorated render projection:

```text
provider snapshot
  -> visible tree render projection
  -> id/index + ancestor/subtree metadata
  -> row decorations
  -> viewTree render shell
  -> TanStack virtual rows
```

## Key Findings

1. Notebook Navigator flattens only visible expanded branches. Its folder and tag flatteners do not materialize hidden collapsed descendants for render.
2. Notebook Navigator has a staged item pipeline: source state, tree sections, item pipeline, path index map, virtualizer, memoized row components.
3. Vaultman `ViewNodeList` is structurally similar to Notebook Navigator's final render stage, but has fewer visuals and fewer interaction surfaces.
4. Vaultman `viewTree.svelte` computes projection flattening, parent indices, ancestor arrays, subtree ranges, sticky rows, field values, badges, hover actions, highlight state, rename state, and scroll fallback inside one component.
5. `panelExplorer.svelte` feeds Tree with `snapshot.rows`, while the snapshot already has `visibleIds`. That makes Tree's render path process more data than the visible viewport contract requires.
6. Existing 50k evidence shows Tree passed blank-frame gates but had much worse event-loop delay than List: Tree p99/max `1051 ms`, List p99/max `43 ms`.

## Decision For V.D

V.D should treat Tree performance as an architecture boundary problem:

- move visible flattening out of `viewTree.svelte`;
- make the data-plane projection use visible row order as the render contract;
- precompute row metadata that is now recomputed per rendered row;
- use linear algorithms for ancestor/subtree metadata;
- keep TanStack Virtual unless evidence shows it is the bottleneck after the projection split;
- verify with the existing stress-vault scroll matrix before claiming parity.

