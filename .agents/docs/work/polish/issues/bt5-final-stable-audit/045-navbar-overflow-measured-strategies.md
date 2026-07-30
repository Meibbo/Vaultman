---
title: BT5-045 — Measured Navbar overflow strategies
type: issue
status: needs-triage
lifecycle: active
priority: P0
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, navbar, responsive]
---

# BT5-045 — Measured Navbar overflow strategies

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrective successor to [[../bt5-next-release/021-toolbar-overflow-strategy|BT5-021]] and [[../bt5-next-release/039-toolbar-node-reorder-and-fixed-count|BT5-039]].

## What to build

Implement three distinct strategies over the actual ordered action-node list:
Condensed removes the rightmost two overflowing actions first and then proceeds leftward into Tools; Scroll keeps a fixed one-line viewport and scrolls without a visible scrollbar; Wrap delegates natural multi-line layout to the workspace.
Capacity is measured from the Navbar host and action widths, never hardcoded to Auto-reveal or Expand/Collapse.

## Acceptance criteria

- [ ] Condensed moves only nodes that do not fit, preserving left-to-right order in Tools.
- [ ] The first condensation moves the two rightmost candidates; narrower widths move one additional node at a time.
- [ ] At minimum width, capacity reflects real label/action widths (including the 4-icons-with-label / 5-without-label reference) rather than fixed action ids.
- [ ] Scroll uses one fixed horizontal lane, `nowrap`, focus visibility and hidden bar.
- [ ] Wrap produces natural rows and never behaves like Condensed or Scroll.
- [ ] Resize/action availability changes do not cause a ResizeObserver feedback loop.
- [ ] Every provider receives the same strategy implementation.
- [ ] Tests cover boundary pixels, reorder, dynamic actions and all three modes.

## Blocked by

- [[043-universal-navbar-panel-widget|BT5-043]].
