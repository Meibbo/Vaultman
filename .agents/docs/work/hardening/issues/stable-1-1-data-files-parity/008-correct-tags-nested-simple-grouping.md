---
title: SDF-008 Correct Tags nested/simple grouping semantics
type: issue
issue_id: SDF-008
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

- [ ] `Nested tags` shows only level-1 tags that have child tags at level N.
- [ ] `Simple tags` shows only level-1 tags that do not have child tags.
- [ ] Tags with deeper descendants preserve their hierarchy in nested mode.
- [ ] Search respects the active grouping mode and still reveals visible matches.
- [ ] Counts, badges/decorations, selection, and context menus remain correct in both groupings.
- [ ] Focused tests cover simple-only tags, nested tags, and mixed vault data.

## Blocked By

- [[007-nested-flat-hierarchy-mode-all-explorers|SDF-007]]

## Verification

- Run focused Tags logic tests.
- Build, sync, reload `plugin-dev`, and inspect nested/simple grouping with representative tags.
