import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewNodeList Contract A parity', () => {
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

	it('clicking a row calls onRowClick(id, MouseEvent)', () => {
		const onRowClick = vi.fn();
		const node = { id: 'n1', label: 'N1', depth: 0, meta: {} } satisfies TreeNode;

		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs: [rowInputFromTreeNode(node)],
				onRowClick,
				onRowKeydown: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const row = target.querySelector<HTMLElement>('[data-id="n1"]');
		expect(row).not.toBeNull();
		row!.click();

		expect(onRowClick).toHaveBeenCalledWith('n1', expect.any(MouseEvent));
	});
});
