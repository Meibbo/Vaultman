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
	props: (onContextMenu: (id: string, e: MouseEvent) => void) => Record<string, unknown>;
};

const icon = vi.fn(() => ({ update: vi.fn() }));

const viewCases: ViewCase[] = [
	{
		name: 'tree',
		component: ViewTree,
		props: (onContextMenu) => ({
			nodes,
			expandedIds: new Set<string>(),
			onToggle: vi.fn(),
			onRowClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onBoxSelect: vi.fn(),
			onContextMenu,
			onRowKeydown: vi.fn(),
			icon,
		}),
	},
	{
		name: 'list',
		component: ViewNodeList,
		props: (onContextMenu) => ({
			rowInputs: nodes.map((node) => rowInputFromTreeNode(node)),
			onRowClick: vi.fn(),
			onRowKeydown: vi.fn(),
			onContextMenu,
			selectedIds: new Set<string>(),
			focusedId: null,
			icon,
		}),
	},
	{
		name: 'table',
		component: ViewNodeTable,
		props: (onContextMenu) => ({
			rows: nodeRowsFromTree(nodes),
			columns: DEFAULT_NODE_TABLE_COLUMNS,
			selectedIds: new Set<string>(),
			focusedId: null,
			activeId: null,
			onRowClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu,
			onRowKeydown: vi.fn(),
			icon,
		}),
	},
	{
		name: 'grid',
		component: ViewNodeGrid,
		props: (onContextMenu) => ({
			nodes,
			selectedIds: new Set<string>(),
			focusedId: null,
			activeId: null,
			onTileClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu,
			onTileKeydown: vi.fn(),
			icon,
		}),
	},
	{
		name: 'cards',
		component: ViewNodeCards,
		props: (onContextMenu) => ({
			providerId: 'tags',
			nodes,
			visibleFields: ['icon', 'text', 'count'],
			selectedIds: new Set<string>(),
			focusedId: null,
			activeId: null,
			onCardClick: vi.fn(),
			onSecondaryAction: vi.fn(),
			onTertiaryAction: vi.fn(),
			onContextMenu,
			onCardKeydown: vi.fn(),
			measure,
			icon,
		}),
	},
];

describe('context-menu trigger parity', () => {
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

	it.each(viewCases)('$name dispatches onContextMenu(id, MouseEvent)', ({ component, props }) => {
		const onContextMenu = vi.fn((_: string, e: MouseEvent) => e.preventDefault());
		app = mount(component as Component<Record<string, unknown>>, {
			target,
			props: props(onContextMenu),
		});
		flushSync();

		target
			.querySelector<HTMLElement>('[data-id="alpha"]')
			?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

		expect(onContextMenu).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});
});
