---
title: Wave 2 overlay invalidation spec
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:31:39
updated: 2026-05-11T19:31:39
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - queue
  - filters
created_by: codex
updated_by: codex
---

# Wave 2 Overlay Invalidation Spec

## Evidence Read

- Source: `src/index/indexOperations.ts`, `src/index/indexActiveFilters.ts`,
  `src/services/serviceQueue.svelte.ts`,
  `src/services/serviceQueuePresentation.ts`,
  `src/services/serviceOperationScope.ts`,
  `src/services/serviceFileQueue.ts`,
  `src/services/serviceFilter.svelte.ts`,
  `src/services/serviceViews.svelte.ts`,
  `src/services/badgeRegistry.ts`, `src/badges/serviceBadge.ts`,
  `src/utils/utilViewLayers.ts`, `src/utils/utilBadgeBubbling.ts`,
  `src/services/serviceDecorate.ts`,
  `src/components/containers/explorerQueue.svelte`,
  `src/components/containers/explorerActiveFilters.svelte`,
  `src/components/views/viewList.svelte`, `src/types/typeViews.ts`,
  `src/types/typeOps.ts`, `src/types/typeFilter.ts`,
  `src/types/typeContracts.ts`, `src/index/indexNodeCreate.ts`,
  `src/services/serviceGroups.ts`, and `src/types/typeNode.ts`.
- Tests: queue presentation, operation scope, view service, badge bubbling,
  badge service, view list, and navbar queue tests were inspected.

## Current Responsibilities

`OperationQueueService` owns queue source-of-truth through
`transactions: SvelteMap<string, VirtualFileState>`. It still exposes legacy
compatible `pending`, `queue`, `listTransactions()`, `subscribe()`, `remove()`,
`clear()`, and `execute()` surfaces. Its `chains` path exists, but migration
must not assume immutable queue state is complete.

`indexOperations` adapts queue state into `IOperationsIndex`. It prefers
`listTransactions()` and groups staged ops by `changeId ?? op.id`, then falls
back to `queue.pending`.

`FilterService` owns active filter tree, selected-file filters, search filters,
and `filteredFiles`. `indexActiveFilters` flattens active-filter tree and search
rules while preserving source type and depth.

`ViewService` is both overlay pipeline and render-row batcher today. It builds
rows, indexes operations and filters, projects matched queue/filter layers,
tracks selection/focus/view mode, and caches semantic layers when callers
supply revisions.

`explorerQueue` reads `operationsIndex.nodes`, groups queue rows by action,
calls `ViewService.getModel()`, then reshapes rows into parent/child queue
presentation. `explorerActiveFilters` reads `activeFiltersIndex.nodes`, maps
labels/details/actions, and renders through `ViewList`.

## Data Flow

Queue:

```text
OperationQueueService.transactions
  -> createOperationsIndex
  -> operationsIndex.nodes
  -> groupQueueChangesByAction
  -> ViewService.getModel
  -> queue row cleanup
  -> ViewList
```

Active filters:

```text
FilterService.activeFilter/search
  -> createActiveFiltersIndex
  -> activeFiltersIndex.nodes
  -> ViewService.getModel
  -> ViewList
  -> row actions mutate FilterService
```

Cross-surface overlays enter `ExplorerViewInput` as `operations` and
`activeFilters`. `ViewService` builds by-prop, by-tag, by-file, and by-path
indexes, then emits `ViewLayers.badges`, highlights, and state.

## Target Seams

- Extract queue/filter overlay projection from `serviceViews.svelte.ts` into a
  data-plane overlay module that consumes structural rows plus queue/filter
  indexes.
- Promote `ViewLayers` as the stable overlay vocabulary for queue, filters,
  warnings, inherited badges, highlights, and row state.
- Treat `indexOperations` and `indexActiveFilters` as source-index adapters with
  explicit revision metadata.
- Move queue popup row shaping out of `explorerQueue.svelte` into a queue
  projection/presenter seam.
- Move active-filter label/detail/remove/reorder mapping toward an
  active-filter adapter seam so the component becomes projection-only.
- Convert collapsed badge bubbling from `TreeNode` compatibility output toward
  snapshot/layer data.

## Risks

- Queue labels/icons are duplicated across `serviceQueuePresentation.ts` and
  `ViewService` operation intent logic.
- Active-filter visual rules are split across `indexActiveFilters`,
  `ViewService`, and `explorerActiveFilters`.
- Components subscribe directly to live indexes and rebuild models locally,
  coupling overlay invalidation to popup rendering.
- `ViewService` cache behavior depends on callers supplying revisions; queue
  and filter popup calls currently do not pass complete revision metadata.

## Test Gates

- Structural-versus-decorative invalidation: queue-only and filter-only changes
  update overlays without rebuilding source tree snapshots.
- Revision contracts for `operationsIndex.revision`,
  `activeFiltersIndex.revision`, and `ViewService` overlay cache behavior.
- Queue projection seam tests for grouped parent rows, child rows, remove
  `sourceId`, and parent count badges outside Svelte components.
- Active-filter projection tests for tree rules, search rules,
  selected-files groups, disabled rules, and reorder boundaries.
- Cross-surface overlay consistency tests for Files, Tags, and Props using the
  same queue/filter layer vocabulary.
- Collapsed inherited badge tests at snapshot/layer level, not only
  `TreeNode` badge bubbling compatibility.

