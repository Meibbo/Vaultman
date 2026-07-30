---
title: Reconnaissance synthesis
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
tags:
  - agent/spec
  - explorer/views
---

# Reconnaissance Synthesis

Five read-only agents inspected independent domains. Their outputs converge on one conclusion: Vaultman already has pieces of a clean explorer architecture, but they are wired through a broad coordinator/provider contract instead of a single versioned data plane.

## Agent Domains

| Agent | Domain | Main finding |
|---|---|---|
| Render surface | `panelExplorer`, tree/grid/table/cards/SVAR/list adapters | `panelExplorer` is both surface coordinator and render-data orchestrator. |
| Provider/data | providers, indexes, logic, node contracts | indexes are the seed of a data plane; providers still rebuild and decorate. |
| Overlay/state | `ViewService`, selection, scroll, queue/filter overlays | `ViewService` is the closest seam, but mixes structural and decorative state. |
| Docs/plans | hardening and polish architecture records | older view-service plans are partially stale and must be reconciled. |
| Tests/perf | unit/component/perf coverage | coverage is strong for current behavior, weak for versioned snapshots. |

## Current Codebase Shape

- `panelExplorer` owns provider synchronization, view mode routing, selection projection, expansion state, queue badge projection, empty states, and scroll reveal dispatch.
- Files, Tags, and Props providers own source selection, tree construction, search, sort, hidden rules, metadata reads, domain actions, and per-node `ViewService` calls.
- `createNodeIndex` already exposes nodes, flat ids, `byId`, revision, subscriptions, and search buffers. This is the closest source snapshot seed.
- `ViewService` builds render rows and semantic layers, but providers often call it one node at a time.
- `NodeSelectionService` is the completed authority for selected, focused, anchor, hover, and active-node snapshots.
- `ViewLayers` already provides a useful vocabulary for icons, badges, highlights, state, and marks.
- `utilViewLayers` bridges semantic layers back into legacy `TreeNode` badges, highlights, and classes. This is the compatibility adapter for migration.

## Main Friction

- Providers are shallow modules: their interface is nearly as complex as their implementation because callers must understand source facts, UI state, sort, search, context menus, queue actions, and decorations.
- Structural invalidation and decorative invalidation are coupled. Queue or active-filter changes can force broad provider/panel refresh paths.
- Tags and Props have duplicate source paths: indexes exist, but logic/providers still read Obsidian metadata directly for tree construction or action scope.
- View adapters receive many overlay props directly and still project legacy `TreeNode` fields instead of a canonical row/layer model.
- Scroll reveal and virtualizer lookup are surface-specific. Several adapters compute reveal positions with O(n) row summing.
- Tests prove today's behavior, but future work needs snapshot/layer tests that fail before component integration fails.

## Plan Conflicts To Resolve

- The older Explorer View Service spec says selection may belong to `serviceViews`; completed work and the new PRD keep `NodeSelectionService` as selection authority. Treat the completed selection plan and new PRD as newer.
- The `serviceViews` implementation plan is still marked active in places even though later work implemented parts of the service and adapters. It must be updated, superseded, or split into remaining work before implementation.
- Existing table, grid, cards, scroll, badges, and DnD work should be fed by the new data plane, not rebuilt as part of the first slice.
