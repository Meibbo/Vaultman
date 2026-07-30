---
title: EDP-007 Explorer media cache database
type: issue
issue_id: EDP-007
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
  - "[[001-approve-issue-set-and-supersession-notes|EDP-001]]"
  - "[[002-files-snapshot-data-plane-foundation|EDP-002]]"
created_by: codex
updated_by: codex
---

# EDP-007 Explorer Media Cache Database

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-f---media-cache-db-and-filenode-subscriptions|Wave 4 Slice F]]

## What To Build

Create a media/derived-content cache database for cached explorer images and previews. Keep media metadata and blobs outside structural snapshots, and use narrow file/node-level media subscriptions for visible thumbnail updates.

## Acceptance Criteria

- [x] Media cache records store status/key metadata separately from blobs.
- [x] Blob reads validate the expected `mediaKey` before returning cached content.
- [x] A bounded in-memory blob LRU and lazy visible-row loading are tested.
- [x] File/node-level media subscriptions update thumbnails without rebuilding structural snapshots or `ViewService` layers.
- [x] Implementation does not introduce persistent structural snapshot storage or a generic row-level subscription system.

## 2026-05-12 Reconciliation Note

Wave 3 Agent C was mostly independent of the Wave 2 Files data-plane work, so it was ported as a service-level slice on top of `claude/explorer`. The reconciled implementation keeps media records and blobs outside structural snapshots, validates reads against the expected `mediaKey`, and limits subscriptions to file/node media targets.

The in-memory store supports bounded read-through LRU behavior and lazy visible-row blob loading without adding row-level snapshot subscriptions.

## Blocked By

- [[001-approve-issue-set-and-supersession-notes|EDP-001]]
- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerMediaCache.test.ts --reporter verbose`
- `pnpm run check`
