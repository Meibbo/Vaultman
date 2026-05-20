import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

describe('ViewNodeGrid action-routing adoption', () => {
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
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				selectedIds: new Set<string>(),
				focusedId: null,
				activeId: null,
				onTileClick: vi.fn(),
				onSecondaryAction: vi.fn(),
				onTertiaryAction: vi.fn(),
				onContextMenu: vi.fn(),
				onTileKeydown: vi.fn(),
				onColumnCountChange: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('tile exposes data-row-key and gridcell role', () => {
		render();

		const tile = target.querySelector<HTMLElement>('[data-id="alpha"]');

		expect(tile?.getAttribute('data-row-key')).toBe('alpha');
		expect(tile?.getAttribute('role')).toBe('gridcell');
	});

	it('keydown on a tile delegates to onTileKeydown(id, e)', () => {
		const onTileKeydown = vi.fn();
		render({ onTileKeydown });

		target
			.querySelector<HTMLElement>('[data-id="alpha"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

		expect(onTileKeydown).toHaveBeenCalledWith('alpha', expect.any(KeyboardEvent));
	});

	it('clicking a tile still calls onTileClick(id, e)', () => {
		const onTileClick = vi.fn();
		render({ onTileClick });

		target.querySelector<HTMLElement>('[data-id="alpha"]')?.click();

		expect(onTileClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});

	it('reports the resolved column count for planar keyboard navigation', () => {
		const onColumnCountChange = vi.fn();
		render({ onColumnCountChange });

		expect(onColumnCountChange).toHaveBeenCalledWith(3);
	});
});
