import { describe, expect, it } from 'vitest';

import {
	isSettingsSearchActive,
	resolveSettingsBridgeNodes,
} from '../../src/logic/logicAddonExplorer';
import { queryNativeSettingsSearch } from '../../src/services/serviceSettingSearchAdapter';
import {
	groupMemberEntityId,
	projectGroupedTree,
	resolveCustomGroups,
} from '../../src/logic/logicTreeGroupProjection';
import { formatMembershipUrn } from '../../src/logic/logicMembershipUrn';
import type {
	NativeSettingsSearchGroup,
	RawSettingsSearchGroup,
	RawSettingsSearchItem,
} from '../../src/types/typeSettingsSearch';
import { settingsBridgeRefOf } from '../../src/types/typeSettingsSearch';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';

function pluginNode(
	pluginId: string,
	name: string,
	overrides: Partial<PluginMeta> = {},
): TreeNode<PluginMeta> {
	return {
		id: `plugin:${pluginId}`,
		label: name,
		depth: 0,
		cells: [
			{
				id: 'state',
				kind: 'toggle',
				enabled: true,
				style: 'native',
				label: 'Enabled',
			},
		],
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
	score = 1,
	nameMatches: readonly (readonly number[])[] = [],
	descMatches: readonly (readonly number[])[] = [],
): RawSettingsSearchItem {
	return {
		entry: {
			tab: { id: tab, name: tab },
			definition: { name: definition },
			page: { id: page.toLowerCase(), name: page },
			pagePath: {},
		},
		nameMatch: { score, matches: nameMatches },
		descMatch: { score: 0, matches: descMatches },
		score,
	};
}

function group(
	tab: string,
	results: RawSettingsSearchItem[],
	bestScore = 1,
	tabName: string = tab,
	tabNameMatches: readonly (readonly number[])[] = [],
): NativeSettingsSearchGroup {
	const raw: RawSettingsSearchGroup = {
		tab: { id: tab, name: tabName },
		page: { id: 'general', name: 'General' },
		pagePath: {},
		tabNameMatch: { score: bestScore, matches: tabNameMatches },
		results,
		bestScore: { score: bestScore },
	};
	const parsed = queryNativeSettingsSearch(
		{ setting: { searchIndex: { search: () => [raw] } } },
		'fixture',
	);
	const result = parsed[0];
	if (!result) throw new Error('fixture did not parse');
	return result;
}

const HEADER_META: PluginMeta = {
	pluginId: '',
	name: '',
	enabled: false,
	loaded: false,
	isVaultman: false,
};

describe('settings search activation', () => {
	it('keeps the empty term on the legacy path', () => {
		expect(isSettingsSearchActive('')).toBe(false);
	});

	it('routes any non-empty term (spaces included) to the native path', () => {
		expect(isSettingsSearchActive('theme')).toBe(true);
		expect(isSettingsSearchActive('   ')).toBe(true);
	});
});

describe('settings bridge resolution', () => {
	it('clears to zero rows with zero highlight on empty native groups', () => {
		const byId = new Map([['calendar', pluginNode('calendar', 'Calendar')]]);
		const result = resolveSettingsBridgeNodes({ pluginNodesById: byId, groups: [] });
		expect(result.nodes).toEqual([]);
		expect(result.highlightIds.size).toBe(0);
	});

	it('one native group yields one parent plus child definition rows', () => {
		const byId = new Map([['calendar', pluginNode('calendar', 'Calendar')]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [group('community-plugins', [item('community-plugins', 'Calendar', 'General', 1, [[0, 4]])], 1, 'community-plugins', [[0, 4]])],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.id).toBe('settings:community-plugins::::');
		expect(parent?.label).toBe('community-plugins');
		expect(parent?.cells).toEqual([]);
		expect(parent?.showCaret).toBe(true);
		expect(parent?.children?.length).toBe(1);
		const child = parent?.children?.[0];
		expect(child?.id).toBe('plugin:calendar');
		expect(child?.cells).toHaveLength(1);
		if (child?.meta) {
			expect(settingsBridgeRefOf(child.meta)).toBeNull();
		}
		expect(result.highlightIds.has(child?.id ?? '')).toBe(true);
		expect(result.highlightIds.has(parent?.id ?? '')).toBe(true);
	});

	it('projects an unresolvable hit as a cell-less settings row with text', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [group('theme', [item('theme', 'Accent color', 'General', 1, [[0, 6]])])],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.id).toBe('settings:theme::::');
		expect(parent?.label).toBe('theme');
		expect(parent?.children?.length).toBe(1);
		const row = parent?.children?.[0];
		expect(row?.id.startsWith('settings:')).toBe(true);
		expect(row?.label).toBe('Accent color');
		expect(row?.cells).toEqual([]);
		expect(row?.meta.pluginId).toBe('');
		expect(row?.meta ? settingsBridgeRefOf(row.meta) : null).toEqual({
			tab: 'theme',
			page: 'General',
			pagePath: '',
			definition: 'Accent color',
		});
		expect(result.highlightIds.has(row?.id ?? '')).toBe(true);
	});

	it('matches tabs exactly: near-misses fall through to settings rows', () => {
		const row = pluginNode('calendar', 'Calendar');
		const byId = new Map([['calendar', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [group('Calendar', [item('Calendar', 'Week start')])],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.id).toBe('settings:Calendar::::');
		expect(parent?.children?.length).toBe(1);
		expect(parent?.children?.[0]?.id.startsWith('settings:')).toBe(true);
		expect(result.nodes).not.toContain(row);
	});

	it('highlights only rows with a real match in a mixed group', () => {
		const byId = new Map([['calendar', pluginNode('calendar', 'Calendar')]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('theme', [
					item('theme', 'Accent color', 'Appearance', 12, [[0, 6]]),
					item('theme', 'Background', 'Appearance', 4),
				]),
				group('calendar', [item('calendar', 'Week start')]),
			],
		});
		expect(result.nodes).toHaveLength(2);
		expect(result.highlightIds.size).toBe(1);
		const highlightedChild = result.nodes[0]?.children?.find((c) =>
			result.highlightIds.has(c.id),
		);
		expect(highlightedChild?.id).toBeTruthy();
		expect(result.highlightIds.has(highlightedChild!.id)).toBe(true);
	});

	it('intercepts by exact definition name when the tab is community-plugins', () => {
		const row = pluginNode('hot-reload', 'Hot Reload');
		const byId = new Map([['hot-reload', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('community-plugins', [
					item('community-plugins', 'Hot Reload', 'General', 5, [[0, 3]]),
				]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.id).toBe('settings:community-plugins::::');
		expect(parent?.children?.length).toBe(1);
		expect(parent?.children?.[0]).toBe(row);
		expect(parent?.children?.[0]?.id).toBe('plugin:hot-reload');
		expect(parent?.children?.[0]?.cells).toHaveLength(1);
		expect(result.highlightIds.has(row.id)).toBe(true);
	});

	it('does NOT resolve plugin when tab is NOT community-plugins/core-plugins', () => {
		const row = pluginNode('hot-reload', 'Hot Reload');
		const byId = new Map([['hot-reload', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('appearance', [
					item('appearance', 'Hot Reload', 'General', 5, [[0, 3]]),
				]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.children?.length).toBe(1);
		expect(parent?.children?.[0]?.id.startsWith('settings:')).toBe(true);
		expect(parent?.children).not.toContain(row);
	});

	it('falls back to settings rows on near-miss and case-mismatched names', () => {
		const row = pluginNode('hot-reload', 'Hot Reload');
		const byId = new Map([['hot-reload', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('community-plugins', [
					item('community-plugins', 'Hot Reloa', 'General', 5, [[0, 3]]),
					item('community-plugins', 'hot reload', 'General', 5, [[0, 3]]),
				]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.children?.length).toBe(2);
		expect(parent?.children?.every((node) => node.id.startsWith('settings:'))).toBe(
			true,
		);
		expect(parent?.children).not.toContain(row);
	});

	it('never guesses on ambiguous duplicate definition names', () => {
		const first = pluginNode('a-plug', 'Shared Name');
		const second = pluginNode('b-plug', 'Shared Name');
		const byId = new Map([
			['a-plug', first],
			['b-plug', second],
		]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('community-plugins', [
					item('community-plugins', 'Shared Name', 'General', 5, [[0, 6]]),
				]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.children?.length).toBe(1);
		expect(parent?.children?.[0]?.id.startsWith('settings:')).toBe(true);
		expect(parent?.children?.[0]).not.toBe(first);
		expect(parent?.children?.[0]).not.toBe(second);
	});

	it('emits a parent row with zero children for an empty group with a tab name match', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [group('hotkeys', [], 1, 'Hotkeys', [[0, 1]])],
		});
		expect(result.nodes.length).toBeGreaterThanOrEqual(1);
		const parent = result.nodes[0];
		expect(parent?.label).toBe('Hotkeys');
		expect(parent?.cells).toEqual([]);
		expect(parent?.children).toEqual([]);
		expect(parent?.meta.pluginId).toBe('');
		expect(result.highlightIds.has(parent?.id ?? '')).toBe(true);
	});

	it('emits nothing for an empty group without a tab name match', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [group('hotkeys', [])],
		});
		expect(result.nodes).toEqual([]);
		expect(result.highlightIds.size).toBe(0);
	});

	it('applies no local text filter: rows stay even when their text lacks the term', () => {
		const byId = new Map([['calendar', pluginNode('calendar', 'Calendar')]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('calendar', [item('calendar', 'Week start')]),
				group('theme', [item('theme', 'Accent color')]),
			],
		});
		expect(result.nodes.map((node) => node.id)).toEqual([
			'settings:calendar::::',
			result.nodes[1]?.id,
		]);
	});

	it('keeps native ranking across groups and items', () => {
		const byId = new Map([
			['b-plug', pluginNode('b-plug', 'B Plug')],
			['a-plug', pluginNode('a-plug', 'A Plug')],
		]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('second', [item('b-plug', 'B setting', 'General', 9)]),
				group('first', [item('a-plug', 'A setting', 'General', 3)]),
			],
		});
		expect(result.nodes.map((node) => node.id)).toEqual([
			'settings:second::::',
			'settings:first::::',
		]);
	});

	it('emits one entity when the same identity lands in two native groups', () => {
		const row = pluginNode('calendar', 'Calendar');
		const byId = new Map([['calendar', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('community-plugins', [item('community-plugins', 'Calendar', 'General', 1, [[0, 4]])]),
				group('core-plugins', [item('core-plugins', 'Calendar', 'General', 1)]),
			],
		});
		expect(result.nodes).toHaveLength(2);
		expect(result.nodes[0]?.children?.length).toBe(1);
		expect(result.nodes[0]?.children?.[0]).toBe(row);
		expect(result.nodes[1]?.children).toEqual([]);
	});

	it('dedupes a repeated settings identity instead of doubling the entity', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [
				group('one', [item('theme', 'Accent color')]),
				group('two', [item('theme', 'Accent color')]),
			],
		});
		expect(result.nodes).toHaveLength(2);
		expect(result.nodes[0]?.children?.length).toBe(1);
		expect(result.nodes[1]?.children).toEqual([]);
	});

	it('falls back from definition to page to tab for the row text', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [
				group('g', [
					item('theme', '', 'Appearance'),
					{
						...item('', '', '', 0),
						entry: {
							tab: { id: 'core', name: 'Core' },
							definition: { name: '' },
							page: { id: '', name: '' },
							pagePath: {},
						},
					},
				]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		const parent = result.nodes[0];
		expect(parent?.children?.map((node) => node.label)).toEqual([
			'Appearance',
			'core',
		]);
	});
});

describe('bridge rows through grouping and flattening', () => {
	function urnOf(node: TreeNode<PluginMeta>): string {
		const ref = settingsBridgeRefOf(node.meta);
		if (ref) {
			return formatMembershipUrn({
				providerId: 'plugins',
				kind: 'settings',
				canonicalId: `${ref.tab}::${ref.page}::${ref.definition}`,
				displayLabel: node.label,
			});
		}
		return formatMembershipUrn({
			providerId: 'plugins',
			kind: 'plugin',
			canonicalId: node.meta.pluginId,
			displayLabel: node.label,
		});
	}

	function bridgeFixture() {
		const byId = new Map([
			['calendar', pluginNode('calendar', 'Calendar')],
			['tasks', pluginNode('tasks', 'Tasks')],
		]);
		return resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('community-plugins', [item('community-plugins', 'Calendar')]),
				group('theme', [item('theme', 'Accent color')]),
			],
		});
	}

	function entityIds(rows: readonly TreeNode<PluginMeta>[]): string[] {
		const out: string[] = [];
		const walk = (list: readonly TreeNode<PluginMeta>[]): void => {
			for (const row of list) {
				if (!row.isGroupHeader) {
					// Skip native search group parent nodes (settings:*::*:*);
					// they are containers, not entities.
					const isNativeParent =
						row.id.startsWith('settings:') &&
						row.id.endsWith('::') &&
						row.children !== undefined;
					if (!isNativeParent) {
						out.push(groupMemberEntityId(row.id));
					}
				}
				walk(row.children ?? []);
			}
		};
		walk(rows);
		return out;
	}

	it('flattens with identical ids when groups toggle off', () => {
		const bridge = bridgeFixture();
		const flat = projectGroupedTree<PluginMeta>({
			nodes: bridge.nodes,
			groups: [],
			memberships: {},
			providerId: 'plugins',
			noGroupLabel: 'No group',
			filtered: false,
			urnOf,
			preset: { kind: 'none', direction: 'asc' },
			headerMeta: HEADER_META,
		});
		expect(flat.map((node) => node.id)).toEqual(
			bridge.nodes.map((node) => node.id),
		);
	});

	it('toggling groups on keeps entries and highlights while changing parentage', () => {
		const bridge = bridgeFixture();
		// bridgeFixture: parent 0 = community-plugins, parent 1 = theme
		const themeChild = bridge.nodes[1]?.children?.[0];
		const settingsId = themeChild?.id ?? bridge.nodes[1]?.id ?? '';
		const memberships = {
			favs: [
				formatMembershipUrn({
					providerId: 'plugins',
					kind: 'plugin',
					canonicalId: 'calendar',
					displayLabel: 'Calendar',
				}),
				formatMembershipUrn({
					providerId: 'plugins',
					kind: 'settings',
					canonicalId: 'theme::General::Accent color',
					displayLabel: 'Accent color',
				}),
			],
		};
		const grouped = projectGroupedTree<PluginMeta>({
			nodes: bridge.nodes,
			groups: resolveCustomGroups(memberships),
			memberships,
			providerId: 'plugins',
			noGroupLabel: 'No group',
			filtered: false,
			urnOf,
			preset: { kind: 'custom', direction: 'asc' },
			headerMeta: HEADER_META,
		});
		const members = entityIds(grouped).sort();
		expect(members).toEqual(['plugin:calendar', settingsId].sort());
		const header = grouped.find((row) => row.isGroupHeader);
		expect(header?.children?.every((child) => child.depth === 1)).toBe(true);
		for (const id of bridge.highlightIds) {
			expect(members).toContain(id);
		}
	});

	it('renders one identity in two groups as two adopted occurrences', () => {
		const byId = new Map([['calendar', pluginNode('calendar', 'Calendar')]]);
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [group('community-plugins', [item('community-plugins', 'Calendar', 'General', 1, [[0, 4]])], 1, 'community-plugins', [[0, 4]])],
		});
		const memberships = {
			g1: [
				formatMembershipUrn({
					providerId: 'plugins',
					kind: 'plugin',
					canonicalId: 'calendar',
					displayLabel: 'Calendar',
				}),
			],
			g2: [
				formatMembershipUrn({
					providerId: 'plugins',
					kind: 'plugin',
					canonicalId: 'calendar',
					displayLabel: 'Calendar',
				}),
			],
		};
		const grouped = projectGroupedTree<PluginMeta>({
			nodes: bridge.nodes,
			groups: resolveCustomGroups(memberships),
			memberships,
			providerId: 'plugins',
			noGroupLabel: 'No group',
			filtered: false,
			urnOf,
			preset: { kind: 'custom', direction: 'asc' },
			headerMeta: HEADER_META,
		});
		const members = entityIds(grouped);
		expect(members).toEqual(['plugin:calendar']);
		// Native search parent stays at top level; children are not
		// separately adopted into custom groups while search is active.
		const rows: string[] = [];
		const walk = (list: readonly TreeNode<PluginMeta>[]): void => {
			for (const row of list) {
				if (!row.isGroupHeader) rows.push(row.id);
				walk(row.children ?? []);
			}
		};
		walk(grouped);
		expect([...rows].sort()).toEqual(
			['plugin:calendar', 'settings:community-plugins::::'].sort(),
		);
	});
});
