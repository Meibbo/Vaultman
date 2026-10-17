import { describe, expect, it } from 'vitest';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import {
	buildGlobalSettingsNodes,
	resolvePluginSettingsChildren,
	sortAddonEntries,
	sortAddonNodes,
} from '../../src/logic/logicAddonExplorer';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';

describe('settingScene sort presets and Provided order', () => {
	it('includes provided sort preset in SORT_MENU_OPTIONS.plugins', () => {
		const provided = SORT_MENU_OPTIONS.plugins.find((opt) => opt.id === 'provided');
		expect(provided).toBeDefined();
		expect(provided?.labelKey).toBe('sort.by.provided');
		expect(provided?.icon).toBe('lucide-list-ordered');
	});

	it('sortAddonEntries respects provided order', () => {
		const entries = [
			{ name: 'Beta Plugin', enabled: true },
			{ name: 'Alpha Plugin', enabled: false },
			{ name: 'Gamma Plugin', enabled: true },
		];

		const asc = sortAddonEntries(entries, { sortBy: 'provided', direction: 'asc' });
		expect(asc.map((e) => e.name)).toEqual(['Beta Plugin', 'Alpha Plugin', 'Gamma Plugin']);

		const desc = sortAddonEntries(entries, { sortBy: 'provided', direction: 'desc' });
		expect(desc.map((e) => e.name)).toEqual(['Gamma Plugin', 'Alpha Plugin', 'Beta Plugin']);
	});

	it('sortAddonNodes respects provided and name sort', () => {
		const nodes: TreeNode<PluginMeta>[] = [
			{
				id: 'tab:b',
				label: 'Hotkeys',
				depth: 1,
				cells: [],
				meta: { pluginId: '', name: 'Hotkeys', enabled: false, loaded: false, isVaultman: false },
			},
			{
				id: 'tab:a',
				label: 'Appearance',
				depth: 1,
				cells: [],
				meta: { pluginId: '', name: 'Appearance', enabled: false, loaded: false, isVaultman: false },
			},
			{
				id: 'tab:c',
				label: 'General',
				depth: 1,
				cells: [],
				meta: { pluginId: '', name: 'General', enabled: false, loaded: false, isVaultman: false },
			},
		];

		const providedAsc = sortAddonNodes(nodes, { sortBy: 'provided', direction: 'asc' });
		expect(providedAsc.map((n) => n.label)).toEqual(['Hotkeys', 'Appearance', 'General']);

		const providedDesc = sortAddonNodes(nodes, { sortBy: 'provided', direction: 'desc' });
		expect(providedDesc.map((n) => n.label)).toEqual(['General', 'Appearance', 'Hotkeys']);

		const nameAsc = sortAddonNodes(nodes, { sortBy: 'name', direction: 'asc' });
		expect(nameAsc.map((n) => n.label)).toEqual(['Appearance', 'General', 'Hotkeys']);

		const nameDesc = sortAddonNodes(nodes, { sortBy: 'name', direction: 'desc' });
		expect(nameDesc.map((n) => n.label)).toEqual(['Hotkeys', 'General', 'Appearance']);
	});

	it('resolvePluginSettingsChildren sorts setting pages (node_settings_pages) according to sort preset', () => {
		const mockApp = {
			setting: {
				pluginTabs: {
					'my-plugin': { id: 'my-plugin', name: 'My Plugin' },
				},
				searchIndex: {
					search: () => [
						{
							tab: { id: 'my-plugin', name: 'My Plugin' },
							page: { id: 'p2', name: 'Zeta Page' },
							pagePath: '',
							results: [
								{ entry: { tab: { id: 'my-plugin' }, page: { id: 'p2', name: 'Zeta Page' }, definition: { name: 'Def 2' } } },
								{ entry: { tab: { id: 'my-plugin' }, page: { id: 'p2', name: 'Zeta Page' }, definition: { name: 'Def 1' } } },
							],
						},
						{
							tab: { id: 'my-plugin', name: 'My Plugin' },
							page: { id: 'p1', name: 'Alpha Page' },
							pagePath: '',
							results: [
								{ entry: { tab: { id: 'my-plugin' }, page: { id: 'p1', name: 'Alpha Page' }, definition: { name: 'Def B' } } },
								{ entry: { tab: { id: 'my-plugin' }, page: { id: 'p1', name: 'Alpha Page' }, definition: { name: 'Def A' } } },
							],
						},
					],
				},
			},
		};

		const baseNode: TreeNode<PluginMeta> = {
			id: 'plugin:my-plugin',
			label: 'My Plugin',
			depth: 0,
			cells: [],
			meta: { pluginId: 'my-plugin', name: 'My Plugin', enabled: true, loaded: false, isVaultman: false },
		};

		// 1. Provided sort preserves native search order of pages
		const providedResolved = resolvePluginSettingsChildren(
			mockApp,
			'my-plugin',
			baseNode,
			{ sortBy: 'provided', direction: 'asc' },
		);
		const providedPages = providedResolved[0].children?.map((c) => c.label);
		expect(providedPages).toEqual(['Zeta Page', 'Alpha Page']);

		// 2. Name asc sorts pages alphabetically
		const nameAscResolved = resolvePluginSettingsChildren(
			mockApp,
			'my-plugin',
			baseNode,
			{ sortBy: 'name', direction: 'asc' },
		);
		const namePages = nameAscResolved[0].children?.map((c) => c.label);
		expect(namePages).toEqual(['Alpha Page', 'Zeta Page']);

		// Check definitions inside Alpha Page are also sorted by name
		const alphaPage = nameAscResolved[0].children?.find((c) => c.label === 'Alpha Page');
		const defLabels = alphaPage?.children?.map((d) => d.label);
		expect(defLabels).toEqual(['Def A', 'Def B']);
	});

	it('buildGlobalSettingsNodes sorts global setting tabs (node_setting_tabs) according to sort preset', () => {
		const mockApp = {
			setting: {
				settingTabs: [
					{ id: 'general', name: 'General' },
					{ id: 'appearance', name: 'Appearance' },
					{ id: 'editor', name: 'Editor' },
				],
			},
		};

		const providedNodes = buildGlobalSettingsNodes(
			mockApp,
			[],
			undefined,
			{ sortBy: 'provided', direction: 'asc' },
		);
		// Provided order matches GLOBAL_SETTINGS_TAB_IDS: general, appearance, interface, editor, etc.
		expect(providedNodes[0].label).toBe('General');
		expect(providedNodes[1].label).toBe('Appearance');

		const nameAscNodes = buildGlobalSettingsNodes(
			mockApp,
			[],
			undefined,
			{ sortBy: 'name', direction: 'asc' },
		);
		// Name asc sorts alphabetically: Appearance comes before General
		expect(nameAscNodes[0].label).toBe('Appearance');
		expect(nameAscNodes.findIndex((n) => n.label === 'Appearance')).toBeLessThan(
			nameAscNodes.findIndex((n) => n.label === 'General'),
		);
	});
});
