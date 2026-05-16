---
title: Scroll, geometry, decoration, and media layers
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - explorer/performance
  - explorer/geometry
created_by: codex
updated_by: codex
---

# Scroll, Geometry, Decoration, And Media Layers

### Task 7: Scroll And Geometry Coordinator

**Files:**
- Create: `src/services/serviceExplorerScrollGeometry.ts`
- Create: `test/unit/services/serviceExplorerScrollGeometry.test.ts`
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/components/views/ViewNodeList.svelte`

- [ ] **Step 1: Write failing coordinator tests**

Assert semantic intents resolve by id without scanning:

```ts
const coordinator = createExplorerScrollGeometry({
	idToIndex: new Map([['node-40', 40]]),
	rowHeight: 32,
	rowCount: 100,
});

expect(coordinator.resolve({ kind: 'id', id: 'node-40', reason: 'keyboard' })).toMatchObject({
	index: 40,
	top: 1280,
});
```

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerScrollGeometry.test.ts --fileParallelism=false`

Expected: fail until service exists.

- [ ] **Step 2: Implement fixed-row coordinator**

Support fixed row height for tree/list first, late id lookup, priority
coalescing, manual-scroll cancellation, and revision guard.

- [ ] **Step 3: Add variable geometry interface**

Add an interface for table/grid/cards estimates and measured corrections without
fully migrating those views in this pass.

- [ ] **Step 4: Commit**

Commit message: `feat: add explorer scroll geometry coordinator`.

### Task 8: Batched Decoration Layer

**Files:**
- Modify: `src/services/serviceExplorerLayers.ts`
- Create: `test/unit/services/serviceExplorerLayersBatch.test.ts`

- [ ] **Step 1: Write failing batched layer tests**

Assert one layer build accepts a projection and returns badge/filter/action
state keyed by node id. Assert repeated calls with same revision reuse cached
layers.

- [ ] **Step 2: Implement revision-keyed layer builder**

Build layers from projection rows and existing badge/provider state inputs.
Avoid per-row calls to broad services from render paths.

- [ ] **Step 3: Instrument layer build**

Add `perfProbe` timing name `explorer.layers.build` with payload `{ nodes }`.

- [ ] **Step 4: Commit**

Commit message: `feat: batch explorer decoration layers`.

### Task 9: Media Descriptor Hidden-Cost Path

**Files:**
- Modify: `src/services/serviceExplorerMediaCache.ts`
- Modify: `src/services/serviceExplorerProjection.ts`
- Create: `test/unit/services/serviceExplorerMediaDescriptor.test.ts`

- [ ] **Step 1: Write failing hidden media tests**

Assert every synthetic node can carry a descriptor and that hidden media does
not request blobs:

```ts
expect(projection.mediaById.size).toBe(rowInputs.length);
expect(mediaCache.loadVisibleBlobs).not.toHaveBeenCalled();
```

- [ ] **Step 2: Add descriptor-only projection path**

Projection stores descriptor status, media key, dimensions, and revision. Blob
data remains inside media cache.

- [ ] **Step 3: Add visible-only blob test**

When `media` field is enabled and visible ids are passed, assert only visible
blob keys are requested.

- [ ] **Step 4: Commit**

Commit message: `feat: wire explorer media descriptors without hidden render cost`.
