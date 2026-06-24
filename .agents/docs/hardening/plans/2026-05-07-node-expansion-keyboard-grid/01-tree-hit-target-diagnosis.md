---
title: Tree hit-target diagnosis and repair
type: implementation-plan
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|node-expansion-keyboard-grid]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T01:02:22
tags:
  - agent/plan
  - explorer/tree
  - ui/hit-targets
created_by: antigravity
updated_by: codex
---

# Tree Hit-Target Diagnosis And Repair

## Purpose

Diagnose why expand/collapse can still fail, with special attention to the left
chevron/icon area, the selection rectangle, inherited badges, quick-action
badges, and any stale drag suppression.

## Files

- Modify tests: `test/component/viewTreeSelection.test.ts`
- Modify tests if panel state is involved: `test/component/panelExplorerSelection.test.ts`
- Modify Svelte if needed: `src/components/views/viewTree.svelte`
- Modify styles if needed: `src/styles/explorer/_virtual-list.scss`
- Modify styles if needed: `src/styles/explorer/_tree.scss`
- Regenerate after SCSS changes: `src/styles.css`

## Current Risk Map

- `.vm-selection-box` has `pointer-events: none`, so it should not consume
  clicks. Still test it because the user saw behavior consistent with overlap.
- `.vm-selection-box` has high `z-index: 20`; even with pointer-events disabled,
  visual overlay can obscure what the user thinks is clickable.
- `viewTree.svelte` only ignores box-select starts on descendants matching
  `input, textarea, select, button, .vm-tree-toggle, .vm-badge,
  .vm-tree-child-badge-indicator, [role="button"]`.
- `suppressNextClick` is set after rectangle selection and suppresses the next
  click. A drag ending on or near the chevron could make the next chevron click
  look broken.
- `.vm-tree-child-badge-pill` is absolutely positioned on the right, so it is
  less likely to block the left chevron, but it must still be tested for row
  activation and pointer isolation.
- Quick-action badges start as `pointer-events: none` until row hover/focus.
  They should not block chevrons, but they may alter focus/hover surface state.

## TDD Steps

- [x] Add a component test that renders a parent with children and clicks the
  visible left chevron in both selected and unselected row states.
  Expected before any fix: test should expose the reported failure if current
  geometry is wrong, or pass and become regression coverage if the bug is
  elsewhere.

- [x] Add a component test that creates a selection rectangle over the row,
  finishes the drag, then clicks the chevron twice.
  Expected: first chevron click after a drag should not be swallowed unless the
  click is the synthetic click caused by the drag itself. If it is swallowed,
  the test should pin the intended behavior.

- [x] Add a component test for inherited badge projection on a collapsed parent:
  clicking the inherited badge should run badge action only; clicking the
  chevron should toggle only; neither action should activate/select via the row.

- [x] Add a component test for a quick-action badge on a parent row:
  clicking the quick action should run only the badge action; clicking the
  chevron while the row is hovered/focused should still toggle only.

- [x] Evaluated the `suppressNextClick` seam. No narrowing was required after
  the regression test confirmed intentional chevron clicks after box selection
  are not swallowed.

- [x] Evaluated hit-target geometry. Existing chevron isolation plus regression
  coverage confirmed selected/active row visuals do not consume chevron clicks.

- [x] Evaluated badge overlap. Inherited and quick-action badge regression tests
  confirm badge clicks and chevron clicks remain isolated.

- [x] Regenerate CSS with `pnpm run build` if SCSS changes.

## Verification Commands

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run build`

## Acceptance

- Chevron clicks toggle expansion regardless of selected/focused/active-filter
  state.
- A visible selection rectangle never blocks a chevron click.
- A completed rectangle drag does not accidentally swallow the user's next
  intentional chevron click.
- Badges remain isolated action targets and never activate/select the row unless
  their own action explicitly does so.
- Row-slot click still selects, and label click still activates.
