---
title: Wave 5 plan comparison and reconciliation
type: reconciliation
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:56:34
updated: 2026-05-11T20:37:12
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - reconciliation
created_by: codex
updated_by: codex
---

# Wave 5 Plan Comparison And Reconciliation

Wave 5 compares the Explorer Data Plane Wave 4 specs against current PRDs,
plans, implementation records, and backlog cuts before issue publication.

## Takeaway

Use the existing Explorer Data Plane Transition PRD as the parent source of
truth. Publish no new broad PRD unless the user wants a tracker-level parent.
Create issues only after approval of the issue candidates in shard 19.

The first implementation issue should be Files-first snapshot/data-plane
foundation. Existing table, cards, selection, badge, performance, and scroll
work are inputs or compatibility constraints, not work to redo.

The cached-image decision changes only the persistence boundary: structural
snapshots remain memory-first, while a separate media/derived-content cache DB
is now issue-ready as a follow-up once row identity is stable.

## Evidence Ledger

| Source | Status | Reconciliation |
| --- | --- | --- |
| [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition PRD]] | Source of truth | Keep as parent direction and user-story source. |
| [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/13-wave-4-implementation-spec-set|Wave 4 implementation specs]] | New draft source | Use as implementation-spec source for issues. |
| [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/05-notebook-navigator-react-to-svelte-research|Notebook Navigator research]] | Updated prior art | Copy the media cache boundary: key/status metadata, separate blobs, memory LRU, file-level subscriptions. Do not copy IndexedDB into structural snapshots. |
| [[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service spec]] | Compatible extension | Keep `ViewLayers`, render rows, and service-owned layers; supersede old selection ownership wording. |
| [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]] | Partially completed, stale status | Do not execute old slices again; reuse as historical source for contracts/list migration. |
| [[docs/work/hardening/plans/2026-05-06-node-selection-service/index|Node selection service implementation plan]] | Completed authority | `NodeSelectionService` owns selection/focus/hover/active; data plane consumes projections only. |
| [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|Performance diagnosis loop plan]] | Completed prior art | Reuse probe infrastructure and scenarios as data-plane perf gates. |
| [[docs/work/hardening/research/2026-05-05-performance-baseline/index|Performance baseline]] | Active evidence | Confirms next target is provider rebuild frequency and `panelExplorer.getTree`. |
| [[docs/work/hardening/plans/2026-05-05-badge-bubbling-optimization/index|Badge bubbling optimization]] | Completed bridge | Keep utility as compatibility bridge; future inherited badges move into layer/snapshot data. |
| [[docs/work/hardening/backlog/2026-05-08-backlog-cut-2/index|Backlog cut 2]] | Completed behavior | Serial `scrollTarget` and gestures exist; Wave 4 extends them with revisioned reveal. |
| [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|Backlog cut 4]] | Completed behavior | Preserve `serviceViewSize`; adapter row contract must not reopen sizing. |
| [[docs/work/hardening/backlog/2026-05-08-backlog-cut-5-badge-message/index|Backlog cut 5]] | Completed behavior | Overlay issues must consume `serviceBadge`/`badgeRegistry`, not recreate badge vocabulary. |
| [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table spec]] | MVP completed | Data plane should feed current table adapter; do not reopen table feature scope. |
| [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards spec]] | Done | Keep card measurement/layout outside data plane; data plane supplies rows. |
| UI modernization vertical threads | Separate active polish | Do not mix dashboard, native mimicry, FAB polish, or DnD visual work into data-plane issues. |

## Conflict Decisions

- Old Explorer View Service wording that selection may belong to `serviceViews`
  is superseded. Current rule: `NodeSelectionService` is authoritative.
- Old `serviceViews` list-first migration order is stale. Queue/list work can
  remain historical; data-plane issues should start with Files snapshots.
- Backlog Cut 15 active-filter/bubbling verification is absorbed by the overlay
  and perf gates. Do not create a duplicate loose verification issue.
- Cut 18 performance verification is absorbed by the data-plane perf gate.
- Provider/API module relocation from Cut 6 is compatible but not required for
  the first data-plane issue. Do not combine relocation with snapshot work.
- Table/cards/grid enhancements stay in Polish. Data-plane adapter work may
  feed those views, but must not add new table/cards features.
- The old blanket deferral of IndexedDB is narrowed. Persistent structural
  snapshot storage remains deferred; media/derived-content cache storage is a
  valid follow-up because cached explorer images are rebuildable blobs, not row
  structure.

## Source Of Truth Updates Needed

Before publishing tracker issues:

- Add a supersession note to the Explorer View Service interaction shard:
  selection is owned by `NodeSelectionService`, not `serviceViews`.
- Mark `serviceViews` implementation plan as historical/partially completed if
  future agents keep treating its active status as executable.
- Link Wave 5 issue candidates from the structural taxonomy index.
- Decide issue tracker target. `CLAUDE.md` exists, but `docs/agents/` does not;
  actual tracker publication should run the setup workflow or get an explicit
  local/GitHub issue target from the user.

## Approved Architecture Baseline For Issues

- Memory-resident, source-rebuildable `ExplorerDataPlane` first.
- Files-first vertical slice.
- `TreeNode` compatibility bridge until adapters migrate.
- Batched `ViewService` layers, not provider recursive decoration.
- Revision-aware reveal-by-id.
- `NodeSelectionService` remains selection source of truth.
- Adapter-local virtualizers remain adapter-local.
- Persistent structural storage and generic row-level subscriptions remain
  deferred.
- Media/derived-content cache DB and file/node-level media subscriptions are
  accepted as a separate follow-up slice.

## Not Issue-Ready

- Persistent storage/IndexedDB for structural snapshots.
- Generic row-level subscriptions.
- Global virtualizer service.
- New table/card/grid features.
- SVAR cleanup.
- DnD redesign.
- Provider relocation as part of the first data-plane cut.
