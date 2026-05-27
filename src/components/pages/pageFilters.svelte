<script lang="ts">
	import type { VaultmanPlugin } from "../../main";
	import { setIcon } from "obsidian";
	import { fade } from "svelte/transition";
	import FiltersTagsTab from "./tabTags.svelte";
	import FiltersPropsTab from "./tabProps.svelte";
	import FiltersFilesTab from "./tabFiles.svelte";
	import NavbarTabs from "../layout/navbarTabs.svelte";
	import NavbarFilters from "../layout/navbarFilters.svelte";
	import type { FilesExplorerPanel } from "../containers/explorerFiles";
	import type { PropsExplorerPanel } from "../containers/explorerProps";
	import type { TagsExplorerPanel } from "../containers/explorerTags";

	type FiltersTab = "props" | "files" | "tags";

	let {
		plugin,
		filtersActiveTab = $bindable("props"),
		filtersSearch = $bindable(""),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		addOpCount = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		tagsExplorer: TagsExplorerPanel | null;
		propExplorer: PropsExplorerPanel | undefined;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
		addOpCount?: number;
	} = $props();

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}
</script>

<NavbarTabs
	activeTab={filtersActiveTab}
	showLabels={plugin.settings.filtersShowTabLabels}
	onTabChange={switchFiltersTab}
	{icon}
/>

<NavbarFilters
	activeTab={filtersActiveTab}
	bind:filtersSearch
	bind:filtersSearchCategory
	{tagsExplorer}
	{propExplorer}
	{fileList}
	{addOpCount}
	{icon}
/>

{#key filtersActiveTab}
	<div
		class="vaultman-filters-tab-content"
		in:fade={{ duration: 180 }}
		out:fade={{ duration: 180 }}
	>
		{#if filtersActiveTab === "tags"}
			<FiltersTagsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.tags}
				bind:tagsExplorer
			/>
		{:else if filtersActiveTab === "props"}
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearch}
				searchMode={filtersSearchCategory.props}
				bind:propExplorer
			/>
		{:else if filtersActiveTab === "files"}
			<FiltersFilesTab
				{plugin}
				bind:fileList
				onSelectionChange={(c) => (selectedCount = c)}
			/>
		{/if}
	</div>
{/key}
