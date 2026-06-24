---
title: Scope and performance targets
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/spec
  - explorer/performance
created_by: codex
updated_by: codex
---

# Scope And Performance Targets

## Strategic Target

Vaultman should beat Notebook Navigator by architecture, not by a narrow
single-view optimization.

Notebook Navigator is the comparison floor for file list/tree navigation.
Vaultman must keep multi-provider, multi-view, badges, actions, properties,
tags, snippets, media descriptors, and command workflows without paying their
cost when the features are hidden or irrelevant.

## Dataset Tiers

### 10K Nodes

10K is the release gate.

Required expectations:

- list remains comparable or better than Notebook Navigator for comparable file
  scenarios;
- tree no longer bleeds or misses medium/large jump scrolls;
- view switching gives visible feedback quickly;
- feature parity tests cover visible Explorer affordances;
- hidden features have no material hot-path cost.

### 50K Nodes

50K is the architectural gate for:

- projection core;
- tree;
- list;
- selection/focus;
- scroll intent resolution;
- decoration layer construction;
- media descriptor presence with image rendering disabled by default.

`table`, `grid`, and `cards` must have contracts at this tier, but their first
50K work is a characterizing benchmark rather than the initial release blocker.
This avoids designing tree/list-only APIs while still focusing risk where it is
highest.

### 100K Nodes

100K is a proof benchmark.

The goal is not to promise every view with every feature enabled at 100K. The
goal is to prove that the core architecture does not collapse:

- projection can be built or reused predictably;
- `id -> index` and `index -> id` stay constant-time;
- visible ranges can be resolved without scanning the full dataset;
- decoration and media descriptor layers remain revision-bounded;
- hidden node elements remain close to zero cost;
- the UI can land quickly and remain cancelable.

## Scope Split

The platform contract covers every current non-Map Explorer view:

- tree;
- list;
- table;
- grid;
- cards.

The first must-pass migration is `viewTree` because it is both the worst
performance surface and the current god object. `ViewNodeList` is already close
to the desired TanStack virtualizer model, so it should help validate the shared
linear adapter rather than be rewritten first.

## Deferred Scope

Map/ViewNodeMap is deferred to a future iteration. All prior map/markmap
research remains useful, but the next release should not expose Map as a
selectable view option.

Native Obsidian Bases media parity is deferred. The platform pass only reserves
the node media descriptor and visibility toggle contract.
