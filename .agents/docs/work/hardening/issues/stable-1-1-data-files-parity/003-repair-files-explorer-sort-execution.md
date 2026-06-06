---
title: SDF-003 Repair Files explorer sort execution
type: issue
issue_id: SDF-003
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
  - explorer/files
  - explorer/sort
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-003 Repair Files Explorer Sort Execution

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Repair Files explorer sort controls so every exposed sort option changes the rendered order in every
supported Files view without breaking virtualization or scroll.

## Acceptance Criteria

- [ ] Files sort options apply to tree, table, grid, and list views.
- [ ] Sort state is retained when switching away from and back to Files.
- [ ] Sort changes do not reset scroll more than required by a legitimate re-order.
- [ ] Sort changes do not duplicate rows or break the virtual viewport.
- [ ] Focused tests cover Files sort comparator behavior and selected UI state.
- [ ] `plugin-dev` smoke verifies visible order changes for at least name, path/folder, count, and date-derived options that remain before SDF-004.

## Blocked By

None - can start immediately.

## Verification

- Run focused Files logic/sort tests.
- Run `pnpm run check`.
- Build, sync, reload `plugin-dev`, and inspect Files row order before and after each sort option.
