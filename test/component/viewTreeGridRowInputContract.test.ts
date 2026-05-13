import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import type { ExplorerRowInput } from '../../src/services/serviceExplorerRowInput';

function rowInput(id: string, label: string, depth = 0): ExplorerRowInput {
	return {
		id,
		callbackId: id,
		source: 'snapshot',
		node: {
			id: `legacy-${id}`,
			label: `Legacy ${label}`,
			depth,
			meta: {},
			icon: depth === 0 ? 'lucide-folder' : 'lucide-file',
		},
		label,
		depth,
		layers: {},
		parentId: depth === 0 ? null : 'semantic-parent',
		childrenIds: [],
	};
}

describe('tree/grid row input contract', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('renders tree row inputs through semantic row ids for hierarchy, selection, and callbacks', () => {
		const parent = rowInput('semantic-parent', 'Parent');
		const child = rowInput('semantic-child', 'Child', 1);
		parent.childrenIds = ['semantic-child'];
		const onToggle = vi.fn();
		const onRowClick = vi.fn();

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [],
				rowInputs: [parent, child],
				expandedIds: new Set(['semantic-parent']),
				selectedIds: new Set(['semantic-child']),
				onToggle,
				onRowClick,
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const parentRow = target.querySelector<HTMLElement>('[data-id="semantic-parent"]');
		const childRow = target.querySelector<HTMLElement>('[data-id="semantic-child"]');
		expect(parentRow?.textContent).toContain('Parent');
		expect(childRow?.textContent).toContain('Child');
		expect(childRow?.getAttribute('aria-selected')).toBe('true');

		childRow!.click();
		parentRow!.querySelector<HTMLElement>('.vm-tree-toggle')!.click();

		expect(onRowClick).toHaveBeenCalledWith('semantic-child', expect.any(MouseEvent));
		expect(onToggle).toHaveBeenCalledWith('semantic-parent');
	});

	it('renders grid row inputs through semantic ids for selection, hover badges, and manual DnD', () => {
		const alpha = rowInput('semantic-alpha', 'Alpha');
		const beta = rowInput('semantic-beta', 'Beta');
		const onTileClick = vi.fn();

		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [],
				rowInputs: [alpha, beta],
				selectedIds: new Set(['semantic-beta']),
				activeOpsByNode: new Map([['semantic-beta', new Set(['rename'])]]),
				manualDndEnabled: true,
				onTileClick,
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const betaTile = target.querySelector<HTMLElement>('[data-id="semantic-beta"]');
		expect(target.querySelector('[data-id="semantic-alpha"]')?.textContent).toContain('Alpha');
		expect(betaTile?.textContent).toContain('Beta');
		expect(betaTile?.getAttribute('aria-selected')).toBe('true');
		expect(betaTile?.getAttribute('draggable')).toBe('true');

		const hoverKinds = [...betaTile!.querySelectorAll<HTMLElement>('.vm-badge.is-hover-badge')].map(
			(badge) => badge.dataset.hoverKind,
		);
		expect(hoverKinds).not.toContain('rename');

		betaTile!.click();

		expect(onTileClick).toHaveBeenCalledWith('semantic-beta', expect.any(MouseEvent));
	});
});
