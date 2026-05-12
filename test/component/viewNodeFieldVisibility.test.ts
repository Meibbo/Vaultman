import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import {
	nodeRowsFromTree,
	nodeTableColumnsForProvider,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

const tagNodes: TreeNode[] = [
	{
		id: 'tag-alpha',
		label: 'alpha',
		depth: 0,
		meta: { tagPath: 'alpha' },
		icon: 'lucide-tag',
		count: 7,
	},
];

describe('NodeFieldVisibility view consumption', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
	});

	afterEach(() => {
		if (app) void unmount(app);
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	it('lets tree rows hide label and count while keeping the visible icon field', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: tagNodes,
				expandedIds: new Set<string>(),
				providerId: 'tags',
				visibleFields: ['icon'],
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelector('.vm-tree-icon')).toBeTruthy();
		expect(target.querySelector('.vm-tree-label')).toBeFalsy();
		expect(target.querySelector('.vm-tree-count')).toBeFalsy();
	});

	it('lets grid tiles hide icon and count while keeping text as the visible identity field', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: tagNodes,
				providerId: 'tags',
				visibleFields: ['text'],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelector('.vm-node-grid-icon')).toBeFalsy();
		expect(target.querySelector('.vm-node-grid-label')?.textContent).toContain('alpha');
		expect(target.querySelector('[data-node-field="count"]')).toBeFalsy();
	});

	it('lets table columns follow the same visible field contract', () => {
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(tagNodes),
				columns: nodeTableColumnsForProvider('tags', ['text']),
				selectedIds: new Set<string>(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelector('[data-vm-table-header="label"]')?.textContent).toContain('Tag');
		expect(target.querySelector('[data-vm-table-header="count"]')).toBeFalsy();
		expect(target.querySelector('[data-vm-table-header="tagPath"]')).toBeFalsy();
		expect(target.querySelector('[data-id="tag-alpha"]')?.textContent).toContain('alpha');
	});
});
