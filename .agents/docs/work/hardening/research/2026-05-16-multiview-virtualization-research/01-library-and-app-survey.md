---
title: Library and app survey
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/research
  - explorer/virtualization
---

# Library And App Survey

## Evaluation Lens

The relevant question is not "which library scrolls fast in a demo?" The question is which approach can keep Vaultman responsive when the visible surface is a node explorer with several view modes, variable content, media, selection, keyboard reveal, drag/drop, sticky affordances, and future complex cards.

Each candidate is judged by:

- Svelte/headless fit;
- variable row or cell geometry;
- repeated far-jump behavior;
- support for multiple view shapes;
- ability to keep DOM bounded;
- whether it handles browser scroll-height limits or leaves that to us;
- compatibility with Obsidian styling, accessibility, and interaction.

## Survey

| Candidate | Useful facts | Vaultman read |
| --- | --- | --- |
| TanStack Virtual | Headless virtualizer with `estimateSize`, `measureElement`, `resizeItem`, `scrollToIndex`, `scrollToOffset`, `rangeExtractor`, `lanes`, `overscan`, `isScrollingResetDelay`, and optional native `scrollend` use. | Best default. It gives the right primitives but does not solve row projection, height indexing, blank fallback, or media scheduling by itself. |
| `virtua` | Multi-framework virtual scroller with Svelte support, dynamic size support, horizontal support, window scroll, reverse scroll, scroll-to-index, grid, sticky, and item resize support. Its own comparison table notes browser max element size support is not universal. | Worth a spike. It may reduce adapter code and dynamic-size edge cases, but must beat TanStack in the same `plugin-dev` burst-scroll test before replacing anything. |
| React Virtuoso | Excellent React component set for variable heights, grouped lists, grids, masonry, message lists, and scroll-seek placeholders. | Strong concept source. Not a direct Svelte fit unless wrapped/ported, which adds risk. The scroll-seek placeholder idea is valuable for high-velocity heavy rows. |
| MUI X Data Grid | Documents browser pixel limits for scroll containers and uses row/column virtualization with overscan buffers. | Useful warning source for 50k+ complex nodes. Not a Vaultman Explorer replacement; too table-specific and React-specific. |
| AG Grid | DOM virtualization for rows and columns, configurable row buffer, and a default max rendered row safety limit. | Strong table-mode reference. Its strict cap philosophy should influence Vaultman fallback rules: never render unbounded rows. |
| Glide Data Grid | Canvas-based data grid for dense spreadsheet-like surfaces. Designed around canvas rendering rather than per-cell DOM. | Candidate only for a future dense table view. Poor fit for Explorer-wide tree/list/cards because Vaultman needs native DOM semantics, Obsidian theming, selection, focus, menus, and node anatomy. |
| RecyclerListView | Uses deterministic layout providers and cell recycling across React/React Native. | Valuable pattern: known layout first, recycler second. Not a direct Svelte dependency target. |
| VS Code ListView | Application-owned virtual list with range mapping, cached row/template reuse, dynamic heights, transform positioning, and strict containment. | Important architecture pattern: the app owns the virtual layout and renderer pooling, not the library alone. Vaultman should move in this direction. |
| CodeMirror 6 | Editor view exposes viewport/visible-range concepts and updates only visible document ranges. | Pattern source for transaction-based viewport state and visible-range contracts. Useful mental model for projection revisions. |
| CSS `content-visibility` | Lets the browser skip rendering work for off-screen content when used with containment and intrinsic size. | Good supplementary optimization for heavy row/card internals. It is not a substitute for virtualization because DOM nodes still exist. |
| Scheduler APIs | `scheduler.postTask()` and `requestIdleCallback()` can move non-critical work out of the scroll path. | Useful for media/decorations after row text paint. Must have fallback paths because browser/Electron support varies. |
| Image primitives | `loading="lazy"` and `decoding="async"` allow images to avoid blocking critical paint/decode paths. | Required for future media-rich nodes. Rows must reserve dimensions and paint identity/text before image or GIF readiness. |

## Direct Source URLs

- TanStack Virtual API: https://tanstack.com/virtual/latest/docs/api/virtualizer
- TanStack Svelte Virtual: https://tanstack.com/virtual/latest/docs/framework/svelte/svelte-virtual
- `virtua`: https://github.com/inokawa/virtua
- React Virtuoso: https://virtuoso.dev/react-virtuoso/
- React Virtuoso scroll seek: https://virtuoso.dev/scroll-seek-placeholders/
- MUI X virtualization: https://mui.com/x/react-data-grid/virtualization/
- AG Grid DOM virtualization: https://www.ag-grid.com/javascript-data-grid/dom-virtualisation/
- Glide Data Grid: https://github.com/glideapps/glide-data-grid
- RecyclerListView: https://github.com/Flipkart/recyclerlistview
- VS Code ListView source: https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/ui/list/listView.ts
- CodeMirror reference: https://codemirror.net/docs/ref/
- MDN `content-visibility`: https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility
- MDN `scheduler.postTask()`: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask
- MDN `requestIdleCallback()`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
- MDN image `decoding`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decoding
- MDN image `loading`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading

## Non-Decision

Do not adopt any candidate solely because a demo feels faster. The adoption gate is a shared harness: same 50k/100k fixture, same top/middle/bottom burst, same media descriptors, same blank-frame detector, same `plugin-dev` runtime.
