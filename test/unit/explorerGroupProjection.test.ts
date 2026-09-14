import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import { isGroupHeader, NO_GROUP_ID, PRESET_GROUP_PREFIX } from '../../src/logic/logicTreeGroupProjection';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerTabId, ExplorerSortState } from '../../src/types/typeUI';
import type { GroupPreset } from '../../src/types/typeGroupPreset';
import type { FileMeta, PluginMeta, PropMeta, SnippetMeta, TagMeta, TreeNode } from '../../src/types/typeTree';

type SavedLayoutStub = {
	name: string;
	summary: string;
	config: Record<string, unknown>;
	groupMemberships?: Record<string, readonly string[]>;
};

type PluginStub = {
	settings: {
		savedLayouts?: SavedLayoutStub[];
		activeLayoutName?: string | null;
	};
};

/**
 * Spec 08 §3.1.bis: el interruptor es el group preset seleccionado (`none` =
 * apagado), NUNCA el scope de orden. El scope `groups` que L-CABLE usaba como
 * interruptor sigue siendo un scope valido hasta el paso 6, pero ya no
 * enciende nada: estos tests lo dejan puesto a proposito para probarlo.
 */
function sortStateWithScope(tab: ExplorerTabId, activeScope: 'all' | 'groups'): ExplorerSortState {
	return normalizeExplorerSortState(tab, {
		sorts: {},
		activeScope,
		nodeTypeFilter: null,
	});
}

const PRESET_OFF: GroupPreset = { kind: 'none', direction: 'asc' };
const PRESET_CUSTOM: GroupPreset = { kind: 'custom', direction: 'asc' };
const PRESET_LETTER: GroupPreset = { kind: 'letter', direction: 'asc' };

type SnippetsHarness = {
	_groupIds: Set<string>;
	_expandedGroupIds: Set<string>;
	pendingToggleIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	activeLayoutName: string | null;
	plugin: PluginStub;
	nodes: TreeNode<SnippetMeta>[];
	projectedNodes: () => TreeNode<SnippetMeta>[];
};

type PluginsHarness = {
	_groupIds: Set<string>;
	_expandedGroupIds: Set<string>;
	pendingToggleIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	activeLayoutName: string | null;
	plugin: PluginStub;
	nodes: TreeNode<PluginMeta>[];
	projectedNodes: () => TreeNode<PluginMeta>[];
};

type TagsHarness = {
	_groupIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	activeLayoutName: string | null;
	plugin: PluginStub;
	projectedNodes: (nodes: TreeNode<TagMeta>[]) => TreeNode<TagMeta>[];
};

type PropsHarness = {
	_groupIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	activeLayoutName: string | null;
	plugin: PluginStub;
	projectedNodes: (nodes: TreeNode<PropMeta>[]) => TreeNode<PropMeta>[];
};

type FilesHarness = {
	_groupIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	activeLayoutName: string | null;
	plugin: PluginStub;
	projectedNodes: (nodes: TreeNode<FileMeta>[]) => TreeNode<FileMeta>[];
};

function createSnippetsHarness(): SnippetsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, SnippetsExplorerPanel.prototype);
	return base as unknown as SnippetsHarness;
}
function createPluginsHarness(): PluginsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, PluginsExplorerPanel.prototype);
	return base as unknown as PluginsHarness;
}
function createTagsHarness(): TagsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, TagsExplorerPanel.prototype);
	return base as unknown as TagsHarness;
}
function createPropsHarness(): PropsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, PropsExplorerPanel.prototype);
	return base as unknown as PropsHarness;
}
function createFilesHarness(): FilesHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, FilesExplorerPanel.prototype);
	return base as unknown as FilesHarness;
}

describe('U130-03 / Task 3.3: Los 5 explorers aplican la proyeccion de grupos', () => {
	it('SnippetsExplorerPanel: proyecta grupos custom y presets, poblando _groupIds', () => {
		const panel = createSnippetsHarness();
		panel._groupIds = new Set<string>();
		panel._expandedGroupIds = new Set<string>();
		panel.pendingToggleIds = new Set<string>();
		panel.sortState = sortStateWithScope('snippets', 'all');
		panel.groupPreset = PRESET_OFF;
		panel.activeLayoutName = 'layout-snippets';
		panel.plugin = {
			settings: {
				savedLayouts: [
					{
						name: 'layout-snippets',
						summary: 'test',
						config: {},
						groupMemberships: {
							'custom-snips': ['snippets:snippet:alpha-snippet|Alpha Snippet'],
						},
					},
				],
			},
		};
		panel.nodes = [
			{
				id: 's1',
				label: 'Alpha Snippet',
				depth: 0,
				meta: { name: 'alpha-snippet', enabled: true },
			},
			{
				id: 's2',
				label: 'Beta Snippet',
				depth: 0,
				meta: { name: 'beta-snippet', enabled: false },
			},
		];

		// Con un scope distinto de `groups`, devuelve la lista original sin cabeceras
		const raw = panel.projectedNodes();
		expect(raw).toBe(panel.nodes);
		expect(raw.some((n: TreeNode<SnippetMeta>) => isGroupHeader(n.id))).toBe(false);

		// Con el scope `groups` activo, proyecta grupos custom y puebla _groupIds
		// Spec 08 §3.1.bis: el scope `groups` SOLO ya no enciende nada...
		panel.sortState = sortStateWithScope('snippets', 'groups');
		expect(panel.projectedNodes()).toBe(panel.nodes);
		// ...lo enciende el preset `custom`.
		panel.groupPreset = PRESET_CUSTOM;
		const projected = panel.projectedNodes();
		expect(panel._groupIds.has('custom-snips')).toBe(true);
		expect(projected.length).toBeGreaterThan(0);

		const customGroup = projected.find((g) => g.id === 'custom-snips');
		expect(customGroup).toBeDefined();
		if (!customGroup) throw new Error('custom-snips not found');
		expect(isGroupHeader(customGroup.id, panel._groupIds)).toBe(true);
		expect(customGroup.cls).toContain('vaultman-tree-row--group-header');
		expect(customGroup.children).toHaveLength(1);
		expect(customGroup.children?.[0]?.label).toBe('Alpha Snippet');

		// El segundo snippet cae en NO_GROUP_ID
		const noGroup = projected.find((g) => g.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('NO_GROUP_ID not found');
		expect(noGroup.children).toHaveLength(1);
		expect(noGroup.children?.[0]?.label).toBe('Beta Snippet');
	});

	it('PluginsExplorerPanel: proyecta grupos custom y presets, poblando _groupIds', () => {
		const panel = createPluginsHarness();
		panel._groupIds = new Set<string>();
		panel._expandedGroupIds = new Set<string>();
		panel.pendingToggleIds = new Set<string>();
		panel.sortState = sortStateWithScope('plugins', 'all');
		panel.groupPreset = PRESET_OFF;
		panel.activeLayoutName = 'layout-plugins';
		panel.plugin = {
			settings: {
				savedLayouts: [
					{
						name: 'layout-plugins',
						summary: 'test',
						config: {},
						groupMemberships: {
							'custom-plugs': ['plugins:plugin:obsidian-git|Obsidian Git'],
						},
					},
				],
			},
		};
		panel.nodes = [
			{
				id: 'p1',
				label: 'Obsidian Git',
				depth: 0,
				meta: {
					pluginId: 'obsidian-git',
					name: 'Obsidian Git',
					enabled: true,
					loaded: true,
					isVaultman: false,
				},
			},
			{
				id: 'p2',
				label: 'Dataview',
				depth: 0,
				meta: {
					pluginId: 'dataview',
					name: 'Dataview',
					enabled: true,
					loaded: true,
					isVaultman: false,
				},
			},
		];

		// Disabled -> lista directa sin cabeceras
		const raw = panel.projectedNodes();
		expect(raw).toBe(panel.nodes);
		expect(raw.some((n: TreeNode<PluginMeta>) => isGroupHeader(n.id))).toBe(false);

		// Enabled -> proyectado
		// Spec 08 §3.1.bis: el scope `groups` SOLO ya no enciende nada...
		panel.sortState = sortStateWithScope('plugins', 'groups');
		expect(panel.projectedNodes()).toBe(panel.nodes);
		// ...lo enciende el preset `custom`.
		panel.groupPreset = PRESET_CUSTOM;
		const projected = panel.projectedNodes();
		expect(panel._groupIds.has('custom-plugs')).toBe(true);

		const customGroup = projected.find((g) => g.id === 'custom-plugs');
		expect(customGroup).toBeDefined();
		if (!customGroup) throw new Error('custom-plugs not found');
		expect(isGroupHeader(customGroup.id, panel._groupIds)).toBe(true);
		expect(customGroup.children?.[0]?.label).toBe('Obsidian Git');

		const noGroup = projected.find((g) => g.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('NO_GROUP not found');
		expect(noGroup.children?.[0]?.label).toBe('Dataview');
	});

	it('TagsExplorerPanel: proyecta grupos custom con kind tag y tagPath', () => {
		const panel = createTagsHarness();
		panel._groupIds = new Set<string>();
		panel.sortState = sortStateWithScope('tags', 'all');
		panel.groupPreset = PRESET_OFF;
		panel.activeLayoutName = 'layout-tags';
		panel.plugin = {
			settings: {
				savedLayouts: [
					{
						name: 'layout-tags',
						summary: 'test',
						config: {},
						groupMemberships: {
							'grp-tags': ['tags:tag:proyectos/activo|activo'],
						},
					},
				],
			},
		};
		const nodes: TreeNode<TagMeta>[] = [
			{
				id: 'tag1',
				label: 'activo',
				depth: 0,
				meta: { tagPath: 'proyectos/activo' },
			},
			{
				id: 'tag2',
				label: 'archivo',
				depth: 0,
				meta: { tagPath: 'archivo' },
			},
		];

		expect(panel.projectedNodes(nodes)).toBe(nodes);

		// Spec 08 §3.1.bis: el scope `groups` SOLO ya no enciende nada...
		panel.sortState = sortStateWithScope('tags', 'groups');
		expect(panel.projectedNodes(nodes)).toBe(nodes);
		// ...lo enciende el preset `custom`.
		panel.groupPreset = PRESET_CUSTOM;
		const projected = panel.projectedNodes(nodes);
		expect(panel._groupIds.has('grp-tags')).toBe(true);

		const grp = projected.find((g) => g.id === 'grp-tags');
		expect(grp).toBeDefined();
		if (!grp) throw new Error('grp-tags not found');
		expect(grp.children?.[0]?.label).toBe('activo');

		const noGroup = projected.find((g) => g.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('NO_GROUP not found');
		expect(noGroup.children?.[0]?.label).toBe('archivo');
	});

	it('PropsExplorerPanel: proyecta tanto props como values', () => {
		const panel = createPropsHarness();
		panel._groupIds = new Set<string>();
		panel.sortState = sortStateWithScope('props', 'all');
		panel.groupPreset = PRESET_OFF;
		panel.activeLayoutName = 'layout-props';
		panel.plugin = {
			settings: {
				savedLayouts: [
					{
						name: 'layout-props',
						summary: 'test',
						config: {},
						groupMemberships: {
							'grp-prop': ['props:prop:status|status'],
							'grp-val': ['props:value:status:done|done'],
						},
					},
				],
			},
		};
		const nodes: TreeNode<PropMeta>[] = [
			{
				id: 'prop-status',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
			},
			{
				id: 'val-done',
				label: 'done',
				depth: 1,
				meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'done' },
			},
			{
				id: 'prop-author',
				label: 'author',
				depth: 0,
				meta: { propName: 'author', propType: 'text', isValueNode: false },
			},
		];

		expect(panel.projectedNodes(nodes)).toBe(nodes);

		// Spec 08 §3.1.bis: el scope `groups` SOLO ya no enciende nada...
		panel.sortState = sortStateWithScope('props', 'groups');
		expect(panel.projectedNodes(nodes)).toBe(nodes);
		// ...lo enciende el preset `custom`.
		panel.groupPreset = PRESET_CUSTOM;
		const projected = panel.projectedNodes(nodes);
		expect(panel._groupIds.has('grp-prop')).toBe(true);
		expect(panel._groupIds.has('grp-val')).toBe(true);

		const propGrp = projected.find((g) => g.id === 'grp-prop');
		expect(propGrp).toBeDefined();
		if (!propGrp) throw new Error('grp-prop not found');
		expect(propGrp.children?.[0]?.label).toBe('status');

		const valGrp = projected.find((g) => g.id === 'grp-val');
		expect(valGrp).toBeDefined();
		if (!valGrp) throw new Error('grp-val not found');
		expect(valGrp.children?.[0]?.label).toBe('done');

		const noGroup = projected.find((g) => g.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('noGroup not found');
		expect(noGroup.children?.map((c) => c.label)).toContain('author');
	});

	it('FilesExplorerPanel: proyecta files y folders con su URN respectiva', () => {
		const panel = createFilesHarness();
		panel._groupIds = new Set<string>();
		panel.sortState = sortStateWithScope('files', 'all');
		panel.groupPreset = PRESET_OFF;
		panel.activeLayoutName = 'layout-files';
		panel.plugin = {
			settings: {
				savedLayouts: [
					{
						name: 'layout-files',
						summary: 'test',
						config: {},
						groupMemberships: {
							'grp-files': [
								'files:file:notes/todo.md|todo.md',
								'files:folder:projects|projects',
							],
						},
					},
				],
			},
		};
		const nodes: TreeNode<FileMeta>[] = [
			{
				id: 'notes/todo.md',
				label: 'todo.md',
				depth: 0,
				meta: {
					file: { path: 'notes/todo.md' } as unknown as FileMeta['file'],
					isFolder: false,
					folderPath: 'notes',
				},
			},
			{
				id: 'projects',
				label: 'projects',
				depth: 0,
				meta: {
					file: null,
					isFolder: true,
					folderPath: 'projects',
				},
			},
			{
				id: 'notes/other.md',
				label: 'other.md',
				depth: 0,
				meta: {
					file: { path: 'notes/other.md' } as unknown as FileMeta['file'],
					isFolder: false,
					folderPath: 'notes',
				},
			},
		];

		expect(panel.projectedNodes(nodes)).toBe(nodes);

		// Spec 08 §3.1.bis: el scope `groups` SOLO ya no enciende nada...
		panel.sortState = sortStateWithScope('files', 'groups');
		expect(panel.projectedNodes(nodes)).toBe(nodes);
		// ...lo enciende el preset `custom`.
		panel.groupPreset = PRESET_CUSTOM;
		const projected = panel.projectedNodes(nodes);
		expect(panel._groupIds.has('grp-files')).toBe(true);

		const grp = projected.find((g) => g.id === 'grp-files');
		expect(grp).toBeDefined();
		if (!grp) throw new Error('grp-files not found');
		expect(grp.children).toHaveLength(2);
		expect(grp.children?.map((c) => c.label)).toEqual(['todo.md', 'projects']);

		const noGroup = projected.find((g) => g.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('noGroup not found');
		expect(noGroup.children?.map((c) => c.label)).toEqual(['other.md']);
	});

	it('Preset `letter` sin layout agrupa por primera letra con el scope en `all`', () => {
		const panel = createSnippetsHarness();
		panel._groupIds = new Set<string>();
		panel._expandedGroupIds = new Set<string>();
		panel.pendingToggleIds = new Set<string>();
		panel.sortState = sortStateWithScope('snippets', 'all');
		panel.groupPreset = PRESET_LETTER;
		panel.activeLayoutName = null;
		panel.plugin = { settings: {} };
		panel.nodes = [
			{ id: '1', label: 'alpha', depth: 0, meta: { name: 'alpha', enabled: true } },
			{ id: '2', label: 'beta', depth: 0, meta: { name: 'beta', enabled: true } },
			{ id: '3', label: 'ancla', depth: 0, meta: { name: 'ancla', enabled: true } },
		];

		const projected = panel.projectedNodes();
		expect(projected.map((g) => g.label)).toEqual(['A', 'B']);
		expect(projected[0]?.id).toBe(`${PRESET_GROUP_PREFIX}A`);
		expect(isGroupHeader(projected[0]?.id ?? '')).toBe(true);
		expect(projected[0]?.children?.map((c) => c.id)).toEqual(['1', '3']);
		expect(projected[1]?.children?.map((c) => c.id)).toEqual(['2']);
	});
});

function srcFilesRecursive(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...srcFilesRecursive(full));
		else if (full.endsWith('.ts') || full.endsWith('.svelte')) out.push(full);
	}
	return out;
}

function srcFilesContaining(symbol: string): string[] {
	const srcDir = fileURLToPath(new URL('../../src', import.meta.url));
	return srcFilesRecursive(srcDir).filter((file) =>
		readFileSync(file, 'utf8').includes(symbol),
	);
}

describe('L-CABLE guarda negativa: setActiveLayoutName tiene llamador en src/', () => {
	it('setActiveLayoutName es llamado desde src/ (loadLayout en navbarFilters.svelte)', () => {
		const files = srcFilesContaining('setActiveLayoutName');
		const srcCallers = files.filter(
			(f) =>
				!f.includes('explorer') &&
				!f.includes('typePanelWidget') &&
				f.includes('src/'),
		);
		expect(srcCallers.length).toBeGreaterThan(0);
	});

	it('loadLayout CABLEA la activacion: llama a setActiveLayoutName', () => {
		// Guarda de cableado. La version anterior exigia ademas que la cadena
		// "groupMemberships" apareciera en el cuerpo de loadLayout, y eso lo
		// satisfacia un `void layout.groupMemberships;` --una sentencia muerta
		// puesta solo para pasar el test--. El mecanismo real es que loadLayout
		// LLAME a setActiveLayoutName y que sea el explorer quien resuelva las
		// pertenencias por nombre; las pruebas de comportamiento de este mismo
		// fichero ya cubren esa resolucion con fixtures de groupMemberships.
		const navbarPath = join(
			fileURLToPath(new URL('../../src', import.meta.url)),
			'components/layout/navbarFilters.svelte',
		);
		const content = readFileSync(navbarPath, 'utf8');
		const loadLayoutIdx = content.indexOf('function loadLayout');
		const nextFuncIdx = content.indexOf('function ', loadLayoutIdx + 1);
		const loadLayoutBody =
			nextFuncIdx > 0
				? content.slice(loadLayoutIdx, nextFuncIdx)
				: content.slice(loadLayoutIdx);
		expect(loadLayoutBody).toContain('setActiveLayoutName');
		// Y que no vuelva la sentencia muerta.
		expect(loadLayoutBody).not.toContain('void layout.groupMemberships');
	});
});

describe('L-CABLE guarda negativa: el estado paralelo no puede reaparecer', () => {
	it('setGroupingEnabled no existe en ningun fichero de src/', () => {
		// Un test que solo mira lo que debe aparecer lo satisface un stub:
		// este mira lo que NO puede volver.
		expect(srcFilesContaining('setGroupingEnabled')).toEqual([]);
	});

	it('private groupingEnabled no existe en ningun fichero de src/', () => {
		expect(srcFilesContaining('private groupingEnabled')).toEqual([]);
	});

	it("spec 08 §3.1.bis: `activeScope === 'groups'` ya no es interruptor en src/", () => {
		expect(srcFilesContaining("activeScope === 'groups'")).toEqual([]);
	});
});
