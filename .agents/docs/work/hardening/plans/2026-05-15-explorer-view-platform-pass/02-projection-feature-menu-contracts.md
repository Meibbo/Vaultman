---
title: Projection, feature, and menu contracts
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - explorer/architecture
created_by: codex
updated_by: codex
---

# Projection, Feature, And Menu Contracts

### Task 4: Shared Projection Types And Builder

**Files:**
- Create: `src/services/serviceExplorerProjection.ts`
- Create: `test/unit/services/serviceExplorerProjection.test.ts`
- Modify: `src/services/serviceExplorerRowInput.ts`

- [ ] **Step 1: Write failing projection contract tests**

Use synthetic rows to assert:

```ts
const projection = createExplorerProjection({
	providerId: 'files',
	viewMode: 'tree',
	rowInputs,
	sourceRevision: 1,
});

expect(projection.visibleIds[9999]).toBe('node-9999');
expect(projection.idToIndex.get('node-9999')).toBe(9999);
expect(projection.indexToId.get(9999)).toBe('node-9999');
expect(projection.rowsRevision).toBe(1);
expect(projection.mediaById.get('node-0')?.status).toBe('unprocessed');
```

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerProjection.test.ts --fileParallelism=false`

Expected: fail because the projection service does not exist.

- [ ] **Step 2: Implement projection builder**

Create rows with stable keys, depth, parent id, node reference, row input,
provider id, view mode, and media descriptor reference. Do not include decoded
media blobs.

- [ ] **Step 3: Add revision invalidation tests**

Assert same source revision reuses stable ids and new source revision increments
`rowsRevision` or `layoutRevision` only where expected.

- [ ] **Step 4: Commit**

Commit message: `feat: add explorer projection contract`.

### Task 5: View Feature Contract

**Files:**
- Create: `src/services/serviceExplorerViewContract.ts`
- Create: `test/unit/services/serviceExplorerViewContract.test.ts`

- [ ] **Step 1: Write failing feature matrix tests**

Assert `tree`, `list`, `table`, `grid`, and `cards` declare support for:
selection, keyboard focus, context menu, scroll reveal, badges, node element
toggles, and media descriptor acceptance.

- [ ] **Step 2: Implement contract registry**

Expose:

```ts
export function explorerViewContract(viewMode: ExplorerViewMode): ExplorerViewFeatureContract
```

Map is excluded from selectable modes in this pass.

- [ ] **Step 3: Add no-tree-only API guard**

Test that every non-Map mode has a contract entry and that table/grid/cards
have adapter notes for 10K gates and 50K characterization.

- [ ] **Step 4: Commit**

Commit message: `feat: add explorer view feature contract`.

### Task 6: View Menu Element Contract

**Files:**
- Modify: `src/services/serviceNodeFieldVisibility.ts`
- Modify: `src/components/layout/overlays/overlayViewMenu.svelte`
- Modify: `test/component/overlayViewMenu.test.ts`

- [ ] **Step 1: Add failing media field tests**

Assert `media` is a legal node field, defaults off for all views, and appears
in `btnNodeElementsVisibility` when not using the native Obsidian preset.

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts --fileParallelism=false`

Expected: fail until `media` is registered and rendered.

- [ ] **Step 2: Add `media` field definition**

Add a `NodeFieldId` value `media` with `defaultOn: false`. Do not mark it as
identity. Ensure default visible fields remain unchanged for existing views.

- [ ] **Step 3: Respect native preset**

When native preset is active, element visibility follows the preset. When
custom preset is active, `btnNodeElementsVisibility` controls granular elements.

- [ ] **Step 4: Commit**

Commit message: `feat: add explorer node media field toggle`.
