import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	PLUGIN_GROUP_TOGGLE_ID,
	SNIPPET_GROUP_TOGGLE_ID,
	resolveGroupToggleTarget,
	summarizeGroupToggleState,
} from '../../src/logic/logicAddonGroupToggle';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';
import {
	isGroupHeader,
	NO_GROUP_ID,
} from '../../src/logic/logicTreeGroupProjection';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type {
	PluginMeta,
	SnippetMeta,
	TreeNode,
	TreeNodeCell,
} from '../../src/types/typeTree';
import type { ExplorerSortState } from '../../src/types/typeUI';
import type { GroupPreset } from '../../src/types/typeGroupPreset';

function groupsScope(tab: 'plugins' | 'snippets'): ExplorerSortState {
	return normalizeExplorerSortState(tab, {
		sorts: {},
		activeScope: 'groups',
		nodeTypeFilter: null,
	});
}

/** Spec 08 §3.1.bis: what actually turns the projection on. */
const PRESET_CUSTOM: GroupPreset = { kind: 'custom', direction: 'asc' };

type PluginsHarness = {
	_groupIds: Set<string>;
	hiddenGroupIds: Set<string>;
	_seenGroupHeaderIds: Set<string>;
	expandedIds: Set<string>;
	_expandedGroupIds: Set<string>;
	pendingToggleIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	groupMemberships: Record<string, string[]>;
	searchTerm: string;
	cellStyle: string;
	destroyed: boolean;
	treeView: null;
	selectedNodeIds: Set<string>;
	plugin: {
		app: { plugins: { enablePlugin: (id: string) => Promise<void>; disablePlugin: (id: string) => Promise<void> } };
		queueService: { queue: unknown[]; on: () => void; off: () => void };
	};
	entries: PluginMeta[];
	refresh: () => Promise<void>;
	rebuildNodes: () => void;
	projectedNodes: () => TreeNode<PluginMeta>[];
	toggleGroup: (id: string) => Promise<void>;
};

type SnippetsHarness = {
	_groupIds: Set<string>;
	hiddenGroupIds: Set<string>;
	_seenGroupHeaderIds: Set<string>;
	expandedIds: Set<string>;
	_expandedGroupIds: Set<string>;
	pendingToggleIds: Set<string>;
	sortState: ExplorerSortState;
	groupPreset: GroupPreset;
	groupMemberships: Record<string, string[]>;
	searchTerm: string;
	cellStyle: string;
	destroyed: boolean;
	treeView: null;
	selectedNodeIds: Set<string>;
	plugin: {
		app: {
			vault: { configDir: string };
			customCss: {
				setCssEnabledStatus: (name: string, on: boolean) => Promise<void>;
				requestLoadSnippets: () => Promise<void>;
			};
		};
		queueService: { queue: unknown[]; on: () => void; off: () => void };
	};
	entries: SnippetMeta[];
	refresh: () => Promise<void>;
	rebuildNodes: () => void;
	projectedNodes: () => TreeNode<SnippetMeta>[];
	toggleGroup: (id: string) => Promise<void>;
};

function createPluginsHarness(): PluginsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, PluginsExplorerPanel.prototype);
	return base as unknown as PluginsHarness;
}

function createSnippetsHarness(): SnippetsHarness {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, SnippetsExplorerPanel.prototype);
	return base as unknown as SnippetsHarness;
}

describe('Spec 07 §2: tri-estado del toggle de grupo', () => {
	it('1ª pulsacion APAGA todo: con algo encendido el objetivo es off', () => {
		expect(resolveGroupToggleTarget([true, false])).toBe(false);
		expect(resolveGroupToggleTarget([true, true])).toBe(false);
		expect(resolveGroupToggleTarget([true])).toBe(false);
	});

	it('2ª pulsacion ENCIENDE todo: solo con todo apagado el objetivo es on', () => {
		expect(resolveGroupToggleTarget([false, false])).toBe(true);
		expect(resolveGroupToggleTarget([false])).toBe(true);
		expect(resolveGroupToggleTarget([])).toBe(true);
	});

	it('el agregado distingue todo-on, todo-off y mixto', () => {
		expect(summarizeGroupToggleState([true, true])).toEqual({
			enabled: true,
			mixed: false,
		});
		expect(summarizeGroupToggleState([false, false])).toEqual({
			enabled: false,
			mixed: false,
		});
		expect(summarizeGroupToggleState([true, false])).toEqual({
			enabled: false,
			mixed: true,
		});
		expect(summarizeGroupToggleState([])).toEqual({
			enabled: false,
			mixed: false,
		});
	});
});

describe('Spec 07 §2: el toggle de grupo es ACTION en SASI', () => {
	it('los dos ids viven en listActions con kind action y sin mutatesVault', () => {
		const { registry } = createVaultmanSasi();
		for (const id of [PLUGIN_GROUP_TOGGLE_ID, SNIPPET_GROUP_TOGGLE_ID]) {
			const resolved = registry.resolve(id);
			expect(resolved.available).toBe(true);
			expect(resolved.def?.kind).toBe('action');
			expect(resolved.def?.mutatesVault).toBeUndefined();
		}
		expect(registry.listActions().map((def) => def.id)).toEqual(
			expect.arrayContaining([PLUGIN_GROUP_TOGGLE_ID, SNIPPET_GROUP_TOGGLE_ID]),
		);
	});

	it('ninguno aparece en listOperations', () => {
		const { registry } = createVaultmanSasi();
		const operations = registry.listOperations().map((def) => def.id);
		expect(operations).not.toContain(PLUGIN_GROUP_TOGGLE_ID);
		expect(operations).not.toContain(SNIPPET_GROUP_TOGGLE_ID);
	});
});

describe('Spec 07 §2 guarda negativa: el toggle de grupo NO entra por operations', () => {
	it('logicAddonGroupToggle no importa el camino de operations', () => {
		const url = new URL(
			'../../src/logic/logicAddonGroupToggle.ts',
			import.meta.url,
		);
		const source = readFileSync(fileURLToPath(url), 'utf8');
		// La guarda es sobre el cableado, no sobre los comentarios: nombrar
		// el camino prohibido en la doc esta bien; importarlo es el error.
		// El simbolo exacto que el dev cerro: queueService / OperationSummaryModal.
		expect(source).not.toMatch(
			/import[^;]*(queueService|serviceOperationQueue|OperationSummaryModal|modalOperationSummary)/,
		);
		expect(source).not.toContain('queueService.');
		expect(source).not.toContain('OperationSummaryModal(');
	});
});

function makePluginPanel() {
	const enablePlugin = vi.fn(async (_id: string) => {});
	const disablePlugin = vi.fn(async (_id: string) => {});
	const panel = createPluginsHarness();
	panel._groupIds = new Set<string>();
	panel.hiddenGroupIds = new Set<string>();
	panel._seenGroupHeaderIds = new Set<string>();
	panel.expandedIds = new Set<string>();
	panel._expandedGroupIds = new Set<string>();
	panel.pendingToggleIds = new Set<string>();
	panel.sortState = groupsScope('plugins');
	panel.groupPreset = PRESET_CUSTOM;
	// U130-09: the scene's map, as `setGroupMemberships` would leave it.
	panel.groupMemberships = {
		'grp-addons': ['plugins:plugin:alpha|Alpha', 'plugins:plugin:beta|Beta'],
	};
	panel.searchTerm = '';
	panel.cellStyle = 'native';
	panel.destroyed = false;
	panel.treeView = null;
	panel.selectedNodeIds = new Set<string>();
	const queue: unknown[] = [];
	panel.plugin = {
		app: { plugins: { enablePlugin, disablePlugin } },
		queueService: { queue, on() {}, off() {} },
	};
	panel.entries = [
		{
			pluginId: 'alpha',
			name: 'Alpha',
			enabled: true,
			loaded: true,
			isVaultman: false,
		},
		{
			pluginId: 'beta',
			name: 'Beta',
			enabled: false,
			loaded: true,
			isVaultman: false,
		},
	] as PluginMeta[];
	// El refresh real relee Obsidian; aqui simula que Obsidian ya aplico el
	// cambio (los spies de enable/disable son la prueba del despacho).
	panel.refresh = vi.fn(async () => {});
	panel.rebuildNodes();
	return { panel, enablePlugin, disablePlugin, queue };
}

function makeSnippetPanel() {
	const setCssEnabledStatus = vi.fn(async (_name: string, _on: boolean) => {});
	const panel = createSnippetsHarness();
	panel._groupIds = new Set<string>();
	panel.hiddenGroupIds = new Set<string>();
	panel._seenGroupHeaderIds = new Set<string>();
	panel.expandedIds = new Set<string>();
	panel._expandedGroupIds = new Set<string>();
	panel.pendingToggleIds = new Set<string>();
	panel.sortState = groupsScope('snippets');
	panel.groupPreset = PRESET_CUSTOM;
	panel.groupMemberships = {
		'grp-snips': ['snippets:snippet:uno|uno', 'snippets:snippet:dos|dos'],
	};
	panel.searchTerm = '';
	panel.cellStyle = 'native';
	panel.destroyed = false;
	panel.treeView = null;
	panel.selectedNodeIds = new Set<string>();
	const queue: unknown[] = [];
	const defaultConfigDir = '.'.concat('obsidian');
	panel.plugin = {
		app: {
			vault: { configDir: defaultConfigDir },
			customCss: {
				setCssEnabledStatus,
				requestLoadSnippets: vi.fn(async () => {}),
			},
		},
		queueService: { queue, on() {}, off() {} },
	};
	panel.entries = [
		{ name: 'uno', enabled: true },
		{ name: 'dos', enabled: false },
	] as SnippetMeta[];
	panel.refresh = vi.fn(async () => {});
	panel.rebuildNodes();
	return { panel, setCssEnabledStatus, queue };
}

describe('Spec 07 §2: cascada en Plugins', () => {
	it('la cabecera pinta mixto y la 1ª pulsacion apaga a los N miembros', async () => {
		const { panel, enablePlugin, disablePlugin, queue } = makePluginPanel();
		const header = panel
			.projectedNodes()
			.find((node: TreeNode<PluginMeta>) => node.id === 'grp-addons');
		expect(header).toBeDefined();
		if (!header) throw new Error('grp-addons header not found');
		expect(isGroupHeader(header.id, panel._groupIds)).toBe(true);
		const state = header.cells?.find((cell: TreeNodeCell) => cell.id === 'state');
		expect(state?.kind).toBe('toggle');
		expect(state).toMatchObject({ enabled: false, mixed: true });

		await panel.toggleGroup('grp-addons');

		// Cascada: solo el encendido recibe off; el apagado no se toca.
		expect(disablePlugin).toHaveBeenCalledTimes(1);
		expect(disablePlugin).toHaveBeenCalledWith('alpha');
		expect(enablePlugin).not.toHaveBeenCalled();
		// Guarda negativa en vivo: la queue no se toca.
		expect(queue).toEqual([]);
	});

	it('con todo apagado la 2ª pulsacion enciende a los N miembros', async () => {
		const { panel, enablePlugin, disablePlugin, queue } = makePluginPanel();
		for (const entry of panel.entries) entry.enabled = false;
		panel.rebuildNodes();
		const header = panel
			.projectedNodes()
			.find((node: TreeNode<PluginMeta>) => node.id === 'grp-addons');
		if (!header) throw new Error('grp-addons header not found');
		expect(
			header.cells?.find((cell: TreeNodeCell) => cell.id === 'state'),
		).toMatchObject({ enabled: false, mixed: false });

		await panel.toggleGroup('grp-addons');

		expect(enablePlugin).toHaveBeenCalledTimes(2);
		expect(enablePlugin).toHaveBeenCalledWith('alpha');
		expect(enablePlugin).toHaveBeenCalledWith('beta');
		expect(disablePlugin).not.toHaveBeenCalled();
		expect(queue).toEqual([]);
	});
});

describe('Spec 07 §2: cascada en Snippets', () => {
	it('la cabecera pinta mixto y la 1ª pulsacion apaga a los N miembros', async () => {
		const { panel, setCssEnabledStatus, queue } = makeSnippetPanel();
		const header = panel
			.projectedNodes()
			.find((node: TreeNode<SnippetMeta>) => node.id === 'grp-snips');
		expect(header).toBeDefined();
		if (!header) throw new Error('grp-snips header not found');
		const state = header.cells?.find((cell: TreeNodeCell) => cell.id === 'state');
		expect(state?.kind).toBe('toggle');
		expect(state).toMatchObject({ enabled: false, mixed: true });

		await panel.toggleGroup('grp-snips');

		expect(setCssEnabledStatus).toHaveBeenCalledTimes(1);
		expect(setCssEnabledStatus).toHaveBeenCalledWith('uno', false);
		expect(queue).toEqual([]);
	});

	it('con todo apagado la 2ª pulsacion enciende a los N miembros', async () => {
		const { panel, setCssEnabledStatus, queue } = makeSnippetPanel();
		for (const entry of panel.entries) entry.enabled = false;
		panel.rebuildNodes();

		await panel.toggleGroup('grp-snips');

		expect(setCssEnabledStatus).toHaveBeenCalledTimes(2);
		expect(setCssEnabledStatus).toHaveBeenCalledWith('uno', true);
		expect(setCssEnabledStatus).toHaveBeenCalledWith('dos', true);
		expect(queue).toEqual([]);
	});

	it('el complemento sin grupo tambien despacha por su cabecera', async () => {
		const { panel, setCssEnabledStatus } = makeSnippetPanel();
		const noGroup = panel
			.projectedNodes()
			.find((node: TreeNode<SnippetMeta>) => node.id === NO_GROUP_ID);
		expect(noGroup).toBeDefined();
		if (!noGroup) throw new Error('NO_GROUP_ID not found');
		expect(noGroup.children).toHaveLength(0);
		// Sin miembros no hay despacho: grupo vacio, no-op.
		await panel.toggleGroup(NO_GROUP_ID);
		expect(setCssEnabledStatus).not.toHaveBeenCalled();
	});
});
