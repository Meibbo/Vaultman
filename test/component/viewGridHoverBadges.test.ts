import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewNodeGrid hover badges', () => {
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

	function nodeFor(id: string): TreeNode {
		return {
			id,
			label: id,
			depth: 0,
			meta: {},
		};
	}

	it('renders five hover badges (set/rename/delete/filter/node-note) when no ops are active', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode: new Map(),
			},
		});
		flushSync();

		const hoverBadges = target.querySelectorAll('.vm-badge.is-hover-badge');
		expect(hoverBadges).toHaveLength(5);
		const kinds = Array.from(hoverBadges).map((el) => el.getAttribute('data-hover-kind'));
		expect(kinds).toEqual(['set', 'rename', 'delete', 'filter', 'node-note']);
	});

	it('omits convert from hover render', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode: new Map(),
			},
		});
		flushSync();

		const kinds = Array.from(target.querySelectorAll('.vm-badge.is-hover-badge')).map((el) =>
			el.getAttribute('data-hover-kind'),
		);
		expect(kinds).not.toContain('convert');
	});

	it('hides hover badge for kinds already queued via activeOpsByNode', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode: new Map([['n', new Set(['rename'])]]),
			},
		});
		flushSync();

		const kinds = Array.from(target.querySelectorAll('.vm-badge.is-hover-badge')).map((el) =>
			el.getAttribute('data-hover-kind'),
		);
		expect(kinds).toEqual(['set', 'delete', 'filter', 'node-note']);
	});

	it('does not visually mark the hover badge matching the configured primary node action', () => {
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				onTileClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode: new Map(),
				primaryHoverBadgeKind: 'filter',
			},
		});
		flushSync();

		const filterBadge = target.querySelector(
			'.vm-badge.is-hover-badge[data-hover-kind="filter"]',
		) as HTMLElement;
		expect(filterBadge.classList.contains('is-primary-action')).toBe(false);
	});
});
