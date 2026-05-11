import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewList from '../../src/components/views/viewList.svelte';
import type { ExplorerRenderModel, ViewAction, ViewRow } from '../../src/types/typeViews';
import type { NodeBase } from '../../src/types/typeContracts';

interface ListNode extends NodeBase {
	label: string;
	detail?: string;
}

function model(rows: ViewRow<ListNode>[]): ExplorerRenderModel<ListNode> {
	return {
		explorerId: 'queue',
		mode: 'list',
		rows,
		columns: [],
		groups: [],
		selection: { ids: new Set() },
		focus: { id: null },
		sort: { id: 'manual', direction: 'asc' },
		search: { query: '' },
		virtualization: { rowHeight: 32, overscan: 5 },
		capabilities: {},
	};
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
	};
}

describe('ViewList', () => {
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
		app = mount(ViewList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				model: model([
					row('op-1', 'property', 'Set status', [remove]),
					row('op-2', 'tag', 'Add #project', []),
				]),
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
		app = mount(ViewList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				model: model([{ ...row('op-1', 'value', 'Delete status value', [remove]), cls: 'is-queue-child' }]),
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
		app = mount(ViewList as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				model: {
					...model([
						row('op-1', 'property', 'Set status', []),
						row('op-2', 'tag', 'Add #project', []),
					]),
					capabilities: { canDrag: true, canDrop: true },
				},
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
});
