---
title: BT5-057 — Date and datetime action_cell through the operation queue
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
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, properties, operations, web-lab]
---

# BT5-057 — Date and datetime action_cell through the operation queue

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Research Obsidian core Properties in `obsidian-web-lab` to document the DOM,
events, serialization and state transitions of date and datetime pickers. Use
instrumentation/monkey-patching in the lab for observation, not as the default
production mechanism. Implement Vaultman date/datetime `action_cells` that route
selection/clear/commit through the operation queue. Daily Note navigation remains
a separate non-mutating action.

## Acceptance criteria

- [ ] A source-backed lab record documents date and datetime widget contracts.
- [ ] Opening/canceling the picker creates no operation.
- [ ] Select/clear/commit creates one queued value-change intent with badge.
- [ ] Repeated pending edits replace/cancel like the checkbox action_cell.
- [ ] Date serialization never shifts a calendar day through UTC conversion.
- [ ] Datetime preserves the observed precision/timezone contract.
- [ ] Daily Note action respects configured path/format and never queues a write.
- [ ] Invalid/empty dates and absent Daily Notes integration have safe fallbacks.
- [ ] `plugin-dev` fidelity smoke is accepted by the dev.

## Blocked by

- [[055-property-format-cell|BT5-055]].
