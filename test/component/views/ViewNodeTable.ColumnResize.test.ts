import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeTable from '../../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

// SDF-011 resizer parity (V.D slice 2b, phase 2) — drag mechanics against the stable 1.1.6
// oracle (`git show 1.1.6:src/components/layout/viewGrid.ts` attachColumnResizer +
// `1.1.6:styles.css` .bases-table-header-resizer/.vaultman-table-resizing): every header
// carries a resize handle; pointerdown starts an in-memory drag session (body gets the
// resizing cursor class); pointermove applies `clamp(startWidth + dx)` to ONLY the dragged
// column while all other columns keep their materialized widths; pointerup ends the session.
// Adapted names: body class = the sandbox's existing global `vm-resizing` (stable:
// `vaultman-table-resizing`), projection = the shared grid-template + total-width CSS vars
// (stable: per-cell insetInlineStart/width) — same observable behavior, different form.

const nodes: TreeNode[] = [
	{ id: 'resize-a', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'resize-b', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

describe('ViewNodeTable - column resize (SDF-011 parity)', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
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
			if ('destroy' in app) app.destroy();
			else void unmount(app);
		}
		app = null;
		target.remove();
		document.body.classList.remove('vm-resizing');
		vi.unstubAllGlobals();
	});

	function render(props: Record<string, unknown> = {}) {
		const instance = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
				...props,
			},
		});
		app = instance;
		flushSync();
	}

	function handleFor(columnId: string): HTMLElement {
		const handle = target.querySelector<HTMLElement>(`[data-vm-table-resizer="${columnId}"]`);
		expect(handle).not.toBeNull();
		return handle!;
	}

	function tableEl(): HTMLElement {
		return target.querySelector<HTMLElement>('.vm-node-table')!;
	}

	function columnsVar(): string {
		return tableEl().style.getPropertyValue('--vm-node-table-columns').trim();
	}

	function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
		return new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
	}

	it('renders a resize handle on every column (stable: all headers resizable)', () => {
		render();
		expect(handleFor('label')).toBeTruthy();
		expect(handleFor('detail')).toBeTruthy();
		expect(handleFor('count')).toBeTruthy();
	});

	it('omits the handle when a column explicitly opts out via resizable: false', () => {
		render({
			columns: [
				{ id: 'label', label: 'Name', sortable: true, minWidth: 180 },
				{ id: 'count', label: 'Count', sortable: true, minWidth: 72, resizable: false },
			],
		});
		expect(target.querySelector('[data-vm-table-resizer="label"]')).not.toBeNull();
		expect(target.querySelector('[data-vm-table-resizer="count"]')).toBeNull();
	});

	it('keeps the fluid template untouched until a drag actually begins', () => {
		render();
		expect(columnsVar()).toBe('minmax(180px, 1fr) minmax(160px, 1fr) minmax(72px, 1fr)');
		expect(tableEl().style.getPropertyValue('--vm-node-table-w')).toBe('');
	});

	it('drag materializes all columns, applies clamp(start + dx) to the dragged one only', () => {
		render();
		const handle = handleFor('label');

		// jsdom has no layout: every header col measures 0 -> materializes to its clamp floor
		// (label 180 / detail 160 / count 72), same math the unit suite characterizes.
		handle.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
		flushSync();
		expect(document.body.classList.contains('vm-resizing')).toBe(true);

		window.dispatchEvent(pointer('pointermove', { clientX: 160 }));
		flushSync();
		expect(columnsVar()).toBe('240px 160px 72px'); // 180 + 60, others untouched
		expect(tableEl().style.getPropertyValue('--vm-node-table-w').trim()).toBe('472px');

		// clamped: dragging far left cannot shrink below the column minimum
		window.dispatchEvent(pointer('pointermove', { clientX: -900 }));
		flushSync();
		expect(columnsVar()).toBe('180px 160px 72px');

		window.dispatchEvent(pointer('pointerup', {}));
		flushSync();
		expect(document.body.classList.contains('vm-resizing')).toBe(false);

		// session over: further moves change nothing
		window.dispatchEvent(pointer('pointermove', { clientX: 500 }));
		flushSync();
		expect(columnsVar()).toBe('180px 160px 72px');
	});

	it('a resize drag never triggers header sorting', () => {
		render();
		const handle = handleFor('label');

		handle.dispatchEvent(pointer('pointerdown', { clientX: 10 }));
		window.dispatchEvent(pointer('pointermove', { clientX: 60 }));
		window.dispatchEvent(pointer('pointerup', {}));
		handle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		flushSync();

		expect(target.querySelector('[data-vm-table-sort="label"]')).toBeNull();
		expect(
			target
				.querySelector('[data-vm-table-header="label"]')
				?.getAttribute('aria-sort'),
		).toBe('none');
	});

	it('emits the Bases handle vocabulary only in native DOM mode', () => {
		app = withContext(
			target,
			ViewNodeTable as unknown as Component<Record<string, unknown>>,
			{
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			nativePresetContext(),
		);
		flushSync();
		expect(
			target.querySelector('[data-vm-table-resizer="label"].bases-table-header-resizer'),
		).not.toBeNull();
		app.destroy();
		app = null;
		target.replaceChildren();

		app = withContext(
			target,
			ViewNodeTable as unknown as Component<Record<string, unknown>>,
			{
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			vaultmanPresetContext(),
		);
		flushSync();
		expect(target.querySelector('.bases-table-header-resizer')).toBeNull();
		expect(target.querySelector('[data-vm-table-resizer="label"]')).not.toBeNull();
	});
});
