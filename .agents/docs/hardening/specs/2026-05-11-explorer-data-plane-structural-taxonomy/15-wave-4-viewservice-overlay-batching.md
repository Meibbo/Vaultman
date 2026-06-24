---
title: Wave 4 ViewService overlay batching
type: implementation-spec
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:46:21
updated: 2026-05-11T19:46:21
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - queue
  - filters
  - implementation-spec
created_by: codex
updated_by: codex
---

# Wave 4 ViewService Overlay Batching

## Goal

Stop Files-first callers from decorating one node at a time. Build queue,
active-filter, highlight, pending/deleted, and inherited badge layers in one
batch keyed by snapshot rows and revision metadata.

## Source Inputs

From Wave 2:

- Files, Tags, and Props providers call `ViewService.getModel()` recursively
  over single-node arrays inside `_decorateTree()`.
- `ViewService.getModel()` already accepts `nodes`, `operations`,
  `activeFilters`, and `revisions`.
- `ViewService` already caches semantic layers when callers provide stable
  revisions.
- `ViewLayers` and `utilViewLayers.ts` are the canonical layer vocabulary and
  legacy bridge.

## Target Boundary

For the first implementation slice, do not replace `ViewService`. Add a narrow
batch projection seam around it:

- Input: `ExplorerSnapshot.rows`, queue index nodes, active-filter index nodes,
  source revisions, queue revision, filter revision, and label/detail getters.
- Output: `ReadonlyMap<string, ViewLayers>` keyed by snapshot row id.
- Compatibility output: optional `TreeNode` decoration bridge using
  `nodeBadgesFromViewLayers`, `highlightsFromViewLayers`, and
  `withViewStateClasses`.

## Proposed Files

Create:

- `src/services/serviceExplorerLayers.ts` or
  `src/logic/logicExplorerLayers.ts`: pure-ish adapter that calls
  `viewService.getModel()` once and returns a layer map.
- `test/unit/services/serviceExplorerLayers.test.ts`: batch parity and
  revision tests.

Modify:

- `src/services/serviceViews.svelte.ts`: only if current `getModel()` lacks the
  metadata needed for a stable batch output.
- `src/providers/explorerFiles.ts`: replace recursive `_decorateTree()` usage
  in the data-plane path with batch layer projection.
- `src/utils/utilViewLayers.ts`: extend only if the compatibility bridge needs
  a missing conversion from `ViewLayers` to legacy `TreeNode` fields.

## Migration Sequence

1. Write batch parity tests with a small Files snapshot and queue/filter inputs.
2. Call existing `ViewService.getModel()` once with all visible snapshot nodes.
3. Convert returned `rows` to `Map<row.id, row.layers>`.
4. Add a compatibility helper that applies layers to `TreeNode` output without
   changing the original structural snapshot rows.
5. Swap Files data-plane path to use the batch helper.
6. Keep legacy `_decorateTree()` for non-data-plane fallback until follow-up
   provider migrations remove it.

## Revision Contract

Batch inputs must include:

- `filesRevision` for Files structural source;
- `queueRevision` from `operationsIndex.revision`;
- `filterRevision` from `activeFiltersIndex.revision`;
- `snapshotRevision` or `structureRevision` from the data plane.

The semantic layer cache can be reused only when the relevant source, queue,
filter, and node ids are stable. Selection-only changes must not invalidate
semantic layers.

## Structural Versus Decorative Rules

Decorative changes:

- queue badge changed;
- active-filter badge/highlight changed;
- pending/deleted/disabled state changed while row remains visible;
- inherited badge summary changed;
- hover-badge availability changed.

Structural changes:

- visible row set changed;
- parent/child relation changed;
- source file/tag/prop set changed;
- search, sort, hidden, or expansion changes altered row order.

Only structural changes replace snapshot rows. Decorative changes replace
layers or compatibility-decorated `TreeNode` output.

## Test Gates

- Batch parity: layer map matches old per-node `getModel()` behavior for queue
  badges, file filters, path filters, deleted state, pending state, and
  highlights.
- Cache behavior: stable revisions hit semantic cache; changed queue/filter
  revisions miss; selection-only changes do not force semantic rebuild.
- Files provider parity: snapshot-backed decorated output matches legacy
  `_decorateTree()` for current fixtures.
- Collapsed inherited badges: compatibility bridge matches
  `utilBadgeBubbling` output until inherited badges move fully into layers.
- Perf probe: batch path records fewer model builds than recursive per-node
  decoration for a representative Files tree.

## Acceptance

- Files data-plane path gets decorative layers through one batched model build.
- Queue/filter-only changes can update layers without rebuilding Files
  structure.
- `ViewLayers` remains source of truth for decorative output.
- Legacy `TreeNode.badges`, `TreeNode.highlights`, and `TreeNode.cls` remain a
  bridge, not the new canonical model.

