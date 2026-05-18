import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewHost from '../../../src/components/explorer/ViewHost.svelte';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	nodeRowsFromTree,
} from '../../../src/services/serviceViewTableAdapter';
import { rowInputFromTreeNode } from '../../../src/services/serviceExplorerRowInput';
import type { TreeNode } from '../../../src/types/typeNode';
import type { ThemePreset } from '../../../src/types/typeThemePreset';
import type { ExplorerViewMode } from '../../../src/types/typeViews';

const nodes: TreeNode[] = [
	{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
	{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
];

function makePreset(args?: Partial<{ lock: boolean; viewModes: readonly string[] }>): ThemePreset {
	return {
		source: 'built-in',
		id: 'vaultman',
		displayName: 'Vaultman',
		useNativeDom: false,
		chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
		density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
		dock: { visible: true, presentation: 'bar' },
		tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
		toolbar: { buttons: 'core' },
		viewModes: (args?.viewModes ?? ['tree', 'list', 'table', 'grid', 'cards']) as never,
		nodeElements: {
			icon: true,
			label: true,
			detail: true,
			media: false,
			badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
			actions: true,
		},
		lockNodeElementVisibility: args?.lock ?? false,
	};
}

function makeProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	const rowInputs = nodes.map((node) => rowInputFromTreeNode(node));
	return {
		preset: makePreset(),
		mountContext: 'panel',
		viewMode: 'tree' satisfies ExplorerViewMode,
		nodes,
		rowInputs,
		listRowInputs: rowInputs,
		cardNodes: nodes,
		gridNodes: nodes,
		tableRows: nodeRowsFromTree(nodes),
		tableColumns: DEFAULT_NODE_TABLE_COLUMNS,
		expandedIds: new Set<string>(),
		selectedIds: new Set<string>(),
		selectedMap: new Map<string, boolean>(),
		focusedId: null,
		activeId: null,
		providerId: 'files',
		visibleFields: ['icon', 'text', 'count'],
		icon: vi.fn(() => ({ update: vi.fn() })),
		onToggle: vi.fn(),
		onRowClick: vi.fn(),
		onContextMenu: vi.fn(),
		onSelect: vi.fn(),
		onActivate: vi.fn(),
		onFocus: vi.fn(),
		onListContextMenu: vi.fn(),
		...overrides,
	};
}

describe('ViewHost.svelte - shell behavior', () => {
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

	function renderHost(overrides: Record<string, unknown> = {}): void {
		app = mount(ViewHost as unknown as Component<Record<string, unknown>>, {
			target,
			props: makeProps(overrides),
		});
		flushSync();
	}

	it('mounts ViewTree when viewMode=tree', () => {
		renderHost({ viewMode: 'tree' });

		expect(target.querySelector('.vm-tree-virtual-row[data-id="alpha"]')).not.toBeNull();
	});

	it('mounts ViewNodeList when viewMode=list without keeping the tree branch mounted', () => {
		renderHost({ viewMode: 'list' });

		expect(target.querySelector('.vm-view-list-row[data-id="alpha"]')).not.toBeNull();
		expect(target.querySelector('.vm-tree-virtual-row')).toBeNull();
	});

	it('prunes viewMode to the first selectable mode when the preset excludes the requested mode', () => {
		renderHost({
			preset: makePreset({ viewModes: ['tree'] }),
			viewMode: 'cards',
		});

		expect(target.querySelector('.vm-node-card')).toBeNull();
		expect(target.querySelector('.vm-tree-virtual-row[data-id="alpha"]')).not.toBeNull();
	});
});
