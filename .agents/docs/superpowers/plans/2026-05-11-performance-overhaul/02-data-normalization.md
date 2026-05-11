# Phase 2 - Data Normalization And Search Buffers

Parent: [[index|Vaultman Explorer Performance Overhaul Implementation Plan]]

## Files

- Modify: `src/types/typeContracts.ts`
- Modify: `src/index/indexNodeCreate.ts`
- Modify: `src/index/indexFiles.ts`
- Modify: `src/logic/logicsFiles.ts`
- Modify: `src/providers/explorerFiles.ts`
- Modify: `src/services/serviceExplorer.svelte.ts`
- Modify: `test/unit/services/serviceExplorer.test.ts`
- Modify: `test/unit/performance/stress.test.ts`

## Tasks

- [ ] **Step 1: Extend `INodeIndex` with normalized read surfaces.**

Add optional-free contract fields to `INodeIndex<TNode>`: `readonly flatIds: readonly string[]`, `getSearchBuffer(id: string): string`, and `byId(id)`. Existing consumers already have `byId`; all concrete indices must expose the new two fields.

- [ ] **Step 2: Build flat ids and search buffers at index refresh.**

In `createNodeIndex`, add `searchText?: (node: TNode) => string` to `NodeIndexOptions`. During `refresh()`, after `built` is accepted, set `_flatIds = built.map((n) => n.id)` and `_searchById = new Map(built.map((n) => [n.id, normalizeSearchText(opts.searchText?.(n) ?? defaultNodeSearchText(n))]))`. Expose getters for `flatIds` and `getSearchBuffer(id)`.

- [ ] **Step 3: Give Files index exact buffers.**

In `createFilesIndex`, pass:

```ts
searchText: (node) => `${node.basename}\n${node.path}\n${node.file.extension ?? ''}`
```

This makes name and folder search compare against pre-lowercased buffers instead of re-lowercasing `TFile` fields on every render.

- [ ] **Step 4: Rewrite `serviceExplorer.svelte.ts` around ids.**

Replace `applyFilter()` with `filteredIds` plus id-to-node materialization:

```ts
import { PerfMeter } from './perfMeter';

	normalizedSearch = $derived(this.search.trim().toLowerCase());
	filteredIds: readonly string[] = $derived.by(() =>
		PerfMeter.time('explorer.service.filteredIds', () => {
			const q = this.normalizedSearch;
			if (!q) return this.idx.flatIds;
			return this.idx.flatIds.filter((id) => this.idx.getSearchBuffer(id).includes(q));
		}, 'service', { nodes: this.idx.flatIds.length, queryLength: q.length }),
	);
	filteredNodes: readonly TNode[] = $derived.by(() =>
		PerfMeter.time('explorer.service.filteredNodes', () =>
			this.filteredIds.map((id) => this.idx.byId(id)).filter((node): node is TNode => Boolean(node)),
		),
	);
```

Keep `setSearch(q)` as the only write entry point and do not lowercase `q` there; derived state owns normalization.

- [ ] **Step 5: Use index-backed files in `explorerFiles`.**

Change `vaultFiles()` to return `this.plugin.filesIndex.nodes.map((node) => node.file)` when `filesIndex` exists. Change `FilesLogic.filterFlat()` to accept an optional `getSearchBuffer(path)` callback and use the precomputed buffer for name/folder checks. In `explorerFiles.getTree()`, wrap `filterFlat`, sort, build tree, and decorate with stable `PerfMeter.time` labels: `explorer.files.filterFlat`, `explorer.files.sort`, `explorer.files.buildTree`, `explorer.files.decorateTree`.

- [ ] **Step 6: Verify Phase 2.**

Run:
`pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceExplorer.test.ts test/unit/services/serviceFilesIndex.test.ts test/unit/performance/stress.test.ts --fileParallelism=false`
Expected: pass. Add an assertion that searching 10,000 `ExplorerService` nodes records `explorer.service.filteredIds` and stays under 5 ms locally or under a documented CI-safe threshold if the harness is slower.

