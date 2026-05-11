<script lang="ts">
	import { untrack } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import type { TabId } from '../../registry/tabRegistry';
	import type { OperationScope } from '../../services/serviceOperationScope';
	import { normalizeOperationScope } from '../../services/serviceOperationScope';
	import { createFnRState } from '../../services/serviceFnR';
	import type { FnRState } from '../../types/typeFnR';
	import type { ExplorerSortTarget } from '../../types/typeExplorer';
	import type { ExplorerViewMode } from '../../types/typeViews';
	import type { FiltersSearchState, FiltersSearchTab } from './frameFiltersSearch';
	import { createFiltersSearchState } from './frameFiltersSearch';
	import PageFilters from '../pages/pageFilters.svelte';
	import PageTools from '../pages/pageTools.svelte';
	import ExplorerQueueComp from '../containers/explorerQueue.svelte';
	import type { explorerFiles } from '../../providers/explorerFiles';
	import type { explorerProps } from '../../providers/explorerProps';
	import type { explorerTags } from '../../providers/explorerTags';

	let {
		plugin,
		tabId,
	}: {
		plugin: VaultmanPlugin;
		tabId: TabId;
	} = $props();

	let filtersActiveTab = $state<FiltersSearchTab>(untrack(() => tabForTabId(tabId)));
	let filtersSearchByTab = $state<FiltersSearchState>(createFiltersSearchState());
	let filtersSearchCategory = $state<Record<FiltersSearchTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
		content: 0,
	});
	let filtersFnRState = $state<FnRState>(createFnRState());
	let filtersOperationScope = $state<OperationScope>(
		untrack(() => normalizeOperationScope(plugin.settings?.explorerOperationScope)),
	);
	let filtersSortBy = $state('name');
	let filtersSortDir = $state<'asc' | 'desc'>('asc');
	let filtersSortTarget = $state<ExplorerSortTarget>('top');
	let filtersViewMode = $state<ExplorerViewMode>('tree');
	let filtersBaseChooseMode = $state(false);
	let addMode = $state(false);
	let tagsExplorer = $state<explorerTags | undefined>();
	let propExplorer = $state<explorerProps | undefined>();
	let fileList = $state<explorerFiles | undefined>();
	let selectedCount = $state(0);
	let selectedFilePaths = $state(new Set<string>());

	function setFiltersOperationScope(value: OperationScope): void {
		filtersOperationScope = normalizeOperationScope(value);
	}

	function tabForTabId(id: TabId): FiltersSearchTab {
		switch (id) {
			case 'explorer-files':
				return 'files';
			case 'explorer-tags':
				return 'tags';
			case 'content':
				return 'content';
			case 'explorer-props':
			case 'explorer-values':
			default:
				return 'props';
		}
	}

	const isExplorerTab = $derived(
		tabId === 'explorer-files' ||
			tabId === 'explorer-tags' ||
			tabId === 'explorer-props' ||
			tabId === 'explorer-values' ||
			tabId === 'content',
	);
</script>

<div class="vm-detached-tab-host" data-vm-tab-id={tabId}>
	{#if tabId === 'page-tools'}
		<PageTools {plugin} />
	{:else if isExplorerTab}
		<PageFilters
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
			showTabs={false}
			addOpCount={0}
		/>
	{:else if tabId === 'queue'}
		<ExplorerQueueComp {plugin} />
	{:else}
		<div class="vm-detached-tab-empty">Unsupported detached tab</div>
	{/if}
</div>
