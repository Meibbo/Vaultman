---
title: BT5-056 — Checkbox action_cell through the operation queue
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, properties, operations]
---

# BT5-056 — Checkbox action_cell through the operation queue

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Render Boolean values as interactive checkbox `action_cells` in formatted mode.
Intercept the edit intent before any native/core write, resolve every file
represented by the value node and route through `queueService.addOrRun`. Stage mode
shows the pending value plus `badge_rename`; bypass mode writes once immediately.

## Acceptance criteria

- [ ] Checkbox is interactive, keyboard accessible and reflects Boolean semantics.
- [ ] One interaction emits one typed value-change intent and no direct duplicate write.
- [ ] Stage mode queues `property/action:set/oldValue/value/files` and shows badge.
- [ ] A newer pending intent for the same value node replaces the older one.
- [ ] Returning to the original value removes the pending operation and badge.
- [ ] Bypass mode performs one write and refreshes the value node once.
- [ ] Boolean YAML values remain booleans; arrays update matching members safely.
- [ ] Engine adapters preserve the action_cell semantics in Tree/Table/Cards.

## Blocked by

- [[055-property-format-cell|BT5-055]].
