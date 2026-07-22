---
title: BT5-058 — Glyph color projection gaps
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, color, index, files]
---

# BT5-058 — Glyph color projection gaps

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrective successor to [[../bt5-next-release/025-native-glyph-color-system|BT5-025]].

## What to build

Apply the selected glyph color to Floating Index action nodes when they join the
rail, and to `cell_name` for folder rows in Files Tree. Do not invent folder
projection for Table/Cards, which currently contain no folders. Preserve Iconic
explicit-color precedence and existing scope rules.

## Acceptance criteria

- [ ] Rail action nodes use glyph color under the same static/always policy as the rail.
- [ ] Files Tree folder icon and `cell_name` receive the resolved folder glyph color.
- [ ] File labels follow only the configured scope; explicit external colors still win.
- [ ] Table/Cards receive no fictional folder-specific branches.
- [ ] Default choice applies no forced color.
- [ ] Tests cover default/faint/accent/custom/rainbow and rail joined/unjoined actions.
- [ ] Runtime smoke covers light/dark theme and plain/non-plain Index.

## Blocked by

None — can start immediately.
