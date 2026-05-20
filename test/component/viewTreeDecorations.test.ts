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

	function nestedStickyNodes(): TreeNode[] {
		return [
			{
				id: 'root',
				label: 'Root',
				depth: 0,
				meta: {},
				children: [
					{
						id: 'child',
						label: 'Child',
						depth: 1,
						meta: {},
						children: Array.from({ length: 12 }, (_, index) => ({
							id: `leaf-${index}`,
							label: `Leaf ${index}`,
							depth: 2,
							meta: {},
						})),
					},
				],
			},
			{
				id: 'sibling',
				label: 'Sibling',
				depth: 0,
				meta: {},
			},
		];
	}

	function mountTree(props: Partial<Record<string, unknown>> = {}) {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nestedStickyNodes(),
				expandedIds: new Set<string>(['root', 'child']),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
		return target.querySelector<HTMLDivElement>('.vm-tree-virtual-outer')!;
	}

	function scrollTree(outer: HTMLElement, scrollTop: number) {
		outer.scrollTop = scrollTop;
		outer.dispatchEvent(new Event('scroll'));
		flushSync();
	}

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

	it('renders an indentation guide for every visible parent depth', () => {
		const nodes: TreeNode[] = [
			{
				id: 'root',
				label: 'Root',
				depth: 0,
				meta: {},
				children: [
					{
						id: 'child',
						label: 'Child',
						depth: 1,
						meta: {},
						children: [
							{
								id: 'grandchild',
								label: 'Grandchild',
								depth: 2,
								meta: {},
								children: [
									{
										id: 'leaf',
										label: 'Leaf',
										depth: 3,
										meta: {},
									},
								],
							},
						],
					},
				],
			},
		];

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(['root', 'child', 'grandchild']),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const leaf = target.querySelector('[data-id="leaf"]') as HTMLElement;
		const guides = leaf.querySelectorAll('.vm-tree-indent-guide');

		expect(guides).toHaveLength(3);
		expect([...guides].map((guide) => (guide as HTMLElement).style.getPropertyValue('--guide-depth'))).toEqual([
			'0',
			'1',
			'2',
		]);
	});

	it('keeps expanded parent rows sticky below the configured nav tools offset', () => {
		const outer = mountTree({ stickyTopOffset: 36 });

		scrollTree(outer, 96);

		const stickyRows = [...target.querySelectorAll<HTMLElement>('.vm-tree-sticky-row')];
		expect(stickyRows.map((row) => row.dataset.id)).toEqual(['root', 'child']);
		expect(stickyRows[0]?.textContent).toContain('Root');
		expect(stickyRows[1]?.textContent).toContain('Child');

		const stickyLayer = target.querySelector<HTMLElement>('.vm-tree-sticky-layer');
		expect(stickyLayer?.style.getPropertyValue('--vm-tree-sticky-scroll-y')).toBe('96px');
		expect(stickyLayer?.style.getPropertyValue('--vm-tree-sticky-top-offset')).toBe('36px');
	});

	it('uses zero sticky offset when nav tools are absent', () => {
		const outer = mountTree();

		scrollTree(outer, 96);

		const stickyLayer = target.querySelector<HTMLElement>('.vm-tree-sticky-layer');
		expect(target.querySelectorAll('.vm-tree-sticky-row')).toHaveLength(2);
		expect(stickyLayer?.style.getPropertyValue('--vm-tree-sticky-top-offset')).toBe('0px');
	});

	it('removes sticky parent rows after the subtree scrolls out of frame', () => {
		const outer = mountTree();

		scrollTree(outer, 10_000);

		expect(target.querySelectorAll('.vm-tree-sticky-row')).toHaveLength(0);
	});

	it('does not render collapsed parent rows as sticky rows', () => {
		const outer = mountTree({ expandedIds: new Set<string>() });

		scrollTree(outer, 96);

		expect(target.querySelectorAll('.vm-tree-sticky-row')).toHaveLength(0);
	});

	it('routes sticky parent toggle clicks through the normal tree toggle handler', () => {
		const onToggle = vi.fn();
		const outer = mountTree({ onToggle });
		scrollTree(outer, 96);

		target.querySelector<HTMLElement>('.vm-tree-sticky-row[data-id="root"] .vm-tree-toggle')?.click();

		expect(onToggle).toHaveBeenCalledWith('root', expect.any(MouseEvent));
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
