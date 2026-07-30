---
title: Wave 2 plan reconciliation spec
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:31:39
updated: 2026-05-11T19:31:39
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - reconciliation
created_by: codex
updated_by: codex
---

# Wave 2 Plan Reconciliation Spec

## Evidence Read

- Active hardening index.
- Explorer data-plane transition PRD.
- Explorer view service spec and shards for render layers, interactions, migration plan, and hierarchical badge bubbling.
- `serviceViews` implementation plan.
- Node selection service spec and completed implementation plan.
- Performance diagnosis loop implementation plan and baseline.
- Badge bubbling optimization plan.
- TanStack node table spec.
- Pretext grid/cards and table-open-freeze research references.
- UI modernization vertical-thread plan references for table/cards/grid, adopted nodes, DnD, native mimicry, and dashboard work.

## Reconciliation Table

| Source record | Classification | Reconciliation action |
|---|---|---|
| Explorer data-plane transition PRD | Source of truth | Keep as parent direction for data-plane ownership and Files-first slice. |
| Explorer view service spec | Compatible extension | Keep valid for render layers and view taxonomy, but update interaction notes that imply `serviceViews` may own selection. |
| `serviceViews` implementation plan | Partially completed, stale status | Mark completed slices versus remaining work, and avoid treating old list-first sequence as current implementation order. |
| Node selection service spec/plan | Completed authority decision | Treat `NodeSelectionService` as selection owner; data plane consumes snapshots only. |
| Performance diagnosis loop | Completed prior art | Reuse perf probe and baseline metrics as pre/post gates for data-plane slices. |
| Badge bubbling optimization | Completed compatibility bridge | Keep pure utility as legacy bridge; future work should migrate inherited badges into layer/snapshot data. |
| TanStack node table | Active/completed table MVP | Do not reopen table feature scope; data plane should feed existing table adapter. |
| Pretext grid/cards specs | Compatible layout work | Keep measurement and style services outside structural data plane. |
| UI modernization vertical threads | Compatible but separate initiative | Do not mix dashboard, DnD polish, or visual redesign into the first data-plane slice. |

## Decisions

- Completed selection work supersedes older wording that selection belongs to `serviceViews`. The current rule is: `NodeSelectionService` owns selection, focus, hover, anchor, and active-node snapshots.
- The explorer data plane deepens the source/structural side that feeds `ViewService`; it does not replace the view service taxonomy.
- `ViewLayers` remains canonical for decorative output. `TreeNode` remains a compatibility carrier until adapters migrate.
- Table, grid, cards, and Pretext measurement work are inputs to the adapter spec, not reasons to expand the data-plane implementation scope.
- DnD state remains a control/interaction projection, not structural snapshot state, unless a later plan explicitly persists a reordered structure.
- Notebook Navigator research should be revalidated against Wave 2 shards before Wave 4 implementation specs are written.

## Required Doc Actions Before Issues

- Update or annotate `serviceViews` plan status so future agents do not execute stale slices as if nothing exists.
- Add a supersession note to Explorer view service interaction wording:
  selection is now a dedicated service, not a `serviceViews` submodule.
- Link Wave 2 shards from the structural taxonomy index and mark Wave 2 complete.
- Reopen the Notebook Navigator research conclusion only to compare against Wave 2 evidence; do not rewrite it into an implementation spec.
- Keep draft issue slices unpublished until Wave 4 implementation specs and plan comparison are approved.

## Issue Readiness

Ready after this Wave 2 capture:

- Files tree vertical spec as source for a Files-first implementation spec.
- Tags/Props provider adapter taxonomy as a follow-up spec source.
- Overlay invalidation and test/perf gates as constraints for every slice.

Not ready:

- Final tracker issues.
- Cross-provider implementation specs.
- Persistent storage or IndexedDB work.
- Adapter cleanup that would modify table/cards/grid behavior beyond compatibility.

