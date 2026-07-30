---
title: Structural taxonomy
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T20:37:12
tags:
  - agent/spec
  - explorer/views
---

# Structural Taxonomy

Use these terms in the next specs, plans, and issues. They are codebase terms, not UI labels.

## Module Roles

| Term | Current examples | Target responsibility |
|---|---|---|
| Surface coordinator | `panelExplorer` | Route mode, commands, subscriptions, selection commits, reveal commands. |
| Provider adapter | Files, Tags, Props providers | Expose source facts and domain actions through a smaller interface. |
| Source index | files/tags/props/operations/active filters indexes | Publish source records, revisions, subscriptions, and search buffers. |
| Explorer data plane | new module | Build versioned snapshots from indexes, provider facts, filters, and settings. |
| Structural snapshot | new contract | Stable ids, hierarchy, rows, lookup maps, revisions, and projection metadata. |
| Overlay pipeline | extracted from `ViewService` | Build queue/filter/decoration layers without rebuilding source structure. |
| Media cache data plane | new follow-up module | Persist rebuildable image/preview blobs and media status outside structural snapshots. |
| View service batcher | `ViewService` evolved | Create render rows/layers in batch from snapshots or visible rows. |
| View adapter | tree/grid/table/cards/list/SVAR | Render projected rows and forward semantic events. |
| Selection projection | `NodeSelectionService` adapter | Map selection snapshot into adapter-friendly ids, maps, focus, active node. |
| Virtualizer adapter | tree/grid/table/cards internals | Own visible window/reveal mechanics for a concrete surface. |
| Scroll reveal command | current `{ id, serial }` style | Uniform reveal-by-id request consumed by virtualizer adapters. |
| Plan reconciler | docs-only task | Mark stale plans, supersede conflicts, and connect new work to old records. |

## Structural Versus Decorative Invalidation

Structural invalidation changes the snapshot shape:

- vault file create/delete/rename;
- tag/property source index changes;
- search query changes that alter visible rows;
- sort mode changes;
- hidden-item visibility changes;
- expansion-visible tree shape changes;
- provider mode changes such as leaf/all mode.

Decorative invalidation changes row layers:

- queue operation badges;
- active-filter badges and highlights;
- warning or conflict badges;
- pending/deleted/disabled state when the row remains visible;
- hover badge suppression;
- text highlight ranges;
- inherited badge summaries.

Control invalidation changes interaction state:

- selected ids;
- focused id;
- active node;
- hover node;
- scroll target;
- box selection in progress;
- drag/drop state.

Media cache invalidation changes derived visual content without changing structural rows:

- cached explorer thumbnails or previews become ready/stale/error;
- media source mtime, hash, selected reference, or dimensions change;
- a visible row needs a new `mediaKey` while its structural id remains stable.

## Provider Adapter Boundary

Keep in provider adapters:

- domain action dispatch;
- context menu registration;
- Obsidian modal opening;
- file open/reveal commands;
- queue and FnR command construction;
- provider-specific action scope rules until data-plane alternatives are ready.

Move out of provider adapters:

- per-node `ViewService` decoration calls;
- queue badge construction;
- active-filter visual state;
- generic search/sort/hidden projection when it can be represented by snapshot inputs;
- direct metadata reads used only for display facts;
- inherited badge bubbling.

## Snapshot Shape Requirements

Every structural snapshot should be able to answer:

- what source revisions produced it;
- which node ids exist;
- which row ids are visible in order;
- how to find a row by node id;
- how to find a node by file path, tag path, or property/value key when available;
- which rows are structural parents of other rows;
- which rows are eligible for provider actions;
- which rows are virtualizer targets;
- which rows need semantic overlay layers.

## Compatibility Rules

- Keep `TreeNode` compatibility while views migrate.
- Keep `ViewLayers` as the canonical overlay vocabulary.
- Keep `NodeSelectionService` as selection authority.
- Keep current view adapters working while data-plane snapshots are introduced.
- Do not reopen table/cards/grid feature scope in the first data-plane slice.
- Do not introduce IndexedDB for structural snapshots. A media/derived-content cache database is allowed only as a separate slice with key/status records, blob storage, and file/node-level subscriptions.
