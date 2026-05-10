<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { explorerProps } from '../../providers/explorerProps';
	import PanelExplorer from '../containers/panelExplorer.svelte';
	import type { VaultmanPlugin } from '../../main';
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
		sortTarget = 'top',
		viewMode = $bindable('tree'),
		active = true,
		manualDndEnabled = false,
		explorer = $bindable(),
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
		startRenameHandoff,
		openPropSetIsland,
		visibleFields = [],
	}: {
		plugin: VaultmanPlugin;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		sortTarget?: 'top' | 'children';
		viewMode?: any;
		active?: boolean;
		manualDndEnabled?: boolean;
		explorer: explorerProps | undefined;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
		openPropSetIsland?: (propName: string) => void;
		visibleFields?: readonly string[];
	} = $props();

	onMount(() => {
		explorer = new explorerProps(plugin, { startRenameHandoff, openPropSetIsland });
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

<div class="vm-props-tab-content">
	{#if explorer}
		<PanelExplorer
			{plugin}
			provider={explorer}
			bind:viewMode
			bind:searchTerm
			{searchMode}
			bind:sortBy
			bind:sortDirection
			{sortTarget}
			{active}
			{manualDndEnabled}
			{nodeExpansionCommand}
			{onNodeExpansionSummaryChange}
			{visibleFields}
			{icon}
		/>
	{/if}
</div>
