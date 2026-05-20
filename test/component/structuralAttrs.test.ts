import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import { rowInputFromTreeNode } from '../../src/services/serviceExplorerRowInput';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../src/services/serviceViewTableAdapter';
import type { TextMeasureService } from '../../src/services/serviceTextMeasure';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file', count: 2 },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag', count: 1 },
];

const measure: TextMeasureService = {
	cacheMisses: 0,
	measure: vi.fn((text: string, style) => ({
		lineCount: Math.max(1, Math.ceil(text.length / 24)),
		height: Math.max(1, Math.ceil(text.length / 24)) * style.lineHeight,
	})),
	measureRowHeight: vi.fn(() => 32),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	clear: vi.fn(),
};

type ViewCase = {
	name: string;
	component: unknown;
	role: string;
	props: Record<string, unknown>;
};

const icon = vi.fn(() => ({ update: vi.fn() }));

const selectedIds = new Set<string>(['alpha']);

const viewCases: ViewCase[] = [
	{
		name: 'tree',
		component: ViewTree,
		role: 'treeitem',
		props: {
			nodes,
			selectedIds,
			expandedIds: new Set<string>(),
			onToggle: vi.fn(),
			onRowClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onBoxSelect: vi.fn(),
			onContextMenu: vi.fn(),
			onRowKeydown: vi.fn(),
			icon,
		},
	},
	{
		name: 'list',
		component: ViewNodeList,
		role: 'option',
		props: {
			rowInputs: nodes.map((node) => rowInputFromTreeNode(node)),
			onRowClick: vi.fn(),
			onRowKeydown: vi.fn(),
			onContextMenu: vi.fn(),
			selectedIds,
			focusedId: null,
			icon,
		},
	},
	{
		name: 'table',
		component: ViewNodeTable,
		role: 'row',
		props: {
			rows: nodeRowsFromTree(nodes),
			columns: DEFAULT_NODE_TABLE_COLUMNS,
			selectedIds,
			focusedId: null,
			activeId: null,
			onRowClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onRowKeydown: vi.fn(),
			icon,
		},
	},
	{
		name: 'grid',
		component: ViewNodeGrid,
		role: 'gridcell',
		props: {
			nodes,
			selectedIds,
			focusedId: null,
			activeId: null,
			onTileClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onTileKeydown: vi.fn(),
			icon,
		},
	},
	{
		name: 'cards',
		component: ViewNodeCards,
		role: 'gridcell',
		props: {
			providerId: 'tags',
			nodes,
			visibleFields: ['icon', 'text', 'count'],
			selectedIds,
			focusedId: null,
			activeId: null,
			onCardClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onCardKeydown: vi.fn(),
			measure,
			icon,
		},
	},
];

describe('view structural attrs anti-drift', () => {
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

	it.each(viewCases)('$name exposes common row attrs', ({ component, props, role }) => {
		app = mount(component as Component<Record<string, unknown>>, { target, props });
		flushSync();

		const alpha = target.querySelector<HTMLElement>('[data-id="alpha"]');
		const beta = target.querySelector<HTMLElement>('[data-id="beta"]');

		expect(alpha?.getAttribute('data-row-key')).toBe('alpha');
		expect(alpha?.getAttribute('role')).toBe(role);
		expect(alpha?.getAttribute('aria-selected')).toBe('true');
		expect(alpha?.getAttribute('aria-expanded')).toBeNull();
		expect(beta?.getAttribute('aria-selected')).toBe('false');
	});
});
