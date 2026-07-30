---
title: Node map deferred iteration
type: research-shard
status: deferred
parent: "[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index|Explorer view platform and infinite canvas research]]"
created: 2026-05-15T11:04:05.8405765-05:00
updated: 2026-05-15T11:04:05.8405765-05:00
tags:
  - agent/research
  - explorer/views
  - explorer/map
  - explorer/performance
created_by: codex
updated_by: codex
---

# Node Map Deferred Iteration

## Scope Decision

The current recursive `ViewMarkmap.svelte` surface should be treated as a deferred future view, not part of the next Explorer View Platform release.

Terminology for future work:

- user-facing concept: `Map`;
- likely component name: `ViewNodeMap` or a final name chosen in the future map-specific spec;
- current legacy implementation: `ViewMarkmap.svelte`.

The next release should not expose Map as a selectable view option. This is a stability and performance decision: a view that can freeze Obsidian for minutes should not remain in the user-facing mode menu while the correct architecture is still unresolved.

## What Is Parked Here

All map-specific research, comparisons, specs, and plans are parked for a later iteration:

- whether to use upstream `markmap-view`, D3, `d3-flextree`, canvas, SVG, WebGL, or a hybrid DOM overlay;
- infinite-canvas runtime design;
- pan/zoom interaction model;
- world-coordinate layout and culling;
- LOD policy for labels, badges, media, edges, and actions;
- cancellation/yielding/worker strategy;
- large hierarchy expansion defaults;
- Obsidian CLI map-specific perf probes;
- user-facing map presets and settings.

The previous research remains useful as input, but it should not drive the next Explorer Platform pass. Future map work needs its own source record, spec, plan, and acceptance gates before the view is reintroduced.

## Required Future Acceptance Before Map Can Return

Map can become selectable again only after a dedicated iteration proves:

- switching to Map gives immediate visible feedback;
- layout/preparation is cancellable;
- large trees do not block the main thread for seconds;
- only visible nodes/edges/media are mounted or decoded;
- pan/zoom remains responsive under 10K-node datasets;
- focused/selected nodes remain coherent under culling;
- media slots are LOD-aware;
- comparable Obsidian CLI scenarios pass without captured errors;
- the view has declared feature parity exceptions instead of accidental missing behavior.

Until then, Map remains a future view, not a next-release option.

## Impact On Current Platform Pass

The current Explorer View Platform pass should continue with:

- shared projection;
- feature contract;
- view menu/preset contract;
- node anatomy/render-tag contract;
- decoration batching;
- scroll/geometry coordinator for linear views;
- media descriptor and visible media lifecycle;
- tree/list/table/grid/cards parity loops.

It should not include a Map rewrite, Map renderer selection, Map perf thresholds, or a selectable Map view.
