---
title: EDP-009 Adapter row contract follow-up
type: issue
issue_id: EDP-009
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
  - "[[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]"
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
  - "[[008-overlay-projection-extraction|EDP-008]]"
created_by: codex
updated_by: codex
---

# EDP-009 Adapter Row Contract Follow-Up

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-c---adapter-row-contract|Wave 4 Slice C]]

## What To Build

Move tree, grid, table, and cards toward snapshot-backed row inputs or a
documented compatibility adapter while keeping virtualizers adapter-local and
preserving existing Polish table/card behavior.

## Acceptance Criteria

- [ ] Tree/grid/table/cards consume snapshot-backed row inputs or a documented
      compatibility adapter.
- [ ] Virtualizers remain adapter-local.
- [ ] Table and cards behavior from existing Polish work is preserved.
- [ ] SVAR remains a side-effecting compatibility adapter.

## Blocked By

- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[008-overlay-projection-extraction|EDP-008]]

## Verification

- Run focused adapter tests for tree, grid, table, cards, and any SVAR bridge
  touched by the migration.
