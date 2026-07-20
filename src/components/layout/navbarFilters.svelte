<script lang="ts">
	import { Menu, Notice } from 'obsidian';
	import { untrack } from 'svelte';
	import { translate } from '../../i18n/index';
	import SortPopup from './popupSort.svelte';
	import ViewModePopup from './popupView.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type {
		ExplorerTabId,
		ExplorerSortState,
		ExplorerViewMode,
	} from '../../types/typeUI';
	import type { AddonExplorerPanelPort } from '../../logic/logicAddonExplorer';
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
		shouldCondenseFilesToolbar,
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

	type FiltersTab = ExplorerTabId;
	type CoreFiltersTab = 'props' | 'files' | 'tags';
	type SearchCategoryState = Record<CoreFiltersTab, number> &
		Partial<Record<Exclude<FiltersTab, CoreFiltersTab>, number>>;
	type HeaderTabOption = { id: string; label: string; icon: string };
	type HeaderMenuAction = {
		id: 'filters' | 'queue' | 'statistics';
		label: string;
		icon: string;
		count?: number;
		warning?: boolean;
		tooltip?: string;
		onClick: () => void;
		onDoubleClick?: () => void;
	};
	type HeaderAction = {
		id: string;
		label: string;
		icon: string;
		disabled?: boolean;
		onClick: (event: MouseEvent) => void;
	};
	type HeaderMode = 'header' | 'sort' | 'viewmode';
	type SearchControlVariant = 'inline' | 'phone';
	let {
		activeTab,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
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
		activeSectionTab = activeTab,
		onSectionTabChange,
		onFiltersSearchChange,
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
	}: {
		activeTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: SearchCategoryState;
		tagsExplorer: TagsExplorerPanel | null | undefined;
		propExplorer: PropsExplorerPanel | undefined;
		fileList: FilesExplorerPanel | undefined;
		snippetsExplorer?: AddonExplorerPanelPort;
		pluginsExplorer?: AddonExplorerPanelPort;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		addOpCount?: number;
		minimalStyle?: boolean;
		showDock?: boolean;
		tabOptions?: HeaderTabOption[];
		tabMenuActions?: HeaderMenuAction[];
		headerActions?: HeaderAction[];
		activeSectionTab?: string;
		onSectionTabChange?: (tab: string) => void;
		onFiltersSearchChange?: (value: string) => void;
		onViewFiltersChanged?: () => void;
		onContentSearch?: (query: string) => void;
		showExplorerControls?: boolean;
		expansionRevision?: number;
		floatingTocEnabled?: boolean;
		onToggleFloatingToc?: () => void;
		toolbarToolsMenu?: boolean;
		toolbarOverflowStrategy?: ToolbarOverflowStrategy;
		frameWidth?: number;
		onToggleToolbar?: () => void;
		toolbarShown?: boolean;
		savedLayouts?: SavedLayout[];
		onSaveLayout?: (layout: SavedLayout) => void;
		onLayoutLoaded?: (layout: SavedLayout) => void;
		app?: import('obsidian').App;
		showTabLabels?: boolean;
		sortLevelInline?: boolean;
		orderCellsByActivation?: boolean;
	} = $props();

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
		activeTab === 'files' || activeTab === 'props' || activeTab === 'tags',
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
	let viewModeByTab = $state<Record<FiltersTab, ExplorerViewMode>>({
		props: 'tree',
		tags: 'tree',
		files: 'tree',
		snippets: 'tree',
		plugins: 'tree',
	});
	let interactionModeByTab = $state<Record<CoreFiltersTab, InteractionMode>>({
		...DEFAULT_INTERACTION_MODE,
	});
	let visibleCellsByTab = $state<Record<FiltersTab, string[]>>({
		props: defaultVisibleCells('props', 'tree'),
		tags: defaultVisibleCells('tags', 'tree'),
		files: defaultVisibleCells('files', 'tree'),
		snippets: defaultVisibleCells('snippets', 'tree'),
		plugins: defaultVisibleCells('plugins', 'tree'),
	});
	let sortStateByTab = $state<Record<FiltersTab, ExplorerSortState>>({
		props: { ...DEFAULT_SORT_STATE.props },
		tags: { ...DEFAULT_SORT_STATE.tags },
		files: { ...DEFAULT_SORT_STATE.files },
		snippets: { ...DEFAULT_SORT_STATE.snippets },
		plugins: { ...DEFAULT_SORT_STATE.plugins },
	});
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
	function isCoreFiltersTab(tab: FiltersTab): tab is CoreFiltersTab {
		return tab === 'files' || tab === 'props' || tab === 'tags';
	}
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
				...(isCoreFiltersTab(tab)
					? { interactionMode: interactionModeByTab[tab] }
					: {}),
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
			if (isCoreFiltersTab(tab)) {
				nextInteraction[tab] = normalizeInteractionMode(
					tab,
					saved.interactionMode,
				);
			}
		}
		viewModeByTab = nextView;
		visibleCellsByTab = nextCells;
		sortStateByTab = nextSort;
		interactionModeByTab = nextInteraction;
		for (const tab of LAYOUT_TABS) {
			applyViewMode(tab, nextView[tab]);
			applyVisibleCells(tab, nextCells[tab]);
			applySortState(tab, nextSort[tab]);
			if (isCoreFiltersTab(tab)) {
				applyInteractionMode(tab, nextInteraction[tab]);
			}
		}
		onLayoutLoaded?.(layout);
	}
	let searchExpanded = $state(false);
	let searchToggleActivationPending = false;
	let navbarEl = $state<HTMLElement | null>(null);
	let drillPickCleanup: (() => void) | null = null;
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
	// Condense keys off label INTENT, not the yielded state, so opening the
	// search cannot flip the toolbar in and out of its condensed form.
	const compactFilesTools = $derived(
		shouldCondenseFilesToolbar({
			activeSectionTab,
			frameWidth,
			manual: toolbarToolsMenu,
			minimalStyle,
			tabLabelVisible: tabLabelIntended,
			overflowStrategy: toolbarOverflowStrategy,
		}),
	);
	// BT5-021: in scroll mode the action bar is one horizontally scrollable line
	// with an overflow hint, instead of moving nodes into the Tools menu.
	const toolbarScroll = $derived(
		minimalStyle &&
			activeSectionTab === 'files' &&
			toolbarUsesHorizontalScroll(toolbarOverflowStrategy),
	);
	const showSearchInput = $derived(
		shouldShowMinimalSearchInput({
			frameWidth,
			minimalStyle,
			searchExpanded,
			tabLabelVisible: showTabsButtonLabel,
		}),
	);

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
		filtersSearchCategory[tab] =
			((filtersSearchCategory[tab] ?? 0) + 1) % Math.max(1, count);
		filtersSearchCategory = { ...filtersSearchCategory };
	}

	function setFiltersSearch(value: string) {
		if (onFiltersSearchChange) {
			onFiltersSearchChange(value);
			return;
		}
		filtersSearch = value;
	}

	function expandSearch() {
		searchExpanded = true;
		window.requestAnimationFrame(() => focusVisibleSearchInput());
	}

	function markSearchToggleActivation() {
		searchToggleActivationPending = true;
		window.setTimeout(() => {
			searchToggleActivationPending = false;
		}, 0);
	}

	function toggleSearch() {
		searchToggleActivationPending = false;
		if (!minimalStyle || !searchExpanded) {
			expandSearch();
			return;
		}
		searchExpanded = false;
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

	function isSearchToggleTarget(target: Node | null) {
		return (
			target instanceof HTMLElement &&
			target.closest('[data-vaultman-search-toggle="true"]') !== null
		);
	}

	function handleSearchFocusOut(event: FocusEvent) {
		if (!minimalStyle || filtersSearch) return;
		const nextTarget = event.relatedTarget as Node | null;
		if (
			nextTarget &&
			event.currentTarget instanceof HTMLElement &&
			event.currentTarget.contains(nextTarget)
		) {
			return;
		}
		if (searchToggleActivationPending || isSearchToggleTarget(nextTarget))
			return;
		searchExpanded = false;
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
			sortStateByTab = { ...sortStateByTab, [tab]: normalizedState };
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

	function applyInteractionMode(tab: CoreFiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		if (tab === 'files') fileList?.setInteractionMode(normalized);
		if (tab === 'props') {
			propExplorer?.setInteractionMode(normalized, onContentSearch);
		}
		if (tab === 'tags') {
			tagsExplorer?.setInteractionMode(normalized, onContentSearch);
		}
	}

	function selectInteractionMode(tab: CoreFiltersTab, mode: InteractionMode) {
		const normalized = normalizeInteractionMode(tab, mode);
		interactionModeByTab = {
			...interactionModeByTab,
			[tab]: normalized,
		};
		applyInteractionMode(tab, normalized);
		onViewFiltersChanged?.();
	}

	function handleSortChange(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(activeTab, state);
		sortStateByTab = { ...sortStateByTab, [activeTab]: normalizedState };
		applySortState(activeTab, normalizedState);
		onViewFiltersChanged?.();
	}

	function handleScopeChangeForTab(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(tab, state);
		sortStateByTab = { ...sortStateByTab, [tab]: normalizedState };
		onViewFiltersChanged?.();
	}

	function handleScopeChange(state: ExplorerSortState) {
		handleScopeChangeForTab(activeTab, state);
	}

	function handleFilterChange(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(activeTab, state);
		const appliedState = appliedSortStateByTab[activeTab];
		sortStateByTab = { ...sortStateByTab, [activeTab]: normalizedState };
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
		sortStateByTab = {
			...currentByTab,
			files: normalizedState,
		};
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
		sortStateByTab = {
			...currentByTab,
			tags: normalizedState,
		};
	}

	function handleViewModeChange(mode: ExplorerViewMode) {
		if (!isViewModeSelectableForDataSurface(activeTab, mode)) return;
		viewModeByTab = { ...viewModeByTab, [activeTab]: mode };
		applyViewMode(activeTab, mode);
	}

	function handlePillsChange(cells: string[]) {
		visibleCellsByTab = { ...visibleCellsByTab, [activeTab]: cells };
		applyVisibleCells(activeTab, cells);
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

		if (isCoreFiltersTab(activeTab)) {
			if (onSaveLayout) menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(translate('viewmenu.in_mode'))
					.setIcon('lucide-mouse-pointer-click');
				const sub = (
					item as typeof item & { setSubmenu: () => Menu }
				).setSubmenu();
				for (const mode of interactionModesForTab(activeTab)) {
					sub.addItem((subItem) =>
						subItem
							.setTitle(translate(`viewmenu.in_mode.${mode}`))
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
		}

		menu.addSeparator();
		// 'Nested' stays in the sort menu's By level group (D29).
		// BT5-011: the menu mirrors the row — active cells in render order
		// first, then the rest at their canonical rank.
		for (const entry of cellMenuOrder(
			activeTab,
			visibleCellsByTab[activeTab] ??
				defaultVisibleCells(activeTab, activeView),
			{ byActivation: orderCellsByActivation, viewMode: activeView },
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
		for (const option of minimalNativeViewModes) {
			menu.addItem((item) => {
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
				? { isValidDrillNode: (id: string) => tagsExplorer.hasSortNode(id) }
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

	function nestedActiveFor(tab: FiltersTab): boolean {
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
		visibleCellsByTab = { ...visibleCellsByTab, [tab]: next };
		applyVisibleCells(tab, next);
		onViewFiltersChanged?.();
	}

	function drillScopeTitle(
		tab: FiltersTab,
		current: ExplorerSortState,
	): string {
		const base = translate('sort.level.drill');
		if (current.activeScope !== 'drill' || !current.drillNodeId) return base;
		const panel =
			tab === 'files' ? fileList : tab === 'tags' ? tagsExplorer : null;
		const label = panel?.sortNodeLabel(current.drillNodeId) ?? '';
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
		const model = byLevelModel(tab, current, nestedActiveFor(tab));
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
				{ id: 'all', icon: 'lucide-files', labelKey: 'sort.type.all' },
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
		for (const option of visibleSortOptions(activeTab, current, nestedActive)) {
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
				}
			});
		}

		menu.showAtMouseEvent(event);
	}

	function toggleExplorerExpansion() {
		const next = !hasExpandedNodes;
		if (activeTab === 'files') {
			if (next) fileList?.expandAll();
			else fileList?.collapseAll();
		}
		if (activeTab === 'props') {
			if (next) propExplorer?.expandAll();
			else propExplorer?.collapseAll();
		}
		if (activeTab === 'tags') {
			if (next) tagsExplorer?.expandAll();
			else tagsExplorer?.collapseAll();
		}
		expansionRefresh += 1;
		window.requestAnimationFrame(() => {
			expansionRefresh += 1;
		});
	}

	function openToolsMenu(event: MouseEvent) {
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle(translate('filter.auto_reveal'))
				.setIcon('lucide-gallery-vertical')
				.onClick(() => fileList?.autoRevealActiveFile()),
		);
		if (expansionActionAvailableForActiveTab) {
			menu.addItem((item) =>
				item
					.setTitle(expansionLabel)
					.setIcon(expansionIcon)
					.onClick(toggleExplorerExpansion),
			);
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
		currentTagsExplorer?.setSortStateChangeHandler(handleExternalTagsSortState);
		return () => {
			currentFileList?.setSortStateChangeHandler(undefined);
			currentTagsExplorer?.setSortStateChangeHandler(undefined);
		};
	});

	$effect(() => {
		return () => stopDrillPick();
	});

	$effect(() => {
		const tab = activeTab;
		const viewMode = viewModeByTab[tab] ?? 'tree';
		const cells = visibleCellsByTab[tab] ?? defaultVisibleCells(tab, viewMode);
		const interactionMode = isCoreFiltersTab(tab)
			? interactionModeByTab[tab]
			: undefined;
		const sortState = untrack(
			() => sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab],
		);
		if (tab === 'files' && fileList) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
			if (interactionMode) applyInteractionMode(tab, interactionMode);
		}
		if (tab === 'props' && propExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
			if (interactionMode) applyInteractionMode(tab, interactionMode);
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
	<div
		class={`vaultman-filters-header-search-pill vaultman-filters-header-search-pill--${variant}`}
		onfocusout={handleSearchFocusOut}
	>
		<input
			class="vaultman-filters-search-input"
			type="text"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder={translate('filter.search_placeholder')}
			value={filtersSearch}
			oninput={(event: Event) =>
				setFiltersSearch((event.currentTarget as HTMLInputElement).value)}
		/>
		{#if filtersSearch}
			<button
				class="vaultman-filters-search-clear"
				aria-label={translate('filter.search_clear')}
				use:icon={'lucide-x'}
				onclick={() => {
					setFiltersSearch('');
					if (minimalStyle) searchExpanded = false;
				}}
			></button>
		{/if}
		{#if CATEGORY_ICONS[activeTab].length > 1}
			<button
				class="vaultman-filters-search-mode"
				aria-label={CATEGORY_LABELS[activeTab]?.[
					filtersSearchCategory[activeTab] ?? 0
				] ?? translate('filter.search_mode')}
				use:icon={currentCategoryIcon}
				onclick={cycleSearchCategory}
			></button>
		{/if}
		{#if canCreateSearchTarget}
			<button
				class="vaultman-filters-search-create"
				aria-label={translate('filter.create')}
				title={minimalStyle ? undefined : translate('filter.create')}
				use:icon={currentCreateIcon}
				onclick={createSearchTarget}
			></button>
		{/if}
	</div>
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
				>
					{#if minimalStyle && tabOptions.length > 0}
						<div
							class={headerActionClass}
							class:vaultman-header-action-with-label={showTabsButtonLabel}
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
						<div
							class={headerActionClass}
							class:is-disabled={action.disabled}
							role="button"
							tabindex={action.disabled ? -1 : 0}
							aria-label={action.label}
							aria-disabled={action.disabled ? 'true' : undefined}
							title={minimalStyle ? undefined : action.label}
							onclick={(event: MouseEvent) => {
								if (action.disabled) return;
								action.onClick(event);
							}}
							onkeydown={(e: KeyboardEvent) => {
								if (action.disabled) return;
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									action.onClick(
										menuEventFromElement(e.currentTarget as HTMLElement),
									);
								}
							}}
							use:icon={action.icon}
						></div>
					{/each}
					{#if showExplorerControls}
						<div
							class={headerActionClass}
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
						<div
							class={headerActionClass}
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
						{#if minimalStyle}
							<div
								class={headerActionClass}
								class:is-active={searchExpanded || filtersSearch.length > 0}
								data-vaultman-search-toggle="true"
								role="button"
								tabindex="0"
								aria-label={translate('explorer.btn.search')}
								aria-pressed={searchExpanded}
								title={minimalStyle
									? undefined
									: translate('explorer.btn.search')}
								onpointerdown={markSearchToggleActivation}
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
						{#if showSearchInput}
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
						{#if activeTab === 'files' && !compactFilesTools}
							<div
								class={headerActionClass}
								role="button"
								tabindex="0"
								aria-label={translate('filter.auto_reveal')}
								title={minimalStyle
									? undefined
									: translate('filter.auto_reveal')}
								onclick={() => fileList?.autoRevealActiveFile()}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										fileList?.autoRevealActiveFile();
									}
								}}
								use:icon={'lucide-gallery-vertical'}
							></div>
						{/if}
						{#if activeTab === 'files' && compactFilesTools}
							<div
								class={headerActionClass}
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
						{:else if expansionActionAvailableForActiveTab}
							<div
								class={headerActionClass}
								role="button"
								tabindex="0"
								aria-label={expansionLabel}
								title={minimalStyle ? undefined : expansionLabel}
								onclick={toggleExplorerExpansion}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleExplorerExpansion();
									}
								}}
								use:icon={expansionIcon}
							></div>
						{/if}
					{/if}
				</div>
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
					onClose={closeHeaderPopup}
					onViewModeChange={handleViewModeChange}
					onPillsChange={handlePillsChange}
					onAddModeChange={(active) => {
						if (!isCoreFiltersTab(activeTab)) return;
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
