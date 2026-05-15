import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
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

	it('onSelect fires with SelectModifiers on click', () => {
		const onSelect = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onSelect, icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const rowEl = target.querySelector('[role="option"]') as HTMLElement;
		expect(rowEl).toBeTruthy();
		rowEl.click();
		expect(onSelect).toHaveBeenCalledWith(rowInputs[0], {
			ctrl: false,
			shift: false,
			alt: false,
		});

		rowEl.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true, shiftKey: true }));
		expect(onSelect).toHaveBeenLastCalledWith(rowInputs[0], {
			ctrl: true,
			shift: true,
			alt: false,
		});
	});

	it('onContextMenu fires on right-click with event and row', () => {
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
		expect(onContextMenu.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
		expect(onContextMenu.mock.calls[0][1]).toBe(rowInputs[0]);
	});

	it('onActivate fires on double-click and Enter', () => {
		const onActivate = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'Row A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rowInputs,
				onActivate,
				onFocus: vi.fn(),
				focusedId: 'a',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
		rowEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		expect(onActivate).toHaveBeenCalledWith(rowInputs[0]);

		onActivate.mockClear();
		target
			.querySelector('[role="listbox"]')!
			.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(onActivate).toHaveBeenCalledWith(rowInputs[0]);
	});

	it('Arrow keys move focus and fire onFocus', () => {
		const onFocus = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('b', 'B', '', []) as ViewRow<NodeBase>),
			rowInputFromViewRow(row('c', 'C', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onFocus, focusedId: 'a', icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const container = target.querySelector('[role="listbox"]')!;
		container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		expect(onFocus).toHaveBeenLastCalledWith('b');
		container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		expect(onFocus).toHaveBeenLastCalledWith('c');
		container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
		expect(onFocus).toHaveBeenLastCalledWith('a');
	});

	it('Space fires onSelect with empty modifiers', () => {
		const onSelect = vi.fn();
		const rowInputs: ExplorerRowInput<NodeBase>[] = [
			rowInputFromViewRow(row('a', 'A', '', []) as ViewRow<NodeBase>),
		];
		app = mount(ViewNodeList as unknown as Component<Record<string, unknown>>, {
			target,
			props: { rowInputs, onSelect, focusedId: 'a', icon: vi.fn(() => ({ update: vi.fn() })) },
		});
		flushSync();

		const container = target.querySelector('[role="listbox"]')!;
		container.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
		expect(onSelect).toHaveBeenCalledWith(rowInputs[0], {
			ctrl: false,
			shift: false,
			alt: false,
		});
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
				onSelect: vi.fn(),
				onFocus: vi.fn(),
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
});
