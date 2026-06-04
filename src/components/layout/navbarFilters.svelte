<script lang="ts">
	import { translate } from '../../i18n/index';
	import SortPopup from './popupSort.svelte';
	import ViewModePopup from './popupView.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';
	import type { PropsExplorerPanel } from '../containers/explorerProps';
	import type { TagsExplorerPanel } from '../containers/explorerTags';
	import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';

	type FiltersTab = 'props' | 'files' | 'tags';
	type HeaderMode = 'header' | 'sort' | 'viewmode';

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
	} = $props();

	const CATEGORY_ICONS: Record<FiltersTab, [string, string]> = {
		props: ['lucide-tag', 'lucide-text-cursor-input'],
		tags: ['lucide-hash', 'lucide-git-branch'],
		files: ['lucide-file', 'lucide-folder'],
	};
	const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
		props: [
			translate('filter.category.props'),
			translate('filter.category.values'),
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
		},
	};
	const DEFAULT_VISIBLE_CELLS: Record<FiltersTab, string[]> = {
		props: ['icon', 'text', 'count'],
		tags: ['icon', 'text', 'count'],
		files: ['icon', 'name', 'count', 'path'],
	};

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
	const headerActionClass = $derived(
		minimalStyle ? 'clickable-icon nav-action-button' : 'vaultman-nav-fab',
	);

	function openSortPopup() {
		headerExitDir = 'right';
		headerMode = 'sort';
	}
	function openViewModePopup() {
		headerExitDir = 'left';
		headerMode = 'viewmode';
	}
	function closeHeaderPopup() {
		headerMode = 'header';
	}

	function cycleSearchCategory() {
		const tab = activeTab;
		filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
		filtersSearchCategory = { ...filtersSearchCategory };
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
		if (tab === 'files') fileList?.setSortBy(state.sortBy, state.direction);
		if (tab === 'props') {
			propExplorer?.setSortBy(
				state.sortBy,
				state.direction,
				state.childLevel,
				state.nodeTypeFilter,
			);
		}
		if (tab === 'tags') {
			tagsExplorer?.setSortBy(
				state.sortBy,
				state.direction,
				state.childLevel,
				state.nodeTypeFilter,
			);
		}
	}

	function applyViewMode(tab: FiltersTab, mode: ExplorerViewMode) {
		const effectiveMode = mode === 'grid' ? 'grid' : 'tree';
		if (tab === 'files') fileList?.setViewMode(effectiveMode);
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
		sortStateByTab = { ...sortStateByTab, [activeTab]: state };
		applySortState(activeTab, state);
	}

	function handleViewModeChange(mode: ExplorerViewMode) {
		if (mode === 'dnd' || mode === 'cards') return;
		viewModeByTab = { ...viewModeByTab, [activeTab]: mode };
		applyViewMode(activeTab, mode);
	}

	function handlePillsChange(cells: string[]) {
		visibleCellsByTab = { ...visibleCellsByTab, [activeTab]: cells };
		applyVisibleCells(activeTab, cells);
	}

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

<div class="vaultman-navbar-filters vaultman-glass vaultman-glass--top">
	<div class="vaultman-filters-header-wrap">
		{#if headerMode === 'header'}
			<div class="vaultman-filters-header">
				<div
					class={headerActionClass}
					role="button"
					tabindex="0"
					aria-label={translate('filter.viewmode_btn')}
					onclick={openViewModePopup}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') openViewModePopup();
					}}
					use:icon={'lucide-layout-list'}
				></div>
				<div class="vaultman-filters-header-search-pill">
					<input
						class="vaultman-filters-search-input"
						type="text"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						spellcheck="false"
						placeholder={translate('filter.search_placeholder')}
						bind:value={filtersSearch}
					/>
					{#if filtersSearch}
						<button
							class="vaultman-filters-search-clear"
							aria-label={translate('filter.search_clear')}
							use:icon={'lucide-x'}
							onclick={() => {
								filtersSearch = '';
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
						title={translate('filter.create')}
						use:icon={currentCreateIcon}
						onclick={createSearchTarget}
					></button>
				</div>
				{#if activeTab === 'files'}
					<div
						class={headerActionClass}
						role="button"
						tabindex="0"
						aria-label={translate('filter.auto_reveal')}
						title={translate('filter.auto_reveal')}
						onclick={() => fileList?.autoRevealActiveFile()}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ')
								fileList?.autoRevealActiveFile();
						}}
						use:icon={'lucide-crosshair'}
					></div>
					<div
						class={headerActionClass}
						role="button"
						tabindex="0"
						aria-label={translate('filter.expand_all')}
						title={translate('filter.expand_all')}
						onclick={() => fileList?.expandAll()}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') fileList?.expandAll();
						}}
						use:icon={'lucide-chevrons-down-up'}
					></div>
					<div
						class={headerActionClass}
						role="button"
						tabindex="0"
						aria-label={translate('filter.collapse_all')}
						title={translate('filter.collapse_all')}
						onclick={() => fileList?.collapseAll()}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') fileList?.collapseAll();
						}}
						use:icon={'lucide-chevrons-up-down'}
					></div>
				{/if}
				<div
					class={headerActionClass}
					role="button"
					tabindex="0"
					aria-label={translate('filter.sort_btn')}
					onclick={openSortPopup}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') openSortPopup();
					}}
					use:icon={'lucide-arrow-up-down'}
				></div>
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
