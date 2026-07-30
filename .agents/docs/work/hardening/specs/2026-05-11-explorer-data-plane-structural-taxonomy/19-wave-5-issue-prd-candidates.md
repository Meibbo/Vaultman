---
title: Wave 5 issue and PRD candidates
type: issue-draft
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T19:56:34
updated: 2026-05-11T20:55:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - needs-triage
created_by: codex
updated_by: codex
---

# Wave 5 Issue And PRD Candidates

These are draft tracker candidates. They are not published issues. Publish only after the user approves granularity and tracker target.

Publication update: the local Markdown issue set has been created at [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]].
The published issues start with `needs-triage` and preserve AFK/HITL as separate metadata.

## PRD Candidate

No new PRD is required by default. Use [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]] as the parent PRD and attach this Wave 5 candidate list as implementation breakdown. Create a tracker parent only if the project wants a single issue to own the whole transition.

## Candidate Issues

1. **Approve explorer data-plane issue set and supersession notes**
   - Type: HITL
   - Blocked by: none.
   - Covers: approval of Wave 5 granularity, issue tracker target, and stale plan annotations.
   - Acceptance:
     - User approves or edits this issue list.
     - Issue tracker target is confirmed.
     - Explorer View Service selection wording and `serviceViews` plan status have a clear supersession note.

2. **Files snapshot data-plane foundation**
   - Type: AFK
   - Blocked by: issue 1.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 files tree snapshot first slice]].
   - Covers user stories: PRD 1, 5, 11, 12, 16, 18.
   - Acceptance:
     - `typeExplorerDataPlane`, pure snapshot builder, and data-plane service exist with unit tests.
     - Files provider exposes undecorated structural source while `getTree()` and action hooks remain compatible.
     - Snapshot tests cover rows, maps, visible ids, parent links, path/folder lookup, revision replacement, and subscriptions.

3. **Files panel snapshot compatibility and revisioned reveal**
   - Type: AFK
   - Blocked by: issue 2.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]].
   - Covers user stories: PRD 2, 8, 10, 12, 18.
   - Acceptance:
     - Files path uses snapshot visible order for prune/range/box selection.
     - Tree reveal target includes snapshot revision and late id-to-index lookup.
     - Legacy recursive helpers remain fallback for non-snapshot providers.
     - Existing panel/tree selection and scroll tests remain green.

4. **Batched Files overlay layers through ViewService**
   - Type: AFK
   - Blocked by: issue 2.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]].
   - Covers user stories: PRD 3, 4, 13, 14, 17.
   - Acceptance:
     - Files data-plane path builds layer map from one batched `ViewService` call.
     - Queue/filter-only changes update layers without rebuilding structural snapshot rows.
     - Batch parity tests match current per-node decoration behavior.
     - `ViewLayers` remains canonical and `TreeNode` decoration stays a bridge.

5. **Files data-plane performance gate**
   - Type: AFK
   - Blocked by: issues 2, 3, and 4.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]].
   - Covers user stories: PRD 5, 19.
   - Acceptance:
     - Perf probe records snapshot creation, lookup-map creation, layer batching, reveal lookup, and total panel refresh cost.
     - Before/after record shows whether queue/filter-only changes avoid structural rebuilds.
     - Existing performance baseline is updated or linked with the new data.

6. **Tags and Props snapshot adapters**
   - Type: AFK
   - Blocked by: issues 2, 3, 4, and 5.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-a---tags-and-props-snapshots|Wave 4 Slice A]].
   - Covers user stories: PRD 3, 6, 11, 15.
   - Acceptance:
     - Tags/Props snapshots cover ids, parent links, visible order, search mode, sort target, casing, object values, and value removal.
     - Provider actions for filters, queue ops, FnR, binding notes, and context menus remain compatible.
     - `indexProps` versus `PropertyIndexService` ownership is documented or resolved.

7. **Explorer media cache database**
   - Type: AFK
   - Blocked by: issues 1 and 2.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-f---media-cache-db-and-filenode-subscriptions|Wave 4 Slice F]].
   - Covers user decision: explorers may show cached images; media blobs should be persisted separately from structural snapshots.
   - Acceptance:
     - Media cache records store status/key metadata separately from blobs.
     - Blob reads validate the expected `mediaKey` before returning cached content.
     - A bounded in-memory blob LRU and lazy visible-row loading are tested.
     - File/node-level media subscriptions update thumbnails without rebuilding structural snapshots or `ViewService` layers.
     - The implementation does not introduce persistent structural snapshot storage or a generic row-level subscription system.

8. **Overlay projection extraction**
   - Type: AFK
   - Blocked by: issues 4 and 6.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-b---overlay-projection-module|Wave 4 Slice B]].
   - Covers user stories: PRD 3, 4, 14, 17.
   - Acceptance:
     - Queue/filter projection rules move behind a tested module while `ViewLayers` stays output.
     - Queue popup and active-filter list presentation have pure projection tests outside Svelte components.
     - Existing `serviceBadge` and `badgeRegistry` vocabulary is reused.

9. **Adapter row contract follow-up**
   - Type: AFK
   - Blocked by: issues 3, 4, and 8.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-c---adapter-row-contract|Wave 4 Slice C]].
   - Covers user stories: PRD 2, 7, 10, 17.
   - Acceptance:
     - Tree/grid/table/cards consume snapshot-backed row inputs or a documented compatibility adapter.
     - Virtualizers remain adapter-local.
     - Table and cards behavior from existing Polish work is preserved.
     - SVAR remains a side-effecting compatibility adapter.

10. **Selection mirror cleanup**
   - Type: AFK
   - Blocked by: issue 9.
   - Source: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-d---selection-mirror-cleanup|Wave 4 Slice D]].
   - Covers user stories: PRD 2, 8, 18.
   - Acceptance:
     - `ViewService` selection/focus mirror is removed or explicitly deprecated behind a read adapter.
     - Tests prove no divergence from `NodeSelectionService`.
     - Row state output still supports legacy layer consumers where needed.

## Publication Gate

Before creating tracker issues:

- Confirm whether issues should be GitHub, local markdown, or another tracker.
- If using the standard issue skills, configure `docs/agents/` or explicitly approve a one-off publication target.
- Confirm whether issue 1 should be a real tracker issue or just this Wave 5 source record.
