---
title: SDF-008 Correct Tags nested/simple grouping semantics
type: issue
issue_id: SDF-008
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T15:02:00-05:00
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/tags
blocked_by:
  - "[[007-nested-flat-hierarchy-mode-all-explorers|SDF-007]]"
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-008 Correct Tags Nested/Simple Grouping Semantics

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Correct Tags grouping so nested tags and simple tags represent different tag shapes instead of a
nonfunctional or misleading grouping option.

## Acceptance Criteria

- [x] `Nested tags` shows only level-1 tags that have child tags at level N.
- [x] `Simple tags` shows only level-1 tags that do not have child tags.
- [x] Tags with deeper descendants preserve their hierarchy in nested mode.
- [x] Search respects the active grouping mode and still reveals visible matches.
- [x] Counts, badges/decorations, selection, and context menus remain correct in both groupings.
- [x] Focused tests cover simple-only tags, nested tags, and mixed vault data.

## Blocked By

- [[007-nested-flat-hierarchy-mode-all-explorers|SDF-007]]

## Verification

- Run focused Tags logic tests.
- Build, sync, reload `plugin-dev`, and inspect nested/simple grouping with representative tags.

## Resolution - 2026-06-06

Implemented in product worktree `hotfix/1.0.2-css-scorecard` as part of the
SDF-007/SDF-008 wave.

- Replaced the old misleading Tags grouping path where `simple` collected all
  leaf tags at any depth.
- `Simple tags` now returns only root/level-1 tags with no children.
- `Nested tags` now returns only root/level-1 tags with children and preserves
  the full descendant hierarchy below those roots.
- The grouping helper is pure and covered by mixed-tree unit tests.

Verification evidence:

- `test/unit/explorerHierarchy.test.ts` covers mixed simple/nested roots and
  verifies that nested descendants are preserved.
- `pnpm run verify` passed (`25` unit files / `82` tests; scorecard `17`
  checks).
- Runtime DOM smoke in `plugin-dev` confirmed `Nested tags` returned only roots
  with carets (`allHaveCaret=true`) and `Simple tags` returned only root ids
  without slash paths and without carets (`noSlashIds=true`, `noCarets=true`).
- Final `obsidian vault=plugin-dev dev:errors` returned `No errors captured`.
