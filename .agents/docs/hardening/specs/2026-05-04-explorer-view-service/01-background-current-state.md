---
title: Background and current state
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Background And Current State

## User Intent

The goal is not merely to create a new generic explorer component. The deeper
goal is to reconnect the view system after several hardening iterations left
logic split across services, providers, and Svelte views.

The desired result is a durable architecture where:

- explorers provide domain data and domain actions;
- services compute semantic state;
- views render already-resolved models;
- decorations, filters, queue state, marks, groups, sorting, keyboard
  navigation, DnD, and templates share one coherent boundary.

## Current Pieces

Existing useful pieces:

- `IExplorer<TNode>`: contract for selection, expansion, search, and filtered
  node state.
- `ExplorerProvider<TMeta>`: current provider interface used by
  `panelExplorer.svelte`.
- `DecorationManager`: current decoration service.
- `Virtualizer<T>` and `TreeVirtualizer<TMeta>`: generic virtual window helpers.
- `serviceSorting.ts`: generic path-based sort helper.
- `serviceFilter.svelte.ts`: active filter tree and filtered files.
- `serviceQueue.svelte.ts`: pending operation queue.
- indexes such as `operationsIndex` and `activeFiltersIndex`.

The pieces are useful, but they are not unified by a view service.

## Current Problems

The current `panelExplorer.svelte` chooses `viewTree` or `viewGrid` directly.
It passes explorer provider output into those views. For grid mode, it passes
`TFile[]`, `App`, and file-specific callbacks.

The current `viewGrid.svelte` is a failed table attempt:

- it accepts `files: TFile[]`;
- it depends on `app.metadataCache`;
- it hardcodes file columns: name, props, path;
- it sorts files directly;
- it is not agnostic of the explorer calling it;
- it is not the desired icon-grid;
- it is not good enough to become `viewTable`.

The current `viewTree.svelte` is closer to the desired renderer model, but it
still owns too many presentation concepts:

- badge rendering details;
- double-click undo badge behavior;
- search highlighting markup;
- active/filter/warning CSS class decisions;
- tree virtualization.

Some of those presentation details belong in the view, but the semantic
decisions that produce them should not.

## Queue And Active Filters

Queue and active filters are not currently using `viewTree` or `viewGrid`.

`explorerQueue.svelte`:

- creates `new Virtualizer<QueueChange>()`;
- subscribes to `plugin.operationsIndex`;
- assigns `v.items = [...plugin.operationsIndex.nodes]`;
- renders `v.visible` directly inside `.vm-explorer-popup-list`;
- owns buttons for clear, marks, diff, execute, close.

`explorerActiveFilters.svelte`:

- creates `new Virtualizer<ActiveFilterEntry>()`;
- subscribes to `plugin.activeFiltersIndex`;
- assigns `v.items = [...plugin.activeFiltersIndex.nodes]`;
- renders `v.visible` directly inside `.vm-explorer-popup-list`;
- describes each rule inline via `describeRule`;
- owns buttons for clear, templates, close, and disabled placeholders.

Both components are mounted through `FrameOverlayController` and
`overlayState`, not through `panelExplorer.svelte`.

## Decoration Split

`serviceDecorate.ts` currently provides:

- icons for props/tags/files;
- query highlight ranges;
- subscription to highlight changes.

But important visual state still lives elsewhere:

- queue badges are computed in `explorerProps.ts` and `explorerTags.ts`;
- deletion classes are computed in explorer providers;
- active filter highlights are not centrally connected;
- bubbling badges from collapsed descendants is documented as a regression;
- `viewTree` renders badge semantics directly;
- active filter and warning state are props/classes instead of a normalized
  render model.

## Primary Architectural Smell

Providers and views both know too much.

Providers know too much about:

- queue badge construction;
- deletion visual classes;
- search highlight class names;
- view mode effects;
- sort state;
- add mode.

Views know too much about:

- badge layout semantics;
- highlight markup;
- selection/active classes;
- undo badge behavior;
- virtual layout behavior.

`serviceViews` exists to create one stable place where semantic view state is
resolved before it reaches a renderer.

