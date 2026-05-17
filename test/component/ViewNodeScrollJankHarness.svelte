<script lang="ts">
	import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
	import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
	import {
		DEFAULT_NODE_TABLE_COLUMNS,
		nodeRowsFromTree,
	} from '../../src/services/serviceViewTableAdapter';
	import type { ViewSizePresetId } from '../../src/services/serviceViewSize';
	import type { TreeNode } from '../../src/types/typeNode';

	let {
		mode,
		nodes,
		measure,
		icon,
	}: {
		mode: 'grid' | 'table';
		nodes: TreeNode[];
		measure: any;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let tableColumnWidth = $state(480);
	let gridSizePresetId: ViewSizePresetId = $state('medium');
	const tableRows = $derived(nodeRowsFromTree(nodes));

	export function setTableColumnWidth(width: number): void {
		tableColumnWidth = width;
	}

	export function setGridSizePresetId(id: ViewSizePresetId): void {
		gridSizePresetId = id;
	}
</script>

{#if mode === 'table'}
	<ViewNodeTable
		rows={tableRows}
		columns={DEFAULT_NODE_TABLE_COLUMNS}
		selectedIds={new Set<string>()}
		columnWidth={tableColumnWidth}
		{measure}
		onRowClick={() => {}}
		onContextMenu={() => {}}
		{icon}
	/>
{:else}
	<ViewNodeGrid
		{nodes}
		selectedIds={new Set<string>()}
		sizePresetId={gridSizePresetId}
		{measure}
		onTileClick={() => {}}
		onContextMenu={() => {}}
		{icon}
	/>
{/if}
