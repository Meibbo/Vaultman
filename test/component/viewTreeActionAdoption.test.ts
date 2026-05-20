import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree action-routing adoption', () => {
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
		const nodes: TreeNode[] = [
			{
				id: 'p',
				label: 'P',
				depth: 0,
				meta: {},
				children: [{ id: 'c', label: 'C', depth: 1, meta: {} }],
			},
		];
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set(['p']),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onSecondaryAction: vi.fn(),
				onTertiaryAction: vi.fn(),
				onBoxSelect: vi.fn(),
				onContextMenu: vi.fn(),
				onRowKeydown: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('row exposes data-row-key and treeitem role', () => {
		render();

		const row = target.querySelector<HTMLElement>('[data-id="p"]');

		expect(row?.getAttribute('data-row-key')).toBe('p');
		expect(row?.getAttribute('role')).toBe('treeitem');
		expect(row?.getAttribute('aria-expanded')).toBe('true');
	});

	it('keydown on a row delegates to onRowKeydown(id, e)', () => {
		const onRowKeydown = vi.fn();
		render({ onRowKeydown });

		const row = target.querySelector<HTMLElement>('[data-id="p"]');
		row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

		expect(onRowKeydown).toHaveBeenCalledWith('p', expect.any(KeyboardEvent));
	});

	it('chevron still only toggles', () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		render({ onToggle, onRowClick });

		target.querySelector<HTMLElement>('.vm-tree-toggle')?.click();

		expect(onToggle).toHaveBeenCalledWith('p', expect.any(MouseEvent));
		expect(onRowClick).not.toHaveBeenCalled();
	});
});
