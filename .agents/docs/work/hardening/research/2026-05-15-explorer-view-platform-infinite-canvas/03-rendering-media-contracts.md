---
title: Rendering primitive roles and node media slot contract
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index|Explorer view platform and infinite canvas research]]"
created: 2026-05-15T10:22:12.3257686-05:00
updated: 2026-05-15T11:04:05.8405765-05:00
tags:
  - agent/research
  - explorer/views
  - explorer/rendering
  - explorer/media
  - explorer/performance
created_by: codex
updated_by: codex
---

# Rendering Primitive Roles And Node Media Slot Contract

## User Decision Captured

The Explorer View Platform pass must treat node media as a platform capability, not as a local Cards-only improvement.

Every Explorer node should be able to expose at least one representative image.
Showing or hiding that image is part of the view menu `btnNodeElementsVisibility` control for granular node elements when the active view is not using the native Obsidian preset. The exact parity plan with native Obsidian Bases behavior is deferred, but the platform contracts must reserve this capability now. A later parity plan can decide the precise user-facing settings, formula/property behavior, and edge cases, but the first platform spec should not close without a node media slot.

The image/media element defaults off in every view because nodes already have icons. This keeps the initial geometry and visual density conservative. The descriptor still exists so the element can be enabled explicitly through `btnNodeElementsVisibility` without rebuilding the data model.

This changes the design target:

- projection rows need a media descriptor layer;
- feature contracts need to declare whether a view can display media and under which density or mode;
- geometry must include text plus media dimensions before render;
- lifecycle must lazily load visible media without putting blobs into structural snapshots;
- future Map work must include media-aware LOD and viewport culling, but Map is deferred outside the next release scope.

## Local Surfaces Already Present

- `src/services/serviceTextMeasure.ts` already wraps `@chenglou/pretext` through `pretextTextMeasureEngine`, with a fallback text measure engine.
- `src/services/serviceNodeCardLayout.ts` uses `TextMeasureService` to compute card text fields, line counts, buckets, and heights.
- `src/services/serviceNodeRowMeasure.ts` uses the same text measure boundary for variable row height caching.
- `src/services/serviceExplorerMediaCache.ts` already exists from EDP-007 as the media cache boundary. It stores media metadata separately from blobs, supports visible blob loading, and exposes file/node subscriptions.
- `ViewNodeList.svelte`, `viewTree.svelte`, `ViewNodeTable.svelte`, `ViewNodeGrid.svelte`, and `ViewNodeCards.svelte` already use TanStack virtualizers in some form. The platform pass should consolidate how those virtualizers receive geometry, focus, scroll intent, and decorations.
- `viewTree.svelte` already uses Svelte snippets and `{@render ...}` for local row markup reuse. The platform pass can lift that idea into a typed node render contract, but render tags are a composition primitive, not a runtime performance primitive.

## Pretext Role

Pretext should participate as the deterministic text geometry engine.

It should not become a renderer and should not own view state. Its job is to predict text line breaks, text height, and truncation inputs without DOM layout reads. This is valuable for tree/list/table/grid/cards because the platform needs stable geometry before deciding what to render. It will also be relevant to the future Map iteration, but Map is not part of the immediate platform pass.

Recommended role:

- measure labels, snippets, badges-as-text, secondary metadata, and card fields;
- cache prepared text by stable text/style/revision keys;
- expose estimates through a shared geometry adapter, not per-view ad hoc calls;
- combine with media dimensions to produce final node box estimates;
- keep DOM `measureElement` as verification/correction for surfaces that still need it, not as the first hot-path measurement strategy.

This means media changes `serviceNodeCardLayout` and row measurement design:
text is only one input. The geometry coordinator should compose text metrics, media aspect ratio, view density, and feature flags into the final row/card/node size.

## TanStack Role

TanStack Virtual should remain the viewport engine for linearized scroll surfaces.

It is appropriate for:

- list rows;
- tree rows after projection flattens visible nodes;
- table rows and, where needed, columns;
- card/grid lanes;
- future side panels or search/result lists that accompany a Map view.

It is not the whole future Map runtime. Pan/zoom surfaces need a world-coordinate scene model, viewport culling, LOD, cancellation, and chunked layout. That work is parked for the future Map iteration and should not be included in the next platform spec.

The platform coordinator should be the owner of:

- item count and stable keys;
- estimate size;
- measured size corrections;
- scroll-to-node and reveal-node intent;
- range extraction/overscan policy;
- sticky/focused/selected rows that may need to remain mounted;
- virtualizer invalidation when text/media geometry changes.

Views should consume this instead of each view rediscovering scroll state and measurement policy.

## Render Tag / Snippet Role

Svelte snippets and `{@render ...}` should be treated as the UI anatomy contract for node chrome.

The platform should define a shared node rendering surface with slots such as:

- leading affordance: disclosure, drag handle, file/type icon;
- primary label;
- secondary metadata;
- badge/decorations;
- media slot;
- action area;
- selection/focus/hover state;
- error/loading placeholders.

This does not mean every view must render the same DOM. It means every view gets the same typed node render input and must explicitly choose which anatomy parts it supports. A render-tag/snippet contract would reduce parity drift without forcing table cells, card nodes, dense list rows, and a future Map into the same layout.

Important boundary:

- render tags compose markup;
- they do not solve projection, scheduling, geometry, or media caching;
- they should be downstream of the shared projection and feature contract.

## Node Media Contract

The source of truth should be a media descriptor, not a blob inside the structural projection.

Minimum descriptor fields for the spec:

- `nodeId`: semantic Explorer node id;
- `targetKey`: file path or stable node target key;
- `sourceKind`: property, formula, attachment, external URL, generated preview, fallback color, or deferred/unknown;
- `status`: unprocessed, loading, ready, stale, error, or unavailable;
- `mediaKey`: stable cache key when a concrete media object is known;
- `dimensions`: width, height, and/or aspect ratio when known;
- `fit`: cover, contain, or view default;
- `alt`: accessible text derived from file/property/context;
- `revision`: media descriptor revision independent from structural row revision.

Projection rows can carry the descriptor, but not decoded image blobs. Blob loading remains a lifecycle/media-cache concern. This matches the existing EDP-007 direction: media and derived content live outside structural snapshots, with visible node/file subscriptions and bounded blob loading.

First platform implementation should support one primary image slot per node.
Native Obsidian Bases parity should be a follow-up plan that maps:

- card cover image property;
- local attachment links;
- external URLs;
- hex color fallback;
- cover/contain fit;
- aspect-ratio controls;
- `image()` formula outputs.

## View Contract Implications

The phrase "all nodes can show at least one image" should be implemented as a capability invariant, not as an obligation for every density to display a large thumbnail at all times.

Each view should declare media behavior:

- Tree: supports a compact thumbnail slot only when explicitly enabled through `btnNodeElementsVisibility`; default dense mode shows no image while still accepting the descriptor.
- List: same as Tree, with a fixed compact thumbnail policy before enabling variable row heights.
- Table: image can be rendered as a column/cell value only after explicit opt-in; row height policy must be explicit before allowing tall previews.
- Grid/Cards: primary media surfaces when enabled, but still default off. When enabled, these should reserve a media region using known aspect ratio or placeholder dimensions before the blob loads.
- Future Map: media must be LOD-aware, but this is deferred with the Map iteration. Large images should not be decoded or mounted outside the viewport buffer when Map eventually returns.

The feature contract should distinguish:

- accepts media descriptor;
- renders media placeholder;
- renders ready media;
- supports error state;
- supports external URL media;
- supports generated preview media;
- supports color fallback;
- supports user-configurable fit/aspect ratio.

## Feedback Loops To Add Before Product Rewrites

The spec should add media to the first feedback loop slice, because media geometry can regress the same surfaces that 0-H just stabilized.

Tests and probes:

- projection test: every node row can carry zero/one primary media descriptor without changing structural snapshot semantics;
- feature contract test: each view declares media support and unsupported states explicitly;
- media cache test: visible-node subscriptions load only visible blob records;
- geometry test: text-only and text-plus-media dimensions are stable for list, tree, table, grid, and cards;
- DOM/component test: media-ready, media-loading, stale, and error states do not throw and do not cause unbounded remounts;
- performance probe: 10K node list/tree/card datasets with media descriptors, placeholders, and a visible ready subset;
- view menu test: image/media visibility can be toggled as a granular node element outside the native Obsidian preset without removing the descriptor from projection.

Metrics to add:

- `node-media-descriptor-build`;
- `node-media-visible-subscribe`;
- `node-media-blob-load-visible`;
- `node-media-layout`;
- `virtualizer-media-invalidation`;
- `view-menu-media-toggle`;
- long-frame counts and maximum frame duration for media-heavy mode switches.

## Spec Impact

The Explorer View Platform spec should include these gates before implementation starts:

1. Shared projection includes media descriptor layer.
2. Feature contract includes render anatomy and media capability declarations.
3. Geometry coordinator composes Pretext text metrics with media dimensions.
4. TanStack virtualizer adapters consume coordinator estimates and invalidation events.
5. Render-tag/snippet contract defines node chrome anatomy for all Svelte views.
6. Media lifecycle uses `ExplorerMediaCache` boundaries and visible blob loading.
7. View menu `btnNodeElementsVisibility` can show/hide the primary media slot outside the native Obsidian preset without corrupting projection or geometry caches; the slot defaults off in every view.
8. Map/ViewNodeMap media-aware LOD, culling, cancellation, and placeholder geometry are deferred to the future Map iteration.
9. Native Obsidian Bases image parity remains a named follow-up plan, not an implicit promise inside the first platform pass.
