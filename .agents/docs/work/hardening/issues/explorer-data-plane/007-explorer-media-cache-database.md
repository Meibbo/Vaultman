---
title: EDP-007 Explorer media cache database
type: issue
issue_id: EDP-007
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-11T20:55:00
labels:
  - needs-triage
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

Create a media/derived-content cache database for cached explorer images and
previews. Keep media metadata and blobs outside structural snapshots, and use
narrow file/node-level media subscriptions for visible thumbnail updates.

## Acceptance Criteria

- [ ] Media cache records store status/key metadata separately from blobs.
- [ ] Blob reads validate the expected `mediaKey` before returning cached
      content.
- [ ] A bounded in-memory blob LRU and lazy visible-row loading are tested.
- [ ] File/node-level media subscriptions update thumbnails without rebuilding
      structural snapshots or `ViewService` layers.
- [ ] Implementation does not introduce persistent structural snapshot storage
      or a generic row-level subscription system.

## Blocked By

- [[001-approve-issue-set-and-supersession-notes|EDP-001]]
- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- Run media cache unit tests for stale-key rejection, LRU behavior, lazy load,
  and media status transition subscriptions.
