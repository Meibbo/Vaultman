import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree hover badges', () => {
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
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
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
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
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

	it('renders hover badges as icon-only (no visible text)', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode: new Map(),
			},
		});
		flushSync();

		const hoverBadge = target.querySelector('.vm-badge.is-hover-badge') as HTMLElement | null;
		expect(hoverBadge).toBeTruthy();
		// No surrounding text content beyond the icon span — text is suppressed
		// via font-size: 0 in the SCSS, but here we just assert the markup.
		expect(hoverBadge!.querySelector('.vm-badge-icon')).toBeTruthy();
		// The badge label is exposed via aria-label / title only.
		expect(hoverBadge!.getAttribute('aria-label')).toBeTruthy();
		expect(hoverBadge!.textContent?.trim()).toBe('');
	});

	it('routes hover-badge click through onHoverBadgeAction with kind', () => {
		const onHoverBadgeAction = vi.fn();
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				onHoverBadgeAction,
				activeOpsByNode: new Map(),
			},
		});
		flushSync();

		const renameBadge = target.querySelector(
			'.vm-badge.is-hover-badge[data-hover-kind="rename"]',
		) as HTMLElement;
		renameBadge.click();
		expect(onHoverBadgeAction).toHaveBeenCalledWith('n', 'rename', expect.any(Object));
	});

	it('marks the hover badge matching the configured primary node action', () => {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [nodeFor('n')],
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
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
		expect(filterBadge.classList.contains('is-primary-action')).toBe(true);
	});
});
