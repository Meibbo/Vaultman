---
title: Decorations and marks
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T18:15:57
tags:
  - agent/spec
  - explorer/views
---

# Decorations And Marks

## DecorationManager Target Role

`DecorationManager` should become a semantic decoration provider, not a partial
icon/highlight helper.

It should be able to supply:

- icons;
- query highlight ranges;
- filter highlight ranges if given filter context;
- badges from known semantic inputs;
- snippets if needed;
- maybe warnings if tied to type/metadata consistency.

It should not require a Svelte view or DOM.

## Current Gap

Current `DecorationManager` has:

- `decorate(node, context)`;
- icon mapping for prop/tag/file;
- query highlights;
- subscription.

Current missing or incomplete areas:

- `badges.ops`;
- `badges.filters`;
- `highlights.filter`;
- active filter state;
- collapsed descendant bubbling;
- specific view marks;
- queue list templates;
- order marks;
- template membership marks.

## Queue Badges

Queue badges should be generated from queue/index state in one place.

Current duplicated examples:

- `explorerProps.ts` loops through `queueService.queue`;
- `explorerTags.ts` loops through `queueService.queue`;
- badges use hardcoded colors and icons;
- queue index is passed for undo behavior.

Target behavior:

- a `QueueBadgeLayerProvider` or `serviceViews` helper maps operations to
  affected rows/cells/nodes;
- result goes into `layers.badges.ops`;
- action reference points to remove/undo operation;
- views render the action as double-click, button, context menu, or chip.

## Filter Badges And Highlights

Filter state should produce:

- active filter badges;
- active filter row/cell state;
- filter highlight ranges where text corresponds to the active filter;
- filter chips in list/table/card modes.

Current regression:

- nodes no longer reliably show what is acting as an active filter.

Target behavior:

- `serviceViews` can answer whether a node/cell represents an active filter;
- active filter layer is computed consistently for props, values, tags, files,
  queue, and active filter explorer itself;
- views render it according to mode.

## Query Highlights

Query highlights remain text ranges.

They should be produced once and attached to:

- row label;
- tree node label;
- table cells;
- card title/property text;
- list detail.

`DecorationManager` can keep range generation, but `serviceViews` decides where
to attach those ranges.

## General Hierarchical Badge Bubbling

Badge bubbling is a general hierarchy need based on semantic badge data, not a
tree-only behavior. Full rules and the `childBadgeIndicator` projection are in
[[docs/work/hardening/specs/2026-05-04-explorer-view-service/13-hierarchical-badge-bubbling|Hierarchical badge bubbling]].

## Marks

Marks are named/saved view-state artifacts.

Known desired mark kinds:

- order;
- query;
- filters;
- specific view;
- queue list templates;
- column sets;
- grouping presets;
- manual group definitions;
- pinned nodes;
- saved selection scopes.

Marks must not be confused with visual badges:

- a badge is a visible layer on a row/cell/node;
- a mark is durable or semi-durable view metadata.

Views may display marks as badges/chips, but the model should distinguish them.

## Specific View

`specific_view` should mean a saved view configuration:

- mode;
- columns/properties;
- sort;
- groups;
- filters;
- query;
- marks;
- templates;
- display options.

This should eventually line up with Bases-style view configuration, but does
not need to use `.base` files as the first storage format.

## Queue List Templates

Queue list templates should represent saved presentations or filters for the
queue:

- group by operation type;
- group by file;
- show only property ops;
- show only destructive ops;
- show diffs inline;
- show operation count summaries.

They should be modeled as marks/templates consumed by `serviceViews`, not as
hardcoded branches in `explorerQueue.svelte`.

## Decoration Output Compatibility

Existing `DecorationOutput` has:

- `icons`;
- `badges`;
- `highlights`;
- `snippet`.

It can be adapted into `ViewLayers`, but the new layer model should be richer.

Compatibility bridge:

- old `DecorationOutput.icons` -> `layers.icons`;
- old `DecorationOutput.highlights` -> `layers.highlights.query`;
- old `DecorationOutput.badges` -> `layers.badges.*` if source is known.
