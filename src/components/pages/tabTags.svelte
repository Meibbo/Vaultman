<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { VaultmanPlugin } from '../../main';
	import { explorerTags } from '../../providers/explorerTags';
	import PanelExplorer from '../containers/panelExplorer.svelte';
	import type {
		ExplorerExpansionCommand,
		ExplorerExpansionSummary,
	} from '../../types/typeExplorer';
	import type { FnRRenameHandoff } from '../../types/typeFnR';
	import { setIcon } from 'obsidian';

	let {
		plugin,
		searchTerm = $bindable(''),
		searchMode = 0,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		viewMode = $bindable('tree'),
		active = true,
		explorer = $bindable(),
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
		startRenameHandoff,
		visibleFields = [],
	}: {
		plugin: VaultmanPlugin;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		viewMode?: any;
		active?: boolean;
		explorer: explorerTags | undefined;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
		visibleFields?: readonly string[];
	} = $props();

	onMount(() => {
		explorer = new explorerTags(plugin, { startRenameHandoff });
	});

	onDestroy(() => {
		explorer?.destroy();
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}
</script>

<div class="vm-tags-tab-content">
	{#if explorer}
		<PanelExplorer
			{plugin}
			provider={explorer}
			bind:viewMode
			bind:searchTerm
			{searchMode}
			bind:sortBy
			bind:sortDirection
			{active}
			{nodeExpansionCommand}
			{onNodeExpansionSummaryChange}
			{visibleFields}
			{icon}
		/>
	{/if}
</div>
