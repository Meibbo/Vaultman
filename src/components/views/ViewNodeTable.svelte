<script lang="ts" generics="TNode extends NodeBase = NodeBase">
	import { untrack } from 'svelte';
	import type { SortingState } from '@tanstack/table-core';
	import { createVirtualizer, type Rect, type Virtualizer } from '@tanstack/svelte-virtual';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ViewColumn, ViewRow } from '../../types/typeViews';
	import {
		NODE_MOUSE_GESTURE_CONFIG,
		NODE_MOUSE_IGNORE_SELECTOR,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';
	import type { NodeBadge } from '../../types/typeNode';
	import {
		handleNodeBadgePress,
		nodeBadgeAriaLabel,
		nodeBadgeIsActionable,
		nodeBadgeKey,
		nodeBadgeTitle,
		ownNodeBadges,
	} from './nodeBadgeHelpers';

	const TABLE_ROW_HEIGHT = 32;
	const TABLE_OVERSCAN = 14;
	const TABLE_FALLBACK_WIDTH = 640;
	const TABLE_FALLBACK_HEIGHT = 360;
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };

	interface Props<TNode extends NodeBase = NodeBase> {
		rows: ViewRow<TNode>[];
		columns: ViewColumn<TNode>[];
		selectedIds?: ReadonlySet<string>;
		focusedId?: string | null;
		activeId?: string | null;
		onRowClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		onSelectAll?: (ids: string[], e: Event) => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		rows,
		columns,
		selectedIds = EMPTY_SELECTED_IDS,
		focusedId = null,
		activeId = null,
		onRowClick,
		onPrimaryAction: _onPrimaryAction,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		onRowKeydown,
		onSelectAll,
		onBadgeDoubleClick,
		scrollTarget = null,
		mouseGestureConfig,
		icon,
	}: Props<TNode> = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let sorting: SortingState = $state([]);
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	const tableRows = $derived(sortRows(rows, columns, sorting));
	const columnTemplate = $derived(
		columns
			.map((column) => `minmax(${column.minWidth ?? 120}px, ${column.width ?? 1}fr)`)
			.join(' '),
	);
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => tableVirtualRowKey(tableRows, index),
		estimateSize: () => TABLE_ROW_HEIGHT,
		observeElementRect: observeTableRect,
		overscan: TABLE_OVERSCAN,
		initialRect: { width: TABLE_FALLBACK_WIDTH, height: TABLE_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedRows = $derived.by(() => {
		const visibleRows = virtualRows
			.filter((row) => row.index < tableRows.length)
			.map((row) => ({ key: row.key, index: row.index, start: row.start }));
		if (visibleRows.length > 0 || tableRows.length === 0) return visibleRows;
		return fallbackRenderedRows(tableRows);
	});
	const totalHeight = $derived(
		Math.max($rowVirtualizer.getTotalSize(), tableRows.length * TABLE_ROW_HEIGHT),
	);

	$effect(() => {
		const count = tableRows.length;
		const rows = tableRows;
		const scrollElement = outerEl;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => tableVirtualRowKey(rows, index),
				estimateSize: () => TABLE_ROW_HEIGHT,
				observeElementRect: observeTableRect,
				overscan: TABLE_OVERSCAN,
				initialRect: { width: TABLE_FALLBACK_WIDTH, height: TABLE_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const rowIndex = tableRows.findIndex((row) => row.id === target.id);
		if (rowIndex >= 0) scrollTableRowIntoView(rowIndex);
	});

	function handleHeaderClick(column: ViewColumn<TNode>) {
		if (column.sortable !== true) return;
		const current = headerSortState(column.id);
		sorting = [{ id: column.id, desc: current === 'asc' }];
	}

	function scrollTableRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		const viewportHeight = outerEl.clientHeight || TABLE_FALLBACK_HEIGHT;
		const currentTop = outerEl.scrollTop;
		const rowTop = rowIndex * TABLE_ROW_HEIGHT;
		const rowBottom = rowTop + TABLE_ROW_HEIGHT;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		$rowVirtualizer.scrollToIndex(rowIndex, { align: rowTop < currentTop ? 'start' : 'end' });
		outerEl.scrollTop = nextTop;
		outerEl.dispatchEvent(new Event('scroll'));
	}

	function observeTableRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || TABLE_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || TABLE_FALLBACK_HEIGHT,
			});
		};
		emit();
		if (!outerEl || typeof ResizeObserver === 'undefined') return () => {};
		const ro = new ResizeObserver(emit);
		ro.observe(outerEl);
		return () => ro.disconnect();
	}

	function handleRowClick(id: string, e: MouseEvent) {
		mouse.handleClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onRowClick(id, event),
				secondary: (event) => onSecondaryAction?.(id, event),
				tertiary: (event) => onTertiaryAction?.(id, event),
			},
			nodeMouseConfig,
		);
	}

	function handleRowAuxClick(id: string, e: MouseEvent) {
		mouse.handleAuxClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(id, event) },
			nodeMouseConfig,
		);
	}

	function rowBadges(row: ViewRow<TNode>): NodeBadge[] {
		return ownNodeBadges(row.node as TNode & { badges?: readonly NodeBadge[] });
	}

	function handleBadgeKeydown(e: KeyboardEvent, badge: NodeBadge) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleNodeBadgePress(e, badge, onBadgeDoubleClick);
		}
	}

	function handleTableKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			onSelectAll?.(
				tableRows.map((row) => row.id),
				e,
			);
		}
	}

	function headerSortState(columnId: string): false | 'asc' | 'desc' {
		const current = sorting[0];
		if (!current || current.id !== columnId) return false;
		return current.desc ? 'desc' : 'asc';
	}

	function cellDataId(row: ViewRow<TNode>, columnId: string): string {
		return row.cells.find((cell) => cell.columnId === columnId)?.id ?? `${row.id}:${columnId}`;
	}

	function cellDisplay(row: ViewRow<TNode>, column: ViewColumn<TNode>): string {
		const cell = row.cells.find((item) => item.columnId === column.id);
		if (cell) return cell.display;
		return displayForValue(valueForColumn(row, column));
	}

	function tableVirtualRowKey(rows: readonly { id: string }[], index: number): string | number {
		return rows[index]?.id ?? index;
	}

	function fallbackRenderedRows(rows: readonly { id: string }[]): {
		key: string;
		index: number;
		start: number;
	}[] {
		const visibleCount = Math.min(
			rows.length,
			Math.ceil(TABLE_FALLBACK_HEIGHT / TABLE_ROW_HEIGHT) + TABLE_OVERSCAN * 2,
		);
		return rows.slice(0, visibleCount).map((row, index) => ({
			key: row.id,
			index,
			start: index * TABLE_ROW_HEIGHT,
		}));
	}

	function sortRows(
		sourceRows: readonly ViewRow<TNode>[],
		sourceColumns: readonly ViewColumn<TNode>[],
		state: SortingState,
	): ViewRow<TNode>[] {
		const current = state[0];
		if (!current) return sourceRows as ViewRow<TNode>[];
		const column = sourceColumns.find((item) => item.id === current.id);
		if (!column || column.sortable !== true) return sourceRows as ViewRow<TNode>[];
		const dir = current.desc ? -1 : 1;
		return [...sourceRows].sort(
			(a, b) => dir * compareValues(valueForColumn(a, column), valueForColumn(b, column)),
		);
	}

	function valueForColumn(row: ViewRow<TNode>, column: ViewColumn<TNode>): unknown {
		if (column.getValue) return column.getValue(row.node);
		const cell = row.cells.find((item) => item.columnId === column.id);
		if (cell) return cell.value;
		if (column.id === 'label') return row.label;
		if (column.id === 'detail') return row.detail ?? '';
		return '';
	}

	function compareValues(left: unknown, right: unknown): number {
		if (typeof left === 'number' && typeof right === 'number') return left - right;
		return displayForValue(left).localeCompare(displayForValue(right), undefined, {
			numeric: true,
			sensitivity: 'base',
		});
	}

	function displayForValue(value: unknown): string {
		if (value == null) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
			return String(value);
		}
		return '';
	}
</script>

<div
	class="vm-node-table"
	bind:this={outerEl}
	role="grid"
	aria-multiselectable="true"
	tabindex="0"
	onkeydown={handleTableKeydown}
	style:--vm-node-table-columns={columnTemplate}
>
	<div class="vm-node-table-header" role="row">
		{#each columns as column (column.id)}
			{@const sortState = headerSortState(column.id)}
			<button
				type="button"
				class="vm-node-table-header-cell"
				data-vm-table-header={column.id}
				role="columnheader"
				aria-sort={sortState === 'asc'
					? 'ascending'
					: sortState === 'desc'
						? 'descending'
						: 'none'}
				disabled={column.sortable !== true}
				onclick={() => handleHeaderClick(column)}
			>
				<span>{column.label}</span>
				{#if sortState}
					<span class="vm-node-table-sort" data-vm-table-sort={column.id}>
						{sortState}
					</span>
				{/if}
			</button>
		{/each}
	</div>
	<div
		class="vm-node-table-inner"
		style:--vm-node-table-total-h={`${totalHeight}px`}
	>
		{#each renderedRows as virtualRow (virtualRow.key)}
			{@const row = tableRows[virtualRow.index]}
			{#if row}
				{@const id = row.id}
				{@const isSelected = selectedIds.has(id)}
				{@const isFocused = focusedId === id}
				{@const isActive = activeId === id}
				{@const directBadges = rowBadges(row)}
				<div
					class="vm-node-table-row {row.cls ?? ''}"
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:is-active-node={isActive}
					data-id={id}
					role="row"
					tabindex="0"
					aria-selected={isSelected}
					onclick={(e) => handleRowClick(id, e)}
					onauxclick={(e) => handleRowAuxClick(id, e)}
					oncontextmenu={(e) => onContextMenu(id, e)}
					onkeydown={(e) => onRowKeydown?.(id, e)}
					style:--vm-node-table-y={`${virtualRow.start}px`}
				>
					{#each columns as column (column.id)}
						{@const dataCellId = cellDataId(row, column.id)}
						{@const display = cellDisplay(row, column)}
						<div
							class="vm-node-table-cell"
							role="gridcell"
							data-vm-table-cell={dataCellId}
						>
							{#if column.id === 'label'}
								{#if row.icon}
									<span class="vm-node-table-icon" use:icon={row.icon}></span>
								{/if}
								<span class="vm-node-table-primary" data-vm-table-primary>
									{display}
								</span>
								{#if directBadges.length > 0}
									<span class="vm-node-table-badge-zone">
										{#each directBadges as badge, badgeIndex (nodeBadgeKey(badge, badgeIndex))}
											<span
												class="vm-badge"
												role="button"
												class:is-solid={badge.solid}
												class:is-undoable={badge.queueIndex !== undefined}
												class:is-actionable={nodeBadgeIsActionable(badge)}
												class:is-quick-action={badge.quickAction}
												class:vm-badge--red={badge.solid && badge.color === 'red'}
												class:vm-badge--blue={badge.solid && badge.color === 'blue'}
												class:vm-badge--purple={badge.solid && badge.color === 'purple'}
												class:vm-badge--orange={badge.solid && badge.color === 'orange'}
												class:vm-badge--green={badge.solid && badge.color === 'green'}
												title={nodeBadgeTitle(badge)}
												aria-label={nodeBadgeAriaLabel(badge)}
												tabindex={nodeBadgeIsActionable(badge) ? 0 : -1}
												onclick={(e) => handleNodeBadgePress(e, badge, onBadgeDoubleClick)}
												onkeydown={(e) => handleBadgeKeydown(e, badge)}
											>
												{#if badge.icon}
													<span class="vm-badge-icon" use:icon={badge.icon}></span>
												{/if}
											</span>
										{/each}
									</span>
								{/if}
							{:else}
								{display}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
</div>
