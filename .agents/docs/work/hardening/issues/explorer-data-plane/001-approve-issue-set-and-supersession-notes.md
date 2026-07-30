---
title: EDP-001 Approve issue set and supersession notes
type: issue
issue_id: EDP-001
status: completed
issue_kind: HITL
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-12T09:00:34
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
created_by: codex
updated_by: codex
---

# EDP-001 Approve Issue Set And Supersession Notes

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]]
- [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]]

## What To Build

Turn the approved Wave 5 issue set into the executable local issue baseline and record the stale-plan supersession notes needed before AFK implementation starts.

## Acceptance Criteria

- [x] User approves or edits the local Markdown issue set.
- [x] Local tracker target and label vocabulary are recorded.
- [x] Explorer View Service selection wording has a clear supersession note:
      `NodeSelectionService` owns selection/focus/hover/active state.
- [x] The old `serviceViews` implementation plan is marked historical, partially completed, or otherwise not executable as-is.

## Resolution

- User approved using the local Markdown issue set as the operational tracker for the Explorer data-plane transition.
- Tracker target remains [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]].
- Label vocabulary is recorded in the tracker index and now includes `completed` for resolved local issues.
- Supersession source is [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/18-wave-5-plan-comparison-reconciliation|Wave 5 plan comparison and reconciliation]]:
  `NodeSelectionService` owns selection/focus/hover/active state.
- The old [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]] is historical and partially completed. It is not executable as the current Explorer data-plane plan.

## Blocked By

None - can start immediately.

## Verification

- [x] Re-read linked source specs and confirm no stale implementation plan is treated as the current source of truth.
