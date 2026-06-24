---
title: Tree adapter
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/plan
  - explorer/tree
  - explorer/selection
---

# Phase 2: Tree Adapter

## Ownership

Recommended subagent: tree-adapter worker.

Write scope:

- modify `src/components/containers/panelExplorer.svelte`;
- modify `src/components/views/viewTree.svelte`;
- modify `src/styles/explorer/_virtual-list.scss`;
- modify `src/styles/explorer/_tree.scss` only for state styling if needed;
- create `test/component/viewTreeSelection.test.ts`.

Do not edit provider domain logic in this phase unless a component test cannot
be written without a tiny test-only provider stub.

## TDD Steps

1. Write a component test proving chevron click only toggles.
   - Render a parent node with one child.
   - Click `.vm-tree-toggle`.
   - Expected: `onToggle` called once; row selection handler not called; primary
     action handler not called.

2. Run the test and confirm current behavior.
   - If it already passes, keep the test as regression coverage.

3. Write a component test proving badge click only runs the badge action.
   - Existing tests cover badge click partially; extend if needed for selection
     handler separation.

4. Write a component test proving row-slot click selects from apparent gaps.
   - Stub `getBoundingClientRect` or use pointer coordinates to click the top
     and lower parts of a virtual slot.
   - Expected: the same node id is reported.

5. Refactor row markup to use full-slot hit target plus inner visual surface.
   - Preserve existing badge and highlight rendering.
   - Keep input clicks isolated from row selection.

6. Write a component test proving label/action click calls primary action.
   - Add a prop such as `onPrimaryAction` or reuse a renamed callback if the
     implementation keeps `onRowClick` as selection.
   - Expected: primary action called once; selection remains a separate call if
     designed to happen on label click too.

7. Update `panelExplorer.svelte` to use `plugin.selectionService` or an injected
   `NodeSelectionService` instance instead of local anchor/focus/selected state.
   - If `VaultmanPlugin` does not yet expose this service, add it in the plugin
     service-construction path used by adjacent services in the same phase only
     if mounted integration tests require that wiring.

8. Add top-level Svelte document handlers for outside click and Escape.
   - `Escape` clears selection when no inline editor consumed it.
   - Outside click clears only when the click target is outside the active
     explorer root.

9. Add ARIA updates.
   - Tree root gets `aria-multiselectable="true"`.
   - Selectable treeitems get `aria-selected={isSelected}`.
   - Do not combine active filter with `aria-selected`; active filter is a
     visual/domain state, not selection.

10. Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts --fileParallelism=false
```

Expected: selection tests and existing decoration tests pass.

## Implementation Notes

Use Svelte top-level `<svelte:document>` or `<svelte:window>` event handling
for document/window events. The Svelte docs state these elements manage cleanup
and must live at the component top level.

Keep pointer rectangle code in `viewTree.svelte` as a view gesture adapter, but
return slot ids to the parent. Do not mutate the selection service directly
inside the view unless the project explicitly chooses service imports in views.
