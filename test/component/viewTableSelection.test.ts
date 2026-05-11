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

const queuedNodes: TreeNode[] = [
	{
		id: 'queued',
		label: 'Queued row',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
	},
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
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onRowKeydown: vi.fn(),
			onSelectAll: vi.fn(),
			onBadgeDoubleClick: vi.fn(),
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

	it('reports row click, secondary action, keyboard, and context menu intent', () => {
		const handlers = renderTable();
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;

		alpha.click();
		alpha.click();
		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
		);
		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(handlers.onRowClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onSecondaryAction).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
		expect(handlers.onRowKeydown).toHaveBeenCalledWith('beta', expect.any(KeyboardEvent));
		expect(handlers.onContextMenu).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
	});

	it('removes queued operations from direct node badges without selecting the row', () => {
		const handlers = renderTable({ rows: nodeRowsFromTree(queuedNodes) });

		const badge = target.querySelector<HTMLElement>('[data-id="queued"] [aria-label="queued"]');
		expect(badge).toBeTruthy();
		badge!.click();

		expect(handlers.onBadgeDoubleClick).toHaveBeenCalledWith(0);
		expect(handlers.onRowClick).not.toHaveBeenCalled();
	});

	it('reports tertiary action from middle-clicked table rows', () => {
		const handlers = renderTable();
		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;

		beta.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));

		expect(handlers.onTertiaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onSecondaryAction).not.toHaveBeenCalled();
	});

	it('uses table sorting when a sortable header is clicked', () => {
		renderTable();

		(target.querySelector('[data-vm-table-header="label"]') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('[data-vm-table-sort="label"]')?.textContent).toContain('asc');
	});

	it('marks table rows and cells with stable ARIA contracts', () => {
		renderTable({ selectedIds: new Set(['alpha']), focusedId: 'alpha' });

		const table = target.querySelector('.vm-node-table') as HTMLElement;
		const row = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const cell = target.querySelector('[data-vm-table-cell="alpha:label"]') as HTMLElement;

		expect(table.getAttribute('role')).toBe('grid');
		expect(table.getAttribute('aria-multiselectable')).toBe('true');
		expect(row.getAttribute('role')).toBe('row');
		expect(row.getAttribute('aria-selected')).toBe('true');
		expect(cell.getAttribute('role')).toBe('gridcell');
		expect(row.classList.contains('is-selected')).toBe(true);
		expect(row.classList.contains('is-focused')).toBe(true);
	});
});
