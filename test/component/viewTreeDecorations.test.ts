import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import { clearActivePerfProbe, createPerfProbe, setActivePerfProbe } from '../../src/dev/perfProbe';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeTree';

describe('ViewTree decorations', () => {
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
		clearActivePerfProbe();
		vi.unstubAllGlobals();
	});

	it('renders DecorationManager highlight ranges in node labels', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				highlights: [{ start: 0, end: 6 }],
			},
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
			},
		});
		flushSync();

		expect(target.querySelector('mark.vm-highlight')?.textContent).toBe('status');
	});

	it('renders duplicate-looking badges without duplicate keyed-each errors', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				badges: [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red' },
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red' },
				],
			},
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
			},
		});
		flushSync();

		expect(target.querySelectorAll('.vm-badge')).toHaveLength(2);
	});

	it('projects inherited badges into a child badge indicator', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'delete',
						icon: 'lucide-trash-2',
						color: 'red',
						queueIndex: 0,
						isInherited: true,
					},
				],
			},
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
			},
		});
		flushSync();

		expect(target.querySelector('.vm-tree-child-badge-indicator')).toBeTruthy();
		expect(
			target.querySelectorAll('.vm-tree-child-badge-pill .vm-badge.is-inherited'),
		).toHaveLength(1);
	});

	it('marks counters and overlay badges separately for narrow tree-row layout', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				count: 42,
				badges: [{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 3 }],
			},
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
			},
		});
		flushSync();

		const surface = target.querySelector('.vm-tree-row-surface') as HTMLElement;
		const badgeZone = target.querySelector('.vm-tree-badge-zone') as HTMLElement;
		const overlayZone = target.querySelector('.vm-tree-overlay-badge-zone') as HTMLElement;

		expect(surface.classList.contains('has-count')).toBe(true);
		expect(surface.classList.contains('has-overlay-badges')).toBe(true);
		expect(badgeZone.classList.contains('has-count')).toBe(true);
		expect(badgeZone.classList.contains('has-overlay-badges')).toBe(true);
		expect(overlayZone.classList.contains('has-active-badges')).toBe(true);
		expect(badgeZone.querySelector('.vm-tree-count')?.textContent).toBe('42');
	});

	it('removes a queued badge with a single click without triggering row activation', () => {
		const onBadgeClick = vi.fn();
		const onRowClick = vi.fn();
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				badges: [{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 3 }],
			},
		];

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick,
				onContextMenu: vi.fn(),
				onBadgeDoubleClick: onBadgeClick,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		(target.querySelector('.vm-badge.is-undoable') as HTMLElement).click();

		expect(onBadgeClick).toHaveBeenCalledWith(3);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('runs a quick-action badge without triggering row activation', () => {
		const onQuickAction = vi.fn();
		const onRowClick = vi.fn();
		const nodes: TreeNode[] = [
			{
				id: 'project',
				label: 'project',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'Add tag',
						icon: 'lucide-plus',
						color: 'green',
						quickAction: true,
						onClick: onQuickAction,
					},
				],
			},
		];

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick,
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		(target.querySelector('.vm-badge.is-quick-action') as HTMLElement).click();

		expect(onQuickAction).toHaveBeenCalledOnce();
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('records active probe metrics for flattening and scroll bursts', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const nodes: TreeNode[] = Array.from({ length: 20 }, (_, index) => ({
			id: `node-${index}`,
			label: `Node ${index}`,
			depth: 0,
			meta: {},
		}));
		setActivePerfProbe(probe.api);

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const outer = target.querySelector<HTMLDivElement>('.vm-tree-virtual-outer');
		expect(outer).toBeTruthy();
		outer!.scrollTop = 32;
		outer!.dispatchEvent(new Event('scroll'));
		flushSync();

		const snapshot = probe.snapshot();
		expect(snapshot.timings['viewTree.flatten']).toMatchObject({
			count: expect.any(Number),
			totalNodes: expect.any(Number),
		});
		expect(snapshot.timings['viewTree.flatten'].totalNodes).toBeGreaterThan(0);
		expect(snapshot.counters['viewTree.scroll']).toMatchObject({
			count: 1,
			totalRows: expect.any(Number),
			totalVisibleRows: expect.any(Number),
		});
	});
});
