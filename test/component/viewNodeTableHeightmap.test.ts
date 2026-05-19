import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { createExplorerProjection } from '../../src/services/serviceExplorerProjection';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../src/types/typeNode';

type VirtualizerOptions = {
	count?: number;
	getItemKey?: (index: number) => string | number;
	estimateSize?: (index: number) => number;
};

vi.mock('@tanstack/svelte-virtual', () => ({
	createVirtualizer: vi.fn((options: VirtualizerOptions) => {
		let current = options;
		const instance = {
			getVirtualItems: () => {
				let start = 0;
				return Array.from({ length: current.count ?? 0 }, (_, index) => {
					const size = current.estimateSize?.(index) ?? 32;
					const item = {
						index,
						key: current.getItemKey?.(index) ?? index,
						start,
						size,
						end: start + size,
					};
					start += size;
					return item;
				});
			},
			getTotalSize: () => {
				let total = 0;
				for (let index = 0; index < (current.count ?? 0); index += 1) {
					total += current.estimateSize?.(index) ?? 32;
				}
				return total;
			},
			scrollToIndex: vi.fn(),
			setOptions: (next: VirtualizerOptions) => {
				current = { ...current, ...next };
			},
		};
		return {
			subscribe(run: (value: typeof instance) => void) {
				run(instance);
				return () => {};
			},
		};
	}),
}));

const nodes: TreeNode[] = [
	{ id: 'short-1', label: 'Short one', depth: 0, meta: {}, icon: 'lucide-file' },
	{
		id: 'long',
		label: `Long label ${'wrap '.repeat(24)}`,
		depth: 0,
		meta: {},
		icon: 'lucide-file',
	},
	{ id: 'short-2', label: 'Short two', depth: 0, meta: {}, icon: 'lucide-file' },
];

function measureStub(): TextMeasureService {
	const measure: TextMeasureService = {
		cacheMisses: 0,
		measure: vi.fn((text: string, style) => {
			const lineCount = text.includes('wrap') ? 3 : 1;
			return { height: lineCount * style.lineHeight, lineCount };
		}),
		measureRowHeight: vi.fn((text: string) => (text.includes('wrap') ? 60 : 32)),
		invalidate: vi.fn(),
		invalidateAll: vi.fn(),
		clear: vi.fn(),
	};
	return measure;
}

describe('ViewNodeTable Pretext heightmap', () => {
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
		if (app) void unmount(app);
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(props: Record<string, unknown> = {}) {
		app = mount(ViewNodeTable as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('positions table rows with cumulative measured heights', () => {
		const measure = measureStub();
		render({ columnWidth: 160, measure });

		const rows = Array.from(target.querySelectorAll<HTMLElement>('.vm-node-table-row'));
		const yValues = rows.map((row) => row.style.getPropertyValue('--vm-node-table-y'));

		expect(yValues).toEqual(['0px', '32px', '92px']);
		expect(measure.measureRowHeight).toHaveBeenCalledWith(
			expect.stringContaining('wrap'),
			expect.objectContaining({ width: 160 }),
		);
	});

	it('emits Bases table classes when native DOM mode is active', () => {
		const theme = new ThemeService();
		theme.setPreset('native');

		render({ themeService: theme, measure: measureStub() });

		expect(target.querySelector('.vm-node-table-row.bases-tr')).toBeTruthy();
		expect(target.querySelector('.vm-node-table-primary.bases-table-cell')).toBeTruthy();
		expect(target.querySelector('.vm-node-table-cell.bases-td')).toBeTruthy();
		expect(target.querySelector('.vm-node-table-row.nav-file')).toBeFalsy();
	});

	it('renders table rows from an explorer projection without direct rows', () => {
		const onRowClick = vi.fn();
		const [alpha] = nodes;
		const rowInput = {
			...rowInputFromTreeNode(alpha),
			callbackId: 'callback:table-alpha',
			label: 'Projection table alpha',
		};
		const projection = createExplorerProjection({
			providerId: 'files',
			viewMode: 'table',
			rowInputs: [rowInput],
			sourceRevision: 16,
		});

		render({
			rows: [],
			projection,
			selectedIds: new Set(['short-1']),
			onRowClick,
			measure: measureStub(),
		});

		const row = target.querySelector<HTMLElement>('[data-id="short-1"]');
		expect(row).not.toBeNull();
		expect(row?.dataset.callbackId).toBe('callback:table-alpha');
		expect(row?.textContent).toContain('Projection table alpha');
		expect(row?.getAttribute('aria-selected')).toBe('true');

		row!.click();

		expect(onRowClick).toHaveBeenCalledWith('callback:table-alpha', expect.any(MouseEvent));
	});
});
