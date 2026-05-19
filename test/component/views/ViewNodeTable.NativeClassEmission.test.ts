import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewNodeTable from '../../../src/components/views/ViewNodeTable.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../../src/services/serviceViewTableAdapter';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext, vaultmanPresetContext } from './nativeClassEmissionTestHelpers';

const nodes: TreeNode[] = [
	{ id: 'table-native-a', label: 'Table Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
];

describe('ViewNodeTable - native class emission', () => {
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

	function render(contextEntries = nativePresetContext()) {
		app = withContext(
			target,
			ViewNodeTable as unknown as Component<Record<string, unknown>>,
			{
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(['table-native-a']),
				focusedId: 'table-native-a',
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				onSelectAll: vi.fn(),
				icon: iconStub(),
			},
			contextEntries,
		);
		flushSync();
	}

	it('emits Bases table vocabulary when preset.useNativeDom=true', () => {
		render(nativePresetContext());

		expect(target.querySelector('.vm-node-table-row.bases-tr')).not.toBeNull();
		expect(target.querySelector('.vm-node-table-row.nav-file')).toBeNull();
		expect(target.querySelector('.vm-node-table-cell.bases-td')).not.toBeNull();
		expect(target.querySelector('.vm-node-table-primary.bases-table-cell')).not.toBeNull();
		expect(target.querySelector('.vm-node-table-header-cell.bases-table-header')).not.toBeNull();
	});

	it('emits vm state classes plus allow-listed native state classes', () => {
		render(nativePresetContext());

		const row = target.querySelector<HTMLElement>('.vm-node-table-row');
		expect(row?.classList.contains('vm-is-selected')).toBe(true);
		expect(row?.classList.contains('vm-is-focused')).toBe(true);
		expect(row?.classList.contains('is-selected')).toBe(true);
		expect(row?.classList.contains('is-focused')).toBe(true);
	});

	it('does not emit native table vocabulary when preset.useNativeDom=false', () => {
		render(vaultmanPresetContext());

		expect(target.querySelector('.bases-tr')).toBeNull();
		expect(target.querySelector('.bases-td')).toBeNull();
		expect(target.querySelector('.bases-table-cell')).toBeNull();
		expect(target.querySelector('.bases-table-header')).toBeNull();
		expect(target.querySelector('.nav-file')).toBeNull();
		expect(target.querySelector('.vm-node-table-row')).not.toBeNull();
	});
});
