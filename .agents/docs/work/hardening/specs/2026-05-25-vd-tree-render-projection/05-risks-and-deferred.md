---
title: Risks And Deferred Work
type: spec-shard
status: draft
parent: "[[index|V.D Tree Render Projection]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/view-decomposition
  - explorer/performance
---

# Risks And Deferred Work

## Risk: `visibleIds` Semantics Are Misread

`visibleIds` is produced by `logicExplorerSnapshot` only when ancestors are visible. The next agent must verify this with a unit test before depending on it. If provider-specific snapshots ever use a different meaning, the projection builder must own normalization.

Mitigation:

- test collapsed, expanded, and mixed topology snapshots;
- log structural versus visible row counts in perf output.

## Risk: Legacy Tests Depend On Projection Rows Being "Already Visible"

Some tests may have used generic `ExplorerProjection` as a visible-row list.
The new `TreeRenderProjection` makes that explicit. Do not mutate generic `createExplorerProjection` semantics for all views just to satisfy Tree.

Mitigation:

- keep `ExplorerProjection` generic;
- add `TreeRenderProjection` as a Tree-specific contract;
- update Tree tests to reference the Tree-specific contract.

## Risk: Row Decoration Is The Remaining Hotspot

After moving projection, `treeRow` may still spend too much time computing badges, fields, hover badges, and highlights.

Mitigation:

- keep instrumentation around row decoration helpers;
- move badge/field decoration into a follow-up projection decorator only if measured cost justifies it;
- avoid extracting a `TreeRow` component before measuring.

## Risk: Sticky Rows Depend On Copied Ancestor Arrays

The current sticky calculation expects ancestor indices. A more compact parent link model would reduce allocation but would require more view changes.

Mitigation:

- preserve copied `ancestorIndices` in the first slice;
- revisit parent-link representation after performance measurements.

## Risk: Scroll Fallback Still Causes Delay

Projection split may reduce build cost but leave per-scroll invalidation from `fallbackScrollTop`, `renderedVirtualRows`, and `stickyRows`.

Mitigation:

- measure `computeStickyRows` and coverage checks;
- keep Notebook Navigator's version-gated scroll model as a follow-up;
- do not combine scroll rewrite with projection split unless the projection split alone is proven insufficient and tests are already green.

## Deferred: Full NodeRow Primitive

The umbrella lists N.R before V.D as a broader architecture dependency. This Tree projection slice intentionally avoids introducing a shared NodeRow primitive. It should make that later primitive easier by cleaning the data contract first.

## Deferred: Full View Decomposition

This spec handles Tree render projection only. Remaining V.D work can later split:

- row primitive/shared row model;
- view shell boundaries for Table/Grid/Cards/List;
- panel orchestrator ownership;
- mount-context specific wrappers;
- native DOM vocabulary adapters.

## Deferred: Notebook Navigator Scroll Queue Port

Notebook Navigator's index-version and pending-scroll model is valuable, but it is not the first Tree fix. Port it only after the visible projection split, or the next agent will have two interacting sources of performance change.

## Deferred: Virtualizer Replacement

Do not replace TanStack Virtual in this slice. Both Vaultman and Notebook Navigator use TanStack Virtual 3.13.x. The current evidence points to upstream data shape, not the virtualizer engine, as the primary gap.

