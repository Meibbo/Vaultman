---
title: EDP-009 Adapter row contract follow-up
type: issue
issue_id: EDP-009
status: active
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T10:58:39
labels:
  - ready-for-agent
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]"
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
  - "[[008-overlay-projection-extraction|EDP-008]]"
created_by: codex
updated_by: codex
---

# EDP-009 Adapter Row Contract Follow-Up

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-c---adapter-row-contract|Wave 4 Slice C]]

## What To Build

Move tree, grid, table, and cards toward snapshot-backed row inputs or a
documented compatibility adapter while keeping virtualizers adapter-local and
preserving existing Polish table/card behavior.

## Acceptance Criteria

- [x] Tree/grid/table/cards consume snapshot-backed row inputs or a documented
      compatibility adapter.
- [x] Virtualizers remain adapter-local.
- [x] Table and cards behavior from existing Polish work is preserved.
- [ ] SVAR is removed after row-contract finalization, including code paths and
      package imports; do not preserve a SVAR compatibility bridge.

## G0 Coordinator Notes

- Decision record:
  [[009-row-input-vocabulary-decision|EDP-009 row-input vocabulary decision]].
- Added `src/services/serviceExplorerRowInput.ts` as the shared row-input
  contract/helper module for G1 tree/grid and G2 table/cards work.
- Integrated G0 into `claude/explorer` with merge commit `071e490`.
- The contract documents snapshot, TreeNode, and ViewRow compatibility rows,
  semantic callback ids, `ViewLayers` bridging, reveal lookup inputs, and
  row/group key helpers.
- No tree/grid/table/cards component migration was performed in G0.
- SVAR bridge work remains superseded. Deletion is intentionally deferred until
  after row-contract finalization.

## G1 Tree/Grid Notes

- Implemented on branch `codex/edp-009-tree-grid` in worktree
  `.claude/worktrees/edp-009-tree-grid`.
- `viewTree.svelte` and `ViewNodeGrid.svelte` now accept optional
  `ExplorerRowInput` rows while preserving the existing `TreeNode[]` caller
  path as an adapter-local compatibility adapter.
- Tree keeps virtualizer ownership local, uses `rowInputVirtualKey()` and
  `resolveRowInputRevealIndex()`, rebuilds supplied row-input hierarchy from
  `parentId`/`childrenIds`, and routes row, toggle, context, hover-badge, and
  box-selection callbacks through semantic row ids.
- Grid keeps virtualizer ownership local, bridges supplied root row inputs back
  to render `TreeNode`s with semantic ids, uses `rowInputGroupKey()` for row
  grouping, and preserves selection, hover badge, and manual DnD behavior.
- Table/cards/SVAR, selection mirror cleanup, performance thresholds, and
  Tags/Props snapshot internals were not touched.

## G2 Table/Cards Notes

- Branch/worktree: `codex/edp-009-table-cards` at
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-009-table-cards`.
- `serviceViewTableAdapter` now exposes `nodeRowsFromRowInputs()` and routes
  existing `nodeRowsFromTree()` through `ExplorerRowInput` compatibility rows.
- Table rows preserve stable DOM row ids while carrying explicit callback ids
  and source row-input metadata for component callbacks.
- Cards accept optional `rowInputs`, derive legacy `TreeNode[]` through
  `rowInputFromTreeNode()` when absent, keep row grouping/measurement
  adapter-local, and use `rowInputGroupKey()` for durable card-row keys.
- `ViewNodeTable.svelte` and `ViewNodeCards.svelte` keep TanStack
  virtualizers, sorting, delegated events, and card measurement/layout local to
  their adapters.
- Tree/grid/SVAR, selection mirror cleanup, sticky tree behavior, performance
  thresholds, and Tags/Props snapshot internals were not touched.

## Supersession Notes

- 2026-05-13 user decision: SVAR is no longer required. The previous Wave 2
  wording that kept SVAR as a compatibility bridge is superseded for EDP-009.
  The next agent should leave SVAR deletion until after row-contract
  finalization within this wave, then remove SVAR code and package imports.

## Blocked By

- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[008-overlay-projection-extraction|EDP-008]]

## Verification

- RED: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerRowInput.test.ts`
  failed because `src/services/serviceExplorerRowInput` did not exist.
- PASS: same focused EDP-009 contract test passed 1 file / 6 tests after the
  shared helper module was added.
- PASS: relevant unit gate passed 6 files / 47 tests:
  `serviceViewTableAdapter`, `serviceExplorerLayers`, `serviceViews`,
  `serviceExplorerDataPlane`, `logicExplorerSnapshot`, and
  `serviceOverlayProjection`.
- PASS: relevant component row/reveal/selection gate passed 14 files / 117
  tests across virtualizer keys, panel reveal/selection, tree, grid, table, and
  cards focused suites.
- PASS: sticky tree focused gate passed 4 files / 39 tests.
- PASS: `pnpm run lint:full`.
- PASS: `pnpm run check`.
- PASS: `pnpm run build:plugin`.
- PASS: `git diff --check`; it emitted only an LF-to-CRLF warning for this
  edited issue doc.
- PASS on merged `claude/explorer`: focused contract 1 file / 6 tests,
  relevant unit 6 files / 47 tests, sticky component 4 files / 39 tests,
  `lint:full`, `check`, `build:plugin`, and `git diff --check`.
- G1 RED: `pnpm run test:component -- test/component/viewTreeGridRowInputContract.test.ts test/component/virtualizerItemKeys.test.ts`
  failed because tree/grid ignored `rowInputs`; virtualizer keys fell back to
  indexes and semantic row-input rows were not rendered.
- G1 PASS: same focused row-input gate passed 2 files / 8 tests.
- G1 PASS: focused unit gate passed 9 files / 58 tests:
  `serviceExplorerRowInput`, `serviceVirtualizer`, `serviceSelection`,
  `serviceManualDnd`, `serviceBadge`, `badgeRegistry`, and related virtual
  positioning/decoration styles.
- G1 PASS: relevant tree/grid component gate passed 18 files / 145 tests.
- G1 PASS: `viewNodeDynamicGeometry` grid-only rerun passed 1 test; the
  unrelated table half timed out once in the broader mixed file and remains
  outside G1 ownership.
- G1 PASS: sticky tree focused gate passed 4 files / 40 tests.
- G1 PASS: final `pnpm run lint:full`, `pnpm run check`,
  `pnpm run build:plugin`, and `git diff --check`; diff check emitted only
  LF-to-CRLF warnings.
- G2 RED: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceViewTableAdapter.test.ts`
  failed on missing `nodeRowsFromRowInputs`; table/cards component RED failed
  because `data-callback-id` and row-input callback routing were absent.
- G2 PASS: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerRowInput.test.ts test/unit/services/serviceViewTableAdapter.test.ts`
  passed 2 files / 15 tests.
- G2 PASS: focused table/cards component RED suite passed 2 files / 13 tests.
- G2 PASS: relevant non-threshold table/cards component gate passed 8 files /
  32 tests; `viewTableStress.test.ts` and `viewNodeDynamicGeometry.test.ts`
  still fail their timing gates on both this branch and clean
  `claude/explorer` at `6a4362f`.
- G2 PASS: sticky tree focused gate passed 4 files / 39 tests.
- G2 PASS: `pnpm run lint:full`, `pnpm run check`, and
  `pnpm run build:plugin`.
