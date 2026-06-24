---
title: Visual accessibility
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T19:21:11
tags:
  - agent/plan
  - accessibility
  - scss
---

# Phase 5: Visual Accessibility

## Ownership

Recommended subagent: visual-accessibility worker.

Write scope:

- `src/styles/explorer/_virtual-list.scss`;
- `src/styles/explorer/_tree.scss`;
- `src/styles/data/_grid.scss`;
- component tests that assert ARIA/state class output.

Do not change selection behavior in this phase.

## Steps

1. Add focused component assertions for ARIA.
   - Tree root has `aria-multiselectable="true"`.
   - Selectable treeitems have explicit `aria-selected`.
   - Grid root/tile roles expose a consistent multi-select model.

2. Run component tests and confirm expected failures before style/markup fixes.

3. Adjust markup/classes if Phase 2 and 4 have not already done it.

4. Add or adjust SCSS for distinct states.
   - `.is-selected`: stronger selection fill or inset accent.
   - `.is-focused` or `.is-active-node`: faint transparent focus/active state.
   - `.is-active-filter`: keep existing filter accent and make it coexist with
     selected.
   - `.vm-selection-box`: crisp outline and transparent fill.

5. Add reduced motion guard for any non-essential transform/opacity transition:

```scss
@media (prefers-reduced-motion: reduce) {
	.vm-tree-virtual-row,
	.vm-grid-tile,
	.vm-selection-box {
		transition: none;
	}
}
```

6. Scan colors and state combinations.
   - Avoid one-note all-blue/purple selection theme.
   - Ensure warning/deleted/pending badges remain readable on selected rows.

7. Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts --fileParallelism=false
pnpm run check
```

Expected: component tests and Svelte checks pass.
