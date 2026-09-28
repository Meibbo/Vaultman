import { describe, expect, it, vi } from 'vitest';

import {
	buildCanonicalRestRoots,
	canonicalPluginId,
	listCorePluginStubs,
	pluginCanonicalGroup,
	resolvePluginSettingsChildren,
	resolveSettingsBridgeNodes,
} from '../../src/logic/logicAddonExplorer';
import {
	queryNativeSettingsSearch,
} from '../../src/services/serviceSettingSearchAdapter';
import * as settingSearchAdapter from '../../src/services/serviceSettingSearchAdapter';
import {
	settingsBridgeGroupRowId,
	settingsBridgeRefOf,
} from '../../src/types/typeSettingsSearch';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';
import type { NativeSettingsSearchGroup } from '../../src/types/typeSettingsSearch';

/**
 * U130 forma canónica 2026-09-25 — grupos core/community en reposo +
 * parentage nativa `plugin → tab → page`, con paridad total en búsqueda.
 *
 * - Tab = nombre nativo SIEMPRE; page = nombre nativo.
 * - NINGÚN nodo repite el nombre de su plugin padre (ni espejo vacío,
 *   ni tab homónimo): el tab homónimo existe como identidad (ref) pero
 *   no como fila; sus pages cuelgan directas del plugin.
 * - Partición core/community y resolución F10 POR ID canónico, nunca
 *   por display name.
 * - Búsqueda comparte parentage (`plugin:<id>` idénticos): solo filtra
 *   + highlights, ranking nativo intacto.
 */

function rawGroup(
	tabId: string,
	tabName: string,
	page: string | null,
	defs: string[],
	withMatch: boolean,
) {
	return {
		tab: { id: tabId, name: tabName },
		page: page === null ? null : { name: page },
		pagePath: page ?? null,
		tabNameMatch: { matches: [] as unknown[] },
		results: defs.map((def) => ({
			entry: {
				tab: { id: tabId, name: tabName },
				definition: { name: def },
				page: page === null ? null : { name: page },
				pagePath: page ?? null,
			},
			nameMatch: { matches: (withMatch ? [[0, 1]] : []) },
			descMatch: { matches: [] as unknown[] },
			score: 1,
		})),
		bestScore: 1,
	};
}

/** App mock: tabs community (vaultman, my-bookmarks) + core (bookmarks). */
function restApp(): unknown {
	const vaultmanGroups = [
		rawGroup('vaultman', 'Vaultman', 'General', ['General'], false),
		rawGroup('vaultman', 'Vaultman', 'Context menus', ['Context menus'], false),
	];
	const bookmarksGroups = [
		rawGroup('bookmarks', 'Bookmarks', 'Toolbar', ['Toolbar button'], false),
	];
	return {
		setting: {
			pluginTabs: [
				{ id: 'vaultman', name: 'Vaultman' },
				{ id: 'my-bookmarks', name: 'Bookmarks' },
				{ id: 'bookmarks', name: 'Bookmarks' },
			],
			searchIndex: {
				search: (q: string) => {
					if (q === 'vaultman') return vaultmanGroups;
					if (q === 'bookmarks') return bookmarksGroups;
					return [];
				},
			},
			internalPlugins: {
				getEnabledPluginById: (id: string) =>
					id === 'vaultman' || id === 'bookmarks' ? {} : null,
			},
		},
	};
}

const COMMUNITY_IDS = ['vaultman', 'my-bookmarks'];

function pluginNode(
	pluginId: string,
	name: string,
	overrides: Partial<PluginMeta> = {},
	withCells = false,
): TreeNode<PluginMeta> {
	return {
		id: `plugin:${pluginId}`,
		label: name,
		depth: 0,
		cells: withCells
			? [
					{ id: 'config', kind: 'action', icon: 'lucide-settings', label: 'Settings' },
					{ id: 'state', kind: 'toggle', enabled: true, style: 'native', label: 'Enabled' },
				]
			: [],
		meta: {
			pluginId,
			name,
			enabled: true,
			loaded: true,
			isVaultman: pluginId === 'vaultman',
			...overrides,
		},
		coreCls: 'tree-item-self nav-file-title tappable is-clickable',
	};
}

function collectAll(
	nodes: readonly TreeNode<PluginMeta>[],
): TreeNode<PluginMeta>[] {
	const out: TreeNode<PluginMeta>[] = [];
	const walk = (list: readonly TreeNode<PluginMeta>[]) => {
		for (const n of list) {
			out.push(n);
			if (n.children?.length) walk(n.children);
		}
	};
	walk(nodes);
	return out;
}

/** Fila verdaderamente idéntica al plugin (sin definición): el espejo prohibido. */
function isTrueMirror(n: TreeNode<PluginMeta>, pluginId: string): boolean {
	const ref = settingsBridgeRefOf(n.meta);
	return (
		ref !== null &&
		ref.tab === pluginId &&
		ref.page === '' &&
		ref.pagePath === '' &&
		ref.definition === '' &&
		!n.id.endsWith('#tab')
	);
}

function folded(label: string): string {
	return (label ?? '').trim().toLowerCase();
}

describe('U130 canónica: partición core/community por id, nunca display', () => {
	it('community por id canónico; display decoy no confunde', () => {
		expect(pluginCanonicalGroup('vaultman', COMMUNITY_IDS)).toBe('community');
		expect(pluginCanonicalGroup('my-bookmarks', COMMUNITY_IDS)).toBe('community');
		// El decoy se llama "Bookmarks" en display pero su ID es community.
		expect(pluginCanonicalGroup('bookmarks', COMMUNITY_IDS)).toBe('core');
		expect(pluginCanonicalGroup('  BOOKMARKS  ', COMMUNITY_IDS)).toBe('core');
		expect(pluginCanonicalGroup('Vaultman', COMMUNITY_IDS)).toBe('community');
		expect(canonicalPluginId('Developer Toolbox')).toBe('developer-toolbox');
	});

	it('stubs core: solo tabs no-community, nombre nativo, enabled real', () => {
		const stubs = listCorePluginStubs(restApp(), COMMUNITY_IDS);
		expect(stubs).toHaveLength(1);
		expect(stubs[0]).toEqual({
			pluginId: 'bookmarks',
			name: 'Bookmarks',
			enabled: true,
		});
	});
});

describe('U130 canónica: reposo vaultman → tab real → page real', () => {
	it('tab distinto se conserva con nombres nativos (Context menus → Toolbar menu)', () => {
		const groups = [
			{
				tab: 'vaultman',
				tabName: 'Context menus',
				page: 'Toolbar menu',
				pagePath: 'Toolbar menu',
				tabNameMatch: [],
				results: [
					{
						entry: {
							tab: 'vaultman',
							definition: 'Toolbar menu',
							page: 'Toolbar menu',
							pagePath: 'Toolbar menu',
						},
						nameMatch: [],
						descMatch: [],
						score: 1,
					},
				],
				bestScore: 0,
			},
			{
				tab: 'vaultman',
				tabName: 'Context menus',
				page: 'Files menu',
				pagePath: 'Files menu',
				tabNameMatch: [],
				results: [
					{
						entry: {
							tab: 'vaultman',
							definition: 'Files menu',
							page: 'Files menu',
							pagePath: 'Files menu',
						},
						nameMatch: [],
						descMatch: [],
						score: 1,
					},
				],
				bestScore: 0,
			},
		] as unknown as NativeSettingsSearchGroup[];
		const spy = vi
			.spyOn(settingSearchAdapter, 'listPluginSettingPages')
			.mockReturnValue(groups);
		try {
			const base = pluginNode('vaultman', 'Vaultman');
			const result = resolvePluginSettingsChildren(restApp(), 'vaultman', base);
			expect(result).toHaveLength(1);
			expect(result[0]?.showCaret).toBe(true);
			const tabs = result[0]?.children ?? [];
			expect(tabs).toHaveLength(1);
			// Tab = nombre NATIVO del tab, siempre.
			expect(tabs[0]?.label).toBe('Context menus');
			expect(tabs[0]?.id).toBe(`${settingsBridgeGroupRowId('vaultman', '')}#tab`);
			expect(tabs[0]?.depth).toBe(base.depth + 1);
			const pages = tabs[0]?.children ?? [];
			expect(pages.map((p) => p.label).sort()).toEqual([
				'Files menu',
				'Toolbar menu',
			]);
			for (const page of pages) {
				expect(page.depth).toBe(base.depth + 2);
				expect(page.id).toMatch(/#page$/);
				const ref = settingsBridgeRefOf(page.meta);
				expect(ref?.tab).toBe('vaultman');
			}
			// Ningún hijo repite el nombre del plugin padre.
			for (const n of collectAll(result)) {
				if (n.id === 'plugin:vaultman') continue;
				expect(folded(n.label)).not.toBe('vaultman');
				expect(isTrueMirror(n, 'vaultman')).toBe(false);
			}
		} finally {
			spy.mockRestore();
		}
	});

	it('single-tab homónimo (adapter real): tab conservado con pages bajo él', () => {
		const app = restApp();
		const base = pluginNode('vaultman', 'Vaultman');
		const result = resolvePluginSettingsChildren(app, 'vaultman', base);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(true);
		const tabs = result[0]?.children ?? [];
		// El tab homónimo SÍ se emite como fila (nivel 1), con pages bajo él (nivel 2).
		expect(tabs).toHaveLength(1);
		expect(tabs[0]?.id).toMatch(/#tab$/);
		expect(tabs[0]?.label).toBe('Vaultman');
		expect(tabs[0]?.depth).toBe(base.depth + 1);
		const pages = tabs[0]?.children ?? [];
		expect(pages.map((p) => p.label).sort()).toEqual([
			'Context menus',
			'General',
		]);
		for (const page of pages) {
			expect(page.depth).toBe(base.depth + 2);
			expect(page.id).toMatch(/#page$/);
			// El tab persiste como identidad en el ref.
			expect(settingsBridgeRefOf(page.meta)?.tab).toBe('vaultman');
		}
		for (const n of collectAll(result)) {
			if (n.id === 'plugin:vaultman') continue;
			if (n.id.endsWith('#tab')) continue;
			expect(folded(n.label)).not.toBe('vaultman');
			expect(isTrueMirror(n, 'vaultman')).toBe(false);
		}
	});

	it('multi-tab mixto: ambos tabs conservados con su nivel', () => {
		const groups = [
			{
				tab: 'mixplug',
				tabName: 'Mix Plug',
				page: 'General',
				pagePath: 'General',
				tabNameMatch: [],
				results: [],
				bestScore: 0,
			},
			{
				tab: 'mixplug-pro',
				tabName: 'Pro',
				page: 'Advanced',
				pagePath: 'Advanced',
				tabNameMatch: [],
				results: [],
				bestScore: 0,
			},
		] as unknown as NativeSettingsSearchGroup[];
		const spy = vi
			.spyOn(settingSearchAdapter, 'listPluginSettingPages')
			.mockReturnValue(groups);
		try {
			const base = pluginNode('mixplug', 'Mix Plug');
			const result = resolvePluginSettingsChildren(
				restApp(),
				'mixplug',
				base,
			);
			const tabs = result[0]?.children ?? [];
			// Ambos tabs se conservan: el homónimo y el distinto.
			expect(tabs).toHaveLength(2);
			const tabHomonym = tabs.find((t) => t.label === 'Mix Plug');
			expect(tabHomonym).toBeDefined();
			expect(tabHomonym?.id).toMatch(/#tab$/);
			expect(tabHomonym?.depth).toBe(base.depth + 1);
			// El tab homónimo tiene su page como hija
			expect(tabHomonym?.children?.map((c) => c.label)).toEqual(['General']);
			expect(tabHomonym?.children?.[0]?.depth).toBe(base.depth + 2);
			const tabDistinct = tabs.find((t) => t.label === 'Pro');
			expect(tabDistinct).toBeDefined();
			expect(tabDistinct?.id).toMatch(/#tab$/);
			expect(tabDistinct?.depth).toBe(base.depth + 1);
			expect(tabDistinct?.children?.map((c) => c.label)).toEqual(['Advanced']);
			expect(tabDistinct?.children?.[0]?.depth).toBe(base.depth + 2);
			for (const n of collectAll(result)) {
				if (n.id === 'plugin:mixplug') continue;
				if (n.id.endsWith('#tab')) continue;
				expect(folded(n.label)).not.toBe('mix plug');
			}
		} finally {
			spy.mockRestore();
		}
	});
});

describe('U130 canónica: roots core/community en reposo', () => {
	it('bookmarks core + vaultman community diferenciados, hojas F4 intactas', () => {
		const app = restApp();
		const pluginNodes = [
			{ ...pluginNode('vaultman', 'Vaultman'), depth: 0 },
			{ ...pluginNode('my-bookmarks', 'Bookmarks'), depth: 0 },
			{
				...pluginNode('bookmarks', 'Bookmarks', {
					enabled: true,
					loaded: false,
					isVaultman: false,
				}),
				depth: 0,
			},
		];
		const roots = buildCanonicalRestRoots({
			app,
			pluginNodes,
			communityIds: COMMUNITY_IDS,
		});
		expect(roots.map((r) => r.id)).toEqual([
			'group:core-plugins',
			'group:community-plugins',
		]);
		expect(roots.map((r) => r.label)).toEqual([
			'Core plugins',
			'Community plugins',
		]);
		for (const root of roots) {
			expect(root.depth).toBe(0);
			expect(root.showCaret).toBe(true);
		}
		const core = roots[0]?.children ?? [];
		expect(core.map((n) => n.id)).toEqual(['plugin:bookmarks']);
		expect(core[0]?.depth).toBe(1);
		// Core con datos nativos proyecta: bookmarks → Bookmarks (tab conservado).
		expect((core[0]?.children ?? []).map((c) => c.label)).toEqual(['Bookmarks']);
		expect(core[0]?.children?.[0]?.depth).toBe(2);
		const community = roots[1]?.children ?? [];
		expect(community.map((n) => n.id)).toEqual([
			'plugin:vaultman',
			'plugin:my-bookmarks',
		]);
		// Vaultman homónimo: tab conservado con pages bajo él.
		const vaultmanPlugin = community[0];
		const vaultTabs = vaultmanPlugin?.children ?? [];
		expect(vaultTabs).toHaveLength(1);
		expect(vaultTabs[0]?.label).toBe('Vaultman');
		expect(vaultTabs[0]?.id).toMatch(/#tab$/);
		const vaultPages = vaultTabs[0]?.children ?? [];
		expect(vaultPages.map((k) => k.label).sort()).toEqual([
			'Context menus',
			'General',
		]);
		// Decoy sin datos nativos: hoja F4, pero en community por id.
		expect(community[1]?.showCaret).toBe(false);
		expect(community[1]?.children).toEqual([]);
		// Ids únicos en todo el árbol.
		const ids = collectAll(roots).map((n) => n.id);
		expect(new Set(ids).size).toBe(ids.length);
		// Ningún descendiente repite el label de su plugin padre (excepto el tab homónimo).
		for (const root of roots) {
			for (const plugin of root.children ?? []) {
				const parentName = folded(plugin.meta.name ?? plugin.label);
				for (const n of collectAll(plugin.children ?? [])) {
					if (n.id.endsWith('#tab')) continue;
					expect(folded(n.label)).not.toBe(parentName);
				}
			}
		}
	});

	it('grupos vacíos no se emiten (F4)', () => {
		const roots = buildCanonicalRestRoots({
			app: restApp(),
			pluginNodes: [{ ...pluginNode('vaultman', 'Vaultman'), depth: 0 }],
			communityIds: COMMUNITY_IDS,
		});
		expect(roots.map((r) => r.id)).toEqual(['group:community-plugins']);
	});

	it('core con datos proyecta; id sin datos queda hoja', () => {
		const app = restApp();
		const core = resolvePluginSettingsChildren(
			app,
			'bookmarks',
			pluginNode('bookmarks', 'Bookmarks'),
		);
		expect(core[0]?.showCaret).toBe(true);
		expect((core[0]?.children ?? []).map((c) => c.label)).toEqual(['Bookmarks']);
		const ghost = resolvePluginSettingsChildren(
			app,
			'ghost',
			pluginNode('ghost', 'Ghost'),
		);
		expect(ghost[0]?.showCaret).toBe(false);
		expect(ghost[0]?.children).toEqual([]);
	});
});

describe('U130 canónica: paridad reposo/búsqueda (misma parentage)', () => {
	it('mismo padre plugin:<id>; búsqueda filtra + highlights con ranking nativo', () => {
		const rawHotkeys = {
			tab: { id: 'hotkeys', name: 'Hotkeys' },
			page: { name: 'Keys' },
			pagePath: 'Keys',
			tabNameMatch: { matches: [] as unknown[] },
			results: [
				{
					entry: {
						tab: { id: 'hotkeys', name: 'Hotkeys' },
						definition: { name: 'Shortcuts' },
						page: { name: 'Keys' },
						pagePath: 'Keys',
					},
					nameMatch: { matches: [] as unknown[] },
					descMatch: { matches: [] as unknown[] },
					score: 0,
				},
			],
			bestScore: 0,
		};
		const rawVault = rawGroup(
			'vaultman',
			'Vaultman',
			'Context menus',
			['Toolbar menu'],
			true,
		);
		const searchApp = {
			setting: {
				pluginTabs: [{ id: 'vaultman', name: 'Vaultman' }],
				searchIndex: { search: () => [rawHotkeys, rawVault] },
			},
		};
		const groups = queryNativeSettingsSearch(searchApp, 'toolbar');
		expect(groups.map((g) => g.tab)).toEqual(['hotkeys', 'vaultman']);

		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set('vaultman', pluginNode('vaultman', 'Vaultman', {}, true));
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		// Ranking nativo intacto: el grupo hotkeys va primero.
		expect(bridge.nodes[0]?.id).toMatch(/^settings:hotkeys/);
		const parent = bridge.nodes.find((n) => n.id === 'plugin:vaultman');
		expect(parent).toBeDefined();
		expect(parent?.cells?.some((c) => c.kind === 'toggle')).toBe(true);
		// En búsqueda, la jerarquía SIEMPRE es plugin → tab → page.
		// El plugin tiene un hijo tab, y el tab tiene las pages.
		const pluginTabs = parent?.children ?? [];
		expect(pluginTabs).toHaveLength(1);
		const tabNode = pluginTabs[0];
		expect(tabNode.id).toMatch(/#tab$/);
		const searchKids = tabNode.children ?? [];
		expect(searchKids.map((k) => k.label)).toEqual(['Toolbar menu']);
		// Misma parentage: el hijo de búsqueda lleva el tab de reposo.
		expect(settingsBridgeRefOf(searchKids[0].meta)?.tab).toBe('vaultman');
		// Solo filtra + highlights: match real → highlight.
		expect(bridge.highlightIds.has(searchKids[0].id ?? '')).toBe(true);

		// Reposo con el mismo contenido nativo: MISMO padre plugin:<id>.
		const restGroups = [
			{
				tab: 'vaultman',
				tabName: 'Context menus',
				page: 'Toolbar menu',
				pagePath: 'Toolbar menu',
				tabNameMatch: [],
				results: [
					{
						entry: {
							tab: 'vaultman',
							definition: 'Toolbar menu',
							page: 'Toolbar menu',
							pagePath: 'Toolbar menu',
						},
						nameMatch: [],
						descMatch: [],
						score: 1,
					},
				],
				bestScore: 0,
			},
		] as unknown as NativeSettingsSearchGroup[];
		const spy = vi
			.spyOn(settingSearchAdapter, 'listPluginSettingPages')
			.mockReturnValue(restGroups);
		try {
			const rest = resolvePluginSettingsChildren(
				searchApp,
				'vaultman',
				pluginNode('vaultman', 'Vaultman'),
			);
			expect(rest[0]?.id).toBe(parent?.id);
			const restTabs = rest[0]?.children ?? [];
			expect(restTabs).toHaveLength(1);
			const restTab = restTabs[0];
			expect(restTab?.label).toBe('Context menus');
			// El tab de reposo y el ref del hijo de búsqueda comparten tab.
			const restPage = restTab?.children?.[0];
			expect(restPage).toBeDefined();
			expect(settingsBridgeRefOf(restPage!.meta)?.tab).toBe(
				settingsBridgeRefOf(searchKids[0].meta)?.tab,
			);
		} finally {
			spy.mockRestore();
		}
	});
});
