import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

function flatNodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
	];
}

function gridNodesWithControls(): TreeNode[] {
	return [
		{
			id: 'parent',
			label: 'Parent',
			depth: 0,
			meta: {},
			icon: 'lucide-folder',
			children: [{ id: 'child', label: 'Child', depth: 1, meta: {}, icon: 'lucide-file' }],
			badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
		},
		{ id: 'sibling', label: 'Sibling', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

describe('ViewNodeTable event delegation', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderTable() {
		const handlers = {
			onRowClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onRowKeydown: vi.fn(),
			onSelectAll: vi.fn(),
		};
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(flatNodes()),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				focusedId: null,
				activeId: null,
				...handlers,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return handlers;
	}

	it('routes table row gestures through the table root', () => {
		const handlers = renderTable();
		const alpha = target.querySelector<HTMLElement>('.vm-node-table-row[data-id="alpha"]');
		const beta = target.querySelector<HTMLElement>('.vm-node-table-row[data-id="beta"]');
		expect(alpha).toBeTruthy();
		expect(beta).toBeTruthy();

		alpha!.click();
		beta!.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		beta!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		alpha!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(handlers.onRowClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onTertiaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onContextMenu).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onRowKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});

	it('removes row-local table event listener source', () => {
		const source = readFileSync('src/components/views/ViewNodeTable.svelte', 'utf8');

		expect(source).not.toContain('onclick={(e) => handleRowClick(id, e)}');
		expect(source).not.toContain('onauxclick={(e) => handleRowAuxClick(id, e)}');
		expect(source).not.toContain('oncontextmenu={(e) => onContextMenu(id, e)}');
		expect(source).not.toContain('onkeydown={(e) => onRowKeydown?.(id, e)}');
	});
});

describe('ViewNodeGrid event delegation', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderGrid() {
		const handlers = {
			onTileClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onTileKeydown: vi.fn(),
			onToggleExpand: vi.fn(),
			onBadgeDoubleClick: vi.fn(),
		};
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: gridNodesWithControls(),
				selectedIds: new Set<string>(),
				hierarchyMode: 'inline',
				expandedIds: new Set<string>(),
				...handlers,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return handlers;
	}

	it('routes grid tile gestures through the grid root', () => {
		const handlers = renderGrid();
		const parent = target.querySelector<HTMLElement>('.vm-node-grid-tile[data-id="parent"]');
		const sibling = target.querySelector<HTMLElement>('.vm-node-grid-tile[data-id="sibling"]');
		expect(parent).toBeTruthy();
		expect(sibling).toBeTruthy();

		parent!.click();
		sibling!.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		sibling!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		parent!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(handlers.onTileClick).toHaveBeenCalledWith('parent', expect.any(MouseEvent));
		expect(handlers.onTertiaryAction).toHaveBeenCalledWith('sibling', expect.any(MouseEvent));
		expect(handlers.onContextMenu).toHaveBeenCalledWith('sibling', expect.any(MouseEvent));
		expect(handlers.onTileKeydown).toHaveBeenCalledWith('parent', expect.any(KeyboardEvent));
	});

	it('keeps explicit grid controls local and propagation-stopped', () => {
		const handlers = renderGrid();
		const toggle = target.querySelector<HTMLElement>('[data-vm-node-grid-toggle="parent"]');
		const badge = target.querySelector<HTMLElement>('[data-id="parent"] [aria-label="queued"]');
		expect(toggle).toBeTruthy();
		expect(badge).toBeTruthy();

		toggle!.click();
		badge!.click();

		expect(handlers.onToggleExpand).toHaveBeenCalledWith('parent', expect.any(MouseEvent));
		expect(handlers.onBadgeDoubleClick).toHaveBeenCalledWith(0);
		expect(handlers.onTileClick).not.toHaveBeenCalled();
	});

	it('removes tile-local grid event listener source', () => {
		const source = readFileSync('src/components/views/ViewNodeGrid.svelte', 'utf8');

		expect(source).not.toContain('onclick={(e) => handleTileClick(node.id, e)}');
		expect(source).not.toContain('onauxclick={(e) => handleTileAuxClick(node.id, e)}');
		expect(source).not.toContain('oncontextmenu={(e) => onContextMenu(node.id, e)}');
		expect(source).not.toContain('onkeydown={(e) => handleTileKeydown(node.id, e)}');
	});
});
