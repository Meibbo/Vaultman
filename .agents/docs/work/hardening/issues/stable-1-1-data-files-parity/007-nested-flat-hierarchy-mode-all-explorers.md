---
title: SDF-007 Nested and flat hierarchy mode across explorers
type: issue
issue_id: SDF-007
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
  - explorer/views
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-007 Nested And Flat Hierarchy Mode Across Explorers

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Make the `Nested` view-menu option work across Files, Props, and Tags. Nested is on by default; when
disabled, hierarchy is represented as flat path-style labels.

## Acceptance Criteria

- [ ] Files, Props, and Tags expose a `Nested` view option.
- [ ] `Nested` is enabled by default for all three explorers.
- [ ] When `Nested` is enabled, nodes render as tree hierarchy with level indentation.
- [ ] When `Nested` is disabled, nodes render flat with labels like `level1/level2/levelN`.
- [ ] Selection, context menu, badges/decorations, filters, and queue interactions still work in both modes.
- [ ] Switching modes does not break virtualization or duplicate visible rows.

## Blocked By

None - can start immediately.

## Verification

- Run focused tree projection tests for nested and flat output.
- Build, sync, reload `plugin-dev`, and smoke all three explorers in both modes.
