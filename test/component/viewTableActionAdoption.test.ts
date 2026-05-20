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

describe('ViewNodeTable action-routing adoption', () => {
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

	function render(props: Record<string, unknown> = {}) {
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				focusedId: null,
				activeId: null,
				onRowClick: vi.fn(),
				onSecondaryAction: vi.fn(),
				onTertiaryAction: vi.fn(),
				onContextMenu: vi.fn(),
				onRowKeydown: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('row exposes data-row-key and row role', () => {
		render();

		const row = target.querySelector<HTMLElement>('[data-id="alpha"]');

		expect(row?.getAttribute('data-row-key')).toBe('alpha');
		expect(row?.getAttribute('role')).toBe('row');
	});

	it('keydown on a row delegates to onRowKeydown(id, e)', () => {
		const onRowKeydown = vi.fn();
		render({ onRowKeydown });

		target
			.querySelector<HTMLElement>('[data-id="alpha"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

		expect(onRowKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});

	it('clicking a row still calls onRowClick(id, e)', () => {
		const onRowClick = vi.fn();
		render({ onRowClick });

		target.querySelector<HTMLElement>('[data-id="alpha"]')?.click();

		expect(onRowClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});
});
