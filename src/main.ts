//********************************************************************\\
//*      ___|^___^|___      .-~*´¨¯¨¯¯¨¯¨`*~-.     ___|^___^|___     *\\
//*     |   Meibbo   |     | Vaultman v1.2.5 |    | August 2026 |     *\\
//*     \___/`*´\___/      `-~*´¨¯¨¯¯¨¯¨`*~-´     \___/`*´\____/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*      (づ￣ 3￣)づ    ☆*: .｡. o(≧▽≦)o .｡.:*☆     ╰(*°▽°*)╯     *\\
//********************************************************************\\

/*------------------————————————————————————————————-------------------/
/########|||-------|                                |------|||#########/
/#===°°===°°===°°==|      Main TypeScript File      |==°°===°°===°°===#/
/########|||-------|                                |------|||#########/
/-------------------————————————————————————————————------------------*/
//        Here is defined the connection between the different        \\
//    services and modules that Obsidian uses to communicate with     \\
//    the plugin, thus the declared foundation of components that     \\
//    will be used throughout the systems which Vaultman offers       \\
//    to the user. From here, the compiler connects everything        \\
//    into a single main.js file that is executable from Obsidian.    \\
//--------------------------------------------------------------------\\

//...----------—————————————(   IMPORTS   )————————————------------...\\
import { MarkdownView, Menu, Notice, Plugin, TFile, WorkspaceLeaf, WorkspaceRoot, WorkspaceTabs } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import type { ExplorerViewMode } from './types/typeUI';
import type { StatisticsDataTab } from './logic/logicStatisticsNavigation';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { migrateTaskCellDisplayMode } from './logic/logicTaskMetric';
import { PropertyIndexService } from './services/servicePropertyIndex';
import { installCoreBookmarkBridge } from './services/serviceCoreBookmarks';
import { FilterService } from './services/serviceFilter';
import { OperationQueueService } from './services/serviceOperationQueue';
import { PluginUpdatesService } from './services/servicePluginUpdates';
import { VaultmanFrame, VAULTMAN_FRAME_TYPE } from './VaultmanFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './services/servicePropertyType';
import { ContextMenuService } from './services/serviceContextMenu';
import { registerContentActions } from './logic/logicContentContextMenu';
import { registerSnippetActions } from './logic/logicSnippetContextMenu';
import { registerPluginActions } from './logic/logicPluginContextMenu';
import { NodeBindingService, prefixesFromSettings } from './services/serviceNodeBinding';
import { NativeSurfaceBindingService } from './services/serviceNativeSurfaceBinding';
import { BreadcrumbFileSceneService } from './services/serviceBreadcrumbFileScene';
import { registerNodeBindingActions } from './logic/logicNodeBindingContextMenu';
import { registerGroupActions } from './logic/logicGroupContextMenu';
import { StatisticsCacheService } from './services/serviceStatisticsCache';
import { LastOpenedService } from './services/serviceLastOpened';
import { VaultmanSettingsTab } from './VaultmanSettings';
import { setLanguage, translate } from './i18n/index';
import { ExplorerCellContributions } from './services/serviceExplorerCellContributions';
import { fileExplorerCellTranslations } from './logic/logicFileExplorerCellTranslations';
import {
	readVaultmanDragPayload,
	type VaultmanDragNodePayload,
	type VaultmanDragPayload,
} from './utils/dragPayload';
import {
	applyPropertyDragNodesToFrontmatter,
	propertyDragNodes,
} from './utils/dragFrontmatter';
import {
	appendTagsToMarkdownView,
	isMarkdownDropTarget,
	shouldAppendTagDrop,
	tagDragNodes,
	tagSeparatorAfterCaret,
	tagSeparatorBeforeCaret,
	tagTextForDrop,
} from './utils/dragEditorDrop';
import { createPerfProbe } from './dev/perfProbe';
import { UpdatesModal } from './modals/modalUpdates';
import { SasiInspectorModal } from './modals/modalSasiInspector';
import { InstanceSearchModal } from './modals/modalInstanceSearch';
import {
	openUpdatesBulletin,
	shouldShowUpdates,
} from './logic/logicUpdateNotice';
import {
	normalizeOpenMode,
	shouldToggleCloseFrame,
	selectCommandFrame,
} from './logic/logicFrameActivation';
import { applyGlassBlurSetting } from './logic/logicGlassBlur';
import { seedDefaultViewCompositions } from './logic/logicViewCompositions';
import { normalizeGlyphColorChoice } from './logic/logicGlyphColor';
import {
	declareWorkspaceInstance,
	mintInstanceId,
	reconcileRegistry,
} from './logic/logicInstanceRegistry';
import { registerDefaultScopeCursorProvider } from './logic/logicScopedSort';
import { addressForLeaf } from './logic/logicSurfaceAddress';
import {
	InstanceMountRegistry,
	type InstanceMountLease,
	type MountReservationResult,
} from './logic/logicInstanceMountRegistry';
import {
	SurfaceHost,
	type OpenWorkspaceInstanceResult,
} from './services/serviceSurfaceHost';
import {
	DEFAULT_HOME_SURFACE,
	type HomeSurfaceIntent,
	type SurfaceRequest,
} from './types/typeSurface';
import { createVaultmanSasi } from './logic/logicSasiBootstrap';
import type { SasiRegistry } from './logic/logicSasiRegistry';
import type { SasiProvider } from './services/serviceSasiProvider';
import {
	createSasiCommandPublisher,
	effectiveSasiPublishedDecisions,
	mergeSasiPublishedStore,
	type SasiCommandPublisher,
} from './logic/logicSasiCommands';
import {
	HOVER_LOCK_ID,
	HOVER_NESTED_RIBBON_ID,
	HOVER_SURFACE_IDS,
	hoverActionId,
} from './logic/logicSasiHoverActions';
import {
	SCENE_ENGINE_SURFACES,
	SCENE_GOTO_TABS,
	sceneEngineActionId,
	sceneEngineLabelKey,
	sceneEngineModes,
	sceneGotoActionId,
	sceneGotoLabelKey,
	type SceneEngineSurface,
	PROPS_ADD_PROPERTY_ACTION_ID,
	PROPS_ADD_PROPERTY_COMMAND_ID,
	PROPS_ADD_PROPERTY_MACRO_COMPOSES,
} from './logic/logicSasiSceneActions';
import { SETTINGS_OPEN_ID } from './logic/logicSasiSettingsActions';
import { parseScenePresentationAction } from './logic/logicSasiPresentationActions';
import { API_SCENE_SELF_ID } from './logic/logicApiSceneModel';
import { executeObsidianCommand } from './utils/obsidianCommands';
import { installCommandPaletteFilter } from './logic/logicCommandPaletteInterceptor';
import {
	browseCommunityPlugins,
	openRestrictedModeSetting,
} from './logic/logicPluginNativeActions';
import {
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_SEARCHBOX_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_SCENE_MENU_ID,
	TOOLBAR_VIEW_MENU_ID,
	TOOLBAR_SORT_MENU_ID,
} from './logic/logicSasiToolbarActions';
import {
	createTabMoveCommandDescriptors,
	guardMessageKey,
	maximizeGuardMessageKey,
	nextMaximizedState,
	resolveGroupMoveTarget,
	resolveTabMoveTarget,
	resolveToggleMaximize,
	MAXIMIZE_BODY_CLASS,
	type GroupMoveDirection,
	type GroupMoveLayoutSnapshot,
	type TabMoveDirection,
	type TabMoveLayoutSnapshot,
} from './logic/logicSasiTabMoveActions';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
} from './logic/logicSasiSearchActions';
import {
	FILTER_QUEUE_ACTIONS,
	FILTER_QUEUE_ACTION_IDS,
} from './logic/logicSasiFilterQueueActions';
import {
	WORKSPACE_FOCUS_LEFT_SIDEBAR_ID,
	WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID,
	WORKSPACE_FOCUS_MAIN_AREA_ID,
	createWorkspaceFocusCommandDescriptors,
	findActiveLeafInSplit,
	type WorkspaceFocusTarget,
} from './logic/logicSasiWorkspaceFocusActions';
import { PlatformAdapterRegistry } from './platform/fragilityRegistry';
import { createHoverSurfacesAdapter } from './services/serviceHoverSurfaces';
import { vaultmanPerfMonitor } from './utils/performanceMonitor';
import { formatPerfTimeline } from './utils/perfTimeline';
import {
	revealNativeFrontmatterProperty,
	routeVaultmanCurrentFileProperty,
	type FrontmatterSourceLocation,
} from './services/serviceFrontmatterPropertyReveal';

/**
 * U130L: decision Published por defecto, explicita por comando. Los comandos
 * historicos nacen publicados (preservan atajos); cualquier comando nuevo
 * nace oculto salvo que se anada aqui a `true`. El default solo se
 * aplica cuando `settings.sasiPublishedCommands` no trae preferencia previa
 * para ese id (`resolveSasiPublishedDecision`).
 */
const SASI_PUBLISHED_DEFAULT_TRUE: ReadonlySet<string> = new Set([
	'apply-queue',
	'open',
	'open-updates',
	'focus-content-search',
	'focus-active-explorer-search',
	SETTINGS_OPEN_ID,
	TOOLBAR_REVEAL_ACTIVE_FILE_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_SEARCHBOX_ID,
	SEARCH_CYCLE_CATEGORY_ID,
	SEARCH_CREATE_TARGET_ID,
	TOOLBAR_SCENE_MENU_ID,
	TOOLBAR_VIEW_MENU_ID,
	TOOLBAR_SORT_MENU_ID,
	'go_to_setting_scene',
	PROPS_ADD_PROPERTY_COMMAND_ID,
	'open-filter-scene',
	'open-queue',
	'open-api-scene',
	'vaultman.scene.goto.apiscene',
	'select-all-nodes',
	'copy-node',
	'paste-node',
	WORKSPACE_FOCUS_LEFT_SIDEBAR_ID,
	WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID,
	WORKSPACE_FOCUS_MAIN_AREA_ID,
]);

export function sasiPublishedDefault(id: string): boolean {
	return SASI_PUBLISHED_DEFAULT_TRUE.has(id);
}

//...----------—————————————(   EXPORTS   )————————————------------...\\
export class VaultmanPlugin extends Plugin {
	declare settings: VaultmanSettings;
	private settingsChangeListeners = new Set<() => void>();
	private lastFocusedFrameLeaf: WorkspaceLeaf | null = null;
	/** U200-L2: reversible maximize flag (additive body class, no visual rule v1). */
	private l2PanelMaximized = false;

	// Core services — public so components/modals can access them
	/** Public additive cell contributions; registrations return an unload disposer. */
	readonly explorerCellContributions = new ExplorerCellContributions();
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	pluginUpdatesService!: PluginUpdatesService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	contextMenuService!: ContextMenuService;
	statisticsCache!: StatisticsCacheService;
	lastOpenedService!: LastOpenedService;
	nodeBindingService!: NodeBindingService;
	nativeSurfaceBindingService!: NativeSurfaceBindingService;
	breadcrumbFileSceneService!: BreadcrumbFileSceneService;
	private readonly instanceMounts = new InstanceMountRegistry<WorkspaceLeaf>();
	surfaceHost!: SurfaceHost<WorkspaceLeaf>;

	/**
	 * U130-01: SASI = Services Actions Scripts Indexing. Vive bajo MyConfig,
	 * hermano de PSS y LUPAPI; WAR le CONSULTA, no lo contiene. Es un
	 * registro, no un Component de Obsidian, asi que no va por addChild.
	 */
	sasiRegistry!: SasiRegistry;
	sasiProvider!: SasiProvider;

	/**
	 * U130-? unico punto por el que el plugin publica o retira un comando
	 * de Obsidian. Cualquier `addCommand`/`removeCommand` que aparezca en
	 * otro sitio rompe la guarda negativa del SASI bridge.
	 */
	sasiCommandPublisher!: SasiCommandPublisher;
	private cleanupCommandPaletteFilter?: () => void;

	// Native status bar element
	private statusBarEl!: HTMLElement;
	/** ADR 0004: registro de zonas frágiles. El revert de cada adapter es el
	 * contrato serviceUnload (ADR 0011) que da el apagado por función. */
	platformAdapterRegistry!: PlatformAdapterRegistry;
	/** Hover/pin/lock de las cuatro superficies. Vive tras el registry. */
	hoverSurfacesAdapter!: ReturnType<typeof createHoverSurfacesAdapter>;

	
	async revealNodeInVaultman(node: import('./services/serviceNodeBinding').BindingNodeInput): Promise<boolean> {
		const leaves = this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE);
		let targetLeaf = leaves[0];
		if (!targetLeaf) {
			const opened = await this.createAndOpenWorkspaceInstance(
				this.sidebarSurfaceForPhysical('left'),
			);
			if (!opened.ok) return false;
			targetLeaf = opened.address.leaf;
		}
		await this.app.workspace.revealLeaf(targetLeaf);
		this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });

		const view = targetLeaf.view as unknown as VaultmanFrame & {
			revealPath?: (path: string) => void;
		};
		view.revealPath?.(node.path ?? node.label);
		return true;
	}

	/** U130: frontmatter tags land in Core and every eligible Props reveal scene. */
	async revealFrontmatterProperty(
		file: TFile,
		propertyName: string,
		source: FrontmatterSourceLocation,
		propertyValue?: string,
	): Promise<boolean> {
		const nativeRevealed = await revealNativeFrontmatterProperty(
			this.app,
			file,
			propertyName,
			source,
			propertyValue,
		);
		const sceneCount = routeVaultmanCurrentFileProperty(
			this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE),
			{ filePath: file.path, propertyName },
		);
		return nativeRevealed || sceneCount > 0;
	}

	async onload(): Promise<void> {
		for (const provider of fileExplorerCellTranslations) this.register(this.explorerCellContributions.register(provider));
		this.register(() => this.explorerCellContributions.destroy());
		this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
			if (leaf?.view instanceof VaultmanFrame) this.lastFocusedFrameLeaf = leaf;
		}));
		this.registerDomEvent(activeDocument, 'pointerdown', (event) => {
			if (!(event.target instanceof Node)) return;
			const target = event.target;
			const leaf = this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE).find(
				(candidate) => candidate.view.containerEl.contains(target),
			);
			if (leaf) this.lastFocusedFrameLeaf = leaf;
		});
		await this.loadSettings();
		registerDefaultScopeCursorProvider(
			() => this.settings.scopeDefaultCursor ?? 'all',
		);
		this.surfaceHost = new SurfaceHost({
			workspace: this.app.workspace,
			frameType: VAULTMAN_FRAME_TYPE,
			mounts: this.instanceMounts,
			isRtl: () => this.isRtlDirection(),
			readRegistry: () => this.settings.instanceRegistry ?? { schema: 1, instances: {} },
		});
		this.updateGlassBlur();

		setLanguage(this.settings.language);

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app, this.settings);
		this.pluginUpdatesService = new PluginUpdatesService(this.app);
		this.iconicService = new IconicService(
			this.app,
			this.settings.iconicEnabled !== false,
			this.settings,
			() => this.saveSettings(),
		);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);
		this.statisticsCache = new StatisticsCacheService(this.app, {
			countFrontmatterWords: this.settings.countFrontmatterWords === true,
		});
		this.lastOpenedService = new LastOpenedService(this.app, this.manifest.id);
		this.lastOpenedService.setRecordAllOpens(
			this.settings.recordAllFileOpens === true,
		);

		const sasi = createVaultmanSasi();
		this.sasiRegistry = sasi.registry;
		this.sasiProvider = sasi.provider;
		// U130L: la decision Published vive en PSS/settings, separada del
		// capability registry. Cada toggle de usuario (inspector incluido,
		// que ya llama a `setPublished`) persiste aqui sin tocar su modal.
		this.sasiCommandPublisher = createSasiCommandPublisher(this, {
			onDecision: (id, published) => {
				const store = (this.settings.sasiPublishedCommands ??= {});
				if (store[id] !== published) {
					store[id] = published;
					void this.saveSettings();
				}
			},
		});

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.pluginUpdatesService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);
		this.addChild(this.statisticsCache);
		this.addChild(this.lastOpenedService);

		// BT5-036: content nodes are files; register their Rename/Delete panel
		// actions once so the Content menu kind is populated and configurable.
		
				this.nodeBindingService = new NodeBindingService({
			app: this.app,
			getPrefixes: () => prefixesFromSettings(this.settings),
			router: (token) => {
				void this.filterService.addNode({
					type: 'rule',
					filterType: 'specific_value',
					property: 'aliases',
					values: [token],
				});
			},
		});
		this.nativeSurfaceBindingService = new NativeSurfaceBindingService({
			plugin: this,
			app: this.app,
			bindingService: this.nodeBindingService,
			revealInVaultman: (node) => this.revealNodeInVaultman(node),
			// A15: a native "search selection" is a TEXT search, the same
			// transaction the editor menu runs -- not a reveal plus a synthetic
			// tag filter, which minted a fake chip for folders and every other
			// kind.
			searchInVaultman: (query: string) =>
				this.openContentSearchWithQuery(query),
		});
		this.addChild(this.nativeSurfaceBindingService);
		this.breadcrumbFileSceneService = new BreadcrumbFileSceneService({
			plugin: this,
			app: this.app,
		});
		this.addChild(this.breadcrumbFileSceneService);

		// El adapter de hover solo se registra si el modulo esta encendido: el
		// nivel 1 de los ajustes. Apagado, ni siquiera se instala, asi que no
		// hay listeners ni clases que revertir despues.
		this.hoverSurfacesAdapter = createHoverSurfacesAdapter();
		this.platformAdapterRegistry = new PlatformAdapterRegistry();
		if (this.settings.hoverSurfaces.enabled) {
			this.applyHoverSurfacesSettings();
			this.platformAdapterRegistry.add(this.hoverSurfacesAdapter);
		}
		this.addChild(this.platformAdapterRegistry);
		await this.platformAdapterRegistry.activate({
			app: this.app,
			plugin: this,
			doc: activeDocument,
		});

		registerContentActions(this);
		registerSnippetActions(this);
		registerPluginActions(this);
		registerNodeBindingActions(this);
		registerGroupActions(this);

		const perfProbe = createPerfProbe({
			now: () => activeWindow.performance.now(),
			doc: activeDocument,
		});
		this.register(
			perfProbe.installGlobal(
				activeWindow as unknown as { __vaultmanPerfProbe?: unknown },
			),
		);

		// The fps sampler is a module singleton and the timeline formatter had
		// no caller, so on a device whose only way in is `obsidian eval` a
		// measurement could not be read back out at all. Same global idiom as
		// the probe above, and torn down with the plugin.
		const perfGlobals = activeWindow as unknown as {
			__vaultmanPerfMonitor?: unknown;
			__vaultmanPerfTimeline?: unknown;
		};
		perfGlobals.__vaultmanPerfMonitor = vaultmanPerfMonitor;
		perfGlobals.__vaultmanPerfTimeline = (
			sampleLimit = 180,
			actionLimit = 120,
		): string =>
			formatPerfTimeline({
				samples: vaultmanPerfMonitor.samples(sampleLimit),
				actions: vaultmanPerfMonitor.actions(actionLimit),
			});
		this.register(() => {
			delete perfGlobals.__vaultmanPerfMonitor;
			delete perfGlobals.__vaultmanPerfTimeline;
		});

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.nodeBindingService.invalidateAliasCache();
				this.filterService.scheduleMetadataRefresh();
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.nodeBindingService.invalidateAliasCache();
			}),
		);
		this.registerEvent(
			this.app.vault.on('create', () => {
				this.nodeBindingService.invalidateAliasCache();
			}),
		);

		// BT5-013: `file-open` fires on a real activation only — hover previews
		// never reach it, so previewing a note cannot age it to "just opened".
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				this.lastOpenedService.handleFileOpen(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				this.nodeBindingService.invalidateAliasCache();
				this.lastOpenedService.handleRename(file.path, oldPath);
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				const path = file?.path;
				this.nodeBindingService.invalidateAliasCache(path);
				if (path) this.lastOpenedService.handleDelete(path);
				setTimeout(() => {
					this.nodeBindingService.invalidateAliasCache();
				}, 60);
			}),
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('vaultman-native-statusbar');

		const ribbonIconEl = this.addRibbonIcon(
			'lucide-vault',
			translate('plugin.open'),
			(evt?: MouseEvent) => {
				if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
				void this.activateView();
			},
		);
		this.registerDomEvent(
			ribbonIconEl,
			'click',
			(event) => {
				if (event.button === 0) return;
				event.preventDefault();
				event.stopImmediatePropagation();
			},
			{ capture: true },
		);
		this.registerDomEvent(
			ribbonIconEl,
			'auxclick',
			(event) => {
				event.preventDefault();
				event.stopImmediatePropagation();
			},
			{ capture: true },
		);
		this.registerDomEvent(
			ribbonIconEl,
			'contextmenu',
			(event) => {
				event.preventDefault();
				event.stopImmediatePropagation();
				this.openRibbonLocationMenu(event);
			},
			{ capture: true },
		);

		this.registerView(
			VAULTMAN_FRAME_TYPE,
			(leaf) => new VaultmanFrame(leaf, this),
		);
		this.app.workspace.onLayoutReady(() => this.showUpdatesIfNeeded());

		this.sasiCommandPublisher.register({
			id: 'apply-queue',
			name: translate('command.apply_queue'),
			handler: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					void this.queueService.execute();
				}
				return true;
			},
			checkable: true,
		});
		this.sasiCommandPublisher.register({
			id: 'open',
			name: translate('plugin.open'),
			handler: () => {
				void this.activateView();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'open-updates',
			name: translate('command.open_updates'),
			handler: () => this.openUpdates(),
		});
		this.sasiCommandPublisher.register({
			id: 'focus-content-search',
			name: translate('command.focus_content_search'),
			handler: () => {
				void this.focusVaultmanContentSearch();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'focus-active-explorer-search',
			name: translate('command.focus_active_explorer_search'),
			handler: () => {
				void this.focusVaultmanExplorerSearch();
			},
		});

		for (const surface of HOVER_SURFACE_IDS) {
			for (const kind of ['hide', 'hover', 'pin'] as const) {
				this.sasiCommandPublisher.register({
					id: hoverActionId({ surface, kind }),
					name: translate(
						kind === 'hide'
							? `sasi.hover.${surface}.hide`
							: kind === 'hover'
								? `sasi.hover.${surface}.hover`
								: `sasi.hover.${surface}.pin`,
					),
					handler: () => {
						this.toggleHoverSurfaceSwitch(surface, kind);
					},
				});
			}
		}
		this.sasiCommandPublisher.register({
			id: HOVER_LOCK_ID,
			name: translate('sasi.hover.lock'),
			handler: () => {
				this.toggleHoverSurfaceLock();
			},
		});
		this.sasiCommandPublisher.register({
			id: HOVER_NESTED_RIBBON_ID,
			name: translate('sasi.hover.nested-ribbon'),
			handler: () => {
				this.toggleHoverSurfaceNestedRibbon();
			},
		});
		// U130: instancia de escena — un comando por engine seleccionable y
		// uno por salto de escena. Se registran para que el inspector SASI los
		// pueda publicar; nacen ocultos (sin setPublished) para no inundar el
		// palette: el usuario publica los que use.
		for (const mode of ['tree', 'cards', 'table'] as const) {
			const id = `change-engine-${mode}`;
			this.sasiCommandPublisher.register({
				id,
				name: translate(`sasi.scene.engine.${mode}`),
				handler: () => {
					void this.changeActiveEngineCommand(mode);
				},
			});
		}
		for (const tab of SCENE_GOTO_TABS) {
			const id = sceneGotoActionId(tab);
			this.sasiCommandPublisher.register({
				id,
				name: translate(sceneGotoLabelKey(tab)),
				handler: () => {
					if (tab === 'apiscene') {
						void this.goToApiSceneCommand();
					} else {
						void this.switchSceneCommand(tab as StatisticsDataTab);
					}
				},
			});
		}

		this.sasiCommandPublisher.register({
			id: SETTINGS_OPEN_ID,
			name: translate('command.open_settings'),
			handler: () => {
				this.openSettings();
			},
		});

		const toolbarCommands = [
			[TOOLBAR_REVEAL_ACTIVE_FILE_ID, 'sasi.toolbar.reveal_active_file'],
			[TOOLBAR_TOGGLE_EXPANSION_ID, 'sasi.toolbar.toggle_expansion'],
			[TOOLBAR_SEARCHBOX_ID, 'sasi.toolbar.searchbox'],
			[SEARCH_CYCLE_CATEGORY_ID, 'sasi.search.cycle_category'],
			[SEARCH_CREATE_TARGET_ID, 'sasi.search.create_target'],
			[TOOLBAR_SCENE_MENU_ID, 'sasi.toolbar.scene_menu'],
			[TOOLBAR_VIEW_MENU_ID, 'sasi.toolbar.view_menu'],
			[TOOLBAR_SORT_MENU_ID, 'sasi.toolbar.sort_menu'],
		] as const;
		for (const [id, labelKey] of toolbarCommands) {
			this.sasiCommandPublisher.register({
				id,
				name: translate(labelKey),
				handler: () => {
					void this.invokeToolbarSasiAction(id);
				},
			});
		}
		for (const action of FILTER_QUEUE_ACTIONS) {
			this.sasiCommandPublisher.register({
				id: action.id,
				name: translate(action.labelKey),
				handler: () => {
					void this.invokeIslandSasiAction(action.id);
				},
			});
		}
		// U200-L2: tab/group moves + panel maximize skeletons. Born hidden
		// (not in SASI_PUBLISHED_DEFAULT_TRUE): the user publishes them from
		// the SASI inspector. Handlers are checkable: `checking` answers the
		// guard silently, execute Notices + false on guard failure.
		for (const descriptor of createTabMoveCommandDescriptors(translate, {
			runTabMove: (direction, checking) =>
				this.runTabMoveCommand(direction, checking),
			runGroupMove: (direction, checking) =>
				this.runGroupMoveCommand(direction, checking),
			runToggleMaximize: (checking) =>
				this.runToggleMaximizeCommand(checking),
		})) {
			this.sasiCommandPublisher.register(descriptor);
		}
		for (const descriptor of createWorkspaceFocusCommandDescriptors(translate, {
			runFocusWorkspaceSurface: (target) =>
				this.runFocusWorkspaceSurface(target),
		})) {
			this.sasiCommandPublisher.register(descriptor);
		}
		for (const id of ['check_plugin_updates', 'update_all_plugins'] as const) {
			this.sasiCommandPublisher.register({
				id,
				name: translate(`sasi.settingScene.action.${id}`),
				handler: () => { void this.runPluginUpdateAction(id); },
			});
		}
		for (const id of ['browse_community_plugins', 'open_restricted_mode'] as const) {
			this.sasiCommandPublisher.register({
				id,
				name: translate(`sasi.settingScene.action.${id}`),
				handler: () => { this.runPluginNativeAction(id); },
			});
		}
		this.sasiCommandPublisher.register({
			id: 'go_to_setting_scene',
			name: translate('sasi.settingScene.action.go_to_setting_scene'),
			handler: () => {
				void this.goToSettingSceneCommand();
			},
		});
		this.sasiCommandPublisher.register({
			id: PROPS_ADD_PROPERTY_COMMAND_ID,
			name: translate('sasi.props.action.add_property'),
			composes: PROPS_ADD_PROPERTY_MACRO_COMPOSES,
			handler: () => {
				void this.addPropertyCommand();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'open-filter-scene',
			name: translate('command.open_filter_scene'),
			handler: () => {
				void this.openFilterSceneCommand();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'open-queue',
			name: translate('command.open_queue'),
			handler: () => {
				void this.openQueueCommand();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'open-api-scene',
			name: translate('sasi.scene.goto.apiscene'),
			handler: () => {
				void this.goToApiSceneCommand();
			},
		});
		this.sasiCommandPublisher.register({
			id: 'select-all-nodes',
			name: translate('command.select_all_nodes'),
			handler: () => {
				const activeView = this.app.workspace.getActiveViewOfType(VaultmanFrame);
				if (activeView) {
					activeView.selectAllActiveNodes();
					return;
				}
				for (const leaf of this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)) {
					if (leaf.view instanceof VaultmanFrame) {
						leaf.view.selectAllActiveNodes();
						break;
					}
				}
			},
		});
		this.sasiCommandPublisher.register({
			id: 'copy-node',
			name: translate('command.copy_node'),
			handler: () => {
				const activeView = this.app.workspace.getActiveViewOfType(VaultmanFrame);
				if (activeView) {
					activeView.copyActiveNode();
					return;
				}
				for (const leaf of this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)) {
					if (leaf.view instanceof VaultmanFrame) {
						leaf.view.copyActiveNode();
						break;
					}
				}
			},
		});
		this.sasiCommandPublisher.register({
			id: 'paste-node',
			name: translate('command.paste_node'),
			handler: () => {
				const activeView = this.app.workspace.getActiveViewOfType(VaultmanFrame);
				if (activeView) {
					void activeView.pasteActiveNode();
					return;
				}
				for (const leaf of this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)) {
					if (leaf.view instanceof VaultmanFrame) {
						void leaf.view.pasteActiveNode();
						break;
					}
				}
			},
		});
		if (this.settings.sasiCustomCommands) {
			for (const customCmd of Object.values(this.settings.sasiCustomCommands)) {
				this.sasiCommandPublisher.register({
					id: customCmd.id,
					name: customCmd.name,
					composes: customCmd.composes,
					handler: async () => {
						for (const actId of customCmd.composes) {
							await this.invokeActionById(actId, customCmd.scope);
						}
					},
				});
			}
		}
		if (this.settings.sasiCommandCustomNames) {
			for (const [id, customName] of Object.entries(this.settings.sasiCommandCustomNames)) {
				this.sasiCommandPublisher.rename(id, customName);
			}
		}

		// U130L: la decision Published persiste en PSS/settings y sobrevive a
		// desactivar/reactivar y a reinicios. El default explicito
		// (`sasiPublishedDefault`) solo se aplica si no hay preferencia
		// previa; los ids retirados del store se conservan para elecciones
		// futuras y los no registrados se ignoran (`restorePublished`).
		// Compatibilidad de datos: un data.json viejo sin el campo arranca
		// con los defaults y los persiste en una sola escritura.
		{
			const stored = this.settings.sasiPublishedCommands;
			const effective = effectiveSasiPublishedDecisions(
				this.sasiCommandPublisher.registeredIds(),
				stored,
				sasiPublishedDefault,
			);
			this.sasiCommandPublisher.restorePublished(effective);
			const merged = mergeSasiPublishedStore(stored, effective);
			const needsSave =
				stored === undefined ||
				Object.keys(merged).length !== Object.keys(stored).length ||
				Object.entries(effective).some(([id, value]) => stored[id] !== value);
			this.settings.sasiPublishedCommands = merged;
			if (needsSave) await this.saveData(this.settings);
		}

		this.cleanupCommandPaletteFilter = installCommandPaletteFilter(
			this.app,
			(commandId) => {
				if (
					this.settings.sasiPublishedCommands &&
					commandId in this.settings.sasiPublishedCommands
				) {
					return this.settings.sasiPublishedCommands[commandId];
				}
				if (this.sasiCommandPublisher?.isPublishable(commandId)) {
					return this.sasiCommandPublisher.isPublished(commandId);
				}
				return true;
			},
		);

		activeDocument.addEventListener('drop', this.handleVaultmanDrop, true);
		activeDocument.addEventListener(
			'dragover',
			this.handleVaultmanDragOver,
			true,
		);
		activeDocument.addEventListener(
			'dragend',
			this.handleVaultmanDragEnd,
			true,
		);
		this.register(() =>
			activeDocument.removeEventListener('drop', this.handleVaultmanDrop, true),
		);
		this.register(() =>
			activeDocument.removeEventListener(
				'dragover',
				this.handleVaultmanDragOver,
				true,
			),
		);
		this.register(() =>
			activeDocument.removeEventListener(
				'dragend',
				this.handleVaultmanDragEnd,
				true,
			),
		);

		// U121-019 #51: search bookmarks reopen in the Text explorer when the user
		// has asked for that. This patches the Bookmarks plugin's own methods, so
		// it is registered for teardown alongside everything else that reaches
		// outside our own surface.
		this.register(
			installCoreBookmarkBridge(this.app, {
				isEnabled: () => this.settings.textSearchInterceptsCoreSearch,
				openSearch: (query, modifiers) => {
					void this.openContentSearchWithQuery(query, modifiers);
				},
			}),
		);

		this.addSettingTab(new VaultmanSettingsTab(this.app, this));
	}

	/**
	 * U130L: al desactivar se retiran los comandos de la sesion (Obsidian
	 * tambien los limpia), pero la DECISION persiste en
	 * `settings.sasiPublishedCommands`: el proximo `onload` la restaura via
	 * `restorePublished`. Por eso aqui no se toca settings.
	 */
	onunload(): void {
		this.cleanupCommandPaletteFilter?.();
		this.cleanupCommandPaletteFilter = undefined;
		this.sasiCommandPublisher?.revokeAll();
	}

	/**
	 * U130L: puente para proyectar la decision Published a un `cell_toggle`
	 * existente (sin widget ni cell kind nuevos). Solo los comandos con
	 * descriptor registrado son conmutables: devuelve `false` sin tocar
	 * nada para provider/kind/action sin descriptor o ids retirados. La
	 * persistencia la hace el `onDecision` del publisher.
	 */
	setSasiCommandPublished(id: string, published: boolean): boolean {
		if (!this.sasiCommandPublisher?.isPublishable(id)) return false;
		this.sasiCommandPublisher.setPublished(id, published);
		return true;
	}

	async invokeActionById(actionId: string, scope?: string): Promise<void> {
		if (scope && scope.startsWith('instance:')) {
			const instanceId = scope.slice('instance:'.length);
			await this.openWorkspaceInstance(instanceId);
		}
		if (parseScenePresentationAction(actionId)) {
			const view = await this.vaultmanFrameForCommand();
			await view?.invokeScenePresentationSasiAction(actionId, scope);
			return;
		}
		if (actionId.startsWith('vaultman.scene.engine.')) {
			const mode = actionId.slice('vaultman.scene.engine.'.length) as any;
			void this.changeActiveEngineCommand(mode);
			return;
		}
		if (actionId.startsWith('vaultman.scene.goto.')) {
			const tab = actionId.slice('vaultman.scene.goto.'.length);
			if (tab === 'apiscene') {
				void this.goToApiSceneCommand();
			} else {
				void this.switchSceneCommand(tab as StatisticsDataTab);
			}
			return;
		}
		if (actionId === 'go_to_setting_scene') {
			void this.goToSettingSceneCommand();
			return;
		}
		if (
			actionId === WORKSPACE_FOCUS_LEFT_SIDEBAR_ID ||
			actionId === WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID ||
			actionId === WORKSPACE_FOCUS_MAIN_AREA_ID
		) {
			const target: WorkspaceFocusTarget =
				actionId === WORKSPACE_FOCUS_LEFT_SIDEBAR_ID
					? 'leftSidebar'
					: actionId === WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID
						? 'rightSidebar'
						: 'mainArea';
			this.runFocusWorkspaceSurface(target);
			return;
		}
		if (actionId === 'apply-queue') {
			void this.queueService.execute();
			return;
		}
		if (actionId === 'open') {
			void this.activateView();
			return;
		}
		if (actionId === 'open-updates') {
			this.openUpdates();
			return;
		}
		if (actionId === 'open-filter-scene') {
			void this.openFilterSceneCommand();
			return;
		}
		if (actionId === 'open-queue') {
			void this.openQueueCommand();
			return;
		}
		if (FILTER_QUEUE_ACTION_IDS.has(actionId)) {
			await this.invokeIslandSasiAction(actionId);
			return;
		}
		if (actionId === 'open-api-scene' || actionId === API_SCENE_SELF_ID) {
			this.openApiScene();
			return;
		}
		if (actionId === SETTINGS_OPEN_ID) {
			this.openSettings();
			return;
		}
		if (actionId === 'check_plugin_updates' || actionId === 'update_all_plugins') {
			void this.runPluginUpdateAction(actionId);
			return;
		}
		if (actionId === 'browse_community_plugins' || actionId === 'open_restricted_mode') {
			this.runPluginNativeAction(actionId);
			return;
		}
		if (actionId === PROPS_ADD_PROPERTY_ACTION_ID || actionId === PROPS_ADD_PROPERTY_COMMAND_ID) {
			void this.addPropertyCommand();
			return;
		}
		if (actionId.startsWith('command:')) {
			executeObsidianCommand(this.app, actionId.slice('command:'.length));
			return;
		}
		if (
			actionId === TOOLBAR_REVEAL_ACTIVE_FILE_ID ||
			actionId === TOOLBAR_TOGGLE_EXPANSION_ID ||
			actionId === TOOLBAR_SEARCHBOX_ID ||
			actionId === SEARCH_CYCLE_CATEGORY_ID ||
			actionId === SEARCH_CREATE_TARGET_ID ||
			actionId === TOOLBAR_SCENE_MENU_ID ||
			actionId === TOOLBAR_VIEW_MENU_ID ||
			actionId === TOOLBAR_SORT_MENU_ID ||
			actionId === 'scene_menu' ||
			actionId === 'view_menu' ||
			actionId === 'sort_menu' ||
			actionId === 'tabs' ||
			actionId === 'view' ||
			actionId === 'sort' ||
			actionId === 'toggle-expansion'
		) {
			void this.invokeToolbarSasiAction(actionId);
			return;
		}
		if (this.sasiCommandPublisher.isPublishable(actionId)) {
			const entry = this.sasiCommandPublisher.snapshot().find((e) => e.id === actionId);
			if (entry?.descriptor?.handler) {
				const handler = entry.descriptor.handler;
				if (typeof handler === 'function') {
					if (handler.length === 0) {
						void (handler as () => void | Promise<void>)();
					} else {
						(handler as (checking: boolean) => boolean)(false);
					}
				}
			}
		}
	}

	openApiScene(): void {
		new SasiInspectorModal(this.app, this).open();
	}

	showDragActionGuide(text: string): void {
		const dragManager = this.dragManagerLike();
		if (typeof dragManager?.setAction === 'function') {
			dragManager.setAction(text);
		}
	}

	clearDragActionGuide(): void {
		const dragManager = this.dragManagerLike();
		if (typeof dragManager?.setAction === 'function') {
			dragManager.setAction(null);
		}
	}

	private async vaultmanFrameForCommand(): Promise<VaultmanFrame | null> {
		const leaf = await this.ensureVaultmanFrame();
		if (!leaf) return null;
		const view = leaf.view;
		return view instanceof VaultmanFrame ? view : null;
	}

	private async invokeToolbarSasiAction(actionId: string): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.invokeToolbarSasiAction?.(actionId);
	}

	private async invokeIslandSasiAction(actionId: string): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.invokeIslandSasiAction?.(actionId);
	}

	/**
	 * U200-L2: snapshots planos para los guardas tab/group. Solo API publica
	 * (`activeLeaf`, `rootSplit`, `parent`, `getContainer`); `children` se lee
	 * por cast con chequeo de forma: cualquier anomalia lanza hacia dentro y
	 * el runner degrada a Notice + false. Nunca lanza hacia el toolbar.
	 */
	private orderedMainTabGroups(): { ids: string[]; activeId: string | null } {
		const ids: string[] = [];
		let activeId: string | null = null;
		const activeParent = this.app.workspace.activeLeaf?.parent ?? null;
		const visit = (node: unknown): void => {
			if (node instanceof WorkspaceTabs) {
				const id = `group:${ids.length}`;
				ids.push(id);
				if (node === activeParent) activeId = id;
				return;
			}
			const children = (node as { children?: unknown }).children;
			if (!Array.isArray(children)) {
				throw new Error('U200-L2: unexpected workspace shape');
			}
			for (const child of children) visit(child);
		};
		visit(this.app.workspace.rootSplit);
		return { ids, activeId };
	}

	private activeLeafIsPopout(): boolean {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf) return false;
		return !(activeLeaf.getContainer() instanceof WorkspaceRoot);
	}

	private tabMoveSnapshot(): TabMoveLayoutSnapshot {
		const groups = this.orderedMainTabGroups();
		return {
			groupIds: groups.ids,
			activeGroupId: groups.activeId,
			hasActiveLeaf: this.app.workspace.activeLeaf !== null,
			isPopout: this.activeLeafIsPopout(),
		};
	}

	private groupMoveSnapshot(): GroupMoveLayoutSnapshot {
		const groups = this.orderedMainTabGroups();
		return {
			groupIds: groups.ids,
			activeGroupId: groups.activeId,
			isPopout: this.activeLeafIsPopout(),
		};
	}

	private runTabMoveCommand(
		direction: TabMoveDirection,
		checking: boolean,
	): boolean {
		try {
			const resolution = resolveTabMoveTarget(
				this.tabMoveSnapshot(),
				direction,
			);
			if (!resolution.ok) {
				if (!checking) {
					new Notice(translate(guardMessageKey(resolution.reason)));
				}
				return false;
			}
			if (checking) return true;
			// Esqueleto: el guarda pasa pero el movimiento interno que muta el
			// workspace esta diferido (sin API publica de grid). No-op honesto.
			new Notice(translate('sasi.move.tab_group.coming_soon'));
			return true;
		} catch {
			if (!checking) {
				new Notice(translate('sasi.move.tab.unknown_target'));
			}
			return false;
		}
	}

	private runGroupMoveCommand(
		direction: GroupMoveDirection,
		checking: boolean,
	): boolean {
		try {
			const resolution = resolveGroupMoveTarget(
				this.groupMoveSnapshot(),
				direction,
			);
			if (!resolution.ok) {
				if (!checking) {
					new Notice(translate(guardMessageKey(resolution.reason)));
				}
				return false;
			}
			if (checking) return true;
			// Esqueleto: igual que runTabMoveCommand, movimiento diferido.
			new Notice(translate('sasi.move.tab_group.coming_soon'));
			return true;
		} catch {
			if (!checking) {
				new Notice(translate('sasi.move.tab.unknown_target'));
			}
			return false;
		}
	}

	private runToggleMaximizeCommand(checking: boolean): boolean {
		try {
			const leaves = this.app.workspace.getLeavesOfType(
				VAULTMAN_FRAME_TYPE,
			);
			const resolution = resolveToggleMaximize({
				hasVaultmanLeaf: leaves.length > 0,
			});
			if (!resolution.ok) {
				if (!checking) {
					new Notice(translate(maximizeGuardMessageKey()));
				}
				return false;
			}
			if (checking) return true;
			this.l2PanelMaximized = nextMaximizedState(this.l2PanelMaximized);
			activeDocument.body.classList.toggle(
				MAXIMIZE_BODY_CLASS,
				this.l2PanelMaximized,
			);
			return true;
		} catch {
			if (!checking) {
				new Notice(translate(maximizeGuardMessageKey()));
			}
			return false;
		}
	}

	runFocusWorkspaceSurface(target: WorkspaceFocusTarget): boolean {
		const workspace = this.app.workspace as any;
		if (!workspace) return false;
		let split: any = null;
		if (target === 'leftSidebar') {
			split = workspace.leftSplit;
			if (split?.collapsed && typeof split.expand === 'function') {
				split.expand();
			}
		} else if (target === 'rightSidebar') {
			split = workspace.rightSplit;
			if (split?.collapsed && typeof split.expand === 'function') {
				split.expand();
			}
		} else if (target === 'mainArea') {
			split = workspace.rootSplit;
		}
		if (!split) return false;
		const leaf = findActiveLeafInSplit<WorkspaceLeaf>(split);
		if (leaf && typeof workspace.setActiveLeaf === 'function') {
			workspace.setActiveLeaf(leaf, { focus: true });
			return true;
		}
		return false;
	}

	private async focusVaultmanContentSearch(
		query?: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.focusContentSearch(query, modifiers);
	}

	/**
	 * Public entry point for other services — the editor menu's "search selection
	 * in Vaultman" uses it. Kept separate from the private command helper so the
	 * BT5-067 guards, which slice `main.ts` between those two private methods,
	 * still describe the block they were written for.
	 */
	async openContentSearchWithQuery(
		query: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> {
		await this.focusVaultmanContentSearch(query, modifiers);
	}

	private async focusVaultmanExplorerSearch(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) await view.focusActiveExplorerSearch();
	}

	/**
	 * U130: comandos SASI de instancia de escena. Llegan al frame vivo por la
	 * ruta idempotente BT5-067 (revela o abre, nunca cierra).
	 */
	async setSceneEngineCommand(
		surface: SceneEngineSurface,
		mode: ExplorerViewMode,
	): Promise<void> {
		// Reference sceneEngineActionId/sceneEngineLabelKey/sceneEngineModes/SCENE_ENGINE_SURFACES for test contracts
		void [SCENE_ENGINE_SURFACES, sceneEngineModes, sceneEngineActionId, sceneEngineLabelKey];
		const view = await this.vaultmanFrameForCommand();
		view?.setSceneEngine(surface, mode);
	}

	private async changeActiveEngineCommand(mode: ExplorerViewMode): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		view?.setSceneEngine(undefined, mode);
	}

	private async goToApiSceneCommand(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view && this.settings.showSasiInSceneMenu) {
			view.switchScene('apiscene');
		} else {
			this.openApiScene();
		}
	}

	private async switchSceneCommand(tab: StatisticsDataTab): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		view?.switchScene(tab);
	}

	private async goToSettingSceneCommand(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		view?.switchScene('plugins');
	}

	private async addPropertyCommand(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		if (view) {
			await view.addPropertyInReveal();
		}
	}

	private async openFilterSceneCommand(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		view?.openFilterScene();
	}

	private async openQueueCommand(): Promise<void> {
		const view = await this.vaultmanFrameForCommand();
		view?.openQueue();
	}

	private readonly handleVaultmanDragOver = (event: DragEvent): void => {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;

		if (this.isWorkspaceTabDropTarget(event.target)) {
			if (this.hasNativeFileDragPayload()) return;
			if (!this.fileDragNodes(payload).length) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(this.fileTabDropAction(payload));
			return;
		}

		const nodes = propertyDragNodes(payload);
		if (nodes.length > 0 && isMarkdownDropTarget(event.target)) {
			event.preventDefault();
			event.stopPropagation();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(this.propertyDropAction(nodes));
			return;
		}

		const tagNodes = tagDragNodes(payload);
		if (tagNodes.length > 0 && isMarkdownDropTarget(event.target)) {
			event.preventDefault();
			event.stopPropagation();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			this.showDragActionGuide(
				`Append ${tagNodes.length === 1 ? 'tag' : 'tags'}`,
			);
		}
	};

	private readonly handleVaultmanDrop = (event: DragEvent): void => {
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;

		if (this.isWorkspaceTabDropTarget(event.target)) {
			if (this.hasNativeFileDragPayload()) return;
			const files = this.filesFromDragPayload(payload);
			if (files.length === 0) return;
			event.preventDefault();
			event.stopPropagation();
			void this.openDroppedFilesInNewTabs(files);
			this.clearDragActionGuide();
			return;
		}

		const nodes = propertyDragNodes(payload);
		if (nodes.length > 0) {
			if (!isMarkdownDropTarget(event.target)) return;
			const view =
				this.markdownViewFromDropTarget(event.target) ??
				this.app.workspace.getActiveViewOfType(MarkdownView);
			const file = view?.file ?? this.app.workspace.getActiveFile();
			if (!file) return;

			event.preventDefault();
			event.stopPropagation();
			void this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				applyPropertyDragNodesToFrontmatter(
					frontmatter as Record<string, unknown>,
					nodes,
				);
			});
			this.clearDragActionGuide();
			return;
		}

		const tagNodes = tagDragNodes(payload);
		if (tagNodes.length === 0) return;
		if (!isMarkdownDropTarget(event.target)) return;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		event.preventDefault();
		event.stopPropagation();
		const tagText = tagTextForDrop(tagNodes);
		if (shouldAppendTagDrop(event.target)) {
			appendTagsToMarkdownView(view, tagText);
		} else {
			const editor = view.editor;
			const cursor = editor.getCursor();
			const lineText = editor.getLine(cursor.line);
			const separator = tagSeparatorBeforeCaret(lineText, cursor.ch);
			const trailing = tagSeparatorAfterCaret(lineText, cursor.ch);
			editor.replaceRange(separator + tagText + trailing, cursor);
		}
		this.clearDragActionGuide();
	};

	private readonly handleVaultmanDragEnd = (event: DragEvent): void => {
		if (!readVaultmanDragPayload(event)) return;
		this.clearDragActionGuide();
		const dragManager = this.dragManagerLike();
		if (dragManager && 'draggable' in dragManager) {
			dragManager.draggable = null;
		}
	};

	private dragManagerLike(): {
		draggable?: unknown;
		setAction?: (text: string | null) => void;
	} | null {
		return (
			(
				this.app as unknown as {
					dragManager?: {
						draggable?: unknown;
						setAction?: (text: string | null) => void;
					};
				}
			).dragManager ?? null
		);
	}

	private hasNativeFileDragPayload(): boolean {
		const draggable = this.dragManagerLike()?.draggable as
			| { type?: unknown }
			| null
			| undefined;
		return draggable?.type === 'file' || draggable?.type === 'files';
	}

	private isWorkspaceTabDropTarget(target: EventTarget | null): boolean {
		if (typeof HTMLElement === 'undefined') return false;
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest(
				'.workspace-tab-header, .workspace-tab-header-container, .workspace-tab-header-container-inner, .workspace-tab-header-new-tab, .workspace-tab-header-spacer',
			),
		);
	}

	private markdownViewFromDropTarget(
		target: EventTarget | null,
	): MarkdownView | null {
		if (typeof HTMLElement === 'undefined') return null;
		if (!(target instanceof HTMLElement)) return null;
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			if (view.containerEl.contains(target)) return view;
		}
		return null;
	}

	private fileDragNodes(
		payload: VaultmanDragPayload,
	): Array<Extract<VaultmanDragNodePayload, { kind: 'file' }>> {
		const nodes = payload.selection?.length ? payload.selection : [payload];
		return nodes.filter(
			(node): node is Extract<VaultmanDragNodePayload, { kind: 'file' }> =>
				node.kind === 'file',
		);
	}

	private filesFromDragPayload(payload: VaultmanDragPayload): TFile[] {
		return this.fileDragNodes(payload)
			.map((node) => this.app.vault.getAbstractFileByPath(node.path))
			.filter((file): file is TFile => file instanceof TFile);
	}

	private async openDroppedFilesInNewTabs(files: TFile[]): Promise<void> {
		for (const file of files) {
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(file, { active: true });
		}
	}

	private fileTabDropAction(payload: VaultmanDragPayload): string {
		const count = this.fileDragNodes(payload).length;
		return count === 1
			? 'Open file in new tab'
			: `Open ${count} files in new tabs`;
	}

	private propertyDropAction(nodes: VaultmanDragNodePayload[]): string {
		if (nodes.length === 1) {
			const node = nodes[0];
			if (node.kind === 'property') return `Set property "${node.property}"`;
			if (node.kind === 'property-value')
				return `Set "${node.property}" frontmatter`;
		}
		return `Set ${nodes.length} frontmatter entries`;
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		setLanguage(this.settings.language);
		this.queueService?.setBypassOperations(this.settings.bypassOperations);
		this.iconicService?.setEnabled(this.settings.iconicEnabled !== false);
		this.updateGlassBlur();
		this.notifySettingsChanged();
	}

	async loadSettings(): Promise<void> {
		const saved = ((await this.loadData()) ?? {}) as Partial<VaultmanSettings>;
		const hasSavedTabLabelPref = Object.prototype.hasOwnProperty.call(
			saved,
			'filtersShowTabLabels',
		);
		const needsTabLabelMigration = saved.filtersTabLabelsMigrated !== true;

		this.settings = {
			...(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as VaultmanSettings),
			...saved,
			taskCellDisplayMode: migrateTaskCellDisplayMode(saved.taskCellDisplayMode),
		};

		// La reconciliación espera a que el workspace restaure las hojas, o la
		// lista de anclas vivas saldría vacía y marcaría tombstone en todo.
		this.app.workspace.onLayoutReady(() => {
			this.settings.instanceRegistry = reconcileRegistry(
				this.settings.instanceRegistry,
				this.collectLiveInstanceAnchors(),
			);
		});

		if (needsTabLabelMigration) {
			if (hasSavedTabLabelPref && saved.filtersShowTabLabels === false) {
				this.settings.filtersShowTabLabels = true;
			}
			this.settings.filtersTabLabelsMigrated = true;
			await this.saveData(this.settings);
		}

		// BT5: seed the default View Compositions once. Deleting them sticks
		// because the flag is only ever set, never cleared.
		if (saved.viewCompositionsSeeded !== true) {
			this.settings.savedLayouts = seedDefaultViewCompositions(
				this.settings.savedLayouts,
			);
			this.settings.viewCompositionsSeeded = true;
			await this.saveData(this.settings);
		}

		// BT5-025: a legacy individual glyph color (red/blue/…) folds into the
		// shared palette as `custom` with its documented hex.
		const migratedGlyph = normalizeGlyphColorChoice(saved.tocGlyphColor);
		if (
			saved.tocGlyphColor !== undefined &&
			migratedGlyph.choice !== saved.tocGlyphColor
		) {
			this.settings.tocGlyphColor = migratedGlyph.choice;
			if (migratedGlyph.migratedCustom) {
				this.settings.tocGlyphCustomColor = migratedGlyph.migratedCustom;
			}
			await this.saveData(this.settings);
		}

		// U130: legacy `sidebar` value migrates to `left_sidebar`.
		if ((this.settings.openMode as string) === 'sidebar') {
			this.settings.openMode = 'left_sidebar';
			await this.saveData(this.settings);
		}
	}

	runPluginNativeAction(id: 'browse_community_plugins' | 'open_restricted_mode'): void {
		if (id === 'browse_community_plugins') {
			browseCommunityPlugins(this.app);
			return;
		}
		openRestrictedModeSetting(this.app);
	}

	async runPluginUpdateAction(id: 'check_plugin_updates' | 'update_all_plugins'): Promise<void> {
		if (id === 'check_plugin_updates') {
			const result = await this.pluginUpdatesService.checkPluginUpdates();
			if (!result.availability.available) new Notice(result.availability.reason ?? translate('addons.update_failed'));
			return;
		}
		await this.pluginUpdatesService.waitForCheck();
		const items = this.pluginUpdatesService.snapshotPluginUpdateItems();
		if (items.length === 0) return;
		const batch = await this.queueService.runPluginUpdates(items, this.pluginUpdatesService, { selfUpdateId: this.manifest.id });
		if (batch.items.some((item) => item.status !== 'success')) new Notice(translate('addons.update_failed'));
	}

	async saveSettings(): Promise<void> {
		this.lastOpenedService?.setRecordAllOpens(
			this.settings.recordAllFileOpens === true,
		);
		// Notify listeners so UI reacts immediately; persist in the background (the
		// in-memory settings are already the source of truth).
		this.notifySettingsChanged();
		await this.saveData(this.settings);
	}

	/**
	 * U130 chrome-hover: puente SASI -> adapter. Cada comando de hover/pin/
	 * hide/lock/nested conmuta su switch en los settings, lo persiste y lo
	 * aplica al adapter en caliente via updateConfig (que re-sincroniza las
	 * clases mb-hide, mb-nested-hover-ribbon y mb-hover-locked del body).
	 * Sin este puente, publicar el comando crea una entrada de paleta que no
	 * llama a nada (fallo verificado en sesion 2026-09-06).
	 */
	applyHoverSurfacesSettings(): void {
		const s = this.settings.hoverSurfaces;
		this.hoverSurfacesAdapter.updateConfig({
			sidebars: { ...s.sidebars },
			ribbons: { ...s.ribbons },
			tabbar: { ...s.tabbar },
			navbar: { ...s.navbar },
			statusbar: { ...s.statusbar },
			lock: s.lock,
			nestedRibbon: s.nestedRibbon,
		});
	}

	private toggleHoverSurfaceSwitch(
		surface: (typeof HOVER_SURFACE_IDS)[number],
		kind: 'hide' | 'hover' | 'pin',
	): void {
		const s = this.settings.hoverSurfaces;
		s[surface] = { ...s[surface], [kind]: !s[surface][kind] };
		this.applyHoverSurfacesSettings();
		void this.saveSettings();
	}

	private toggleHoverSurfaceLock(): void {
		this.settings.hoverSurfaces.lock = !this.settings.hoverSurfaces.lock;
		this.applyHoverSurfacesSettings();
		void this.saveSettings();
	}

	private toggleHoverSurfaceNestedRibbon(): void {
		this.settings.hoverSurfaces.nestedRibbon =
			!this.settings.hoverSurfaces.nestedRibbon;
		this.applyHoverSurfacesSettings();
		void this.saveSettings();
	}

	private showUpdatesIfNeeded(): void {
		const currentVersion = this.manifest.version;
		if (
			!shouldShowUpdates(this.settings.lastSeenUpdatesVersion, currentVersion)
		) {
			return;
		}
		this.settings.lastSeenUpdatesVersion = currentVersion;
		void this.saveData(this.settings);
		this.showUpdatesNotice(currentVersion);
	}

	openSettings(): boolean {
		const appWithSetting = this.app as unknown as {
			setting?: {
				open?: () => void;
				openTabById?: (id: string) => unknown;
			};
		};
		const setting = appWithSetting.setting;
		if (!setting?.open || !setting.openTabById) return false;
		setting.open();
		setting.openTabById(this.manifest.id);
		return true;
	}

	private openUpdates(): void {
		new UpdatesModal(this.app, this.manifest.version).open();
	}

	private showUpdatesNotice(version: string): void {
		const fragment = createFragment();
		const message = createDiv();
		message.textContent = translate('updates.notice', { version });
		fragment.appendChild(message);

		const bulletinButton = createEl('button');
		bulletinButton.className = 'mod-cta';
		bulletinButton.textContent = translate('updates.view_bulletin');
		fragment.appendChild(bulletinButton);

		const dismissButton = createEl('button');
		dismissButton.textContent = translate('updates.dismiss');
		fragment.appendChild(dismissButton);

		const notice = new Notice(fragment, 0);
		bulletinButton.addEventListener('click', () => {
			try {
				openUpdatesBulletin(version);
				notice.hide();
			} catch {
				new Notice(translate('updates.open_failed'));
			}
		});
		dismissButton.addEventListener('click', () => notice.hide());
	}

	onSettingsChange(listener: () => void): () => void {
		this.settingsChangeListeners.add(listener);
		return () => {
			this.settingsChangeListeners.delete(listener);
		};
	}

	private notifySettingsChanged(): void {
		for (const listener of [...this.settingsChangeListeners]) {
			try {
				listener();
			} catch (error) {
				console.error('Vaultman settings listener failed', error);
			}
		}
	}

	updateGlassBlur(): void {
		applyGlassBlurSetting(activeDocument.body.style, this.settings);
	}

	async openWorkspaceInstance(
		instanceId: string,
		surface?: SurfaceRequest,
	): Promise<OpenWorkspaceInstanceResult<WorkspaceLeaf>> {
		const record = this.settings.instanceRegistry?.instances[instanceId];
		if (!record || record.tombstoned) {
			return this.surfaceHost.openWorkspaceInstance(instanceId, surface);
		}
		const enrolled = this.enrollExactLiveFrame(instanceId);
		if (enrolled && !enrolled.ok) {
			return { ok: false, reason: 'mount-conflict', ownerId: enrolled.ownerId };
		}
		const opened = await this.surfaceHost.openWorkspaceInstance(instanceId, surface);
		if (opened.ok) {
			this.lastFocusedFrameLeaf = opened.address.leaf;
			this.app.workspace.setActiveLeaf(opened.address.leaf, { focus: true });
		}
		return opened;
	}

	/** Declares a durable home; openWorkspaceInstance accepts one-open overrides. */
	async createAndOpenWorkspaceInstance(
		homeSurface: HomeSurfaceIntent = DEFAULT_HOME_SURFACE,
		customId?: string,
	): Promise<OpenWorkspaceInstanceResult<WorkspaceLeaf>> {
		const registry = this.settings.instanceRegistry ?? { schema: 1, instances: {} };
		const instanceId =
			customId && customId.trim().length > 0
				? customId.trim()
				: mintInstanceId(registry);
		this.settings.instanceRegistry = declareWorkspaceInstance(
			registry,
			instanceId,
			homeSurface,
		);
		await this.saveSettings();
		return this.openWorkspaceInstance(instanceId);
	}

	workspaceMountForLeaf(leaf: WorkspaceLeaf): InstanceMountLease<WorkspaceLeaf> | undefined {
		return this.instanceMounts.getByLeaf(leaf);
	}

	adoptWorkspaceMount(
		instanceId: string,
		leaf: WorkspaceLeaf,
	): MountReservationResult<WorkspaceLeaf> {
		const address = addressForLeaf(this.app.workspace, leaf, this.isRtlDirection());
		return this.instanceMounts.adopt(instanceId, leaf, address);
	}

	readdressWorkspaceMount(leaf: WorkspaceLeaf): boolean {
		const lease = this.instanceMounts.getByLeaf(leaf);
		if (!lease) return false;
		return this.instanceMounts.readdress(
			lease,
			addressForLeaf(this.app.workspace, leaf, this.isRtlDirection()),
		);
	}

	releaseWorkspaceMount(lease: InstanceMountLease<WorkspaceLeaf>): boolean {
		return this.instanceMounts.release(lease);
	}

	async relocateWorkspaceInstance(
		instanceId: string,
		target: 'left-sidebar' | 'right-sidebar' | 'main-leaf',
	): Promise<boolean> {
		const currentLease = this.instanceMounts.get(instanceId);
		const oldLeaf = currentLease?.address.leaf;

		const currentPos: 'left-sidebar' | 'right-sidebar' | 'main-leaf' =
			currentLease?.address.kind === 'main'
				? 'main-leaf'
				: currentLease?.address.edge === (this.isRtlDirection() ? 'end' : 'start')
					? 'left-sidebar'
					: 'right-sidebar';

		if (currentPos === target && oldLeaf) {
			await this.app.workspace.revealLeaf(oldLeaf);
			this.app.workspace.setActiveLeaf(oldLeaf, { focus: true });
			return true;
		}

		if (currentLease) {
			this.instanceMounts.release(currentLease);
		}

		const surfaceIntent: HomeSurfaceIntent =
			target === 'main-leaf'
				? { kind: 'main' }
				: target === 'left-sidebar'
					? this.sidebarSurfaceForPhysical('left')
					: this.sidebarSurfaceForPhysical('right');

		if (oldLeaf) {
			oldLeaf.detach();
		}

		const result = await this.surfaceHost.openWorkspaceInstance(instanceId, surfaceIntent);
		if (result.ok) {
			this.lastFocusedFrameLeaf = result.address.leaf;
			this.app.workspace.setActiveLeaf(result.address.leaf, { focus: true });

			const registry = this.settings.instanceRegistry ?? { schema: 1, instances: {} };
			if (registry.instances[instanceId]) {
				registry.instances[instanceId] = {
					...registry.instances[instanceId],
					homeSurface: surfaceIntent,
					surfacePosition: target,
					lastActiveAt: Date.now(),
				};
				this.settings.instanceRegistry = registry;
				await this.saveSettings();
			}
			return true;
		}
		return false;
	}

	async splitWorkspaceInstance(instanceId: string): Promise<boolean> {
		const currentLease = this.instanceMounts.get(instanceId);
		const oldLeaf = currentLease?.address.leaf;

		const currentPos: 'left-sidebar' | 'right-sidebar' | 'main-leaf' =
			currentLease?.address.kind === 'main'
				? 'main-leaf'
				: currentLease?.address.edge === (this.isRtlDirection() ? 'end' : 'start')
					? 'left-sidebar'
					: 'right-sidebar';

		let splitLeaf: WorkspaceLeaf | null = null;
		if (currentPos === 'left-sidebar') {
			splitLeaf = this.app.workspace.getLeftLeaf(true);
		} else if (currentPos === 'right-sidebar') {
			splitLeaf = this.app.workspace.getRightLeaf(true);
		} else {
			if (oldLeaf) {
				splitLeaf = this.app.workspace.createLeafBySplit(oldLeaf, 'horizontal');
			} else {
				splitLeaf = this.app.workspace.getLeftLeaf(true);
			}
		}

		if (!splitLeaf) return false;

		if (currentLease) {
			this.instanceMounts.release(currentLease);
		}
		if (oldLeaf) {
			oldLeaf.detach();
		}

		const adopted = this.adoptWorkspaceMount(instanceId, splitLeaf);
		if (!adopted.ok) return false;

		await splitLeaf.setViewState({
			type: VAULTMAN_FRAME_TYPE,
			active: true,
			state: { workspaceInstanceId: instanceId },
		});
		await this.app.workspace.revealLeaf(splitLeaf);
		this.lastFocusedFrameLeaf = splitLeaf;
		this.app.workspace.setActiveLeaf(splitLeaf, { focus: true });
		return true;
	}

	private enrollExactLiveFrame(
		instanceId: string,
	): MountReservationResult<WorkspaceLeaf> | null {
		for (const leaf of this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)) {
			if (!(leaf.view instanceof VaultmanFrame)) continue;
			if (!leaf.view.hasExactWorkspaceInstanceIdentity()) continue;
			if (leaf.view.workspaceInstanceId !== instanceId) continue;
			return this.adoptWorkspaceMount(instanceId, leaf);
		}
		return null;
	}

	private isRtlDirection(): boolean {
		return (
			activeDocument.defaultView?.getComputedStyle(activeDocument.documentElement)
				.direction === 'rtl'
		);
	}

	private sidebarSurfaceForPhysical(
		side: 'left' | 'right',
	): Extract<HomeSurfaceIntent, { kind: 'sidebar' }> {
		const edge = side === 'left'
			? this.isRtlDirection()
				? 'end'
				: 'start'
			: this.isRtlDirection()
				? 'start'
				: 'end';
		return { kind: 'sidebar', edge };
	}

	/** Los IDs anclados en las hojas que Obsidian acaba de restaurar. */
	collectLiveInstanceAnchors(): string[] {
		const anchors: string[] = [];
		for (const leaf of this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE)) {
			const state = leaf.getViewState().state as { workspaceInstanceId?: string } | undefined;
			if (state?.workspaceInstanceId) anchors.push(state.workspaceInstanceId);
		}
		return anchors;
	}

	/**
	 * Open a frame and reveal it. Never closes one. `explicitMode` bypasses
	 * the setting (ribbon alt-cmenu): the new instance lands where asked.
	 */
	private async openVaultmanView(
		explicitMode?: 'left_sidebar' | 'right_sidebar' | 'main',
	): Promise<WorkspaceLeaf | null> {
		const mode = normalizeOpenMode(explicitMode ?? this.settings.openMode);
		const surface =
			mode === 'left_sidebar'
				? this.sidebarSurfaceForPhysical('left')
				: mode === 'right_sidebar'
					? this.sidebarSurfaceForPhysical('right')
					: DEFAULT_HOME_SURFACE;
		const opened = await this.createAndOpenWorkspaceInstance(surface);
		return opened.ok ? opened.address.leaf : null;
	}

	/**
	 * U130 polishing: the `Open Vaultman` ribbon node gets its own
	 * alt-cmenu (right-click like the toolbar): location options for where
	 * the NEW instance opens. Click behavior is untouched.
	 */
	private openRibbonLocationMenu(event: MouseEvent): void {
		event.preventDefault();
		event.stopImmediatePropagation();
		const menu = new Menu();
		menu.addItem((item) => {
			item
				.setTitle(translate('ribbon.open.left_sidebar'))
				.setIcon('lucide-panel-left')
				.onClick(() => {
					void this.openVaultmanView('left_sidebar');
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(translate('ribbon.open.main'))
				.setIcon('lucide-app-window')
				.onClick(() => {
					void this.openVaultmanView('main');
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(translate('ribbon.open.right_sidebar'))
				.setIcon('lucide-panel-right')
				.onClick(() => {
					void this.openVaultmanView('right_sidebar');
				});
		});
		menu.showAtMouseEvent(event);
	}

	/**
	 * The explicit `Open Vaultman` command: a toggle in sidebar/main mode,
	 * always an extra frame in new_instance mode.
	 */
	async activateView(): Promise<void> {
		if (
			this.settings.openVaultmanBehavior === 'search_modal' ||
			(this.settings.openMode as string) === 'search_modal'
		) {
			new InstanceSearchModal(this.app, this).open();
			return;
		}
		const existingLeaves = this.app.workspace.getLeavesOfType(
			VAULTMAN_FRAME_TYPE,
		);
		if (
			shouldToggleCloseFrame(
				this.settings.openMode,
				existingLeaves.length,
			)
		) {
			for (const leaf of existingLeaves) leaf.detach();
			return;
		}
		await this.openVaultmanView();
	}

	/**
	 * BT5-067: the idempotent route for every command that needs a frame to act
	 * on. Reveals an existing frame, opens one when there is none, and never
	 * detaches — going through `activateView` here is what made the focus
	 * commands close Vaultman instead of focusing it.
	 */
	async ensureVaultmanFrame(): Promise<WorkspaceLeaf | null> {
		const existing = selectCommandFrame(
			this.app.workspace.getLeavesOfType(VAULTMAN_FRAME_TYPE),
			this.lastFocusedFrameLeaf,
		);
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			this.app.workspace.setActiveLeaf(existing, { focus: true });
			return existing;
		}
		return this.openVaultmanView();
	}
}

export default VaultmanPlugin;
