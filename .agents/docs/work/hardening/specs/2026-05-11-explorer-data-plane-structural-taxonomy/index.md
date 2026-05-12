---
title: Explorer data plane structural taxonomy
type: spec-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T20:55:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - render-hot-path
  - needs-triage
created_by: codex
updated_by: codex
---

# Explorer Data Plane Structural Taxonomy

This source record turns the explorer data-plane reconnaissance waves into a
codebase-facing taxonomy, vertical specs, and a wave/task ladder for the
Explorer data-plane transition.

It does not replace the parent PRD. The parent PRD defines the product and
architecture direction. This folder defines the codebase domains, ownership
terms, and next multi-agent specification work needed before implementation.

## Scope

Included:

- `panelExplorer` as the current surface coordinator.
- Files, Tags, Props, Queue, and Active Filters explorer data paths.
- `ViewService`, `NodeSelectionService`, scroll, virtualizer, badges, queue
  overlays, and active-filter overlays.
- Tree, grid, table, cards, SVAR, and list view adapters.
- Existing tests, performance probes, hardening specs, polish plans, and stale
  plan conflicts that affect this transition.
- Explorer media/derived-content cache requirements for cached images, previews,
  and future per-node visual assets.

Excluded for now:

- Implementation plans and code changes.
- Issue publication to the tracker.
- Final PRD/issue consolidation against all architecture/refactor plans.

## Shards

1. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/01-reconnaissance-synthesis|Reconnaissance synthesis]]
2. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/02-structural-taxonomy|Structural taxonomy]]
3. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/03-wave-task-breakdown|Wave and task breakdown]]
4. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/04-issue-slice-draft|Issue slice draft]]
5. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/05-notebook-navigator-react-to-svelte-research|Notebook Navigator React to Svelte research]]
6. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/06-wave-2-files-tree-vertical-spec|Wave 2 files tree vertical spec]]
7. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/07-wave-2-tags-props-vertical-spec|Wave 2 tags and props vertical spec]]
8. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/08-wave-2-overlay-invalidation-spec|Wave 2 overlay invalidation spec]]
9. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/09-wave-2-view-adapter-virtualizer-spec|Wave 2 view adapter and virtualizer spec]]
10. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/10-wave-2-selection-control-spec|Wave 2 selection and control state spec]]
11. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/11-wave-2-test-performance-gates|Wave 2 test and performance gates]]
12. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/12-wave-2-plan-reconciliation-spec|Wave 2 plan reconciliation spec]]
13. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/13-wave-4-implementation-spec-set|Wave 4 implementation spec set]]
14. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 files tree snapshot first slice]]
15. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]]
16. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]]
17. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]]
18. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]]
19. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]]

## Current Decision

Use a cleaner incremental architecture, not a shallow patch sequence:

- first define the taxonomy and vertical codebase specs;
- then reconcile the provisional Notebook Navigator comparison against those
  vertical specs;
- then write implementation specs with enough certainty to integrate structural
  changes;
- then compare against existing plans and PRDs before publishing issues.
- keep structural snapshots memory-first while specifying a separate
  media/derived-content cache database for cached explorer images.

## Completion State

- Reconnaissance wave: complete.
- Structural/taxonomic synthesis: complete in this folder.
- Detailed Wave 2 vertical specs: complete in shards 06 through 12.
- Notebook Navigator React-to-Svelte research: initial pass complete in shard
  05; conclusions must be revalidated against Wave 2 before Wave 4 specs.
- Implementation specs: Wave 4 draft complete in shards 13 through 17.
- Final issues/PRDs: Wave 5 draft candidates complete; publication pending
  user approval and tracker target. Local Markdown issues are published at
  [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]].
