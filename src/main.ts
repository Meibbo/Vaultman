//********************************************************************\\
//*      ___|^___^|___      .-~*´¨¯¨¯¯¨¯¨`*~-.     ___|^___^|___     *\\
//*     |   Meibbo   |     | Vaultman v1.0.0 |    | April 2026 |     *\\
//*     \___/`*´\___/      `-~*´¨¯¨¯¯¨¯¨`*~-´     \___/`*´\___/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*     (づ￣ 3￣)づ    ☆*: .｡. o(≧▽≦)o .｡.:*☆     ╰(*°▽°*)╯      *\\
//********************************************************************\\

/*------------------————————————————————————————————-------------------/
/########|||-------|                                |------|||#########/
/#===°°===°°===°°==|      Main TypeScript File      |==°°===°°===°°===#/
/########|||-------|                                |------|||#########/
/-------------------————————————————————————————————------------------*/
//        Here is defined the connection between the different        \\
//    services and modules that Obsidian uses to communicate with     \\
//    the plugin, then the declared foundation of components that     \\
//    will be used throughout                       \\
//--------------------------------------------------------------------//

//...----------—————————————(   IMPORTS   )————————————------------...\\
import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { PropertyIndexService } from './index/utilPropIndex';
import { FilterService } from './services/serviceFilter.svelte';
import { OperationQueueService } from './services/serviceQueue.svelte';
import { VaultmanFrame, TYPE_FRAME_VM } from './types/typeFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './types/typeProp';
import { ContextMenuService } from './services/serviceCMenu';
import { VaultmanSettingsTab } from './settingsVM';
import { translate } from './index/i18n/lang';
import { createFilesIndex } from './index/indexFiles';
import { createTagsIndex } from './index/indexTags';
import { createPropsIndex } from './index/indexProps';
import { createContentIndex } from './index/indexContent';
import { createOperationsIndex } from './index/indexOperations';
import { createActiveFiltersIndex } from './index/indexActiveFilters';
import { createCSSSnippetsIndex } from './index/indexSnippets';
import { createCommunityPluginsIndex } from './index/indexPlugins';
import { createTemplatesIndex } from './services/serviceTemplatesIndex';
import { OverlayStateService } from './services/serviceOverlayState.svelte';
import { DecorationManager } from './services/serviceDecorate';
import { ViewService } from './services/serviceViews.svelte';
import { ExplorerDataPlaneService } from './services/serviceExplorerDataPlane.svelte';
import { createPerfProbe } from './dev/perfProbe';
import { registerVaultmanCommands } from './services/serviceCommands';
import { PerfMeter } from './services/perfMeter';
import { DEFAULT_OPS_LOG_RETENTION, OpsLogService } from './services/serviceOpsLog.svelte';
import { LeafDetachService } from './services/serviceLeafDetach';
import { leadingDebounce } from './utils/utilDebounce';
import { NodeBindingService } from './services/serviceNodeBinding';
import { NativeSurfaceBindingService } from './services/serviceNativeSurfaceBinding';
import { resolveLayoutSettings } from './services/serviceLayout';
import { ThemeService } from './services/serviceTheme.svelte';
import { normalizeElasticUiSettings } from './types/typeElasticUi';
import { ALL_TAB_IDS, viewTypeFor, type TabId } from './registry/tabRegistry';
import { VaultmanTabLeafView } from './types/typeTabLeaf';
import type { FnRIslandService } from './services/serviceFnRIsland.svelte';
import type { PanelExplorerImperativeApi } from './types/typeExplorer';
import type {
	IFilesIndex,
	ITagsIndex,
	IPropsIndex,
	IContentIndex,
	IOperationsIndex,
	IActiveFiltersIndex,
	ICSSSnippetsIndex,
	ICommunityPluginsIndex,
	ITemplatesIndex,
	IOverlayState,
	IDecorationManager,
	IViewService,
} from './types/typeContracts';

export class VaultmanPlugin extends Plugin {
	settings!: VaultmanSettings;

	// Core services — public so components/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	themeService!: ThemeService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	contextMenuService!: ContextMenuService;

	// New index interfaces (Sub-A hardening)
	filesIndex!: IFilesIndex;
	tagsIndex!: ITagsIndex;
	propsIndex!: IPropsIndex;
	contentIndex!: IContentIndex;
	operationsIndex!: IOperationsIndex;
	activeFiltersIndex!: IActiveFiltersIndex;
	cssSnippetsIndex!: ICSSSnippetsIndex;
	pluginsIndex!: ICommunityPluginsIndex;
	templatesIndex!: ITemplatesIndex;
	overlayState!: IOverlayState;
	decorationManager!: IDecorationManager;
	viewService!: IViewService;
	explorerDataPlaneService!: ExplorerDataPlaneService;

	// Native status bar element
	private statusBarEl!: HTMLElement;
	private uninstallPerfProbe?: () => void;

	/** Bounded ops-log buffer. Subscribes to PerfMeter + queue events. */
	opsLogService!: OpsLogService;

	/** Per-tab detach state (phase 6, multifacet wave 2). */
	leafDetachService!: LeafDetachService;

	/** Binding-note resolver (phase 7, multifacet wave 2). */
	nodeBindingService!: NodeBindingService;
	nativeSurfaceBindingService!: NativeSurfaceBindingService;

	/**
	 * Frame-level registries populated by mounted Svelte components so
	 * the multifacet wave 2 commands can talk to the active panel
	 * without a full reactive subscription.
	 */
	activeFnRIslandService: FnRIslandService | null = null;
	activePanelExplorerApi: PanelExplorerImperativeApi | null = null;
	openFiltersPopupHook: (() => void) | null = null;
	openQueuePopupHook: (() => void) | null = null;
	openViewMenuHook: (() => void) | null = null;
	openSortMenuHook: (() => void) | null = null;
	openDiffViewHook: (() => void) | null = null;
	openContentSearchHook: ((term: string) => void) | null = null;

	async onload(): Promise<void> {
		// Boot ops-log before the first mark so integration and diagnostics can
		// inspect the whole startup sequence.
		this.opsLogService = new OpsLogService();
		this.opsLogService.bind();
		PerfMeter.mark('vaultman:boot:start');
		await this.loadSettings();
		this.opsLogService.setRetention(this.settings.opsLogRetention ?? DEFAULT_OPS_LOG_RETENTION);
		PerfMeter.mark('vaultman:boot:settings-loaded');

		this.themeService = new ThemeService();
		this.themeService.hydrate(this.settings.elasticUi);

		const pluginsBefore = snapshotInstalledPlugins(this.app);

		PerfMeter.mark('vaultman:boot:index-refresh:start');
		this.filesIndex = createFilesIndex(this.app);
		this.tagsIndex = createTagsIndex(this.app);
		this.propsIndex = createPropsIndex(this.app);
		await Promise.all([
			this.filesIndex.refresh(),
			this.tagsIndex.refresh(),
			this.propsIndex.refresh(),
		]);
		PerfMeter.mark('vaultman:boot:index-refresh:end');

		const debouncedFilesRefresh = leadingDebounce(() => void this.filesIndex.refresh(), 250);
		const debouncedMetadataRefresh = leadingDebounce(() => {
			void this.propsIndex.refresh();
			void this.tagsIndex.refresh();
		}, 250);

		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				debouncedMetadataRefresh();
			}),
		);
		this.registerEvent(this.app.vault.on('create', () => debouncedFilesRefresh()));
		this.registerEvent(this.app.vault.on('delete', () => {
			debouncedFilesRefresh();
			debouncedMetadataRefresh();
		}));
		this.registerEvent(this.app.vault.on('rename', () => {
			debouncedFilesRefresh();
			debouncedMetadataRefresh();
		}));

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app, this.filesIndex);
		this.queueService = new OperationQueueService(this.app);
		this.explorerDataPlaneService = new ExplorerDataPlaneService();

		this.contentIndex = createContentIndex(this.app);
		this.operationsIndex = createOperationsIndex(this.queueService);
		this.activeFiltersIndex = createActiveFiltersIndex(this.filterService);
		this.cssSnippetsIndex = createCSSSnippetsIndex(this.app);
		this.pluginsIndex = createCommunityPluginsIndex(this.app);
		this.templatesIndex = createTemplatesIndex();
		await Promise.all([
			this.contentIndex.refresh(),
			this.operationsIndex.refresh(),
			this.activeFiltersIndex.refresh(),
			this.cssSnippetsIndex.refresh(),
			this.pluginsIndex.refresh(),
			this.templatesIndex.refresh(),
		]);
		this.overlayState = new OverlayStateService();
		this.decorationManager = new DecorationManager(this.app);
		this.viewService = new ViewService({
			decorationManager: this.decorationManager,
			showMatchedFilterDecorations: () =>
				this.settings.explorerShowMatchedFilterDecorations === true,
		});
		const perfProbe = createPerfProbe({
			now: () => activeWindow.performance.now(),
			doc: activeDocument,
		});
		this.uninstallPerfProbe = perfProbe.installGlobal(
			activeWindow as unknown as { __vaultmanPerfProbe?: unknown },
		);
		this.iconicService = new IconicService(this.app);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);
		this.nodeBindingService = new NodeBindingService({
			app: this.app,
			getFolder: () => this.settings.bindingNoteFolder ?? '',
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
		});

		this.addChild(this.propertyIndex);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);
		this.addChild(this.nativeSurfaceBindingService);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				void this.filesIndex.refresh();
			}),
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('vm-native-statusbar');

		this.addRibbonIcon('lucide-dessert', translate('plugin.open'), () => {
			void this.toggleView();
		});

		this.registerView(TYPE_FRAME_VM, (leaf) => new VaultmanFrame(leaf, this));

		// Independent leaf view-types — registered up-front so saved
		// workspace state can re-instantiate them (phase 6).
		for (const tabId of ALL_TAB_IDS) {
			this.registerView(viewTypeFor(tabId), (leaf) => new VaultmanTabLeafView(leaf, tabId, this));
		}

		// LeafDetachService — owns persisted detach flags (independent of
		// Obsidian's workspace file). Spawning is deferred to
		// `onLayoutReady` so it does not race the workspace replay.
		this.leafDetachService = new LeafDetachService({
			store: {
				loadData: () => this.loadData(),
				saveData: (next: unknown) => this.saveData(next),
			},
			host: {
				spawnLeaf: (tabId: TabId) => this.spawnTabLeaf(tabId),
				closeLeaf: (tabId: TabId) => this.closeTabLeaf(tabId),
			},
		});
		await this.leafDetachService.load();

		// Legacy `apply-queue` is preserved for backwards compatibility
		// with users who already bound a hotkey to it. The new
		// `vaultman:process-queue` command is the canonical id going
		// forward.
		this.addCommand({
			id: 'apply-queue',
			name: translate('command.apply_queue'),
			checkCallback: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					void this.queueService.execute();
				}
				return true;
			},
		});

		// Multifacet wave 2 quick-command set (spec shard 03).
		registerVaultmanCommands(this, {
			app: this.app,
			queueService: this.queueService,
			activateView: () => this.activateView(),
			toggleView: () => this.toggleView(),
			getVaultmanLeaf: () => this.app.workspace.getLeavesOfType(TYPE_FRAME_VM)[0] ?? null,
			getActiveFnRIslandService: () => this.activeFnRIslandService,
			getActivePanelExplorerApi: () => this.activePanelExplorerApi,
			openFiltersPopup: () => this.openFiltersPopupHook?.(),
			openQueuePopup: () => this.openQueuePopupHook?.(),
			openViewMenu: () => this.openViewMenuHook?.(),
			openSortMenu: () => this.openSortMenuHook?.(),
			openDiffView: () => this.openDiffViewHook?.(),
		});

		this.addSettingTab(new VaultmanSettingsTab(this.app, this));

		this.opsLogService.bind({ queue: this.queueService });

		this.app.workspace.onLayoutReady(() => {
			PerfMeter.mark('vaultman:boot:end');
			const pluginsAfter = snapshotInstalledPlugins(this.app);
			emitPluginDiff(pluginsBefore, pluginsAfter);
			// Replay independent leaves AFTER Obsidian has finished its
			// own workspace replay. `restore()` is idempotent so a stale
			// workspace file cannot double-spawn.
			void this.leafDetachService.restore();
		});
	}

	/**
	 * Spawn a workspace leaf for the given canonical TabId. Idempotent:
	 * if a leaf of this view-type already exists, reveal it instead.
	 */
	async spawnTabLeaf(tabId: TabId): Promise<void> {
		const viewType = viewTypeFor(tabId);
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(viewType)[0];
		if (existing) {
			void workspace.revealLeaf(existing);
			return;
		}
		const leaf = workspace.getLeaf('tab');
		if (!leaf) return;
		await leaf.setViewState({ type: viewType, active: true });
		void workspace.revealLeaf(leaf);
	}

	/** Detach (close) every leaf of the given canonical TabId's view-type. */
	async closeTabLeaf(tabId: TabId): Promise<void> {
		const viewType = viewTypeFor(tabId);
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		for (const leaf of leaves) leaf.detach();
	}

	onunload(): void {
		this.themeService?.dispose();
		this.uninstallPerfProbe?.();
		this.uninstallPerfProbe = undefined;
		this.opsLogService?.dispose();
		this.filterService.destroy();
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
		};
		this.settings.layout = resolveLayoutSettings(saved.layout);
		this.settings.elasticUi = normalizeElasticUiSettings(saved.elasticUi);

		if (needsTabLabelMigration) {
			if (hasSavedTabLabelPref && saved.filtersShowTabLabels === false) {
				this.settings.filtersShowTabLabels = true;
			}
			this.settings.filtersTabLabelsMigrated = true;
			await this.saveData(this.settings);
		}
	}

	async saveSettings(): Promise<void> {
		if (this.themeService) {
			this.settings.elasticUi.themePresetId = this.themeService.activePresetId;
			this.settings.elasticUi.customPresets = [...this.themeService.customPresets];
		}
		await this.saveData(this.settings);
	}

	async activateView(): Promise<void> {
		const { openMode } = this.settings;

		if (openMode === 'sidebar' || openMode === 'both') {
			await this.openView('sidebar');
		}
		if (openMode === 'main' || openMode === 'both') {
			await this.openView('main');
		}
	}

	async toggleView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(TYPE_FRAME_VM);
		if (leaves.length > 0) {
			for (const leaf of leaves) leaf.detach();
			return;
		}
		await this.activateView();
	}

	async openView(mode: 'sidebar' | 'main'): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(TYPE_FRAME_VM)[0];

		if (!leaf) {
			if (mode === 'sidebar') {
				leaf = workspace.getLeftLeaf(false) || workspace.getRightLeaf(false);
			} else {
				leaf = workspace.getLeaf('tab');
			}

			if (leaf) {
				await leaf.setViewState({
					type: TYPE_FRAME_VM,
					active: true,
				});
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}
}

export default VaultmanPlugin;

/**
 * Best-effort snapshot of installed plugin ids. Obsidian does not expose
 * per-plugin load events, so we approximate by diffing snapshots taken
 * at `onload` start vs `onLayoutReady`. Records are best-effort and may
 * miss plugins that load outside the window.
 */
function snapshotInstalledPlugins(app: unknown): Set<string> {
	try {
		const plugins = (app as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins;
		if (!plugins) return new Set();
		return new Set(Object.keys(plugins));
	} catch {
		return new Set();
	}
}

function emitPluginDiff(before: Set<string>, after: Set<string>): void {
	let recorded = 0;
	for (const id of after) {
		if (before.has(id)) continue;
		PerfMeter.mark(`plugin:loaded:${id}`, 'plugin', { pluginId: id });
		recorded += 1;
	}
	if (recorded === 0 && after.size === before.size) {
		PerfMeter.mark('plugin:loaded:not-measurable', 'plugin');
	}
}
