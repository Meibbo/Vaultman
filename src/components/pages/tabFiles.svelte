<script lang="ts">
	import { onMount } from 'svelte';
	import { explorerFiles } from '../../providers/explorerFiles';
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
		fileList = $bindable(),
		searchTerm = $bindable(''),
		searchMode = 0,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		viewMode = $bindable('grid'),
		active = true,
		showSelectedOnly = false,
		showHiddenFiles = false,
		selectedFilePaths = $bindable(new Set<string>()),
		onSelectionChange,
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
		startRenameHandoff,
		visibleFields = [],
	}: {
		plugin: VaultmanPlugin;
		fileList: explorerFiles | undefined;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		viewMode?: any;
		active?: boolean;
		showSelectedOnly?: boolean;
		showHiddenFiles?: boolean;
		selectedFilePaths: Set<string>;
		onSelectionChange?: (count: number) => void;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
		visibleFields?: readonly string[];
	} = $props();

	$effect(() => {
		onSelectionChange?.(selectedFilePaths.size);
	});

	onMount(() => {
		fileList = new explorerFiles(plugin, { startRenameHandoff });
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

<div class="vm-files-tab-content">
	{#if fileList}
		<PanelExplorer
			{plugin}
			provider={fileList}
			bind:viewMode
			{searchTerm}
			{searchMode}
			bind:sortBy
			bind:sortDirection
			{active}
			{showSelectedOnly}
			{showHiddenFiles}
			{nodeExpansionCommand}
			{onNodeExpansionSummaryChange}
			{visibleFields}
			{icon}
			bind:selectedFiles={selectedFilePaths}
		/>
	{/if}
</div>
