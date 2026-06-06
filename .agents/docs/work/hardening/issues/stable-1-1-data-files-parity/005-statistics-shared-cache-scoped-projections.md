---
title: SDF-005 Statistics shared cache with scoped projections
type: issue
issue_id: SDF-005
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T07:53:25
labels:
  - needs-triage
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - statistics/cache
blocked_by:
  - "[[004-split-date-sort-created-modified-cache|SDF-004]]"
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-005 Statistics Shared Cache With Scoped Projections

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Make Statistics use one shared per-file information source and project it through three scopes:
all eligible files, currently filtered files, and the focused editor file.

## Acceptance Criteria

- [ ] `All files`, `Filtered files`, and `Selected file` consume the same underlying file-level statistics cache.
- [ ] `All files` scopes to all eligible vault files.
- [ ] `Filtered files` scopes to the exact files returned by active filters.
- [ ] `Selected file` scopes only to the file in the currently focused editor, not a remembered explorer selection or stale active file.
- [ ] With no active filters, `All files` and `Filtered files` show exactly the same values.
- [ ] Live updates write to the shared cache and are reflected when switching scopes without recalculating from zero.
- [ ] Scope changes never replace last-good values with partial counters while reconciliation is still running.

## Blocked By

- [[004-split-date-sort-created-modified-cache|SDF-004]]

## Verification

- Run focused Statistics cache and scope projection tests.
- Build, sync, reload `plugin-dev`, then smoke all three scopes with no filters, with an active filter, and with a focused editor file.
