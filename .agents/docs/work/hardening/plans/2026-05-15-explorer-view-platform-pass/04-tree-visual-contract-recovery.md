---
title: Tree visual contract recovery
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-16T03:52:00-05:00
tags:
  - agent/plan
  - explorer/tree
  - explorer/visual-contract
created_by: codex
updated_by: codex
---

# Tree Visual Contract Recovery

### Task 10: Tree Visual Baseline Tests

**Files:**
- Create: `test/component/viewTreeVisualContract.test.ts`
- Modify: `test/component/viewTreeSelection.test.ts`

- [x] **Step 1: Add selected and filtered state tests**

Mount `viewTree.svelte` with `selectedIds` and `activeFilterIds`. Assert:

```ts
expect(row.classList.contains('is-selected')).toBe(true);
expect(surface.classList.contains('is-selected')).toBe(true);
expect(filteredSurface.classList.contains('is-active-filter')).toBe(true);
```

Also assert selected+filtered rows contain both classes.

- [x] **Step 2: Add style contract assertions**

Use `getComputedStyle(surface)` where component CSS is available. Assert
filtered background is not equal to full `--interactive-accent`, and that the
left border color resolves to a non-empty accent-derived value.

Note: component tests do not load the compiled Explorer SCSS, so the baseline
asserts the same contract against `src/styles/explorer/_virtual-list.scss`.

- [x] **Step 3: Add extension placement assertions**

Render files with `pdf` and `md` extensions. Assert:

```ts
expect(target.querySelector('[data-node-field="ext"]')?.textContent).toBe('pdf');
expect(target.textContent).not.toContain('md');
```

- [x] **Step 4: Run focused tests**

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`

Expected: fail until visual fixes land.

2026-05-16 RED result:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
failed as expected: 1 failed / 1 passed files, 3 failed / 20 passed tests.
Failures cover markdown extension visibility, trailing extension-zone layout,
and selected+filtered background composition.

### Task 11: Restore Box Selection

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `test/component/viewTreeSelection.test.ts`

- [x] **Step 1: Add drag-box regression test**

Simulate pointer down/move/up on `.vm-tree-virtual-outer`. Assert
`.vm-selection-box` appears during drag and `onBoxSelect` receives semantic ids.

- [x] **Step 2: Fix pointer capture and row intersection**

Keep box geometry relative to the tree viewport. Resolve intersecting rows from
rendered virtual rows and semantic row ids.

- [x] **Step 3: Verify**

Run the focused tree selection command from Task 10.
Expected: pass.

2026-05-16 GREEN result:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
passed: 1 file / 20 tests. The combined Task 10 + Task 11 command still fails
only on the three intentional Task 10 visual contracts that Task 12 owns.

- [x] **Step 4: Commit**

Commit message: `fix: restore tree box selection`.

Deferred until the Task 10 visual baseline is made green by Task 12, so the
working tree does not receive a commit while a tracked baseline is knowingly
red.

Completed in `a79f905` with the Task 12 visual contract commit.

### Task 12: Restore Highlight And Extension Contracts

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/services/serviceNodeFieldVisibility.ts`
- Modify: `test/component/viewTreeVisualContract.test.ts`

- [x] **Step 1: Verify current accent transparency source**

Inspect `viewTree.svelte` styles for existing translucent accent background.
Reuse that token or expression for filtered rows. Do not use solid accent as a
row background.

- [x] **Step 2: Fix state composition**

Rules:

- selected row uses grey base;
- filtered row uses accent left border and translucent accent background;
- selected+filtered keeps selected grey plus accent border;
- labels remain legible.

- [x] **Step 3: Fix extension field behavior**

Right-align `.vm-tree-field-zone`. Return empty string for `ext === 'md'` in
`nodeFieldText('files', node, 'ext')`.

- [x] **Step 4: Verify and commit**

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts --fileParallelism=false`

Commit message: `fix: restore tree visual contract`.

2026-05-16 GREEN result:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
passed: 2 files / 24 tests.
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts test/unit/styles/nodeDecorationStyles.test.ts --fileParallelism=false`
passed: 2 files / 10 tests.
`pnpm check` passed with 0 errors / 0 warnings.
`pnpm exec tsc -noEmit -skipLibCheck` passed.
Commit: `a79f905` `fix: restore tree visual contract`.
