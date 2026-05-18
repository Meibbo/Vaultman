<script lang="ts">
	import { getContext, untrack } from 'svelte';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import type { Rect, Virtualizer } from '@tanstack/svelte-virtual';
	import type { TreeNode } from '../../types/typeNode';
	import {
		visibleHoverBadgeDescriptors,
		type ActiveOpsByNode,
		type BadgeDescriptor,
		type BadgeKind,
	} from '../../badges/serviceBadge';
	import {
		NODE_MOUSE_GESTURE_CONFIG,
		NODE_MOUSE_IGNORE_SELECTOR,
		createMouseGestureService,
		isIgnoredMouseTarget,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';
	import {
		DEFAULT_VIEW_SIZE_PRESET,
		getViewSizePreset,
		viewSizeCssVars,
		type ViewSizePreset,
		type ViewSizePresetId,
	} from '../../services/serviceViewSize';
	import {
		defaultVisibleFields,
		isNodeCountVisible,
		isNodeIconVisible,
		isNodeTextVisible,
		visibleNodeFieldValues,
	} from '../../services/serviceNodeFieldVisibility';
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
	} from '../explorer/viewHostContext';
	import {
		createManualDndService,
		manualWorkspacePayloadForNode,
		writeManualDndTransfer,
	} from '../../services/serviceManualDnd';
	import {
		rowInputFromTreeNode,
		rowInputGroupKey,
		rowInputToTreeNode,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import type { DndDropPosition, DndDropResult } from '../../services/serviceDnd';
	import { PerfMeter } from '../../services/perfMeter';
	import { NodeRowMeasureService } from '../../services/serviceNodeRowMeasure';
	import { createExplorerVariableGeometry } from '../../services/serviceExplorerScrollGeometry';
	import {
		DEFAULT_NODE_ROW_MEASURE_STYLE,
		nodeRowMeasureStyleKey,
		resolveNodeRowMeasureStyle,
	} from '../../services/serviceNodeRowStyle';
	import {
		createTextMeasureService,
		fallbackTextMeasureEngine,
		type TextMeasureStyle,
	} from '../../services/serviceTextMeasure';
	import { boundedElementViewportRect } from '../../services/serviceScroll';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const GRID_FALLBACK_WIDTH = 480;
	const GRID_FALLBACK_HEIGHT = 360;
	const GRID_OVERSCAN = 6;
	const GRID_BADGE_ALLOWANCE = 28;
	const GRID_SCROLL_MEASURE_IDLE_MS = 96;
	const GRID_LABEL_SELECTOR = '.vm-node-grid-label';
	const EMPTY_EXPANDED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };

	type HierarchyMode = 'folder' | 'inline';

	interface GridRow {
		key: string;
		nodes: TreeNode[];
		rowInputs: ExplorerRowInput[];
		height: number;
	}

	interface GridInputModel {
		nodes: TreeNode[];
		rowInputs: ExplorerRowInput[];
	}

	interface Props {
		nodes: TreeNode[];
		rowInputs?: readonly ExplorerRowInput[];
		projection?: ExplorerProjection;
		selectedIds?: ReadonlySet<string>;
		selectedMap?: ReadonlyMap<string, boolean>;
		focusedId?: string | null;
		activeId?: string | null;
		hierarchyMode?: HierarchyMode;
		expandedIds?: ReadonlySet<string>;
		onTileClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onBoxSelect?: (ids: string[], e: PointerEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onTileKeydown?: (id: string, e: KeyboardEvent) => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
		activeOpsByNode?: ActiveOpsByNode;
		onToggleExpand?: (id: string, e: MouseEvent | KeyboardEvent) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		sizePresetId?: ViewSizePresetId;
		providerId?: string;
		visibleFields?: readonly string[];
		manualDndEnabled?: boolean;
		onManualDrop?: (result: DndDropResult) => void;
		measure?: NodeRowMeasureService;
		themeService?: ThemeService;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		rowInputs,
		projection = undefined,
		selectedIds,
		selectedMap,
		focusedId,
		activeId,
		hierarchyMode = 'folder',
		expandedIds = EMPTY_EXPANDED_IDS,
		onTileClick,
		onPrimaryAction: _onPrimaryAction,
		onSecondaryAction,
		onTertiaryAction,
		onBoxSelect,
		onContextMenu,
		onTileKeydown,
		onBadgeDoubleClick,
		onHoverBadgeAction,
		activeOpsByNode,
		onToggleExpand,
		scrollTarget = null,
		mouseGestureConfig,
		sizePresetId = DEFAULT_VIEW_SIZE_PRESET,
		providerId = 'nodes',
		visibleFields = [],
		manualDndEnabled = false,
		onManualDrop,
		measure = createNodeRowMeasureService(),
		themeService = undefined,
		icon,
	}: Props = $props();

	const useNativeDom = $derived(themeService?.useNativeDom ?? false);
	const maskCtx = getContext<NodeElementMaskContextValue | undefined>(NODE_ELEMENT_MASK_KEY);
	const nodeElementMask = $derived(maskCtx?.value() ?? DEFAULT_NODE_ELEMENT_MASK);
	const effectiveVisibleFields = $derived(
		visibleFields.length > 0 ? visibleFields : defaultVisibleFields(providerId, 'grid'),
	);
	const showNodeIcon = $derived(nodeElementMask.icon && isNodeIconVisible(effectiveVisibleFields));
	const showNodeText = $derived(
		nodeElementMask.label && isNodeTextVisible(providerId, 'grid', effectiveVisibleFields),
	);
	const showNodeCount = $derived(
		nodeElementMask.badges.counts && isNodeCountVisible(effectiveVisibleFields),
	);

	function hoverBadgesFor(node: TreeNode): BadgeDescriptor[] {
		if (!activeOpsByNode || !nodeElementMask.actions) return [];
		return visibleHoverBadgeDescriptors({ id: node.id }, activeOpsByNode);
	}

	function handleHoverBadgePress(e: MouseEvent | KeyboardEvent, id: string, kind: BadgeKind) {
		e.stopPropagation();
		e.preventDefault();
		onHoverBadgeAction?.(id, kind, e);
	}

	function handleHoverBadgeKeydown(e: KeyboardEvent, id: string, kind: BadgeKind) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleHoverBadgePress(e, id, kind);
		}
	}

	function handleBadgeKeydown(
		e: KeyboardEvent,
		badge: Parameters<typeof handleNodeBadgePress>[1],
	) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleNodeBadgePress(e, badge, onBadgeDoubleClick);
		}
	}

	let outerEl: HTMLDivElement | undefined = $state();
	let gridWidth = $state(GRID_FALLBACK_WIDTH);
	let columnCount = $state(1);
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;
	let gridMetricsFrame: number | null = null;
	let gridRemeasureFrame: number | null = null;
	let gpuReadyMarked = false;
	let consumedScrollTargetSerial: number | null = null;
	let fallbackScrollTop = $state(0);
	let fallbackViewportHeight = $state(GRID_FALLBACK_HEIGHT);
	let gridMeasureScrollActive = $state(false);
	let gridMeasureIdleTimer: ReturnType<typeof setTimeout> | null = null;
	let gridMeasureStyle: TextMeasureStyle = $state(DEFAULT_NODE_ROW_MEASURE_STYLE);
	let gridMeasuredRowHeights = $state(new Map<string, number>());
	let gridMeasuredRevision = $state('');
	let gridRowIndexCacheRows: readonly GridRow[] | null = null;
	let gridRowIndexCache = new Map<string, number>();
	const mouse = createMouseGestureService();
	const manualDnd = createManualDndService();
	let manualDndVersion = $state(0);
	const viewSize = $derived(getViewSizePreset(sizePresetId));
	const viewSizeStyle = $derived(viewSizeCssVars(viewSize));
	const gridRowBaseHeight = $derived(viewSize.tileHeight + viewSize.gap);
	const gridTileOuterWidth = $derived(tileOuterWidthFor(gridWidth, columnCount, viewSize));
	const gridLabelWidth = $derived(
		Math.max(
			1,
			gridTileOuterWidth -
				viewSize.iconSize -
				viewSize.gap * 3 -
				GRID_BADGE_ALLOWANCE -
				(hierarchyMode === 'inline' ? viewSize.treeToggleSize + viewSize.gap : 0),
		),
	);
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(
		() => () => {
			mouse.cancelAll();
			clearGridMeasureIdleTimer();
		},
	);
	$effect(() => manualDnd.subscribe(() => (manualDndVersion += 1)));
	$effect(() => {
		manualDnd.setEnabled(manualDndEnabled);
	});

	const effectiveRowInputs = $derived(projection ? rowInputsFromProjection(projection) : rowInputs);
	const gridInputModel = $derived(gridInputModelFromInputs(nodes, effectiveRowInputs));
	const gridRows = $derived(
		buildGridRows(
			gridInputModel.nodes,
			gridInputModel.rowInputs,
			columnCount,
			hierarchyMode,
			expandedIds,
		),
	);
	const gridMeasureRevision = $derived(
		`${nodeRowMeasureStyleKey(gridMeasureStyle)}:${gridRows.length}:${gridLabelWidth}`,
	);
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => gridVirtualRowKey(gridRows, index),
		estimateSize: (index) => gridEstimateSize(index),
		observeElementRect: observeGridRect,
		overscan: GRID_OVERSCAN,
		initialRect: { width: GRID_FALLBACK_WIDTH, height: GRID_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const gridGeometry = $derived.by(() => {
		const rowsForGeometry = gridRows;
		const fallbackSize = gridRowBaseHeight;
		const gap = viewSize.gap;
		return createExplorerVariableGeometry({
			rowCount: rowsForGeometry.length,
			estimateSize: (index) => {
				const row = rowsForGeometry[index];
				return row ? row.height + gap : fallbackSize;
			},
		});
	});
	const renderedRows = $derived.by(() => {
		const rows = virtualRows
			.filter((row) => row.index < gridRows.length)
			.map((row) => ({
				...row,
				renderKey: gridRenderRowKey(gridRows, row.index),
			}));
		if (rows.length > 0 || gridRows.length === 0) return rows;
		return fallbackGridRows(gridRows);
	});
	const totalHeight = $derived($rowVirtualizer.getTotalSize());
	const resolvedTotalHeight = $derived.by(() =>
		totalHeight > 0 || gridRows.length === 0 ? totalHeight : gridGeometry.totalSize(),
	);

	$effect(() => {
		const rows = gridRows;
		const count = rows.length;
		const scrollElement = outerEl;
		const width = gridWidth;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => gridVirtualRowKey(rows, index),
				estimateSize: (index) => gridEstimateSize(index),
				observeElementRect: observeGridRect,
				overscan: GRID_OVERSCAN,
				initialRect: { width, height: GRID_FALLBACK_HEIGHT },
			}),
		);
		scheduleVirtualizerRemeasure('grid');
	});

	$effect(() => {
		const rows = gridRows;
		const visibleRows = virtualRows.filter((row) => row.index < rows.length);
		const revision = gridMeasureRevision;
		const width = gridLabelWidth;
		const style = gridMeasureStyle;
		const preset = viewSize;
		const mode = hierarchyMode;
		const columns = columnCount;
		const expanded = expandedIds;
		const scrollActive = gridMeasureScrollActive;
		if (scrollActive) return;

		untrack(() => {
			const next =
				gridMeasuredRevision === revision
					? new Map(gridMeasuredRowHeights)
					: new Map<string, number>();
			let changed = gridMeasuredRevision !== revision;
			PerfMeter.time(
				'explorer.grid.measureRows',
				() => {
					for (const virtualRow of visibleRows) {
						const row = rows[virtualRow.index];
						if (!row) continue;
						const baseHeight = row.nodes.reduce(
							(height, node) =>
								Math.max(
									height,
									measure.measure({
										id: node.id,
										text: node.label,
										width,
										minHeight: preset.tileHeight,
										paddingBlock: preset.gap * 2,
										style,
										revision,
									}),
								),
							preset.tileHeight,
						);
						const inlineExtra =
							mode === 'inline'
								? row.nodes.reduce(
										(height, node) => height + expandedPanelHeight(node, columns, expanded),
										0,
									)
								: 0;
						const height = baseHeight + inlineExtra;
						if (next.get(row.key) !== height) {
							next.set(row.key, height);
							gridGeometry.measure(virtualRow.index, height + viewSize.gap);
							resizeVirtualGridRow(virtualRow.index, height + viewSize.gap);
							changed = true;
						}
					}
				},
				'service',
				{ rows: visibleRows.length },
			);
			if (!changed) return;
			gridMeasuredRevision = revision;
			gridMeasuredRowHeights = next;
		});
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		if (target.serial === consumedScrollTargetSerial) return;
		const rowIndex = gridRowIndexForId(target.id);
		if (rowIndex < 0) return;
		consumedScrollTargetSerial = target.serial;
		scrollGridRowIntoView(rowIndex);
	});

	$effect(() => {
		if (!outerEl) return;
		updateGridMetrics();
		updateGridMeasureStyle();
		updateGridFallbackViewport();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			scheduleGridMetricsUpdate();
			updateGridMeasureStyle();
			updateGridFallbackViewport();
			scheduleVirtualizerRemeasure('grid');
		});
		ro.observe(outerEl);
		return () => {
			if (gridMetricsFrame !== null) cancelAnimationFrame(gridMetricsFrame);
			if (gridRemeasureFrame !== null) cancelAnimationFrame(gridRemeasureFrame);
			gridMetricsFrame = null;
			gridRemeasureFrame = null;
			ro.disconnect();
		};
	});

	$effect(() => {
		if (!outerEl || gpuReadyMarked) return;
		gpuReadyMarked = true;
		PerfMeter.mark('perf.phase04.gpu-positioning.ready', 'mark', { surface: 'grid' });
	});

	function handleTileClick(id: string, e: MouseEvent) {
		if (suppressNextClick) {
			suppressNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		mouse.handleClick(
			{ key: `grid:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onTileClick(id, event),
				secondary: (event) => onSecondaryAction?.(id, event),
				tertiary: (event) => onTertiaryAction?.(id, event),
			},
			nodeMouseConfig,
		);
	}

	function handleTileAuxClick(id: string, e: MouseEvent) {
		mouse.handleAuxClick(
			{ key: `grid:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(id, event) },
			nodeMouseConfig,
		);
	}

	function tileIdFromEventTarget(target: EventTarget | null): string | null {
		const el =
			target instanceof HTMLElement
				? target.closest<HTMLElement>('.vm-node-grid-tile[data-id]')
				: null;
		if (!el || !outerEl?.contains(el)) return null;
		return el.dataset.id ?? null;
	}

	function handleDelegatedGridClick(e: MouseEvent): void {
		const id = tileIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.grid.delegate.click', () => handleTileClick(id, e));
	}

	function handleDelegatedGridAuxClick(e: MouseEvent): void {
		const id = tileIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.grid.delegate.auxclick', () => handleTileAuxClick(id, e));
	}

	function handleDelegatedGridContextMenu(e: MouseEvent): void {
		const id = tileIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.grid.delegate.contextmenu', () => onContextMenu(id, e));
	}

	function handleDelegatedGridKeydown(e: KeyboardEvent): void {
		const id = tileIdFromEventTarget(e.target);
		if (!id) return;
		PerfMeter.time('explorer.grid.delegate.keydown', () => handleTileKeydown(id, e));
	}

	function scrollGridRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		PerfMeter.time('explorer.grid.scrollIntoView', () => {
			const row = gridRows[rowIndex];
			const rowHeight = row ? gridGeometry.sizeForIndex(rowIndex) : gridRowBaseHeight;
			const viewportHeight = gridViewportRect().height;
			const rowTop = gridRowTop(rowIndex);
			const rowBottom = rowTop + rowHeight;
			const currentTop = outerEl!.scrollTop;
			const currentBottom = currentTop + viewportHeight;
			if (rowTop >= currentTop && rowBottom <= currentBottom) return;

			const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
			untrack(() =>
				$rowVirtualizer.scrollToIndex(rowIndex, {
					align: rowTop < currentTop ? 'start' : 'end',
					behavior: 'auto',
				}),
			);
			outerEl!.scrollTop = nextTop;
			updateGridFallbackViewport();
			outerEl!.dispatchEvent(new Event('scroll'));
		});
	}

	function handleGridScroll(e: Event): void {
		const element = e.currentTarget as HTMLDivElement;
		fallbackScrollTop = element.scrollTop;
		fallbackViewportHeight = element.clientHeight || GRID_FALLBACK_HEIGHT;
		markGridMeasureScrollActive();
	}

	function handleTileKeydown(id: string, e: KeyboardEvent) {
		onTileKeydown?.(id, e);
	}

	function handleToggleExpand(id: string, e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();
		onToggleExpand?.(id, e);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !outerEl || manualDndEnabled || shouldIgnoreBoxStart(e.target)) return;
		dragStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
		selectionBox = null;
		capturePointer(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragStart || !outerEl || e.pointerId !== dragStart.pointerId) return;
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (!selectionBox && Math.hypot(dx, dy) < 4) return;
		e.preventDefault();
		selectionBox = makeSelectionBox(dragStart.x, dragStart.y, e.clientX, e.clientY);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragStart || e.pointerId !== dragStart.pointerId) return;
		const box = selectionBox;
		releasePointer(e.pointerId);
		dragStart = null;
		selectionBox = null;
		if (!box) return;
		const ids = intersectingTileIds(box);
		suppressNextClick = true;
		if (ids.length > 0) onBoxSelect?.(ids, e);
	}

	function handlePointerCancel() {
		if (dragStart) releasePointer(dragStart.pointerId);
		dragStart = null;
		selectionBox = null;
	}

	function handleManualDragStart(node: TreeNode, e: DragEvent): void {
		if (!manualDndEnabled || !e.dataTransfer) return;
		const source = manualDnd.sourceForNode(providerId, node, selectedIds ?? []);
		const payload = manualWorkspacePayloadForNode(providerId, node);
		manualDnd.beginDrag(source);
		writeManualDndTransfer(e.dataTransfer, payload);
	}

	function handleManualDragOver(node: TreeNode, e: DragEvent): void {
		if (!manualDndEnabled || manualDnd.snapshot().drag.phase !== 'dragging') return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		manualDnd.updateTarget(manualDnd.targetForNode(providerId, node), dropPositionFromTileEvent(e));
	}

	function handleManualDrop(node: TreeNode, e: DragEvent): void {
		if (!manualDndEnabled) return;
		e.preventDefault();
		handleManualDragOver(node, e);
		const result = manualDnd.endDrag();
		if (result) onManualDrop?.(result);
		suppressNextClick = true;
	}

	function handleManualDragEnd(): void {
		if (manualDnd.snapshot().drag.phase === 'dragging') manualDnd.cancel();
	}

	function manualDndStateFor(id: string): { dragging?: true; dropTarget?: true } {
		void manualDndVersion;
		return manualDnd.stateFor(id);
	}

	function dropPositionFromTileEvent(e: DragEvent): DndDropPosition {
		const target = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
		if (!target) return 'after';
		const rect = target.getBoundingClientRect();
		const midpoint = rect.left + rect.width / 2;
		return e.clientX < midpoint ? 'before' : 'after';
	}

	function releasePointer(pointerId: number) {
		if (!outerEl?.hasPointerCapture(pointerId)) return;
		outerEl.releasePointerCapture(pointerId);
	}

	function capturePointer(pointerId: number) {
		if (!outerEl) return;
		try {
			outerEl.setPointerCapture(pointerId);
		} catch {
			// Synthetic CLI/test pointer events do not always create a capturable pointer.
		}
	}

	function shouldIgnoreBoxStart(target: EventTarget | null): boolean {
		return isIgnoredMouseTarget(target, NODE_MOUSE_IGNORE_SELECTOR);
	}

	function makeSelectionBox(startX: number, startY: number, endX: number, endY: number) {
		const outerRect = outerEl!.getBoundingClientRect();
		const startLeft = startX - outerRect.left + outerEl!.scrollLeft;
		const startTop = startY - outerRect.top + outerEl!.scrollTop;
		const endLeft = endX - outerRect.left + outerEl!.scrollLeft;
		const endTop = endY - outerRect.top + outerEl!.scrollTop;
		return {
			left: Math.min(startLeft, endLeft),
			top: Math.min(startTop, endTop),
			width: Math.abs(endLeft - startLeft),
			height: Math.abs(endTop - startTop),
		};
	}

	function intersectingTileIds(box: NonNullable<typeof selectionBox>): string[] {
		const ids: string[] = [];
		if (!outerEl) return ids;
		const outerRect = outerEl.getBoundingClientRect();
		const boxRect = new DOMRect(
			outerRect.left + box.left - outerEl.scrollLeft,
			outerRect.top + box.top - outerEl.scrollTop,
			box.width,
			box.height,
		);
		const tiles = outerEl.querySelectorAll<HTMLElement>('.vm-node-grid-tile[data-id]');
		for (const tile of tiles) {
			const id = tile.dataset.id;
			if (!id) continue;
			const tileRect = tile.getBoundingClientRect();
			if (tileRect.width <= 0 || tileRect.height <= 0) continue;
			if (rectsIntersect(boxRect, tileRect)) ids.push(id);
		}
		return ids;
	}

	function updateGridMetrics() {
		const width = gridViewportRect().width;
		gridWidth = width;
		columnCount = columnsForWidth(width);
	}

	function updateGridFallbackViewport() {
		fallbackScrollTop = outerEl?.scrollTop ?? 0;
		fallbackViewportHeight = gridViewportRect().height;
	}

	function updateGridMeasureStyle(): void {
		const nextStyle = resolveNodeRowMeasureStyle(
			outerEl,
			GRID_LABEL_SELECTOR,
			gridMeasureStyle,
		);
		if (nodeRowMeasureStyleKey(nextStyle) !== nodeRowMeasureStyleKey(gridMeasureStyle)) {
			gridMeasureStyle = nextStyle;
		}
	}

	function scheduleGridMetricsUpdate() {
		if (typeof requestAnimationFrame === 'undefined') {
			updateGridMetrics();
			return;
		}
		if (gridMetricsFrame !== null) return;
		gridMetricsFrame = requestAnimationFrame(() => {
			gridMetricsFrame = null;
			updateGridMetrics();
		});
	}

	function scheduleVirtualizerRemeasure(_surface: 'grid'): void {
		if (typeof requestAnimationFrame === 'undefined') {
			PerfMeter.time('explorer.grid.resizeRemeasure', () => $rowVirtualizer.measure?.());
			return;
		}
		if (gridRemeasureFrame !== null) return;
		gridRemeasureFrame = requestAnimationFrame(() => {
			gridRemeasureFrame = null;
			PerfMeter.time('explorer.grid.resizeRemeasure', () => $rowVirtualizer.measure?.());
		});
	}

	function markGridMeasureScrollActive(): void {
		gridMeasureScrollActive = true;
		clearGridMeasureIdleTimer();
		gridMeasureIdleTimer = setTimeout(() => {
			gridMeasureIdleTimer = null;
			gridMeasureScrollActive = false;
		}, GRID_SCROLL_MEASURE_IDLE_MS);
	}

	function clearGridMeasureIdleTimer(): void {
		if (gridMeasureIdleTimer !== null) clearTimeout(gridMeasureIdleTimer);
		gridMeasureIdleTimer = null;
	}

	function resizeVirtualGridRow(index: number, height: number): void {
		const virtualizer = $rowVirtualizer;
		if (typeof virtualizer.resizeItem === 'function') {
			virtualizer.resizeItem(index, height);
			return;
		}
		scheduleVirtualizerRemeasure('grid');
	}

	function observeGridRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		let rectFrame: number | null = null;
		const emit = () => {
			cb(gridViewportRect());
		};
		const schedule = () => {
			if (typeof requestAnimationFrame === 'undefined') {
				emit();
				return;
			}
			if (rectFrame !== null) return;
			rectFrame = requestAnimationFrame(() => {
				rectFrame = null;
				emit();
			});
		};
		schedule();
		if (!outerEl || typeof ResizeObserver === 'undefined') return () => {};
		const ro = new ResizeObserver(schedule);
		ro.observe(outerEl);
		return () => {
			if (rectFrame !== null) cancelAnimationFrame(rectFrame);
			ro.disconnect();
		};
	}

	function gridViewportRect(): Rect {
		return boundedElementViewportRect(outerEl, gridWidth || GRID_FALLBACK_WIDTH, GRID_FALLBACK_HEIGHT);
	}

	function columnsForWidth(width: number): number {
		const tileWidth = viewSize.tileWidth;
		const gap = viewSize.gap;
		const contentWidth = Math.max(tileWidth, width - gap * 2);
		return Math.max(1, Math.floor((contentWidth + gap) / (tileWidth + gap)));
	}

	function tileOuterWidthFor(
		width: number,
		columns: number,
		preset: ViewSizePreset,
	): number {
		const safeColumns = Math.max(1, columns);
		const available = Math.max(preset.tileWidth, width - preset.gap * 2);
		return Math.max(
			preset.tileWidth,
			(available - preset.gap * (safeColumns - 1)) / safeColumns,
		);
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}

	function buildGridRows(
		items: TreeNode[],
		inputs: readonly ExplorerRowInput[],
		columns: number,
		mode: HierarchyMode,
		expanded: ReadonlySet<string>,
	): GridRow[] {
		const safeColumns = Math.max(1, columns);
		const rows: GridRow[] = [];
		for (let index = 0; index < items.length; index += safeColumns) {
			const rowNodes = items.slice(index, index + safeColumns);
			const rowInputs = inputs.slice(index, index + safeColumns);
			rows.push({
				key: String(rowInputGroupKey(rowInputs, index)),
				nodes: rowNodes,
				rowInputs,
				height: gridRowHeight(rowNodes, safeColumns, mode, expanded),
			});
		}
		return rows;
	}

	function gridInputModelFromInputs(
		items: readonly TreeNode[],
		inputs: readonly ExplorerRowInput[] | undefined,
	): GridInputModel {
		if (inputs === undefined) {
			const rowInputs = items.map((node) => rowInputFromTreeNode(node));
			return { nodes: [...items], rowInputs };
		}
		return gridModelFromRowInputs(inputs);
	}

	function gridModelFromRowInputs(inputs: readonly ExplorerRowInput[]): GridInputModel {
		const byId = new Map(inputs.map((row) => [row.id, row]));
		const childrenByParent = new Map<string, ExplorerRowInput[]>();
		const referencedChildIds = new Set<string>();
		for (const row of inputs) {
			if (row.parentId && byId.has(row.parentId)) {
				const children = childrenByParent.get(row.parentId) ?? [];
				children.push(row);
				childrenByParent.set(row.parentId, children);
				referencedChildIds.add(row.id);
			}
			for (const childId of row.childrenIds ?? []) {
				if (byId.has(childId)) referencedChildIds.add(childId);
			}
		}

		const built = new Map<string, TreeNode>();
		const building = new Set<string>();
		const build = (row: ExplorerRowInput): TreeNode => {
			const existing = built.get(row.id);
			if (existing) return existing;
			if (building.has(row.id)) return rowInputToTreeNode(row);
			building.add(row.id);
			const explicitChildren =
				row.childrenIds
					?.map((childId) => byId.get(childId))
					.filter((child): child is ExplorerRowInput => Boolean(child)) ?? [];
			const childRows =
				explicitChildren.length > 0 ? explicitChildren : (childrenByParent.get(row.id) ?? []);
			const children =
				childRows.length > 0
					? childRows.map(build)
					: gridNodesFromNodeRows((row.node.children ?? []).map((child) => rowInputFromTreeNode(child)));
			const node = rowInputToTreeNode(row);
			node.children = children.length > 0 ? children : undefined;
			building.delete(row.id);
			built.set(row.id, node);
			return node;
		};

		const roots = inputs.filter((row) => !referencedChildIds.has(row.id));
		return { nodes: roots.map(build), rowInputs: roots };
	}

	function gridNodesFromNodeRows(inputs: readonly ExplorerRowInput[]): TreeNode[] {
		return inputs.map((row) => {
			const node = rowInputToTreeNode(row);
			const children = gridNodesFromNodeRows(
				(row.node.children ?? []).map((child) => rowInputFromTreeNode(child)),
			);
			node.children = children.length > 0 ? children : undefined;
			return node;
		});
	}

	function gridRowHeight(
		rowNodes: TreeNode[],
		columns: number,
		mode: HierarchyMode,
		expanded: ReadonlySet<string>,
	): number {
		if (mode !== 'inline') return viewSize.tileHeight;
		return rowNodes.reduce(
			(height, node) => height + expandedPanelHeight(node, columns, expanded),
			viewSize.tileHeight,
		);
	}

	function expandedPanelHeight(
		node: TreeNode,
		columns: number,
		expanded: ReadonlySet<string>,
	): number {
		if (!node.children?.length || !expanded.has(node.id)) return 0;
		const childRows = chunkNodes(node.children, columns);
		const rowsHeight = childRows.reduce((height, rowNodes, index) => {
			const rowHeight = gridRowHeight(rowNodes, columns, 'inline', expanded);
			return height + rowHeight + (index === childRows.length - 1 ? 0 : viewSize.gap);
		}, 0);
		return viewSize.gap + viewSize.gap * 2 + rowsHeight;
	}

	function chunkNodes(items: TreeNode[], columns: number): TreeNode[][] {
		const safeColumns = Math.max(1, columns);
		const chunks: TreeNode[][] = [];
		for (let index = 0; index < items.length; index += safeColumns) {
			chunks.push(items.slice(index, index + safeColumns));
		}
		return chunks;
	}

	function hasChildren(node: TreeNode): boolean {
		return !!node.children && node.children.length > 0;
	}

	function indexGridNode(indexes: Map<string, number>, node: TreeNode, rowIndex: number): void {
		indexes.set(node.id, rowIndex);
		for (const child of node.children ?? []) {
			indexGridNode(indexes, child, rowIndex);
		}
	}

	function gridRowIndexForId(id: string): number {
		if (gridRowIndexCacheRows !== gridRows) {
			gridRowIndexCacheRows = gridRows;
			gridRowIndexCache = new Map<string, number>();
			gridRows.forEach((row, index) => {
				for (const node of row.nodes) {
					indexGridNode(gridRowIndexCache, node, index);
				}
			});
		}
		return gridRowIndexCache.get(id) ?? -1;
	}

	function inlineRowKey(rowNodes: TreeNode[], rowIndex: number): string {
		return `${rowIndex}:${rowNodes.map((node) => node.id).join('\u0000')}`;
	}

	function gridVirtualRowKey(rows: readonly GridRow[], index: number): string | number {
		return rows[index]?.key ?? index;
	}

	function gridRenderRowKey(rows: readonly GridRow[], index: number): string | number {
		return rows[index]?.nodes[0]?.id ?? gridVirtualRowKey(rows, index);
	}

	function gridEstimateSize(index: number): number {
		const row = gridRows[index];
		return row ? (gridMeasuredRowHeights.get(row.key) ?? row.height) + viewSize.gap : gridRowBaseHeight;
	}

	function gridRowTop(rowIndex: number): number {
		return gridGeometry.topForIndex(rowIndex);
	}

	function fallbackGridRows(rows: readonly GridRow[]) {
		const range = gridGeometry.visibleRange({
			scrollTop: fallbackScrollTop,
			viewportHeight: fallbackViewportHeight,
			overscan: GRID_OVERSCAN,
		});
		const out: Array<{ index: number; key: string | number; renderKey: string | number; start: number }> = [];
		for (let index = range.startIndex; index < range.endIndex; index += 1) {
			const row = rows[index];
			if (!row) continue;
			out.push({
				index,
				key: gridVirtualRowKey(rows, index),
				renderKey: gridRenderRowKey(rows, index),
				start: gridGeometry.topForIndex(index),
			});
		}
		return out;
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

{#snippet nodeTile(node: TreeNode)}
	{@const nodeHasChildren = hasChildren(node)}
	{@const nodeExpanded = nodeHasChildren && expandedIds.has(node.id)}
	{@const isSelected = selectedMap?.get(node.id) ?? selectedIds?.has(node.id) ?? false}
	{@const isFocused = focusedId === node.id}
	{@const isActive = activeId === node.id}
	{@const directBadges = visibleNodeBadgesForMask(ownNodeBadges(node), nodeElementMask)}
	{@const hoverBadges = hoverBadgesFor(node)}
	{@const dndState = manualDndStateFor(node.id)}
	{@const fieldValues = nodeElementMask.detail
		? visibleNodeFieldValues(providerId, 'grid', node, effectiveVisibleFields)
		: []}
	{@const countText = showNodeCount ? (node.countLabel ?? (node.count == null ? '' : String(node.count))) : ''}
	<div
		class="vm-node-grid-tile {node.cls ?? ''}"
		class:nav-file={useNativeDom}
		class:is-selected={isSelected}
		class:is-focused={isFocused}
		class:is-active={isActive}
		class:is-active-node={isActive}
		class:is-manual-dnd={manualDndEnabled}
		class:is-dnd-dragging={dndState.dragging}
		class:is-dnd-drop-target={dndState.dropTarget}
		class:is-expanded={nodeExpanded}
		class:is-inline-hierarchy={hierarchyMode === 'inline'}
		data-id={node.id}
		data-vm-manual-dnd={manualDndEnabled ? 'true' : undefined}
		draggable={manualDndEnabled}
		ondragstart={(e) => handleManualDragStart(node, e)}
		ondragover={(e) => handleManualDragOver(node, e)}
		ondrop={(e) => handleManualDrop(node, e)}
		ondragend={handleManualDragEnd}
		role="gridcell"
		tabindex="0"
		aria-selected={isSelected}
		aria-expanded={hierarchyMode === 'inline' && nodeHasChildren ? nodeExpanded : undefined}
	>
		{#if hierarchyMode === 'inline'}
			{#if nodeHasChildren}
				<button
					type="button"
					class="vm-node-grid-toggle"
					data-vm-node-grid-toggle={node.id}
					aria-label={nodeExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
					aria-expanded={nodeExpanded}
					onclick={(e) => handleToggleExpand(node.id, e)}
				>
					<span use:icon={nodeExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}></span>
				</button>
			{:else}
				<span class="vm-node-grid-toggle-placeholder" aria-hidden="true"></span>
			{/if}
		{/if}
		{#if showNodeIcon && node.icon}
			<span class="vm-node-grid-icon" use:icon={node.icon}></span>
		{:else if nodeElementMask.icon}
			<span class="vm-node-grid-icon-placeholder" aria-hidden="true"></span>
		{/if}
		<div class="vm-node-grid-fields">
			{#if showNodeText}
				<span class="vm-node-grid-label" class:nav-file-title={useNativeDom}>
					{#if node.labelPrefix}<span class="vm-node-grid-label-prefix">{node.labelPrefix}</span
						>{/if}{node.label}
				</span>
			{/if}
			{#if countText}
				<span class="vm-node-grid-field" data-node-field="count">{countText}</span>
			{/if}
			{#each fieldValues as field (field.id)}
				<span class="vm-node-grid-field" data-node-field={field.id}>{field.text}</span>
			{/each}
		</div>
		{#if directBadges.length > 0}
			<div class="vm-node-grid-badge-zone">
				{#each directBadges as badge, badgeIndex (nodeBadgeKey(badge, badgeIndex))}
					<div
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
					</div>
				{/each}
			</div>
		{/if}
		{#if hoverBadges.length > 0}
			<div class="vm-node-grid-hover-badge-zone">
				{#each hoverBadges as badge (badge.kind)}
					<div
						class="vm-badge is-hover-badge is-actionable"
						data-hover-kind={badge.kind}
						role="button"
						tabindex="0"
						title={badge.label}
						aria-label={badge.label}
						onclick={(e) => handleHoverBadgePress(e, node.id, badge.kind)}
						onkeydown={(e) => handleHoverBadgeKeydown(e, node.id, badge.kind)}
					>
						<span class="vm-badge-icon" use:icon={badge.icon}></span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet inlinePanel(node: TreeNode, depth: number)}
	{#if hierarchyMode === 'inline' && node.children?.length && expandedIds.has(node.id)}
		<div
			class="vm-node-grid-inline-panel"
			data-vm-node-grid-inline-panel={node.id}
			style="--vm-node-grid-inline-depth: {depth}"
		>
			{@render inlineRows(node.children, depth)}
		</div>
	{/if}
{/snippet}

{#snippet inlineRows(items: TreeNode[], depth: number)}
	<div class="vm-node-grid-inline-rows">
		{#each chunkNodes(items, columnCount) as rowNodes, rowIndex (inlineRowKey(rowNodes, rowIndex))}
			<div class="vm-node-grid-inline-row" style="--vm-node-grid-inline-depth: {depth}">
				<div class="vm-node-grid-inline-row-tiles">
					{#each rowNodes as node (node.id)}
						{@render nodeTile(node)}
					{/each}
				</div>
				{#each rowNodes as node (node.id)}
					{@render inlinePanel(node, depth + 1)}
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<div
	bind:this={outerEl}
	class="vm-node-grid"
	class:is-manual-dnd={manualDndEnabled}
	role="grid"
	aria-multiselectable="true"
	tabindex="-1"
	style={viewSizeStyle}
	onclick={handleDelegatedGridClick}
	onauxclick={handleDelegatedGridAuxClick}
	oncontextmenu={handleDelegatedGridContextMenu}
	onkeydown={handleDelegatedGridKeydown}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	onscroll={handleGridScroll}
>
	<div
		class="vm-node-grid-inner"
		style="--vm-node-grid-total-h: {resolvedTotalHeight}px; --vm-node-grid-columns: {columnCount}"
	>
		{#each renderedRows as virtualRow (virtualRow.renderKey)}
			{@const row = gridRows[virtualRow.index]}
			{#if row}
				<div
					class="vm-node-grid-row"
					style="--vm-node-grid-y: {virtualRow.start}px; --vm-node-grid-row-h: {gridMeasuredRowHeights.get(row.key) ??
						row.height}px"
				>
					<div class="vm-node-grid-row-tiles">
						{#each row.nodes as node (node.id)}
							{@render nodeTile(node)}
						{/each}
					</div>
					{#each row.nodes as node (node.id)}
						{@render inlinePanel(node, 1)}
					{/each}
				</div>
			{/if}
		{/each}
	</div>
	{#if selectionBox}
		<div
			class="vm-selection-box"
			style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
		></div>
	{/if}
</div>
