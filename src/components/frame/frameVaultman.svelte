<!--******************************************************************\\
//*      ___|^___^|___        .-~*Â´Â¨Â¯Â¨`*~-.        ___|^___^|___     *\\
//*     |  Vaultman  |       |   Meibbo   |       | April 2026 |     *\\
//*     \___/`*Â´\___/        `-~*Â´Â¨Â¯Â¨`*~-Â´        \___/`*Â´\___/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*    	                                                             *\\
//*******************************************************************-->

<!--...-----------------------(   IMPORTS   )---------------------...-->
<script lang="ts">
	import { onMount, setContext, untrack } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { explorerFiles } from '../../providers/explorerFiles';
	import { explorerProps } from '../../providers/explorerProps';
	import { explorerTags } from '../../providers/explorerTags';
	import StatisticsPage from '../pages/pageStats.svelte';
	import FiltersPage from '../pages/pageFilters.svelte';
	import OperationsPage from '../pages/pageTools.svelte';
	import NavbarDock from '../layout/navbarDock.svelte';
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import PopupOverlay from '../layout/overlays/layoutOverlay.svelte';
	import PopupIsland from '../layout/overlays/overlayIsland.svelte';
	import ExplorerQueueComp from '../containers/explorerQueue.svelte';
	import ExplorerActiveFiltersComp from '../containers/explorerActiveFilters.svelte';
	import Dashboard3Column from '../dashboard/Dashboard3Column.svelte';
	import AddonsMarkdownPane from '../addons/AddonsMarkdownPane.svelte';

	import { FolderSuggest } from '../../utils/autocomplete';
	import { translate } from '../../index/i18n/lang';
	import {
		collectActiveFilterRules,
		countActiveFilterEntries,
		type ActiveFilterRule,
	} from './frameActiveFilters';
	import { FrameViewportController } from './frameViewport';
	import { FrameNavReorderController } from './frameNavReorder.svelte';
	import { FrameOverlayController, installFrameOverlayCommandHooks } from './frameOverlays.svelte';
	import { createMoveChanges, createMovePreviews } from './frameMoves';
	import {
		createFiltersSearchState,
		getFiltersSearch,
		type FiltersSearchTab,
		type FiltersSearchState,
	} from './frameFiltersSearch';
	import { createFnRState } from '../../services/serviceFnR';
	import type { FnRState } from '../../types/typeFnR';
	import {
		normalizeOperationScope,
		type OperationScope,
	} from '../../services/serviceOperationScope';
	import {
		resolveDashboardEnabled,
		type LayoutViewportKind,
	} from '../../services/serviceLayout';
	import type { ExplorerSortTarget } from '../../types/typeExplorer';
	import {
		AddonsIslandService,
		type AddonsQuickSwitcherApp,
	} from '../../services/serviceAddonsIsland.svelte';
	import { FRAME_NAVIGATION_KEY, FrameNavigationService } from './frameNavigation.svelte';

	// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€------------------...........
	let {
		plugin,
		activeWindow: frameActiveWindow,
		viewportKind: forcedViewportKind,
	}: {
		plugin: VaultmanPlugin;
		activeWindow?: Window;
		viewportKind?: LayoutViewportKind;
	} = $props();
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
	const dashboardEnabled = $derived(
		resolveDashboardEnabled({
			width: frameViewportWidth,
			kind: dashboardViewportKind,
			mode: plugin.themeService.mode,
		}),
	);

	// svelte-ignore state_referenced_locally
	const nav = new FrameNavigationService(plugin, overlays, () => selectedCount);
	const viewport = new FrameViewportController(() => nav.pageIndex);
	nav.attachViewport(viewport);

	const navReorder = new FrameNavReorderController({
		getPageOrder: () => [...nav.pageOrder],
		setPageOrder: (order) => nav.setPageOrder(order),
		incrementRenderKey: () => {
			nav.bumpRenderKey();
		},
		saveOrder: (order) => {
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		},
	});
	nav.attachNavReorder(navReorder);
	setContext(FRAME_NAVIGATION_KEY, nav);

	$effect(() => installFrameOverlayCommandHooks(plugin, overlays));

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
	let filtersSearchCategory = $state<Record<FiltersTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
		content: 0,
		outline: 0,
	});
	let filtersSortBy = $state('name');
	let filtersSortDir = $state<'asc' | 'desc'>('asc');
	let filtersSortTarget = $state<ExplorerSortTarget>('top');
	let filtersViewMode = $state<any>('tree');
	let addMode = $state(false);
	let dockDrawerOpen = $state(false);
	const initialOperationScope = untrack(() =>
		normalizeOperationScope(plugin.settings.explorerOperationScope),
	);
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

	function refreshFiles() {
		updateStats();
	}

	function refreshActiveFilterHighlights(): void {
		const props = new Set<string>();
		const vals = new Map<string, Set<string>>();
		function walk(node: import('../../types/typeFilter').FilterNode): void {
			if (node.type === 'rule') {
				if (node.property) {
					props.add(node.property);
					if (node.values && node.values.length > 0) {
						if (!vals.has(node.property)) vals.set(node.property, new Set());
						node.values.forEach((v) => vals.get(node.property!)!.add(v));
					}
				}
			} else if (node.type === 'group') {
				node.children.forEach(walk);
			}
		}
		walk(plugin.filterService.activeFilter);
		// PropsExplorerPanel computes active filter highlights internally on render
		void props;
		void vals;
	}

	function refreshQueue() {
		updateStats();
	}

	// â”€â”€â”€ Scope popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	// TODO: where this icons are showed?
	const scopeOptions = [
		{
			value: 'auto',
			label: translate('settings.scope.auto'),
			icon: 'lucide-sparkles',
		},
		{
			value: 'filtered',
			label: translate('scope.filtered'),
			icon: 'lucide-filter',
		},
		{
			value: 'selected',
			label: translate('scope.selected'),
			icon: 'lucide-check-square',
		},
	];

	function setScope(value: string) {
		filtersOperationScope = normalizeOperationScope(value as OperationScope);
		plugin.settings.explorerOperationScope = filtersOperationScope;
		void plugin.saveSettings();
		overlays.closePopup();
	}

	function setFiltersOperationScope(value: OperationScope) {
		filtersOperationScope = normalizeOperationScope(value);
		plugin.settings.explorerOperationScope = filtersOperationScope;
		void plugin.saveSettings();
	}

	// â”€â”€â”€ Search popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	let searchName = $state('');
	let searchFolder = $state('');

	$effect(() => {
		const filesSearchTerm = getFiltersSearch(filtersSearchByTab, 'files');
		if (!searchName && !searchFolder && filesSearchTerm) return;
		fileList?.setSearchFilter(searchName, searchFolder);
		plugin.filterService.setSearchFilter(searchName, searchFolder);
	});

	// â”€â”€â”€ Filters page state (bound to FiltersPage component) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Active Filters popup state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	let activeFilterRules = $state<ActiveFilterRule[]>([]);

	function refreshActiveFiltersPopup(): void {
		activeFilterRules = collectActiveFilterRules(plugin.filterService.activeFilter);
	}

	function toggleFilterRule(rule: ActiveFilterRule): void {
		if (rule.node.id) {
			plugin.filterService.toggleFilterRule(rule.node.id);
		}
		refreshActiveFiltersPopup();
	}

	function deleteFilterRule(rule: ActiveFilterRule): void {
		plugin.filterService.removeNode(rule.node, rule.parent);
		refreshActiveFiltersPopup();
		updateStats();
	}

	// â”€â”€â”€ Scope popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	// â”€â”€â”€ Move popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	let moveTargetFiles = $state<import('obsidian').TFile[]>([]);
	let moveTargetFolder = $state('');

	const movePreviews = $derived.by(() => createMovePreviews(moveTargetFiles, moveTargetFolder));

	function queueMoves() {
		const changes = createMoveChanges(moveTargetFiles, moveTargetFolder);
		void plugin.queueService.addBatch(changes);
		overlays.closePopup();
	}

	function attachFolderSuggest(el: HTMLElement) {
		const suggest = new FolderSuggest(plugin.app, el as HTMLInputElement, (path: string) => {
			moveTargetFolder = path;
			(el as HTMLInputElement).value = path;
		});
		return {
			destroy() {
				suggest.close();
			},
		};
	}

	// â”€â”€â”€ Icon action (Svelte action wrapping Obsidian setIcon) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	function bindDashboardMeasurement(el: HTMLElement): { destroy(): void } {
		const update = (entry?: ResizeObserverEntry) => {
			frameViewportWidth = measureFrameWidth(el, entry);
			measuredViewportKind = inferFrameViewportKind(el);
		};
		update();

		if (typeof ResizeObserver === 'undefined') {
			return { destroy: () => {} };
		}

		const observer = new ResizeObserver((entries) => {
			update(entries[0]);
		});
		observer.observe(el);
		return {
			destroy() {
				observer.disconnect();
			},
		};
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
			refreshActiveFiltersPopup();
		}
	});

	// â”€â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	onMount(() => {
		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
		};
		const onVaultResolved = () => {
			refreshFiles();
		};
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && plugin.overlayState.isOpen('queue')) {
				overlays.closeQueueIsland();
			}
		};

		const unsubFilter = plugin.filterService.subscribe(onFilterChanged);
		const unsubLeafDetach = plugin.leafDetachService?.subscribe(() => {
			updateStats();
		});
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

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

	function onWindowFocus(): void {
		plugin.themeService.windowFocused = true;
	}
	function onWindowBlur(): void {
		plugin.themeService.windowFocused = false;
	}

	onMount(() => {
		const win = boundActiveWindow;
		win.addEventListener('focus', onWindowFocus);
		win.addEventListener('blur', onWindowBlur);
		plugin.themeService.windowFocused = win.document.hasFocus();
		return () => {
			win.removeEventListener('focus', onWindowFocus);
			win.removeEventListener('blur', onWindowBlur);
		};
	});
</script>

{#snippet dashboardFilters()}
	<nav class="vm-dashboard-filter-list" aria-label={translate('nav.filters')}>
		{#each nav.filterTabItems as tab (tab.id)}
			<button
				type="button"
				class="vm-dashboard-filter-button"
				class:is-active={nav.filtersActiveTab === tab.id}
				class:is-faint={tab.faint}
				disabled={tab.disabled}
				onclick={() => nav.selectSurfaceItem('filter-tabs', tab.id)}
			>
				<span class="vm-dashboard-filter-icon" use:icon={tab.icon}></span>
				<span>{tab.label}</span>
			</button>
		{/each}
	</nav>
{/snippet}

{#snippet dashboardExplorer()}
	<div class="vm-page vm-dashboard-active-page" data-page={nav.activePage}>
		{#key nav.pageRenderKey}
			{#if nav.activePage === 'ops'}
				{#if nav.detachedTabs['page-tools'] === true}
					<div class="vm-page-external" data-vm-tab-id="page-tools">Detached to workspace</div>
				{:else}
					<OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
				{/if}
			{:else if nav.activePage === 'statistics'}
				<StatisticsPage
					{plugin}
					previewFile={nav.statsPreviewFile}
					onShowStats={() => nav.showStatsPage()}
				/>
			{:else if nav.activePage === 'filters'}
				<FiltersPage
					{plugin}
					bind:filtersActiveTab={nav.filtersActiveTab}
					bind:filtersSearchByTab
					bind:filtersSearchCategory
					bind:filtersFnRState
					bind:filtersOperationScope
					onOperationScopeChange={setFiltersOperationScope}
					bind:tagsExplorer
					bind:propExplorer
					bind:fileList
					bind:selectedCount
					bind:selectedFilePaths
					bind:filtersSortBy
					bind:filtersSortDir
					bind:filtersSortTarget
					bind:filtersViewMode
					bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}
					bind:addMode
					showTabs={false}
					{addOpCount}
				/>
			{/if}
		{/key}
	</div>
{/snippet}

{#snippet dashboardAddons()}
	<AddonsMarkdownPane
		service={addonsIslandService}
		statsRenderer={renderAddonsStats}
		app={addonsQuickSwitcherApp}
	/>
{/snippet}

{#snippet frameIslandAndDock()}
	<!-- â”€â”€â”€ Island Backdrop (Rising Glass) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	<div
		class="vm-island-backdrop vm-glass"
		class:is-open={overlays.isIslandOpen}
		class:is-dismissable={plugin.settings.islandDismissOnOutsideClick}
		onclick={() => {
			if (plugin.settings.islandDismissOnOutsideClick) {
				overlays.closeQueueIsland();
				overlays.closeFiltersIsland();
			}
		}}
		onkeydown={(e) => {
			if (
				plugin.settings.islandDismissOnOutsideClick &&
				(e.key === 'Escape' || e.key === 'Enter')
			) {
				overlays.closeQueueIsland();
				overlays.closeFiltersIsland();
			}
		}}
		role="button"
		tabindex="-1"
		aria-label="Close island"
	></div>

	<PopupIsland overlayState={plugin.overlayState} />

	<NavbarDock
		items={nav.dockItems}
		active={nav.dockActive}
		externalTabIds={nav.dockExternalTabIds}
		showLabels={nav.layoutSettings.dock.labels.visible}
		labelPosition={nav.layoutSettings.dock.labels.position}
		presentationMode={nav.layoutSettings.dock.presentation.mode}
		drawerDirection={nav.layoutSettings.dock.presentation.drawerDirection}
		bind:drawerOpen={dockDrawerOpen}
		leftFab={nav.leftFab}
		rightFab={nav.rightFab}
		navCollapsed={navReorder.navCollapsed}
		isIslandOpen={overlays.isIslandOpen}
		isReordering={nav.dockUsesFramePages ? navReorder.isReordering : false}
		reorderTargetIdx={nav.dockUsesFramePages ? navReorder.reorderTargetIdx : -1}
		bind:dockEl={navReorder.pillEl}
		{filterRuleCount}
		{queuedCount}
		bindNav={navReorder.bindNav}
		onCollapsedNavClick={navReorder.onCollapsedNavClick}
		onItemPointerDown={nav.dockUsesFramePages ? navReorder.onNavIconPointerDown : undefined}
		onDockPointerMove={nav.dockUsesFramePages ? navReorder.onPillPointerMove : undefined}
		onDockPointerUp={nav.dockUsesFramePages ? navReorder.onPillPointerUp : undefined}
		exitReorder={navReorder.exitReorder}
		onSelect={(id) => nav.selectSurfaceItem(nav.layoutSettings.dock.content, id)}
		mouseGestureConfig={plugin.settings?.mouseGestures?.fab}
	/>
{/snippet}

<!-- â”€â”€â”€ Page container (horizontal slide strip) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
<!-- vm-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="vm-view {elasticRootClasses}" use:navReorder.bindViewRoot use:bindDashboardMeasurement>
	{#if nav.topTabItems.length > 0}
		<NavbarTabs
			tabs={nav.topTabItems}
			active={nav.topTabActive}
			externalTabIds={nav.topExternalTabIds}
			showLabels={nav.layoutSettings.tabs.labels.visible}
			labelPosition={nav.layoutSettings.tabs.labels.position}
			onSelect={(id) => nav.selectSurfaceItem(nav.layoutSettings.tabs.content, id)}
		/>
	{/if}

	{#if dashboardEnabled}
		<div class="vm-pages-viewport vm-dashboard-viewport">
			<Dashboard3Column
				themeService={plugin.themeService}
				enabled={dashboardEnabled}
				filters={dashboardFilters}
				explorer={dashboardExplorer}
				addons={dashboardAddons}
			/>

			{@render frameIslandAndDock()}
		</div>
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
									{plugin}
									bind:filtersActiveTab={nav.filtersActiveTab}
									bind:filtersSearchByTab
									bind:filtersSearchCategory
									bind:filtersFnRState
									bind:filtersOperationScope
									onOperationScopeChange={setFiltersOperationScope}
									bind:tagsExplorer
									bind:propExplorer
									bind:fileList
									bind:selectedCount
									bind:selectedFilePaths
									bind:filtersSortBy
									bind:filtersSortDir
									bind:filtersSortTarget
									bind:filtersViewMode
									bind:filtersBaseChooseMode={nav.filtersBaseChooseMode}
									bind:addMode
									showTabs={!nav.filterTabsExternallyMounted}
									{addOpCount}
								/>
							{/if}
						{/key}
					</div>
				{/each}
			</div>

			{@render frameIslandAndDock()}
		</div>
	{/if}
</div>

<PopupOverlay
	{plugin}
	activePopup={overlays.activePopup}
	popupOpen={overlays.popupOpen}
	closePopup={() => overlays.closePopup()}
	{activeFilterRules}
	{refreshActiveFiltersPopup}
	{updateStats}
	{toggleFilterRule}
	{deleteFilterRule}
	{scopeOptions}
	{setScope}
	bind:searchName
	bind:searchFolder
	{moveTargetFiles}
	bind:moveTargetFolder
	{movePreviews}
	{attachFolderSuggest}
	{queueMoves}
	{icon}
/>
