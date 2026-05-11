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
		createTextMeasureService,
		fallbackTextMeasureEngine,
		type TextMeasureService,
		type TextMeasureStyle,
	} from '../../services/serviceTextMeasure';
	import {
		handleNodeBadgePress,
		nodeBadgeAriaLabel,
		nodeBadgeIsActionable,
		nodeBadgeKey,
		nodeBadgeTitle,
		ownNodeBadges,
	} from './nodeBadgeHelpers';
	import { PerfMeter } from '../../services/perfMeter';
	import { NodeRowMeasureService } from '../../services/serviceNodeRowMeasure';
	import {
		DEFAULT_NODE_ROW_MEASURE_STYLE,
		nodeRowMeasureStyleKey,
		resolveNodeRowMeasureStyle,
	} from '../../services/serviceNodeRowStyle';
	import { boundedElementViewportRect } from '../../services/serviceScroll';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const TABLE_ROW_HEIGHT = 32;
	const TABLE_OVERSCAN = 14;
	const TABLE_FALLBACK_WIDTH = 640;
	const TABLE_FALLBACK_HEIGHT = 360;
	const TABLE_ROW_PADDING_BLOCK = 10;
	const TABLE_LABEL_SELECTOR = '.vm-node-table-primary';
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };
	type TableMeasureService = NodeRowMeasureService | TextMeasureService;

	interface Props<TNode extends NodeBase = NodeBase> {
		rows: ViewRow<TNode>[];
		columns: ViewColumn<TNode>[];
		selectedIds?: ReadonlySet<string>;
		selectedMap?: ReadonlyMap<string, boolean>;
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
		measure?: TableMeasureService;
		themeService?: ThemeService;
		columnWidth?: number;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		rows,
		columns,
		selectedIds = EMPTY_SELECTED_IDS,
		selectedMap,
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
		measure = createNodeRowMeasureService(),
		themeService = undefined,
		columnWidth = undefined,
		icon,
	}: Props<TNode> = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let tableWidth = $state(TABLE_FALLBACK_WIDTH);
	let sorting: SortingState = $state([]);
	let gpuReadyMarked = false;
	let tableLabelWidth = $state(TABLE_FALLBACK_WIDTH);
	let tableMeasureStyle: TextMeasureStyle = $state(DEFAULT_NODE_ROW_MEASURE_STYLE);
	let tableMetricsFrame: number | null = null;
	let tableRemeasureFrame: number | null = null;
	let measuredTableRows = $state(new Map<string, number>());
	let measuredTableRowsRevision = $state('');
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);
	const useNativeDom = $derived(themeService?.useNativeDom ?? false);

	$effect(() => () => mouse.cancelAll());

	const tableRows = $derived(sortRows(rows, columns, sorting));
	const effectiveTableLabelWidth = $derived(columnWidth ?? tableLabelWidth);
	const tableMeasureRevision = $derived(
		`${nodeRowMeasureStyleKey(tableMeasureStyle)}:${columns.length}:${tableRows.length}:${effectiveTableLabelWidth}`,
	);
	const columnTemplate = $derived(
		columns
			.map((column) => `minmax(${column.minWidth ?? 120}px, ${column.width ?? 1}fr)`)
			.join(' '),
	);
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => tableVirtualRowKey(tableRows, index),
		estimateSize: (index) => tableEstimateSize(index),
		observeElementRect: observeTableRect,
		overscan: TABLE_OVERSCAN,
		initialRect: { width: TABLE_FALLBACK_WIDTH, height: TABLE_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedRows = $derived.by(() => {
		const measuredRows = measuredTableRows;
		const visibleRows = virtualRows
			.filter((row) => row.index < tableRows.length)
			.map((row) => ({
				key: row.key,
				index: row.index,
				start: tableRowTopFromMap(measuredRows, row.index),
				size: tableEstimateSizeFromMap(measuredRows, row.index),
			}));
		if (visibleRows.length > 0 || tableRows.length === 0) return visibleRows;
		return fallbackRenderedRows(tableRows, measuredTableRows);
	});
	const totalHeight = $derived(
		Math.max(
			$rowVirtualizer.getTotalSize(),
			tableRows.reduce(
				(height, row) => height + (measuredTableRows.get(row.id) ?? TABLE_ROW_HEIGHT),
				0,
			),
		),
	);

	$effect(() => {
		const count = tableRows.length;
		const rows = tableRows;
		const measuredRows = measuredTableRows;
		const scrollElement = outerEl;
		const width = tableWidth;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => tableVirtualRowKey(rows, index),
				estimateSize: (index) =>
					rows[index] ? measuredRows.get(rows[index].id) ?? TABLE_ROW_HEIGHT : TABLE_ROW_HEIGHT,
				observeElementRect: observeTableRect,
				overscan: TABLE_OVERSCAN,
				initialRect: { width, height: TABLE_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const rows = tableRows;
		const visibleRows = virtualRows.filter((row) => row.index < rows.length);
		const labelColumn = columns.find((column) => column.id === 'label') ?? columns[0];
		const revision = tableMeasureRevision;
		const width = effectiveTableLabelWidth;
		const style = tableMeasureStyle;

		untrack(() => {
			const next =
				measuredTableRowsRevision === revision
					? new Map(measuredTableRows)
					: new Map<string, number>();
			let changed = measuredTableRowsRevision !== revision;
			PerfMeter.time(
				'explorer.table.measureRows',
				() => {
					for (const virtualRow of visibleRows) {
						const row = rows[virtualRow.index];
						if (!row) continue;
						const height = measureTableRowHeight(row, labelColumn, width, style, revision);
						if (next.get(row.id) !== height) {
							next.set(row.id, height);
							changed = true;
						}
					}
				},
				'service',
				{ rows: visibleRows.length },
			);
			if (!changed) return;
			measuredTableRowsRevision = revision;
			measuredTableRows = next;
			scheduleVirtualizerRemeasure('table');
		});
	});

	$effect(() => {
		if (!outerEl) return;
		updateTableMeasureInputs();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			scheduleTableMetricsUpdate();
			scheduleVirtualizerRemeasure('table');
		});
		ro.observe(outerEl);
		return () => {
			if (tableMetricsFrame !== null) cancelAnimationFrame(tableMetricsFrame);
			if (tableRemeasureFrame !== null) cancelAnimationFrame(tableRemeasureFrame);
			tableMetricsFrame = null;
			tableRemeasureFrame = null;
			ro.disconnect();
		};
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const rowIndex = tableRows.findIndex((row) => row.id === target.id);
		if (rowIndex >= 0) scrollTableRowIntoView(rowIndex);
	});

	$effect(() => {
		if (!outerEl || gpuReadyMarked) return;
		gpuReadyMarked = true;
		PerfMeter.mark('perf.phase04.gpu-positioning.ready', 'mark', { surface: 'table' });
	});

	function handleHeaderClick(column: ViewColumn<TNode>) {
		if (column.sortable !== true) return;
		const current = headerSortState(column.id);
		sorting = [{ id: column.id, desc: current === 'asc' }];
	}

	function scrollTableRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		PerfMeter.time('explorer.table.scrollIntoView', () => {
			const viewportHeight = tableViewportRect().height;
			const currentTop = outerEl!.scrollTop;
			const rowTop = tableRowTop(rowIndex);
			const rowBottom = rowTop + tableEstimateSize(rowIndex);
			const currentBottom = currentTop + viewportHeight;
			if (rowTop >= currentTop && rowBottom <= currentBottom) return;

			const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
			$rowVirtualizer.scrollToIndex(rowIndex, { align: rowTop < currentTop ? 'start' : 'end' });
			outerEl!.scrollTop = nextTop;
			outerEl!.dispatchEvent(new Event('scroll'));
		});
	}

	function updateTableMeasureInputs(): void {
		tableLabelWidth = tableLabelContentWidth();
		const nextStyle = resolveNodeRowMeasureStyle(
			outerEl,
			TABLE_LABEL_SELECTOR,
			tableMeasureStyle,
		);
		if (nodeRowMeasureStyleKey(nextStyle) !== nodeRowMeasureStyleKey(tableMeasureStyle)) {
			tableMeasureStyle = nextStyle;
		}
	}

	function tableLabelContentWidth(): number {
		const label = outerEl?.querySelector<HTMLElement>(TABLE_LABEL_SELECTOR);
		const cell = label?.closest<HTMLElement>('.vm-node-table-cell');
		const width = cell?.clientWidth || outerEl?.clientWidth || TABLE_FALLBACK_WIDTH;
		return Math.max(1, width - 16);
	}

	function scheduleTableMetricsUpdate(): void {
		if (typeof requestAnimationFrame === 'undefined') {
			updateTableMeasureInputs();
			return;
		}
		if (tableMetricsFrame !== null) return;
		tableMetricsFrame = requestAnimationFrame(() => {
			tableMetricsFrame = null;
			updateTableMeasureInputs();
		});
	}

	function scheduleVirtualizerRemeasure(_surface: 'table'): void {
		if (typeof requestAnimationFrame === 'undefined') {
			PerfMeter.time('explorer.table.resizeRemeasure', () => $rowVirtualizer.measure?.());
			return;
		}
		if (tableRemeasureFrame !== null) return;
		tableRemeasureFrame = requestAnimationFrame(() => {
			tableRemeasureFrame = null;
			PerfMeter.time('explorer.table.resizeRemeasure', () => $rowVirtualizer.measure?.());
		});
	}

	function observeTableRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		const emit = () => {
			const rect = tableViewportRect();
			if (rect.width !== tableWidth) tableWidth = rect.width;
			cb(rect);
		};
		emit();
		if (!outerEl || typeof ResizeObserver === 'undefined') return () => {};
		const ro = new ResizeObserver(emit);
		ro.observe(outerEl);
		return () => ro.disconnect();
	}

	function tableViewportRect(): Rect {
		return boundedElementViewportRect(outerEl, TABLE_FALLBACK_WIDTH, TABLE_FALLBACK_HEIGHT);
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

	function nodeIdFromEventTarget(target: EventTarget | null): string | null {
		const el = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-id]') : null;
		if (!el || !outerEl?.contains(el)) return null;
		return el.dataset.id ?? null;
	}

	function handleDelegatedTableClick(e: MouseEvent): void {
		const id = nodeIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.table.delegate.click', () => handleRowClick(id, e));
	}

	function handleDelegatedTableAuxClick(e: MouseEvent): void {
		const id = nodeIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.table.delegate.auxclick', () => handleRowAuxClick(id, e));
	}

	function handleDelegatedTableContextMenu(e: MouseEvent): void {
		const id = nodeIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.table.delegate.contextmenu', () => onContextMenu(id, e));
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
			return;
		}
		const id = nodeIdFromEventTarget(e.target);
		if (id) PerfMeter.time('explorer.table.delegate.keydown', () => onRowKeydown?.(id, e));
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

	function tableEstimateSize(index: number): number {
		return tableEstimateSizeFromMap(measuredTableRows, index);
	}

	function tableEstimateSizeFromMap(
		measuredRows: ReadonlyMap<string, number>,
		index: number,
	): number {
		const row = tableRows[index];
		return row ? measuredRows.get(row.id) ?? TABLE_ROW_HEIGHT : TABLE_ROW_HEIGHT;
	}

	function tableRowTop(rowIndex: number): number {
		return tableRowTopFromMap(measuredTableRows, rowIndex);
	}

	function tableRowTopFromMap(measuredRows: ReadonlyMap<string, number>, rowIndex: number): number {
		let top = 0;
		for (let index = 0; index < rowIndex; index += 1) {
			top += tableEstimateSizeFromMap(measuredRows, index);
		}
		return top;
	}

	function fallbackRenderedRows(
		rows: readonly ViewRow<TNode>[],
		measuredRows: ReadonlyMap<string, number>,
	): {
		key: string;
		index: number;
		start: number;
		size: number;
	}[] {
		const visibleCount = Math.min(
			rows.length,
			Math.ceil(TABLE_FALLBACK_HEIGHT / TABLE_ROW_HEIGHT) + TABLE_OVERSCAN * 2,
		);
		const labelColumn = columns.find((column) => column.id === 'label') ?? columns[0];
		const width = effectiveTableLabelWidth;
		const style = tableMeasureStyle;
		const revision = tableMeasureRevision;
		let start = 0;
		return rows.slice(0, visibleCount).map((row, index) => {
			const size =
				measuredRows.get(row.id) ??
				measureTableRowHeight(row, labelColumn, width, style, revision);
			const out = {
				key: row.id,
				index,
				start,
				size,
			};
			start += size;
			return out;
		});
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

	function measureTableRowHeight(
		row: ViewRow<TNode>,
		labelColumn: ViewColumn<TNode> | undefined,
		width: number,
		style: TextMeasureStyle,
		revision: string,
	): number {
		const text = labelColumn ? cellDisplay(row, labelColumn) : row.label;
		if (isTextMeasureService(measure)) {
			return measure.measureRowHeight(text, {
				width,
				style,
				padding: TABLE_ROW_PADDING_BLOCK,
				minHeight: TABLE_ROW_HEIGHT,
			});
		}
		return measure.measure({
			id: row.id,
			text,
			width,
			minHeight: TABLE_ROW_HEIGHT,
			paddingBlock: TABLE_ROW_PADDING_BLOCK,
			style,
			revision,
		});
	}

	function isTextMeasureService(service: TableMeasureService): service is TextMeasureService {
		return 'measureRowHeight' in service;
	}

	function createNodeRowMeasureService(): NodeRowMeasureService {
		if (typeof document === 'undefined') {
			return new NodeRowMeasureService(
				createTextMeasureService({ engine: fallbackTextMeasureEngine }),
			);
		}
		if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
			return new NodeRowMeasureService(
				createTextMeasureService({ engine: fallbackTextMeasureEngine }),
			);
		}
		return new NodeRowMeasureService(createTextMeasureService());
	}
</script>

<div
	class="vm-node-table"
	bind:this={outerEl}
	role="grid"
	aria-multiselectable="true"
	tabindex="0"
	onclick={handleDelegatedTableClick}
	onauxclick={handleDelegatedTableAuxClick}
	oncontextmenu={handleDelegatedTableContextMenu}
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
				{@const isSelected = selectedMap?.get(id) ?? selectedIds.has(id)}
				{@const isFocused = focusedId === id}
				{@const isActive = activeId === id}
				{@const directBadges = rowBadges(row)}
				<div
					class="vm-node-table-row {row.cls ?? ''}"
					class:nav-file={useNativeDom}
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:is-active-node={isActive}
					data-id={id}
					role="row"
					tabindex="0"
					aria-selected={isSelected}
					style:--vm-node-table-y={`${virtualRow.start}px`}
					style:--vm-node-table-row-h={`${virtualRow.size}px`}
				>
					{#each columns as column (column.id)}
						{@const dataCellId = cellDataId(row, column.id)}
						{@const display = cellDisplay(row, column)}
						<div
							class="vm-node-table-cell"
							class:is-label-cell={column.id === 'label'}
							class:metadata-property={useNativeDom}
							class:metadata-property-key={useNativeDom && column.id === 'label'}
							role="gridcell"
							data-vm-table-cell={dataCellId}
						>
							{#if column.id === 'label'}
								{#if row.icon}
									<span class="vm-node-table-icon" use:icon={row.icon}></span>
								{/if}
								<span
									class="vm-node-table-primary"
									class:nav-file-title={useNativeDom}
									data-vm-table-primary
								>
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
