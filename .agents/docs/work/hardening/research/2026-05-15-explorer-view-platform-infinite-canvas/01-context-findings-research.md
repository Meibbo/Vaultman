---
title: Context, findings, and research
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/index|Explorer view platform and infinite canvas research]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T11:04:05.8405765-05:00
tags:
  - agent/research
  - explorer/views
  - explorer/performance
created_by: codex
updated_by: codex
---

# Context, Findings, And Research

## Context

This record captures the post-0-H diagnosis and design direction discussed
after Explorer 0-H virtualizer + list mode was implemented and audited on
canonical branch `claude/explorer` in worktree
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`.

The user reported that the problem is not only `props`; it is a general
Explorer platform issue across multiple providers and views:

- Providers include at least `files`, `content`, `outline`, `props`, `tags`,
  `plugins`, and `snippets`.
- Views include `tree`, `list`, `table`, `grid`, `cards`, and `markmap`.
- The 10K stress test that exposed the worst scroll bleed is files-oriented,
  not properties-oriented.
- `ViewNodeList` now performs roughly like Notebook Navigator in the 10K file
  list test, though both Vaultman and Notebook Navigator flicker on continuous
  short/medium jumps.
- `viewTree` remains the worst performing surface.
- `markmap` is currently a critical UX violation: switching to the view can
  freeze the app and has been observed taking up to six minutes.
- Views are not feature-harmonized: badges are not consistently shown, box
  selection regressed in tree, and selection/actions differ by surface.

The user explicitly wants navigation and visualization to be non-negotiably
responsive. A loading/landing state may be shown, preferably the existing
orbiting landing, but it must be immediate feedback while work continues, not a
mask over a blocked main thread.

Scope correction from the follow-up brainstorm: the current `markmap` view will
be renamed conceptually to `Map`, but should be deferred to a separate future
iteration. The next release should not expose Map as a selectable option until
the dedicated Map spec/plan proves stability and performance. The current
platform pass should focus on tree/list/table/grid/cards, shared projection,
feature/view-menu contracts, geometry, decoration batching, and node media.

## Local Code Findings

`ViewMarkmap.svelte` is not using the upstream `markmap-view` renderer. It is a
recursive DOM/flex layout:

- Every node renders as `.vm-markmap-card`.
- Every child branch recursively renders `.vm-markmap-branch`,
  `.vm-markmap-children`, and `.vm-markmap-edge`.
- The whole tree is mounted at once inside `.vm-markmap-view`.

For large hierarchies, this is the wrong rendering model. It makes the browser
resolve a deep DOM tree, nested flex layout, cards, edges, and event handlers
for every node before the user can interact.

`ViewNodeList.svelte` is fixed-height and simple. The 10K file list result
suggests that fixed-height list virtualization is not the current primary
regression. The same cannot be assumed for tree/table/grid/cards, where
expansion, variable geometry, or nested hierarchy can make scroll lookup and
mount stabilization expensive.

`panelExplorer.svelte` still mixes several concerns:

- provider refresh and `getTree()`;
- per-view derived rows;
- selection pruning;
- feature routing;
- scroll target creation;
- mode-specific view wiring;
- file-only data-plane snapshot publishing.

The long-term direction should be a deeper Explorer platform rather than a
local patch in one view.

## Notebook Navigator Findings

Notebook Navigator's strongest pattern is in the file list, not merely the
navigation tree. Relevant patterns from
`C:\Users\vic_A\Desktop\notebook-navigator`:

- `useListPaneData` builds list data, grouping, file-path indexes, search
  metadata, and filtered row items before render.
- `useListPaneScroll` owns scroll orchestration: pending intents, priority,
  index versioning, container readiness via `ResizeObserver`, late index
  resolution, and RAF stabilization.
- `ListPaneVirtualContent` only renders the current virtual window and keeps
  sticky headers separate from row generation.
- Measurements are explicit and based on row content: preview, feature image,
  tags, properties, parent folder, compact mode, group headers, and spacers.
- Hover state is suppressed while scrolling and re-synchronized from pointer
  position after the virtualizer stops scrolling.

Vaultman should not copy React code literally, but it should copy the division
of responsibility: data projection, measurement model, scroll orchestration,
and render adapter should be distinct modules.

## Online Research Summary

Sources consulted:

- tldraw performance and culling docs:
  https://tldraw.dev/sdk-features/performance and
  https://tldraw.dev/sdk-features/culling
- Cytoscape.js performance docs:
  https://js.cytoscape.org/index.html#performance
- React Flow performance and API docs:
  https://reactflow.dev/learn/advanced-use/performance and
  https://reactflow.dev/api-reference/react-flow
- Sigma.js rendering docs:
  https://v4.sigmajs.org/concepts/rendering/
- Markmap JSON options docs:
  https://markmap.js.org/docs/json-options
- web.dev long tasks and off-main-thread docs:
  https://web.dev/articles/optimize-long-tasks and
  https://web.dev/articles/off-main-thread
- MDN Prioritized Task Scheduling API:
  https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API
- PixiJS performance tips:
  https://pixijs.com/7.x/guides/production/performance-tips

Key takeaways:

- Infinite canvas surfaces should render only visible shapes plus a buffer.
  tldraw uses viewport culling so a canvas with 10,000 shapes may render only
  a small visible subset.
- Culling must keep selected or edited shapes visible even if technically
  outside the viewport.
- Large graph/canvas renderers reduce visual complexity during interaction:
  fewer labels, simpler edges, fewer overlays, lower pixel ratio, and texture
  caching during pan/zoom where appropriate.
- `scheduler.yield()` can split long work into smaller tasks. It needs a
  fallback because browser support is not universal.
- Web workers help when pure computation can be separated from DOM rendering.
  They do not make work cheaper, but keep the main thread more responsive.
- React Flow explicitly supports rendering only visible elements, but warns
  that visibility culling adds overhead. It is a tool, not a universal win.
- Markmap's own JSON options default `initialExpandLevel` to `-1`, meaning all
  levels are expanded initially. That default is unsafe for Vaultman-scale
  trees unless capped by Vaultman.
- WebGL graph renderers such as Sigma are appropriate when tens of thousands of
  nodes/edges must stay interactive, but they trade away easy DOM richness.

These online findings are parked as input for the future Map iteration. They
should not be converted into the next Explorer Platform implementation plan.
