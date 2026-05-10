import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';
import type { BadgeKind } from '../../src/services/badgeRegistry';

/**
 * Simulates the badge-collision contract enforced by `badgeRegistry`:
 * when ops are queued for a node, the hover-badge subset is reduced.
 *
 * The simulation feeds `activeOpsByNode` directly to `ViewTree` rather
 * than spinning up the full panel + queue, since the wiring contract is
 * "panelExplorer derives `activeOpsByNode` and forwards it to the view".
 * The collision behaviour itself is owned by the registry primitive.
 */
describe('panelExplorer badge collision (registry contract)', () => {
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

	function mountWithOps(activeOpsByNode: Map<string, Set<BadgeKind>>) {
		const nodes: TreeNode[] = [
			{ id: 'a', label: 'a', depth: 0, meta: {} },
			{ id: 'b', label: 'b', depth: 0, meta: {} },
		];
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				activeOpsByNode,
			},
		});
		flushSync();
	}

	function hoverKindsFor(nodeId: string): string[] {
		const row = target.querySelector(`.vm-tree-virtual-row[data-id="${nodeId}"]`);
		expect(row).toBeTruthy();
		return Array.from(row!.querySelectorAll('.vm-badge.is-hover-badge')).map(
			(el) => el.getAttribute('data-hover-kind') ?? '',
		);
	}

	it('node with rename queued shows set/delete/filter/node-note on hover', () => {
		const ops = new Map<string, Set<BadgeKind>>([['a', new Set<BadgeKind>(['rename'])]]);
		mountWithOps(ops);
		expect(hoverKindsFor('a')).toEqual(['set', 'delete', 'filter', 'node-note']);
	});

	it('node with delete queued shows only filter on hover', () => {
		const ops = new Map<string, Set<BadgeKind>>([['a', new Set<BadgeKind>(['delete'])]]);
		mountWithOps(ops);
		expect(hoverKindsFor('a')).toEqual(['filter']);
	});

	it('node with delete + other ops queued still shows only filter on hover', () => {
		const ops = new Map<string, Set<BadgeKind>>([
			['a', new Set<BadgeKind>(['set', 'rename', 'delete'])],
		]);
		mountWithOps(ops);
		expect(hoverKindsFor('a')).toEqual(['filter']);
	});

	it('peer nodes without active ops keep the full hover set', () => {
		const ops = new Map<string, Set<BadgeKind>>([['a', new Set<BadgeKind>(['delete'])]]);
		mountWithOps(ops);
		expect(hoverKindsFor('a')).toEqual(['filter']);
		expect(hoverKindsFor('b')).toEqual(['set', 'rename', 'delete', 'filter', 'node-note']);
	});
});
