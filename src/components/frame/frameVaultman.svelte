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
	import { onMount, untrack } from 'svelte';
	import { setIcon, type TFile } from 'obsidian';
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

	import { FolderSuggest } from '../../utils/autocomplete';
	import { translate } from '../../index/i18n/lang';
	import type { FabDef } from '../../types/typePrimitives';
	import {
		collectActiveFilterRules,
		countActiveFilterEntries,
		type ActiveFilterRule,
	} from './frameActiveFilters';
	import {
		createFramePageFabs,
		createFramePageIcons,
		createFramePageLabels,
		resolveFramePageOrder,
	} from './framePages';
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
	import { openVaultmanFileSuggestModal } from '../../utils/fileSuggestModal';
	import {
		normalizeOperationScope,
		type OperationScope,
	} from '../../services/serviceOperationScope';
	import { resolveLayoutSettings, type LayoutSurfaceContent } from '../../services/serviceLayout';
	import { FTabs, type TabConfig } from '../../types/typeTab';
	import type { ExplorerSortTarget } from '../../types/typeExplorer';
	import { tabIdFromInner, type TabId } from '../../registry/tabRegistry';
	import type { LeafDetachState } from '../../services/serviceLeafDetach';

	// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€------------------...........
	type SurfaceNavItem = TabConfig & {
		label: string;
		disabled?: boolean;
		faint?: boolean;
		dot?: boolean;
	};

	let { plugin }: { plugin: VaultmanPlugin } = $props();

	// â”€â”€â”€ Page navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	function initFrameState() {
		return {
			pageOrder: resolveFramePageOrder(plugin.settings.pageOrder),
			overlays: new FrameOverlayController(
				plugin,
				ExplorerQueueComp,
				ExplorerActiveFiltersComp,
				enterBasesImportMode,
			),
		};
	}

	const initialFrameState = initFrameState();
	let pageOrder = $state<string[]>(initialFrameState.pageOrder);
	let pageRenderKey = $state(0); // incremented on each reorder to force page content remount
	let filtersBaseChooseMode = $state(false);
	let statsPreviewFile = $state<TFile | null>(null);
	const pageLabels: Record<string, string> = createFramePageLabels();
	const pageIcons: Record<string, string> = createFramePageIcons();
	const overlays = initialFrameState.overlays;
	const layoutSettings = $derived(resolveLayoutSettings(plugin.settings.layout));
	const framePageTabs = $derived.by<SurfaceNavItem[]>(() =>
		pageOrder.map((pageId) => ({
			id: pageId,
			icon: pageIcons[pageId] ?? 'lucide-circle',
			label: pageLabels[pageId] ?? pageId,
		})),
	);
	const filterTabItems = $derived.by<SurfaceNavItem[]>(() =>
		FTabs.map((tab) => ({
			...tab,
			label: tab.label ?? (tab.labelKey ? translate(tab.labelKey) : tab.id),
		})),
	);

	$effect(() => installFrameOverlayCommandHooks(plugin, overlays));

	// â”€â”€â”€ Per-page FAB definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	const pageFabs = $derived.by<Record<string, { left: FabDef | null; right: FabDef | null }>>(() =>
		createFramePageFabs(
			plugin,
			() => overlays.toggleQueueIsland(),
			() => overlays.toggleFiltersIsland(),
			{
				filtersBaseChooseMode,
				enterBasesImportMode,
				exitBasesImportMode,
				statsPreviewActive: statsPreviewFile !== null,
				openStatsNote,
				showStatsPage,
			},
		),
	);

	const leftFab = $derived.by<FabDef | null>(() => pageFabs[activePage]?.left ?? null);
	const rightFab = $derived.by<FabDef | null>(() => pageFabs[activePage]?.right ?? null);

	let activePage = $state<string>(initialFrameState.pageOrder[0] ?? 'ops');

	// Use DOM insertion order (pageOrder at mount time) â€” avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));
	const viewport = new FrameViewportController(() => pageIndex);
	const navReorder = new FrameNavReorderController({
		getPageOrder: () => pageOrder,
		setPageOrder: (order) => {
			pageOrder = order;
		},
		incrementRenderKey: () => {
			pageRenderKey++;
		},
		saveOrder: (order) => {
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		},
	});
	function navigateTo(page: string) {
		if (activePage !== page) {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
			if (overlays.activePopup === 'active-filters') overlays.closePopup();
		}
		if (page !== 'filters') filtersBaseChooseMode = false;
		activePage = page;
		viewport.applyPageTransform(true);
	}

	function enterBasesImportMode() {
		filtersBaseChooseMode = true;
		filtersActiveTab = 'files';
		if (activePage !== 'filters') activePage = 'filters';
		viewport.applyPageTransform(true);
	}

	function exitBasesImportMode() {
		filtersBaseChooseMode = false;
	}

	function openStatsNote() {
		openVaultmanFileSuggestModal(plugin.app, (file) => {
			statsPreviewFile = file;
			activePage = 'statistics';
			viewport.applyPageTransform(true);
		});
	}

	function showStatsPage() {
		statsPreviewFile = null;
	}

	$effect(() => {
		void pageIndex; // declare dependency
		viewport.applyPageTransform(true);
	});

	$effect(() => {
		if (!pageOrder.includes(activePage)) {
			activePage = pageOrder[0] ?? 'ops';
		}
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

	let fileList = $state<explorerFiles | undefined>(undefined);
	let propExplorer = $state<explorerProps | undefined>(undefined);
	let tagsExplorer = $state<explorerTags>();
	let selectedFilePaths = $state(new Set<string>());

	// â”€â”€â”€ Filters page state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	type FiltersTab = FiltersSearchTab;
	let filtersActiveTab = $state<FiltersTab>('props');
	$effect(() => {
		void filtersActiveTab;
		untrack(() => {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
		});
	});
	let filtersSearchByTab = $state<FiltersSearchState>(createFiltersSearchState());
	let filtersFnRState = $state<FnRState>(createFnRState());
	let filtersSearchCategory = $state<Record<FiltersTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
		content: 0,
	});
	let filtersSortBy = $state('name');
	let filtersSortDir = $state<'asc' | 'desc'>('asc');
	let filtersSortTarget = $state<ExplorerSortTarget>('top');
	let filtersViewMode = $state<any>('tree');
	let addMode = $state(false);
	let dockDrawerOpen = $state(false);
	let detachedTabs = $state<LeafDetachState>({});
	const initialOperationScope = untrack(() =>
		normalizeOperationScope(plugin.settings.explorerOperationScope),
	);
	let filtersOperationScope = $state<OperationScope>(initialOperationScope);
	const filterTabsExternallyMounted = $derived(
		layoutSettings.dock.content === 'filter-tabs' || layoutSettings.tabs.content === 'filter-tabs',
	);
	const topTabItems = $derived.by(() => itemsForSurface(layoutSettings.tabs.content));
	const topTabActive = $derived(activeForSurface(layoutSettings.tabs.content));
	const topExternalTabIds = $derived.by(() => externalIdsForSurface(layoutSettings.tabs.content));
	const dockItems = $derived.by(() => itemsForSurface(layoutSettings.dock.content));
	const dockActive = $derived(activeForSurface(layoutSettings.dock.content));
	const dockExternalTabIds = $derived.by(() => externalIdsForSurface(layoutSettings.dock.content));
	const dockUsesFramePages = $derived(layoutSettings.dock.content === 'frame-pages');

	function itemsForSurface(
		content: LayoutSurfaceContent,
	): SurfaceNavItem[] {
		if (content === 'frame-pages') {
			return framePageTabs.map((tab) => ({
				...tab,
				dot: tab.id === 'statistics' && selectedCount > 0,
			}));
		}
		if (content === 'filter-tabs') {
			return filterTabItems.map((tab) => {
				const disabled = filtersBaseChooseMode && tab.id !== 'files';
				return { ...tab, disabled, faint: disabled };
			});
		}
		return [];
	}

	function activeForSurface(content: LayoutSurfaceContent): string {
		if (content === 'filter-tabs') return activePage === 'filters' ? filtersActiveTab : '';
		if (content === 'frame-pages') return activePage;
		return '';
	}

	function selectSurfaceItem(content: LayoutSurfaceContent, id: string): void {
		const detachedTabId = detachedTabIdForSurfaceItem(content, id);
		if (detachedTabId) {
			void plugin.spawnTabLeaf(detachedTabId);
			return;
		}
		if (content === 'filter-tabs') {
			filtersActiveTab = id as FiltersTab;
			if (activePage !== 'filters') navigateTo('filters');
			return;
		}
		if (content === 'frame-pages') {
			navigateTo(id);
		}
	}

	function externalIdsForSurface(content: LayoutSurfaceContent): string[] {
		return itemsForSurface(content)
			.map((item) => (detachedTabIdForSurfaceItem(content, item.id) ? item.id : null))
			.filter((id): id is string => Boolean(id));
	}

	function detachedTabIdForSurfaceItem(
		content: LayoutSurfaceContent,
		id: string,
	): TabId | null {
		const tabId = tabIdForSurfaceItem(content, id);
		return tabId && detachedTabs[tabId] === true ? tabId : null;
	}

	function tabIdForSurfaceItem(content: LayoutSurfaceContent, id: string): TabId | null {
		if (content === 'filter-tabs') return tabIdFromInner(id);
		if (content === 'frame-pages' && id === 'ops') return 'page-tools';
		return null;
	}

	$effect(() => {
		const tab = filtersActiveTab;
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
		const unsubLeafDetach = plugin.leafDetachService?.subscribe((state) => {
			detachedTabs = state;
		});
		detachedTabs = plugin.leafDetachService?.getState() ?? {};
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
</script>

<!-- â”€â”€â”€ Page container (horizontal slide strip) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
<!-- vm-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="vm-view" use:navReorder.bindViewRoot>
	{#if topTabItems.length > 0}
		<NavbarTabs
			tabs={topTabItems}
			active={topTabActive}
			externalTabIds={topExternalTabIds}
			showLabels={layoutSettings.tabs.labels.visible}
			labelPosition={layoutSettings.tabs.labels.position}
			onSelect={(id) => selectSurfaceItem(layoutSettings.tabs.content, id)}
		/>
	{/if}

	<div class="vm-pages-viewport" use:viewport.bindViewport>
		<div
			class="vm-page-container"
			use:viewport.bindContainer
			ontransitionend={viewport.onContainerTransitionEnd}
		>
			{#each pageOrder as pageId (pageId)}
				<div class="vm-page" data-page={pageId}>
					{#key pageRenderKey}
						{#if pageId === 'ops'}
							{#if detachedTabs['page-tools'] === true}
								<div class="vm-page-external" data-vm-tab-id="page-tools">
									Detached to workspace
								</div>
							{:else}
								<OperationsPage {plugin} {icon} />
							{/if}
						{:else if pageId === 'statistics'}
							<StatisticsPage {plugin} previewFile={statsPreviewFile} onShowStats={showStatsPage} />
						{:else if pageId === 'filters'}
							<FiltersPage
								{plugin}
								bind:filtersActiveTab
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
								bind:filtersBaseChooseMode
								bind:addMode
								showTabs={!filterTabsExternallyMounted}
								{addOpCount}
							/>
						{/if}
					{/key}
				</div>
			{/each}
		</div>

		<!-- â”€â”€â”€ Island Backdrop (Rising Glass) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
		<div
			class="vm-island-backdrop vm-glass"
			class:is-open={overlays.isIslandOpen}
			class:has-blur={plugin.settings.islandBackdropBlur}
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
			items={dockItems}
			active={dockActive}
			externalTabIds={dockExternalTabIds}
			showLabels={layoutSettings.dock.labels.visible}
			labelPosition={layoutSettings.dock.labels.position}
			presentationMode={layoutSettings.dock.presentation.mode}
			drawerDirection={layoutSettings.dock.presentation.drawerDirection}
			bind:drawerOpen={dockDrawerOpen}
			{leftFab}
			{rightFab}
			navCollapsed={navReorder.navCollapsed}
			isIslandOpen={overlays.isIslandOpen}
			isReordering={dockUsesFramePages ? navReorder.isReordering : false}
			reorderTargetIdx={dockUsesFramePages ? navReorder.reorderTargetIdx : -1}
			bind:dockEl={navReorder.pillEl}
			{filterRuleCount}
			{queuedCount}
			bindNav={navReorder.bindNav}
			onCollapsedNavClick={navReorder.onCollapsedNavClick}
			onItemPointerDown={dockUsesFramePages ? navReorder.onNavIconPointerDown : undefined}
			onDockPointerMove={dockUsesFramePages ? navReorder.onPillPointerMove : undefined}
			onDockPointerUp={dockUsesFramePages ? navReorder.onPillPointerUp : undefined}
			exitReorder={navReorder.exitReorder}
			onSelect={(id) => selectSurfaceItem(layoutSettings.dock.content, id)}
			mouseGestureConfig={plugin.settings?.mouseGestures?.fab}
		/>
	</div>
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
