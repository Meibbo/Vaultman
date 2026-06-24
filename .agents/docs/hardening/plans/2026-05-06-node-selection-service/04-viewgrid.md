---
title: Viewgrid
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/plan
  - explorer/views
  - viewgrid
---

# Phase 4: Viewgrid

## Ownership

Recommended subagent: viewgrid worker.

Write scope:

- create `src/components/views/ViewNodeGrid.svelte` or refactor
  `src/components/views/viewGrid.svelte` behind tests;
- if the old file-specific implementation must survive temporarily, move it to
  `src/components/views/ViewFileGrid.svelte` or another explicit compatibility
  name before changing imports;
- modify `src/components/containers/panelExplorer.svelte` grid branch;
- modify `src/styles/data/_grid.scss`;
- modify `src/styles/data/_file-list.scss` only if the old file-specific row
  list is moved or renamed;
- create `test/component/viewGridSelection.test.ts`;
- extend `test/component/panelExplorerEmpty.test.ts` if fallback behavior
  changes.

Do not create `viewTable.svelte` in this phase.

## TDD Steps

1. Write a component test that renders the node grid with generic `TreeNode`
   items.
   - No `TFile` or Obsidian `App` prop should be required.
   - Expected: tile label and icon render.

2. Run the test and confirm it fails against the current file-specific grid or
   fails because `ViewNodeGrid.svelte` does not exist.

3. Implement minimal generic grid props.
   - `nodes`;
   - `selectedIds`;
   - `focusedId`;
   - `activeId`;
   - selection/action/context callbacks;
   - `icon`.

4. Add test for plain tile click selection.
   - Expected: selection callback receives target id and no primary action is
     called unless the label/action zone is clicked.

5. Add test for tile label/action click.
   - Expected: primary action callback receives node id.

6. Add test for Control/Command and Shift modifier forwarding.
   - Expected: grid forwards modifier state to the parent adapter.

7. Add test for drag rectangle selection.
   - Expected: intersecting tile ids are reported in visual order.

8. Add test for context menu selected set behavior through parent or grid
   callback.

9. Update `panelExplorer.svelte` grid branch.
   - Feed generic nodes into the node-grid adapter.
   - Use `provider.getTree()` as the source for non-file providers.
   - For files, prefer provider tree nodes so file/folder semantics remain
     available; only flatten files directly if tests prove the tree source
     cannot preserve current file workflows.
   - Use the same selection service snapshot as the tree branch.
   - Keep file workflows available by converting files to nodes or by using
     provider tree nodes when possible.

10. Add persistence tests across view switches.
    - Select node ids in tree mode, switch to grid mode, assert matching tiles
      are selected.
    - Select node ids in grid mode, switch to tree mode, assert matching rows
      are selected.
    - For file nodes, assert selected file paths still sync to
      `filterService.setSelectedFiles`.

11. If old file-specific behavior must be preserved temporarily, move the old
    implementation to a clearly named compatibility component before replacing
    `viewGrid.svelte`.

12. Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerEmpty.test.ts --fileParallelism=false
```

Expected: grid selection tests and panel explorer fallback tests pass.

## Layout Requirements

The grid should be a compact operational tile view:

- responsive columns using CSS grid;
- stable tile dimensions with no layout shift on hover;
- icon, label, count, and badge zones;
- selected/focused/active states distinct;
- reduced-motion-safe transitions;
- no decorative card nesting.
