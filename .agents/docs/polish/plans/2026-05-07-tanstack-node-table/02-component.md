---
title: TanStack node table component
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - table
  - svelte
created_by: codex
updated_by: codex
---

# ViewNodeTable Component

## Purpose

Create a Svelte 5 table component that renders TanStack rows and headers while
reporting user intent to the parent. The component does not mutate
`NodeSelectionService` directly.

Continuation: [[docs/work/polish/plans/2026-05-07-tanstack-node-table/02-component-part-2|ViewNodeTable component part 2]]

## Files

- Create: `src/components/views/ViewNodeTable.svelte`
- Create: `test/component/viewTableSelection.test.ts`

## Task 2: Component Red-Green

- [ ] **Step 1: Write the failing component test**

Create `test/component/viewTableSelection.test.ts` with tests for render,
sorting, selection, keyboard, and context menu:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

describe('ViewNodeTable', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
	});

	afterEach(() => {
		if (app) void unmount(app);
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderTable(props: Record<string, unknown> = {}) {
		const defaults = {
			rows: nodeRowsFromTree(nodes),
			columns: DEFAULT_NODE_TABLE_COLUMNS,
			selectedIds: new Set<string>(),
			focusedId: null,
			activeId: null,
			onRowClick: vi.fn(),
			onPrimaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onRowKeydown: vi.fn(),
			onSelectAll: vi.fn(),
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: { ...defaults, ...props },
		});
		flushSync();
		return { ...defaults, ...props };
	}

	it('renders headers and node-backed table rows', () => {
		renderTable();

		expect(target.querySelector('.vm-node-table')?.getAttribute('role')).toBe('grid');
		expect(target.querySelector('[data-vm-table-header="label"]')?.textContent).toContain('Name');
		expect(target.querySelector('[data-id="alpha"]')?.textContent).toContain('Alpha');
		expect(target.querySelector('[data-id="beta"]')?.textContent).toContain('Beta');
	});

	it('reflects selected, focused, and active row state from controlled props', () => {
		renderTable({ selectedIds: new Set(['beta']), focusedId: 'beta', activeId: 'alpha' });

		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		expect(beta.getAttribute('aria-selected')).toBe('true');
		expect(beta.classList.contains('is-selected')).toBe(true);
		expect(beta.classList.contains('is-focused')).toBe(true);
		expect(alpha.classList.contains('is-active-node')).toBe(true);
	});
```

- [ ] **Step 2: Continue the test file**

Append the event and sorting tests:

```ts
	it('reports row click, primary action, keyboard, and context menu intent', () => {
		const handlers = renderTable();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		(target.querySelector('[data-id="alpha"] [data-vm-table-primary]') as HTMLElement).click();
		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
		);
		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(handlers.onRowClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onRowKeydown).toHaveBeenCalledWith('beta', expect.any(KeyboardEvent));
		expect(handlers.onContextMenu).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
	});

	it('uses TanStack sorting when a sortable header is clicked', () => {
		renderTable();

		(target.querySelector('[data-vm-table-header="label"]') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('[data-vm-table-sort="label"]')?.textContent).toContain('asc');
	});
});
```

- [ ] **Step 3: Run the failing component test**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableSelection.test.ts --fileParallelism=false
```

Expected: fail because `ViewNodeTable.svelte` does not exist.
