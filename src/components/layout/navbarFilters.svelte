<script lang="ts">
	import { Menu } from 'obsidian';
	import { untrack } from 'svelte';
	import { translate } from '../../i18n/index';
	import SortPopup from './popupSort.svelte';
	import ViewModePopup from './popupView.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
	import type { SavedLayout, SavedViewConfig } from '../../types/typeSettings';
	import { showInputModal } from '../../utils/inputModal';
	import {
		DEFAULT_EXPLORER_SORT_DIR,
		normalizeExplorerSortBy,
	} from '../../logic/logicSort';
	import {
		isViewModeSelectableForDataSurface,
		panelViewModeForDataSurface,
		viewModesForDataSurface,
	} from '../../logic/logicExplorerViewModes';

	type FiltersTab = 'props' | 'files' | 'tags';
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
	type NodeTypeOption = {
		id: string;
		icon: string;
		label?: string;
		labelKey?: string;
	};

	let {
		activeTab,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer,
		propExplorer,
		fileList,
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
		showExplorerControls = true,
		expansionRevision = 0,
		floatingTocEnabled = false,
		onToggleFloatingToc,
		toolbarToolsMenu = false,
		onToggleToolbar,
		toolbarShown = true,
		savedLayouts = [],
		onSaveLayout,
		app,
		showTabLabels = true,
	}: {
		activeTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		tagsExplorer: TagsExplorerPanel | null | undefined;
		propExplorer: PropsExplorerPanel | undefined;
		fileList: FilesExplorerPanel | undefined;
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
		showExplorerControls?: boolean;
		expansionRevision?: number;
		floatingTocEnabled?: boolean;
		onToggleFloatingToc?: () => void;
		toolbarToolsMenu?: boolean;
		onToggleToolbar?: () => void;
		toolbarShown?: boolean;
		savedLayouts?: SavedLayout[];
		onSaveLayout?: (layout: SavedLayout) => void;
		app?: import('obsidian').App;
		showTabLabels?: boolean;
	} = $props();

	async function promptSaveLayout() {
		if (!app) return;
		const name = await showInputModal(app, translate('viewmenu.save_layout'));
		if (name) saveLayout(name);
	}

	const CATEGORY_ICONS: Record<FiltersTab, [string, string]> = {
		props: ['lucide-search', 'lucide-tag'],
		tags: ['lucide-hash', 'lucide-git-branch'],
		files: ['lucide-file', 'lucide-folder'],
	};
	const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
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

	const DEFAULT_SORT_STATE: Record<FiltersTab, ExplorerSortState> = {
		props: {
			sortBy: 'name',
			direction: 'asc',
			childLevel: false,
			nodeTypeFilter: null,
		},
		tags: {
			sortBy: 'name',
			direction: 'asc',
			childLevel: false,
			nodeTypeFilter: null,
		},
		files: {
			sortBy: 'name',
			direction: 'asc',
			childLevel: false,
			nodeTypeFilter: null,
			parentsFirst: true,
		},
	};
	const DEFAULT_VISIBLE_CELLS: Record<FiltersTab, string[]> = {
		props: ['icon', 'text', 'count', 'nested'],
		tags: ['icon', 'text', 'count', 'nested'],
		files: ['name', 'ext', 'count', 'nested'],
	};
	const CELL_LABELS: Record<FiltersTab, Record<string, string>> = {
		props: {
			icon: 'viewmode.pill.icon',
			text: 'viewmode.pill.text',
			count: 'viewmode.pill.count',
			type: 'viewmode.pill.type',
			nested: 'viewmode.pill.nested',
		},
		tags: {
			icon: 'viewmode.pill.icon',
			text: 'viewmode.pill.text',
			count: 'viewmode.pill.count',
			nested: 'viewmode.pill.nested',
		},
		files: {
			icon: 'viewmode.pill.icon',
			name: 'viewmode.pill.name',
			count: 'viewmode.pill.prop_count',
			ext: 'viewmode.pill.ext',
			words: 'viewmode.pill.words',
			mtime: 'viewmode.pill.mtime',
			ctime: 'viewmode.pill.ctime',
			nested: 'viewmode.pill.nested',
		},
	};
	const CELL_ICONS: Record<string, string> = {
		icon: 'lucide-image',
		text: 'lucide-text',
		name: 'lucide-file-text',
		count: 'lucide-hash',
		words: 'lucide-text',
		ext: 'lucide-file-type',
		type: 'lucide-list-filter',
		nested: 'lucide-git-branch',
		mtime: 'lucide-calendar-clock',
		ctime: 'lucide-calendar-plus',
	};
	const SORT_OPTIONS: Record<
		FiltersTab,
		Array<{ id: string; icon: string; labelKey: string }>
	> = {
		props: [
			{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.count' },
			{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
			{
				id: 'mtime',
				icon: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				icon: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{ id: 'sub', icon: 'lucide-indent', labelKey: 'sort.by.sub' },
		],
		tags: [
			{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.count' },
			{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
			{
				id: 'mtime',
				icon: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				icon: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{ id: 'sub', icon: 'lucide-indent', labelKey: 'sort.by.subtags' },
		],
		files: [
			{ id: 'name', icon: 'lucide-a-large-small', labelKey: 'sort.by.name' },
			{ id: 'count', icon: 'lucide-hash', labelKey: 'sort.by.props' },
			{ id: 'ext', icon: 'lucide-file-type', labelKey: 'sort.by.ext' },
			{
				id: 'mtime',
				icon: 'lucide-calendar-clock',
				labelKey: 'sort.by.modified',
			},
			{
				id: 'ctime',
				icon: 'lucide-calendar-plus',
				labelKey: 'sort.by.created',
			},
			{ id: 'path', icon: 'lucide-route', labelKey: 'sort.by.path' },
		],
	};
	const NODE_TYPE_OPTIONS: Record<'props' | 'tags', NodeTypeOption[]> = {
		props: [
			{ id: 'tags', icon: 'lucide-tags', labelKey: 'sort.type.tags' },
			{ id: 'list', icon: 'lucide-list', labelKey: 'sort.type.list' },
			{ id: 'text', icon: 'lucide-text', labelKey: 'sort.type.text' },
			{ id: 'number', icon: 'lucide-binary', labelKey: 'sort.type.number' },
			{ id: 'date', icon: 'lucide-calendar', labelKey: 'sort.type.date' },
			{
				id: 'checkbox',
				icon: 'lucide-check-square',
				labelKey: 'sort.type.checkbox',
			},
			{ id: 'aliases', icon: 'lucide-forward', labelKey: 'sort.type.aliases' },
			{
				id: 'cssclasses',
				icon: 'lucide-palette',
				labelKey: 'sort.type.cssclasses',
			},
			{
				id: 'unknown',
				icon: 'lucide-file-question',
				labelKey: 'sort.type.unknown',
			},
		],
		tags: [
			{ id: 'all', icon: 'lucide-tags', labelKey: 'sort.type.all' },
			{ id: 'nested', icon: 'lucide-git-branch', labelKey: 'sort.type.nested' },
			{ id: 'simple', icon: 'lucide-tag', labelKey: 'sort.type.simple' },
		],
	};
	const DEFAULT_DIR = DEFAULT_EXPLORER_SORT_DIR;

	let headerMode = $state<HeaderMode>('header');
	let headerExitDir = $state<'left' | 'right'>('right');
	let viewModeByTab = $state<Record<FiltersTab, ExplorerViewMode>>({
		props: 'tree',
		tags: 'tree',
		files: 'tree',
	});
	let visibleCellsByTab = $state<Record<FiltersTab, string[]>>({
		props: [...DEFAULT_VISIBLE_CELLS.props],
		tags: [...DEFAULT_VISIBLE_CELLS.tags],
		files: [...DEFAULT_VISIBLE_CELLS.files],
	});
	let sortStateByTab = $state<Record<FiltersTab, ExplorerSortState>>({
		props: { ...DEFAULT_SORT_STATE.props },
		tags: { ...DEFAULT_SORT_STATE.tags },
		files: { ...DEFAULT_SORT_STATE.files },
	});
	const LAYOUT_TABS: FiltersTab[] = ['files', 'props', 'tags'];
	// A short, caveman-ish summary of what each explorer holds in this layout.
	function buildLayoutSummary(): string {
		return LAYOUT_TABS.map((tab) => {
			const sort = sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab];
			const arrow = sort.direction === 'desc' ? '↓' : '↑';
			return `${tab} ${viewModeByTab[tab]}·${sort.sortBy}${arrow}`;
		}).join(' · ');
	}
	function saveLayout(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		const config: Record<string, SavedViewConfig> = {};
		for (const tab of LAYOUT_TABS) {
			config[tab] = {
				viewMode: viewModeByTab[tab],
				visibleCells: [...(visibleCellsByTab[tab] ?? [])],
				sortState: { ...sortStateByTab[tab] },
			};
		}
		onSaveLayout?.({ name: trimmed, summary: buildLayoutSummary(), config });
	}
	function loadLayout(layout: SavedLayout) {
		const nextView = { ...viewModeByTab };
		const nextCells = { ...visibleCellsByTab };
		const nextSort = { ...sortStateByTab };
		for (const tab of LAYOUT_TABS) {
			const saved = layout.config[tab];
			if (!saved) continue;
			nextView[tab] = saved.viewMode as ExplorerViewMode;
			nextCells[tab] = [...saved.visibleCells];
			nextSort[tab] = { ...saved.sortState };
		}
		viewModeByTab = nextView;
		visibleCellsByTab = nextCells;
		sortStateByTab = nextSort;
	}
	let addModeActive = $state(false);
	let searchExpanded = $state(false);
	let searchToggleActivationPending = false;
	let navbarEl = $state<HTMLElement | null>(null);
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
		return tagsExplorer?.hasExpandedNodes() ?? false;
	});
	const expansionLabel = $derived(
		hasExpandedNodes
			? translate('filter.collapse_all')
			: translate('filter.expand_all'),
	);
	const expansionIcon = $derived(
		hasExpandedNodes ? 'lucide-chevrons-down-up' : 'lucide-chevrons-up-down',
	);
	const compactFilesTools = $derived(
		minimalStyle && toolbarToolsMenu && activeSectionTab === 'files',
	);
	const showSearchInput = $derived(!minimalStyle || searchExpanded);
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
	const showTabsButtonLabel = $derived(
		minimalStyle &&
			activeSectionTab === 'content' &&
			currentTabsOption !== null &&
			showTabLabels !== false,
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
		filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
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
		tagsExplorer?.createFromSearch(filtersSearch);
	}

	function applySortState(tab: FiltersTab, state: ExplorerSortState) {
		const normalizedState = normalizeSortState(state);
		if (tab === 'files')
			fileList?.setSortBy(
				normalizedState.sortBy,
				normalizedState.direction,
				normalizedState.childLevel,
				normalizedState.nodeTypeFilter,
				normalizedState.parentsFirst,
			);
		if (tab === 'props') {
			propExplorer?.setSortBy(
				normalizedState.sortBy,
				normalizedState.direction,
				normalizedState.childLevel,
				normalizedState.nodeTypeFilter,
			);
		}
		if (tab === 'tags') {
			tagsExplorer?.setSortBy(
				normalizedState.sortBy,
				normalizedState.direction,
				normalizedState.childLevel,
				normalizedState.nodeTypeFilter,
			);
		}
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
	}

	function applyVisibleCells(tab: FiltersTab, cells: string[]) {
		const cellSet = new Set(cells);
		if (tab === 'files') fileList?.setVisibleCells(cellSet);
		if (tab === 'props') propExplorer?.setVisibleCells(cellSet);
		if (tab === 'tags') tagsExplorer?.setVisibleCells(cellSet);
	}

	function handleSortChange(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(state);
		sortStateByTab = { ...sortStateByTab, [activeTab]: normalizedState };
		applySortState(activeTab, normalizedState);
		onViewFiltersChanged?.();
	}

	function sameSortState(
		left: ExplorerSortState,
		right: ExplorerSortState,
	): boolean {
		return (
			left.sortBy === right.sortBy &&
			left.direction === right.direction &&
			left.childLevel === right.childLevel &&
			left.nodeTypeFilter === right.nodeTypeFilter &&
			left.parentsFirst === right.parentsFirst
		);
	}

	function handleExternalFilesSortState(state: ExplorerSortState) {
		const normalizedState = normalizeSortState(state);
		const currentByTab = untrack(() => ({
			...sortStateByTab,
			files: normalizeSortState(
				sortStateByTab.files ?? DEFAULT_SORT_STATE.files,
			),
		}));
		if (sameSortState(currentByTab.files, normalizedState)) return;
		sortStateByTab = {
			...currentByTab,
			files: normalizedState,
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

	function canToggleIdentity(cells: Set<string>, id: string): boolean {
		const identityCells =
			activeTab === 'files' ? ['icon', 'name'] : ['icon', 'text'];
		if (!identityCells.includes(id) || !cells.has(id)) return true;
		return identityCells.some(
			(candidate) => candidate !== id && cells.has(candidate),
		);
	}

	function toggleVisibleCell(id: string) {
		const cells = new Set(
			visibleCellsByTab[activeTab] ?? DEFAULT_VISIBLE_CELLS[activeTab],
		);
		if (cells.has(id)) {
			if (!canToggleIdentity(cells, id)) return;
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
		const cells = new Set(
			visibleCellsByTab[activeTab] ?? DEFAULT_VISIBLE_CELLS[activeTab],
		);

		const minimalNativeViewModes = minimalStyle
			? viewModesForDataSurface(activeTab).filter(
					(option) => option.id !== 'dnd' && option.id !== 'cards',
				)
			: viewModesForDataSurface(activeTab);

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

		// Config — gear submenu: save layout + saved layouts, between engines/cells.
		if (onSaveLayout) {
			menu.addSeparator();
			menu.addItem((item) => {
				item.setTitle(translate('viewmenu.config')).setIcon('lucide-settings');
				const sub = (
					item as typeof item & { setSubmenu: () => Menu }
				).setSubmenu();
				sub.addItem((s) =>
					s
						.setTitle(translate('viewmenu.save_layout'))
						.setIcon('lucide-save')
						.onClick(() => void promptSaveLayout()),
				);
				if (savedLayouts.length > 0) {
					sub.addSeparator();
					for (const layout of savedLayouts) {
						sub.addItem((s) =>
							s
								.setTitle(layout.name)
								.setIcon('lucide-layout-template')
								.onClick(() => loadLayout(layout)),
						);
					}
				}
			});
		}

		menu.addSeparator();
		for (const id of Object.keys(CELL_LABELS[activeTab])) {
			menu.addItem((item) => {
				item
					.setTitle(translate(CELL_LABELS[activeTab][id]))
					.setIcon(CELL_ICONS[id] ?? 'lucide-circle')
					.setChecked(cells.has(id))
					.onClick(() => toggleVisibleCell(id));
			});
		}

		menu.addSeparator();
		menu.addItem((item) => {
			item
				.setTitle(translate('viewmode.add_mode'))
				.setIcon('lucide-plus')
				.setChecked(addModeActive)
				.onClick(() => {
					addModeActive = !addModeActive;
					handleAddModeChange(addModeActive);
				});
		});
		menu.showAtMouseEvent(event);
	}

	function openNativeTabsMenu(event: MouseEvent) {
		const menu = new Menu();
		for (const option of tabOptions) {
			menu.addItem((item) => {
				item
					.setTitle(option.label)
					.setIcon(option.icon)
					.setChecked(option.id === activeSectionTab)
					.onClick(() => onSectionTabChange?.(option.id));
			});
		}
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
		// Floating index on/off — below the queue node.
		if (onToggleFloatingToc) {
			if (showDock || launcherActions.length === 0) menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(translate('floating_toc.menu'))
					.setIcon('lucide-a-arrow-down')
					.setChecked(floatingTocEnabled)
					.onClick(() => onToggleFloatingToc?.());
			});
		}
		// Statistics — below its own divider.
		if (!showDock && statisticsAction) {
			menu.addSeparator();
			renderTabAction(statisticsAction);
		}
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
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);
		const direction =
			current.sortBy === id
				? current.direction === 'asc'
					? 'desc'
					: 'asc'
				: (DEFAULT_DIR[id] ?? 'asc');
		return { ...current, sortBy: id, direction };
	}

	function normalizeSortState(state: ExplorerSortState): ExplorerSortState {
		const sortBy = normalizeExplorerSortBy(state.sortBy);
		return {
			...state,
			sortBy,
			direction: state.direction ?? DEFAULT_DIR[sortBy] ?? 'asc',
			parentsFirst: state.parentsFirst ?? true,
		};
	}

	function nodeTypeOptionsForActiveTab(): NodeTypeOption[] {
		if (activeTab === 'files') {
			return [
				{ id: 'all', icon: 'lucide-files', labelKey: 'sort.type.all' },
				...(fileList?.getFileTypeOptions() ?? []),
			];
		}
		return NODE_TYPE_OPTIONS[activeTab];
	}

	function nodeTypeOptionTitle(option: NodeTypeOption): string {
		return option.label ?? translate(option.labelKey ?? '');
	}

	function openNativeSortMenu(event: MouseEvent) {
		const menu = new Menu();
		const current = normalizeSortState(
			sortStateByTab[activeTab] ?? DEFAULT_SORT_STATE[activeTab],
		);

		for (const option of SORT_OPTIONS[activeTab]) {
			menu.addItem((item) => {
				const isActive = current.sortBy === option.id;
				item
					.setTitle(
						`${translate(option.labelKey)}${
							isActive ? (current.direction === 'asc' ? ' ↑' : ' ↓') : ''
						}`,
					)
					.setIcon(option.icon)
					.setChecked(isActive)
					.onClick(() => handleSortChange(nextSortState(option.id)));
			});
		}

		if (activeTab === 'files') {
			menu.addSeparator();
			menu.addItem((item) => {
				const parentsFirst = current.parentsFirst ?? true;
				item
					.setTitle(translate('sort.parents_first'))
					.setIcon('lucide-folder-tree')
					.setChecked(parentsFirst)
					.onClick(() =>
						handleSortChange({ ...current, parentsFirst: !parentsFirst }),
					);
			});
		}

		if (activeTab !== 'files') {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(
						activeTab === 'props'
							? translate('sort.vertcol.props_values')
							: translate('sort.vertcol.node_level'),
					)
					.setIcon(
						activeTab === 'props' ? 'lucide-list-tree' : 'lucide-network',
					)
					.setChecked(current.childLevel)
					.onClick(() =>
						handleSortChange({ ...current, childLevel: !current.childLevel }),
					);
			});
		}

		menu.addSeparator();
		for (const option of nodeTypeOptionsForActiveTab()) {
			const isAll = option.id === 'all';
			const isActive = isAll
				? current.nodeTypeFilter === null
				: current.nodeTypeFilter === option.id;
			menu.addItem((item) => {
				item
					.setTitle(nodeTypeOptionTitle(option))
					.setIcon(option.icon)
					.setChecked(isActive)
					.onClick(() =>
						handleSortChange({
							...current,
							nodeTypeFilter:
								isAll || current.nodeTypeFilter === option.id
									? null
									: option.id,
						}),
					);
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
		menu.addItem((item) =>
			item
				.setTitle(expansionLabel)
				.setIcon(expansionIcon)
				.onClick(toggleExplorerExpansion),
		);
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
		currentFileList?.setSortStateChangeHandler(handleExternalFilesSortState);
		return () => {
			currentFileList?.setSortStateChangeHandler(undefined);
		};
	});

	$effect(() => {
		const tab = activeTab;
		const viewMode = viewModeByTab[tab] ?? 'tree';
		const cells = visibleCellsByTab[tab] ?? DEFAULT_VISIBLE_CELLS[tab];
		const sortState = sortStateByTab[tab] ?? DEFAULT_SORT_STATE[tab];
		if (tab === 'files' && fileList) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
		}
		if (tab === 'props' && propExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
		}
		if (tab === 'tags' && tagsExplorer) {
			applyViewMode(tab, viewMode);
			applyVisibleCells(tab, cells);
			applySortState(tab, sortState);
		}
	});

	function handleAddModeChange(active: boolean) {
		propExplorer?.setAddMode(active);
		fileList?.setAddMode(active);
		tagsExplorer?.setAddMode(active);
	}
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
		<button
			class="vaultman-filters-search-mode"
			aria-label={CATEGORY_LABELS[activeTab]?.[
				filtersSearchCategory[activeTab] ?? 0
			] ?? translate('filter.search_mode')}
			use:icon={currentCategoryIcon}
			onclick={cycleSearchCategory}
		></button>
		<button
			class="vaultman-filters-search-create"
			aria-label={translate('filter.create')}
			title={minimalStyle ? undefined : translate('filter.create')}
			use:icon={currentCreateIcon}
			onclick={createSearchTarget}
		></button>
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
						{#if compactFilesTools}
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
								use:icon={'lucide-wrench'}
							></div>
						{:else}
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
					initialSortState={sortStateByTab[activeTab]}
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
					onAddModeChange={handleAddModeChange}
					initialViewMode={viewModeByTab[activeTab]}
					initialPills={visibleCellsByTab[activeTab]}
					{addOpCount}
					{icon}
				/>
			</div>
		{/if}
	</div>
</div>
