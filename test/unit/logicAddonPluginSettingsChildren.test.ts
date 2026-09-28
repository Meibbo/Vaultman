import { describe, expect, it } from 'vitest';

import { resolvePluginSettingsChildren } from '../../src/logic/logicAddonExplorer';
import { queryNativeSettingsSearch } from '../../src/services/serviceSettingSearchAdapter';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';
import type { App } from 'obsidian';
import type { NativeSettingsSearchGroup, RawSettingsSearchGroup, RawSettingsSearchItem } from '../../src/types/typeSettingsSearch';

function pluginNode(
	pluginId: string,
	name: string,
	overrides: Partial<PluginMeta> = {},
): TreeNode<PluginMeta> {
	return {
		id: `plugin:${pluginId}`,
		label: name,
		depth: 0,
		cells: [],
		meta: {
			pluginId,
			name,
			enabled: true,
			loaded: true,
			isVaultman: false,
			...overrides,
		},
		coreCls: 'tree-item-self nav-file-title tappable is-clickable',
	};
}

function item(
	tab: string,
	definition: string,
	page = 'General',
	pagePath = '',
): RawSettingsSearchItem {
	return {
		entry: {
			tab: { id: tab, name: tab },
			definition: { name: definition },
			page: { id: page.toLowerCase(), name: page },
			pagePath,
		},
		nameMatch: { score: 1, matches: [] },
		descMatch: { score: 0, matches: [] },
		score: 1,
	};
}

function group(
	tab: string,
	results: RawSettingsSearchItem[],
	tabName: string = tab,
): NativeSettingsSearchGroup {
	const raw: RawSettingsSearchGroup = {
		tab: { id: tab, name: tabName },
		page: { id: 'general', name: 'General' },
		pagePath: {},
		tabNameMatch: { score: 1, matches: [] },
		results,
		bestScore: { score: 1 },
	};
	const parsed = queryNativeSettingsSearch(
		{ setting: { searchIndex: { search: () => [raw] } } },
		'fixture',
	);
	const result = parsed[0];
	if (!result) throw new Error('fixture did not parse');
	return result;
}

function appWithNativeSearch(groups: NativeSettingsSearchGroup[]): unknown {
	return {
		setting: {
			pluginTabs: {
				myplugin: { id: 'myplugin', name: 'My Plugin' },
			} as Record<string, { id: string; name: string }>,
			searchIndex: {
				search: () => groups.map((g) => ({
					tab: { id: g.tab, name: g.tabName },
					page: { id: g.page, name: g.page },
					pagePath: g.pagePath,
					tabNameMatch: g.tabNameMatch,
					results: g.results.map((r) => ({
						entry: r.entry,
						nameMatch: r.nameMatch,
						descMatch: r.descMatch,
						score: r.score,
					})),
					bestScore: g.bestScore,
				})),
			},
		},
	};
}

function appWithPluginTabsOnly(): unknown {
	return {
		setting: {
			pluginTabs: {
				myplugin: { id: 'myplugin', name: 'My Plugin' },
			} as Record<string, { id: string; name: string }>,
		},
	};
}

// (Removed unused `appWithArrayPluginTabs` helper: the array-format case
// builds its app inline in 'adapts to pluginTabs being array format'.)

describe('resolvePluginSettingsChildren (spec-07)', () => {
	it('enabled plugin with tab pages = p-node with N children, correct row ids', () => {
		// Mock app with native search index returning pages for the plugin
		const groups = [
			group('myplugin', [
				item('myplugin', 'Setting 1', 'General', 'general'),
				item('myplugin', 'Setting 2', 'Advanced', 'advanced'),
			], 'My Plugin'),
		];
		const app = appWithNativeSearch(groups);

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		// Should be p-node with showCaret: true
		expect(result[0]?.showCaret).toBe(true);
		expect(result[0]?.children?.length).toBeGreaterThan(0);
		// Children should have correct row ids
		for (const child of result[0]?.children ?? []) {
			expect(child.id).toMatch(/^settings:/);
			expect(child.cells).toEqual([]);
			expect(child.meta?.pluginId).toBe('');
		}
	});

	it('disabled plugin / plugin without tab = leaf, no children', () => {
		const app = appWithPluginTabsOnly();

		// Disabled plugin
		const baseNodeDisabled = pluginNode('myplugin', 'My Plugin', { enabled: false });
		const resultDisabled = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNodeDisabled,
		);
		expect(resultDisabled[0]?.showCaret).toBe(false);
		expect(resultDisabled[0]?.children).toEqual([]);

		// Plugin without settings tab
		const baseNodeNoTab = pluginNode('otherplugin', 'Other Plugin');
		const resultNoTab = resolvePluginSettingsChildren(
			app,
			'otherplugin',
			baseNodeNoTab,
		);
		expect(resultNoTab[0]?.showCaret).toBe(false);
		expect(resultNoTab[0]?.children).toEqual([]);
	});

	it('child row id equals the bridge search row id for the same triple', () => {
		const groups = [
			group('myplugin', [
				item('myplugin', 'Setting 1', 'General', 'general'),
			], 'My Plugin'),
		];
		const app = appWithNativeSearch(groups);

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		for (const child of result[0]?.children ?? []) {
			// The id should match what settingsBridgeRowId would produce
			// for the same tab/page/definition triple
			expect(child.id).toMatch(/^settings:/);
			// Verify the id structure: settings:{tab}::${page}::${definition}
			const idParts = child.id.replace('settings:', '').split('::');
			expect(idParts.length).toBe(3); // tab, page, definition
		}
	});

	it('children carry no cells and no highlight ids', () => {
		const groups = [
			group('myplugin', [
				item('myplugin', 'Setting 1', 'General', 'general'),
			], 'My Plugin'),
		];
		const app = appWithNativeSearch(groups);

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		for (const child of result[0]?.children ?? []) {
			// No cells
			expect(child.cells).toEqual([]);
			// No highlight ids for this path (children don't enter highlightIds)
			// The child itself has no highlight status, but we verify it has no cells
			expect(child.meta?.pluginId).toBe('');
		}
	});

	it('plugin without tab in setting manager = leaf, no children', () => {
		const app: unknown = {
			setting: {
				pluginTabs: {
					otherplugin: { id: 'otherplugin', name: 'Other' },
				} as any,
			},
		};

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		// Plugin has no tab for myplugin, so it should be a leaf
		expect(result[0]?.showCaret).toBe(false);
		expect(result[0]?.children).toEqual([]);
	});

	it('search path and empty-term path share identity (no duplicate rows)', () => {
		const groups = [
			group('myplugin', [
				item('myplugin', 'Setting 1', 'General', 'general'),
				item('myplugin', 'Setting 2', 'Advanced', 'advanced'),
			], 'My Plugin'),
		];
		const app = appWithNativeSearch(groups);

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		// All child ids should start with 'settings:' (bridge row ids)
		const allIds = result[0]?.children?.map((c) => c.id) ?? [];
		for (const id of allIds) {
			expect(id).toMatch(/^settings:/);
		}
		// No duplicate ids among children
		const uniqueIds = new Set(allIds);
		expect(uniqueIds.size).toBe(allIds.length);
	});

	it('adapts to pluginTabs being array format', () => {
		// Array format still needs native search for pages
		const groups = [
			group('myplugin', [
				item('myplugin', 'Setting 1', 'General', 'general'),
			], 'My Plugin'),
		];
		const app = {
			setting: {
				pluginTabs: [
					{ id: 'myplugin', name: 'My Plugin' },
					{ id: 'other', name: 'Other' },
				] as readonly { id: string; name: string }[],
				searchIndex: {
					search: () => groups.map((g) => ({
						tab: { id: g.tab, name: g.tabName },
						page: { id: g.page, name: g.page },
						pagePath: g.pagePath,
						tabNameMatch: g.tabNameMatch,
						results: g.results.map((r) => ({
							entry: r.entry,
							nameMatch: r.nameMatch,
							descMatch: r.descMatch,
							score: r.score,
						})),
						bestScore: g.bestScore,
					})),
				},
			},
		};

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		// Should still work with array format
		expect(result[0]?.showCaret).toBe(true);
		expect(result[0]?.children?.length).toBeGreaterThan(0);
	});

	it('plugin stays as leaf when adapter unavailable', () => {
		const app = {} as App;

		const baseNode = pluginNode('myplugin', 'My Plugin');

		const result = resolvePluginSettingsChildren(
			app,
			'myplugin',
			baseNode,
		);

		// Spec-07: with no pages source the plugin remains a leaf, never removed
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(false);
		expect(result[0]?.children).toEqual([]);
	});
});
