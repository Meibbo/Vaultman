---
title: SDF-004 Split date sort into modified and created cache-backed sorts
type: issue
issue_id: SDF-004
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
  - explorer/sort
  - statistics/cache
blocked_by:
  - "[[003-repair-files-explorer-sort-execution|SDF-003]]"
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-004 Split Date Sort Into Modified And Created Cache-Backed Sorts

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Replace the ambiguous `date` sort with separate `modified time` and `created time` sorts across
explorers, backed by the same IndexedDB/statistics cache strategy used for file-level statistics.

## Acceptance Criteria

- [ ] The old single `date` sort is removed or migrated from user-facing sort menus.
- [ ] Files, Props, Tags, and Content where applicable expose separate `modified time` and `created time` options.
- [ ] Each date option has a distinct calendar-style icon.
- [ ] Created/modified timestamps are cached per file as derived statistics data instead of recalculated through hot UI paths.
- [ ] Existing settings/sort state migrates safely when it references the old `date` sort.
- [ ] Sorting Props or Filters by date does not freeze or materially slow the active filter section on the `plugin-dev` vault.

## Blocked By

- [[003-repair-files-explorer-sort-execution|SDF-003]]

## Verification

- Run focused sort and settings migration tests.
- Run cache/statistics tests that prove timestamp reads use cached file-level records where available.
- Build, sync, reload `plugin-dev`, and measure date sort behavior on Props and Files with `dev:errors` clean.
