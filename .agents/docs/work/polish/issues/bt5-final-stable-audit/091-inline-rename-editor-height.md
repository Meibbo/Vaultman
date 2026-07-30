---
title: BT5-091 — Inline rename editor takes the row height
type: issue
status: completed
lifecycle: active
priority: P3
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-23T00:30:00
updated: 2026-07-23T02:10:00
created_by: claude-opus-4-8-audit
updated_by: claude-opus-4-8-audit
resolved_by: aeb1df1d
tags: [agent/issue, triage/completed, initiative/polish, release/1.2.0, explorer, css]
---

# BT5-091 — Inline rename editor takes the row height

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

The Tags inline rename input carried a fixed `height: 20px` plus a negative vertical margin, so it spilled out of its row and covered the neighbouring cells, and its vertical padding made it taller than the node it replaces. Let it stretch to the row instead.

## Acceptance criteria

- [x] The input stretches to the row; no fixed height, no negative margin.
- [x] Vertical padding removed; `min-width: 0` stops a long value widening the row.
- [x] Stylelint clean.

## Blocked by

None.

## Outcome

Resolved by `aeb1df1d`. Making the inline editor the default rename path for a single node (behind a Layout setting) is separate — see [[../v1-2-1-polish/index|the 1.2.1 backlog]].
