<script lang="ts">
	import { onMount, setContext, untrack } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import type { explorerFiles } from '../../providers/explorerFiles';
	import type { explorerProps } from '../../providers/explorerProps';
	import type { explorerTags } from '../../providers/explorerTags';
	import StatisticsPage from '../pages/pageStats.svelte';
	import FiltersPage from '../pages/pageFilters.svelte';
	import OperationsPage from '../pages/pageTools.svelte';
	import PopupOverlay from '../layout/overlays/layoutOverlay.svelte';
	import ExplorerQueueComp from '../containers/explorerQueue.svelte';
	import ExplorerActiveFiltersComp from '../containers/explorerActiveFilters.svelte';

	import { translate } from '../../index/i18n/lang';
	import { countActiveFilterEntries } from './frameActiveFilters';
	import { FrameViewportController } from './frameViewport';
	import { FrameNavReorderController } from './frameNavReorder.svelte';
	import { FrameOverlayController, installFrameOverlayCommandHooks } from './frameOverlays.svelte';
	import { createFiltersSearchState, getFiltersSearch, type FiltersSearchState, type FiltersSearchTab } from './frameFiltersSearch';
	import { createFnRState } from '../../services/serviceFnR';
	import type { FnRState } from '../../types/typeFnR';
	import { normalizeOperationScope, type OperationScope } from '../../services/serviceOperationScope';
	import { resolveDashboardEnabled, type LayoutViewportKind } from '../../services/serviceLayout';
	import type { ExplorerSortTarget } from '../../types/typeExplorer';
	import { AddonsIslandService, type AddonsQuickSwitcherApp } from '../../services/serviceAddonsIsland.svelte';
	import { FRAME_NAVIGATION_KEY, FrameNavigationService } from './frameNavigation.svelte';
	import { FRAME_POPUPS_KEY, FramePopupsState } from './framePopups.svelte';
	import {
		WORKSPACE_MEDIATOR_KEY,
		WorkspaceMediatorService,
	} from '../../services/serviceWorkspaceMediator.svelte';
	import { createWorkspaceInputRouter } from '../../services/serviceWorkspaceInputRouter';
	import FrameNavbarShell from './FrameNavbarShell.svelte';
	import FrameDashboardShell from './FrameDashboardShell.svelte';

	let { plugin, activeWindow: frameActiveWindow, viewportKind: forcedViewportKind }: { plugin: VaultmanPlugin; activeWindow?: Window; viewportKind?: LayoutViewportKind } = $props();
	const boundActiveWindow = $derived(frameActiveWindow ?? activeWindow);

	// â”€â”€â”€ Page navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// svelte-ignore state_referenced_locally
	const overlays = new FrameOverlayController(
		plugin,
		ExplorerQueueComp,
		ExplorerActiveFiltersComp,
		{ onImportBases: () => nav.enterBasesImport() },
	);
	const addonsIslandService = new AddonsIslandService();
	const addonsQuickSwitcherApp = $derived(plugin.app as unknown as AddonsQuickSwitcherApp);
	let frameViewportWidth = $state(0);
	let measuredViewportKind = $state<LayoutViewportKind>('main-leaf');
	const dashboardViewportKind = $derived(forcedViewportKind ?? measuredViewportKind);
	const dashboardEnabled = $derived(resolveDashboardEnabled({ width: frameViewportWidth, kind: dashboardViewportKind, mode: plugin.themeService.mode }));

	// svelte-ignore state_referenced_locally
	const nav = new FrameNavigationService(plugin, overlays, () => selectedCount);
	const viewport = new FrameViewportController(() => nav.pageIndex);
	nav.attachViewport(viewport);
	const workspaceMediator = new WorkspaceMediatorService();
	const workspaceInputRouter = createWorkspaceInputRouter({ mediator: workspaceMediator });

	const navReorder = new FrameNavReorderController({
		getPageOrder: () => [...nav.pageOrder],
		setPageOrder: (order) => nav.setPageOrder(order),
		incrementRenderKey: () => nav.bumpRenderKey(),
		saveOrder: (order) => {
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		},
	});
	nav.attachNavReorder(navReorder);
	setContext(FRAME_NAVIGATION_KEY, nav);
	setContext(WORKSPACE_MEDIATOR_KEY, workspaceMediator);

	// svelte-ignore state_referenced_locally
	const popups = new FramePopupsState(plugin, overlays, () => updateStats());
	setContext(FRAME_POPUPS_KEY, popups);

	$effect(() => installFrameOverlayCommandHooks(plugin, overlays));

	$effect(() => {
		const focusHook = () => workspaceInputRouter.focusActivePanel().kind === 'handled';
		const selectVisibleHook = () =>
			workspaceInputRouter.selectActivePanelVisibleNodes().kind === 'handled';
		const clearSelectionHook = () =>
			workspaceInputRouter.clearActivePanelSelection().kind === 'handled';
		plugin.focusActivePanelHook = focusHook;
		plugin.selectActivePanelVisibleNodesHook = selectVisibleHook;
		plugin.clearActivePanelSelectionHook = clearSelectionHook;
		return () => {
			if (plugin.focusActivePanelHook === focusHook) plugin.focusActivePanelHook = null;
			if (plugin.selectActivePanelVisibleNodesHook === selectVisibleHook) {
				plugin.selectActivePanelVisibleNodesHook = null;
			}
			if (plugin.clearActivePanelSelectionHook === clearSelectionHook) {
				plugin.clearActivePanelSelectionHook = null;
			}
		};
	});

	$effect(() => {
		const hook = () => nav.openDiffIntent();
		plugin.openDiffViewHook = hook;
		return () => {
			if (plugin.openDiffViewHook === hook) plugin.openDiffViewHook = null;
		};
	});

	// â”€â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);
	const addOpCount = $derived.by(() => {
		const ids = new Set<string>();
		for (const vfs of plugin.queueService.listTransactions()) {
			for (const op of vfs.ops) {
				if (op.action === 'add') ids.add(op.changeId ?? op.id);
			}
		}
		return ids.size;
	});

	function updateStats() {
		queuedCount = plugin.queueService.logicalOpCount;
		filterRuleCount = countActiveFilterEntries(plugin.filterService);
	}

	function renderAddonsStats(): string {
		const files = plugin.app.vault.getMarkdownFiles().length;
		return `${translate('stats.files')}: ${files} | ${translate('scope.selected')}: ${selectedCount} | ${translate('filters.active')}: ${filterRuleCount} | Queue: ${queuedCount}`;
	}

	let fileList = $state<explorerFiles | undefined>(undefined);
	let propExplorer = $state<explorerProps | undefined>(undefined);
	let tagsExplorer = $state<explorerTags>();
	let selectedFilePaths = $state(new Set<string>());

	// â”€â”€â”€ Filters page state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	type FiltersTab = FiltersSearchTab;
	let filtersSearchByTab = $state<FiltersSearchState>(createFiltersSearchState());
	let filtersFnRState = $state<FnRState>(createFnRState());
	let filtersSearchCategory = $state<Record<FiltersTab, number>>({ tags: 0, props: 0, files: 0, content: 0, outline: 0 });
	let filtersSortBy = $state('name');
	let filtersSortDir = $state<'asc' | 'desc'>('asc');
	let filtersSortTarget = $state<ExplorerSortTarget>('top');
	let filtersViewMode = $state<any>('tree');
	let addMode = $state(false);
	const initialOperationScope = untrack(() => normalizeOperationScope(plugin.settings.explorerOperationScope));
	let filtersOperationScope = $state<OperationScope>(initialOperationScope);

	$effect(() => {
		const tab = nav.filtersActiveTab;
		const term = getFiltersSearch(filtersSearchByTab, tab);
		const catMode = filtersSearchCategory[tab] ?? 0;

		// Route search with per-tab category scoping
		switch (tab) {
			case 'props':
				propExplorer?.setSearchTerm(term);
				break;
			case 'tags':
				tagsExplorer?.setSearchTerm(term, catMode === 0 ? 'all' : 'leaf');
				break;
			case 'files':
				if (catMode === 0) {
					fileList?.setSearchFilter(term, '');
					plugin.filterService.setSearchFilter(term, '');
				} else {
					fileList?.setSearchFilter('', term);
					plugin.filterService.setSearchFilter('', term);
				}
				break;
			case 'content':
				plugin.contentIndex.setQuery(term);
				break;
			case 'outline':
				break;
		}
	});

	// â”€â”€â”€ Refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Scope popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	// â”€â”€â”€ Search popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	$effect(() => {
		const filesSearchTerm = getFiltersSearch(filtersSearchByTab, 'files');
		if (!popups.searchName && !popups.searchFolder && filesSearchTerm) return;
		fileList?.setSearchFilter(popups.searchName, popups.searchFolder);
		plugin.filterService.setSearchFilter(popups.searchName, popups.searchFolder);
	});

	// â”€â”€â”€ Filters page state (bound to FiltersPage component) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Active Filters popup state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Scope popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Move popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Icon action (Svelte action wrapping Obsidian setIcon) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (newName: string) => setIcon(el, newName) };
	}

	function bindDashboardMeasurement(el: HTMLElement): { destroy(): void } {
		const update = (entry?: ResizeObserverEntry) => {
			frameViewportWidth = measureFrameWidth(el, entry);
			measuredViewportKind = inferFrameViewportKind(el);
		};
		update();

		if (typeof ResizeObserver === 'undefined') return { destroy: () => {} };

		const observer = new ResizeObserver((entries) => update(entries[0]));
		observer.observe(el);
		return { destroy: () => observer.disconnect() };
	}

	function measureFrameWidth(el: HTMLElement, entry?: ResizeObserverEntry): number {
		const observed = entry?.contentRect.width;
		if (typeof observed === 'number' && observed > 0) return Math.round(observed);
		const rectWidth = el.getBoundingClientRect().width;
		if (rectWidth > 0) return Math.round(rectWidth);
		return Math.round(el.clientWidth);
	}

	function inferFrameViewportKind(el: HTMLElement): LayoutViewportKind {
		return el.closest('.mod-left-split, .mod-right-split') ? 'sidebar' : 'main-leaf';
	}

	// â”€â”€â”€ Refresh active filters popup when it becomes visible â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	$effect(() => {
		if (overlays.activePopup === 'active-filters' && overlays.popupOpen) {
			popups.refreshActiveFiltersPopup();
		}
	});

	// â”€â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	onMount(() => {
		const onFilterChanged = () => {
			updateStats();
		};
		const onVaultResolved = () => updateStats();
		const onQueueChanged = () => {
			updateStats();
			if (plugin.queueService.isEmpty && plugin.overlayState.isOpen('queue')) {
				overlays.closeQueueIsland();
			}
		};

		const unsubFilter = plugin.filterService.subscribe(onFilterChanged);
		const unsubLeafDetach = plugin.leafDetachService?.subscribe(() => {
			updateStats();
		});
		plugin.queueService.on('changed', onQueueChanged);

		updateStats();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on('resolved', onVaultResolved);

		return () => {
			unsubFilter();
			unsubLeafDetach?.();
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onVaultResolved);
		};
	});

	// Elastic UI: derive root classes from themeService and bind window focus
	// so Faint Mode reflects the current window in pop-out scenarios.
	const elasticRootClasses = $derived(plugin.themeService.rootClasses.join(' '));

	onMount(() => {
		const win = boundActiveWindow;
		const onWindowFocus = () => (plugin.themeService.windowFocused = true);
		const onWindowBlur = () => (plugin.themeService.windowFocused = false);
		win.addEventListener('focus', onWindowFocus);
		win.addEventListener('blur', onWindowBlur);
		plugin.themeService.windowFocused = win.document.hasFocus();
		return () => {
			win.removeEventListener('focus', onWindowFocus);
			win.removeEventListener('blur', onWindowBlur);
		};
	});
</script>

<div class="vm-view {elasticRootClasses}" use:navReorder.bindViewRoot use:bindDashboardMeasurement>
	{#if dashboardEnabled}
		<FrameDashboardShell
			{plugin} {icon} bind:filtersActiveTab={nav.filtersActiveTab} bind:filtersSearchByTab
			bind:filtersSearchCategory bind:filtersFnRState bind:filtersOperationScope
			bind:tagsExplorer bind:propExplorer bind:fileList bind:selectedCount
			bind:selectedFilePaths bind:filtersSortBy bind:filtersSortDir bind:filtersSortTarget
			bind:filtersViewMode bind:addMode {addOpCount} detachedTabs={nav.detachedTabs}
			{addonsIslandService} {addonsQuickSwitcherApp} {renderAddonsStats}
			onShowStats={() => nav.showStatsPage()}
			onOperationScopeChange={(value) => popups.setFiltersOperationScope(value)}
			{dashboardEnabled}
		/>
	{:else}
		<div class="vm-pages-viewport" use:viewport.bindViewport>
			<div
				class="vm-page-container"
				use:viewport.bindContainer
				ontransitionend={viewport.onContainerTransitionEnd}
			>
				{#each nav.pageOrder as pageId (pageId)}
					<div class="vm-page" data-page={pageId}>
						{#key nav.pageRenderKey}
							{#if pageId === 'ops'}
								{#if nav.detachedTabs['page-tools'] === true}
									<div class="vm-page-external" data-vm-tab-id="page-tools">
										Detached to workspace
									</div>
								{:else}
									<OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
								{/if}
							{:else if pageId === 'statistics'}
								<StatisticsPage
									{plugin}
									previewFile={nav.statsPreviewFile}
									onShowStats={() => nav.showStatsPage()}
								/>
							{:else if pageId === 'filters'}
								<FiltersPage
									{plugin} bind:filtersActiveTab={nav.filtersActiveTab} bind:filtersSearchByTab
									bind:filtersSearchCategory bind:filtersFnRState bind:filtersOperationScope
									onOperationScopeChange={(value) => popups.setFiltersOperationScope(value)}
									bind:tagsExplorer bind:propExplorer bind:fileList bind:selectedCount
									bind:selectedFilePaths bind:filtersSortBy bind:filtersSortDir bind:filtersSortTarget
									bind:filtersViewMode bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}
									bind:addMode showTabs={!nav.filterTabsExternallyMounted} {addOpCount}
								/>
							{/if}
						{/key}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<FrameNavbarShell {plugin} {filterRuleCount} {queuedCount} layoutSettings={nav.layoutSettings} leftFab={nav.leftFab} rightFab={nav.rightFab} {overlays} />
</div>

<PopupOverlay
	{plugin} activePopup={overlays.activePopup} popupOpen={overlays.popupOpen}
	closePopup={() => overlays.closePopup()} activeFilterRules={popups.activeFilterRules}
	refreshActiveFiltersPopup={() => popups.refreshActiveFiltersPopup()} {updateStats}
	toggleFilterRule={(rule) => popups.toggleFilterRule(rule)} deleteFilterRule={(rule) => popups.deleteFilterRule(rule)}
	scopeOptions={[...popups.scopeOptions]} setScope={(value) => popups.setScope(value)}
	bind:searchName={popups.searchName} bind:searchFolder={popups.searchFolder}
	moveTargetFiles={popups.moveTargetFiles} bind:moveTargetFolder={popups.moveTargetFolder}
	movePreviews={popups.movePreviews} attachFolderSuggest={(el) => popups.attachFolderSuggest(el)}
	queueMoves={() => popups.queueMoves()} {icon}
/>
