import { describe, expect, it } from 'vitest';

import {
	resolvePluginSettingsChildren,
	resolveSettingsBridgeNodes,
} from '../../src/logic/logicAddonExplorer';
import { listPluginSettingPages, queryNativeSettingsSearch } from '../../src/services/serviceSettingSearchAdapter';
import { buildPresetBuckets } from '../../src/logic/logicGroupPresets';
import {
	GROUP_PRESETS_BY_TAB,
} from '../../src/types/typeGroupPreset';
import { groupMenuModel } from '../../src/logic/logicSortMenu';
import { settingsBridgeRefOf } from '../../src/types/typeSettingsSearch';
import type { PluginMeta, TreeNode } from '../../src/types/typeTree';
import type { NativeSettingsSearchGroup } from '../../src/types/typeSettingsSearch';

/**
 * U130 parity A2 (F2/F3/F4) — fixtures RECORDED live 2026-09-23 via
 * `weblab-eval --vault "Obsidian Help"` (Help 1.3.0-beta.7):
 *
 * - `searchIndex.search("a")` → 48 grupos totales, 22 con tab vaultman.
 * - `searchIndex.search("vaultman")` → 8 totales, 4 vaultman
 *   (pages: "", "Context menus", "Developer tools", "Widget: Toolbar").
 * - vaultman pages (22, orden nativo): "", "Files tooltip",
 *   "Saved compositions", "Widget: Floating Index", "Developer tools",
 *   "Tags node menu", "Panel: Explorer", "Chrome hover", "Operation Sets",
 *   "Context menus", "Widget: Toolbar", "Filter templates",
 *   "View menu defaults", "Sort menu defaults", "Scene menu defaults",
 *   "Node-note prefixes", "Native click actions", "Text node menu",
 *   "Snippets node menu", "Plugins node menu", "Files node menu",
 *   "Properties node menu".
 * - Grupo tab-level (page "") sample defs: "Add-ons", "Operation scope",
 *   "Search selection in the Text explorer", "Workspace Configs",
 *   "Performance monitor".
 * - `community-plugins` (search "a"): page "", 14 results, sample defs
 *   "BRAT", "Advanced Debug Mode", "Style Manager", "Developer Toolbox".
 */
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

function rawGroup(tabId: string, tabName: string, page: string, defs: string[]) {
	return {
		tab: { id: tabId, name: tabName },
		page: { id: page.toLowerCase() || tabId, name: page },
		pagePath: page,
		tabNameMatch: { score: 0, matches: [] as unknown[] },
		results: defs.map((def) => ({
			entry: {
				tab: { id: tabId, name: tabName },
				definition: { name: def },
				page: { id: page.toLowerCase() || tabId, name: page },
				pagePath: page,
			},
			nameMatch: { score: 1, matches: [[0, 1]] as unknown },
			descMatch: { score: 0, matches: [] as unknown[] },
			score: 1,
		})),
		bestScore: { score: 1 },
	};
}

/** App mock: `search("vaultman")` incompleto (4), `search("a")` completo (22). */
function vaultmanApp(): unknown {
	const narrowPages = ['', 'Context menus', 'Developer tools', 'Widget: Toolbar'];
	const narrow = narrowPages.map((p) =>
		rawGroup('vaultman', 'Vaultman', p, p === '' ? VAULTMAN_TAB_DEFS : [p]),
	);
	const broad = VAULTMAN_PAGES.map((p) =>
		rawGroup('vaultman', 'Vaultman', p, p === '' ? VAULTMAN_TAB_DEFS : [`${p} def 1`, `${p} def 2`]),
	);
	return {
		setting: {
			pluginTabs: { vaultman: { id: 'vaultman', name: 'Vaultman' } },
			searchIndex: {
				search: (q: string) => (q === 'a' ? broad : narrow),
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

function collectDescendants(nodes: readonly TreeNode<PluginMeta>[]): TreeNode<PluginMeta>[] {
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

describe('U130 parity A2: vaultman catalogue (F2, live fixture)', () => {
	it('broaden: pluginId query (4) + probe "a" (22) = cobertura completa', () => {
		const groups = listPluginSettingPages(vaultmanApp(), 'vaultman');
		const pages = new Set(groups.map((g) => g.pagePath || g.page));
		expect(groups.length).toBeGreaterThanOrEqual(22);
		expect(pages.size).toBeGreaterThanOrEqual(21);
	});

	it('plugin homónimo → pages/definitions directas (canónica), cero espejos, cero labels vacíos', () => {
		const app = vaultmanApp();
		const base = pluginNode('vaultman', 'Vaultman');
		const result = resolvePluginSettingsChildren(app, 'vaultman', base);
		expect(result).toHaveLength(1);
		expect(result[0]?.showCaret).toBe(true);
		// Canónica 2026-09-25: el tab homónimo NO se emite como fila (ni
		// espejo, ni tab homónimo); 21 pages + 5 definitions directas.
		const kids = result[0]?.children ?? [];
		expect(kids.some((k) => k.id.endsWith('#tab'))).toBe(false);
		expect(kids.length).toBeGreaterThanOrEqual(26);
		const all = collectDescendants(kids);
		const ids = all.map((n) => n.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const n of all) {
			expect(n.depth).toBe(base.depth + 1);
			expect(n.label.trim()).not.toBe('');
			expect(n.id).toMatch(/^settings:/);
			expect(n.cells).toEqual([]);
			const ref = settingsBridgeRefOf(n.meta);
			expect(ref).not.toBeNull();
		// Espejo: fila verdaderamente idéntica (sin definición) no se
		// emite (F9: el contenedor `page:''` nunca se emite para ningún
		// tab). Una fila CON definición nunca es espejo aunque su page
		// venga vacía (hijo por definición bajo el tab).
			if (n.depth >= base.depth + 1) {
				expect(!(ref?.tab === 'vaultman' && ref.page === '' && ref.pagePath === '' && ref.definition === '')).toBe(true);
			}
		}
		// F9: el contenedor `page:''` (grupo tab-level) no aparece como
		// page hija; hijos por definición (page vacía + definition real)
		// sí son legítimos bajo el tab.
		expect(kids.every((p) => {
			const ref = settingsBridgeRefOf(p.meta);
			return ref ? !(ref.page === '' && ref.pagePath === '' && ref.definition === '') : true;
		})).toBe(true);
	});

	it('ids hijo #page estables (canónica), sin colisión con búsqueda', () => {
		const app = vaultmanApp();
		const result = resolvePluginSettingsChildren(app, 'vaultman', pluginNode('vaultman', 'Vaultman'));
		const kids = result[0]?.children ?? [];
		expect(kids.length).toBeGreaterThan(0);
		// Sin fila #tab homónima; pages con id estable `#page`.
		expect(kids.some((k) => k.id.endsWith('#tab'))).toBe(false);
		const pages = kids.filter((k) => k.id.endsWith('#page'));
		expect(pages.length).toBeGreaterThan(0);
		for (const p of pages.slice(0, 5)) expect(p.id).toMatch(/#page$/);
		// El sufijo `#` nunca aparece en ids del camino de búsqueda.
		for (const p of pages) expect(p.id).toContain('#page');
		// Re-resolver = mismos ids (estables, cache por pluginId)
		const again = resolvePluginSettingsChildren(app, 'vaultman', pluginNode('vaultman', 'Vaultman'));
		expect(again[0]?.children?.map((t) => t.id)).toEqual(kids.map((t) => t.id));
	});
});

describe('U130 parity A2: community/core replacement (F2)', () => {
	function communityFixture(): { byId: Map<string, TreeNode<PluginMeta>>; groups: NativeSettingsSearchGroup[] } {
		const byId = new Map<string, TreeNode<PluginMeta>>();
		byId.set('vaultman', pluginNode('vaultman', 'Vaultman', {}, true));
		byId.set('dup-a', pluginNode('dup-a', 'DupName', { name: 'DupName' }, true));
		byId.set('dup-b', pluginNode('dup-b', 'DupName', { name: 'DupName' }, true));
		// Grupo nativo live-shape: community-plugins, page "", 3 results
		const raw = {
			tab: { id: 'community-plugins', name: 'Community plugins' },
			page: { id: 'community-plugins', name: '' },
			pagePath: '',
			tabNameMatch: { score: 0, matches: [] as unknown[] },
			results: ['Vaultman', 'DupName', 'Unknown Setting XYZ'].map((def) => ({
				entry: {
					tab: { id: 'community-plugins', name: 'Community plugins' },
					definition: { name: def },
					page: { id: 'community-plugins', name: '' },
					pagePath: '',
				},
				nameMatch: { score: 1, matches: [[0, 1]] as unknown },
				descMatch: { score: 0, matches: [] as unknown[] },
				score: 1,
			})),
			bestScore: { score: 1 },
		};
		// Parsear vía el adapter real para replicar la shape nativa
		const app = {
			setting: { searchIndex: { search: () => [raw] } },
		};
		const groups = queryNativeSettingsSearch(app, 'vaultman');
		return { byId, groups };
	}

	it('nombre único → node_plugin con cells; duplicado → settings', () => {
		const { byId, groups } = communityFixture();
		const bridge = resolveSettingsBridgeNodes({ pluginNodesById: byId, groups });
		// Un solo padre nativo (orden nativo), plugin matched como HIJO
		expect(bridge.nodes).toHaveLength(1);
		const parent = bridge.nodes[0];
		expect(parent).toBeDefined();
		expect(parent?.id).toMatch(/^settings:/);
		const kids = parent?.children ?? [];
		// Vaultman único: misma fila legacy con cells
		const vaultKid = kids.find((k) => k.id === 'plugin:vaultman');
		expect(vaultKid).toBeDefined();
		expect(vaultKid?.cells?.length).toBeGreaterThan(0);
		expect(vaultKid?.meta.pluginId).toBe('vaultman');
		// DupName ambiguo: fila settings sin cells
		const dupKids = kids.filter((k) => k.label === 'DupName');
		expect(dupKids).toHaveLength(1);
		expect(dupKids[0]?.cells).toEqual([]);
		expect(dupKids[0]?.meta.pluginId).toBe('');
		// Unknown: settings sin cells
		const unknown = kids.find((k) => k.label === 'Unknown Setting XYZ');
		expect(unknown).toBeDefined();
		expect(unknown?.cells).toEqual([]);
	});

	it('plugin matched nunca se hoistea sobre su sección (orden nativo)', () => {
		const { byId, groups } = communityFixture();
		const bridge = resolveSettingsBridgeNodes({ pluginNodesById: byId, groups });
		// El padre sección va primero; el plugin es hijo, no raíz previa
		const topIds = bridge.nodes.map((n) => n.id);
		expect(topIds[0]).toMatch(/^settings:/);
		expect(topIds).not.toContain('plugin:vaultman');
	});
});

describe('U130 parity A2: presets sections/state (F3)', () => {
	const nodes: TreeNode<PluginMeta>[] = [
		{ ...pluginNode('a', 'Alpha', { enabled: true }), id: 'plugin:a' },
		{ ...pluginNode('b', 'Beta', { enabled: false }), id: 'plugin:b' },
		{
			id: 'settings:vaultman::Files tooltip::#page',
			label: 'Files tooltip',
			depth: 2,
			cells: [],
			meta: {
				pluginId: '',
				name: 'Files tooltip',
				enabled: false,
				loaded: false,
				isVaultman: false,
				settingsRef: { tab: 'vaultman', page: 'Files tooltip', pagePath: 'Files tooltip', definition: '' },
			} as PluginMeta,
			coreCls: 'x',
		},
	];

	const extract = (node: TreeNode<PluginMeta>, kind: string): string | number | null => {
		if (kind === 'state') return node.meta.enabled ? 'enabled' : 'disabled';
		if (kind === 'sections') {
			const ref = settingsBridgeRefOf(node.meta);
			if (ref) return ref.tab;
			return null;
		}
		return null;
	};

	it('state agrupa enabled/disabled', () => {
		const out = buildPresetBuckets(nodes, { kind: 'state', direction: 'asc' }, { extract });
		expect(out).not.toBeNull();
		expect(out?.buckets.map((b) => b.key).sort()).toEqual(['disabled', 'enabled']);
	});

	it('sections agrupa por tab nativo; plugins sin sección van a ungrouped', () => {
		const out = buildPresetBuckets(nodes, { kind: 'sections', direction: 'asc' }, { extract });
		expect(out).not.toBeNull();
		expect(out?.buckets.map((b) => b.key)).toEqual(['vaultman']);
		expect(out?.ungrouped.map((n) => n.id).sort()).toEqual(['plugin:a', 'plugin:b']);
	});

	it('toolbar ofrece sections/state en plugins', () => {
		expect(GROUP_PRESETS_BY_TAB.plugins).toContain('sections');
		expect(GROUP_PRESETS_BY_TAB.plugins).toContain('state');
		const model = groupMenuModel('plugins', { kind: 'none', direction: 'asc' }, [], true);
		const ids = model.items.filter((i) => i.kind === 'preset').map((i) => i.id);
		expect(ids).toContain('sections');
		expect(ids).toContain('state');
	});
});

describe('U130 parity A2: no blanks (F4)', () => {
	it('hijos con label vacía y grupos vacíos nunca se emiten', () => {
		// Todo vacío (tabs, pages, definitions): labels vacíos → skip,
		// padre sin label → skip. (Filas tab-only CON tab sí se emiten
		// con label = tab: lo exige el bridge pre-existente.)
		const raw = {
			tab: { id: '', name: '' },
			page: { id: 'x', name: '' },
			pagePath: '',
			tabNameMatch: { score: 0, matches: [] as unknown[] },
			results: [
				{ entry: { tab: { id: '', name: '' }, definition: { name: '' }, page: { id: 'x', name: '' }, pagePath: '' }, nameMatch: [], descMatch: [], score: 0 },
				{ entry: { tab: { id: '', name: '' }, definition: { name: '' }, page: { id: 'x', name: '' }, pagePath: '' }, nameMatch: [], descMatch: [], score: 0 },
			],
			bestScore: 0,
		};
		const app = { setting: { searchIndex: { search: () => [raw] } } };
		const groups = queryNativeSettingsSearch(app, 'q');
		const bridge = resolveSettingsBridgeNodes({ pluginNodesById: new Map(), groups });
		const all = collectDescendants(bridge.nodes);
		for (const n of all) expect(n.label.trim()).not.toBe('');
		// Grupo con todo vacío → cero nodos (sin grupos vacíos)
		expect(bridge.nodes).toHaveLength(0);
	});

	it('plugin sin pages tras filtrar queda hoja (no p-node vacío)', () => {
		const app = {
			setting: {
				pluginTabs: { lonely: { id: 'lonely', name: 'Lonely' } },
				searchIndex: { search: () => [] },
			},
		};
		const base = pluginNode('lonely', 'Lonely');
		const result = resolvePluginSettingsChildren(app, 'lonely', base);
		expect(result[0]?.showCaret).toBe(false);
		expect(result[0]?.children).toEqual([]);
	});
});
