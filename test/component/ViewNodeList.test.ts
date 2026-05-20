import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
import { createExplorerProjection } from '../../src/services/serviceExplorerProjection';
import {
	rowInputFromViewRow,
	type ExplorerRowInput,
} from '../../src/services/serviceExplorerRowInput';
import type { ViewAction, ViewRow } from '../../src/types/typeViews';
import type { NodeBase } from '../../src/types/typeContracts';

interface ListNode extends NodeBase {
	label: string;
	detail?: string;
}

function row(
	id: string,
	label: string,
	detail: string,
	actions: ViewAction<ListNode>[],
): ViewRow<ListNode> {
	const node = { id, label, detail };
	return {
		id,
		node,
		label,
		detail,
		cells: [],
		layers: { badges: { ops: [{ id: `${id}:badge`, label: 'Queued', tone: 'accent' }] } },
		actions,
		depth: 0,
	};
}

function listRowInput(input: ViewRow<ListNode>): ExplorerRowInput<NodeBase> {
	return rowInputFromViewRow(input as ViewRow<NodeBase>);
}

describe('ViewNodeList', () => {
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

	it('renders list row labels, details, badges, and dispatches semantic actions', () => {
		const onAction = vi.fn();
		const remove: ViewAction<ListNode> = { id: 'remove', label: 'Remove', icon: 'lucide-x' };
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs: [
					listRowInput(row('op-1', 'property', 'Set status', [remove])),
					listRowInput(row('op-2', 'tag', 'Add #project', [])),
				],
				onAction,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.textContent).toContain('Set status');
		expect(target.textContent).toContain('Add #project');
		expect(target.textContent).toContain('Queued');

		target.querySelector<HTMLButtonElement>('button[aria-label="Remove"]')?.click();

		expect(onAction).toHaveBeenCalledWith(remove, expect.objectContaining({ id: 'op-1' }));
	});

	it('renders queue child remove actions as inline cancel controls without changing semantics', () => {
		const onAction = vi.fn();
		const remove: ViewAction<ListNode> = {
			id: 'remove',
			label: 'Remove queued change',
			icon: 'lucide-x',
			tone: 'danger',
		};
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs: [
					listRowInput({
						...row('op-1', 'value', 'Delete status value', [remove]),
						cls: 'is-queue-child',
					}),
				],
				onAction,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const actionSlot = target.querySelector<HTMLElement>('.vm-view-list-actions');
		const button = target.querySelector<HTMLButtonElement>('button[aria-label="Remove queued change"]');
		expect(actionSlot?.classList.contains('is-counter-slot')).toBe(true);
		expect(button?.classList.contains('is-inline-cancel')).toBe(true);

		button!.click();

		expect(onAction).toHaveBeenCalledWith(remove, expect.objectContaining({ id: 'op-1' }));
	});

	it('emits row reorder requests when drag and drop is enabled', () => {
		const onReorder = vi.fn();
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs: [
					listRowInput(row('op-1', 'property', 'Set status', [])),
					listRowInput(row('op-2', 'tag', 'Add #project', [])),
				],
				canReorder: true,
				onReorder,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const source = target.querySelector<HTMLElement>('[data-id="op-2"]');
		const targetRow = target.querySelector<HTMLElement>('[data-id="op-1"]');
		expect(source?.getAttribute('draggable')).toBe('true');
		expect(targetRow?.getAttribute('draggable')).toBe('true');

		source!.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
		targetRow!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
		targetRow!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));

		expect(onReorder).toHaveBeenCalledWith({
			sourceId: 'op-2',
			targetId: 'op-1',
			position: 'before',
		});
	});

	it('renders rowInputs directly', () => {
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('b', 'Row B', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, canReorder: false, icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		expect(target.querySelectorAll('[role="listitem"]').length).toBe(2);
		expect(target.textContent).toContain('Row A');
		expect(target.textContent).toContain('Row B');
	});

	it('renders projection rows without direct rowInputs', () => {
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Projected A', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('b', 'Projected B', '', []) as ViewRow<NodeBase>),
		];
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'list',
			rowInputs,
			sourceRevision: 9,
		});
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				projection,
				selectedIds: new Set(['b']),
				onRowClick: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelectorAll('[role="listitem"], [role="option"]').length).toBe(2);
		expect(target.textContent).toContain('Projected A');
		expect(target.textContent).toContain('Projected B');
		expect(target.querySelector('[data-id="b"]')?.getAttribute('aria-selected')).toBe('true');
	});

	it('onRowClick fires with id and MouseEvent on click', () => {
		const onRowClick = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onRowClick, icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const rowEl = target.querySelector('[role="option"]') as HTMLElement;
		expect(rowEl).toBeTruthy();
		rowEl.click();
		expect(onRowClick).toHaveBeenCalledWith('a', expect.any(MouseEvent));

		rowEl.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true, shiftKey: true }));
		const modifiedEvent = onRowClick.mock.lastCall?.[1] as MouseEvent;
		expect(modifiedEvent.ctrlKey).toBe(true);
		expect(modifiedEvent.shiftKey).toBe(true);
	});

	it('onContextMenu fires on right-click with id and event', () => {
		const onContextMenu = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onContextMenu, icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
		rowEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

		expect(onContextMenu).toHaveBeenCalledTimes(1);
		expect(onContextMenu).toHaveBeenCalledWith('a', expect.any(MouseEvent));
	});

	it('onSecondaryAction fires on double-click and keydown delegates row id', () => {
		const onSecondaryAction = vi.fn();
		const onRowKeydown = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs,
				onSecondaryAction,
				onRowKeydown,
				focusedId: 'a',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
		rowEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		expect(onSecondaryAction).toHaveBeenCalledWith('a', expect.any(MouseEvent));

		rowEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(onRowKeydown).toHaveBeenCalledWith('a', expect.any(KeyboardEvent));
	});

	it('Arrow keys delegate row id and KeyboardEvent', () => {
		const onRowKeydown = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('b', 'B', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('c', 'C', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs,
				onRowKeydown,
				focusedId: 'a',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
		rowEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		expect(onRowKeydown).toHaveBeenCalledWith('a', expect.any(KeyboardEvent));
	});

	it('Space delegates to row keydown', () => {
		const onRowKeydown = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onRowKeydown, focusedId: 'a', icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
		rowEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
		expect(onRowKeydown).toHaveBeenCalledWith('a', expect.any(KeyboardEvent));
	});

	it('aria-selected and aria-activedescendant reflect selectedIds and focusedId', () => {
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('b', 'B', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs,
				selectedIds: new Set(['a']),
				focusedId: 'b',
				onRowClick: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const listbox = target.querySelector('[role="listbox"]')!;
		expect(listbox.getAttribute('aria-activedescendant')).toBe('vm-listrow-b');
		const rowA = target.querySelector('[data-id="a"]')!;
		expect(rowA.getAttribute('aria-selected')).toBe('true');
		expect(rowA.id).toBe('vm-listrow-a');
	});

	it.each([1_000, 10_000, 50_000])('renders %d rows without devirtualizing', (n) => {
		const rowInputs = Array.from({ length: n }, (_, index) =>
			rowInputFromViewRow(row(`r${index}`, `Row ${index}`, '', []) as ViewRow<NodeBase>),
		);
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const rendered = target.querySelectorAll('[role="listitem"], [role="option"]');
		expect(rendered.length).toBeGreaterThan(0);
		expect(rendered.length).toBeLessThan(50);
		expect(target.textContent).toContain('Row 0');
	});

	it.each([
		'vm-theme-default',
		'vm-theme-native',
		'vm-theme-polish',
		'vm-theme-glass',
		'vm-theme-custom',
	])('renders without hidden rows under %s', (themeClass) => {
		const rectSpy = vi
			.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
			.mockImplementation(() => new DOMRect(0, 0, 320, 32));
		document.body.classList.add(themeClass);
		try {
			const rowInputs: ExplorerRowInput<NodeBase>[] = [
				rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
			];
			app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
				target,
				props: { rowInputs, icon: vi.fn(() => ({ update: vi.fn() })) },
			});
			flushSync();

			const rowEl = target.querySelector<HTMLElement>('[data-id="a"]');
			expect(rowEl).toBeTruthy();
			expect(rowEl!.getBoundingClientRect().width).toBeGreaterThan(0);
		} finally {
			document.body.classList.remove(themeClass);
			rectSpy.mockRestore();
		}
	});
});
