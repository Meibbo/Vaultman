---
title: Tree keyboard expansion semantics
type: implementation-plan
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|node-expansion-keyboard-grid]]"
created: 2026-05-07T00:00:00
updated: 2026-05-07T01:02:22
tags:
  - agent/plan
  - explorer/tree
  - ui/keyboard
created_by: antigravity
updated_by: codex
---

# Tree Keyboard Expansion Semantics

## Purpose

Add the missing left/right tree semantics while preserving the current selection
service contract.

## Files

- Modify: `src/components/containers/panelExplorer.svelte`
- Modify if helper extraction is warranted: `src/logic/logicKeyboard.ts`
- Test: `test/component/panelExplorerSelection.test.ts`
- Test if pure helper extraction happens: `test/unit/logic/logicKeyboard.test.ts`
- Existing component adapter to preserve: `src/components/views/viewTree.svelte`

## Required Behavior

- `ArrowLeft` on an expanded parent collapses that parent.
- `ArrowLeft` on a child node moves focus and selection directly to the parent.
- Pressing `ArrowLeft` again on that now-focused parent collapses it.
- `ArrowRight` on a collapsed parent expands that parent.
- `ArrowRight` on a leaf does nothing except prevent no default if no action is
  taken.
- `ArrowDown`, `ArrowUp`, `Space`, and `Enter` keep their current selection and
  activation semantics.
- The command must use current visible tree order and current expansion state.
- The command must not run provider primary actions unless `Enter` is pressed or
  an explicit label/action target is activated.

## Implementation Shape

- Add a local tree relationship helper in `panelExplorer.svelte` first:
  `nodeRelationshipMap(nodes)` or equivalent.
- The helper should return:
  - `parentById: Map<string, string>`
  - `nodeById: Map<string, TreeNode>`
  - `childrenById: Map<string, readonly TreeNode[]>`
- Keep this helper inside `panelExplorer.svelte` unless the test shape proves it
  belongs in `logicKeyboard.ts`.
- Extend `handleRowKeydown(id, e)` with an early branch for `ArrowLeft` and
  `ArrowRight` before up/down movement.
- For parent movement, call `selectionService.selectPointer(provider.id,
  visibleNodeIds(), parentId)` and `commitSelection(...)` so selection, focus,
  anchor, `ViewService`, and file selection mirror all stay consistent.
- For collapse/expand, call `toggleExpand(id)` or explicit `expandNode(id)` /
  `collapseNode(id)` helpers so manual expanded/collapsed sets remain coherent
  with auto expansion.

## TDD Steps

- [x] Add a component test with `parent -> child`, initially expanded. Select
  the child, dispatch `ArrowLeft` on the child row, and assert selection/focus
  moves to the parent while the parent remains expanded.

- [x] Extend that test by dispatching `ArrowLeft` again on the parent row and
  asserting the child row disappears and parent `aria-expanded` becomes `false`.

- [x] Add a component test with a collapsed parent. Dispatch `ArrowRight` on the
  parent row and assert the child row appears and parent `aria-expanded` becomes
  `true`.

- [x] Add a component test proving `ArrowRight` on a leaf does not activate the
  provider and does not mutate selection unexpectedly.

- [x] Implement only the keyboard branch necessary to pass those tests.

- [x] Helper logic stayed local to `panelExplorer.svelte`; no pure helper
  extraction was warranted, so no additional `logicKeyboard.ts` tests were
  added beyond the existing focused unit suite.

## Verification Commands

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/logic/logicKeyboard.test.ts`
- `pnpm run check`

## Acceptance

- Keyboard tree behavior matches the user's requested sequence:
  child `ArrowLeft` -> parent focus; parent `ArrowLeft` -> collapse; collapsed
  parent `ArrowRight` -> expand.
- Selection service snapshot, `ViewService` mirror, and ARIA state agree after
  every keyboard command.
