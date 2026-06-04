<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import NavbarFilters from '../layout/navbarFilters.svelte';
	import FilesTab from './tabFiles.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';

	type SearchTab = 'props' | 'files' | 'tags';

	let {
		plugin,
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		addOpCount = 0,
		icon,
	}: {
		plugin: VaultmanPlugin;
		filtersSearch: string;
		filtersSearchCategory: Record<SearchTab, number>;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
		addOpCount?: number;
		icon: (el: HTMLElement, name: string) => any;
	} = $props();
</script>

<NavbarFilters
	activeTab="files"
	bind:filtersSearch
	bind:filtersSearchCategory
	tagsExplorer={undefined}
	propExplorer={undefined}
	{fileList}
	{addOpCount}
	{icon}
/>

<FilesTab
	{plugin}
	bind:fileList
	onSelectionChange={(count) => (selectedCount = count)}
/>
