---
title: Patterns better than Notebook Navigator
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/research
  - explorer/performance
  - explorer/scroll
---

# Patterns Better Than Notebook Navigator

Notebook Navigator is fast because its scroll path is bounded, synchronous, height-aware, and media-decoupled. Vaultman can go beyond that because it can design a shared multi-view layout layer instead of optimizing only one main list and one navigation tree.

## 1. Virtual Layout Service

Each view should consume one shared layout service rather than rediscovering geometry locally.

Required operations:

- `count()`;
- `estimatedSize(index)`;
- `measuredSize(index)`;
- `topForIndex(index)`;
- `indexForOffset(offset)`;
- `visibleRange(scrollTop, viewportHeight, overscan)`;
- `totalSize()`;
- `measure(index, size, revision)`;
- `scrollToId(id, align, minRevision)`;
- `scrollToIndex(index, align)`.

Implementation by view:

- fixed list/tree: direct arithmetic;
- variable table rows: prefix/Fenwick offset index;
- grid/cards rows: lane-aware row geometry, not per-card scan;
- masonry/future visual layouts: separate layout family, not forced through a flat row model if row height assumptions break down.

The current `createExplorerVariableGeometry().topForIndex()` loop is a known anti-pattern for deep jumps because it sums from `0` to `index` every time.
That must become O(log n) or O(1) with a revisioned cache.

## 2. Zero-Blank Fallback Contract

When the virtualizer returns no items while `rowCount > 0` and the viewport is visible, Vaultman must not return an empty window and must not render all rows.

Fallback should:

- derive a bounded range from the layout service;
- keep the previous valid visible window for one frame when geometry is being recalculated;
- use placeholders only for expensive row internals, not for row identity;
- report a metric whenever fallback activates.

This is stricter than ordinary overscan tuning. It makes blank windows a test failure rather than a visual side effect.

## 3. High-Velocity Scroll Seek

React Virtuoso's scroll-seek pattern is the right idea for complex rows:
during very fast scrolling, keep cheap placeholders or reduced row internals, then hydrate content when scrolling settles.

Vaultman's version should preserve:

- row id;
- text label;
- icon slot or fixed placeholder;
- selection/focus marker;
- stable row/card dimensions.

It may defer:

- badges;
- hover tools;
- thumbnails;
- GIF animation;
- expensive metadata snippets;
- decorations that require async service calls.

This avoids the current failure mode where reducing work can accidentally remove too much visible content and make the list look blank.

## 4. Browser Pixel Limit Awareness

MUI documents browser scroll-container pixel limits around tens of millions of pixels. A 50k node list at 32 px is safe. A 50k card view at 400-900 px is not.

Vaultman needs a total-size policy:

- below warning threshold: normal virtualizer spacer;
- near threshold: log metric and prefer compact estimates;
- above threshold: segmented/two-level virtualization or compressed scroll mapping.

Without this, a future media-rich card view can exceed browser limits even if the DOM window is small.

## 5. Two-Dimensional Virtualization For Tables

Table mode should not be treated as just a vertical list of rich rows forever.
Data-grid sources converge on the same design:

- virtualize rows;
- virtualize columns when column count grows;
- cap mounted cells;
- keep headers/sticky surfaces outside the row loop;
- avoid measuring every off-screen cell.

AG Grid and MUI are not direct replacements, but their row/column cap model is the correct table-mode target.

## 6. Media Budget And Decode Isolation

Notebook Navigator already proves that images/GIFs must not be scroll prerequisites. Vaultman should make that a platform rule:

- structural row projection carries only media descriptors;
- visible rows reserve media dimensions synchronously;
- image/blob fetch and decode are cancellable by visibility;
- images use lazy loading and async decode where browser/Electron allows;
- animated media should prefer a poster/static preview until visible and settled;
- media load updates only that row/card's measured size, not the full list.

## 7. Scheduler-Based Hydration

The critical scroll frame should do the minimum needed to paint row identity and geometry. Everything else should run by priority:

- immediate: scroll offset, visible range, row shell, text;
- user-visible task: selection/focus, active badges;
- background/idle task: non-visible decorations, thumbnails, expensive previews;
- canceled task: work for rows that left the viewport.

Use `scheduler.postTask()` when available and a small `requestIdleCallback()` / `setTimeout` fallback when not. Do not put mandatory geometry updates only in idle work.

## 8. Renderer Pooling And Stable Child Boundaries

VS Code and recycler-style systems treat row rendering as a cacheable template problem. Vaultman should apply the same principle without abandoning Svelte:

- stable item keys from node ids or row composition ids;
- memoized/heavy child components split from the scroll shell;
- row shell CSS containment;
- compositor-only transforms for virtual row positioning;
- no reactive subscriptions inside every row that fan out across the whole Explorer on each scroll.

The target is not fewer features. It is a thinner critical row shell that can survive fast scroll while richer content hydrates around it.
