---
title: EDP-006 Tags and Props snapshot adapters
type: issue
issue_id: EDP-006
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
  - "[[005-files-data-plane-performance-gate|EDP-005]]"
created_by: codex
updated_by: codex
---

# EDP-006 Tags And Props Snapshot Adapters

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-a---tags-and-props-snapshots|Wave 4 Slice A]]

## What To Build

Extend the proven snapshot contract from Files to Tags and Props while
preserving provider action behavior for filters, queue ops, FnR, binding notes,
context menus, and property/value scope.

## Acceptance Criteria

- [ ] Tags/Props snapshots cover ids, parent links, visible order, search mode,
      sort target, casing, object values, and value removal.
- [ ] Provider actions for filters, queue ops, FnR, binding notes, and context
      menus remain compatible.
- [ ] `indexProps` versus `PropertyIndexService` ownership is documented or
      resolved.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]
- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[005-files-data-plane-performance-gate|EDP-005]]

## Verification

- Run focused Tags/Props provider tests and new snapshot adapter tests.
