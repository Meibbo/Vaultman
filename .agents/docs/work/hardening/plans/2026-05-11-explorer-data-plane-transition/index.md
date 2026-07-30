---
title: Explorer data plane transition plans
type: plan-index
status: active
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition]]"
created: 2026-05-11T22:10:13
updated: 2026-05-13T19:55:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
created_by: codex
updated_by: codex
---

# Explorer Data Plane Transition Plans

Planning records for turning the Explorer data-plane specs and local issues into executable implementation work.

## Shards

1. [[01-wave-a-b-claude-handoff|Wave A/B Claude handoff]]
2. [[02-edp-002-files-snapshot-data-plane-implementation-plan|EDP-002 Files snapshot data-plane implementation plan]]
3. [[03-edp-002-wave-c-codex-continuation|EDP-002 Wave C Codex continuation]]
4. [[04-parallel-agent-dispatch-index|EDP parallel agent dispatch index]]
5. [[05-worker-operating-contract|EDP worker operating contract]]
6. [[06-parallel-branch-integration|Parallel branch integration handoff]]
7. [[07-final-stabilization|EDP final stabilization]]

Wave A scout reports live under `reports/`:

- [[reports/a1-files-source-tree-contracts|Scout A1 Files source and tree contracts]]
- [[reports/a2-panel-selection-reveal|Scout A2 Panel selection and reveal]]
- [[reports/a3-tests-verification|Scout A3 Tests and verification gates]]
- [[reports/a4-viewservice-overlay-boundary|Scout A4 ViewService and overlay boundary]]

## Current Route

- Wave A/B (Claude) completed on 2026-05-12: four scout reports landed and EDP-002 implementation plan written as shard `02`.
- EDP-001 through EDP-010 are complete through the local final stabilization branch `codex/edp-final-stabilization`.
- The parallel integration landed on `claude/explorer` in [[06-parallel-branch-integration|Parallel branch integration handoff]].
- The final stabilization gate passed in [[07-final-stabilization|EDP final stabilization]], including the previously known `stress.test.ts` and `viewTableStress.test.ts` performance thresholds.
- Every worker must follow [[05-worker-operating-contract|EDP worker operating contract]] for base branch, worktree naming, ownership boundaries, verification, and handoff.
