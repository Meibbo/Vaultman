import { describe, expect, it } from 'vitest';

import {
	isSettingsSearchActive,
	resolveSettingsBridgeNodes,
} from '../../src/logic/logicAddonExplorer';
import {
	groupMemberEntityId,
	projectGroupedTree,
	resolveCustomGroups,
} from '../../src/logic/logicTreeGroupProjection';
import { formatMembershipUrn } from '../../src/logic/logicMembershipUrn';
import type {
	NativeSettingsSearchGroup,
	NativeSettingsSearchItem,
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
): NativeSettingsSearchItem {
	return {
		entry: { tab, definition, page, pagePath: page },
		nameMatch: [],
		descMatch: [],
		score,
	};
}

function group(
	tab: string,
	results: NativeSettingsSearchItem[],
	bestScore = 1,
): NativeSettingsSearchGroup {
	return {
		tab,
		page: 'General',
		pagePath: 'General',
		tabNameMatch: [],
		results,
		bestScore,
	};
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

	it('resolves a known tab to the same row, keeping kind and cells', () => {
		const row = pluginNode('calendar', 'Calendar');
		const byId = new Map([['calendar', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [group('calendar', [item('calendar', 'Week start')])],
		});
		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0]).toBe(row);
		expect(result.nodes[0]?.id).toBe('plugin:calendar');
		expect(result.nodes[0]?.cells).toHaveLength(1);
		const rowMeta = result.nodes[0]?.meta;
		expect(rowMeta ? settingsBridgeRefOf(rowMeta) : null).toBeNull();
		expect(result.highlightIds.has('plugin:calendar')).toBe(true);
	});

	it('projects an unresolvable hit as a cell-less settings row with text', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [group('theme', [item('theme', 'Accent color')])],
		});
		expect(result.nodes).toHaveLength(1);
		const row = result.nodes[0];
		expect(row?.id.startsWith('settings:')).toBe(true);
		expect(row?.label).toBe('Accent color');
		expect(row?.cells).toEqual([]);
		expect(row?.meta.pluginId).toBe('');
		expect(row?.meta ? settingsBridgeRefOf(row.meta) : null).toEqual({
			tab: 'theme',
			page: 'General',
			pagePath: 'General',
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
		expect(result.nodes[0]).not.toBe(row);
		expect(result.nodes[0]?.id.startsWith('settings:')).toBe(true);
	});

	it('applies no local text filter: rows stay even when their text lacks the term', () => {
		const row = pluginNode('calendar', 'Calendar');
		const byId = new Map([['calendar', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('calendar', [item('calendar', 'Week start')]),
				group('theme', [item('theme', 'Accent color')]),
			],
		});
		expect(result.nodes.map((node) => node.id)).toEqual([
			'plugin:calendar',
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
			'plugin:b-plug',
			'plugin:a-plug',
		]);
	});

	it('emits one entity when the same identity lands in two native groups', () => {
		const row = pluginNode('calendar', 'Calendar');
		const byId = new Map([['calendar', row]]);
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: [
				group('one', [item('calendar', 'Week start')]),
				group('two', [item('calendar', 'Week end')]),
			],
		});
		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0]).toBe(row);
	});

	it('dedupes a repeated settings identity instead of doubling the entity', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [
				group('one', [item('theme', 'Accent color')]),
				group('two', [item('theme', 'Accent color')]),
			],
		});
		expect(result.nodes).toHaveLength(1);
	});

	it('falls back from definition to page to tab for the row text', () => {
		const result = resolveSettingsBridgeNodes({
			pluginNodesById: new Map(),
			groups: [
				group('g', [
					item('theme', '', 'Appearance'),
					{ ...item('', '', '', 0), entry: { tab: 'core', definition: '', page: '', pagePath: '' } },
				]),
			],
		});
		expect(result.nodes.map((node) => node.label)).toEqual([
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
				group('calendar', [item('calendar', 'Week start')]),
				group('theme', [item('theme', 'Accent color')]),
			],
		});
	}

	function entityIds(rows: readonly TreeNode<PluginMeta>[]): string[] {
		const out: string[] = [];
		const walk = (list: readonly TreeNode<PluginMeta>[]): void => {
			for (const row of list) {
				if (!row.isGroupHeader) out.push(groupMemberEntityId(row.id));
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
		const settingsId = bridge.nodes[1]?.id ?? '';
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
			groups: [group('calendar', [item('calendar', 'Week start')])],
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
		expect(members).toEqual(['plugin:calendar', 'plugin:calendar']);
		const rows: string[] = [];
		const walk = (list: readonly TreeNode<PluginMeta>[]): void => {
			for (const row of list) {
				if (!row.isGroupHeader) rows.push(row.id);
				walk(row.children ?? []);
			}
		};
		walk(grouped);
		expect([...rows].sort()).toEqual(
			['plugin:calendar@g1', 'plugin:calendar@g2'].sort(),
		);
	});
});
