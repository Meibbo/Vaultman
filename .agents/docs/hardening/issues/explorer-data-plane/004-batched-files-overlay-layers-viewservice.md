---
title: EDP-004 Batched Files overlay layers through ViewService
type: issue
issue_id: EDP-004
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

# EDP-004 Batched Files Overlay Layers Through ViewService

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/15-wave-4-viewservice-overlay-batching|Wave 4 ViewService overlay batching]]

## What To Build

Replace Files per-node decoration calls with one batched `ViewService` layer
path over snapshot rows, keeping `ViewLayers` canonical and `TreeNode`
decoration as a compatibility bridge.

## Acceptance Criteria

- [x] Files data-plane path builds layer map from one batched `ViewService`
      call.
- [x] Queue/filter-only changes update layers without rebuilding structural
      snapshot rows.
- [x] Batch parity tests match current per-node decoration behavior.
- [x] `ViewLayers` remains canonical and `TreeNode` decoration stays a bridge.

## 2026-05-12 Reconciliation Note

Wave 3 Agent B targeted the older `sandbox` `FilesExplorerProvider` shape. The
reconciled implementation keeps Wave 2's structural data-plane contract intact:
structural trees are cached by source/filter/sort/index revisions, and queue or
filter-only changes are applied through a batched layer bridge instead of
rebuilding the Files structure.

`serviceExplorerLayers.ts` centralizes the compatibility bridge from
`ViewLayers` to decorated `TreeNode` fields. `ViewService.getModel()` is called
once per decorated tree build with the flattened node batch.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts`
- `pnpm run test:unit -- test/unit/services/serviceViews.test.ts test/unit/components/explorerFiles.test.ts`
- `pnpm run check`
