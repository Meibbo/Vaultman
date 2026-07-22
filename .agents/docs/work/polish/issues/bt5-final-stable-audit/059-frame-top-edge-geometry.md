---
title: BT5-059 — Restore frame top-edge clipping geometry
type: issue
status: needs-triage
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, frame, geometry]
---

# BT5-059 — Restore frame top-edge clipping geometry

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Diagnose and remove the bar/padding/margin that pushes the Navbar and explorer
down even when Navbar is hidden, preventing scrolled rows from clipping cleanly
at the frame edge. Compare the beta.5 rendering and the geometry introduced by
`b56b9a78`, then fix the actual owner instead of adding compensating negative margins.

## Acceptance criteria

- [ ] A DOM geometry record identifies the exact element/property creating the gap.
- [ ] Navbar visible and hidden states share a deliberate top-edge contract.
- [ ] Scrolled explorer rows disappear at the frame clip edge without leaking above it.
- [ ] No empty bar remains when Navbar is hidden.
- [ ] Popout, main leaf, sidebars, minimal/non-minimal and mobile are checked.
- [ ] Focus rings, sticky headers and searchbox are not clipped accidentally.
- [ ] Regression test protects structural classes/styles; runtime smoke verifies pixels.

## Blocked by

None — diagnosis can start immediately.
