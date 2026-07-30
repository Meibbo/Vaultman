---
title: Slice 0 contracts
type: plan-shard
status: historical
parent: "[[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceviews-plan]]"
created: 2026-05-04T16:40:00
updated: 2026-05-12T09:00:34
tags:
  - agent/plan
  - explorer/views
updated_by: codex
---

# Slice 0 Contracts

> [!warning] Historical Slice
> This shard belongs to the historical
> [[docs/work/hardening/plans/2026-05-04-serviceviews-implementation/index|serviceViews implementation plan]].
> Do not execute it as current Explorer data-plane work.

## Files

- Create: `src/types/typeViews.ts`
- Modify: `src/types/typeExplorer.ts`
- Test: `test/unit/services/serviceViews.test.ts`

## Steps

- [ ] Add a failing unit test that imports the wished-for contract from `typeViews.ts` and builds a list render model with one row, one badge layer, one query highlight, and one semantic action.
- [ ] Run the specific unit test and confirm it fails because `typeViews.ts` does not exist.
- [ ] Implement `typeViews.ts` with:
  `ExplorerViewMode = 'tree' | 'table' | 'grid' | 'cards' | 'list'`, `ViewLayers`, `ViewBadge`, `ViewHighlightLayers`, `ViewRow`, `ViewCell`, `ViewColumn`, `ExplorerRenderModel`, `ExplorerViewInput`, `ViewAction`, and `IViewService`.
- [ ] Update `typeExplorer.ts` to import/re-export `ExplorerViewMode` from `typeViews.ts` so existing providers move toward the canonical mode union.
- [ ] Run the unit test and confirm the contract compiles.

## Acceptance

- No UI behavior changes.
- Existing imports of `ExplorerViewMode` still compile.
- The mode union includes `table` and `list`; old `masonry` is not part of the new canonical view service contract.
