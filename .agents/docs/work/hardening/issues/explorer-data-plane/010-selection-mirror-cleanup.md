---
title: EDP-010 Selection mirror cleanup
type: issue
issue_id: EDP-010
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
  - "[[009-adapter-row-contract-follow-up|EDP-009]]"
created_by: codex
updated_by: codex
---

# EDP-010 Selection Mirror Cleanup

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-d---selection-mirror-cleanup|Wave 4 Slice D]]

## What To Build

Remove or explicitly deprecate the `ViewService` selection/focus mirror after
snapshot-backed adapters consume `NodeSelectionService` projections.

## Acceptance Criteria

- [ ] `ViewService` selection/focus mirror is removed or explicitly deprecated
      behind a read adapter.
- [ ] Tests prove no divergence from `NodeSelectionService`.
- [ ] Row state output still supports legacy layer consumers where needed.

## Blocked By

- [[009-adapter-row-contract-follow-up|EDP-009]]

## Verification

- Run focused selection, `ViewService`, and adapter compatibility tests.
