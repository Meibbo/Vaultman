<script lang="ts">
	import { getContext } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import type { ExplorerSortTarget } from '../../types/typeExplorer';
	import type { LeafDetachState } from '../../services/serviceLeafDetach';
	import type { OperationScope } from '../../services/serviceOperationScope';
	import type { FnRState } from '../../types/typeFnR';
	import type { FiltersSearchState, FiltersSearchTab } from './frameFiltersSearch';
	import { translate } from '../../index/i18n/lang';
	import Dashboard3Column from '../dashboard/Dashboard3Column.svelte';
	import AddonsMarkdownPane from '../addons/AddonsMarkdownPane.svelte';
	import OperationsPage from '../pages/pageTools.svelte';
	import StatisticsPage from '../pages/pageStats.svelte';
	import FiltersPage from '../pages/pageFilters.svelte';
	import { explorerFiles } from '../../providers/explorerFiles';
	import { explorerProps } from '../../providers/explorerProps';
	import { explorerTags } from '../../providers/explorerTags';
	import type {
		AddonsIslandService,
		AddonsQuickSwitcherApp,
	} from '../../services/serviceAddonsIsland.svelte';
	import { FRAME_NAVIGATION_KEY, type FrameNavigationService } from './frameNavigation.svelte';

	const nav = getContext<FrameNavigationService>(FRAME_NAVIGATION_KEY);
	if (!nav) {
		throw new Error(
			'FrameDashboardShell requires FRAME_NAVIGATION_KEY context. Mount inside frameVaultman.svelte.',
		);
	}

	let {
		plugin,
		icon,
		filtersActiveTab = $bindable(),
		filtersSearchByTab = $bindable(),
		filtersSearchCategory = $bindable(),
		filtersFnRState = $bindable(),
		filtersOperationScope = $bindable(),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(),
		selectedFilePaths = $bindable(),
		filtersSortBy = $bindable(),
		filtersSortDir = $bindable(),
		filtersSortTarget = $bindable(),
		filtersViewMode = $bindable(),
		addMode = $bindable(),
		addOpCount,
		detachedTabs,
		addonsIslandService,
		addonsQuickSwitcherApp,
		renderAddonsStats,
		onShowStats,
		onOperationScopeChange,
		dashboardEnabled,
	}: {
		plugin: VaultmanPlugin;
		icon: (el: HTMLElement, name: string) => { update(nextName: string): void };
		filtersActiveTab: FiltersSearchTab;
		filtersSearchByTab: FiltersSearchState;
		filtersSearchCategory: Record<FiltersSearchTab, number>;
		filtersFnRState: FnRState;
		filtersOperationScope: OperationScope;
		tagsExplorer: explorerTags | undefined;
		propExplorer: explorerProps | undefined;
		fileList: explorerFiles | undefined;
		selectedCount: number;
		selectedFilePaths: Set<string>;
		filtersSortBy: string;
		filtersSortDir: 'asc' | 'desc';
		filtersSortTarget: ExplorerSortTarget;
		filtersViewMode: unknown;
		addMode: boolean;
		addOpCount: number;
		detachedTabs: LeafDetachState;
		addonsIslandService: AddonsIslandService;
		addonsQuickSwitcherApp: AddonsQuickSwitcherApp;
		renderAddonsStats: () => string;
		onShowStats: () => void;
		onOperationScopeChange: (value: OperationScope) => void;
		dashboardEnabled: boolean;
	} = $props();
</script>

{#snippet dashboardFilters()}
	<nav class="vm-dashboard-filter-list" aria-label={translate('nav.filters')}>
		{#each nav.filterTabItems as tab (tab.id)}
			<button
				type="button"
				class="vm-dashboard-filter-button"
				class:is-active={filtersActiveTab === tab.id}
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
				{#if detachedTabs['page-tools'] === true}
					<div class="vm-page-external" data-vm-tab-id="page-tools">Detached to workspace</div>
				{:else}
					<OperationsPage {plugin} {icon} bind:activeTab={nav.toolsActiveTab} />
				{/if}
			{:else if nav.activePage === 'statistics'}
				<StatisticsPage {plugin} previewFile={nav.statsPreviewFile} {onShowStats} />
			{:else if nav.activePage === 'filters'}
				<FiltersPage
					{plugin}
					bind:filtersActiveTab
					bind:filtersSearchByTab
					bind:filtersSearchCategory
					bind:filtersFnRState
					bind:filtersOperationScope
					{onOperationScopeChange}
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

{#if dashboardEnabled}
	<div class="vm-pages-viewport vm-dashboard-viewport">
		<Dashboard3Column
			themeService={plugin.themeService}
			enabled={dashboardEnabled}
			filters={dashboardFilters}
			explorer={dashboardExplorer}
			addons={dashboardAddons}
		/>
	</div>
{/if}
