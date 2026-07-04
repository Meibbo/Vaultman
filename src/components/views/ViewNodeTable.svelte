<script lang="ts" generics="TNode extends NodeBase = NodeBase">
	import { getContext } from 'svelte';
	import type { SortingState } from '@tanstack/table-core';
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
	import type { ExplorerRowInput } from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import { nodeRowsFromRowInputs } from '../../services/serviceViewTableAdapter';
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
	import {
		DEFAULT_NODE_ELEMENT_MASK,
		visibleNodeBadgesForMask,
	} from './nodeElementMask';
	import {
		NODE_ELEMENT_MASK_KEY,
		type NodeElementMaskContextValue,
		PRESET_KEY,
		type PresetContextValue,
	} from '../explorer/viewHostContext';
	import {
		explorerViewContract,
		type NativeClassVocabulary,
	} from '../../services/serviceExplorerViewContract';
	import { createRowAction, type RowProps, type RowState } from '../../services/serviceRowAction';
	import type { DndViewState } from '../../services/serviceDnd';
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import { PerfMeter } from '../../services/perfMeter';
	import { NodeRowMeasureService } from '../../services/serviceNodeRowMeasure';
	import {
		clampTableColumnWidth,
		isTableColumnResizable,
		materializeTableColumnWidths,
		resolveTableColumnLayout,
		tableColumnTemplate,
		type TableColumnWidthOverrides,
	} from '../../logic/logicTableLayout';
	import { createVariableProviderRegistry } from '../../services/serviceSharedVirtualLayout';
	import {
		SharedVariableVirtualLayout,
		getSharedGeometryRegistry,
	} from '../../services/serviceSharedVirtualLayout.svelte';
	import {
		DEFAULT_NODE_ROW_MEASURE_STYLE,
		nodeRowMeasureStyleKey,
		resolveNodeRowMeasureStyle,
	} from '../../services/serviceNodeRowStyle';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const TABLE_ROW_HEIGHT = 32;
	const TABLE_FALLBACK_WIDTH = 640;
	const TABLE_FALLBACK_HEIGHT = 360;
	const TABLE_ROW_PADDING_BLOCK = 10;
	const TABLE_LABEL_SELECTOR = '.vm-node-table-primary';
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };
	type TableMeasureService = NodeRowMeasureService | TextMeasureService;
	type RowInputIdentity = Pick<ExplorerRowInput, 'id' | 'callbackId'>;
	type RowInputCompatibleRow<TNode extends NodeBase> = ViewRow<TNode> & {
		callbackId?: string;
		rowInput?: RowInputIdentity;
	};

	interface Props<TNode extends NodeBase = NodeBase> {
		rows: RowInputCompatibleRow<TNode>[];
		columns: ViewColumn<TNode>[];
		projection?: ExplorerProjection;
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
		visibleFields?: readonly string[];
		columnWidth?: number;
		dndStateForId?: (id: string) => DndViewState | undefined;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		rows,
		columns,
		projection = undefined,
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
		onBadgeDoubleClick,
		scrollTarget = null,
		mouseGestureConfig,
		measure = createNodeRowMeasureService(),
		themeService = undefined,
		visibleFields = undefined,
		columnWidth = undefined,
		dndStateForId,
		icon,
	}: Props<TNode> = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let sorting: SortingState = $state([]);
	let gpuReadyMarked = false;
	let tableLabelWidth = $state(TABLE_FALLBACK_WIDTH);
	let tableMeasureStyle: TextMeasureStyle = $state(DEFAULT_NODE_ROW_MEASURE_STYLE);
	let tableMetricsFrame: number | null = null;
	let consumedScrollTargetSerial: number | null = null;
	let tableRowIndexCacheRows: readonly RowInputCompatibleRow<TNode>[] | null = null;
	let tableRowIndexCache = new Map<string, number>();
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);
	const presetCtx = getContext<PresetContextValue | undefined>(PRESET_KEY);
	const presetUseNativeDom = $derived(presetCtx?.value().useNativeDom);
	const useNativeDom = $derived(presetUseNativeDom ?? themeService?.useNativeDom ?? false);
	const nativeVocab = $derived<NativeClassVocabulary | null>(
		useNativeDom ? explorerViewContract('table').nativeDomEmission.panel : null,
	);
	const tableFeatures = explorerViewContract('table').features;
	const rowAction = $derived(
		createRowAction({
			explorerId: projection?.providerId ?? 'table',
			role: 'row',
			features: tableFeatures,
			contract: {
				onToggle: noopRowToggle,
				onContextMenu,
				onRowKeydown,
			},
		}),
	);
	const maskCtx = getContext<NodeElementMaskContextValue | undefined>(NODE_ELEMENT_MASK_KEY);
	const nodeElementMask = $derived(maskCtx?.value() ?? DEFAULT_NODE_ELEMENT_MASK);
	const showRowIcon = $derived(
		nodeElementMask.icon && (!visibleFields || visibleFields.includes('icon')),
	);

	$effect(() => () => {
		mouse.cancelAll();
	});

	const projectionRows = $derived(
		projection ? nodeRowsFromRowInputs(rowInputsFromProjection(projection)) : undefined,
	);
	const sourceTableRows = $derived((projectionRows ?? rows) as RowInputCompatibleRow<TNode>[]);
	const tableRows = $derived(sortRows(sourceTableRows, columns, sorting));
	const effectiveTableLabelWidth = $derived(columnWidth ?? tableLabelWidth);
	const tableMeasureRevision = $derived(
		`${nodeRowMeasureStyleKey(tableMeasureStyle)}:${columns.length}:${tableRows.length}:${effectiveTableLabelWidth}`,
	);
	const labelColumn = $derived(columns.find((column) => column.id === 'label') ?? columns[0]);

	// SDF-011 Bases-parity column resizing (phase 2): clamped IN-MEMORY width overrides (never
	// persisted, reset on remount — stable 1.1.6's columnWidths semantics) projected through ONE
	// shared grid-template + total-width pair of CSS vars instead of stable's per-cell
	// insetInlineStart/width inline styles — same resulting offsets, one projection point.
	// With no overrides the template is byte-identical to the pre-resizer fluid template.
	let columnWidthOverrides: TableColumnWidthOverrides = $state({});
	const columnTemplate = $derived(tableColumnTemplate(columns, columnWidthOverrides));
	const columnLayoutProjection = $derived(resolveTableColumnLayout(columns, columnWidthOverrides));

	// Shared render-runtime (V.D, slice 2b): table adopts the SAME variable-height + lanes
	// strategy grid/cards already use band-for-band (`laneCount=1` degenerates the shared lane
	// math to the identity single-lane case — band === index, lane === 0 always; table has no
	// `rows[].lane` field and none is needed here). `providerId` keys the warm per-provider
	// Fenwick registry (context'd once near the explorer root by ViewHost); this component
	// falls back to a local, unshared registry when mounted WITHOUT that ancestor (most component
	// tests mount ViewNodeTable directly) so it still behaves correctly standalone, just without
	// cross-view warmth. `estimateSize` stays a flat TABLE_ROW_HEIGHT constant — cheap for the
	// Fenwick's eager O(n) initial build (matches the pre-adoption local Fenwick's own baseline);
	// REAL per-row heights come from `attachTableRowMeasure` below (pretext, not this estimate).
	// svelte-ignore state_referenced_locally -- the layout controller (and the provider key it
	// warms) is intentionally fixed per mounted view instance: a provider swap is a different
	// panel, not a reshape of this one (same lifecycle stance as ViewHost's inherited service).
	// Reactive inputs (rowCount / keys) flow through the option getters below.
	const providerId = projection?.providerId ?? 'table';
	const localGeometryRegistry = getSharedGeometryRegistry() ?? createVariableProviderRegistry();
	const layout = new SharedVariableVirtualLayout({
		providerId,
		registry: localGeometryRegistry,
		rowCount: () => tableRows.length,
		estimateSize: () => TABLE_ROW_HEIGHT,
		laneCount: 1,
		getKey: (index) => tableVirtualRowKey(tableRows, index),
		fallbackViewportHeight: TABLE_FALLBACK_HEIGHT,
	});

	$effect(() => {
		if (!outerEl) return;
		updateTableMeasureInputs();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => scheduleTableMetricsUpdate());
		ro.observe(outerEl);
		return () => {
			if (tableMetricsFrame !== null) cancelAnimationFrame(tableMetricsFrame);
			tableMetricsFrame = null;
			ro.disconnect();
		};
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		if (target.serial === consumedScrollTargetSerial) return;
		const rowIndex = tableRowIndexForId(target.id);
		if (rowIndex < 0) return;
		consumedScrollTargetSerial = target.serial;
		scrollTableRowIntoView(rowIndex);
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
			// Read the viewport live (clientHeight), not the layout's tracked $state, so reveal
			// works even when no scroll/resize event has refreshed it since the element was last
			// sized — matches the shared runtime's own fixed-path scrollToIndex precedent.
			const viewportHeight = outerEl!.clientHeight || TABLE_FALLBACK_HEIGHT;
			const currentTop = outerEl!.scrollTop;
			const rowTop = layout.topForIndex(rowIndex);
			const rowBottom = rowTop + layout.sizeForIndex(rowIndex);
			const currentBottom = currentTop + viewportHeight;
			if (rowTop >= currentTop && rowBottom <= currentBottom) return;

			const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
			outerEl!.scrollTop = nextTop;
			layout.scrollTop = nextTop;
			layout.viewportHeight = viewportHeight;
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

	function handleRowClick(id: string, e: MouseEvent) {
		const callbackId = callbackIdForRowId(id);
		mouse.handleClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onRowClick(callbackId, event),
				secondary: (event) => onSecondaryAction?.(callbackId, event),
				tertiary: (event) => onTertiaryAction?.(callbackId, event),
			},
			nodeMouseConfig,
		);
	}

	function handleRowAuxClick(id: string, e: MouseEvent) {
		const callbackId = callbackIdForRowId(id);
		mouse.handleAuxClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(callbackId, event) },
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
		PerfMeter.time('explorer.table.delegate.contextmenu', () =>
			onContextMenu(callbackIdForRowId(id), e),
		);
	}

	function handleDelegatedTableKeydown(e: KeyboardEvent): void {
		const id = nodeIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.table.delegate.keydown', () =>
			onRowKeydown?.(callbackIdForRowId(id), e),
		);
	}

	function rowBadges(row: RowInputCompatibleRow<TNode>): NodeBadge[] {
		return ownNodeBadges(row.node as TNode & { badges?: readonly NodeBadge[] });
	}

	function visibleTableBadges(row: RowInputCompatibleRow<TNode>): NodeBadge[] {
		return visibleNodeBadgesForMask(rowBadges(row), nodeElementMask);
	}

	function tableCellContentVisible(columnId: string): boolean {
		if (columnId === 'label') return nodeElementMask.label;
		if (columnId === 'count' || columnId === 'files') return nodeElementMask.badges.counts;
		return nodeElementMask.detail;
	}

	function handleBadgeKeydown(e: KeyboardEvent, badge: NodeBadge) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleNodeBadgePress(e, badge, onBadgeDoubleClick);
		}
	}

	function callbackIdForRowId(id: string): string {
		const row = tableRows.find((item) => item.id === id);
		return row ? tableCallbackId(row) : id;
	}

	function tableCallbackId(row: RowInputCompatibleRow<TNode>): string {
		if (row.rowInput) return row.rowInput.callbackId;
		return row.callbackId ?? row.id;
	}

	function tableRowProps(id: string, state: RowState): RowProps {
		const props = rowAction.getRowProps(id, state);
		return { ...props, oncontextmenu: undefined, onkeydown: undefined };
	}

	function noopRowToggle(): void {}

	function rowStateClassString(
		state: {
			isSelected: boolean;
			isFocused: boolean;
			isActive: boolean;
		},
		dndState?: DndViewState,
	): string {
		return stateModEmissions(nativeVocab, {
			isSelected: state.isSelected,
			isFocused: state.isFocused,
			isActive: state.isActive,
			isDragSource: dndState?.dragging === true,
			isDropTarget: dndState?.dropTarget === true,
			hasActiveMenu: false,
		}).join(' ');
	}

	function tableRowIndexForId(id: string): number {
		if (tableRowIndexCacheRows !== tableRows) {
			tableRowIndexCacheRows = tableRows;
			tableRowIndexCache = new Map<string, number>();
			tableRows.forEach((row, index) => {
				tableRowIndexCache.set(row.id, index);
				tableRowIndexCache.set(tableCallbackId(row), index);
			});
		}
		return tableRowIndexCache.get(id) ?? -1;
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

	function sortRows(
		sourceRows: readonly RowInputCompatibleRow<TNode>[],
		sourceColumns: readonly ViewColumn<TNode>[],
		state: SortingState,
	): RowInputCompatibleRow<TNode>[] {
		const current = state[0];
		if (!current) return sourceRows as RowInputCompatibleRow<TNode>[];
		const column = sourceColumns.find((item) => item.id === current.id);
		if (!column || column.sortable !== true) return sourceRows as RowInputCompatibleRow<TNode>[];
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
		row: RowInputCompatibleRow<TNode>,
		column: ViewColumn<TNode> | undefined,
		width: number,
		style: TextMeasureStyle,
		revision: string,
	): number {
		const text = column ? cellDisplay(row, column) : row.label;
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

	// `{@attach}` per rendered row — replaces the old per-visible-row ResizeObserver/$effect
	// measurement path (D-2b-2). Wraps the shell's `measureRow` (shared idle-during-scroll
	// debounce, shared ResizeObserver lifecycle) with a PRETEXT size source instead of the
	// default `node.offsetHeight`: table's row height is a synchronous TEXT-WRAP PREDICTION
	// (`measureTableRowHeight`/pretext), not a real-DOM measurement — offsetHeight is always 0
	// under jsdom (no layout engine) and only reflects layout AFTER paint even in a real browser,
	// which pretext beats to avoid a flash-of-wrong-height on first render. `column`/`width`/
	// `style`/`revision` are read as direct arguments (not hidden inside a nested closure) so
	// Svelte's `{@attach}` reactivity re-fires this attachment — tearing down the old one, running
	// the new one fresh — whenever any of them change (e.g. a Phase-2 column resize), the same
	// dependency set the old $effect tracked.
	function attachTableRowMeasure(
		bandIndex: number,
		row: RowInputCompatibleRow<TNode>,
		column: ViewColumn<TNode> | undefined,
		width: number,
		style: TextMeasureStyle,
		revision: string,
	) {
		return layout.measureRow(bandIndex, () =>
			measureTableRowHeight(row, column, width, style, revision),
		);
	}

	function measuredHeaderColWidth(columnId: string): number {
		// Iterate + dataset-match instead of interpolating the id into a selector: column ids are
		// caller-defined strings and `CSS.escape` is not available in every runtime (jsdom).
		const cols = outerEl?.querySelectorAll<HTMLElement>('[data-vm-table-header-col]');
		if (!cols) return 0;
		for (const el of cols) {
			if (el.dataset.vmTableHeaderCol === columnId) return el.getBoundingClientRect().width;
		}
		return 0;
	}

	// `{@attach}` for one header's resize handle — the stable 1.1.6 `attachColumnResizer`
	// (viewGrid.ts / viewNodeTable.ts) drag mechanics, verbatim where possible: pointerdown
	// (preventDefault + stopPropagation, so a drag never becomes a sort click) captures startX +
	// startWidth, tags the body with the resizing cursor class, then window-level pointermove
	// applies `clamp(startWidth + dx)` to the dragged column only and pointerup (once) tears
	// down. Adapted: body class = the sandbox's existing global `vm-resizing` (stable:
	// `vaultman-table-resizing`); stable resolved every column to constant px up front, the
	// sandbox's fluid columns materialize to their current rendered widths on first pointerdown
	// (see logicTableLayout) so all OTHER columns keep their width during the drag — stable's
	// observable invariant; re-projection is the reactive template var, not manual re-renders.
	function attachColumnResizer(column: ViewColumn<TNode>) {
		return (node: HTMLElement) => {
			const onPointerDown = (event: PointerEvent) => {
				event.preventDefault();
				event.stopPropagation();
				const materialized = materializeTableColumnWidths(
					columns,
					measuredHeaderColWidth,
					columnWidthOverrides,
				);
				columnWidthOverrides = materialized;
				const startX = event.clientX;
				const startWidth = materialized[column.id] ?? clampTableColumnWidth(column, 0);
				const ownerWindow = node.ownerDocument.defaultView ?? window;
				const ownerBody = node.ownerDocument.body;
				ownerBody.classList.add('vm-resizing');

				const onMove = (moveEvent: PointerEvent) => {
					const nextWidth = clampTableColumnWidth(
						column,
						startWidth + moveEvent.clientX - startX,
					);
					if (columnWidthOverrides[column.id] === nextWidth) return;
					columnWidthOverrides = { ...columnWidthOverrides, [column.id]: nextWidth };
				};
				const onUp = () => {
					ownerWindow.removeEventListener('pointermove', onMove);
					ownerBody.classList.remove('vm-resizing');
				};
				ownerWindow.addEventListener('pointermove', onMove);
				ownerWindow.addEventListener('pointerup', onUp, { once: true });
			};
			node.addEventListener('pointerdown', onPointerDown);
			return () => node.removeEventListener('pointerdown', onPointerDown);
		};
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
	{@attach layout.attach}
	role="grid"
	aria-multiselectable="true"
	tabindex="0"
	onclick={handleDelegatedTableClick}
	onauxclick={handleDelegatedTableAuxClick}
	oncontextmenu={handleDelegatedTableContextMenu}
	onkeydown={handleDelegatedTableKeydown}
	style:--vm-node-table-columns={columnTemplate}
	style:--vm-node-table-w={columnLayoutProjection
		? `${columnLayoutProjection.totalWidth}px`
		: undefined}
>
	<div class="vm-node-table-header" role="row">
		{#each columns as column (column.id)}
			{@const sortState = headerSortState(column.id)}
			<div class="vm-node-table-header-col" data-vm-table-header-col={column.id}>
				<button
					type="button"
					class="vm-node-table-header-cell {nativeVocab?.headerCell ?? ''}"
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
				{#if isTableColumnResizable(column)}
					<div
						class="vm-node-table-header-resizer {nativeVocab?.headerResizer ?? ''}"
						data-vm-table-resizer={column.id}
						aria-hidden="true"
						{@attach attachColumnResizer(column)}
					></div>
				{/if}
			</div>
		{/each}
	</div>
	<div
		class="vm-node-table-inner"
		style:--vm-node-table-total-h={`${layout.totalHeight}px`}
	>
		{#each layout.rows as virtualRow (virtualRow.key)}
				{@const row = tableRows[virtualRow.index]}
			{#if row}
				{@const id = row.id}
				{@const callbackId = tableCallbackId(row)}
				{@const isSelected = selectedMap?.get(id) ?? selectedIds.has(id)}
				{@const isFocused = focusedId === id}
				{@const isActive = activeId === id}
				{@const directBadges = visibleTableBadges(row)}
				{@const dndState = dndStateForId?.(id)}
				<div
					class="vm-node-table-row {row.cls ?? ''} {nativeVocab?.rowRoot ?? ''} {rowStateClassString(
						{ isSelected, isFocused, isActive },
						dndState,
					)}"
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:is-active-node={isActive}
					data-id={id}
					data-callback-id={callbackId}
					{@attach attachTableRowMeasure(
						virtualRow.index,
						row,
						labelColumn,
						effectiveTableLabelWidth,
						tableMeasureStyle,
						tableMeasureRevision,
					)}
					style:--vm-node-table-y={`${virtualRow.start}px`}
					style:--vm-node-table-row-h={`${virtualRow.size}px`}
					{...tableRowProps(callbackId, {
						selected: isSelected,
						focused: isFocused,
						expandable: false,
						expanded: false,
					})}
				>
					{#each columns as column (column.id)}
						{@const dataCellId = cellDataId(row, column.id)}
						{@const display = cellDisplay(row, column)}
						<div
							class="vm-node-table-cell {nativeVocab?.cellWrapper ?? ''}"
							class:is-label-cell={column.id === 'label'}
							role="gridcell"
							data-vm-table-cell={dataCellId}
						>
							{#if column.id === 'label'}
								{#if showRowIcon && row.icon}
									<span class="vm-node-table-icon" use:icon={row.icon}></span>
								{/if}
								{#if tableCellContentVisible(column.id)}
									<span
										class="vm-node-table-primary {nativeVocab?.primaryLabel ?? ''}"
										data-vm-table-primary
									>
										{display}
									</span>
								{/if}
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
							{:else if tableCellContentVisible(column.id)}
								{display}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
</div>
