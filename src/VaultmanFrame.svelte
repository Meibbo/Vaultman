<script lang="ts">
	import { mount, onDestroy, onMount, tick, unmount, untrack } from 'svelte';
	import { Notice, Platform, setIcon, type TFile } from 'obsidian';
	import type { VaultmanPlugin } from './main';
	import type { FilesExplorerPanel } from './components/containers/explorerFiles';
	import type { PropsExplorerPanel } from './components/containers/explorerProps';
	import type { TagsExplorerPanel } from './components/containers/explorerTags';
	import type { SnippetsExplorerPanel } from './components/containers/explorerSnippets';
	import type { PluginsExplorerPanel } from './components/containers/explorerPlugins';
	import StatisticsPage from './components/pages/pageStatistics.svelte';
	import FiltersPage from './components/pages/pageFilters.svelte';
	import BottomNav from './components/layout/navbarPillFab.svelte';
	import NavbarPanelWidgetHost from './components/layout/navbarPanelWidgetHost.svelte';
	import FloatingToc from './components/layout/floatingToc.svelte';
	import {
		FloatingTocRouter,
		type FloatingTocExpansionChange,
		type FloatingTocPanel,
	} from './services/routerFloatingToc';
	import {
		buildIndexGroups,
		scopeAfterExpansionChange,
	} from './logic/logicIndexGroups';
	import { resolveFloatingTocToggle } from './logic/logicFloatingTocAvailability';
	import { resolveFloatingTocLaneLayout } from './logic/logicFloatingTocLane';
	import PerformanceHud from './components/layout/performanceHud.svelte';
	import { QueueListComponent } from './components/componentQueueList';
	import { QueueIslandComponent } from './components/layout/islandQueue';
	import {
		ActiveFiltersIslandComponent,
		type ActiveFilterViewState,
	} from './components/layout/islandActiveFilters';
	import { QueueDetailsModal } from './modals/modalQueueDetails';
	import { translate } from './i18n/index';
	import type { FabDef } from './types/typeUI';
	import type {
		ScenePanelWidgetEnvelope,
		ScenePanelWidgetPublication,
	} from './types/typePanelWidget';
	import { ScenePanelWidgetController } from './logic/logicScenePanelWidgetController';
	import { resolveDockPageOrder } from './logic/logicNavigation';
	import type { StatisticsDataTab } from './logic/logicStatisticsNavigation';
	import { countQueuedOperationWarnings } from './logic/logicQueueWarnings';
	import { refreshExplorerViewport } from './logic/logicExplorerViewportActivation';
	import { attachBasesMultiSelectOperations } from './utils/basesMultiSelectOperations';

	// ─── Props ────────────────────────────────────────────────────────────────

	interface Props {
		plugin: VaultmanPlugin;
		initialShowToolbar?: boolean | null;
		onShowToolbarChange?: (val: boolean) => void;
	}
	let {
		plugin,
		initialShowToolbar = null,
		onShowToolbarChange,
	}: Props = $props();
	let frameShowToolbar = $state(
		untrack(() =>
			Platform.isMobile
				? true
				: (initialShowToolbar ?? plugin.settings.showToolbar !== false),
		),
	);
	const effectiveShowToolbar = $derived(Platform.isMobile || frameShowToolbar);

	function handleShowToolbarChange(value: boolean): void {
		frameShowToolbar = value;
		onShowToolbarChange?.(value);
	}

	export function setShowToolbar(val: boolean): void {
		frameShowToolbar = val;
		if (filtersPageRef) {
			filtersPageRef.setShowToolbar?.(val);
		}
	}

	type FiltersPageApi = {
		setShowToolbar?(value: boolean): void;
		setContentQuery?(
			query: string,
			modifiers?: { caseSensitive: boolean; isRegex: boolean },
		): void;
	};

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
	// Rail visibility is a local $state so toggling it is instant — persisting
	// through the generic saveSettings would remount the page and add a visible
	// lag. We sync from settings (settings-tab toggle) and save quietly.
	let floatingTocEnabled = $state(false);
	$effect(() => {
		void settingsRevision;
		floatingTocEnabled = plugin.settings.floatingTocEnabled === true;
	});
	// D40: the floating index (on/off, kind, scope) rides in saved layouts.
	function getFloatingTocState() {
		return {
			enabled: floatingTocEnabled,
			kind: tocKind,
			rootId: tocRootId,
		};
	}
	function applyFloatingTocState(state?: {
		enabled: boolean;
		kind: 'files' | 'folders';
		rootId: string | null;
	}) {
		if (!state) return;
		floatingTocEnabled = state.enabled === true;
		plugin.settings.floatingTocEnabled = floatingTocEnabled;
		void plugin.saveData(plugin.settings);
		tocKind = state.kind === 'files' ? 'files' : 'folders';
		tocRootId = state.rootId || null;
	}

	function toggleFloatingToc() {
		const decision = resolveFloatingTocToggle(
			floatingTocEnabled,
			activeFloatingTocPanel()?.isIndexableSort() === true,
		);
		if (decision.rejection === 'incompatible-sort') {
			new Notice(translate('floating_toc.incompatible_sort'));
			return;
		}
		floatingTocEnabled = decision.nextEnabled;
		plugin.settings.floatingTocEnabled = decision.nextEnabled;
		void plugin.saveData(plugin.settings);
	}
	const floatingTocNiagara = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.floatingTocNiagara === true;
	});
	const tocSoftScroll = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.tocSoftScroll === true;
	});
	const niagaraOpts = $derived.by(() => {
		void settingsRevision;
		const s = plugin.settings;
		return {
			nodes: s.floatingTocNiagaraNodes === true,
			plainStyle: s.floatingTocPlainStyle === true,
			position: s.tocPosition ?? 'right',
			glyphMode: s.tocGlyphMode ?? 'letter',
			// Deferred until the post-beta Niagara effects are specified and patched.
			labelMode: 'off' as const,
			reveal: 'selected' as const,
			glow: false,
			nameOrder: 'flat' as const,
			namePill: false,
			stretch: s.tocStretch === true,
			glyphColor: s.tocGlyphColor ?? 'default',
			glyphCustomColor: s.tocGlyphCustomColor ?? '',
			glyphColorMode: s.tocGlyphColorMode ?? 'static',
		};
	});
	const tocDrillSyncsSort = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.tocDrillSyncsSort === true;
	});
	// D31: the index drill drives the sort scope of the active explorer; when
	// the index closes (or sync is off), the sort returns to its default scope.
	$effect(() => {
		if (!tocDrillSyncsSort) return;
		const rootId = floatingTocEnabled ? tocRootId : null;
		const panel = activeFloatingTocPanel() as {
			applyExternalSortScope?: (id: string | null) => void;
		} | null;
		panel?.applyExternalSortScope?.(rootId || null);
	});
	const performanceHudEnabled = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.performanceHudEnabled;
	});
	const coloredBadges = $derived.by(() => {
		void settingsRevision;
		return plugin.settings.coloredBadges === true;
	});
	let performanceHudInstance: Record<string, never> | null = null;

	function destroyPerformanceHud(): void {
		if (performanceHudInstance) {
			void unmount(performanceHudInstance);
			performanceHudInstance = null;
		}
	}

	$effect(() => {
		if (!performanceHudEnabled) {
			destroyPerformanceHud();
			return;
		}

		performanceHudInstance = mount(PerformanceHud, { target: document.body });

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

	type FiltersTab =
		'files' | 'tags' | 'props' | 'content' | 'snippets' | 'plugins';
	type SearchTab = Exclude<FiltersTab, 'content'>;
	let filtersActiveTab = $state<FiltersTab>('files');

	const sceneInstanceId = untrack(
		() => plugin.manifest.id + '-' + Math.random().toString(36).slice(2, 9),
	);
	const sceneController = new ScenePanelWidgetController(sceneInstanceId);
	onDestroy(() => sceneController.destroy());

	const activeProviderId = $derived(
		activePage === 'statistics' ? 'statistics' : filtersActiveTab,
	);
	let activeGeneration = $state(0);

	$effect(() => {
		const provider = activeProviderId;
		activeGeneration = sceneController.begin(provider);
	});
	let activePanelWidgetEnvelope = $state<ScenePanelWidgetEnvelope | null>(null);
	let panelWidgetPeek = $state(false);

	const activePanelWidgetState = $derived(
		activePanelWidgetEnvelope?.projection ?? null,
	);
	const panelWidgetVisible = $derived(
		effectiveShowToolbar &&
			(activePage === 'statistics' ||
				activePanelWidgetState?.minimalStyle === true ||
				activePanelWidgetState?.showExplorerControls !== false),
	);

	function publishPanelWidget(publication: ScenePanelWidgetPublication): void {
		if (sceneController.publish(publication)) {
			activePanelWidgetEnvelope = publication;
		}
	}

	function clearPanelWidget(
		owner: Pick<
			ScenePanelWidgetEnvelope,
			'sceneInstanceId' | 'providerId' | 'generation'
		>,
	): void {
		if (sceneController.clear(owner)) {
			activePanelWidgetEnvelope = null;
		}
	}

	// Use DOM insertion order (pageOrder at mount time) — avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));

	function navigateTo(page: string) {
		if (activePage !== page) {
			closeQueueIsland();
			closeFiltersIsland();
		}
		activePage = page;
		activeGeneration = sceneController.begin(
			page === 'statistics' ? 'statistics' : filtersActiveTab,
		);
		applyPageTransform(!minimalStyle);
	}

	function navigateToDataTab(tab: StatisticsDataTab) {
		closeQueueIsland();
		closeFiltersIsland();
		filtersActiveTab = tab;
		activeGeneration = sceneController.begin(tab);
		activePage = 'filters';
		applyPageTransform(!minimalStyle);
	}

	async function waitForFrameDom(): Promise<void> {
		await tick();
		await new Promise<void>((resolve) => {
			window.requestAnimationFrame(() => resolve());
		});
	}

	function frameRoot(): ParentNode {
		return viewRootEl ?? document;
	}

	function queryFrameInputs(selectors: string[]): HTMLInputElement[] {
		return selectors.flatMap((selector) =>
			Array.from(frameRoot().querySelectorAll<HTMLInputElement>(selector)),
		);
	}

	function visibleInput(inputs: HTMLInputElement[]): HTMLInputElement | null {
		return (
			inputs.find((input) => input.offsetParent !== null && !input.disabled) ??
			inputs.find((input) => !input.disabled) ??
			null
		);
	}

	async function focusFrameInput(
		selector: string | string[],
	): Promise<boolean> {
		await waitForFrameDom();
		const selectors = Array.isArray(selector) ? selector : [selector];
		const input = visibleInput(queryFrameInputs(selectors));
		if (!input) return false;
		input?.focus();
		input?.select();
		return true;
	}

	async function activateFrameControl(selector: string): Promise<boolean> {
		await waitForFrameDom();
		const control = frameRoot().querySelector<HTMLElement>(selector);
		if (!control) return false;
		control.click();
		return true;
	}

	function notifyFocusUnavailable(): void {
		new Notice(translate('command.focus_search_unavailable'));
	}

	export async function focusContentSearch(
		query?: string,
		modifiers?: { caseSensitive: boolean; isRegex: boolean },
	): Promise<void> {
		navigateToDataTab('content');
		if (query !== undefined)
			filtersPageRef?.setContentQuery?.(query, modifiers);
		const focused = await focusFrameInput(
			'.vaultman-page[data-page="filters"] .vaultman-filters-tab-pane.is-active .vaultman-content-input[type="search"]',
		);
		if (!focused) notifyFocusUnavailable();
	}

	export async function focusActiveExplorerSearch(): Promise<void> {
		const tab: StatisticsDataTab =
			filtersActiveTab === 'files' ||
			filtersActiveTab === 'props' ||
			filtersActiveTab === 'tags'
				? filtersActiveTab
				: 'props';
		navigateToDataTab(tab);
		const explorerSearchSelectors = [
			'.vaultman-panel-widget-host .vaultman-navbar-filters .vaultman-filters-search-input',
			'.vaultman-filters-tab-pane.is-active .vaultman-filters-search-input',
		];
		let focused = await focusFrameInput(explorerSearchSelectors);
		if (!focused) {
			const expanded = await activateFrameControl(
				'.vaultman-panel-widget-host [data-vaultman-search-toggle="true"]',
			);
			if (expanded) focused = await focusFrameInput(explorerSearchSelectors);
		}
		if (!focused) notifyFocusUnavailable();
	}

	export function refreshActiveExplorerViewport(): boolean {
		return refreshExplorerViewport(filtersActiveTab, {
			files: fileList,
			props: propExplorer,
			tags: tagsExplorer,
			snippets: snippetsExplorer,
			plugins: pluginsExplorer,
		});
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
	let frameWidth = $state(0);
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
		const applyFrameHeight = (height: number) => {
			// BT5-034: expose the frame's own height so bottom islands clamp to
			// it and stay scrollable in a short vertical split, instead of 60vh
			// of the whole window overflowing past the frame edge.
			target.style.setProperty('--vaultman-frame-height', `${height}px`);
		};
		const ro = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			const w = rect?.width ?? target.offsetWidth;
			frameWidth = w;
			navCollapsed = w < NAV_COLLAPSE_THRESHOLD;
			applyFrameHeight(rect?.height ?? target.offsetHeight);
		});
		ro.observe(target);
		frameWidth = target.offsetWidth;
		navCollapsed = frameWidth < NAV_COLLAPSE_THRESHOLD;
		applyFrameHeight(target.offsetHeight);
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
	let viewFilterRevision = $state(0);
	let contentSearchScopeRevision = $state('');
	// Bumped (debounced) on vault edits while a content search is active, so
	// the preview re-runs after replace operations remove matches (BT4-020).
	let contentEditRevision = $state(0);
	let contentEditDebounce: number | null = null;
	let filtersClearRevision = $state(0);
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
		const nextContentSearchScopeRevision = `${plugin.filterService.getContentSearchScopeSignature()}:view:${viewFilterRevision}:edit:${contentEditRevision}`;
		if (nextContentSearchScopeRevision !== contentSearchScopeRevision) {
			contentSearchScopeRevision = nextContentSearchScopeRevision;
		}
	}

	function countQueueWarnings(): number {
		return countQueuedOperationWarnings(
			plugin.queueService.queue,
			plugin.settings.bulkOperationWarningThreshold ?? 400,
		);
	}

	let fileList = $state<FilesExplorerPanel | undefined>(undefined);
	let queueList: QueueListComponent | undefined;
	let propExplorer = $state<PropsExplorerPanel | undefined>(undefined);
	let tagsExplorer = $state<TagsExplorerPanel | null>(null);
	let snippetsExplorer = $state<SnippetsExplorerPanel | undefined>(undefined);
	let pluginsExplorer = $state<PluginsExplorerPanel | undefined>(undefined);

	// ─── Floating TOC (FTC-001/002 + toggle/scope-drill) ──────────────────────
	// Explorer panels notify after each render; the rail re-derives its glyphs.
	let explorerRenderRevision = $state(0);
	// Index scope: which node kind (files=leaves / folders=containers) and which
	// subtree root (null = top level; set by the long-press scope drill).
	let tocKind = $state<'files' | 'folders'>('folders');
	let tocRootId = $state<string | null>(null);
	let tocPickMode = $state(false);
	// Pick-mode listener lifecycle is imperative (NOT a reactive $effect) so it can
	// never form a self-referential effect loop with tocPickMode.
	let tocPickCleanup: (() => void) | null = null;
	function stopTocPick(): void {
		tocPickCleanup?.();
		tocPickCleanup = null;
		tocPickMode = false;
	}
	// Panels call this synchronously from their render; coalesce + defer the state
	// write out of the render call stack so it never re-enters Svelte's flush.
	let renderRevisionBumpScheduled = false;
	function bumpExplorerRenderRevision(): void {
		if (renderRevisionBumpScheduled) return;
		renderRevisionBumpScheduled = true;
		queueMicrotask(() => {
			renderRevisionBumpScheduled = false;
			explorerRenderRevision += 1;
		});
	}
	function activeFloatingTocPanel(): FloatingTocPanel | null {
		switch (filtersActiveTab) {
			case 'files':
				return fileList ?? null;
			case 'props':
				return propExplorer ?? null;
			case 'tags':
				return tagsExplorer ?? null;
			case 'snippets':
				return snippetsExplorer ?? null;
			case 'plugins':
				return pluginsExplorer ?? null;
			default:
				return null;
		}
	}
	function handleTocIndexChanged(
		panelId: SearchTab,
		panel: FloatingTocPanel,
		change?: FloatingTocExpansionChange,
	): void {
		bumpExplorerRenderRevision();
		if (!change || filtersActiveTab !== panelId) return;
		tocRootId = scopeAfterExpansionChange(tocRootId, change, (id) =>
			panel.scopeRootForNode(id),
		);
	}
	$effect(() => {
		const candidates: Array<{
			panelId: SearchTab;
			panel: FloatingTocPanel | null | undefined;
		}> = [
			{ panelId: 'files', panel: fileList },
			{ panelId: 'props', panel: propExplorer },
			{ panelId: 'tags', panel: tagsExplorer },
			{ panelId: 'snippets', panel: snippetsExplorer },
			{ panelId: 'plugins', panel: pluginsExplorer },
		];
		const bindings: Array<{
			panel: FloatingTocPanel;
			handler: (change?: FloatingTocExpansionChange) => void;
		}> = [];
		for (const { panelId, panel } of candidates) {
			if (!panel) continue;
			const handler = (change?: FloatingTocExpansionChange) =>
				handleTocIndexChanged(panelId, panel, change);
			panel.onIndexChanged = handler;
			bindings.push({ panel, handler });
		}
		return () => {
			for (const { panel, handler } of bindings) {
				if (panel.onIndexChanged === handler) panel.onIndexChanged = undefined;
			}
		};
	});
	// Reset the scope drill when the active tab changes.
	$effect(() => {
		void filtersActiveTab;
		tocRootId = null;
		stopTocPick();
	});
	const tocAvailable = $derived.by(() => {
		void settingsRevision;
		void filtersActiveTab;
		void explorerRenderRevision;
		const panel = activeFloatingTocPanel();
		return !!panel && panel.isIndexableSort();
	});
	const floatingTocVisible = $derived(
		floatingTocEnabled &&
			activePage === 'filters' &&
			filtersActiveTab !== 'content' &&
			tocAvailable,
	);
	const tocLaneLayout = $derived.by(() => {
		void settingsRevision;
		return resolveFloatingTocLaneLayout({
			visible: floatingTocVisible,
			position: plugin.settings.tocPosition ?? 'right',
			hideScrollbar: plugin.settings.tocHideExplorerScrollbar === true,
			reserveLane: plugin.settings.tocReservedLane === true,
			plainStyle: plugin.settings.floatingTocPlainStyle === true,
			mobile: Platform.isMobile,
		});
	});
	const tocKindToggle = $derived.by(() => {
		void settingsRevision;
		void filtersActiveTab;
		void explorerRenderRevision;
		void tocRootId;
		const panel = activeFloatingTocPanel();
		if (!panel?.supportsKindToggle()) return false;
		// The files/folders toggle only makes sense when THIS level actually holds
		// both kinds; a level with only files (or only folders) uses the simple
		// drill action instead, and indexes all of them.
		const nodes = panel.getIndexNodes(tocRootId);
		return (
			nodes.some((node) => node.isContainer) &&
			nodes.some((node) => !node.isContainer)
		);
	});
	const tocDrill = $derived.by(() => {
		void settingsRevision;
		void filtersActiveTab;
		void explorerRenderRevision;
		return activeFloatingTocPanel()?.supportsDrill() ?? false;
	});
	const tocGroups = $derived.by(() => {
		void explorerRenderRevision;
		void tocKind;
		void tocRootId;
		void filtersActiveTab;
		const panel = activeFloatingTocPanel();
		if (!panel || !panel.isIndexableSort()) return [];
		const nodes = panel.getIndexNodes(tocRootId);
		// Split by kind only when the toggle is actually shown (a mixed files
		// level); a homogeneous level (all files or all folders) indexes all.
		const mixed =
			panel.supportsKindToggle() &&
			nodes.some((node) => node.isContainer) &&
			nodes.some((node) => !node.isContainer);
		const filtered = mixed
			? nodes.filter((node) =>
					tocKind === 'folders' ? node.isContainer : !node.isContainer,
				)
			: nodes;
		return buildIndexGroups(filtered);
	});

	// FTC-002: WAR-shaped router; the active explorer panel is the reveal port.
	const floatingTocRouter = new FloatingTocRouter();
	$effect(() => {
		floatingTocRouter.setPort(activeFloatingTocPanel());
		return () => floatingTocRouter.setPort(null);
	});
	function jumpFloatingToc(targetId: string): void {
		floatingTocRouter.invoke('reveal-node', targetId, {
			behavior: tocSoftScroll ? 'smooth' : 'auto',
		});
	}
	function toggleTocKind(): void {
		tocKind = tocKind === 'folders' ? 'files' : 'folders';
	}
	function closeFloatingToc(): void {
		if (!floatingTocEnabled) return;
		floatingTocEnabled = false;
		plugin.settings.floatingTocEnabled = false;
		void plugin.saveData(plugin.settings);
		stopTocPick();
	}
	function backTocScope(): void {
		const panel = activeFloatingTocPanel();
		if (!panel || tocRootId === null) return;
		tocRootId = panel.scopeRootForNode(tocRootId);
	}
	// Scope drill: the long-press enters pick mode (a WIR→WAR gesture twin); the
	// next explorer row click resolves the scope root from its data-id. Managed
	// imperatively — no reactive effect watches tocPickMode.
	function enterTocPick(): void {
		if (tocPickMode) {
			stopTocPick();
			return;
		}
		const pane = frameRoot().querySelector<HTMLElement>(
			'.vaultman-filters-tab-pane.is-active',
		);
		if (!pane) return;
		const onPick = (event: MouseEvent) => {
			const row = (event.target as HTMLElement | null)?.closest<HTMLElement>(
				'[data-id]',
			);
			const id = row?.dataset.id;
			if (!id) return;
			event.preventDefault();
			event.stopPropagation();
			// Index the level the picked node lives on (its siblings), so picking
			// any node — parent or child — works instead of emptying on a leaf.
			const parentId = activeFloatingTocPanel()?.scopeRootForNode(id) ?? null;
			tocRootId = parentId;
			if (parentId) activeFloatingTocPanel()?.expandNodeById(parentId);
			stopTocPick();
		};
		pane.addEventListener('click', onPick, true);
		const cancelTimer = window.setTimeout(() => stopTocPick(), 8000);
		tocPickCleanup = () => {
			pane.removeEventListener('click', onPick, true);
			window.clearTimeout(cancelTimer);
		};
		tocPickMode = true;
	}
	function fileTypeIdForViewFilter(file: TFile): string {
		return file.extension || 'none';
	}

	function applyActiveFileViewFilters(files: TFile[]): TFile[] {
		const fileTypeFilter = fileList?.getActiveTypeFilter();
		if (!fileTypeFilter) return files;
		return files.filter(
			(file) => fileTypeIdForViewFilter(file) === fileTypeFilter.id,
		);
	}

	const activeViewFilterCount = $derived.by(() => {
		void viewFilterRevision;
		return activeFilterViewStates().length;
	});
	const displayedFilterRuleCount = $derived(
		filterRuleCount + activeViewFilterCount,
	);
	const displayedFilteredCount = $derived.by(() => {
		void viewFilterRevision;
		if (filtersActiveTab === 'files' && fileList?.hasViewFilters()) {
			return fileList.getVisibleFileCount();
		}
		return filteredCount;
	});
	const contentScopeFilteredCount = $derived.by(() => {
		void viewFilterRevision;
		return applyActiveFileViewFilters(
			plugin.filterService.getFilesIgnoringContentSearch(true),
		).length;
	});
	$effect(() => {
		void filtersActiveTab;
		closeQueueIsland();
		closeFiltersIsland();
	});
	let filtersSearchByTab = $state<Record<SearchTab, string>>({
		tags: '',
		props: '',
		files: '',
		snippets: '',
		plugins: '',
	});
	let filtersSearchCategory = $state<Record<SearchTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
		snippets: 0,
		plugins: 0,
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
			case 'snippets':
				snippetsExplorer?.setSearchTerm(term);
				break;
			case 'plugins':
				pluginsExplorer?.setSearchTerm(term);
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
			activeFilterViewStates,
			() => clearActiveFilters(),
			() =>
				fileList?.getDisplayedCount() ?? {
					filtered: plugin.filterService.filteredVaultFiles.length,
					total: plugin.app.vault.getFiles().length,
				},
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
		fileList?.clearNodeTypeFilter();
		filtersClearRevision += 1;
		closeFiltersIsland();
		notifyViewFiltersChanged();
	}

	function notifyViewFiltersChanged() {
		viewFilterRevision += 1;
		updateStats();
		filtersIsland?.render();
	}

	function activeFilterViewStates(): ActiveFilterViewState[] {
		const fileTypeFilter = fileList?.getActiveTypeFilter();
		if (!fileTypeFilter) return [];
		return [
			{
				id: `files:type:${fileTypeFilter.id}`,
				rule: translate('filters.view_state.files_type'),
				label: fileTypeFilter.label,
				description: translate('filters.view_state.files_type_desc', {
					type: fileTypeFilter.label,
				}),
				clear: () => {
					fileList?.clearNodeTypeFilter();
					notifyViewFiltersChanged();
				},
			},
		];
	}

	function clearQueueQuick() {
		plugin.queueService.clear();
		closeQueueIsland();
		updateStats();
	}

	// ─── Child references ──────────────────────────────────────────────────────

	let filtersPageRef = $state<FiltersPageApi | null>(null);

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
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && queueIslandOpen) {
				closeQueueIsland();
			}
			queueIsland?.render();
		};

		const onVaultModified = () => {
			if (!plugin.filterService.hasEnabledContentSearchRule()) return;
			if (contentEditDebounce !== null)
				window.clearTimeout(contentEditDebounce);
			contentEditDebounce = window.setTimeout(() => {
				contentEditDebounce = null;
				contentEditRevision += 1;
				updateStats();
			}, 400);
		};
		const vaultModifyRef = plugin.app.vault.on('modify', onVaultModified);

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		// Two Svelte flushes are intentional: the first publishes providerState to
		// the Scene host; the second lets the mounted renderer apply the complete
		// PVP config to the Explorer port. Only then publish the first real tree.
		// A raw microtask or one tick raced that second flush and built it twice;
		// an animation frame painted an empty tree first and made opening late.
		let initialFilesRenderCancelled = false;
		void tick()
			.then(() => tick())
			.then(() => {
				if (!initialFilesRenderCancelled) refreshFiles();
			});
		refreshQueue();

		return () => {
			initialFilesRenderCancelled = true;
			clearLauncherTimers();
			stopTocPick();
			detachBasesMultiSelectOperations();
			unsubscribeSettings();
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.vault.offref(vaultModifyRef);
			if (contentEditDebounce !== null)
				window.clearTimeout(contentEditDebounce);
		};
	});
</script>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<!-- vaultman-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div
	class="vaultman-pages-viewport"
	class:vaultman-pages-viewport--dock-off={!showDock}
	class:vaultman-pages-viewport--toc-gutter-right={tocLaneLayout.gutterPosition ===
		'right'}
	class:vaultman-pages-viewport--toc-gutter-left={tocLaneLayout.gutterPosition ===
		'left'}
	class:vaultman-pages-viewport--toc-explicit-lane-right={tocLaneLayout.reserveExplicitLane &&
		tocLaneLayout.gutterPosition === 'right'}
	class:vaultman-pages-viewport--toc-hide-scrollbar={tocLaneLayout.hideScrollbar}
	style:--vaultman-toc-content-gutter={`${tocLaneLayout.contentGutterPx}px`}
	style:--vaultman-toc-rail-scrollbar-offset={`${tocLaneLayout.railScrollbarOffsetPx}px`}
	class:vaultman-badges-colored={coloredBadges}
	use:bindViewport
	use:bindViewRoot
>
	<NavbarPanelWidgetHost
		providerState={activePanelWidgetState}
		visible={panelWidgetVisible}
		peeking={panelWidgetPeek}
		onPointerLeave={() => (panelWidgetPeek = false)}
	/>
	{#if !panelWidgetVisible}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="vaultman-toolbar-peek"
			onpointerenter={() => (panelWidgetPeek = true)}
		></div>
	{/if}
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
							sceneInstanceId={sceneController.sceneInstanceId}
							generation={activeGeneration}
							{settingsRevision}
							onNavigateToDataTab={navigateToDataTab}
							toolbarShown={frameShowToolbar}
							onToggleToolbar={() => handleShowToolbarChange(!frameShowToolbar)}
							filterRuleCount={displayedFilterRuleCount}
							filteredCount={displayedFilteredCount}
							{queuedCount}
							{queueWarningCount}
							onOpenFilters={openFiltersLauncher}
							onClearFilters={clearActiveFilters}
							onOpenQueue={openQueueLauncher}
							onClearQueue={clearQueueQuick}
							onPublishPanelWidget={publishPanelWidget}
							onClearPanelWidget={clearPanelWidget}
						/>
					{:else if pageId === 'filters'}
						<FiltersPage
							{plugin}
							{frameWidth}
							sceneInstanceId={sceneController.sceneInstanceId}
							generation={activeGeneration}
							bind:filtersActiveTab
							bind:filtersSearchByTab
							bind:filtersSearchCategory
							bind:fileList
							bind:selectedCount
							bind:tagsExplorer
							bind:propExplorer
							bind:snippetsExplorer
							bind:pluginsExplorer
							{settingsRevision}
							{floatingTocEnabled}
							onToggleFloatingToc={toggleFloatingToc}
							{getFloatingTocState}
							{applyFloatingTocState}
							getSelectedFiles={() =>
								fileList?.getSelectedFiles() ??
								plugin.filterService.selectedFiles}
							filteredCount={displayedFilteredCount}
							filterRuleCount={displayedFilterRuleCount}
							{contentSearchScopeRevision}
							{contentScopeFilteredCount}
							contentScopeTotalCount={plugin.app.vault.getFiles().length}
							contentScopeFilterCount={displayedFilterRuleCount}
							clearFiltersRevision={filtersClearRevision}
							{showDock}
							{queuedCount}
							{queueWarningCount}
							onOpenFilters={openFiltersLauncher}
							onViewFiltersChanged={notifyViewFiltersChanged}
							onContentFilterChanged={refreshFiles}
							onClearFilters={clearActiveFilters}
							onOpenQueue={openQueueLauncher}
							onClearQueue={clearQueueQuick}
							onOpenStatistics={() => navigateTo('statistics')}
							{addOpCount}
							expansionRevision={displayedFilterRuleCount +
								displayedFilteredCount}
							{icon}
							initialShowToolbar={frameShowToolbar}
							onShowToolbarChange={handleShowToolbarChange}
							onPublishPanelWidget={publishPanelWidget}
							onClearPanelWidget={clearPanelWidget}
							bind:this={filtersPageRef}
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

	<!-- ─── Floating TOC rail — overlays the filters page (FTC-001/002) ───────── -->
	<FloatingToc
		visible={floatingTocVisible}
		groups={tocGroups}
		kind={tocKind}
		kindToggle={tocKindToggle}
		drill={tocDrill}
		scoped={tocRootId !== null}
		pickMode={tocPickMode}
		niagara={floatingTocNiagara}
		opts={niagaraOpts}
		onJump={jumpFloatingToc}
		onToggleKind={toggleTocKind}
		onEnterPick={enterTocPick}
		onClose={closeFloatingToc}
		onBack={backTocScope}
	/>

	{#if showDock}
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
			filterRuleCount={displayedFilterRuleCount}
			filterResultCount={displayedFilteredCount}
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
	{/if}
</div>
