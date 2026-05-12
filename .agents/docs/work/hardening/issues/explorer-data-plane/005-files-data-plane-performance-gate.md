---
title: EDP-005 Files data-plane performance gate
type: issue
issue_id: EDP-005
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
  - "[[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]"
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
created_by: codex
updated_by: codex
---

# EDP-005 Files Data-Plane Performance Gate

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices|Wave 4 follow-up slices]]

## What To Build

Add a performance gate that measures the Files data-plane path and proves
whether queue/filter-only changes avoid structural snapshot rebuilds.

## Acceptance Criteria

- [ ] Perf probe records snapshot creation, lookup-map creation, layer
      batching, reveal lookup, and total panel refresh cost.
- [ ] Before/after record shows whether queue/filter-only changes avoid
      structural rebuilds.
- [ ] Existing performance baseline is updated or linked with the new data.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]
- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]

## Verification

- Run the targeted performance probe and record before/after evidence in the
  active hardening source record.
