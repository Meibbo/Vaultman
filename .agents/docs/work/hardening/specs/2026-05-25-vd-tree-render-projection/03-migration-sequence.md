---
title: Migration Sequence
type: spec-shard
status: draft
parent: "[[index|V.D Tree Render Projection]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/view-decomposition
  - explorer/performance
---

# Migration Sequence

Use TDD for behavior and focused performance probes for cost. Keep commits small enough that a failed stress run can be bisected.

## Task 1: Unit-Test The Projection Builder

Files:

- Create `src/services/serviceTreeRenderProjection.ts`.
- Create `test/unit/services/serviceTreeRenderProjection.test.ts`.

Required cases:

1. Flat roots preserve input order.
2. Collapsed parent excludes descendants when `visibleIds` is omitted.
3. Supplied `visibleIds` defines exact output order.
4. `parentIndex` points to the visible parent when parent is visible.
5. `ancestorIndices` matches current `viewTree` sticky expectations.
6. `subtreeEndIndex` closes at the last visible descendant.
7. Duplicate ids keep first occurrence.
8. Missing `visibleIds` entries are skipped without throwing.
9. `structuralRowCount` and `visibleRowCount` are distinct when collapsed.

Expected focused command:

```powershell
pnpm vitest run test/unit/services/serviceTreeRenderProjection.test.ts
```

## Task 2: Add Projection Type Plumbing Without Behavior Change

Files:

- Modify `src/components/explorer/ViewHost.svelte`.
- Modify `src/components/views/viewTree.svelte`.

Steps:

1. Add optional `treeRenderProjection`/`renderProjection` props.
2. Keep existing `projection` and `nodes` behavior as fallback.
3. In `viewTree`, derive `flatArray` from `renderProjection.rows` when present.
4. Keep `flatRowInputs` derived from projection rows' `row` values.
5. Keep `flatIdToIndex` compatible with reveal lookup.

Focused tests:

```powershell
pnpm vitest run test/component/viewTreeScrollFallback.test.ts
pnpm vitest run test/component/containers/panelExplorerViewHostMount.test.ts
```

## Task 3: Build Tree Render Projection In `panelExplorer`

Files:

- Modify `src/components/containers/panelExplorer.svelte`.
- Add component/unit tests if existing coverage does not assert counts.

Steps:

1. Keep `treeRowInputs` creation from `snapshot.rows` initially. This is still useful as the row lookup source.
2. Create `treeRenderProjection` from `treeRowInputs` plus `snapshot.visibleIds`.
3. Pass `treeRenderProjection` to `ViewHost`.
4. Preserve `treeProjection` during the first commit if Grid/Cards still use the generic projection prop. Confirm `ViewHost` sends the new projection only to Tree.
5. Add perf counts for `structuralRowCount` and `visibleRowCount`.

Focused tests:

```powershell
pnpm vitest run test/component/containers/panelExplorerViewHostMount.test.ts
pnpm vitest run test/component/panelExplorerSelection.test.ts
```

## Task 4: Remove Files Tree Dependency On `flatProjectionRows`

Files:

- Modify `src/components/views/viewTree.svelte`.
- Modify or add tests around projection path.

Steps:

1. Verify the Files Tree route receives `renderProjection`.
2. Keep legacy `flatProjectionRows` only for non-Files test consumers if needed.
3. If no consumer remains, delete `flatProjectionRows`.
4. If a consumer remains, rename the helper or guard it with a comment saying it is legacy fallback only and must not be used by Files Tree.
5. Ensure `viewTree.flatten` perf mark no longer fires for the Files Tree route during the stress matrix.

Focused tests:

```powershell
pnpm vitest run test/component/viewTreeScrollFallback.test.ts
pnpm vitest run test/component/viewTreeGridRowInputContract.test.ts
```

If `viewTreeGridRowInputContract.test.ts` asserts the old "projection rows are already visible" semantics, update the test to assert the new `TreeRenderProjection` contract explicitly.

## Task 5: Verify Sticky And Reveal Parity

Files:

- `src/components/views/viewTree.svelte`
- Existing Tree component tests.

Required checks:

1. Sticky ancestors still appear for nested visible rows.
2. Sticky rows use `subtreeEndIndex` from projection metadata.
3. `scrollTarget` reveal uses `renderProjection.idToIndex`.
4. Keyboard focus reveal still works for visible rows.
5. Collapsed descendants are not revealable by visible index until expanded.

Focused tests:

```powershell
pnpm vitest run test/component/viewTreeScrollFallback.test.ts
pnpm vitest run test/component/panelExplorerSelection.test.ts
pnpm vitest run test/component/panelExplorerBadgeCollision.test.ts
```

## Task 6: Stress Matrix And Record

Files:

- Update the active implementation record under `.agents/docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/` or create a V.D implementation record if the user asks for a separate plan.

Required command family:

```powershell
pnpm run check
pnpm run lint
pnpm run build
pnpm vitest run test/unit/services/serviceTreeRenderProjection.test.ts
```

Required live/stress evidence:

- 50k Tree/List Files matrix with the same runner options used in the existing 2026-05-20 stress-vault record.
- Include Tree `structuralRowCount`, `visibleRowCount`, `maxDelay`, `p95`, `p99`, blank frames, and final `dev:errors`.
- Include List as control.

Acceptance:

- Tree zero blank frames.
- List zero blank frames.
- Tree p99 under `150 ms` or a written explanation with raw timing marks that identifies the remaining top hotspot.

