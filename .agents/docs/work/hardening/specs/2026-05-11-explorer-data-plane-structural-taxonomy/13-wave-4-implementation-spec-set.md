---
title: Wave 4 implementation spec set
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:46:21
updated: 2026-05-11T19:46:21
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - implementation-spec
created_by: codex
updated_by: codex
---

# Wave 4 Implementation Spec Set

Wave 4 turns the completed Wave 2 vertical specs and Wave 3 Notebook Navigator
research into implementation specs. It does not implement code, publish issues,
or replace Wave 5 plan reconciliation.

## Revalidation Result

Wave 3 remains valid after Wave 2:

- Adopt versioned in-memory snapshots first.
- Adopt reveal-by-id with revision/index readiness gates.
- Adopt pane-local virtualizers and feed them better row/map contracts.
- Adapt provider-registry ideas into Vaultman provider/data-plane seams.
- Reject IndexedDB, row-level subscriptions, and durable cache migrations for
  the first data-plane slice.

Wave 2 strengthens the Files-first order. Files has enough existing tests and
contract surface to prove the snapshot boundary without reopening table, cards,
grid, Tags, or Props behavior.

## Implementation Spec Shards

1. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 files tree snapshot first slice]]
2. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]]
3. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]]
4. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]]

## Target Architecture

The first implementation sequence should introduce an `ExplorerDataPlane`
boundary that is memory-resident, versioned, and source-rebuildable.

The boundary owns:

- structural snapshot rows;
- stable row order and hierarchy metadata;
- lookup maps for `id`, file path, folder path, and row index;
- source and projection revisions;
- snapshot readiness for reveal commands.

The boundary does not own:

- queue or active-filter domain mutation;
- provider context menu, FnR, rename, delete, or binding-note actions;
- `NodeSelectionService` state;
- `ViewService` decorative layer vocabulary;
- view adapter virtualizers and measurement;
- persistent cache storage.

## Proposed Files

Create:

- `src/types/typeExplorerDataPlane.ts`: snapshot, row, revision, lookup, and
  reveal contracts.
- `src/logic/logicExplorerSnapshot.ts`: pure hierarchy/visible-order/map
  builders over `TreeNode`-compatible input.
- `src/services/serviceExplorerDataPlane.svelte.ts`: Svelte service that stores
  snapshots with immutable replacement and subscriptions.
- `test/unit/logic/logicExplorerSnapshot.test.ts`: pure snapshot contract tests.
- `test/unit/services/serviceExplorerDataPlane.test.ts`: service revision and
  subscription tests.

Modify in early slices:

- `src/types/typeExplorer.ts`: add optional data-plane source/bridge hooks to
  `ExplorerProvider` without breaking existing providers.
- `src/providers/explorerFiles.ts`: expose undecorated Files structural input
  while keeping current action hooks and `getTree()` compatibility.
- `src/components/containers/panelExplorer.svelte`: prefer snapshot maps for
  Files selection/reveal/prune, with fallback to current recursive helpers.
- `src/components/views/viewTree.svelte`: accept revisioned reveal targets and
  late id-to-index lookup, while preserving current scan fallback.
- `src/services/serviceViews.svelte.ts`: support or reuse batch layer creation
  with full revision metadata; avoid per-node caller loops.

## Non-Goals

- No IndexedDB or persistent storage.
- No row-level subscription system.
- No `NodeSelectionService` replacement.
- No table/cards/grid redesign.
- No SVAR behavior cleanup beyond compatibility constraints.
- No issue publication before Wave 5.

## Cross-Spec Invariants

- `TreeNode` compatibility remains until adapters migrate.
- `ViewLayers` remains the canonical decorative vocabulary.
- `NodeSelectionService` remains selection/focus/hover/active authority.
- Queue/filter changes are decorative invalidation unless they remove or add
  visible rows.
- File/search/sort/hidden/expansion changes are structural invalidation for
  Files snapshots.
- Reveal commands resolve ids late against the newest accepted snapshot map.
- Existing provider action hooks must keep receiving `TreeNode`-compatible
  nodes during migration.

## Acceptance For Wave 4

- Specs name source files, target contracts, migration sequence, compatibility
  bridge, tests, and defer rules.
- First implementation issue can be derived from shard 14 after Wave 5
  reconciliation.
- Follow-up issues can be derived only after shard 17 is compared against
  existing plans and active work.

## Trace

| Future issue | Implementation spec | Evidence source |
| --- | --- | --- |
| Files snapshot first slice | Shard 14 | Wave 2 Files spec, Wave 3 memory snapshot decision, parent PRD |
| Batched layers | Shard 15 | Wave 2 overlay spec, Wave 2 view adapter spec, `ViewService` tests |
| Panel/reveal compatibility | Shard 16 | Wave 2 selection spec, Wave 2 adapter spec, Notebook Navigator scroll research |
| Tags/Props/adapter follow-ups | Shard 17 | Wave 2 Tags/Props, overlay, adapter, test/perf, reconciliation specs |

