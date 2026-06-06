<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import NavbarFilters from '../layout/navbarFilters.svelte';
	import FilesTab from './tabFiles.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';

	type SearchTab = 'props' | 'files' | 'tags';

	let {
		plugin,
		filtersSearchByTab = $bindable({ props: '', tags: '', files: '' }),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		addOpCount = 0,
		expansionRevision = 0,
		icon,
	}: {
		plugin: VaultmanPlugin;
		filtersSearchByTab: Record<SearchTab, string>;
		filtersSearchCategory: Record<SearchTab, number>;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
		addOpCount?: number;
		expansionRevision?: number;
		icon: (el: HTMLElement, name: string) => any;
	} = $props();

	const filtersSearch = $derived(filtersSearchByTab.files ?? '');

	function setFilesSearch(value: string) {
		filtersSearchByTab = {
			...filtersSearchByTab,
			files: value,
		};
	}
</script>

<NavbarFilters
	activeTab="files"
	{filtersSearch}
	bind:filtersSearchCategory
	tagsExplorer={undefined}
	propExplorer={undefined}
	{fileList}
	{addOpCount}
	minimalStyle={plugin.settings.minimalStyle}
	onFiltersSearchChange={setFilesSearch}
	{expansionRevision}
	{icon}
/>

<FilesTab
	{plugin}
	bind:fileList
	onSelectionChange={(count) => (selectedCount = count)}
/>
