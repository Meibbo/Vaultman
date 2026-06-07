<script lang="ts">
	import { mount, onMount, unmount } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from './main';
	import type { FilesExplorerPanel } from './components/containers/explorerFiles';
	import type { PropsExplorerPanel } from './components/containers/explorerProps';
	import type { TagsExplorerPanel } from './components/containers/explorerTags';
	import StatisticsPage from './components/pages/pageStatistics.svelte';
	import FiltersPage from './components/pages/pageFilters.svelte';
	import BottomNav from './components/layout/navbarPillFab.svelte';
	import PerformanceHud from './components/layout/performanceHud.svelte';
	import { QueueListComponent } from './components/componentQueueList';
	import { QueueIslandComponent } from './components/layout/islandQueue';
	import { ActiveFiltersIslandComponent } from './components/layout/islandActiveFilters';
	import { QueueDetailsModal } from './modals/modalQueueDetails';
	import { translate } from './i18n/index';
	import type { FabDef } from './types/typeUI';
	import { resolveDockPageOrder } from './logic/logicNavigation';
	import type { StatisticsDataTab } from './logic/logicStatisticsNavigation';
	import { isBulkQueueTarget } from './utils/queueTemplateMenu';
	import { attachBasesMultiSelectOperations } from './utils/basesMultiSelectOperations';

	// ─── Props ────────────────────────────────────────────────────────────────

	let { plugin }: { plugin: VaultmanPlugin } = $props();

	// ─── Page navigation ──────────────────────────────────────────────────────

	function resolvedPageOrder(): string[] {
		const order = plugin.settings.pageOrder as string[] | undefined;
		const normalized = resolveDockPageOrder(order);
		if (
			!Array.isArray(order) ||
			order.length !== normalized.length ||
			!normalized.every((page, index) => order[index] === page)
		) {
			plugin.settings.pageOrder = normalized;
			void plugin.saveSettings();
		}
		return normalized;
	}

	const initialPageOrder = resolvedPageOrder();
	let pageOrder = $state(initialPageOrder);
	let pageRenderKey = $state(0); // incremented on each reorder to force page content remount
	let settingsRevision = $state(0);
	const pageLabels = $derived.by<Record<string, string>>(() => {
		void settingsRevision;
		return {
			statistics: translate('nav.statistics'),
			filters: translate('nav.filters'),
		};
	});

	const pageIcons: Record<string, string> = {
		statistics: 'lucide-bar-chart-2',
		filters: 'lucide-database',
	};
	const minimalStyle = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.minimalStyle;
	});
	const showDock = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.showDock;
	});
	const performanceHudEnabled = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.performanceHudEnabled;
	});
	let performanceHudHost: HTMLElement | null = null;
	let performanceHudInstance: Record<string, never> | null = null;

	function destroyPerformanceHud(): void {
		if (performanceHudInstance) {
			void unmount(performanceHudInstance);
			performanceHudInstance = null;
		}
		performanceHudHost?.remove();
		performanceHudHost = null;
	}

	$effect(() => {
		if (!performanceHudEnabled) {
			destroyPerformanceHud();
			return;
		}

		const host = document.createElement('div');
		host.className = 'vaultman-performance-host';
		document.body.appendChild(host);
		performanceHudHost = host;
		performanceHudInstance = mount(PerformanceHud, { target: host });

		return destroyPerformanceHud;
	});

	// ─── Per-page FAB definitions ────────────────────────────────────────────────

	const pageFabs = $derived.by<
		Record<string, { left: FabDef | null; right: FabDef | null }>
	>(() => {
		void settingsRevision;
		return {
			statistics: {
				left: {
					icon: 'lucide-list-checks',
					label: translate('ops.queue'),
					badge: 'queue',
					warningCount: queueWarningCount,
					action: () => openQueueLauncher(),
					doubleClickAction: () => clearQueueQuick(),
				},
				right: {
					icon: 'lucide-sparkles',
					label: translate('stats.addons'),
					locked: true,
					lockBackdrop: true,
					action: () => undefined,
				},
			},
			filters: {
				left: {
					icon: 'lucide-list-checks',
					label: translate('ops.queue'),
					badge: 'queue',
					warningCount: queueWarningCount,
					action: () => openQueueLauncher(),
					doubleClickAction: () => clearQueueQuick(),
				},
				right: {
					icon: 'lucide-filter',
					label: translate('filters.active'),
					badge: 'filters',
					action: () => openFiltersLauncher(),
					doubleClickAction: () => clearActiveFilters(),
				},
			},
		};
	});

	const leftFab = $derived.by<FabDef | null>(
		() => pageFabs[activePage]?.left ?? null,
	);
	const rightFab = $derived.by<FabDef | null>(
		() => pageFabs[activePage]?.right ?? null,
	);

	let activePage = $state(initialPageOrder[0] ?? 'filters');

	// Use DOM insertion order (pageOrder at mount time) — avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));

	function navigateTo(page: string) {
		if (activePage !== page) {
			closeQueueIsland();
			closeFiltersIsland();
		}
		activePage = page;
		applyPageTransform(!minimalStyle);
	}

	function navigateToDataTab(tab: StatisticsDataTab) {
		closeQueueIsland();
		closeFiltersIsland();
		filtersActiveTab = tab;
		activePage = 'filters';
		applyPageTransform(!minimalStyle);
	}

	function onContainerTransitionEnd(e: TransitionEvent) {
		// Guard against child element transitions bubbling up
		if (e.target === e.currentTarget && e.propertyName === 'transform') {
			containerEl?.classList.remove('is-animating');
		}
	}

	// ─── Page transition — pixel-based (fixes page-3 translateX bug) ─────────
	let viewportEl: HTMLElement | null = null;
	let containerEl: HTMLElement | null = null;

	function applyPageTransform(animated: boolean) {
		if (!containerEl || !viewportEl) return;
		const w = viewportEl.offsetWidth;
		if (w === 0) return;
		// Set each page to exact pixel width
		const pages = containerEl.querySelectorAll<HTMLElement>('.vaultman-page');
		pages.forEach((p) => {
			p.style.width = `${w}px`;
		});
		if (animated && !minimalStyle) {
			containerEl.classList.add('is-animating');
		} else {
			containerEl.classList.remove('is-animating');
		}
		// BUG-FIX: Round pixel values to prevent sub-pixel blur on high-DPI screens
		containerEl.style.transform = `translateX(${Math.round(-pageIndex * w)}px)`;
	}

	function bindViewport(el: HTMLElement) {
		viewportEl = el;
		const ro = new ResizeObserver(() => {
			applyPageTransform(false);
		});
		ro.observe(el);
		applyPageTransform(false);
		return {
			destroy() {
				ro.disconnect();
				viewportEl = null;
			},
		};
	}

	function bindContainer(el: HTMLElement) {
		containerEl = el;
		applyPageTransform(false);
		return {
			destroy() {
				containerEl = null;
			},
		};
	}

	$effect(() => {
		void pageIndex; // declare dependency
		applyPageTransform(!minimalStyle);
	});

	$effect(() => {
		if (!pageOrder.includes(activePage)) {
			activePage = pageOrder[0] ?? 'filters';
		}
	});

	// ─── Bottom Navbar DnD reorder ───────────────────────────
	// Uses pointer events only — HTML5 DnD is avoided because Obsidian's
	// workspace intercepts it and creates tab groups.

	let isReordering = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let reorderSourceIdx = -1;
	let reorderTargetIdx = $state(-1);
	let pillEl = $state<HTMLElement | null>(null);
	let pendingPointerId = -1;

	function startLongPress(idx: number, pointerId: number) {
		pendingPointerId = pointerId;
		longPressTimer = setTimeout(() => {
			isReordering = true;
			reorderSourceIdx = idx;
			// Capture only now so normal clicks are not blocked
			if (pillEl) pillEl.setPointerCapture(pendingPointerId);
		}, 2000);
	}

	function cancelLongPress() {
		if (longPressTimer !== null) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		pendingPointerId = -1;
	}

	function onNavIconPointerDown(e: PointerEvent, idx: number) {
		startLongPress(idx, e.pointerId);
	}

	function onPillPointerMove(e: PointerEvent) {
		if (!isReordering || reorderSourceIdx < 0 || !pillEl) return;
		// Find which icon the pointer is currently over
		const el = document.elementFromPoint(e.clientX, e.clientY);
		const iconEl = el?.closest?.(
			'.vaultman-nav-page-icon',
		) as HTMLElement | null;
		if (iconEl && pillEl.contains(iconEl)) {
			const icons = pillEl.querySelectorAll('.vaultman-nav-page-icon');
			const idx = Array.from(icons).indexOf(iconEl);
			if (idx >= 0 && idx !== reorderSourceIdx) {
				reorderTargetIdx = idx;
			}
		}
	}

	function onPillPointerUp() {
		cancelLongPress();
		if (
			isReordering &&
			reorderSourceIdx >= 0 &&
			reorderTargetIdx >= 0 &&
			reorderSourceIdx !== reorderTargetIdx
		) {
			const order = [...pageOrder];
			const [moved] = order.splice(reorderSourceIdx, 1);
			order.splice(reorderTargetIdx, 0, moved);
			pageOrder = order;
			pageRenderKey++;
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		}
		isReordering = false;
		reorderSourceIdx = -1;
		reorderTargetIdx = -1;
	}

	function exitReorder() {
		cancelLongPress();
		isReordering = false;
		reorderSourceIdx = -1;
		reorderTargetIdx = -1;
	}

	// ─── Responsive bottom nav ────────────────────────────────────────────────
	const NAV_COLLAPSE_THRESHOLD = 220; // px — below this width the nav collapses
	let navCollapsed = $state(false);
	let navEl: HTMLElement | null = null;
	let viewRootEl: HTMLElement | null = null;
	let navExpandTimer: ReturnType<typeof setTimeout> | null = null;

	function bindNav(el: HTMLElement) {
		navEl = el;
		return {
			destroy() {
				if (navExpandTimer) {
					clearTimeout(navExpandTimer);
					navExpandTimer = null;
				}
				navEl = null;
			},
		};
	}

	// ResizeObserver on .vaultman-view updates nav state
	function bindViewRoot(el: HTMLElement) {
		const target =
			(el.closest('.vaultman-view') as HTMLElement) ?? el.parentElement ?? el;
		viewRootEl = target;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? target.offsetWidth;
			navCollapsed = w < NAV_COLLAPSE_THRESHOLD;
		});
		ro.observe(target);
		navCollapsed = target.offsetWidth < NAV_COLLAPSE_THRESHOLD;
		return {
			destroy() {
				ro.disconnect();
				viewRootEl = null;
			},
		};
	}

	function onCollapsedNavClick() {
		if (!navCollapsed || !navEl) return;
		navEl.classList.add('is-bar-expanding');
		navCollapsed = false;
		if (navExpandTimer) clearTimeout(navExpandTimer);
		navExpandTimer = setTimeout(() => {
			// Re-check width using the same element the ResizeObserver monitors
			if (viewRootEl && viewRootEl.offsetWidth < NAV_COLLAPSE_THRESHOLD) {
				navCollapsed = true;
			}
			navEl?.classList.remove('is-bar-expanding');
		}, 2000);
	}

	// ─── Stats ────────────────────────────────────────────────────────────────

	let filteredCount = $state(0);
	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let queueWarningCount = $state(0);
	let filterRuleCount = $state(0);
	const addOpCount = $derived(
		plugin.queueService.queue.filter((op) => op.action === 'add').length,
	);

	// ─── Queue island ─────────────────────────────────────────────────────────
	let queueIslandOpen = $state(false);
	let queueIsland: QueueIslandComponent | undefined;
	let queueIslandEl = $state<HTMLElement | null>(null);

	// ─── Filters island ───────────────────────────────────────────────────────
	let filtersIslandOpen = $state(false);
	let filtersIsland: ActiveFiltersIslandComponent | undefined;
	let filtersIslandEl = $state<HTMLElement | null>(null);

	function countFilterLeaves(
		group: import('./types/typeFilter').FilterGroup,
	): number {
		let count = 0;
		for (const child of group.children) {
			if (child.type === 'rule') count++;
			else if (child.type === 'group') count += countFilterLeaves(child);
		}
		return count;
	}

	function updateStats() {
		filteredCount = plugin.filterService.filteredFiles.length;
		queuedCount = plugin.queueService.queue.length;
		queueWarningCount = countQueueWarnings();
		filterRuleCount = countFilterLeaves(plugin.filterService.activeFilter);
	}

	function countQueueWarnings(): number {
		const vaultCount = plugin.app.vault.getFiles().length;
		return plugin.queueService.queue.filter((change) =>
			isBulkQueueTarget({
				targetCount: change.files.length,
				vaultCount,
			}),
		).length;
	}

	let fileList = $state<FilesExplorerPanel | undefined>(undefined);
	let queueList: QueueListComponent | undefined;
	let propExplorer = $state<PropsExplorerPanel | undefined>(undefined);
	let tagsExplorer = $state<TagsExplorerPanel | null>(null);

	// ─── Filters page state ──────────────────────────────────────────────────
	type FiltersTab = 'files' | 'tags' | 'props' | 'content';
	type SearchTab = 'tags' | 'props' | 'files';
	let filtersActiveTab = $state<FiltersTab>('files');
	$effect(() => {
		void filtersActiveTab;
		closeQueueIsland();
		closeFiltersIsland();
	});
	let filtersSearchByTab = $state<Record<SearchTab, string>>({
		tags: '',
		props: '',
		files: '',
	});
	let filtersSearchCategory = $state<Record<SearchTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
	});
	let lastFilesSearchTerm = '';

	function hasEnabledFileSearchRule(): boolean {
		let found = false;
		function walk(node: import('./types/typeFilter').FilterNode): void {
			if (found || node.enabled === false) return;
			if (node.type === 'rule') {
				found =
					node.filterType === 'file_name' || node.filterType === 'file_folder';
				return;
			}
			node.children.forEach(walk);
		}
		walk(plugin.filterService.activeFilter);
		return found;
	}

	function applyExplorerSearch() {
		const tab = filtersActiveTab;
		if (tab === 'content') return;
		const term = filtersSearchByTab[tab] ?? '';
		const catMode = filtersSearchCategory[tab] ?? 0;

		// Route search with per-tab category scoping
		switch (tab) {
			case 'props':
				propExplorer?.setSearchTerm(term, catMode);
				break;
			case 'tags':
				tagsExplorer?.setSearchTerm(term, catMode === 0 ? 'all' : 'leaf');
				break;
			case 'files':
				lastFilesSearchTerm = term;
				if (catMode === 0) {
					plugin.filterService.setFileSearchRule('file_name', term);
				} else {
					plugin.filterService.setFileSearchRule('file_folder', term);
				}
				break;
		}
	}

	$effect(() => {
		applyExplorerSearch();
	});

	// ─── Actions for native components ────────────────────────────────────────

	function toggleQueueIsland() {
		closeFiltersIsland();
		if (queueIslandOpen) {
			closeQueueIsland();
		} else {
			openQueueIsland();
		}
	}

	type LauncherKey = 'filters' | 'queue';
	const launcherTimers: Partial<Record<LauncherKey, number>> = {};

	function handleLauncherClick(
		key: LauncherKey,
		singleClick: () => void,
		doubleClick: () => void,
	): void {
		const existing = launcherTimers[key];
		if (existing !== undefined) {
			window.clearTimeout(existing);
			delete launcherTimers[key];
			doubleClick();
			return;
		}
		launcherTimers[key] = window.setTimeout(() => {
			delete launcherTimers[key];
			singleClick();
		}, 180);
	}

	function clearLauncherTimers(): void {
		for (const key of Object.keys(launcherTimers) as LauncherKey[]) {
			const timer = launcherTimers[key];
			if (timer !== undefined) window.clearTimeout(timer);
			delete launcherTimers[key];
		}
	}

	function openQueueLauncher(): void {
		handleLauncherClick(
			'queue',
			() => toggleQueueIsland(),
			() => clearQueueQuick(),
		);
	}

	function openFiltersLauncher(): void {
		handleLauncherClick(
			'filters',
			() => toggleFiltersIsland(),
			() => clearActiveFilters(),
		);
	}

	function openQueueIsland() {
		if (!queueIslandEl) return;
		queueIslandOpen = true;
		queueIsland = new QueueIslandComponent(
			queueIslandEl,
			plugin,
			() => closeQueueIsland(),
			() => {
				new QueueDetailsModal(plugin.app, plugin.queueService).open();
			},
		);
		queueIsland.mount();
	}

	function closeQueueIsland() {
		queueIsland?.destroy();
		queueIsland = undefined;
		queueIslandOpen = false;
	}

	function toggleFiltersIsland() {
		closeQueueIsland();
		if (filtersIslandOpen) {
			closeFiltersIsland();
		} else {
			openFiltersIsland();
		}
	}

	function openFiltersIsland() {
		if (!filtersIslandEl) return;
		filtersIslandOpen = true;
		filtersIsland = new ActiveFiltersIslandComponent(
			filtersIslandEl,
			plugin,
			() => closeFiltersIsland(),
		);
		filtersIsland.mount();
	}

	function closeFiltersIsland() {
		filtersIsland?.destroy();
		filtersIsland = undefined;
		filtersIslandOpen = false;
	}

	function clearActiveFilters() {
		plugin.filterService.clearFilters();
		closeFiltersIsland();
		updateStats();
	}

	function clearQueueQuick() {
		plugin.queueService.clear();
		closeQueueIsland();
		updateStats();
	}

	// ─── Refresh ─────────────────────────────────────────────────────────────

	function refreshFiles() {
		fileList?.render(
			plugin.filterService.filteredVaultFiles,
			plugin.app.vault.getFiles().length,
		);
		updateStats();
	}

	function refreshActiveFilterHighlights(): void {
		const props = new Set<string>();
		const vals = new Map<string, Set<string>>();
		function walk(node: import('./types/typeFilter').FilterNode): void {
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
		queueList?.render(plugin.queueService.queue);
		updateStats();
	}

	// ─── Icon action (Svelte action wrapping Obsidian setIcon) ────────────────

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {
		const unsubscribeSettings = plugin.onSettingsChange(() => {
			settingsRevision += 1;
			pageRenderKey += 1;
		});
		const detachBasesMultiSelectOperations =
			attachBasesMultiSelectOperations(plugin);
		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
			filtersIsland?.render();
			if (
				lastFilesSearchTerm &&
				filtersSearchByTab.files === lastFilesSearchTerm &&
				!hasEnabledFileSearchRule()
			) {
				filtersSearchByTab = { ...filtersSearchByTab, files: '' };
				lastFilesSearchTerm = '';
			}
		};
		const onVaultResolved = () => {
			refreshFiles();
		};
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && queueIslandOpen) {
				closeQueueIsland();
			}
			queueIsland?.render();
		};

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on('resolved', onVaultResolved);

		return () => {
			clearLauncherTimers();
			detachBasesMultiSelectOperations();
			unsubscribeSettings();
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onVaultResolved);
		};
	});
</script>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<!-- vaultman-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="vaultman-pages-viewport" use:bindViewport use:bindViewRoot>
	<div
		class="vaultman-page-container"
		use:bindContainer
		ontransitionend={onContainerTransitionEnd}
	>
		{#each pageOrder as pageId (pageId)}
			<div class="vaultman-page" data-page={pageId}>
				{#key pageRenderKey}
					{#if pageId === 'statistics'}
						<StatisticsPage
							{plugin}
							active={activePage === pageId}
							onNavigateToDataTab={navigateToDataTab}
						/>
					{:else if pageId === 'filters'}
						<FiltersPage
							{plugin}
							bind:filtersActiveTab
							bind:filtersSearchByTab
							bind:filtersSearchCategory
							bind:fileList
							bind:selectedCount
							bind:tagsExplorer
							bind:propExplorer
							{settingsRevision}
							getSelectedFiles={() =>
								fileList?.getSelectedFiles() ??
								plugin.filterService.selectedFiles}
							{filteredCount}
							{showDock}
							{queueWarningCount}
							onOpenFilters={openFiltersLauncher}
							onClearFilters={clearActiveFilters}
							onOpenQueue={openQueueLauncher}
							onClearQueue={clearQueueQuick}
							{addOpCount}
							expansionRevision={filterRuleCount + filteredCount}
							{icon}
						/>
					{/if}
				{/key}
			</div>
		{/each}
	</div>

	<!-- ─── Island Backdrop (Rising Glass) ─────────────────────────────────── -->
	<div
		class="vaultman-island-backdrop vaultman-glass"
		class:is-open={queueIslandOpen || filtersIslandOpen}
		onclick={() => {
			closeQueueIsland();
			closeFiltersIsland();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				closeQueueIsland();
				closeFiltersIsland();
			}
		}}
		role="button"
		tabindex="-1"
		aria-label="Close island"
	></div>

	<!-- ─── Queue island container — floats above bottom nav ────────────────────── -->
	<div class="vaultman-queue-island-wrap" bind:this={queueIslandEl}></div>
	<div class="vaultman-filters-island-wrap" bind:this={filtersIslandEl}></div>

	{#if showDock}
		{#key settingsRevision}
			<BottomNav
				{pageOrder}
				{activePage}
				{pageLabels}
				{pageIcons}
				{leftFab}
				{rightFab}
				{minimalStyle}
				{queueIslandOpen}
				{filtersIslandOpen}
				{navCollapsed}
				isIslandOpen={queueIslandOpen || filtersIslandOpen}
				bind:isReordering
				{reorderTargetIdx}
				bind:pillEl
				{selectedCount}
				{filterRuleCount}
				filterResultCount={filteredCount}
				{queuedCount}
				{queueWarningCount}
				{bindNav}
				{onCollapsedNavClick}
				{onNavIconPointerDown}
				{onPillPointerMove}
				{onPillPointerUp}
				{exitReorder}
				{navigateTo}
				{icon}
			/>
		{/key}
	{/if}
</div>
