---
title: Verification And Acceptance
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

# Verification And Acceptance

## Functional Acceptance

Tree must preserve:

- row click selection;
- primary/secondary/tertiary actions;
- context menu trigger;
- expand/collapse caret behavior;
- keyboard navigation delegated by A.R;
- rename input behavior;
- direct badges;
- inherited child badge indicator;
- hover badges;
- active filter highlight;
- search highlight;
- warning state;
- DnD visual state;
- sticky ancestor rows;
- selection box behavior;
- scroll target reveal.

## Data Contract Acceptance

For a snapshot with collapsed descendants:

- `TreeRenderProjection.structuralRowCount` equals full snapshot row count.
- `TreeRenderProjection.visibleRowCount` equals `snapshot.visibleIds.length`.
- `TreeRenderProjection.rows.length` equals visible row count.
- `TreeRenderProjection.idToIndex` contains visible ids only.
- Collapsed descendant ids are absent from `idToIndex`.

For an expanded nested tree:

- parent index is lower than child index;
- ancestor indices are ordered root-to-parent;
- subtree end index is the last visible descendant;
- sticky candidate rows match the old behavior for the same visible topology.

## Performance Acceptance

Baseline from 2026-05-20:

- Tree: p99/max `1051 ms`.
- List: p99/max `43 ms`.

Target:

- Tree p99 under `150 ms` in the same 50k Files matrix.
- Tree max delay under `300 ms` unless a single outlier is explained by a non-Tree Obsidian runtime event.
- Tree zero blank frames.
- List remains zero blank frames and does not materially regress.

If target is not reached:

- The implementation may still be accepted only if the record includes timing marks proving projection cost was removed and identifies the next top hotspot with evidence.

## Required Tests

Focused:

```powershell
pnpm vitest run test/unit/services/serviceTreeRenderProjection.test.ts
pnpm vitest run test/component/viewTreeScrollFallback.test.ts
pnpm vitest run test/component/containers/panelExplorerViewHostMount.test.ts
pnpm vitest run test/component/panelExplorerSelection.test.ts
```

General gates:

```powershell
pnpm run check
pnpm run lint
pnpm run build
git diff --check
```

Full `pnpm run verify` is recommended before commit if the touched surface exceeds the planned files or if component tests show timing-sensitive behavior.

## Live Verification

Use explicit vault targeting. Do not rely on the focused Obsidian vault.

Required:

- run the existing Explorer scroll smoke against `plugin-dev` for Tree and List;
- run the registered 50k stress-vault matrix if the environment is ready;
- capture `obsidian vault=plugin-dev dev:errors` after reload and smoke.

Record raw output in the implementation record, not in current status.

## Regression Guards

Add or preserve assertions for:

- `data-index` values matching projection index;
- `data-vm-total-rows` matching visible row count, not structural row count;
- no zero virtual rows while row count is positive and viewport is visible;
- sticky rows rendered from projection metadata;
- `ViewHost` passing `treeRenderProjection` only to Tree;
- List path still using `listProjection`.

## Documentation Acceptance

After implementation:

- update the V.D implementation record with commands and raw stress output;
- update current status/handoff with a compact link only;
- leave this spec as the source of expected behavior unless implementation discovers a necessary contract change, in which case update the spec before final handoff.

