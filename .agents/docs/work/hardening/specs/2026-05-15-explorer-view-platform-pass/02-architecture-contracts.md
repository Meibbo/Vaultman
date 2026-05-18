---
title: Architecture contracts
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/spec
  - explorer/architecture
created_by: codex
updated_by: codex
---

# Architecture Contracts

## Projection Core

Every provider should expose a shared Explorer projection instead of each view
rebuilding hierarchy and state.

Required projection facts:

- provider id;
- view mode;
- row list;
- visible ids;
- `id -> index`;
- `index -> id`;
- `path -> id` where applicable;
- domain key to id where applicable;
- parent/child relationships;
- depth/indent metadata;
- stable row keys;
- provider/source revisions;
- rows revision;
- layout revision;
- capability flags;
- decoration layer references;
- media descriptor references.

Projection must not contain decoded media blobs. It may carry descriptors and
stable keys that let the lifecycle layer load visible media later.

## View Feature And Menu Contract

Views differ by layout, not by accidental behavior drift.

Each view declares support for:

- selection;
- box selection;
- keyboard focus;
- scroll target and reveal;
- context menu;
- badges;
- hover badge actions;
- drag/drop;
- resize;
- sticky rows or headers;
- media descriptor acceptance;
- media rendering;
- node element toggles.

The view menu contract has two modes:

- native Obsidian preset: node element visibility follows the preset;
- custom/non-native preset: `btnMultiSelection` can show/hide granular node
  elements.

The primary image/media slot is one granular node element. It defaults off in
every view because nodes already have icons.

Hidden elements should not do meaningful render work. Hiding the media element
does not remove the media descriptor from projection.

## Scroll And Geometry Coordinator

Scroll behavior should be coordinated once and consumed by views.

Required scroll intent concepts:

- semantic target by id;
- semantic target by path or domain key;
- target by index;
- top/offset target;
- intent reason: keyboard, selection, reveal, provider switch, view switch,
  filter/search change, restore, manual, stress jump;
- priority;
- cancellation when the user manually scrolls;
- late index resolution;
- container readiness;
- requestAnimationFrame stabilization.

Geometry responsibilities:

- fixed estimates for simple tree/list rows;
- measured corrections where needed;
- variable-height support for table/grid/cards;
- layout revision invalidation;
- text metrics from the Pretext-backed text measurement service;
- media dimensions from descriptors/cache metadata;
- no full-list scan to resolve a visible range or far offset.

## Decoration And Media Layers

Decoration layers should be built by revision and batch inputs, not by per-row
hot-path calls into global services.

Layer examples:

- operation badges;
- provider badges;
- tag/property indicators;
- snippet/plugin state;
- selection/focus state;
- filtered state;
- action availability;
- media descriptor state.

Media lifecycle rules:

- descriptor can exist for every node;
- image/media render defaults off;
- visible blobs are loaded only when the media element is enabled and visible;
- blob cache stays outside structural projection;
- stale/error/loading states are explicit and testable.

## Render Anatomy Contract

Svelte render snippets/tags can provide a shared node anatomy contract without
forcing every view to use identical DOM.

Node anatomy slots:

- disclosure/leading affordance;
- file/type icon;
- label;
- right-aligned extension area;
- secondary metadata;
- badges/decorations;
- primary image/media;
- action area;
- focus/selection/filter states;
- loading/error placeholders.

Render anatomy consumes projection and feature contracts. It does not own data
projection, scroll, geometry, or lifecycle.
