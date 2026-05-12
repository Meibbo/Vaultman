---
title: EDP-004 Batched Files overlay layers through ViewService
type: issue
issue_id: EDP-004
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

- [ ] Files data-plane path builds layer map from one batched `ViewService`
      call.
- [ ] Queue/filter-only changes update layers without rebuilding structural
      snapshot rows.
- [ ] Batch parity tests match current per-node decoration behavior.
- [ ] `ViewLayers` remains canonical and `TreeNode` decoration stays a bridge.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]

## Verification

- Run focused `ViewService`, Files provider, queue/filter decoration, and layer
  parity tests.
