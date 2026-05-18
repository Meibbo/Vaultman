import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeTable from '../../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';

const nodes: TreeNode[] = [
	{
		id: 'table-a',
		label: 'Table Alpha',
		depth: 0,
		meta: {},
		icon: 'lucide-file',
		count: 9,
		badges: [{ icon: 'lucide-trash-2', queueIndex: 0, title: 'queued' }],
	},
];

describe('ViewNodeTable - NodeElementMask gating', () => {
	let target: HTMLDivElement;
	let app: { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
	});

	afterEach(() => {
		app?.destroy();
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	function render(mask = makeMask()) {
		app = withContext(
			target,
			ViewNodeTable as unknown as Component<Record<string, unknown>>,
			{
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				onSelectAll: vi.fn(),
				onBadgeDoubleClick: vi.fn(),
				icon: iconStub(),
			},
			maskContext(mask),
		);
		flushSync();
	}

	it('gates icon, label, detail/count cells, and operation badges', () => {
		render(makeMask({ icon: false, label: false, detail: false, badges: { ops: false, counts: false } }));

		const row = target.querySelector('[data-id="table-a"]');
		expect(row).not.toBeNull();
		expect(row?.querySelector('.vm-node-table-icon')).toBeNull();
		expect(row?.querySelector('.vm-node-table-primary')).toBeNull();
		expect(row?.querySelector('[data-vm-table-cell="table-a:detail"]')?.textContent?.trim()).toBe('');
		expect(row?.querySelector('[data-vm-table-cell="table-a:count"]')?.textContent?.trim()).toBe('');
		expect(row?.querySelector('[aria-label="queued"]')).toBeNull();
	});
});
