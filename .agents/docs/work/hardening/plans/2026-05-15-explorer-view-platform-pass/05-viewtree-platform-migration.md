---
title: viewTree platform migration
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - explorer/tree
  - explorer/migration
created_by: codex
updated_by: codex
---

# viewTree Platform Migration

### Task 13: Tree Projection Adapter

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/services/serviceExplorerProjection.ts`
- Modify: `test/component/viewTreeGridRowInputContract.test.ts`
- Modify: `test/component/viewTreeScrollFallback.test.ts`

- [ ] **Step 1: Add tests for projection-backed rows**

Mount tree with `rowInputs` and with projection rows. Assert same visible
labels, ids, depths, selection classes, and scroll reveal behavior.

- [ ] **Step 2: Move flattening out of render hot path**

Use projection rows and `visibleIds` as the render source. Keep legacy `nodes`
input as compatibility adapter until callers migrate.

- [ ] **Step 3: Preserve markup and classes**

Keep `.vm-tree-virtual-row`, `.vm-tree-row-surface`, `.vm-tree-label`,
`.vm-tree-field-zone`, `.vm-tree-badge-zone`, and `.vm-selection-box`.

- [ ] **Step 4: Commit**

Commit message: `refactor: migrate tree rows to explorer projection`.

### Task 14: Tree Scroll Coordinator Integration

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/services/serviceExplorerScrollGeometry.ts`
- Modify: `test/component/viewTreeScrollFallback.test.ts`

- [ ] **Step 1: Add scroll intent tests**

Assert reveal by id uses projection `idToIndex`, revision guard, and fixed-row
top calculation. Assert stale revisions do not scroll.

- [ ] **Step 2: Replace local reveal lookup**

Use `serviceExplorerScrollGeometry.ts` for reveal target resolution. Keep
TanStack virtualizer ownership inside the view adapter.

- [ ] **Step 3: Verify 10K and 50K synthetic tree jumps**

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts --fileParallelism=false`

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeScrollFallback.test.ts --fileParallelism=false`

- [ ] **Step 4: Commit**

Commit message: `refactor: route tree reveal through scroll coordinator`.

### Task 15: Panel And List Adapter Alignment

**Files:**
- Modify: `src/components/panels/panelExplorer.svelte`
- Modify: `src/components/views/ViewNodeList.svelte`
- Modify: `test/component/reactiveExplorers.test.ts`
- Modify: `test/component/ViewNodeList.test.ts`

- [ ] **Step 1: Add panel projection wiring tests**

Assert panel creates one projection per provider/view revision and passes stable
rows to tree/list.

- [ ] **Step 2: Keep list behavior stable**

Adapt `ViewNodeList.svelte` only where needed to consume shared projection
facts. Do not alter row height, row classes, or activation behavior.

- [ ] **Step 3: Verify**

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/reactiveExplorers.test.ts test/component/ViewNodeList.test.ts --fileParallelism=false`

- [ ] **Step 4: Commit**

Commit message: `refactor: align panel tree list projection adapters`.

### Task 16: Table/Grid/Cards Contract Hooks

**Files:**
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `test/component/viewNodeTableHeightmap.test.ts`
- Modify: `test/component/viewNodeDynamicGeometry.test.ts`
- Modify: `test/component/viewNodeCards.test.ts`

- [ ] **Step 1: Add contract acceptance tests**

Assert table/grid/cards accept projection row facts and media descriptors with
media render disabled by default.

- [ ] **Step 2: Add adapter hooks without full 50K blocker**

Wire shared geometry/media contract inputs where low risk. Keep their existing
render behavior stable.

- [ ] **Step 3: Verify 10K gates**

Run focused table/grid/cards component tests and existing stress tests.

- [ ] **Step 4: Commit**

Commit message: `refactor: add platform contracts to table grid cards`.
