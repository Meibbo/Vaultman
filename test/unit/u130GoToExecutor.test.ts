import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import type { PanelHandle } from '../../src/types/typePanelScene';
import {
	createContentLocator,
	createWorkspaceMediator,
	executeGoToSettingContent,
	executeGoToSettingRow,
	closeSettingContent,
	returnToSourceExplorer,
	WorkspaceMediatorService,
} from '../../src/services/serviceWorkspaceMediator';

/* ---------- Mock helpers ---------- */

function createMockPanel(id: string, workspaceInstanceId = 'ws-main'): PanelHandle & {
	focused: boolean;
	restoredFocus: boolean;
	revealedNodeId: string | null;
	currentMode: 'explorer' | 'content';
	searchTerm: string;
	selectedNodeIds: Set<string>;
	getSearchTerm(): string;
	getSelectedNodeIds(): ReadonlySet<string>;
} {
	const state = {
		id,
		kind: 'panelExplorer' as const,
		workspaceInstanceId,
		focused: false,
		restoredFocus: false,
		revealedNodeId: null as string | null,
		currentMode: 'explorer' as 'explorer' | 'content',
		searchTerm: 'test query',
		selectedNodeIds: new Set(['node-1', 'node-2']),
		focus() {
			state.focused = true;
			return true;
		},
		restoreFocus() {
			state.restoredFocus = true;
			state.focused = true;
		},
		revealNode(nodeId: string) {
			state.revealedNodeId = nodeId;
		},
		setSettingSceneMode(mode: 'explorer' | 'content') {
			state.currentMode = mode;
		},
		getSearchTerm() {
			return state.searchTerm;
		},
		getSelectedNodeIds() {
			return state.selectedNodeIds;
		},
	};
	return state;
}

function createMockApp(opts: {
	tabs?: string[];
	searchIndexResults?: unknown[];
	openFails?: boolean;
} = {}): {
	app: App;
	open: ReturnType<typeof vi.fn>;
	openTabById: ReturnType<typeof vi.fn>;
	navigateToSearchResult: ReturnType<typeof vi.fn>;
	searchFn: ReturnType<typeof vi.fn>;
} {
	const open = vi.fn();
	const openTabById = vi.fn((_tabId: string) => {
		if (opts.openFails) return false;
		return true;
	});
	const navigateToSearchResult = vi.fn();
	const searchFn = vi.fn((_query: string) => opts.searchIndexResults ?? [
		{
			tab: { id: 'editor', name: 'Editor' },
			pagePath: [],
			results: [
				{
					entry: { definition: { name: 'Font size' }, tab: { id: 'editor', name: 'Editor' } },
					nameMatch: { score: 1, matches: [[0, 9]] },
					descMatch: { score: 0, matches: [] },
				},
				{
					entry: { definition: { name: 'Line numbers' }, tab: { id: 'editor', name: 'Editor' } },
					nameMatch: { score: 1, matches: [[0, 12]] },
					descMatch: { score: 0, matches: [] },
				},
			],
		},
	]);

	const tabs = opts.tabs ?? ['editor', 'files', 'community-plugins'];
	const app = {
		setting: {
			open,
			openTabById,
			settingTabs: tabs.map((id) => ({ id })),
			pluginTabs: [],
			searchIndex: {
				search: searchFn,
			},
			navigateToSearchResult,
		},
	} as unknown as App;

	return { app, open, openTabById, navigateToSearchResult, searchFn };
}

describe('U130 B1: Ephemeral locator & identity invariants', () => {
	it('constructs a locator with composite {tabId, definitionName} and runtime tabRef', () => {
		const mock = createMockApp({ tabs: ['editor'] });
		const locator = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		expect(locator.tabId).toBe('editor');
		expect(locator.definitionName).toBe('Font size');
		expect(locator.ownerSceneInstanceId).toBe('scene-1');
		expect(locator.workspace).toBe('ws-main');
		expect(locator.tabRef()).toBe(true);
	});

	it('never uses pagePath or settingDefinitionId as stable identity in mediator', () => {
		const mediator = createWorkspaceMediator();
		const mock = createMockApp();
		const panel = createMockPanel('panel-1');

		const loc1 = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			pagePath: 'Display > Text',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		mediator.register({
			locator: loc1,
			ownerSceneInstanceId: 'scene-1',
			sourcePanelId: panel.id,
			openedAt: Date.now(),
		});

		// Query with DIFFERENT pagePath, but same {workspace, tabId, definitionName}
		const existing = mediator.findExisting('ws-main', 'editor', 'Font size');
		expect(existing).toBeDefined();
		expect(existing?.ownerSceneInstanceId).toBe('scene-1');
	});
});

describe('U130 B1: Conductual requirements (dos destinos, repetir, teardown, tab removida)', () => {
	let mediator: WorkspaceMediatorService;
	let panel: ReturnType<typeof createMockPanel>;

	beforeEach(() => {
		mediator = createWorkspaceMediator();
		panel = createMockPanel('panel-source-1', 'ws-main');
	});

	it('dos destinos = dos instancias distintas registradas en el mediador', async () => {
		const mock = createMockApp();

		const locA = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-A',
			workspace: 'ws-main',
			app: mock.app,
		});

		const locB = createContentLocator({
			tabId: 'editor',
			definitionName: 'Line numbers',
			ownerSceneInstanceId: 'scene-B',
			workspace: 'ws-main',
			app: mock.app,
		});

		const resA = await executeGoToSettingContent(mock.app, locA, panel, mediator);
		const resB = await executeGoToSettingContent(mock.app, locB, panel, mediator);

		expect(resA.action).toBe('created');
		expect(resB.action).toBe('created');

		if (resA.action === 'created' && resB.action === 'created') {
			expect(resA.instance.locator.definitionName).toBe('Font size');
			expect(resB.instance.locator.definitionName).toBe('Line numbers');
			expect(resA.instance.ownerSceneInstanceId).toBe('scene-A');
			expect(resB.instance.ownerSceneInstanceId).toBe('scene-B');
		}

		expect(mediator.getAllInstances()).toHaveLength(2);
		expect(mediator.findExisting('ws-main', 'editor', 'Font size')).toBeDefined();
		expect(mediator.findExisting('ws-main', 'editor', 'Line numbers')).toBeDefined();
	});

	it('repetir destino = focus sin duplicar (mismo workspace, tab y definition)', async () => {
		const mock = createMockApp();
		const containerFocus = vi.fn();
		const mockContainer = { focus: containerFocus } as unknown as HTMLElement;

		const locA = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-A',
			workspace: 'ws-main',
			app: mock.app,
		});

		// Primera llamada: CREATE
		const res1 = await executeGoToSettingContent(mock.app, locA, panel, mediator, {
			containerEl: mockContainer,
		});
		expect(res1.action).toBe('created');
		expect(mediator.getAllInstances()).toHaveLength(1);

		// Segunda llamada con nuevo panel o repetición: REUSE
		const panel2 = createMockPanel('panel-source-2', 'ws-main');
		const res2 = await executeGoToSettingContent(mock.app, locA, panel2, mediator);

		expect(res2.action).toBe('reused');
		if (res2.action === 'reused') {
			expect(res2.instance.ownerSceneInstanceId).toBe('scene-A');
			// Actualizó el backlink al panel llamador
			expect(res2.instance.sourcePanelId).toBe('panel-source-2');
		}

		// Ninguna instancia duplicada en el registro
		expect(mediator.getAllInstances()).toHaveLength(1);
		// El contenedor existente recibió foco
		expect(containerFocus).toHaveBeenCalled();
		// El panel fue conmutado a content
		expect(panel2.currentMode).toBe('content');
	});

	it('teardown de instancia elimina su registro y ejecuta unmount defensivo', async () => {
		const mock = createMockApp();
		const unmountFn = vi.fn();

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-teardown-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		await executeGoToSettingContent(mock.app, loc, panel, mediator, {
			onUnmount: unmountFn,
		});

		expect(mediator.getInstance('scene-teardown-1')).toBeDefined();

		// Teardown
		mediator.unregister('scene-teardown-1');

		expect(unmountFn).toHaveBeenCalledTimes(1);
		expect(mediator.getInstance('scene-teardown-1')).toBeUndefined();
		expect(mediator.findExisting('ws-main', 'editor', 'Font size')).toBeUndefined();
		expect(mediator.getAllInstances()).toHaveLength(0);
	});

	it('tab removida = unavailable local (invalid tab-removed) sin romper explorer/toolbar', async () => {
		const mock = createMockApp({ tabs: ['other-tab'] }); // 'editor' no está

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			tabRef: () => false, // Tab removida
		});

		const res = await executeGoToSettingContent(mock.app, loc, panel, mediator);

		expect(res.action).toBe('invalid');
		if (res.action === 'invalid') {
			expect(res.reason).toBe('tab-removed');
		}

		// Explorer no se rompió: permanece en modo explorer con sus datos intactos
		expect(panel.currentMode).toBe('explorer');
		expect(panel.getSearchTerm()).toBe('test query');
		expect(panel.getSelectedNodeIds().has('node-1')).toBe(true);
		expect(mediator.getAllInstances()).toHaveLength(0);
	});

	it('mediator.invalidateTab desregistra solo las instancias del tab afectado', async () => {
		const mock = createMockApp();

		const locEditor = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-editor',
			workspace: 'ws-main',
			app: mock.app,
		});
		const locFiles = createContentLocator({
			tabId: 'files',
			definitionName: 'Default view mode',
			ownerSceneInstanceId: 'scene-files',
			workspace: 'ws-main',
			app: mock.app,
		});

		await executeGoToSettingContent(mock.app, locEditor, panel, mediator);
		await executeGoToSettingContent(mock.app, locFiles, panel, mediator);
		expect(mediator.getAllInstances()).toHaveLength(2);

		// Evento nativo de tab removida: se invalida solo 'editor'
		const removed = mediator.invalidateTab('editor');
		expect(removed).toBe(1);

		expect(mediator.getInstance('scene-editor')).toBeUndefined();
		expect(mediator.getInstance('scene-files')).toBeDefined();
		expect(mediator.getAllInstances()).toHaveLength(1);
	});
});

describe('U130 B1: F7 reveal, modal fallbacks & missing definitions', () => {
	let mediator: WorkspaceMediatorService;
	let panel: ReturnType<typeof createMockPanel>;

	beforeEach(() => {
		mediator = createWorkspaceMediator();
		panel = createMockPanel('panel-1');
	});

	it('reutiliza F7 scrollToSettingTarget nativo en el paso CREATE', async () => {
		const mock = createMockApp({ searchIndexResults: [{
			tab: { id: 'editor' }, page: { name: 'Font' }, pagePath: ['Editor', 'Font'],
			results: [{ entry: { definition: { name: 'Font size' } } }],
		}] });

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			pagePath: 'Editor > Font',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		const res = await executeGoToSettingContent(mock.app, loc, panel, mediator);

		expect(res.action).toBe('created');
		expect(mock.openTabById).toHaveBeenCalledWith('editor');
		expect(mock.searchFn).toHaveBeenCalledWith('Font size');
		expect(mock.navigateToSearchResult).toHaveBeenCalled();
	});

	it('fila sin page/definition: abre tab vía F7 existente sin crear panel_content', async () => {
		const mock = createMockApp();

		const res = await executeGoToSettingRow(
			mock.app,
			{
				pluginId: '',
				settingsTab: 'editor',
				hasPluginTab: false,
				settingsDefinition: '',
				settingsPage: '',
				settingsPagePath: '',
			},
			'scene-tab-only',
			'ws-main',
			panel,
			mediator,
		);

		expect(res.action).toBe('fallback-modal');
		if (res.action === 'fallback-modal') {
			expect(res.tabId).toBe('editor');
			expect(res.reason).toBe('tab-only');
		}

		// Modal nativo abierto
		expect(mock.open).toHaveBeenCalled();
		expect(mock.openTabById).toHaveBeenCalledWith('editor');
		// No se creó instancia en mediator
		expect(mediator.getAllInstances()).toHaveLength(0);
	});

	it('file / folder / secret: enruta al modal nativo con highlight exacto F7', async () => {
		const mock = createMockApp();

		for (const control of ['file', 'folder', 'secret']) {
			const loc = createContentLocator({
				tabId: 'editor',
				definitionName: 'Config file path',
				ownerSceneInstanceId: `scene-${control}`,
				workspace: 'ws-main',
				app: mock.app,
			});

			const res = await executeGoToSettingContent(mock.app, loc, panel, mediator, {
				settingDefinitionInfo: { control, visible: true },
			});

			expect(res.action).toBe('fallback-modal');
			if (res.action === 'fallback-modal') {
				expect(res.tabId).toBe('editor');
				expect(res.reason).toBe('file-folder-secret');
			}

			// Se ejecutó activación F7 con target exacto
			expect(mock.open).toHaveBeenCalled();
			expect(mock.openTabById).toHaveBeenCalledWith('editor');
		}

		// Ninguna instancia montada en el mediador externo
		expect(mediator.getAllInstances()).toHaveLength(0);
	});

	it('visible=false: retorna invalid definition-missing', async () => {
		const mock = createMockApp();

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Hidden setting',
			ownerSceneInstanceId: 'scene-hidden',
			workspace: 'ws-main',
			app: mock.app,
		});

		const res = await executeGoToSettingContent(mock.app, loc, panel, mediator, {
			settingDefinitionInfo: { visible: false },
		});

		expect(res.action).toBe('invalid');
		if (res.action === 'invalid') {
			expect(res.reason).toBe('definition-missing');
		}
	});
});

describe('U130 B1: Popout window guard (OQ3)', () => {
	it('detecta popout desconectado y retorna invalid popout-detached', async () => {
		const mock = createMockApp();
		const mediator = createWorkspaceMediator();
		const panel = createMockPanel('panel-popout');

		// Simula un Document de ventana popout cerrada (sin defaultView)
		const detachedDoc = {
			defaultView: null,
		} as unknown as Document;

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-popout',
			workspace: 'ws-popout',
			targetDocument: detachedDoc,
			app: mock.app,
		});

		const res = await executeGoToSettingContent(mock.app, loc, panel, mediator);
		expect(res.action).toBe('invalid');
		if (res.action === 'invalid') {
			expect(res.reason).toBe('popout-detached');
		}
	});
});

describe('U130 B1: Close / Return & Back to source navigation', () => {
	it('closeSettingContent desregistra, desmonta y restaura foco al panel explorer', async () => {
		const mock = createMockApp();
		const mediator = createWorkspaceMediator();
		const panel = createMockPanel('panel-1');
		const unmountFn = vi.fn();

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		await executeGoToSettingContent(mock.app, loc, panel, mediator, {
			onUnmount: unmountFn,
		});

		expect(panel.currentMode).toBe('content');

		// Cerrar contenido
		const closed = closeSettingContent('scene-1', mediator);
		expect(closed).toBe(true);

		expect(unmountFn).toHaveBeenCalled();
		expect(mediator.getInstance('scene-1')).toBeUndefined();
		expect(panel.currentMode).toBe('explorer');
		expect(panel.focused).toBe(true);
		expect(panel.restoredFocus).toBe(true);
	});

	it('returnToSourceExplorer conmuta a explorer preservando búsqueda y selección', async () => {
		const mock = createMockApp();
		const mediator = createWorkspaceMediator();
		const panel = createMockPanel('panel-1');

		panel.searchTerm = 'custom search';
		panel.selectedNodeIds.add('highlight-1');

		const loc = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-1',
			workspace: 'ws-main',
			app: mock.app,
		});

		await executeGoToSettingContent(mock.app, loc, panel, mediator);
		expect(panel.currentMode).toBe('content');

		// Volver al explorer
		const returned = returnToSourceExplorer('scene-1', mediator);
		expect(returned).toBe(true);

		expect(panel.currentMode).toBe('explorer');
		expect(panel.getSearchTerm()).toBe('custom search');
		expect(panel.getSelectedNodeIds().has('highlight-1')).toBe(true);
		expect(panel.revealedNodeId).toBe('Font size');
	});
});

describe('U130 B1: Multi-workspace isolation (OQ1)', () => {
	it('mismo tab y definition en dos workspaces distintos genera dos instancias aisladas', async () => {
		const mock = createMockApp();
		const mediator = createWorkspaceMediator();
		const panel1 = createMockPanel('panel-1', 'ws-1');
		const panel2 = createMockPanel('panel-2', 'ws-2');

		const loc1 = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-ws1',
			workspace: 'ws-1',
			app: mock.app,
		});

		const loc2 = createContentLocator({
			tabId: 'editor',
			definitionName: 'Font size',
			ownerSceneInstanceId: 'scene-ws2',
			workspace: 'ws-2',
			app: mock.app,
		});

		const res1 = await executeGoToSettingContent(mock.app, loc1, panel1, mediator);
		const res2 = await executeGoToSettingContent(mock.app, loc2, panel2, mediator);

		expect(res1.action).toBe('created');
		expect(res2.action).toBe('created');

		expect(mediator.findExisting('ws-1', 'editor', 'Font size')?.ownerSceneInstanceId).toBe('scene-ws1');
		expect(mediator.findExisting('ws-2', 'editor', 'Font size')?.ownerSceneInstanceId).toBe('scene-ws2');

		// Invalida solo workspace 1
		mediator.invalidateWorkspace('ws-1');
		expect(mediator.findExisting('ws-1', 'editor', 'Font size')).toBeUndefined();
		expect(mediator.findExisting('ws-2', 'editor', 'Font size')).toBeDefined();
	});
});
