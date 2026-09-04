<script lang="ts">
	import { Menu, Notice } from 'obsidian';
	import { onMount, tick, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { translate } from '../../i18n/index';
	import SortPopup from './popupSort.svelte';
	import ViewModePopup from './popupView.svelte';
	import SearchControl from './searchControl.svelte';
	import type {
		ExplorerTabId,
		ExplorerSortState,
		ExplorerViewMode,
	} from '../../types/typeUI';
	import type { SavedLayout, SavedViewConfig } from '../../types/typeSettings';
	import { showInputModal } from '../../utils/inputModal';
	import {
		nextExplorerSortDirection,
		sortDirectionGlyph,
	} from '../../logic/logicSort';
	import {
		activeScopeSort,
		normalizeExplorerSortState,
		replaceActiveScopeSort,
		sameExplorerSortState,
	} from '../../logic/logicScopedSort';
	import {
		isHierarchicalViewMode,
		isViewModeSelectableForDataSurface,
		normalizeExplorerViewMode,
		panelViewModeForDataSurface,
		viewModesForDataSurface,
	} from '../../logic/logicExplorerViewModes';
	import {
		DEFAULT_INTERACTION_MODE,
		interactionModesForTab,
		normalizeInteractionMode,
		type InteractionMode,
	} from '../../logic/logicInteractionMode';
	import {
		shouldHideTabLabelForSearch,
		shouldShowMinimalSearchInput,
		toolbarUsesHorizontalScroll,
		type ToolbarOverflowStrategy,
	} from '../../logic/logicResponsiveLayout';
	import {
		nodeTypeFilterPatch,
		nodeTypeFiltersForState,
		toggleNodeTypeFilter,
	} from '../../logic/logicNodeTypeFilters';
	import { expansionActionAvailable } from '../../logic/logicTreeExpansion';
	import {
		byLevelModel,
		NODE_TYPE_MENU_OPTIONS,
		supportsByLevel,
		visibleSortOptions,
		type NodeTypeMenuOption,
	} from '../../logic/logicSortMenu';
	import {
		cellIcon,
		cellLabelKey,
		cellMenuOrder,
		cellsForExplorer,
		defaultVisibleCells,
		isIdentityCell,
		normalizeVisibleCellIds,
	} from '../../logic/logicCellRegistry';
	import { resolvePanelWidgetProjection } from '../../logic/logicPanelWidgetProjection';
	import {
		resolveCondensedPanelWidgetOverflow,
		searchNeedsOwnRow,
	} from '../../logic/logicPanelWidgetOverflow';
	import { measureSceneSync } from '../../logic/logicScenePerformance';
	import {
		applyLayoutToPort,
		type SceneConfigPort,
	} from '../../logic/logicSceneConfigPort';
	import type { SceneConfig } from '../../types/typeInstance';
	import type {
		NavbarPanelWidgetState,
		PanelWidgetExplorerPort,
		PanelWidgetFilesExplorerPort,
		PanelWidgetHeaderMenuAction,
		PanelWidgetHeaderTabOption,
		PanelWidgetNode,
		PanelWidgetTreeExplorerPort,
	} from '../../types/typePanelWidget';

	type FiltersTab = ExplorerTabId;
	type HeaderTabOption = PanelWidgetHeaderTabOption;
	type HeaderMenuAction = PanelWidgetHeaderMenuAction;
	type NavbarRendererState = NavbarPanelWidgetState & {
		sceneConfigPort: SceneConfigPort;
		fileList?: PanelWidgetFilesExplorerPort;
		propExplorer?: PanelWidgetTreeExplorerPort;
		tagsExplorer?: PanelWidgetTreeExplorerPort | null;
		snippetsExplorer?: PanelWidgetExplorerPort;
		pluginsExplorer?: PanelWidgetExplorerPort;
	};
	type HeaderMode = 'header' | 'sort' | 'viewmode';
	type SearchControlVariant = 'inline' | 'phone' | 'row';
	let {
		activeTab,
		providerId = activeTab,
		actionPort,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		searchExpanded = false,
		onSearchExpandedChange,
		searchTrailingActions = [],
		onSearchTrailingAction,
		tagsExplorer,
		propExplorer,
		fileList,
		snippetsExplorer,
		pluginsExplorer,
		icon,
		addOpCount = 0,
		minimalStyle = true,
		showDock = false,
		tabOptions = [],
		tabMenuActions = [],
		headerActions = [],
		revealActive = false,
		activeSectionTab = activeTab,
		onSectionTabChange,
		onFiltersSearchChange,
		onFiltersSearchCategoryChange,
		onViewFiltersChanged,
		onContentSearch,
		showExplorerControls = true,
		expansionRevision = 0,
		floatingTocEnabled = false,
		onToggleFloatingToc,
		toolbarToolsMenu = false,
		toolbarOverflowStrategy = 'condensed' as ToolbarOverflowStrategy,
		frameWidth = 0,
		onToggleToolbar,
		toolbarShown = true,
		savedLayouts = [],
		onSaveLayout,
		onLayoutLoaded,
		app,
		showTabLabels = true,
		sortLevelInline = true,
		orderCellsByActivation = false,
		commandActions = [],
		createActionsPlacement = 'searchbox',
		pvpuiConfig = {},
		sceneConfigPort,
	}: NavbarRendererState = $props();

	function invokeSceneAction(
		actionId: string,
		origin: 'pointer' | 'keyboard' | 'menu',
		event?: MouseEvent,
	): void {
		void actionPort.invoke({
			actionId,
			origin,
			payload: event ? { event } : undefined,
		});
	}

	async function promptSaveLayout() {
		if (!app) return;
		const name = await showInputModal(app, translate('viewmenu.save_layout'));
		if (name) saveLayout(name);
	}

	const CATEGORY_ICONS: Record<FiltersTab, string[]> = {
		props: ['lucide-search', 'lucide-tag'],
		tags: ['lucide-hash', 'lucide-git-branch'],
		files: ['lucide-file', 'lucide-folder'],
		snippets: ['lucide-file-code'],
		plugins: ['lucide-plug'],
	};
	const CATEGORY_LABELS: Record<FiltersTab, string[]> = {
		props: [
			translate('filter.category.all_props'),
			translate('filter.category.prop_names'),
		],
		tags: [
			translate('filter.category.all_tags'),
			translate('filter.category.leaf_tags'),
		],
		files: [
			translate('filter.category.files'),
			translate('filter.category.folders'),
		],
		snippets: [translate('filter.tab.snippets')],
		plugins: [translate('filter.tab.plugins')],
	};

	const currentCategoryIcon = $derived(
		CATEGORY_ICONS[activeTab]?.[filtersSearchCategory[activeTab] ?? 0] ??
			'lucide-search',
	);
	const currentCreateIcon = $derived(
		activeTab === 'files'
			? filtersSearchCategory.files === 1
				? 'lucide-folder-plus'
				: 'lucide-file-plus'
			: activeTab === 'tags'
				? 'lucide-tag'
				: 'lucide-plus',
	);
	const canCreateSearchTarget = $derived(
		// BT5-022: with Create moved to the toolbar, the Files searchbox no longer
		// carries its own create button; Props and Tags keep theirs.
		(activeTab === 'files' && createActionsPlacement !== 'toolbar') ||
			activeTab === 'props' ||
			activeTab === 'tags',
	);

	const DEFAULT_SORT_STATE: Record<FiltersTab, ExplorerSortState> = {
		props: normalizeExplorerSortState('props', null),
		tags: normalizeExplorerSortState('tags', null),
		files: normalizeExplorerSortState('files', null),
		snippets: normalizeExplorerSortState('snippets', null),
		plugins: normalizeExplorerSortState('plugins', null),
	};
	let headerMode = $state<HeaderMode>('header');
	let headerExitDir = $state<'left' | 'right'>('right');
	const TABS: FiltersTab[] = ['props', 'tags', 'files', 'snippets', 'plugins'];
	let configByTab = $state<Record<FiltersTab, Required<SceneConfig>>>(
		Object.fromEntries(
			TABS.map((tab) => [tab, sceneConfigPort.read(tab)]),
		) as Record<FiltersTab, Required<SceneConfig>>,
	);
	const viewModeByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].viewMode]),
		) as Record<FiltersTab, ExplorerViewMode>,
	);
	const interactionModeByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].interactionMode]),
		) as Record<FiltersTab, InteractionMode>,
	);
	const visibleCellsByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].visibleCells]),
		) as Record<FiltersTab, string[]>,
	);
	const sortStateByTab = $derived(
		Object.fromEntries(
			TABS.map((tab) => [tab, configByTab[tab].sortState]),
		) as Record<FiltersTab, ExplorerSortState>,
	);
	function commitConfig(
		tab: FiltersTab,
		patch: Partial<Required<SceneConfig>>,
	): void {
		const next = { ...configByTab[tab], ...patch };
		configByTab = { ...configByTab, [tab]: next };
		void sceneConfigPort.propose(tab, next);
	}
	const appliedSortStateByTab: Record<FiltersTab, ExplorerSortState> = {
		props: { ...DEFAULT_SORT_STATE.props },
		tags: { ...DEFAULT_SORT_STATE.tags },
		files: { ...DEFAULT_SORT_STATE.files },
		snippets: { ...DEFAULT_SORT_STATE.snippets },
		plugins: { ...DEFAULT_SORT_STATE.plugins },
	};
	const LAYOUT_TABS: FiltersTab[] = [
		'files',
		'props',
		'tags',
		'snippets',
		'plugins',
	];
	// A short, caveman-ish summary of what each explorer holds in this layout.
	function buildLayoutSummary(): string {
		return LAYOUT_TABS.map((tab) => {
			const sort = normalizeSortState(
				tab,
				sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
			);
			const activeSort = activeScopeSort(tab, sort);
			const arrow = sortDirectionGlyph(activeSort.direction);
			return `${tab} ${viewModeByTab[tab]}·${activeSort.sortBy}${arrow}`;
		}).join(' · ');
	}
	function saveLayout(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		const config: Record<string, SavedViewConfig> = {};
		for (const tab of LAYOUT_TABS) {
			const sortState = normalizeSortState(
				tab,
				sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
			);
			config[tab] = {
				viewMode: viewModeByTab[tab],
				visibleCells: [...(visibleCellsByTab[tab] ?? [])],
				interactionMode: interactionModeByTab[tab],
				sortState: {
					...sortState,
					sorts: { ...sortState.sorts },
					...(sortState.nodeTypeFilters
						? { nodeTypeFilters: [...sortState.nodeTypeFilters] }
						: {}),
				},
			};
		}
		onSaveLayout?.({ name: trimmed, summary: buildLayoutSummary(), config });
	}
	function loadLayout(layout: SavedLayout) {
		const nextView = { ...viewModeByTab };
		const nextCells = { ...visibleCellsByTab };
		const nextSort = { ...sortStateByTab };
		const nextInteraction = { ...interactionModeByTab };
		for (const tab of LAYOUT_TABS) {
			const saved = layout.config[tab];
			if (!saved) continue;
			// BT5-016: legacy saved 'grid' loads as Cards.
			nextView[tab] = normalizeExplorerViewMode(saved.viewMode, tab);
			nextCells[tab] = normalizeVisibleCellIds(
				tab,
				saved.visibleCells,
				nextView[tab],
			);
			nextSort[tab] = normalizeSortState(tab, saved.sortState);
			nextInteraction[tab] = normalizeInteractionMode(
				tab,
				saved.interactionMode,
			);
		}
		void applyLayoutToPort(sceneConfigPort, {
			viewModeByTab: nextView,
			interactionModeByTab: nextInteraction,
			visibleCellsByTab: nextCells,
			sortStateByTab: nextSort,
		}).then(() => {
			configByTab = Object.fromEntries(
				TABS.map((tab) => [tab, sceneConfigPort.read(tab)]),
			) as Record<FiltersTab, Required<SceneConfig>>;
		});
		for (const tab of LAYOUT_TABS) {
			applyViewMode(tab, nextView[tab]);
			applyVisibleCells(tab, nextCells[tab]);
			applySortState(tab, nextSort[tab]);
			applyInteractionMode(tab, nextInteraction[tab]);
		}
		onLayoutLoaded?.(layout);
	}
	let navbarEl = $state<HTMLElement | null>(null);
	let actionsEl = $state<HTMLElement | null>(null);
	let measuredOverflowIds = $state<string[]>([]);
	/**
	 * U121-029: raised by the first measurement that had a real width to work
	 * with. Until then the pre-measurement heuristic decides, so the bar never
	 * paints one frame of overflowing nodes on mount.
	 */
	let overflowMeasured = $state(false);
	/**
	 * U121-029: raised when the expanded search field cannot share the action
	 * row, so it renders as a second row under the toolbar. Measured, and
	 * deliberately independent of the overflow strategy.
	 */
	let searchOwnsRow = $state(false);
	let overflowFrame = 0;
	/**
	 * Keyed by LOCAL node id, not by the projected `provider:local` id. Node ids
	 * are namespaced per provider, so a provider switch used to invalidate every
	 * measured width at once: the bar read 0 for everything, expanded fully, then
	 * condensed again on the next frame. Widths belong to the node, not to the
	 * provider that projected it.
	 */
	const measuredNodeWidths = new SvelteMap<string, number>();
	const measuredWidthKey = (nodeId: string): string =>
		nodeId.slice(nodeId.indexOf(':') + 1);
	/**
	 * U121-029: the width the packer may spend is the width of the line, taken
	 * from the row's containing block — not `actionsEl.clientWidth`.
	 *
	 * A theme owns our actions container the moment we opt into
	 * `nav-buttons-container` (Velocity collapses it to `width: 48px; height: 0`
	 * and reveals it on `.nav-header:hover`). Measuring the container therefore
	 * fed the packer a themed 48px, it condensed down to its two-node minimum,
	 * and our own `overflow: hidden` clipped whatever the hover then revealed.
	 * The parent's content box is the honest budget: our container is `width:
	 * 100%` of it, and a theme resizing the container cannot lie about it.
	 */
	function availableToolbarWidth(actions: HTMLElement): number {
		const own = actions.clientWidth;
		const parent = actions.parentElement;
		if (!parent) return own;
		const style = window.getComputedStyle(parent);
		const inner =
			parent.clientWidth -
			(Number.parseFloat(style.paddingInlineStart) || 0) -
			(Number.parseFloat(style.paddingInlineEnd) || 0);
		return Math.max(own, inner);
	}
	let drillPickCleanup: (() => void) | null = null;
	let revealPickCleanup: (() => void) | null = null;
	let expansionRefresh = $state(0);
	const headerActionClass = $derived(
		minimalStyle ? 'clickable-icon nav-action-button' : 'vaultman-nav-fab',
	);
	const hasExpandedNodes = $derived.by(() => {
		void expansionRevision;
		void expansionRefresh;
		void filtersSearch;
		void filtersSearchCategory[activeTab];
		if (activeTab === 'files') return fileList?.hasExpandedNodes() ?? false;
		if (activeTab === 'props') return propExplorer?.hasExpandedNodes() ?? false;
		if (activeTab === 'tags') return tagsExplorer?.hasExpandedNodes() ?? false;
		return false;
	});
	const expansionActionAvailableForActiveTab = $derived(
		expansionActionAvailable(
			activeTab,
			visibleCellsByTab[activeTab] ??
				defaultVisibleCells(activeTab, viewModeByTab[activeTab]),
		),
	);
	const expansionLabel = $derived(
		hasExpandedNodes
			? translate('filter.collapse_all')
			: translate('filter.expand_all'),
	);
	const expansionIcon = $derived(
		hasExpandedNodes ? 'lucide-chevrons-down-up' : 'lucide-chevrons-up-down',
	);
	const currentTabsOption = $derived(
		tabOptions.find((option) => option.id === activeSectionTab) ??
			tabOptions[0] ??
			null,
	);
	const currentTabsIcon = $derived(
		currentTabsOption?.icon ?? 'lucide-panels-top-left',
	);
	const currentTabsLabel = $derived(
		currentTabsOption
			? `${translate('filter.tabs_btn')}: ${currentTabsOption.label}`
			: translate('filter.tabs_btn'),
	);
	// TODO(refactor): remove this pre-scene bridge once the sandbox header owns
	// tab labels and responsive sacrifices as one layout contract.
	const tabLabelIntended = $derived(
		minimalStyle && currentTabsOption !== null && showTabLabels !== false,
	);
	const tabLabelYieldsToSearch = $derived(
		shouldHideTabLabelForSearch({ frameWidth, minimalStyle, searchExpanded }),
	);
	const showTabsButtonLabel = $derived(
		tabLabelIntended && !tabLabelYieldsToSearch,
	);
	const panelWidgetNodeId = (localId: string): string =>
		`${providerId}:${localId}`;
	const panelWidgetNodes = $derived.by<PanelWidgetNode[]>(() => {
		const nodes: PanelWidgetNode[] = [];
		const append = (
			localId: string,
			label: string,
			iconName: string,
			presentation: PanelWidgetNode['presentation'] = 'button',
			condensable = true,
			available = true,
			order?: number,
		) => {
			nodes.push({
				id: panelWidgetNodeId(localId),
				nodeKind: 'action',
				cellKind: 'action',
				presentation,
				label,
				icon: iconName,
				order: order ?? nodes.length,
				available,
				condensable,
				action: { id: localId },
			});
		};

		if (minimalStyle && tabOptions.length > 0) {
			append('tabs', currentTabsLabel, currentTabsIcon, 'tabs', false);
		}
		for (const action of headerActions) {
			nodes.push({
				id: panelWidgetNodeId(`header:${action.id}`),
				nodeKind: 'action',
				cellKind: 'action',
				presentation: 'button',
				label: action.label,
				icon: action.icon,
				order: action.order ?? 0,
				available: !action.disabled,
				checked: action.checked,
				action: { id: `header:${action.id}` },
				condensable: false,
			});
		}
		if (!showExplorerControls) return nodes;

		append(
			'view',
			translate('filter.viewmode_btn'),
			'lucide-layout-list',
			'menu',
		);
		append(
			'sort',
			translate('filter.sort_btn'),
			'lucide-arrow-up-down',
			'menu',
		);
		append(
			'search',
			translate('explorer.btn.search'),
			'lucide-search',
			'search',
			false,
			true,
			10,
		);
		if (activeTab === 'files') {
			append(
				'reveal-active-file',
				translate('filter.auto_reveal'),
				'lucide-gallery-vertical',
				'button',
				true,
				true,
				20,
			);
		}
		if (expansionActionAvailableForActiveTab) {
			append(
				'toggle-expansion',
				expansionLabel,
				expansionIcon,
				'toggle',
				true,
				true,
				30,
			);
		}
		if (activeTab === 'files' && createActionsPlacement === 'toolbar') {
			append(
				'create-file',
				translate('folder.ctx.new_note'),
				'lucide-file-plus',
				'button',
				true,
				true,
				40,
			);
			append(
				'create-folder',
				translate('folder.ctx.new_folder'),
				'lucide-folder-plus',
				'button',
				true,
				true,
				41,
			);
		}
		for (const command of commandActions) {
			append(
				`command:${command.id}`,
				command.label,
				command.icon ?? 'lucide-terminal',
				'button',
				true,
				command.available,
				50,
			);
		}
		return nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	});
	const panelWidgetProjection = $derived(
		resolvePanelWidgetProjection({
			providerId,
			nodes: panelWidgetNodes,
			config: pvpuiConfig,
		}),
	);
	const forcedOverflowIds = $derived.by(() => {
		if (
			!minimalStyle ||
			toolbarOverflowStrategy !== 'condensed' ||
			!toolbarToolsMenu ||
			// U121-029: once the bar has actually been measured, the measurement is
			// the answer. The count heuristic below hides at least two nodes no
			// matter how wide the frame is, so leaving it in charge made the
			// measured pipeline dead code and over-condensed a roomy toolbar.
			overflowMeasured
		) {
			return measuredOverflowIds;
		}
		const candidates = panelWidgetProjection.nodes.filter(
			(node) => node.condensable !== false,
		);
		const minimumVisible = tabLabelIntended ? 3 : 4;
		const hiddenCount = Math.min(
			candidates.length,
			Math.max(2, panelWidgetProjection.nodes.length - minimumVisible),
		);
		return candidates.slice(-hiddenCount).map((node) => node.id);
	});
	const toolbarNodeVisible = (localId: string): boolean =>
		panelWidgetProjection.nodes.some(
			(node) => node.id === panelWidgetNodeId(localId),
		) &&
		(toolbarOverflowStrategy !== 'condensed' ||
			!forcedOverflowIds.includes(panelWidgetNodeId(localId)));
	const panelWidgetNodeOrder = (localId: string): number =>
		panelWidgetProjection.nodes.findIndex(
			(node) => node.id === panelWidgetNodeId(localId),
		);
	const compactPanelWidgetTools = $derived(
		toolbarOverflowStrategy === 'condensed' && forcedOverflowIds.length > 0,
	);
	// BT5-021: in scroll mode the action bar is one horizontally scrollable line
	// with an overflow hint, instead of moving nodes into the Tools menu.
	const toolbarScroll = $derived(
		minimalStyle && toolbarUsesHorizontalScroll(toolbarOverflowStrategy),
	);
	const toolbarWrap = $derived(
		minimalStyle && toolbarOverflowStrategy === 'wrap',
	);
	const showSearchInput = $derived(
		shouldShowMinimalSearchInput({
			frameWidth,
			minimalStyle,
			searchExpanded,
			tabLabelVisible: showTabsButtonLabel,
		}),
	);

	function measurePanelWidgetOverflow(): void {
		overflowFrame = 0;
		if (!actionsEl || !minimalStyle) {
			if (measuredOverflowIds.length > 0) measuredOverflowIds = [];
			overflowMeasured = false;
			searchOwnsRow = false;
			return;
		}

		// U121-029: an unmeasurable bar keeps what it already shows. A page
		// mid-slide, a hidden toolbar (`height: 0`), a collapsed sidebar or a
		// still-deferred mobile drawer all report 0 here, and recomputing from 0
		// condensed the whole bar into Tools for a frame — the flicker the dev
		// sees when switching provider quickly.
		const availableWidth = availableToolbarWidth(actionsEl);
		if (availableWidth <= 0) return;

		const elements = actionsEl.querySelectorAll<HTMLElement>(
			'[data-panel-widget-node-id]',
		);
		for (const element of elements) {
			const id = element.dataset.panelWidgetNodeId;
			if (!id || element.hidden) continue;
			const width = element.getBoundingClientRect().width;
			if (width > 0) measuredNodeWidths.set(measuredWidthKey(id), width);
		}

		const style = window.getComputedStyle(actionsEl);
		const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
		const toolsMeasure = actionsEl.querySelector<HTMLElement>(
			'[data-panel-widget-tools-measure]',
		);
		const toolsWidth = toolsMeasure?.getBoundingClientRect().width ?? 0;

		// The second-row decision runs for every overflow strategy — the action
		// row belongs to the nodes, and the field only shares it when what is left
		// is still a usable field.
		if (showSearchInput) {
			const barNodeWidths = panelWidgetProjection.nodes.map(
				(node) =>
					measuredNodeWidths.get(measuredWidthKey(node.id)) || toolsWidth,
			);
			const nextSearchOwnsRow = searchNeedsOwnRow({
				availableWidth,
				nodeWidths: barNodeWidths,
				gap,
				// Search must move before any action becomes an overflow victim.
				// The Tools button is therefore not part of this pre-pack budget.
				toolsWidth: 0,
			});
			if (nextSearchOwnsRow !== searchOwnsRow) {
				searchOwnsRow = nextSearchOwnsRow;
				window.requestAnimationFrame(focusVisibleSearchInput);
			}
		} else if (searchOwnsRow) {
			searchOwnsRow = false;
		}

		if (toolbarOverflowStrategy !== 'condensed') {
			if (measuredOverflowIds.length > 0) measuredOverflowIds = [];
			overflowMeasured = false;
			return;
		}
		const measuredNodes = panelWidgetProjection.nodes.map((node) => ({
			id: node.id,
			// Only projected action nodes are measured. The auxiliary search field
			// has no node id, so Search always contributes its button width here.
			width: measuredNodeWidths.get(measuredWidthKey(node.id)) ?? 0,
			condensable: node.condensable,
		}));
		// Every node reporting 0 means nothing has been laid out yet (a provider
		// projected on its first frame). Packing that would answer "it all fits",
		// which is the other half of the flicker.
		if (measuredNodes.every((node) => node.width <= 0)) return;
		const result = resolveCondensedPanelWidgetOverflow({
			availableWidth,
			nodes: measuredNodes,
			gap,
			toolsWidth,
		});
		overflowMeasured = true;
		const signature = result.overflowIds.join('\u0000');
		if (signature !== measuredOverflowIds.join('\u0000')) {
			measuredOverflowIds = result.overflowIds;
		}
	}

	function schedulePanelWidgetOverflowMeasure(): void {
		if (overflowFrame !== 0) return;
		overflowFrame = window.requestAnimationFrame(measurePanelWidgetOverflow);
	}

	onMount(() => {
		const resizeObserver = new ResizeObserver(
			schedulePanelWidgetOverflowMeasure,
		);
		const mutationObserver = new MutationObserver(
			schedulePanelWidgetOverflowMeasure,
		);
		if (navbarEl) resizeObserver.observe(navbarEl);
		if (actionsEl) {
			resizeObserver.observe(actionsEl);
			mutationObserver.observe(actionsEl, {
				childList: true,
				subtree: true,
			});
		}
		schedulePanelWidgetOverflowMeasure();
		return () => {
			if (overflowFrame !== 0) window.cancelAnimationFrame(overflowFrame);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	});

	$effect(() => {
		void panelWidgetProjection;
		void showTabsButtonLabel;
		void searchExpanded;
		void showSearchInput;
		void toolbarOverflowStrategy;
		schedulePanelWidgetOverflowMeasure();
	});

	function menuEventFromElement(element: HTMLElement): MouseEvent {
		const rect = element.getBoundingClientRect();
		return new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			clientX: rect.left + rect.width / 2,
			clientY: rect.bottom,
			view: window,
		});
	}

	function openSortPopup(event?: MouseEvent) {
		if (minimalStyle && event) {
			openNativeSortMenu(event);
			return;
		}
		headerExitDir = 'right';
		headerMode = 'sort';
	}
	function openViewModePopup(event?: MouseEvent) {
		if (minimalStyle && event) {
			openNativeViewMenu(event);
			return;
		}
		headerExitDir = 'left';
		headerMode = 'viewmode';
	}
	function openTabsPopup(event: MouseEvent) {
		if (!tabOptions.length) return;
		openNativeTabsMenu(event);
	}
	function closeHeaderPopup() {
		headerMode = 'header';
	}

	function cycleSearchCategory() {
		const tab = activeTab;
		const count = CATEGORY_ICONS[tab].length;
		const next = {
			...filtersSearchCategory,
			[tab]: ((filtersSearchCategory[tab] ?? 0) + 1) % Math.max(1, count),
		};
		if (onFiltersSearchCategoryChange) {
			onFiltersSearchCategoryChange(next);
			return;
		}
		filtersSearchCategory = next;
	}

	function setFiltersSearch(value: string) {
		if (onFiltersSearchChange) {
			onFiltersSearchChange(value);
			return;
		}
		filtersSearch = value;
	}

	function setSearchExpanded(expanded: boolean): void {
		searchExpanded = expanded;
		onSearchExpandedChange?.(expanded);
	}

	function expandSearch() {
		setSearchExpanded(true);
		window.requestAnimationFrame(() => focusVisibleSearchInput());
	}

	function toggleSearch() {
		if (!minimalStyle || !searchExpanded) {
			expandSearch();
			return;
		}
		setSearchExpanded(false);
		blurSearchInputs();
	}

	function searchInputs() {
		return Array.from(
			(navbarEl ?? document).querySelectorAll<HTMLInputElement>(
				'.vaultman-filters-search-input',
			),
		);
	}

	function focusVisibleSearchInput() {
		const input = searchInputs().find((candidate) => candidate.offsetParent);
		input?.focus();
	}

	function blurSearchInputs() {
		for (const input of searchInputs()) input.blur();
	}

	function createSearchTarget() {
		const tab = activeTab;
		if (tab === 'files') {
			void fileList?.createFromSearch(
				filtersSearchCategory.files ?? 0,
				filtersSearch,
			);
			return;
		}
		if (tab === 'props') {
			propExplorer?.createFromSearch(
				filtersSearch,
				filtersSearchCategory.props ?? 0,
			);
			return;
		}
		if (tab === 'tags') tagsExplorer?.createFromSearch(filtersSearch);
	}

	function applySortState(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(tab, state, true);
		if (!sameSortState(state, normalizedState)) {
			commitConfig(tab, { sortState: normalizedState });
		}
		appliedSortStateByTab[tab] = normalizedState;
		if (tab === 'files') fileList?.setSortState(normalizedState);
		if (tab === 'props') {
			propExplorer?.setSortState(normalizedState);
		}
		if (tab === 'tags') {
			tagsExplorer?.setSortState(normalizedState);
		}
		if (tab === 'snippets') snippetsExplorer?.setSortState(normalizedState);
		if (tab === 'plugins') pluginsExplorer?.setSortState(normalizedState);
	}

	function applyViewMode(tab: FiltersTab, mode: ExplorerViewMode) {
		const effectiveMode = panelViewModeForDataSurface(tab, mode);
		if (tab === 'files') {
			fileList?.setViewMode(
				effectiveMode === 'table'
					? 'table'
					: effectiveMode === 'grid'
						? 'grid'
						: 'tree',
			);
		}
		if (tab === 'props') propExplorer?.setViewMode(effectiveMode);
		if (tab === 'tags') tagsExplorer?.setViewMode(effectiveMode);
		if (tab === 'snippets') snippetsExplorer?.setViewMode(effectiveMode);
		if (tab === 'plugins') pluginsExplorer?.setViewMode(effectiveMode);
	}

	function applyVisibleCells(tab: FiltersTab, cells: string[]) {
		const cellSet = new Set(cells);
		if (tab === 'files') fileList?.setVisibleCells(cellSet);
		if (tab === 'props') propExplorer?.setVisibleCells(cellSet);
		if (tab === 'tags') tagsExplorer?.setVisibleCells(cellSet);
		if (tab === 'snippets') snippetsExplorer?.setVisibleCells(cellSet);
		if (tab === 'plugins') pluginsExplorer?.setVisibleCells(cellSet);
	}

	function applyInteractionMode(tab: FiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		if (tab === 'files') fileList?.setInteractionMode(normalized);
		if (tab === 'props') {
			propExplorer?.setInteractionMode(normalized, onContentSearch);
		}
		if (tab === 'tags') {
			tagsExplorer?.setInteractionMode(normalized, onContentSearch);
		}
		if (tab === 'snippets') snippetsExplorer?.setInteractionMode?.(normalized);
		if (tab === 'plugins') pluginsExplorer?.setInteractionMode?.(normalized);
	}

	function selectInteractionMode(tab: FiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		commitConfig(tab, { interactionMode: normalized });
		applyInteractionMode(tab, normalized);
		onViewFiltersChanged?.();
	}

	function handleSortChange(state: ExplorerSortState) {
		measureSceneSync(
			`scene.action.change-sort.${activeTab}`,
			{ operations: 1 },
			() => {
				const normalizedState = normalizeSortState(activeTab, state);
				commitConfig(activeTab, { sortState: normalizedState });
				applySortState(activeTab, normalizedState);
				onViewFiltersChanged?.();
			},
		);
	}

	function handleScopeChangeForTab(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(tab, state);
		commitConfig(tab, { sortState: normalizedState });
		onViewFiltersChanged?.();
	}

	function handleScopeChange(state: ExplorerSortState) {
		handleScopeChangeForTab(activeTab, state);
	}

	function handleFilterChange(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(activeTab, state);
		const appliedState = appliedSortStateByTab[activeTab];
		commitConfig(activeTab, { sortState: normalizedState });
		applySortState(activeTab, {
			...normalizedState,
			sorts: appliedState.sorts,
			activeScope: appliedState.activeScope,
			drillNodeId: appliedState.drillNodeId,
			parentsFirst: appliedState.parentsFirst,
		});
		onViewFiltersChanged?.();
	}

	function sameSortState(
		left: ExplorerSortState,
		right: ExplorerSortState,
	): boolean {
		return sameExplorerSortState(left, right);
	}

	function handleExternalFilesSortState(state: ExplorerSortState) {
		const normalizedState = normalizeSortState('files', state);
		if (sameSortState(appliedSortStateByTab.files, normalizedState)) return;
		appliedSortStateByTab.files = normalizedState;
		const currentByTab = untrack(() => ({
			...sortStateByTab,
			files: normalizeSortState(
				'files',
				sortStateByTab.files ?? DEFAULT_SORT_STATE.files,
			),
		}));
		if (sameSortState(currentByTab.files, normalizedState)) return;
		commitConfig('files', { sortState: normalizedState });
	}

	function handleExternalTagsSortState(state: ExplorerSortState) {
		const normalizedState = normalizeSortState('tags', state);
		if (sameSortState(appliedSortStateByTab.tags, normalizedState)) return;
		appliedSortStateByTab.tags = normalizedState;
		const currentByTab = untrack(() => ({
			...sortStateByTab,
			tags: normalizeSortState(
				'tags',
				sortStateByTab.tags ?? DEFAULT_SORT_STATE.tags,
			),
		}));
		if (sameSortState(currentByTab.tags, normalizedState)) return;
		commitConfig('tags', { sortState: normalizedState });
	}

	function handleViewModeChange(mode: ExplorerViewMode) {
		if (!isViewModeSelectableForDataSurface(activeTab, mode)) return;
		commitConfig(activeTab, { viewMode: mode });
		applyViewMode(activeTab, mode);
	}

	function handlePillsChange(cells: string[]) {
		measureSceneSync(
			`scene.action.toggle-cell.${activeTab}`,
			{ operations: 1 },
			() => {
				commitConfig(activeTab, { visibleCells: cells });
				applyVisibleCells(activeTab, cells);
			},
		);
	}

	function canToggleIdentity(
		cells: Set<string>,
		id: string,
		viewMode: ExplorerViewMode,
	): boolean {
		if (!isIdentityCell(activeTab, id, viewMode) || !cells.has(id)) return true;
		return cellsForExplorer(activeTab, viewMode).some(
			(candidate) =>
				candidate.id !== id &&
				candidate.role === 'identity' &&
				cells.has(candidate.id),
		);
	}

	function toggleVisibleCell(id: string) {
		const viewMode = viewModeByTab[activeTab] ?? 'tree';
		const cells = new Set(
			visibleCellsByTab[activeTab] ?? defaultVisibleCells(activeTab, viewMode),
		);
		if (cells.has(id)) {
			if (!canToggleIdentity(cells, id, viewMode)) return;
			cells.delete(id);
		} else {
			cells.add(id);
		}
		handlePillsChange(Array.from(cells));
	}

	function selectNativeViewMode(mode: ExplorerViewMode) {
		if (!isViewModeSelectableForDataSurface(activeTab, mode)) return;
		handleViewModeChange(mode);
	}

	function openNativeViewMenu(event: MouseEvent) {
		const menu = new Menu();
		const activeView = viewModeByTab[activeTab] ?? 'tree';
		const minimalNativeViewModes = minimalStyle
			? viewModesForDataSurface(activeTab).filter(
					(option) => option.id !== 'dnd',
				)
			: viewModesForDataSurface(activeTab);

		// Saved layouts first; the creation action is deliberately last.
		if (onSaveLayout) {
			menu.addItem((item) => {
				item
					.setTitle(translate('viewmenu.layouts'))
					.setIcon('lucide-layout-template');
				const sub = (
					item as typeof item & { setSubmenu: () => Menu }
				).setSubmenu();
				if (savedLayouts.length > 0) {
					for (const layout of savedLayouts) {
						sub.addItem((s) =>
							s
								.setTitle(layout.name)
								.setIcon('lucide-layout-template')
								.onClick(() => loadLayout(layout)),
						);
					}
					sub.addSeparator();
				}
				sub.addItem((s) =>
					s
						.setTitle(translate('viewmenu.save_layout'))
						.setIcon('lucide-save')
						.onClick(() => void promptSaveLayout()),
				);
			});
		}

		if (onSaveLayout) menu.addSeparator();
		menu.addItem((item) => {
			item
				.setTitle(translate('viewmenu.interaction'))
				.setIcon('lucide-mouse-pointer-click');
			const sub = (
				item as typeof item & { setSubmenu: () => Menu }
			).setSubmenu();
			for (const mode of interactionModesForTab(activeTab)) {
				sub.addItem((subItem) =>
					subItem
						.setTitle(translate(`viewmenu.interaction.${mode}`))
						.setIcon(
							mode === 'open'
								? 'lucide-folder-open'
								: mode === 'filter'
									? 'lucide-list-filter'
									: mode === 'add'
										? 'lucide-plus'
										: 'lucide-mouse-pointer-2',
						)
						.setChecked(interactionModeByTab[activeTab] === mode)
						.onClick(() => selectInteractionMode(activeTab, mode)),
				);
			}
		});

		menu.addSeparator();
		// 'Nested' stays in the sort menu's By level group (D29).
		// BT5-011: the menu mirrors the row — active cells in render order
		// first, then the rest at their canonical rank.
		for (const entry of cellMenuOrder(
			activeTab,
			visibleCellsByTab[activeTab] ??
				defaultVisibleCells(activeTab, activeView),
			{
				byActivation: orderCellsByActivation,
				viewMode: activeView,
				selectionMode: interactionModeByTab[activeTab] === 'select',
			},
		)) {
			menu.addItem((item) => {
				item
					.setTitle(
						translate(cellLabelKey(entry.definition, activeTab, activeView)),
					)
					.setIcon(cellIcon(entry.definition, activeTab, activeView))
					.setChecked(entry.active)
					.onClick(() => toggleVisibleCell(entry.id));
			});
		}

		// Rendering engines are the final section.
		menu.addSeparator();
		menu.addItem((submenuItem) => {
			submenuItem.setTitle('Engines').setIcon('lucide-layout');
			const submenu =
				(submenuItem as unknown as { setSubmenu: () => Menu }).setSubmenu() ||
				new Menu();
			for (const option of minimalNativeViewModes) {
				submenu.addItem((item) => {
					item
						.setTitle(translate(option.labelKey))
						.setIcon(option.icon)
						.setChecked(activeView === option.id)
						.setDisabled(option.locked ?? false);
					if (!option.locked) {
						item.onClick(() => selectNativeViewMode(option.id));
					}
				});
			}
		});
		menu.showAtMouseEvent(event);
	}

	function openNativeTabsMenu(event: MouseEvent) {
		const menu = new Menu();
		const primaryTabOptions = tabOptions.filter(
			(option) => option.id !== 'snippets' && option.id !== 'plugins',
		);
		const addonTabOptions = tabOptions.filter(
			(option) => option.id === 'snippets' || option.id === 'plugins',
		);
		const renderTabOption = (option: HeaderTabOption) => {
			menu.addItem((item) => {
				item
					.setTitle(option.label)
					.setIcon(option.icon)
					.setChecked(option.id === activeSectionTab)
					.onClick(() => onSectionTabChange?.(option.id));
			});
		};
		for (const option of primaryTabOptions) renderTabOption(option);
		const renderTabAction = (action: HeaderMenuAction) => {
			menu.addItem((item) => {
				const isCountedLauncher =
					action.id === 'filters' || action.id === 'queue';
				const countLabel =
					isCountedLauncher && action.count && action.count > 0
						? ` (${action.count})`
						: '';
				const warningLabel = isCountedLauncher && action.warning ? ' !' : '';
				item
					.setTitle(`${action.label}${countLabel}${warningLabel}`)
					.setIcon(action.warning ? 'lucide-alert-triangle' : action.icon)
					.onClick(() => action.onClick());
			});
		};
		const statisticsAction = tabMenuActions.find((a) => a.id === 'statistics');
		const launcherActions = tabMenuActions.filter((a) => a.id !== 'statistics');
		if (!showDock && launcherActions.length > 0) {
			menu.addSeparator();
			for (const action of launcherActions) renderTabAction(action);
		}
		// Floating index is its own section below Filters + Queue.
		if (onToggleFloatingToc) {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(translate('floating_toc.menu'))
					.setIcon('lucide-a-arrow-down')
					.setChecked(floatingTocEnabled)
					.onClick(() => onToggleFloatingToc?.());
			});
		}
		// Statistics and add-on explorers share the next section.
		if ((!showDock && statisticsAction) || addonTabOptions.length > 0) {
			menu.addSeparator();
		}
		if (!showDock && statisticsAction) renderTabAction(statisticsAction);
		for (const option of addonTabOptions) renderTabOption(option);
		// Toolbar visibility — its own section at the end of the tabs menu.
		if (onToggleToolbar) {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(translate('viewmenu.toolbar'))
					.setIcon('lucide-panel-top')
					.setChecked(toolbarShown)
					.onClick(() => onToggleToolbar?.());
			});
		}
		menu.showAtMouseEvent(event);
	}

	function nextSortState(id: string): ExplorerSortState {
		const current = normalizeSortState(
			activeTab,
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);
		const activeSort = activeScopeSort(activeTab, current);
		const direction = nextExplorerSortDirection(
			activeSort.sortBy,
			activeSort.direction,
			id,
		);
		return replaceActiveScopeSort(activeTab, current, {
			sortBy: id,
			direction,
		});
	}

	function normalizeSortState(
		tab: FiltersTab,
		state: ExplorerSortState,
		validateDrill = false,
	): ExplorerSortState {
		const normalized = normalizeExplorerSortState(tab, state, {
			...(validateDrill && tab === 'files' && fileList
				? { isValidDrillNode: (id: string) => fileList.hasSortNode(id) }
				: {}),
			...(validateDrill && tab === 'tags' && tagsExplorer
				? {
						isValidDrillNode: (id: string) =>
							tagsExplorer.hasSortNode?.(id) ?? false,
					}
				: {}),
		});
		return {
			...normalized,
			...nodeTypeFilterPatch(nodeTypeFiltersForState(normalized)),
		};
	}

	function stopDrillPick() {
		drillPickCleanup?.();
		drillPickCleanup = null;
	}

	function beginDrillPick(tab: FiltersTab) {
		if (tab !== 'files' && tab !== 'tags') return;
		stopDrillPick();
		const pane =
			navbarEl?.closest<HTMLElement>('.vaultman-filters-tab-pane.is-active') ??
			document.querySelector<HTMLElement>(
				'.vaultman-filters-tab-pane.is-active',
			);
		if (!pane) return;
		// D29 drill UX (twin of the floating-index pick): a dashed frame marks
		// pick mode and ONE simple click on any row selects that row's LEVEL
		// (its parent scope). Re-open Scope / choose All levels to change it.
		pane.classList.add('vaultman-sort-pick-mode');
		const suppressEvent = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const onPick = (event: PointerEvent) => {
			const target =
				event.target instanceof Element
					? event.target.closest<HTMLElement>('[data-id]')
					: null;
			const nodeId = target?.dataset.id;
			if (!nodeId) return;
			suppressEvent(event);
			const panel = tab === 'files' ? fileList : tagsExplorer;
			const parentId = panel?.scopeRootForNode(nodeId) ?? null;
			const current = normalizeSortState(
				tab,
				untrack(() => sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab]),
			);
			handleScopeChangeForTab(
				tab,
				parentId
					? { ...current, activeScope: 'drill', drillNodeId: parentId }
					: { ...current, activeScope: 'all', drillNodeId: null },
			);
			stopDrillPick();
		};
		const timeout = window.setTimeout(stopDrillPick, 8000);
		pane.addEventListener('pointerdown', onPick, true);
		pane.addEventListener('click', suppressEvent, true);
		drillPickCleanup = () => {
			window.clearTimeout(timeout);
			pane.classList.remove('vaultman-sort-pick-mode');
			pane.removeEventListener('pointerdown', onPick, true);
			// Let the click that completed the pick stay suppressed.
			window.setTimeout(
				() => pane.removeEventListener('click', suppressEvent, true),
				400,
			);
		};
		new Notice(translate('sort.level.pick_hint'));
	}

	function stopRevealPick() {
		revealPickCleanup?.();
		revealPickCleanup = null;
	}

	/**
	 * Holds the reveal projection to one note and returns to the scene the pick
	 * started from. The anchor outlives the workspace's own current file — only
	 * `Current file` in the same drawer releases it.
	 */
	function anchorRevealNote(originTab: FiltersTab, path: string) {
		const current = normalizeSortState(
			originTab,
			untrack(() => sortStateByTab[originTab] ?? DEFAULT_SORT_STATE[originTab]),
		);
		const anchored: ExplorerSortState = {
			...current,
			revealAnchor: 'pinned',
			revealAnchorPath: path,
		};
		stopRevealPick();
		handleScopeChangeForTab(originTab, anchored);
		// Scope changes reach the explorer with the next tab pass, and this flow
		// makes exactly one — but the anchor is the whole point of the gesture,
		// so it is pushed here rather than left to the round trip.
		applySortState(originTab, anchored);
		onSectionTabChange?.(originTab);
	}

	async function activeTabPane(): Promise<HTMLElement | null> {
		// The file scene may be mounting for the first time, so the pane is
		// given a second frame before the pick gives up on it.
		for (let attempt = 0; attempt < 2; attempt += 1) {
			await tick();
			const pane = document.querySelector<HTMLElement>(
				'.vaultman-filters-tab-pane.is-active',
			);
			if (pane) return pane;
			await new Promise((resolve) => window.setTimeout(resolve, 50));
		}
		return null;
	}

	/**
	 * Twin of the drill pick, over the file scene: the surface jumps to Files,
	 * takes one note and comes back. Opening a note in the main leaf counts as
	 * the same choice, so the pick can also be finished from the editor.
	 */
	async function beginRevealPick(originTab: FiltersTab) {
		if (originTab !== 'props' && originTab !== 'tags') return;
		stopRevealPick();
		onSectionTabChange?.('files');
		const pane = await activeTabPane();
		if (!pane) return;
		pane.classList.add('vaultman-sort-pick-mode');
		const suppressEvent = (event: Event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const onPick = (event: PointerEvent) => {
			const target =
				event.target instanceof Element
					? event.target.closest<HTMLElement>('[data-id]')
					: null;
			const nodeId = target?.dataset.id;
			if (!nodeId) return;
			suppressEvent(event);
			// A folder row carries a level, not a note, and the anchor is a note.
			// Rejecting it keeps pick mode armed instead of anchoring nothing.
			if (nodeId.startsWith('folder:')) {
				new Notice(translate('sort.reveal.pick_needs_note'));
				return;
			}
			anchorRevealNote(originTab, nodeId);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			suppressEvent(event);
			stopRevealPick();
			onSectionTabChange?.(originTab);
		};
		const workspace = app?.workspace;
		const fileOpenRef = workspace?.on('file-open', (file) => {
			if (file) anchorRevealNote(originTab, file.path);
		});
		// Longer than the drill pick's: this one can be finished in the editor,
		// which is a slower gesture than clicking the row under the menu.
		const timeout = window.setTimeout(stopRevealPick, 20000);
		pane.addEventListener('pointerdown', onPick, true);
		pane.addEventListener('click', suppressEvent, true);
		document.addEventListener('keydown', onKeyDown, true);
		revealPickCleanup = () => {
			window.clearTimeout(timeout);
			pane.classList.remove('vaultman-sort-pick-mode');
			pane.removeEventListener('pointerdown', onPick, true);
			document.removeEventListener('keydown', onKeyDown, true);
			if (fileOpenRef) workspace?.offref(fileOpenRef);
			// Let the click that completed the pick stay suppressed.
			window.setTimeout(
				() => pane.removeEventListener('click', suppressEvent, true),
				400,
			);
		};
		new Notice(translate('sort.reveal.pick_hint'));
	}

	function treeCapableFor(tab: FiltersTab): boolean {
		return isHierarchicalViewMode(viewModeByTab[tab] ?? 'tree');
	}

	function nestedActiveFor(tab: FiltersTab): boolean {
		// Nesting only means anything in a tree-family view; table and cards are
		// flat, so their sort menu treats nested as off (no folder options, path
		// sort available).
		if (!treeCapableFor(tab)) return false;
		return (
			visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewModeByTab[tab])
		).includes('nested');
	}

	function toggleNestedFor(tab: FiltersTab) {
		const cells =
			visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewModeByTab[tab]);
		const next = cells.includes('nested')
			? cells.filter((cell) => cell !== 'nested')
			: [...cells, 'nested'];
		measureSceneSync(
			`scene.action.toggle-nested.${tab}`,
			{ operations: 1 },
			() => {
				commitConfig(tab, { visibleCells: next });
				applyVisibleCells(tab, next);
				onViewFiltersChanged?.();
			},
		);
	}

	function drillScopeTitle(
		tab: FiltersTab,
		current: ExplorerSortState,
	): string {
		const base = translate('sort.level.drill');
		if (current.activeScope !== 'drill' || !current.drillNodeId) return base;
		const panel =
			tab === 'files' ? fileList : tab === 'tags' ? tagsExplorer : null;
		const label = panel?.sortNodeLabel?.(current.drillNodeId) ?? '';
		if (!label) return base;
		const chars = [...label];
		const short = chars.slice(0, 6).join('') + (chars.length > 6 ? '…' : '');
		return base.replace(/drill\s*$/i, short);
	}

	function addByLevelItems(
		menu: Menu,
		tab: FiltersTab,
		current: ExplorerSortState,
	) {
		const model = byLevelModel(
			tab,
			current,
			nestedActiveFor(tab),
			treeCapableFor(tab),
		);
		if (!model) return;

		for (const option of model.items) {
			if (option.kind === 'separator') {
				menu.addSeparator();
				continue;
			}
			menu.addItem((item) =>
				item
					.setTitle(
						option.kind === 'scope' && option.scope === 'drill'
							? drillScopeTitle(tab, current)
							: translate(option.labelKey),
					)
					.setIcon(option.icon)
					.setChecked(option.checked)
					.onClick(() => {
						if (option.kind === 'toggle') {
							if (option.id === 'nested') toggleNestedFor(tab);
							if (option.id === 'parentsFirst') {
								handleSortChange({
									...current,
									parentsFirst: !option.checked,
								});
							}
							if (option.id === 'fixedFolders') {
								handleSortChange({
									...current,
									fixedFolders: !option.checked,
								});
							}
							if (option.id === 'filtered') {
								handleFilterChange({
									...current,
									filtered: !option.checked,
								});
							}
							return;
						}
						if (option.kind === 'reveal') {
							if (option.id === 'reveal-drill') {
								void beginRevealPick(activeTab);
								return;
							}
							// Releases the pinned note; the projection follows the
							// workspace again from the next flush.
							handleScopeChange({
								...current,
								revealAnchor: 'current-file',
								revealAnchorPath: null,
							});
							return;
						}
						if (option.scope === 'drill') {
							beginDrillPick(tab);
							return;
						}
						stopDrillPick();
						handleScopeChange({
							...current,
							activeScope: option.scope,
							...(tab === 'props' ? {} : { drillNodeId: null }),
						});
					}),
			);
		}
	}

	function nodeTypeOptionsForActiveTab(): readonly NodeTypeMenuOption[] {
		if (activeTab === 'files') {
			return [
				...NODE_TYPE_MENU_OPTIONS.files,
				...(fileList?.getFileTypeOptions() ?? []),
			];
		}
		if (activeTab === 'props' || activeTab === 'tags') {
			return NODE_TYPE_MENU_OPTIONS[activeTab];
		}
		return [];
	}

	function nodeTypeOptionTitle(option: NodeTypeMenuOption): string {
		return option.label ?? translate(option.labelKey ?? '');
	}

	function openNativeSortMenu(event: MouseEvent) {
		const menu = new Menu();
		const current = normalizeSortState(
			activeTab,
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);
		const activeSort = activeScopeSort(activeTab, current);

		const nestedActive = nestedActiveFor(activeTab);
		// The native menu shows the same options as the popup, so it needs the
		// same reveal signal — without it `custom` was filtered out here even
		// while a note was anchored, which is why the option never appeared.
		for (const option of visibleSortOptions(
			activeTab,
			current,
			nestedActive,
			revealActive,
		)) {
			menu.addItem((item) => {
				const isActive = activeSort.sortBy === option.id;
				item
					.setTitle(
						`${translate(option.labelKey)}${
							isActive ? ` ${sortDirectionGlyph(activeSort.direction)}` : ''
						}`,
					)
					.setIcon(option.icon)
					.setChecked(isActive)
					.onClick(() => handleSortChange(nextSortState(option.id)));
			});
		}

		if (supportsByLevel(activeTab)) {
			menu.addSeparator();
			if (sortLevelInline) {
				addByLevelItems(menu, activeTab, current);
			} else {
				menu.addItem((item) => {
					item
						.setTitle(translate('sort.level.title'))
						.setIcon('lucide-list-tree');
					const sub = (
						item as typeof item & { setSubmenu: () => Menu }
					).setSubmenu();
					addByLevelItems(sub, activeTab, current);
				});
			}
		}

		const nodeTypeOptions = nodeTypeOptionsForActiveTab();
		if (nodeTypeOptions.length > 0) {
			menu.addSeparator();
			const selectedNodeTypes = nodeTypeFiltersForState(current);
			menu.addItem((item) => {
				item
					.setTitle(
						`${translate('explorer.sort.type')}${
							selectedNodeTypes.length > 0
								? ` (${selectedNodeTypes.length})`
								: ''
						}`,
					)
					.setIcon('lucide-list-filter');
				const sub = (
					item as typeof item & { setSubmenu: () => Menu }
				).setSubmenu();
				for (const option of nodeTypeOptions) {
					const isAll = option.id === 'all';
					const isActive = isAll
						? selectedNodeTypes.length === 0
						: selectedNodeTypes.includes(option.id);
					sub.addItem((subItem) =>
						subItem
							.setTitle(nodeTypeOptionTitle(option))
							.setIcon(option.icon)
							.setChecked(isActive)
							.onClick(() =>
								handleFilterChange({
									...current,
									...nodeTypeFilterPatch(
										toggleNodeTypeFilter(selectedNodeTypes, option.id),
									),
								}),
							),
					);
					if (option.separatorAfter) sub.addSeparator();
				}
			});
		}

		menu.showAtMouseEvent(event);
	}

	function toggleExplorerExpansion(
		origin: 'pointer' | 'keyboard' | 'menu' = 'pointer',
		event?: MouseEvent,
	) {
		invokeSceneAction('toggle-expansion', origin, event);
		expansionRefresh += 1;
		window.requestAnimationFrame(() => {
			expansionRefresh += 1;
		});
	}

	function revealActiveExplorerFile(
		origin: 'pointer' | 'keyboard' | 'menu' = 'pointer',
		event?: MouseEvent,
	) {
		invokeSceneAction('reveal-active-file', origin, event);
	}

	/**
	 * U121-029: the Tools menu is generated from the projection, in projection
	 * order, for exactly the nodes the overflow packer moved out of the bar.
	 *
	 * It used to be a hand-written list of known local ids (`view`, `sort`,
	 * `search`, `reveal-active-file`, `toggle-expansion`, `create-file`,
	 * `create-folder`, `header:*`, `command:*`), each with its own availability
	 * condition. Any projected node outside that list — or one whose menu entry
	 * carried a narrower guard than the node itself — was hidden from the bar
	 * with nowhere to go, so it vanished until the frame grew again. That is why
	 * Text lost `reveal` and `collapse` at min-width while Files kept them: the
	 * `toggle-expansion` entry was additionally gated on
	 * `expansionActionAvailableForActiveTab` and the create entries on
	 * `activeTab === 'files'`.
	 *
	 * Every node already carries the label, icon and action reference the menu
	 * needs, so a generic pass cannot fall out of step with the projection.
	 */
	function openToolsMenu(event: MouseEvent) {
		const menu = new Menu();
		for (const node of panelWidgetProjection.nodes) {
			if (!forcedOverflowIds.includes(node.id)) continue;
			const localId = node.action?.id ?? measuredWidthKey(node.id);
			menu.addItem((item) => {
				item
					.setTitle(node.label)
					.setIcon(node.icon ?? 'lucide-terminal')
					.setDisabled(node.available === false)
					.onClick(() => {
						// The two menu presentations open their native menus; the
						// search node expands the input; everything else is an action
						// reference resolved by the Scene port.
						if (localId === 'view') openNativeViewMenu(event);
						else if (localId === 'sort') openNativeSortMenu(event);
						else if (localId === 'search') expandSearch();
						else invokeSceneAction(localId, 'menu', event);
					});
			});
		}
		menu.showAtMouseEvent(event);
	}

	function refreshExpansionState() {
		expansionRefresh += 1;
	}

	$effect(() => {
		fileList?.setExpansionChangeHandler(refreshExpansionState);
		propExplorer?.setExpansionChangeHandler(refreshExpansionState);
		tagsExplorer?.setExpansionChangeHandler(refreshExpansionState);
		const frame = window.requestAnimationFrame(refreshExpansionState);

		return () => {
			window.cancelAnimationFrame(frame);
			fileList?.setExpansionChangeHandler(undefined);
			propExplorer?.setExpansionChangeHandler(undefined);
			tagsExplorer?.setExpansionChangeHandler(undefined);
		};
	});

	$effect(() => {
		const currentFileList = fileList;
		const currentTagsExplorer = tagsExplorer;
		currentFileList?.setSortStateChangeHandler(handleExternalFilesSortState);
		currentTagsExplorer?.setSortStateChangeHandler?.(
			handleExternalTagsSortState,
		);
		return () => {
			currentFileList?.setSortStateChangeHandler(undefined);
			currentTagsExplorer?.setSortStateChangeHandler?.(undefined);
		};
	});

	$effect(() => {
		return () => {
			stopDrillPick();
			stopRevealPick();
		};
	});

	// U121-109: `configByTab` se siembra UNA vez, al construir el componente, y
	// en ese momento el puerto todavia apunta a la identidad recien acunada. Al
	// llegar el ancla real hay que releer: el `$effect` que aplica la scene
	// depende de `configByTab`, asi que re-sembrarlo basta para que se re-aplique.
	$effect(() =>
		sceneConfigPort.onInstanceChange(() => {
			configByTab = Object.fromEntries(
				TABS.map((tab) => [tab, sceneConfigPort.read(tab)]),
			) as Record<FiltersTab, Required<SceneConfig>>;
		}),
	);

	$effect(() => {
		const tab = activeTab;
		const viewMode = viewModeByTab[tab] ?? 'tree';
		const cells = visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewMode);
		const interactionMode = interactionModeByTab[tab];
		const sortState = untrack(
			() => sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		if (tab === 'files' && fileList) {
			const normalizedState = normalizeSortState(tab, sortState, true);
			if (!sameSortState(sortState, normalizedState)) {
				commitConfig(tab, { sortState: normalizedState });
			}
			appliedSortStateByTab[tab] = normalizedState;
			const effectiveMode = panelViewModeForDataSurface(tab, viewMode);
			const filesViewMode =
				effectiveMode === 'table'
					? 'table'
					: effectiveMode === 'grid'
						? 'grid'
						: 'tree';
			if (fileList.configurePanelWidgetProjection) {
				fileList.configurePanelWidgetProjection({
					viewMode: filesViewMode,
					visibleCells: new Set(cells),
					sortState: normalizedState,
					...(interactionMode ? { interactionMode } : {}),
				});
			} else {
				applyViewMode(tab, viewMode);
				applyVisibleCells(tab, cells);
				applySortState(tab, normalizedState);
				if (interactionMode) applyInteractionMode(tab, interactionMode);
			}
			fileList.setInteractionModeChangeHandler?.((mode) => {
				if (interactionModeByTab['files'] !== mode) {
					commitConfig('files', { interactionMode: mode });
				}
			});
		}
		if (tab === 'props' && propExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
			if (interactionMode) applyInteractionMode(tab, interactionMode);
			propExplorer.setInteractionModeChangeHandler?.((mode) => {
				if (interactionModeByTab['props'] !== mode) {
					commitConfig('props', { interactionMode: mode });
				}
			});
		}
		if (tab === 'tags' && tagsExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
			if (interactionMode) applyInteractionMode(tab, interactionMode);
		}
		if (tab === 'snippets' && snippetsExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
		}
		if (tab === 'plugins' && pluginsExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
		}
	});
</script>

{#snippet searchControl(variant: SearchControlVariant)}
	<SearchControl
		value={filtersSearch}
		placeholder={translate('filter.search_placeholder')}
		{variant}
		styleOrder={variant === 'inline'
			? panelWidgetNodeOrder('search')
			: undefined}
		clearLabel={translate('filter.search_clear')}
		categoryIcon={searchTrailingActions.length > 0
			? undefined
			: CATEGORY_ICONS[activeTab].length > 1
				? currentCategoryIcon
				: undefined}
		categoryLabel={CATEGORY_LABELS[activeTab]?.[
			filtersSearchCategory[activeTab] ?? 0
		] ?? translate('filter.search_mode')}
		onCycleCategory={cycleSearchCategory}
		createIcon={searchTrailingActions.length > 0
			? undefined
			: canCreateSearchTarget
				? currentCreateIcon
				: undefined}
		createLabel={translate('filter.create')}
		onCreateTarget={createSearchTarget}
		onValueChange={setFiltersSearch}
		trailingActions={searchTrailingActions}
		onAction={onSearchTrailingAction}
		{icon}
	/>
{/snippet}

<div
	class="vaultman-navbar-filters vaultman-glass vaultman-glass--top"
	bind:this={navbarEl}
>
	{#if minimalStyle && showSearchInput}
		<div class="vaultman-filters-phone-search-row">
			{@render searchControl('phone')}
		</div>
	{/if}
	<div class="vaultman-filters-header-wrap">
		{#if headerMode === 'header'}
			<div
				class="vaultman-filters-header"
				class:vaultman-filters-header--minimal={minimalStyle}
				class:nav-header={minimalStyle}
			>
				<div
					class="vaultman-filters-actions"
					class:nav-buttons-container={minimalStyle}
					class:vaultman-filters-actions--scroll={toolbarScroll}
					class:vaultman-filters-actions--wrap={toolbarWrap}
					bind:this={actionsEl}
				>
					{#if minimalStyle && tabOptions.length > 0 && toolbarNodeVisible('tabs')}
						<div
							class={headerActionClass}
							class:vaultman-header-action-with-label={showTabsButtonLabel}
							data-panel-widget-node-id={panelWidgetNodeId('tabs')}
							style:order={panelWidgetNodeOrder('tabs')}
							role="button"
							tabindex="0"
							aria-label={currentTabsLabel}
							title={minimalStyle ? undefined : currentTabsLabel}
							onclick={(event: MouseEvent) => openTabsPopup(event)}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openTabsPopup(
										menuEventFromElement(e.currentTarget as HTMLElement),
									);
								}
							}}
						>
							<span
								class="vaultman-header-action-icon"
								aria-hidden="true"
								use:icon={currentTabsIcon}
							></span>
							{#if showTabsButtonLabel && currentTabsOption}
								<span class="vaultman-header-action-label">
									{currentTabsOption.label}
								</span>
							{/if}
						</div>
					{/if}
					{#each headerActions as action (action.id)}
						{#if toolbarNodeVisible(`header:${action.id}`)}
							<div
								class={headerActionClass}
								class:is-disabled={action.disabled}
								class:is-active={action.checked}
								data-panel-widget-node-id={panelWidgetNodeId(
									`header:${action.id}`,
								)}
								style:order={panelWidgetNodeOrder(`header:${action.id}`)}
								role="button"
								tabindex={action.disabled ? -1 : 0}
								aria-label={action.label}
								aria-pressed={action.checked}
								aria-disabled={action.disabled ? 'true' : undefined}
								title={minimalStyle ? undefined : action.label}
								onclick={(event: MouseEvent) => {
									if (action.disabled) return;
									invokeSceneAction(`header:${action.id}`, 'pointer', event);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (action.disabled) return;
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										invokeSceneAction(
											`header:${action.id}`,
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={action.icon}
							></div>
						{/if}
					{/each}
					{#if showExplorerControls}
						{#if toolbarNodeVisible('view')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId('view')}
								style:order={panelWidgetNodeOrder('view')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.viewmode_btn')}
								title={minimalStyle
									? undefined
									: translate('filter.viewmode_btn')}
								onclick={(event: MouseEvent) => openViewModePopup(event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openViewModePopup(
											minimalStyle
												? menuEventFromElement(e.currentTarget as HTMLElement)
												: undefined,
										);
									}
								}}
								use:icon={'lucide-layout-list'}
							></div>
						{/if}
						{#if toolbarNodeVisible('sort')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId('sort')}
								style:order={panelWidgetNodeOrder('sort')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.sort_btn')}
								title={minimalStyle ? undefined : translate('filter.sort_btn')}
								onclick={(event: MouseEvent) => openSortPopup(event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openSortPopup(
											minimalStyle
												? menuEventFromElement(e.currentTarget as HTMLElement)
												: undefined,
										);
									}
								}}
								use:icon={'lucide-arrow-up-down'}
							></div>
						{/if}
						{#if minimalStyle && toolbarNodeVisible('search')}
							<div
								class={headerActionClass}
								class:is-active={searchExpanded}
								data-vaultman-search-toggle="true"
								data-panel-widget-node-id={panelWidgetNodeId('search')}
								style:order={panelWidgetNodeOrder('search')}
								role="button"
								tabindex="0"
								aria-label={translate('explorer.btn.search')}
								aria-pressed={searchExpanded}
								title={minimalStyle
									? undefined
									: translate('explorer.btn.search')}
								onclick={toggleSearch}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleSearch();
									}
								}}
								use:icon={'lucide-search'}
							></div>
						{/if}
						{#if showSearchInput && !searchOwnsRow}
							{@render searchControl('inline')}
						{:else if !minimalStyle}
							<div
								class={headerActionClass}
								role="button"
								tabindex="0"
								aria-label={translate('explorer.btn.search')}
								title={minimalStyle
									? undefined
									: translate('explorer.btn.search')}
								onclick={expandSearch}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										expandSearch();
									}
								}}
								use:icon={'lucide-search'}
							></div>
						{/if}
						{#if activeTab === 'files' && toolbarNodeVisible('reveal-active-file')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId(
									'reveal-active-file',
								)}
								style:order={panelWidgetNodeOrder('reveal-active-file')}
								role="button"
								tabindex="0"
								aria-label={translate('filter.auto_reveal')}
								title={minimalStyle
									? undefined
									: translate('filter.auto_reveal')}
								onclick={(event) => revealActiveExplorerFile('pointer', event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										revealActiveExplorerFile(
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={'lucide-gallery-vertical'}
							></div>
						{/if}
						{#if expansionActionAvailableForActiveTab && toolbarNodeVisible('toggle-expansion')}
							<div
								class={headerActionClass}
								data-panel-widget-node-id={panelWidgetNodeId(
									'toggle-expansion',
								)}
								style:order={panelWidgetNodeOrder('toggle-expansion')}
								role="button"
								tabindex="0"
								aria-label={expansionLabel}
								title={minimalStyle ? undefined : expansionLabel}
								onclick={(event) => toggleExplorerExpansion('pointer', event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleExplorerExpansion(
											'keyboard',
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={expansionIcon}
							></div>
						{/if}
						{#if activeTab === 'files' && createActionsPlacement === 'toolbar'}
							<!-- BT5-022: built-in Create File/Folder as toolbar nodes. -->
							{#if toolbarNodeVisible('create-file')}
								<div
									class={headerActionClass}
									data-panel-widget-node-id={panelWidgetNodeId('create-file')}
									style:order={panelWidgetNodeOrder('create-file')}
									role="button"
									tabindex="0"
									aria-label={translate('folder.ctx.new_note')}
									title={minimalStyle
										? undefined
										: translate('folder.ctx.new_note')}
									onclick={(event) =>
										invokeSceneAction('create-file', 'pointer', event)}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											invokeSceneAction(
												'create-file',
												'keyboard',
												menuEventFromElement(e.currentTarget as HTMLElement),
											);
										}
									}}
									use:icon={'lucide-file-plus'}
								></div>
							{/if}
							{#if toolbarNodeVisible('create-folder')}
								<div
									class={headerActionClass}
									data-panel-widget-node-id={panelWidgetNodeId('create-folder')}
									style:order={panelWidgetNodeOrder('create-folder')}
									role="button"
									tabindex="0"
									aria-label={translate('folder.ctx.new_folder')}
									title={minimalStyle
										? undefined
										: translate('folder.ctx.new_folder')}
									onclick={(event) =>
										invokeSceneAction('create-folder', 'pointer', event)}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											invokeSceneAction(
												'create-folder',
												'keyboard',
												menuEventFromElement(e.currentTarget as HTMLElement),
											);
										}
									}}
									use:icon={'lucide-folder-plus'}
								></div>
							{/if}
						{/if}
						{#each commandActions as command (command.id)}
							{#if toolbarNodeVisible(`command:${command.id}`)}
								<!-- BT5-024: Obsidian commands projected as toolbar nodes. -->
								<div
									class={headerActionClass}
									class:is-disabled={!command.available}
									data-panel-widget-node-id={panelWidgetNodeId(
										`command:${command.id}`,
									)}
									style:order={panelWidgetNodeOrder(`command:${command.id}`)}
									role="button"
									tabindex="0"
									aria-label={command.label}
									title={command.available
										? command.label
										: translate('command.unavailable').replace(
												'{id}',
												command.id,
											)}
									onclick={() => {
										if (command.available) {
											invokeSceneAction(`command:${command.id}`, 'pointer');
										}
									}}
									onkeydown={(e: KeyboardEvent) => {
										if (
											command.available &&
											(e.key === 'Enter' || e.key === ' ')
										) {
											e.preventDefault();
											invokeSceneAction(`command:${command.id}`, 'keyboard');
										}
									}}
									use:icon={command.icon ?? 'lucide-terminal'}
								></div>
							{/if}
						{/each}
						<span
							class="vaultman-panel-widget-tools-measure"
							data-panel-widget-tools-measure
							aria-hidden="true"
							use:icon={'lucide-tool-case'}
						></span>
						{#if compactPanelWidgetTools}
							<div
								class={headerActionClass}
								style:order={panelWidgetProjection.nodes.length}
								role="button"
								tabindex="0"
								aria-label={translate('filter.tools')}
								onclick={(event: MouseEvent) => openToolsMenu(event)}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openToolsMenu(
											menuEventFromElement(e.currentTarget as HTMLElement),
										);
									}
								}}
								use:icon={'lucide-tool-case'}
							></div>
						{/if}
					{/if}
				</div>
				<!-- U121-029: the expanded search field as a second row under the
				     toolbar, whenever the action row cannot spare a usable width for
				     it. A sibling of the action row rather than a wrapped flex item,
				     so the packer's single-line assumption stays true and the Tools
				     button can never be the thing that wraps. -->
				{#if minimalStyle && showSearchInput && searchOwnsRow}
					<div class="vaultman-filters-search-row">
						{@render searchControl('row')}
					</div>
				{/if}
			</div>
		{:else if headerMode === 'sort'}
			<div
				class="vaultman-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<SortPopup
					{activeTab}
					onClose={closeHeaderPopup}
					onSortChange={handleSortChange}
					onFilterChange={handleFilterChange}
					onScopeChange={handleScopeChange}
					onRequestDrillPick={() => beginDrillPick(activeTab)}
					initialSortState={sortStateByTab[activeTab]}
					nestedActive={nestedActiveFor(activeTab)}
					{revealActive}
					onRequestRevealPick={() => void beginRevealPick(activeTab)}
					treeCapable={treeCapableFor(activeTab)}
					onNestedToggle={() => toggleNestedFor(activeTab)}
					{icon}
				/>
			</div>
		{:else if headerMode === 'viewmode'}
			<div
				class="vaultman-filters-popup-slot"
				class:popup-enter-from-left={headerExitDir === 'right'}
				class:popup-enter-from-right={headerExitDir === 'left'}
			>
				<ViewModePopup
					{activeTab}
					selectionMode={interactionModeByTab[activeTab] === 'select'}
					onClose={closeHeaderPopup}
					onViewModeChange={handleViewModeChange}
					onPillsChange={handlePillsChange}
					onAddModeChange={(active) => {
						if (!interactionModesForTab(activeTab).includes('add')) return;
						selectInteractionMode(
							activeTab,
							active ? 'add' : DEFAULT_INTERACTION_MODE[activeTab],
						);
					}}
					initialViewMode={viewModeByTab[activeTab]}
					initialPills={visibleCellsByTab[activeTab]}
					{addOpCount}
					{icon}
				/>
			</div>
		{/if}
	</div>
</div>
