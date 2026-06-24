---
title: Interactions
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Interactions

## Slice Decision

The user selected interactions as a second slice after the service-owned view
direction.

This means:

- define the architecture now;
- avoid implementing every interaction in the first code change;
- leave hooks in the render model so interactions do not require redesign.

## Selection

Selection should belong to `serviceViews` or a sub-service owned by it.

Selection should support:

- single row;
- multi row;
- range row;
- table cell;
- table cell range;
- grid tile;
- card;
- list row;
- tree row.

Selection should be keyed by stable IDs:

- row ID;
- cell ID;
- node ID;
- group ID.

Views project selected state; they do not own the source of truth.

## Focus

Focus should be semantic:

- focused row;
- focused cell;
- focused tile;
- focused group;
- focused action.

DOM focus and semantic focus are related but not identical. The render model
should define semantic focus. The view should map it to tabindex and actual DOM
focus where necessary.

## Keyboard Navigation

Keyboard navigation should be view-aware but service-owned.

Tree:

- Arrow Up/Down moves visible rows;
- Arrow Right expands or enters child;
- Arrow Left collapses or moves to parent;
- Enter opens/toggles;
- context-menu key opens actions.

Table:

- arrows move cells;
- Shift+arrows extend range;
- Enter edits or opens;
- Escape cancels edit;
- copy/paste uses selected cell/range;
- Tab moves cell focus.

Grid:

- arrows move spatially;
- Home/End move to first/last;
- Enter opens;
- Space toggles selection.

List:

- arrows move rows;
- Enter activates primary action;
- Delete removes when supported.

Cards:

- arrows move cards by grid position;
- Enter opens;
- Space toggles selection.

## DnD

DnD should be modeled as semantic drag state:

- dragging ID;
- drag source;
- candidate target;
- drop position;
- allowed operation;
- preview state.

Targets:

- reorder rows;
- reorder groups;
- reorder columns;
- move nodes into manual parent groups;
- apply templates;
- move files/folders where allowed.

Views show drag state but do not compute domain operations.

## Inline Editing

Inline editing should be capability-driven.

Examples:

- tree inline rename;
- table cell edit;
- card property edit;
- list row rename.

The render model should expose:

- editable flag;
- edit value;
- validation state;
- commit action;
- cancel action.

The view owns input markup but not commit logic.

## Context Menus

Context menus should remain action-based.

Views should call a semantic action:

- `openContextMenu(rowId, event)`;
- or `actions.contextMenu.run(ctx)`.

Providers/context menu service should construct menu entries.

No view should inspect node metadata to decide which domain menu to open.

## Virtualizer

Virtualization has two layers:

- generic window math;
- view-specific layout projection.

`Virtualizer<T>` can remain generic. `serviceViews` should decide which item
array is virtualized and expose visible windows when useful.

Tree can keep `TreeVirtualizer` behavior, but flattening should be part of the
tree render model builder, not arbitrary view logic.

Table may need row virtualization first and column virtualization later.

Grid may need spatial virtualization later.

List should use simple row virtualization immediately.

