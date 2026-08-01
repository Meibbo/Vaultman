<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	import FilesTab from './tabFiles.svelte';
	import type { FilesExplorerPanel } from '../containers/explorerFiles';

	let {
		plugin,
		fileList = $bindable(),
		selectedCount = $bindable(0),
	}: {
		plugin: VaultmanPlugin;
		fileList: FilesExplorerPanel | undefined;
		selectedCount: number;
	} = $props();
</script>

<FilesTab
	{plugin}
	bind:fileList
	onSelectionChange={(count) => (selectedCount = count)}
/>
