---
title: Architecture principles
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Architecture Principles

## Central Rule

`serviceViews` produces semantic layers. Views decide how those layers are
presented.

The service should not produce HTML. It should not produce final CSS classes
except stable state tokens when needed for compatibility. It should produce
meaningful data:

- selected;
- focused;
- active filter;
- query highlight ranges;
- filter highlight ranges;
- queue badges;
- filter badges;
- warning badges;
- inherited badges;
- operation marks;
- group membership;
- sort order;
- template membership;
- disabled/deleted/pending state.

The view decides how to display that data.

## Layer Ownership

The semantic owner of a layer is the service that understands it:

- queue service/index knows pending ops;
- filter service/index knows active filters;
- decoration manager knows icons and text highlight ranges;
- sorting service knows comparator behavior;
- virtualizer knows visible windows;
- explorer provider knows domain actions;
- view service knows how to combine those into a render model.

No Svelte view should query those services directly.

## Thin Views

Views should be thin renderers.

Allowed in views:

- Svelte markup;
- CSS class projection;
- ARIA roles;
- event forwarding;
- visible window rendering;
- view-specific layout decisions;
- view-specific presentation of generic layers.

Not allowed in views:

- query `queueService`;
- query `filterService`;
- query `DecorationManager`;
- query `App.metadataCache`;
- decide which ops match a node;
- decide which filters match a node;
- compute inherited badges;
- parse filter trees;
- construct queue badges from ops;
- construct active filter badges from rules.

## Provider Role

Explorer providers should supply:

- source nodes or domain rows;
- node identity;
- domain metadata;
- domain actions: click, context menu, rename, add, delete;
- optional domain-specific columns or cell descriptors;
- optional domain-specific group descriptors.

Explorer providers should not own:

- final view mode behavior;
- cross-cutting visual layers;
- queue badge construction;
- active filter highlighting;
- inherited badge bubbling;
- keyboard navigation state;
- DnD state;
- selection state that should persist across views.

## ServiceViews Role

`serviceViews` should orchestrate:

- view mode registry;
- render model creation;
- layer collection;
- layer normalization;
- selection state;
- expanded state;
- focus state;
- keyboard state;
- DnD state;
- group state;
- manual ordering;
- virtual windows;
- mark/template state.

It should depend on service contracts, not concrete components.

## Render Model Stability

Render models should be serializable or close to serializable.

They should avoid embedding:

- `App`;
- DOM elements;
- Svelte components;
- active event objects;
- mutable plugin services;
- methods that close over provider internals unless explicitly marked as action
  callbacks.

Stable render models make testing easier and allow each view to be verified
without mounting the whole plugin.

## Progressive Migration

Do not rewrite all explorers and views at once.

Start with a vertical slice:

- one or two explorers;
- one or two views;
- one semantic layer set;
- tests around render model behavior.

Queue and active filters are good early candidates because they already use
indexes and compact lists.

Props/tags/files are good next candidates because they currently contain the
decoration and badge logic that needs to move.

## Compatibility

During migration:

- keep `viewTree.svelte` working;
- keep overlay queue and active filters working;
- keep `panelExplorer.svelte` working;
- add adapters rather than deleting behavior prematurely;
- retire `viewGrid.svelte` only after `viewTable` or `viewList` covers its
  current user-facing behavior.

## Testability

Every non-trivial behavior must be testable without Obsidian UI:

- layer creation;
- queue badge matching;
- active filter highlight matching;
- query highlight ranges;
- inherited badge bubbling;
- sorting;
- grouping;
- keyboard navigation state transitions;
- DnD reorder results;
- mark/template application.

Svelte component tests should verify projection, not business logic.

