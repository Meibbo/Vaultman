---
title: TanStack node table panel integration
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - panel-explorer
  - table
created_by: codex
updated_by: codex
---

# Panel Integration

## Purpose

Route `viewMode === 'table'` through `ViewNodeTable` and keep all selection,
context menu, and provider activation behavior aligned with tree/grid.

## Files

- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `test/component/panelExplorerSelection.test.ts`
- Modify: `test/component/panelExplorerEmpty.test.ts`

## Task 3: Panel Red-Green

- [ ] **Step 1: Add table integration tests**

Extend `test/component/panelExplorerSelection.test.ts` with these cases:

```ts
it('table mode renders provider tree nodes instead of fallback copy', () => {
	renderPanel({ viewMode: 'table' });

	expect(target.querySelector('.vm-node-table')).not.toBeNull();
	expect(target.textContent).toContain('Alpha');
	expect(target.textContent).not.toContain('Table view not available');
});

it('table row click selects through the shared node selection service', () => {
	const { pluginStub, selectionService } = renderPanel({ viewMode: 'table' });

	(target.querySelector('[data-id="beta"]') as HTMLElement).click();
	flushSync();

	expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
	expect(pluginStub.viewService.select).toHaveBeenCalledWith(EXPLORER_ID, 'beta', 'add');
});

it('table context menu receives same-type selected nodes', () => {
	const providerStub = provider({
		getNodeType: vi.fn((node) => (node.id === 'alpha' || node.id === 'beta' ? 'file' : 'tag')),
	});
	const { selectionService } = renderPanel({ viewMode: 'table', provider: providerStub });
	selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'alpha');
	selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'beta', { additive: true });
	flushSync();

	(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
		new MouseEvent('contextmenu', { bubbles: true }),
	);

	expect(providerStub.handleContextMenu).toHaveBeenCalledWith(
		expect.objectContaining({ id: 'beta' }),
		expect.any(MouseEvent),
		[expect.objectContaining({ id: 'alpha' }), expect.objectContaining({ id: 'beta' })],
	);
});
```

Modify `test/component/panelExplorerEmpty.test.ts`:

- remove `table` from the unsupported fallback `it.each`;
- add a table empty test that expects `No items` and `.vm-node-table` absence
  when provider tree is empty;
- keep `cards` and `list` fallback tests unchanged.

- [ ] **Step 2: Run panel tests and confirm failure**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts --fileParallelism=false
```

Expected: fail because `panelExplorer.svelte` still sends table to fallback.

- [ ] **Step 3: Update `panelExplorer.svelte` data derivation**

Implement these local derived values near the existing grid derived values:

```ts
const tableRows = $derived(viewMode === 'table' ? nodeRowsFromTree(nodes) : []);
const tableColumns = $derived(DEFAULT_NODE_TABLE_COLUMNS);
const isTableEmpty = $derived(viewMode === 'table' && tableRows.length === 0);
```

Import:

```ts
import ViewNodeTable from '../views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../services/serviceViewTableAdapter';
```

Update `refreshData()` so table mode uses provider tree nodes:

```ts
} else if (viewMode === 'table') {
	nodes = readProviderTree();
	flatFiles = [];
}
```

Update `visibleNodeIds()` so table mode returns the table row order:

```ts
if (viewMode === 'table') return tableRows.map((row) => row.id);
```

- [ ] **Step 4: Add table branch markup**

Add a branch between grid and fallback:

```svelte
{:else if viewMode === 'table'}
	<div class="vm-table-container">
		{#if isTableEmpty}
			<ViewEmptyLanding state={emptyState} {icon} />
		{:else}
			<ViewNodeTable
				rows={tableRows}
				columns={tableColumns}
				selectedIds={selectedNodeIds}
				focusedId={focusedNodeId}
				activeId={selectionSnapshot.activeId}
				onRowClick={handleNodeClick}
				onPrimaryAction={handlePrimaryAction}
				onContextMenu={handleContextMenu}
				onRowKeydown={handleRowKeydown}
				onSelectAll={(ids, e) => handleTableSelectAll(ids, e)}
				{icon}
			/>
		{/if}
	</div>
```

Add:

```ts
function handleTableSelectAll(ids: string[], e: Event) {
	const additive = e instanceof MouseEvent ? e.ctrlKey || e.metaKey : false;
	commitSelection(selectionService.selectBox(provider.id, visibleNodeIds(), ids, { additive }));
}
```

Add `.vm-table-container` beside tree/grid/fallback container styles with the
same flex, min-height, height, and overflow constraints as `.vm-grid-container`.

- [ ] **Step 5: Run panel tests until they pass**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts --fileParallelism=false
```

Expected: panel selection and empty-state tests pass.
