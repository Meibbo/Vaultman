import { describe, expect, it, vi } from 'vitest';

import {
	resolvePluginSettingsChildren,
	resolveSettingsBridgeNodes,
	canonicalPluginId,
} from '../../src/logic/logicAddonExplorer';
import {
	queryNativeSettingsSearch,
	listPluginSettingPages,
} from '../../src/services/serviceSettingSearchAdapter';
import * as settingSearchAdapter from '../../src/services/serviceSettingSearchAdapter';
import {
	settingsBridgeGroupRowId,
	settingsBridgeRefOf,
	settingsBridgeRowId,
} from '../../src/types/typeSettingsSearch';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';
import type { NativeSettingsSearchGroup } from '../../src/types/typeSettingsSearch';

/**
 * U130 parity MECH — fixtures RECORDED live (Obsidian Help 1.13.7):
 *
 * - `pluginTabs`: ARRAY de `{id}` (16 habilitados): switcher, backlink,
 *   canvas, page-preview, daily-notes, templates, note-composer,
 *   command-palette, file-recovery, advanced-debug-mode, style-manager,
 *   vaultman-prototype, vconsole, developer-toolbox, vaultman,
 *   obsidian42-brat.
 * - `search("storage")` → UN grupo
 *   `{tab developer-toolbox, page null, pagePath null, 1 resultado
 *   "Storage folder"}`.
 * - `search("developer-toolbox")` → `[]`.
 * - `search("a")` filtrado → UN grupo
 *   `{tab developer-toolbox, page null, 9 resultados ("Enabled", …)}`.
 * - `search("vaultman")` → 8 grupos incl. `{tab community-plugins,
 *   3 resultados}`, `{tab vaultman, page null, 4 resultados}`,
 *   `{tab vaultman, page X}` pages.
 *
 * Formato raw grabado: `{tab:{id,name}|string,
 * page:{name,type}|string|null, pagePath, tabNameMatch:{matches:[]},
 * results:[{entry:{tab,definition:{name},page,pagePath},
 * nameMatch:{matches:[]},descMatch:{matches:[]},score}], bestScore}`.
 * Todo lo raw pasa por el adapter REAL (`queryNativeSettingsSearch`).
 */

const PLUGIN_TAB_IDS = [
	'switcher',
	'backlink',
	'canvas',
	'page-preview',
	'daily-notes',
	'templates',
	'note-composer',
	'command-palette',
	'file-recovery',
	'advanced-debug-mode',
	'style-manager',
	'vaultman-prototype',
	'vconsole',
	'developer-toolbox',
	'vaultman',
	'obsidian42-brat',
];

const TAB_NAMES: Record<string, string> = {
	'developer-toolbox': 'Developer Toolbox',
	vaultman: 'Vaultman',
};

/** Grupo raw con shape grabada (page puede ser null). */
function rawGroup(
	tabId: string,
	page: string | null,
	defs: string[],
) {
	const tabName = TAB_NAMES[tabId] ?? tabId;
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
			nameMatch: { matches: [] as unknown[] },
			descMatch: { matches: [] as unknown[] },
			score: 1,
		})),
		bestScore: 1,
	};
}

const DT_DEFS_9 = [
	'Enabled',
	'Storage folder',
	'Developer setting 3',
	'Developer setting 4',
	'Developer setting 5',
	'Developer setting 6',
	'Developer setting 7',
	'Developer setting 8',
	'Developer setting 9',
];

/** App mock con shapes grabadas + pluginTabs ARRAY (forma live 1.13.7). */
function mechApp(): unknown {
	const storage = rawGroup('developer-toolbox', null, ['Storage folder']);
	const dtBroad = rawGroup('developer-toolbox', null, DT_DEFS_9);
	return {
		setting: {
			pluginTabs: PLUGIN_TAB_IDS.map((id) => ({ id })),
			searchIndex: {
				search: (q: string) => {
					if (q === 'storage') return [storage];
					if (q === 'developer-toolbox') return [];
					if (q === 'a') return [dtBroad];
					return [];
				},
			},
		},
	};
}

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

/** Verdadero espejo: tab===pluginId sin page, path NI definición, y que
 *  NO sea el nodo tab de nivel 1 (el `#tab` con hijos es legítimo: §3
 *  exige plugin → tab → pages siempre). */
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

describe('U130 parity MECH §1: self-tab interception en búsqueda', () => {
	it('grupo self-tab → padre plugin legacy CON celdas + hijos debajo', () => {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set(
			'developer-toolbox',
			pluginNode('developer-toolbox', 'Developer Toolbox', {}, true),
		);
		const groups = queryNativeSettingsSearch(mechApp(), 'storage');
		expect(groups).toHaveLength(1);
		expect(groups[0]?.tab).toBe('developer-toolbox');
		expect(groups[0]?.page).toBe('');

		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		// UN solo padre: el plugin legacy (misma identidad, con toggle).
		expect(bridge.nodes).toHaveLength(1);
		const parent = bridge.nodes[0];
		expect(parent?.id).toBe('plugin:developer-toolbox');
		expect(parent?.label).toBe('Developer Toolbox');
		expect(parent?.cells?.some((c) => c.kind === 'toggle')).toBe(true);
		expect(parent?.showCaret).toBe(true);
		// Sin fila nativa de grupo para este tab.
		expect(
			bridge.nodes.some((n) => n.id === 'settings:developer-toolbox::::'),
		).toBe(false);
		// Hijo definition debajo con identidad real.
		const kids = parent?.children ?? [];
		expect(kids).toHaveLength(1);
		expect(kids[0]?.label).toBe('Storage folder');
		expect(kids[0]?.id).toBe(
			'settings:developer-toolbox::::Storage folder',
		);
		expect(kids[0]?.cells).toEqual([]);
	});

	it('tab desconocido/obsoleto se absorbe en Global settings (fila nativa preservada)', () => {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set('vaultman', pluginNode('vaultman', 'Vaultman', {}, true));
		const raw = {
			tab: { id: 'obsolete-tab', name: 'Obsolete Tab' },
			page: { name: 'Some page' },
			pagePath: 'Some page',
			tabNameMatch: { matches: [] as unknown[] },
			results: [
				{
					entry: {
						tab: { id: 'obsolete-tab', name: 'Obsolete Tab' },
						definition: { name: 'Something' },
						page: { name: 'Some page' },
						pagePath: 'Some page',
					},
					nameMatch: { matches: [] as unknown[] },
					descMatch: { matches: [] as unknown[] },
					score: 1,
				},
			],
			bestScore: 1,
		};
		const app = {
			setting: { searchIndex: { search: () => [raw] } },
		};
		const groups = queryNativeSettingsSearch(app, 'q');
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		expect(bridge.nodes).toHaveLength(1);
		expect(bridge.nodes[0]?.id).toBe('group:global-settings');
		// La fila de definición se preserva como hija (label por cadena
		// definition → page → tab; el tab nativo persiste en el ref,
		// sin fila duplicada).
		const gkids = bridge.nodes[0]?.children ?? [];
		expect(gkids).toHaveLength(1);
		expect(gkids[0]?.label).toBe('Something');
		expect(gkids[0]?.cells).toEqual([]);
	});

	it('grupos repetidos del mismo self-tab fusionan hijos en un padre', () => {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set('vaultman', pluginNode('vaultman', 'Vaultman', {}, true));
		const app = {
			setting: {
				pluginTabs: PLUGIN_TAB_IDS.map((id) => ({ id })),
				searchIndex: {
					search: () => [
						rawGroup('vaultman', null, ['Tab def 1', 'Tab def 2']),
						rawGroup('vaultman', 'Context menus', ['Context menus']),
					],
				},
			},
		};
		const groups = queryNativeSettingsSearch(app, 'vaultman');
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		// Una sola identidad plugin aunque haya 2 grupos del mismo tab.
		expect(bridge.nodes).toHaveLength(1);
		expect(bridge.nodes[0]?.id).toBe('plugin:vaultman');
		const labels = (bridge.nodes[0]?.children ?? []).map((c) => c.label);
		expect(labels).toContain('Tab def 1');
		expect(labels).toContain('Context menus');
	});
});

describe('U130 parity MECH §2: hijos por definición (page-less)', () => {
	it('búsqueda: page-less emite hijos definition, cero espejos', () => {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set(
			'developer-toolbox',
			pluginNode('developer-toolbox', 'Developer Toolbox', {}, true),
		);
		// `search("a")` filtrado: 1 grupo page-null con 9 resultados.
		const groups = queryNativeSettingsSearch(mechApp(), 'a');
		expect(groups).toHaveLength(1);
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		expect(bridge.nodes).toHaveLength(1);
		const parent = bridge.nodes[0];
		expect(parent?.id).toBe('plugin:developer-toolbox');
		const kids = parent?.children ?? [];
		expect(kids).toHaveLength(9);
		const labels = kids.map((k) => k.label);
		expect(labels).toContain('Storage folder');
		expect(labels).toContain('Enabled');
		for (const k of kids) {
			expect(k.label.trim()).not.toBe('');
			expect(k.cells).toEqual([]);
			expect(isTrueMirror(k, 'developer-toolbox')).toBe(false);
		}
		// Cero espejos en todo el árbol emitido.
		for (const n of collectAll(bridge.nodes)) {
			expect(isTrueMirror(n, 'developer-toolbox')).toBe(false);
		}
	});

	it('término vacío: developer-toolbox single homónimo → pages directas, sin fila #tab (canónica, sin duplicado)', () => {
		const app = mechApp();
		const base = pluginNode('developer-toolbox', 'Developer Toolbox');
		const result = resolvePluginSettingsChildren(
			app,
			'developer-toolbox',
			base,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(true);
		// Canónica 2026-09-25: el tab homónimo NO se emite como fila (ni
		// espejo, ni tab homónimo con label del plugin); las 9
		// definiciones cuelgan directas del plugin.
		const kids = result[0]?.children ?? [];
		expect(kids.some((k) => k.id.endsWith('#tab'))).toBe(false);
		expect(kids).toHaveLength(9);
		for (const k of kids) {
			expect(k.id).not.toMatch(/#tab$/);
			expect(k.depth).toBe(base.depth + 1);
			// El tab persiste como identidad en el ref.
			expect(settingsBridgeRefOf(k.meta)?.tab).toBe('developer-toolbox');
		}
		const labels = kids.map((k) => k.label);
		expect(labels).toContain('Storage folder');
		expect(labels).toContain('Enabled');
		for (const k of kids) {
			expect(k.label.trim()).not.toBe('');
			expect(isTrueMirror(k, 'developer-toolbox')).toBe(false);
		}
		for (const n of collectAll(result)) {
			expect(isTrueMirror(n, 'developer-toolbox')).toBe(false);
		}
	});
});

describe('U130 parity MECH §3: vaultman un tab + N pages, sin espejos', () => {
	const VAULTMAN_PAGES = [
		'',
		'Files tooltip',
		'Saved compositions',
		'Widget: Floating Index',
		'Developer tools',
		'Tags node menu',
		'Panel: Explorer',
		'Chrome hover',
		'Operation Sets',
		'Context menus',
		'Widget: Toolbar',
		'Filter templates',
		'View menu defaults',
		'Sort menu defaults',
		'Scene menu defaults',
		'Node-note prefixes',
		'Native click actions',
		'Text node menu',
		'Snippets node menu',
		'Plugins node menu',
		'Files node menu',
		'Properties node menu',
	];
	const VAULTMAN_TAB_DEFS = [
		'Add-ons',
		'Operation scope',
		'Search selection in the Text explorer',
		'Workspace Configs',
		'Performance monitor',
	];

	function vaultmanApp(): unknown {
		const narrowPages = ['', 'Context menus', 'Developer tools', 'Widget: Toolbar'];
		const narrow = narrowPages.map((p) =>
			rawGroup('vaultman', p === '' ? null : p, p === '' ? VAULTMAN_TAB_DEFS : [p]),
		);
		const broad = VAULTMAN_PAGES.map((p) =>
			rawGroup(
				'vaultman',
				p === '' ? null : p,
				p === '' ? VAULTMAN_TAB_DEFS : [`${p} def 1`, `${p} def 2`],
			),
		);
		return {
			setting: {
				pluginTabs: PLUGIN_TAB_IDS.map((id) => ({ id })),
				searchIndex: {
					search: (q: string) => (q === 'a' ? broad : narrow),
				},
			},
		};
	}

	it('un tab homónimo → pages + definitions directas, cero espejos (canónica: sin fila duplicada)', () => {
		const app = vaultmanApp();
		const base = pluginNode('vaultman', 'Vaultman');
		const result = resolvePluginSettingsChildren(app, 'vaultman', base);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(true);
		// Canónica 2026-09-25: el tab homónimo no se emite; pages (21) +
		// definitions tab-level (5) cuelgan directas del plugin.
		const kids = result[0]?.children ?? [];
		expect(kids.some((k) => k.id.endsWith('#tab'))).toBe(false);
		for (const k of kids) expect(k.depth).toBe(base.depth + 1);
		const pages = kids.filter((k) => k.id.endsWith('#page'));
		// Todas las pages live (21 sin la vacía) presentes.
		expect(pages.length).toBeGreaterThanOrEqual(21);
		const pageLabels = pages.map((p) => p.label);
		expect(pageLabels).toContain('Context menus');
		expect(pageLabels).toContain('Files tooltip');
		// §2: las definiciones tab-level también están (tras las pages).
		const defLabels = kids
			.filter((k) => !k.id.endsWith('#page'))
			.map((k) => k.label);
		expect(defLabels).toContain('Add-ons');
		// Cero espejos: ningún hijo con label del plugin sin contenido, y
		// ninguna fila verdaderamente idéntica (sin definición).
		for (const k of kids) {
			expect(k.label.trim()).not.toBe('');
			expect(isTrueMirror(k, 'vaultman')).toBe(false);
		}
		for (const n of collectAll(result)) {
			expect(isTrueMirror(n, 'vaultman')).toBe(false);
		}
		const ids = collectAll(result).map((n) => n.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('U130 canónica: nivelación plugin → tab → page, homónimos hoisteados (revisión F8)', () => {
	function navVaultmanApp(): unknown {
		const pages = ['', 'Context menus', 'Developer tools'];
		const groups = pages.map((p) =>
			rawGroup('vaultman', p === '' ? null : p, p === '' ? ['Add-ons'] : [p]),
		);
		return {
			setting: {
				pluginTabs: PLUGIN_TAB_IDS.map((id) => ({ id })),
				searchIndex: { search: () => groups },
			},
		};
	}

	function distinctSingleApp(): unknown {
		const raw = {
			tab: { id: 'myplug', name: 'My Plug Settings' },
			page: { name: 'General' },
			pagePath: 'General',
			tabNameMatch: { matches: [] as unknown[] },
			results: [
				{
					entry: {
						tab: { id: 'myplug', name: 'My Plug Settings' },
						definition: { name: 'General def 1' },
						page: { name: 'General' },
						pagePath: 'General',
					},
					nameMatch: { matches: [] as unknown[] },
					descMatch: { matches: [] as unknown[] },
					score: 1,
				},
			],
			bestScore: 1,
		};
		return {
			setting: {
				pluginTabs: [{ id: 'myplug' }],
				searchIndex: { search: () => [raw] },
			},
		};
	}

	it('single distinct tab → tab level kept (no collapse)', () => {
		const app = distinctSingleApp();
		const base = pluginNode('myplug', 'My Plug');
		const result = resolvePluginSettingsChildren(app, 'myplug', base);
		expect(result).toHaveLength(1);
		const tabs = result[0]?.children ?? [];
		expect(tabs).toHaveLength(1);
		expect(tabs[0]?.id).toMatch(/#tab$/);
		expect(tabs[0]?.label).toBe('My Plug Settings');
		const kids = tabs[0]?.children ?? [];
		expect(kids.length).toBeGreaterThan(0);
		expect(kids[0]?.label).toBe('General');
	});

	it('single same-named tab hoista sus hijos (canónica: sin duplicado); ids/refs intactos, depths +1', () => {
		const app = navVaultmanApp();
		const base = pluginNode('vaultman', '  VAULTMAN  ');
		const result = resolvePluginSettingsChildren(app, 'vaultman', base);
		expect(result).toHaveLength(1);
		// Canónica: aunque el label equal al del plugin (trimmed,
		// case-insensitive), NO hay fila `#tab`: pages directas.
		const kids = result[0]?.children ?? [];
		expect(kids.length).toBeGreaterThan(0);
		expect(kids.some((k) => k.id.endsWith('#tab'))).toBe(false);
		// Ids/refs/go_to payloads intact: page id extends group id + #page,
		// depth es +1 bajo el plugin, refs carry the native triple.
		const page = kids.find((k) => k.id.endsWith('#page'));
		expect(page).toBeDefined();
		const ref = settingsBridgeRefOf(page!.meta);
		expect(ref?.tab).toBe('vaultman');
		expect(page!.depth).toBe(base.depth + 1);
		expect(page!.id).toBe(
			`${settingsBridgeGroupRowId(ref!.tab, ref!.pagePath || ref!.page)}#page`,
		);
	});

	it('two tabs: distinto sobrevive; homónimo hoista (canónica: cero duplicados)', () => {
		const groups = [
			{
				tab: 'twoplug',
				tabName: 'Two Plug',
				page: 'General',
				pagePath: 'General',
				tabNameMatch: [],
				results: [],
				bestScore: 0,
			},
			{
				tab: 'twoplug-second',
				tabName: 'Two Plug Second',
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
			const app = {
				setting: { pluginTabs: [{ id: 'twoplug' }] },
			};
			const base = pluginNode('twoplug', 'Two Plug');
			const result = resolvePluginSettingsChildren(
				app,
				'twoplug',
				base,
			);
			expect(result).toHaveLength(1);
			const kids = result[0]?.children ?? [];
			// 'Two Plug' homónimo → 'General' hoisteada directa; solo
			// 'Two Plug Second' conserva su nivel `#tab`.
			expect(kids.map((k) => k.label).sort()).toEqual([
				'General',
				'Two Plug Second',
			]);
			const hoisted = kids.find((k) => k.label === 'General');
			expect(hoisted?.id).toMatch(/#page$/);
			expect(hoisted?.depth).toBe(base.depth + 1);
			const kept = kids.find((k) => k.label === 'Two Plug Second');
			expect(kept?.id).toMatch(/#tab$/);
			expect(kept?.depth).toBe(base.depth + 1);
			expect(kept?.children?.map((c) => c.label)).toEqual(['Advanced']);
		} finally {
			spy.mockRestore();
		}
	});

	it('listPluginSettingPages real adapter still single-tab for vaultman (sanity)', () => {
		const groups = listPluginSettingPages(navVaultmanApp(), 'vaultman');
		const tabs = new Set(groups.map((g) => g.tab));
		expect(tabs.size).toBe(1);
		expect(settingsBridgeRowId).toBeDefined();
	});
});

describe('U130 parity MECH: regla community único/duplicado intacta', () => {
	function communityFixture(): {
		byId: Map<string, TreeNode<PluginMeta>>;
		groups: NativeSettingsSearchGroup[];
	} {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set('vaultman', pluginNode('vaultman', 'Vaultman', {}, true));
		byId.set('dup-a', pluginNode('dup-a', 'DupName', { name: 'DupName' }, true));
		byId.set('dup-b', pluginNode('dup-b', 'DupName', { name: 'DupName' }, true));
		const raw = {
			tab: { id: 'community-plugins', name: 'Community plugins' },
			page: null,
			pagePath: null,
			tabNameMatch: { matches: [] as unknown[] },
			results: ['Vaultman', 'DupName', 'Unknown Setting XYZ'].map((def) => ({
				entry: {
					tab: { id: 'community-plugins', name: 'Community plugins' },
					definition: { name: def },
					page: null,
					pagePath: null,
				},
				nameMatch: { matches: [[0, 1]] as unknown },
				descMatch: { matches: [] as unknown[] },
				score: 1,
			})),
			bestScore: 1,
		};
		const app = {
			setting: { searchIndex: { search: () => [raw] } },
		};
		const groups = queryNativeSettingsSearch(app, 'vaultman');
		return { byId, groups };
	}

	it('nombre único → node_plugin con cells; duplicado → settings', () => {
		const { byId, groups } = communityFixture();
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups,
		});
		expect(bridge.nodes).toHaveLength(1);
		const parent = bridge.nodes[0];
		expect(parent?.id).toBe('group:community-plugins');
		const kids = parent?.children ?? [];
		const vaultKid = kids.find((k) => k.id === 'plugin:vaultman');
		expect(vaultKid).toBeDefined();
		expect(vaultKid?.cells?.length).toBeGreaterThan(0);
		expect(vaultKid?.meta.pluginId).toBe('vaultman');
		const dupKids = kids.filter((k) => k.label === 'DupName');
		expect(dupKids).toHaveLength(1);
		expect(dupKids[0]?.cells).toEqual([]);
		expect(dupKids[0]?.meta.pluginId).toBe('');
		const unknown = kids.find((k) => k.label === 'Unknown Setting XYZ');
		expect(unknown).toBeDefined();
		expect(unknown?.cells).toEqual([]);
	});
});

describe('U130 F9: contenedor page:\'\' nunca se emite (ningún tab)', () => {
	it('grupo page-less de tab ajeno: sin page contenedor, defs como hijas directas del tab', () => {
		const groups = [
			{
				tab: 'myplug-second',
				tabName: 'Second Tab',
				page: '',
				pagePath: '',
				tabNameMatch: [],
				results: [
					{
						entry: {
							tab: 'myplug-second',
							definition: 'Loose def',
							page: '',
							pagePath: '',
						},
						nameMatch: [],
						descMatch: [],
						score: 1,
					},
				],
				bestScore: 0,
			},
			{
				tab: 'myplug',
				tabName: 'My Plug',
				page: 'General',
				pagePath: 'General',
				tabNameMatch: [],
				results: [
					{
						entry: {
							tab: 'myplug',
							definition: 'General def',
							page: 'General',
							pagePath: 'General',
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
			const app = {
				setting: { pluginTabs: [{ id: 'myplug' }] },
			};
			const base = pluginNode('myplug', 'My Plug');
			const result = resolvePluginSettingsChildren(
				app,
				'myplug',
				base,
			);
			expect(result).toHaveLength(1);
			const kids = result[0]?.children ?? [];
			// Tab ajeno page-less ('Second Tab', distinto): conserva su
			// nivel con la definición cosechada; tab homónimo ('My Plug'):
			// 'General' hoisteada directa (canónica: cero duplicados).
			expect(kids.map((k) => k.label).sort()).toEqual([
				'General',
				'Second Tab',
			]);
			// Tab ajeno page-less: SIN page contenedor; la definición
			// cosechada como hija directa del tab con settingsBridgeRowId.
			const foreign = kids.find((t) => t.label === 'Second Tab');
			expect(foreign).toBeDefined();
			expect(foreign?.id).toMatch(/#tab$/);
			const fkids = foreign?.children ?? [];
			expect(fkids).toHaveLength(1);
			expect(fkids[0]?.label).toBe('Loose def');
			expect(fkids[0]?.id).toBe(
				settingsBridgeRowId({
					tab: 'myplug-second',
					page: '',
					pagePath: '',
					definition: 'Loose def',
				}),
			);
			expect(fkids[0]?.depth).toBe(base.depth + 2);
			const hoisted = kids.find((k) => k.label === 'General');
			expect(hoisted?.depth).toBe(base.depth + 1);
			expect(hoisted?.id).toMatch(/#page$/);
			// Ninguna fila idéntica vacía en todo el árbol emitido.
			for (const n of collectAll(result)) {
				expect(isTrueMirror(n, 'myplug')).toBe(false);
			}
		} finally {
			spy.mockRestore();
		}
	});
});

describe('U130 F10 REVOCADA 2026-09-25: id canónico + core se proyecta diferenciado', () => {
	it('canonicalPluginId: trim + lowercase + runs espacio/_ → -', () => {
		expect(canonicalPluginId('Hot Reload')).toBe('hot-reload');
		expect(canonicalPluginId('  Calendar ')).toBe('calendar');
		expect(canonicalPluginId('Developer Toolbox')).toBe(
			'developer-toolbox',
		);
		expect(canonicalPluginId('advanced_debug  mode')).toBe(
			'advanced-debug-mode',
		);
	});

	it('core con contenido nativo proyecta tab → page (no queda hoja)', () => {
		const raw = rawGroup('bookmarks', 'Toolbar', ['Toolbar button']);
		const app = {
			setting: {
				pluginTabs: [{ id: 'bookmarks', name: 'Bookmarks' }],
				searchIndex: {
					search: (q: string) => (q === 'bookmarks' ? [raw] : []),
				},
			},
		};
		const base = pluginNode('bookmarks', 'Bookmarks');
		const result = resolvePluginSettingsChildren(app, 'bookmarks', base);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(true);
		const kids = result[0]?.children ?? [];
		// Tab homónimo hoisteado (canónica): page directa, sin duplicado.
		expect(kids.map((k) => k.label)).toEqual(['Toolbar']);
		expect(kids[0]?.depth).toBe(base.depth + 1);
		for (const n of collectAll(result)) {
			if (n.id === 'plugin:bookmarks') continue;
			expect(isTrueMirror(n, 'bookmarks')).toBe(false);
		}
	});

	it('id sin contenido nativo queda hoja (F4, no por ser core)', () => {
		const app = mechApp(); // 16 ids community, ningún dato para `editor`
		const base = pluginNode('editor', 'Editor');
		const result = resolvePluginSettingsChildren(app, 'editor', base);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(false);
		expect(result[0]?.children).toEqual([]);
	});
});
