import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree selection gestures', () => {
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

	function renderTree(
		nodes: TreeNode[],
		props: Partial<{
			expandedIds: Set<string>;
			selectedIds: Set<string>;
			focusedId: string | null;
			activeFilterIds: Set<string>;
			onToggle: (id: string) => void;
			onRowClick: (id: string, e: MouseEvent) => void;
			onPrimaryAction: (id: string, e: MouseEvent) => void;
			onSecondaryAction: (id: string, e: MouseEvent) => void;
			onTertiaryAction: (id: string, e: MouseEvent) => void;
			onContextMenu: (id: string, e: MouseEvent) => void;
			onBadgeDoubleClick: (queueIndex: number) => void;
			icon: (node: HTMLElement, name: string) => { update(n: string): void };
		}> = {},
	) {
		const defaults = {
			expandedIds: new Set<string>(),
			onToggle: vi.fn(),
			onRowClick: vi.fn(),
			onPrimaryAction: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				...defaults,
				...props,
			},
		});
		flushSync();
		return {
			onToggle: props.onToggle ?? defaults.onToggle,
			onRowClick: props.onRowClick ?? defaults.onRowClick,
			onPrimaryAction: props.onPrimaryAction ?? defaults.onPrimaryAction,
			onSecondaryAction: props.onSecondaryAction ?? defaults.onSecondaryAction,
			onTertiaryAction: props.onTertiaryAction ?? defaults.onTertiaryAction,
		};
	}

	it('clicking the chevron only toggles expansion', () => {
		const handlers = renderTree(
			[
				{
					id: 'parent',
					label: 'Parent',
					depth: 0,
					meta: {},
					children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
				},
			],
			{ expandedIds: new Set(['parent']) },
		);

		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledWith('parent');
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('reserves stable icon slots for rows without icons', () => {
		renderTree([
			{ id: 'with-icon', label: 'With icon', depth: 0, meta: {}, icon: 'lucide-file' },
			{ id: 'without-icon', label: 'Without icon', depth: 0, meta: {} },
		]);

		const tree = target.querySelector('.vm-tree-virtual-outer') as HTMLElement;
		const withIcon = target.querySelector('[data-id="with-icon"]') as HTMLElement;
		const withoutIcon = target.querySelector('[data-id="without-icon"]') as HTMLElement;

		expect(withIcon.querySelector('.vm-tree-icon')).not.toBeNull();
		expect(withoutIcon.querySelector('.vm-tree-icon-placeholder')).not.toBeNull();
		expect(tree.getAttribute('style')).toContain('--vm-tree-row-h: 28px');
		expect(tree.getAttribute('style')).toContain('--vm-tree-icon-size: 16px');
	});

	it('does not start box selection when the SVG inside a chevron receives pointerdown', () => {
		const handlers = renderTree(
			[
				{
					id: 'parent',
					label: 'Parent',
					depth: 0,
					meta: {},
					children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
				},
			],
			{
				expandedIds: new Set(['parent']),
				icon: iconWithSvg,
			},
		);
		const tree = target.querySelector('.vm-tree-virtual-outer') as HTMLElement;
		const svg = target.querySelector('.vm-tree-toggle svg') as SVGElement;
		const setPointerCapture = vi.fn();
		Object.assign(tree, {
			setPointerCapture,
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});

		svg.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 7 }),
		);
		svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 7 }));
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(setPointerCapture).not.toHaveBeenCalled();
		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledWith('parent');
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking the chevron toggles expansion from selected and active rows', () => {
		const handlers = renderTree(
			[
				{
					id: 'parent',
					label: 'Parent',
					depth: 0,
					meta: {},
					children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
				},
			],
			{
				expandedIds: new Set(['parent']),
				selectedIds: new Set(['parent']),
				activeFilterIds: new Set(['parent']),
				focusedId: 'parent',
			},
		);

		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledWith('parent');
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('does not let a completed selection rectangle swallow the next chevron click', () => {
		const handlers = renderTree(
			[
				{
					id: 'parent',
					label: 'Parent',
					depth: 0,
					meta: {},
					children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
				},
			],
			{ expandedIds: new Set(['parent']) },
		);
		const tree = target.querySelector('.vm-tree-virtual-outer') as HTMLElement;
		Object.assign(tree, {
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});
		vi.spyOn(tree, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 240, 120));

		tree.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
		tree.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 220, clientY: 64 }),
		);
		tree.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 220, clientY: 64 }));
		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();
		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(handlers.onToggle).toHaveBeenCalledTimes(2);
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking an actionable badge only runs the badge action', () => {
		const onBadgeAction = vi.fn();
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'Add',
						icon: 'lucide-plus',
						quickAction: true,
						onClick: onBadgeAction,
					},
				],
			},
		]);

		(target.querySelector('.vm-badge.is-quick-action') as HTMLElement).click();

		expect(onBadgeAction).toHaveBeenCalledOnce();
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('does not start box selection when pointerdown begins on a row surface', () => {
		renderTree([{ id: 'alpha', label: 'Alpha', depth: 0, meta: {} }]);
		const tree = target.querySelector('.vm-tree-virtual-outer') as HTMLElement;
		const row = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const setPointerCapture = vi.fn();
		Object.assign(tree, {
			setPointerCapture,
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});

		row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9 }));

		expect(setPointerCapture).not.toHaveBeenCalled();
	});

	it('keeps inherited badge actions and chevron expansion isolated on collapsed parents', () => {
		const handlers = renderTree([
			{
				id: 'parent',
				label: 'Parent',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'Hidden',
						icon: 'lucide-trash-2',
						isInherited: true,
						queueIndex: 2,
					},
				],
				children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
			},
		]);

		(target.querySelector('.vm-tree-child-badge-pill .vm-badge') as HTMLElement).click();
		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledWith('parent');
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('keeps parent quick-action badges and chevron expansion isolated', () => {
		const onBadgeAction = vi.fn();
		const handlers = renderTree([
			{
				id: 'parent',
				label: 'Parent',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'Add',
						icon: 'lucide-plus',
						quickAction: true,
						onClick: onBadgeAction,
					},
				],
				children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
			},
		]);

		(target.querySelector('.vm-badge.is-quick-action') as HTMLElement).click();
		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(onBadgeAction).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('selects the same node from apparent gaps in the virtual slot', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);
		const row = target.querySelector('.vm-tree-virtual-row') as HTMLElement;
		vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 10,
			left: 0,
			top: 10,
			right: 200,
			bottom: 42,
			width: 200,
			height: 32,
			toJSON: () => ({}),
		} as DOMRect);

		row.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 12, clientY: 40 }));

		expect(handlers.onRowClick).toHaveBeenCalledOnce();
		expect(handlers.onRowClick).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking the label uses the same primary selection as the row slot', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);

		(target.querySelector('.vm-tree-label') as HTMLElement).click();

		expect(handlers.onRowClick).toHaveBeenCalledOnce();
		expect(handlers.onRowClick).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
		expect(handlers.onSecondaryAction).not.toHaveBeenCalled();
	});

	it('double clicking the label reports the secondary action', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);
		const label = target.querySelector('.vm-tree-label') as HTMLElement;

		label.click();
		label.click();

		expect(handlers.onRowClick).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('double clicking the row surface reports the secondary action', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);
		const row = target.querySelector('[data-id="status"]') as HTMLElement;

		row.click();
		row.click();

		expect(handlers.onRowClick).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledOnce();
		expect(handlers.onSecondaryAction).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('middle clicking a row surface reports the tertiary action', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);
		const row = target.querySelector('[data-id="status"]') as HTMLElement;

		row.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));

		expect(handlers.onTertiaryAction).toHaveBeenCalledOnce();
		expect(handlers.onTertiaryAction).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onSecondaryAction).not.toHaveBeenCalled();
	});

	it('marks selectable treeitems selected without treating active filters as selected', () => {
		renderTree(
			[
				{ id: 'selected', label: 'Selected', depth: 0, meta: {} },
				{ id: 'active-filter', label: 'Active filter', depth: 0, meta: {} },
			],
			{
				selectedIds: new Set(['selected']),
				activeFilterIds: new Set(['active-filter']),
			},
		);

		expect(target.querySelector('[role="tree"]')?.getAttribute('aria-multiselectable')).toBe('true');
		expect(
			target.querySelector('[data-id="selected"]')?.getAttribute('aria-selected'),
		).toBe('true');
		expect(
			target.querySelector('[data-id="active-filter"]')?.getAttribute('aria-selected'),
		).toBe('false');
	});

	it('keeps selected, focused, and active-filter tree states distinct but coexisting', () => {
		renderTree(
			[
				{ id: 'combined', label: 'Combined', depth: 0, meta: {} },
				{ id: 'focused', label: 'Focused', depth: 0, meta: {} },
			],
			{
				selectedIds: new Set(['combined']),
				activeFilterIds: new Set(['combined']),
				focusedId: 'focused',
			},
		);

		const combined = target.querySelector('[data-id="combined"]') as HTMLElement;
		const combinedSurface = combined.querySelector('.vm-tree-row-surface') as HTMLElement;
		const focused = target.querySelector('[data-id="focused"]') as HTMLElement;

		expect(combined.getAttribute('aria-selected')).toBe('true');
		expect(combined.classList.contains('is-selected')).toBe(true);
		expect(combined.classList.contains('is-active-filter')).toBe(true);
		expect(combinedSurface.classList.contains('is-selected')).toBe(true);
		expect(combinedSurface.classList.contains('is-active-filter')).toBe(true);
		expect(focused.getAttribute('aria-selected')).toBe('false');
		expect(focused.classList.contains('is-focused')).toBe(true);
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

function iconWithSvg(el: HTMLElement, name: string) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('class', `svg-icon ${name}`);
	el.replaceChildren(svg);
	return {
		update(n: string) {
			svg.setAttribute('class', `svg-icon ${n}`);
		},
	};
}
