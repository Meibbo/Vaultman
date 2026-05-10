import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../src/types/typeNode';

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
	];
}

function mixedIconNodes(): TreeNode[] {
	return [
		{ id: 'with-icon', label: 'With icon', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'without-icon', label: 'Without icon', depth: 0, meta: {} },
	];
}

function hierarchicalNodes(): TreeNode[] {
	return [
		{
			id: 'parent',
			label: 'Parent',
			depth: 0,
			meta: {},
			icon: 'lucide-folder',
			children: [
				{ id: 'child-a', label: 'Child A', depth: 1, meta: {}, icon: 'lucide-file' },
				{ id: 'child-b', label: 'Child B', depth: 1, meta: {}, icon: 'lucide-file' },
			],
		},
		{ id: 'sibling', label: 'Sibling', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function manyNodes(count: number): TreeNode[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `node-${index}`,
		label: `Node ${index}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	}));
}

describe('ViewNodeGrid selection gestures', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'PointerEvent',
			class extends MouseEvent {
				pointerId: number;

				constructor(type: string, init: PointerEventInit = {}) {
					super(type, init);
					this.pointerId = init.pointerId ?? 1;
				}
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

	function renderGrid(
		props: Partial<{
			nodes: TreeNode[];
			selectedIds: Set<string>;
			focusedId: string | null;
			activeId: string | null;
			onTileClick: (id: string, e: MouseEvent) => void;
			onPrimaryAction: (id: string, e: MouseEvent) => void;
			onSecondaryAction: (id: string, e: MouseEvent) => void;
			onTertiaryAction: (id: string, e: MouseEvent) => void;
			onContextMenu: (id: string, e: MouseEvent) => void;
			onBoxSelect: (ids: string[], e: PointerEvent) => void;
			hierarchyMode: 'folder' | 'inline';
			expandedIds: Set<string>;
			onToggleExpand: (id: string, e: MouseEvent | KeyboardEvent) => void;
			manualDndEnabled: boolean;
		}> = {},
	) {
		const defaults = {
			selectedIds: new Set<string>(),
			onTileClick: vi.fn(),
			onPrimaryAction: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onBoxSelect: vi.fn(),
			hierarchyMode: 'folder',
			expandedIds: new Set<string>(),
			onToggleExpand: vi.fn(),
			manualDndEnabled: false,
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: props.nodes ?? nodes(),
				...defaults,
				...props,
			},
		});
		flushSync();
		return {
			onTileClick: props.onTileClick ?? defaults.onTileClick,
			onPrimaryAction: props.onPrimaryAction ?? defaults.onPrimaryAction,
			onSecondaryAction: props.onSecondaryAction ?? defaults.onSecondaryAction,
			onTertiaryAction: props.onTertiaryAction ?? defaults.onTertiaryAction,
			onContextMenu: props.onContextMenu ?? defaults.onContextMenu,
			onBoxSelect: props.onBoxSelect ?? defaults.onBoxSelect,
			onToggleExpand: props.onToggleExpand ?? defaults.onToggleExpand,
		};
	}

	it('renders generic tree nodes without Obsidian file props', () => {
		renderGrid();

		expect(target.querySelector('[data-id="alpha"]')?.textContent).toContain('Alpha');
		expect(target.querySelector('[data-id="beta"]')?.textContent).toContain('Beta');
		expect(target.querySelectorAll('.vm-node-grid-icon')).toHaveLength(2);
	});

	it('reserves stable icon and size slots for nodes without icons', () => {
		renderGrid({ nodes: mixedIconNodes() });

		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const withIcon = target.querySelector('[data-id="with-icon"]') as HTMLElement;
		const withoutIcon = target.querySelector('[data-id="without-icon"]') as HTMLElement;

		expect(withIcon.querySelector('.vm-node-grid-icon')).not.toBeNull();
		expect(withoutIcon.querySelector('.vm-node-grid-icon-placeholder')).not.toBeNull();
		expect(grid.getAttribute('style')).toContain('--vm-node-grid-tile-w: 128px');
		expect(grid.getAttribute('style')).toContain('--vm-node-grid-icon-size: 24px');
	});

	it('virtualizes large node sets instead of mounting every tile', () => {
		const sourceNodes = manyNodes(200);

		renderGrid({ nodes: sourceNodes });

		const tiles = target.querySelectorAll('.vm-node-grid-tile');
		expect(tiles.length).toBeGreaterThan(0);
		expect(tiles.length).toBeLessThan(sourceNodes.length);
	});

	it('clicking a tile reports selection intent without running the primary action', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();

		expect(handlers.onTileClick).toHaveBeenCalledOnce();
		expect(handlers.onTileClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking the tile label reports primary selection intent', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="beta"] .vm-node-grid-label') as HTMLElement).click();

		expect(handlers.onTileClick).toHaveBeenCalledOnce();
		expect(handlers.onTileClick).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
		expect(handlers.onSecondaryAction).not.toHaveBeenCalled();
	});

	it('does not start box selection when pointerdown begins on a tile surface', () => {
		renderGrid();
		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const tile = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const setPointerCapture = vi.fn();
		Object.assign(grid, {
			setPointerCapture,
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});

		tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9 }));

		expect(setPointerCapture).not.toHaveBeenCalled();
	});

	it('double clicking the tile label reports secondary action intent', () => {
		const handlers = renderGrid();
		const label = target.querySelector('[data-id="beta"] .vm-node-grid-label') as HTMLElement;

		label.click();
		label.click();

		expect(handlers.onTileClick).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('double clicking the tile surface reports secondary action intent', () => {
		const handlers = renderGrid();
		const tile = target.querySelector('[data-id="beta"]') as HTMLElement;

		tile.click();
		tile.click();

		expect(handlers.onTileClick).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('middle clicking a tile surface reports tertiary action intent', () => {
		const handlers = renderGrid();
		const tile = target.querySelector('[data-id="beta"]') as HTMLElement;

		tile.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));

		expect(handlers.onTertiaryAction).toHaveBeenCalledOnce();
		expect(handlers.onTertiaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onTileClick).not.toHaveBeenCalled();
		expect(handlers.onSecondaryAction).not.toHaveBeenCalled();
	});

	it('forwards modifier state with tile selection events', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				ctrlKey: true,
				shiftKey: true,
			}),
		);

		const event = (handlers.onTileClick as ReturnType<typeof vi.fn>).mock.calls[0][1];
		expect(event.ctrlKey).toBe(true);
		expect(event.shiftKey).toBe(true);
	});

	it('exposes grid multi-selection roles with distinct selected, focused, and active-node states', () => {
		renderGrid({
			selectedIds: new Set(['alpha']),
			focusedId: 'alpha',
			activeId: 'beta',
		});

		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;

		expect(grid.getAttribute('role')).toBe('grid');
		expect(grid.getAttribute('aria-multiselectable')).toBe('true');
		expect(alpha.getAttribute('role')).toBe('gridcell');
		expect(alpha.getAttribute('aria-selected')).toBe('true');
		expect(alpha.classList.contains('is-selected')).toBe(true);
		expect(alpha.classList.contains('is-focused')).toBe(true);
		expect(beta.getAttribute('role')).toBe('gridcell');
		expect(beta.getAttribute('aria-selected')).toBe('false');
		expect(beta.classList.contains('is-active-node')).toBe(true);
		expect(beta.classList.contains('is-selected')).toBe(false);
	});

	it('marks grid tiles as native draggables only when manual DnD is enabled', () => {
		renderGrid({ manualDndEnabled: true, selectedIds: new Set(['alpha']) });

		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;

		expect(grid.classList.contains('is-manual-dnd')).toBe(true);
		expect(alpha.getAttribute('draggable')).toBe('true');
		expect(alpha.dataset.vmManualDnd).toBe('true');
		expect(beta.getAttribute('draggable')).toBe('true');
	});

	it('forwards context menu intent from the target tile', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(handlers.onContextMenu).toHaveBeenCalledOnce();
		expect(handlers.onContextMenu).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});

	it('reports rectangle-selected tile ids in visual order', () => {
		const handlers = renderGrid();
		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;
		Object.assign(grid, {
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});
		vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 240, 120));
		vi.spyOn(alpha, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 80));
		vi.spyOn(beta, 'getBoundingClientRect').mockReturnValue(rect(120, 0, 220, 80));

		grid.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
		grid.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 230, clientY: 90 }),
		);
		grid.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 230, clientY: 90 }));

		expect(handlers.onBoxSelect).toHaveBeenCalledOnce();
		expect(handlers.onBoxSelect).toHaveBeenCalledWith(['alpha', 'beta'], expect.any(PointerEvent));
	});

	it('renders inline hierarchy chevrons without showing collapsed children', () => {
		renderGrid({
			nodes: hierarchicalNodes(),
			hierarchyMode: 'inline',
		});

		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;
		const toggle = target.querySelector('[data-vm-node-grid-toggle="parent"]') as HTMLElement;

		expect(parent).not.toBeNull();
		expect(parent.getAttribute('aria-expanded')).toBe('false');
		expect(toggle).not.toBeNull();
		expect(target.querySelector('[data-id="child-a"]')).toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
	});

	it('reports inline chevron expansion without selecting or activating the tile', () => {
		const handlers = renderGrid({
			nodes: hierarchicalNodes(),
			hierarchyMode: 'inline',
		});

		(target.querySelector('[data-vm-node-grid-toggle="parent"]') as HTMLElement).click();

		expect(handlers.onToggleExpand).toHaveBeenCalledOnce();
		expect(handlers.onToggleExpand).toHaveBeenCalledWith('parent', expect.any(MouseEvent));
		expect(handlers.onTileClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('shows expanded inline children in a nested grid while keeping sibling tiles visible', () => {
		renderGrid({
			nodes: hierarchicalNodes(),
			hierarchyMode: 'inline',
			expandedIds: new Set(['parent']),
		});

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-vm-node-grid-inline-panel="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child-a"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child-b"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
	});

	it('rectangle selection includes expanded inline child tiles', () => {
		const handlers = renderGrid({
			nodes: hierarchicalNodes(),
			hierarchyMode: 'inline',
			expandedIds: new Set(['parent']),
		});
		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;
		const child = target.querySelector('[data-id="child-a"]') as HTMLElement;
		Object.assign(grid, {
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});
		vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 240, 180));
		vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 60));
		vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(rect(0, 72, 100, 132));

		grid.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
		grid.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 110, clientY: 140 }),
		);
		grid.dispatchEvent(
			new PointerEvent('pointerup', { bubbles: true, clientX: 110, clientY: 140 }),
		);

		expect(handlers.onBoxSelect).toHaveBeenCalledOnce();
		expect(handlers.onBoxSelect).toHaveBeenCalledWith(
			['parent', 'child-a'],
			expect.any(PointerEvent),
		);
	});
});

function rect(left: number, top: number, right: number, bottom: number): DOMRect {
	return {
		x: left,
		y: top,
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
		toJSON: () => ({}),
	} as DOMRect;
}
