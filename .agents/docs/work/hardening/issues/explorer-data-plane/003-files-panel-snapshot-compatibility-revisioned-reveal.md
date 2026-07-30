---
title: EDP-003 Files panel snapshot compatibility and revisioned reveal
type: issue
issue_id: EDP-003
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-12T12:00:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[002-files-snapshot-data-plane-foundation|EDP-002]]"
created_by: codex
updated_by: codex
---

# EDP-003 Files Panel Snapshot Compatibility And Revisioned Reveal

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/16-wave-4-panel-reveal-compatibility|Wave 4 panel and reveal compatibility]]

## What To Build

Move Files panel selection, prune/range helpers, and tree reveal to the snapshot visible-order contract while keeping legacy recursive helpers as fallbacks for non-snapshot providers.

## Acceptance Criteria

- [x] Files path uses snapshot visible order for prune/range/box selection.
- [x] Tree reveal target includes snapshot revision and late id-to-index lookup.
- [x] Legacy recursive helpers remain fallback for non-snapshot providers.
- [x] Existing panel/tree selection and scroll tests remain green.

## 2026-05-12 Reconciliation Note

Wave 3 Agent A originally edited `sandbox` and rebuilt explorer snapshots locally. That was not compatible with Wave 2 on `claude/explorer`, where `ExplorerDataPlaneService` is the canonical snapshot store. The reconciled implementation consumes `filesSnapshot` from `ExplorerDataPlaneService`, uses snapshot rows for `findNodeById` and `parentIdFor`, and sends revision-aware `ExplorerRevealTarget` values to `ViewTree`.

`ViewTree` now accepts `snapshotRevision` and `idToIndex`, ignores reveal targets that require a newer snapshot than the current row map, and falls back to recursive visible rows for non-snapshot providers.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- `pnpm run test:component -- test/component/viewTreeScrollFallback.test.ts`
- `pnpm run test:component -- test/component/panelExplorerSelection.test.ts test/component/viewTreeScrollFallback.test.ts`
- `pnpm run check`
