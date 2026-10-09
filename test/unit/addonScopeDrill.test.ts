import { describe, expect, it, vi } from 'vitest';

import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { IndexNodeRef } from '../../src/logic/logicIndexGroups';
import type { ExplorerSortState } from '../../src/types/typeUI';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';

function pluginMeta(pluginId: string, name: string): PluginMeta {
	return { pluginId, name, enabled: true, loaded: true, isVaultman: false };
}

function headerMeta(): PluginMeta {
	return { pluginId: '', name: '', enabled: false, loaded: false, isVaultman: false };
}

function leaf(id: string, label: string, depth = 1): TreeNode<PluginMeta> {
	return {
		id,
		label,
		depth,
		meta: pluginMeta(id.replace(/^plugin:/, ''), label),
	};
}

/** Projected tree with sections/plugins: one group header + one top-level leaf. */
function sectionGroup(): TreeNode<PluginMeta>[] {
	return [
		{
			id: 'group:core-plugins',
			label: 'Core plugins',
			depth: 0,
			isGroupHeader: true,
			meta: headerMeta(),
			children: [leaf('plugin:a', 'Alpha'), leaf('plugin:b', 'Beta')],
		},
		leaf('plugin:c', 'Gamma', 0),
	];
}

interface PluginsScopeHarness {
	sortState: ExplorerSortState;
	_lastProjectedTree: TreeNode<PluginMeta>[];
	_expandedGroupIds: Set<string>;
	onSortStateChange?: (state: ExplorerSortState) => void;
	onExpansionChange?: () => void;
	render: ReturnType<typeof vi.fn>;
	rebuildNodes: ReturnType<typeof vi.fn>;
	projectedNodes: () => TreeNode<PluginMeta>[];
	supportsDrill(): boolean;
	getIndexNodes(rootId: string | null): IndexNodeRef[];
	scopeRootForNode(id: string): string | null;
	scopeParentForNode(id: string): string | null;
	hasScopeParentNodes(): boolean;
	scopeLevelForNode(id: string): number | string | null;
	hasSortNode(id: string): boolean;
	expandNodeById(id: string): void;
	applyExternalSortScope(drillNodeId: string | null): void;
	setSortStateChangeHandler(handler?: (state: ExplorerSortState) => void): void;
}

function createHarness(
	tree: TreeNode<PluginMeta>[] = sectionGroup(),
): PluginsScopeHarness {
	const panel = Object.create(
		PluginsExplorerPanel.prototype,
	) as PluginsScopeHarness;
	panel.sortState = normalizeExplorerSortState('plugins', null);
	panel._lastProjectedTree = tree;
	panel._expandedGroupIds = new Set<string>();
	panel.render = vi.fn();
	panel.rebuildNodes = vi.fn();
	return panel;
}

describe('Plugins Addons Explorer scope drill', () => {
	it('supportsDrill() returns true', () => {
		expect(createHarness().supportsDrill()).toBe(true);
	});

	it('getIndexNodes projects the scope level with container flags', () => {
		const panel = createHarness();
		expect(panel.getIndexNodes(null)).toEqual([
			{ id: 'group:core-plugins', label: 'Core plugins', isContainer: true },
			{ id: 'plugin:c', label: 'Gamma', isContainer: false },
		]);
		expect(panel.getIndexNodes('group:core-plugins')).toEqual([
			{ id: 'plugin:a', label: 'Alpha', isContainer: false },
			{ id: 'plugin:b', label: 'Beta', isContainer: false },
		]);
		expect(panel.getIndexNodes('missing')).toEqual([]);
	});

	it('falls back to projectedNodes() when no projected tree was rendered yet', () => {
		const panel = createHarness([]);
		panel.projectedNodes = () => sectionGroup();
		expect(panel.getIndexNodes(null)).toEqual([
			{ id: 'group:core-plugins', label: 'Core plugins', isContainer: true },
			{ id: 'plugin:c', label: 'Gamma', isContainer: false },
		]);
	});

	it('scopeRootForNode resolves the owning parent level', () => {
		const panel = createHarness();
		expect(panel.scopeRootForNode('plugin:a')).toBe('group:core-plugins');
		expect(panel.scopeRootForNode('group:core-plugins')).toBeNull();
		expect(panel.scopeRootForNode('plugin:c')).toBeNull();
		expect(panel.scopeRootForNode('missing')).toBeNull();
	});

	it('scopeParentForNode lets a scope parent own itself', () => {
		const panel = createHarness();
		expect(panel.scopeParentForNode('plugin:a')).toBe('group:core-plugins');
		expect(panel.scopeParentForNode('group:core-plugins')).toBe(
			'group:core-plugins',
		);
		expect(panel.scopeParentForNode('plugin:c')).toBeNull();
	});

	it('hasScopeParentNodes reflects group headers in the projected tree', () => {
		expect(createHarness().hasScopeParentNodes()).toBe(true);
		expect(createHarness([leaf('plugin:c', 'Gamma', 0)]).hasScopeParentNodes()).toBe(
			false,
		);
	});

	it('scopeLevelForNode reports group and natural levels', () => {
		const panel = createHarness();
		expect(panel.scopeLevelForNode('group:core-plugins')).toBe('0+1');
		expect(panel.scopeLevelForNode('plugin:a')).toBe(1);
		expect(panel.scopeLevelForNode('plugin:c')).toBe(1);
		expect(panel.scopeLevelForNode('missing')).toBeNull();
	});

	it('hasSortNode matches only projected rows', () => {
		const panel = createHarness();
		expect(panel.hasSortNode('group:core-plugins')).toBe(true);
		expect(panel.hasSortNode('plugin:b')).toBe(true);
		expect(panel.hasSortNode('missing')).toBe(false);
	});

	it('expandNodeById expands once and notifies', () => {
		const panel = createHarness();
		panel.onExpansionChange = vi.fn();
		panel.expandNodeById('group:core-plugins');
		expect(panel._expandedGroupIds.has('group:core-plugins')).toBe(true);
		expect(panel.onExpansionChange).toHaveBeenCalledTimes(1);
		expect(panel.render).toHaveBeenCalledTimes(1);
		panel.expandNodeById('group:core-plugins');
		expect(panel.onExpansionChange).toHaveBeenCalledTimes(1);
		expect(panel.render).toHaveBeenCalledTimes(1);
	});

	it('applyExternalSortScope drives the drill scope and notifies once per change', () => {
		const panel = createHarness();
		const observed: ExplorerSortState[] = [];
		panel.setSortStateChangeHandler((state) => observed.push(state));

		panel.applyExternalSortScope('group:core-plugins');
		expect(panel.sortState).toMatchObject({
			activeScope: 'drill',
			drillNodeId: 'group:core-plugins',
		});
		expect(observed).toHaveLength(1);
		expect(panel.rebuildNodes).toHaveBeenCalledTimes(1);

		panel.applyExternalSortScope('group:core-plugins');
		expect(observed).toHaveLength(1);
		expect(panel.rebuildNodes).toHaveBeenCalledTimes(1);

		panel.applyExternalSortScope(null);
		expect(panel.sortState).toMatchObject({
			activeScope: 'all',
			drillNodeId: null,
		});
		expect(observed).toHaveLength(2);
		expect(panel.rebuildNodes).toHaveBeenCalledTimes(2);
	});

	it('wires the panel to the same guarded navbar seam and cleans it up', () => {
		expect(pluginsSource).toContain('setSortStateChangeHandler(');
		expect(pluginsSource).toContain('this.onSortStateChange?.(this.sortState)');
		expect(navbarSource).toContain('function handleExternalPluginsSortState(');
		expect(navbarSource).toContain("tab === 'plugins' && pluginsExplorer");
		expect(navbarSource).toContain(
			'pluginsExplorer.hasSortNode?.(id) ?? false',
		);
		expect(navbarSource).toContain(
			'currentPluginsExplorer?.setSortStateChangeHandler?.(',
		);
		expect(navbarSource).toContain('handleExternalPluginsSortState,');
		expect(navbarSource).toContain(
			'currentPluginsExplorer?.setSortStateChangeHandler?.(undefined)',
		);
	});
});
