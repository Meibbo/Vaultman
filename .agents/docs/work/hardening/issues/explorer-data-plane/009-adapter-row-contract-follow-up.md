---
title: EDP-009 Adapter row contract follow-up
type: issue
issue_id: EDP-009
status: active
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T06:30:15
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
- The contract documents snapshot, TreeNode, and ViewRow compatibility rows,
  semantic callback ids, `ViewLayers` bridging, reveal lookup inputs, and
  row/group key helpers.
- No tree/grid/table/cards component migration was performed in G0.
- SVAR bridge work remains superseded. Deletion is intentionally deferred until
  after row-contract finalization.

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
