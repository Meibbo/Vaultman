---
title: Architecture, execution, and handoff
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

# Architecture, Execution, And Handoff

## Architecture Direction

Do not force SOLID as a checklist. Use deeper modules with small interfaces and
high leverage.

### 1. Explorer Projection Module

Goal: every provider can expose a common projection, not only `files`.

Interface should cover `rows`, `visibleIds`, `idToIndex`, `pathToId`,
`domainKeyToId`, `tree`, `providerId`, `viewMode`, `rowsRevision`,
`layoutRevision`, and source revisions.

This makes selection, scroll, box select, badge routing, and view switching
provider-agnostic.

### 2. Explorer View Feature And Menu Contract

Goal: views differ in layout, not accidentally in semantics.

Declare support per view for selection, box selection, keyboard focus, scroll
target, context menu, badges, hover badge actions, drag/drop, resize, and sticky
rows/headers. Tests should fail when a required Explorer feature disappears
from one view.

The view menu also needs a preset/element contract:

- when using the native Obsidian preset, node element visibility follows the
  preset;
- when not using the native preset, the view menu `btnMultiSelection` control
  can show/hide granular node elements;
- the primary image/media slot is one of those granular node elements;
- the primary image/media slot is disabled by default in every view because
  nodes already have icons;
- hiding an element is a rendering preference, not permission to remove the
  descriptor from projection or invalidate shared geometry incorrectly.

### 3. Explorer Scroll And Geometry Module

Goal: remove duplicated virtualizer readiness and scroll-target logic from
individual views.

Core concepts:

- semantic scroll intents: id, path, domain key, index, top, offset;
- intent reasons: manual, keyboard, selection, reveal, provider switch,
  view-mode switch, filter/search change, structure change, visibility change,
  restore, stress jump;
- priority coalescing;
- container readiness gate;
- late index resolution;
- RAF stabilization;
- manual-scroll cancellation of stale low-priority intents.

Geometry strategies:

- fixed height for simple list/tree rows;
- estimated + measured height for table/grid/cards;
- per-node resize overrides by `nodeId`;
- global resize invalidates `layoutRevision`;
- variable row lookup via cached prefix sums or Fenwick-style offset index
  when needed.

This does not conflict with Pretext, TanStack, global node resize, or per-node
manual resize. Those inputs should become explicit geometry facts.

### 4. Explorer Decoration Module

Goal: avoid per-node decoration hot paths.

Current provider decoration patterns can call `viewService.getModel()` many
times in a single refresh. A decoration module should batch rows/nodes by
projection revision and cache derived layers by source revisions.

This is especially relevant for `props`, but should not be implemented as a
properties-only special case.

### 5. Deferred Map Lifecycle And Infinite Canvas Runtime

Goal for future Map work: mode changes must never freeze Obsidian.

This section is parked for a later dedicated Map iteration. The next release
should not expose Map as a selectable view option.

For future Map work:

- render the landing/orbiting shell immediately;
- start preparation after a frame;
- use `AbortController` so provider/view switches cancel preparation;
- flatten and layout in chunks;
- yield between chunks with `scheduler.yield()` fallback;
- move pure layout/bounds work to a worker when feasible;
- render only visible nodes and edges;
- reduce level of detail during pan/zoom;
- cap initial expansion depth for large trees;
- show aggregate collapsed groups instead of mounting all descendants.

The current legacy `ViewMarkmap` should not be patched locally as part of the
next platform pass. Future `ViewNodeMap` work should stop mounting the full
recursive DOM tree and should become a canvas-like view over an explicit layout
model, but that belongs in its own source record/spec/plan.

## PerfProbe And Tests

Add scenario-specific thresholds instead of one global performance threshold.

Recommended perfProbe scenarios:

- `files-list-10k-scroll-jump`;
- `files-tree-10k-scroll-jump`;
- `files-grid-10k-view-switch`;
- `files-cards-10k-view-switch`;
- `node-media-descriptor-build`;
- `node-media-visible-subscribe`;
- `view-menu-element-toggle`;
- `view-mode-native-preset-restore`;
- `provider-switch-visible`;
- `view-mode-switch-list-table-grid`;
- `properties-large-refresh`;
- `manual-scroll-detection`.

Recommended metrics:

- first feedback visual ms;
- ready visible ms;
- ready all/settled ms;
- long frame count;
- max long frame duration;
- stale virtual range ms;
- dropped/cancelled intent count;
- visible node count;
- mounted node count;
- projection build time;
- geometry invalidation time;
- heap delta where available.

Notebook Navigator can be installed in the same `plugin-dev` vault for A/B
measurements. Obsidian CLI can open each plugin, run comparable interactions,
capture wall-clock, long frames, DOM state, and errors. The benchmark should
avoid declaring success until Vaultman is equal or better for comparable
scenarios, or until an explicit feature-cost tolerance is documented.

## Recommended Execution Order

1. Create feedback loops first:
   - failing/characterizing tests for `viewTree` 10K jump behavior;
   - view feature parity tests;
   - view menu `btnMultiSelection` element visibility tests;
   - native Obsidian preset restoration tests;
   - media descriptor/geometry/lifecycle tests;
   - perfProbe scenario extensions.
2. Build the Explorer Projection Module for all providers.
3. Add the Explorer View Feature Contract and parity tests.
4. Add Scroll And Geometry Coordinator for `tree` and `list` first.
5. Extend geometry adapters to `table`, `grid`, and `cards`.
6. Add view menu/preset wiring for granular node element visibility, including
   the image/media slot outside the native Obsidian preset.
7. Ensure Map is not exposed as a selectable next-release option.
8. Add Notebook Navigator A/B live benchmark in `plugin-dev`.

## Acceptance Criteria

- Switching to any view gives visible feedback within 100 ms.
- View preparation is cancelable when the user switches provider/view/tab.
- Map is not selectable in the next release until a future Map-specific
  stability/performance iteration lands.
- 10K files list remains competitive with Notebook Navigator.
- 10K files tree no longer bleeds or misses medium/large jump scrolls.
- Grid/cards/table can be stress-tested from the UI or CLI.
- Badges, selection, context menu, keyboard focus, and box selection have
  declared parity expectations per view.
- The view menu `btnMultiSelection` control can show/hide granular node elements
  outside the native Obsidian preset, including the primary image/media slot.
- The primary image/media slot defaults off in every view and only becomes
  visible through explicit `btnMultiSelection` opt-in.
- `perfProbe` reports scenario-specific jank and readiness metrics.

## Next Handoff

Do not start by patching Markmap locally. Start by converting this research
into an implementation spec/plan for an Explorer View Platform pass, then
execute the first feedback loops. The first practical code slice should likely
be tests plus perfProbe scenarios, followed by projection/feature contracts.
Map/ViewNodeMap needs a separate future source record/spec/plan before it is
made selectable again.
