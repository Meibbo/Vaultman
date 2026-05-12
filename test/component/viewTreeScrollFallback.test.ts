import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import type { TreeNode } from '../../src/types/typeNode';

type VirtualizerOptions = {
	count?: number;
	estimateSize?: (index: number) => number;
	getItemKey?: (index: number) => string | number;
};

vi.mock('@tanstack/svelte-virtual', () => ({
	createVirtualizer: vi.fn((options: VirtualizerOptions) => {
		let current = options;
		const instance = {
			getVirtualItems: () => [],
			getTotalSize: () => (current.count ?? 0) * (current.estimateSize?.(0) ?? 28),
			scrollToIndex: vi.fn(),
			setOptions: (next: VirtualizerOptions) => {
				current = { ...current, ...next };
			},
		};
		return {
			subscribe(run: (value: typeof instance) => void) {
				run(instance);
				return () => {};
			},
		};
	}),
}));

import ViewTree from '../../src/components/views/viewTree.svelte';

describe('ViewTree scroll fallback', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	let clientHeightDescriptor: PropertyDescriptor | undefined;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		clientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
		Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
			configurable: true,
			get() {
				if ((this as HTMLElement).classList?.contains('vm-tree-virtual-outer')) return 112;
				return clientHeightDescriptor?.get?.call(this) ?? 0;
			},
		});
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
		if (clientHeightDescriptor) {
			Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientHeightDescriptor);
		} else {
			delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
		}
		vi.unstubAllGlobals();
	});

	function nodes(count: number): TreeNode[] {
		return Array.from({ length: count }, (_, index) => ({
			id: `node-${index}`,
			label: `Node ${index}`,
			depth: 0,
			meta: {},
		}));
	}

	it('renders fallback rows around the current scroll position when virtual rows are empty', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nodes(100),
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const outer = target.querySelector<HTMLDivElement>('.vm-tree-virtual-outer');
		expect(outer).not.toBeNull();
		outer!.scrollTop = 30 * 28;
		outer!.dispatchEvent(new Event('scroll'));
		flushSync();

		expect(target.querySelector('[data-id="node-30"]')).not.toBeNull();
		expect(target.querySelector('[data-id="node-55"]')).not.toBeNull();
		expect(target.querySelector('[data-id="node-5"]')).toBeNull();
	});

	it('ignores a reveal target whose required snapshot revision is newer than the row map', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nodes(100),
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				scrollTarget: {
					id: 'node-40',
					serial: 1,
					minSnapshotRevision: 3,
					reason: 'keyboard',
				},
				snapshotRevision: 2,
				idToIndex: new Map([['node-40', 40]]),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const outer = target.querySelector<HTMLDivElement>('.vm-tree-virtual-outer');
		expect(outer?.scrollTop).toBe(0);
	});

	it('uses the supplied id-to-index map when the reveal target revision is current', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nodes(100),
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				scrollTarget: {
					id: 'node-40',
					serial: 1,
					minSnapshotRevision: 3,
					reason: 'keyboard',
				},
				snapshotRevision: 3,
				idToIndex: new Map([['node-40', 40]]),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const outer = target.querySelector<HTMLDivElement>('.vm-tree-virtual-outer');
		expect(outer?.scrollTop).toBeGreaterThan(0);
	});
});
