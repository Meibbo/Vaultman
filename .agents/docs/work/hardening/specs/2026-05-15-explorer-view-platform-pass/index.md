---
title: Explorer View Platform pass spec
type: spec
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/spec
  - explorer/views
  - explorer/performance
  - explorer/tree
created_by: codex
updated_by: codex
---

# Explorer View Platform Pass Spec

## Objective

Build the Explorer platform pass that makes Vaultman faster and more coherent
than Notebook Navigator for comparable large-vault navigation, while preserving
Vaultman's broader provider/view feature set.

The pass is not a visual remake. It is a platform refactor with a real
`viewTree` migration, measured performance gates, and explicit visual contract
recovery for known tree regressions.

## Accepted Scope

- Shared Explorer projection core for all providers and views.
- View feature/menu contract, including native Obsidian preset behavior and
  granular `btnMultiSelection` node element toggles.
- Scroll and geometry coordinator.
- Decoration batching.
- Node render anatomy contract.
- Node media descriptor capability. The image/media element defaults off in
  every view because nodes already have icons.
- Real `viewTree` migration to the platform architecture.
- Tree visual contract recovery for known broken states.
- Synthetic 10K/50K/100K dataset harness and perf gates.

## Non-Goals

- No Map/ViewNodeMap implementation in this pass.
- No selectable Map view in the next release.
- No native Obsidian Bases media parity plan inside this pass.
- No arbitrary redesign of tree spacing, typography, colors, icons, or density.
- No separate tree/list-only platform APIs that table/grid/cards cannot later
  consume.

## Shards

- [[01-scope-performance-targets|Scope and performance targets]]
- [[02-architecture-contracts|Architecture contracts]]
- [[03-tree-migration-visual-contract|Tree migration and visual contract]]
- [[04-feedback-loops-acceptance|Feedback loops and acceptance criteria]]

## Performance Posture

- 10K nodes: release gate.
- 50K nodes: must-pass architectural gate for core, tree, and list.
- 100K nodes: proof benchmark for the core and projected linear surfaces, used
  to prove the architecture does not collapse.
- `table`, `grid`, and `cards`: contract included from the start; 10K is the
  initial gate and 50K is a characterizing benchmark, not the first blocker.

## Next Step

Implementation plan written:
[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]].

The first execution slice should build feedback loops and characterization
tests before moving product code.
