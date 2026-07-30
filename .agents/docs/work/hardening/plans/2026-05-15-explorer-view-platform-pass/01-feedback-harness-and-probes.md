---
title: Feedback harness and probes
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - explorer/testing
  - explorer/performance
created_by: codex
updated_by: codex
---

# Feedback Harness And Probes

### Task 1: Synthetic Explorer Dataset Harness

**Files:**
- Create: `test/support/explorerSyntheticDataset.ts`
- Create: `test/unit/performance/explorerPlatformSynthetic.test.ts`

- [ ] **Step 1: Write failing dataset shape tests**

Use `test/unit/performance/explorerPlatformSynthetic.test.ts` to assert:

```ts
const dataset = createExplorerSyntheticDataset({
	nodes: 10000,
	shape: 'mixed',
	providerId: 'files',
	filteredEvery: 7,
	selectedEvery: 11,
	withBadges: true,
	withMediaDescriptors: true,
});

expect(dataset.nodes).toHaveLength(10000);
expect(dataset.rowInputs).toHaveLength(10000);
expect(dataset.idToIndex.get('node-9999')).toBe(9999);
expect(dataset.activeFilterIds.has('node-7')).toBe(true);
expect(dataset.mediaDescriptors.get('node-0')?.status).toBe('unprocessed');
```

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts --fileParallelism=false` Expected: fail because the helper does not exist.

- [ ] **Step 2: Implement deterministic dataset helper**

Create `createExplorerSyntheticDataset(options)` returning `nodes`, `rowInputs`, `idToIndex`, `indexToId`, `expandedIds`, `selectedIds`, `activeFilterIds`, `mediaDescriptors`, and `expectedVisibleIds`.

Required shapes:

```ts
type ExplorerSyntheticShape = 'flat' | 'deep' | 'mixed';
```

Use stable ids: `node-${index}`. Use stable file paths:
`Synthetic/Folder ${folder}/Note ${index}.md`.

- [ ] **Step 3: Add 50K and 100K lightweight assertions**

Assert that 50K and 100K datasets build row maps without duplicate ids and without media blobs.

Run the same unit test command.
Expected: pass.

- [ ] **Step 4: Commit**

Commit message: `test: add explorer synthetic dataset harness`.

### Task 2: PerfProbe Scenario Contract

**Files:**
- Modify: `src/dev/perfProbe.ts`
- Modify: `test/unit/dev/perfProbe.test.ts`
- Modify: `test/component/perfProbeDom.test.ts`

- [ ] **Step 1: Add failing scenario registration tests**

Assert these scenario names can be run or reported:

```ts
[
	'files-list-10k-scroll-jump',
	'files-tree-10k-scroll-jump',
	'files-tree-50k-scroll-jump',
	'projection-50k-build-or-refresh',
	'projection-100k-proof',
	'view-menu-element-toggle',
	'view-mode-native-preset-restore',
	'tree-box-selection',
	'tree-filtered-highlight',
	'node-media-descriptor-build',
	'node-media-hidden-cost',
	'node-media-visible-subscribe',
]
```

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts --fileParallelism=false` Expected: fail for unknown scenarios.

- [ ] **Step 2: Extend perfProbe scenario dispatch**

Add scenario names with measurable counters/timings. Keep DOM-dependent actions guarded so unit tests can run without Obsidian.

- [ ] **Step 3: Add jank-ready snapshot fields**

Extend snapshots with optional `longFrameCount`, `maxLongFrameMs`, and `heapDeltaBytes` fields. Existing callers can omit them.

- [ ] **Step 4: Verify perfProbe tests**

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts --fileParallelism=false`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `test: add explorer platform perf scenarios`.

### Task 3: Characterizing Performance Gates

**Files:**
- Modify: `test/unit/performance/explorerPlatformSynthetic.test.ts`

- [ ] **Step 1: Add non-flaky timing assertions**

Use operation counts and map invariants as hard assertions. Record timings but avoid strict millisecond thresholds in unit tests.

Required assertions:

- 50K `idToIndex` lookup is direct map lookup.
- 100K proof run does not allocate decoded media blobs.
- hidden media descriptor path does not call blob loading.

- [ ] **Step 2: Run focused gate**

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts --fileParallelism=false`

Expected: pass.

- [ ] **Step 3: Commit**

Commit message: `test: characterize explorer platform scale gates`.
