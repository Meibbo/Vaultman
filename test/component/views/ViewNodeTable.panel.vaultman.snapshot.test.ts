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
import { vaultmanPresetContext } from './nativeClassEmissionTestHelpers';
import { normalizedSnapshotHtml } from './panelSnapshotHelpers';

const nodes: TreeNode[] = [
	{
		id: 'table-alpha',
		label: 'Alpha',
		depth: 0,
		meta: { file: { path: 'alpha.md' } },
		icon: 'lucide-file',
		count: 3,
		badges: [{ text: 'Warn', solid: true, color: 'warning' }],
	},
];

describe('ViewNodeTable - panel x vaultman snapshot', () => {
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

	it('row root + primary cell + state mods + badges render under default vaultman mask', () => {
		app = withContext(
			target,
			ViewNodeTable as unknown as Component<Record<string, unknown>>,
			{
				rows: nodeRowsFromTree(nodes),
				columns: DEFAULT_NODE_TABLE_COLUMNS,
				selectedIds: new Set<string>(['table-alpha']),
				focusedId: 'table-alpha',
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				onSelectAll: vi.fn(),
				icon: iconStub(),
			},
			[...vaultmanPresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		expect(normalizedSnapshotHtml(target.firstElementChild)).toMatchSnapshot();
	});
});
