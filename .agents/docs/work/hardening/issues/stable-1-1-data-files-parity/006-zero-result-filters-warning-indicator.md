---
title: SDF-006 Zero-result filters warning indicator
type: issue
issue_id: SDF-006
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
  - filters
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-006 Zero-Result Filters Warning Indicator

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Change the Filters FAB indicator so active filters that return zero files show `lucide-warning`
instead of a numeric badge.

## Acceptance Criteria

- [ ] When active filters return one or more files, the FAB badge keeps the normal count behavior.
- [ ] When active filters return zero files, the FAB indicator shows `lucide-warning`.
- [ ] The warning indicator is reactive to filter add/remove, Files search-derived filters, and filter clearing.
- [ ] The warning state is accessible by tooltip or label and does not use misleading accent styling.
- [ ] Focused tests cover zero-result and nonzero-result transitions.

## Blocked By

None - can start immediately.

## Verification

- Run focused filter/FAB tests.
- Build, sync, reload `plugin-dev`, create a zero-result filter, and inspect the FAB with `obsidian-cli`.
