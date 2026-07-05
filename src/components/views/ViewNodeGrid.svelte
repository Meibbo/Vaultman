<script lang="ts">
	import { getContext } from 'svelte';
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
		PRESET_KEY,
		type PresetContextValue,
	} from '../explorer/viewHostContext';
	import {
		explorerViewContract,
		type NativeClassVocabulary,
	} from '../../services/serviceExplorerViewContract';
	import { createRowAction, type RowProps, type RowState } from '../../services/serviceRowAction';
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import {
		createManualDndService,
		manualWorkspacePayloadForNode,
		writeManualDndTransfer,
	} from '../../services/serviceManualDnd';
	import {
		rowInputFromTreeNode,
		rowInputToTreeNode,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import type { DndDropPosition, DndDropResult } from '../../services/serviceDnd';
	import { PerfMeter } from '../../services/perfMeter';
	import {
		createVariableProviderRegistry,
		laneOffsetForIndex,
		laneRangeForBand,
	} from '../../services/serviceSharedVirtualLayout';
	import {
		SharedVariableVirtualLayout,
		getSharedGeometryRegistry,
	} from '../../services/serviceSharedVirtualLayout.svelte';
	import { boundedElementViewportRect, type ElementViewportRect } from '../../services/serviceScroll';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const GRID_FALLBACK_WIDTH = 480;
	const GRID_FALLBACK_HEIGHT = 360;
	const EMPTY_EXPANDED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };

	type HierarchyMode = 'folder' | 'inline';

	interface GridInputModel {
		nodes: TreeNode[];
		rowInputs: ExplorerRowInput[];
	}

	/** One rendered row-band: the tiles (and inline panels) sharing a virtualized y-offset. */
	interface GridVirtualBand {
		bandIndex: number;
		renderKey: string | number;
		start: number;
		entries: Array<{ node: TreeNode; lane: number }>;
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
		onColumnCountChange?: (columns: number) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		sizePresetId?: ViewSizePresetId;
		providerId?: string;
		visibleFields?: readonly string[];
		manualDndEnabled?: boolean;
		onManualDrop?: (result: DndDropResult) => void;
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
		onColumnCountChange,
		scrollTarget = null,
		mouseGestureConfig,
		sizePresetId = DEFAULT_VIEW_SIZE_PRESET,
		providerId = 'nodes',
		visibleFields = [],
		manualDndEnabled = false,
		onManualDrop,
		themeService = undefined,
		icon,
	}: Props = $props();

	const presetCtx = getContext<PresetContextValue | undefined>(PRESET_KEY);
	const presetUseNativeDom = $derived(presetCtx?.value().useNativeDom);
	const useNativeDom = $derived(presetUseNativeDom ?? themeService?.useNativeDom ?? false);
	const nativeVocab = $derived<NativeClassVocabulary | null>(
		useNativeDom ? explorerViewContract('grid').nativeDomEmission.panel : null,
	);
	const gridFeatures = explorerViewContract('grid').features;
	const rowAction = $derived(
		createRowAction({
			explorerId: projection?.providerId ?? providerId,
			role: 'gridcell',
			features: gridFeatures,
			contract: {
				onToggle: noopTileToggle,
				onContextMenu,
				onRowKeydown: onTileKeydown,
			},
		}),
	);
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
	const viewSize = $derived(getViewSizePreset(sizePresetId));
	const viewSizeStyle = $derived(viewSizeCssVars(viewSize));
	let gridWidth = $state(GRID_FALLBACK_WIDTH);
	let columnCount = $state(columnsForWidth(GRID_FALLBACK_WIDTH));
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;
	let gridMetricsFrame: number | null = null;
	let gpuReadyMarked = false;
	let consumedScrollTargetSerial: number | null = null;
	let gridItemIndexCacheNodes: readonly TreeNode[] | null = null;
	let gridItemIndexCache = new Map<string, number>();
	let reportedColumnCount: number | null = null;
	const mouse = createMouseGestureService();
	const manualDnd = createManualDndService();
	let manualDndVersion = $state(0);
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(
		() => () => {
			mouse.cancelAll();
		},
	);
	$effect(() => manualDnd.subscribe(() => (manualDndVersion += 1)));
	$effect(() => {
		manualDnd.setEnabled(manualDndEnabled);
	});

	const effectiveRowInputs = $derived(projection ? rowInputsFromProjection(projection) : rowInputs);
	const gridInputModel = $derived(gridInputModelFromInputs(nodes, effectiveRowInputs));

	// Shared render-runtime (V.D, slice 2b): the grid adopts the SAME variable-height + lanes
	// strategy table already consumes, but as the first REAL lanes consumer — `laneCount` =
	// `columnCount` (the responsive column count), and the layout runs over the FLAT top-level
	// item list: the shared striped-Fenwick band math (`laneOffsetForIndex`/`laneRangeForBand`)
	// replaces the local `buildGridRows` chunking + local `createExplorerVariableGeometry` +
	// TanStack `setOptions` seam + fallback cover path this component carried (D-2b-1 full
	// migration). A column-count change is a genuine RESHAPE per the locked 2a warmth semantics
	// (band boundaries move) — the shape-keyed registry gives each `(providerId, laneCount)` its
	// own permanently-warm Fenwick, so bouncing between column counts revisits warm shapes
	// instead of rebuilding. `providerId` keys the warm per-provider registry (context'd once
	// near the explorer root by ViewHost); standalone mounts (most component tests) fall back to
	// a local, unshared registry. `estimateSize` is the same structural estimate the deleted
	// local Fenwick used (tile height + inline-panel expansion + gap); REAL band heights come
	// from the shell's `measureRow` `{@attach}` with its DEFAULT `offsetHeight` size source —
	// real tile DOM heights, replacing the deleted pretext text-prediction path (D-2b-2).
	// svelte-ignore state_referenced_locally -- the layout controller (and the provider key it
	// warms) is intentionally fixed per mounted view instance: a provider swap is a different
	// panel, not a reshape of this one (same lifecycle stance as ViewHost's inherited service).
	// Reactive inputs (rowCount / keys / estimates / laneCount) flow through the option getters;
	// the `laneCount` getter is read once at construction and kept in sync by updateGridMetrics
	// (the single place `columnCount` changes).
	const gridProviderId = projection?.providerId ?? providerId;
	const localGeometryRegistry = getSharedGeometryRegistry() ?? createVariableProviderRegistry();
	const layout = new SharedVariableVirtualLayout({
		providerId: gridProviderId,
		registry: localGeometryRegistry,
		rowCount: () => gridInputModel.nodes.length,
		estimateSize: (itemIndex) => gridBandEstimate(itemIndex),
		laneCount: () => columnCount,
		getKey: (itemIndex) => gridInputModel.nodes[itemIndex]?.id ?? itemIndex,
		resolveId: (itemIndex) => gridInputModel.nodes[itemIndex]?.id,
		fallbackViewportHeight: GRID_FALLBACK_HEIGHT,
	});

	/**
	 * The rendered row-bands: `layout.rows` (one entry per tile, each carrying its `lane`) grouped
	 * back into bands purely for the template — the band wrapper positions a row of tiles at one
	 * shared y-offset and hosts the inline hierarchy panels below the tiles, exactly the DOM shape
	 * the pre-adoption grid rendered. The grouping is O(window) over the visible+overscan range
	 * (never the whole item list — that was `buildGridRows`, deleted) and uses the shared
	 * `laneOffsetForIndex` band math, so it can never disagree with the Fenwick's banding.
	 */
	const gridVirtualBands: GridVirtualBand[] = $derived.by(() => {
		const items = gridInputModel.nodes;
		const lanes = Math.max(1, Math.floor(layout.laneCount));
		const bands: GridVirtualBand[] = [];
		let current: GridVirtualBand | null = null;
		for (const row of layout.rows) {
			const node = items[row.index];
			if (!node) continue;
			const band = laneOffsetForIndex(row.index, lanes).band;
			if (!current || current.bandIndex !== band) {
				current = { bandIndex: band, renderKey: node.id, start: row.start, entries: [] };
				bands.push(current);
			}
			current.entries.push({ node, lane: row.lane });
		}
		return bands;
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		if (target.serial === consumedScrollTargetSerial) return;
		const itemIndex = gridItemIndexForId(target.id);
		if (itemIndex < 0) return;
		consumedScrollTargetSerial = target.serial;
		scrollGridRowIntoView(laneOffsetForIndex(itemIndex, layout.laneCount).band);
	});

	// Container metrics only (width -> responsive column count). Viewport height / scrollTop /
	// per-band measurement all moved into the shared runtime: `layout.attach` owns the scroll
	// listener + viewport ResizeObserver, and `layout.measureRow` (template) owns band heights.
	$effect(() => {
		if (!outerEl) return;
		updateGridMetrics();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => scheduleGridMetricsUpdate());
		ro.observe(outerEl);
		return () => {
			if (gridMetricsFrame !== null) cancelAnimationFrame(gridMetricsFrame);
			gridMetricsFrame = null;
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

	function scrollGridRowIntoView(bandIndex: number): void {
		if (!outerEl) return;
		PerfMeter.time('explorer.grid.scrollIntoView', () => {
			// Read the viewport live (bounded rect), not the layout's tracked $state, so reveal
			// works even when no scroll/resize event has refreshed it since the element was last
			// sized — same discipline as the shared runtime's own scrollToIndex and the table's
			// scrollTableRowIntoView. Band top/size come from the warm Fenwick (off-window reach).
			const viewportHeight = gridViewportRect().height;
			const currentTop = outerEl!.scrollTop;
			const rowTop = layout.topForIndex(bandIndex);
			const rowBottom = rowTop + layout.sizeForIndex(bandIndex);
			const currentBottom = currentTop + viewportHeight;
			if (rowTop >= currentTop && rowBottom <= currentBottom) return;

			const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
			outerEl!.scrollTop = nextTop;
			layout.scrollTop = nextTop;
			layout.viewportHeight = viewportHeight;
			outerEl!.dispatchEvent(new Event('scroll'));
		});
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

	function rowStateClassString(state: {
		isSelected: boolean;
		isFocused: boolean;
		isActive: boolean;
		isDragSource: boolean;
		isDropTarget: boolean;
	}): string {
		return stateModEmissions(nativeVocab, {
			...state,
			hasActiveMenu: false,
		}).join(' ');
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
		const nextColumnCount = columnsForWidth(width);
		if (gridWidth !== width) gridWidth = width;
		if (columnCount !== nextColumnCount) columnCount = nextColumnCount;
		// Keep the runtime's lane strategy in step with the responsive column count. A lane-count
		// change is a genuine reshape (locked 2a semantics): the shape-keyed registry parks the
		// old shape's warm Fenwick and activates (or creates) the one for the new shape.
		if (layout.laneCount !== nextColumnCount) layout.laneCount = nextColumnCount;
		if (reportedColumnCount === nextColumnCount) return;
		reportedColumnCount = nextColumnCount;
		onColumnCountChange?.(nextColumnCount);
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

	function gridViewportRect(): ElementViewportRect {
		return boundedElementViewportRect(outerEl, gridWidth || GRID_FALLBACK_WIDTH, GRID_FALLBACK_HEIGHT);
	}

	function columnsForWidth(width: number): number {
		const tileWidth = viewSize.tileWidth;
		const gap = viewSize.gap;
		const contentWidth = Math.max(tileWidth, width - gap * 2);
		return Math.max(1, Math.floor((contentWidth + gap) / (tileWidth + gap)));
	}

	function gridTileProps(id: string, state: RowState): RowProps {
		const props = rowAction.getRowProps(id, state);
		return { ...props, oncontextmenu: undefined, onkeydown: undefined };
	}

	function noopTileToggle(): void {}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}

	/**
	 * Structural band-height ESTIMATE for the shared runtime — tile height plus the inline
	 * hierarchy expansion of every node in the band, plus the inter-band gap (the same model the
	 * deleted local Fenwick was seeded with). The runtime hands this the band's FIRST item index;
	 * `laneOffsetForIndex`/`laneRangeForBand` recover the band's item slice under the current
	 * column count. Real heights come from `measureRow` (`offsetHeight`) once a band renders.
	 */
	function gridBandEstimate(itemIndex: number): number {
		const lanes = Math.max(1, Math.floor(columnCount));
		const band = laneOffsetForIndex(itemIndex, lanes).band;
		const itemRange = laneRangeForBand({ startIndex: band, endIndex: band + 1 }, lanes);
		const bandNodes = gridInputModel.nodes.slice(itemRange.startIndex, itemRange.endIndex);
		return gridRowHeight(bandNodes, lanes, hierarchyMode, expandedIds) + viewSize.gap;
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

	function indexGridNode(indexes: Map<string, number>, node: TreeNode, itemIndex: number): void {
		indexes.set(node.id, itemIndex);
		for (const child of node.children ?? []) {
			indexGridNode(indexes, child, itemIndex);
		}
	}

	/**
	 * Flat item index for a node id — descendants map to their top-level ancestor's index (an
	 * inline child reveals by scrolling its ancestor band into view, as before). Cached per items
	 * array identity; the ITEM index is column-count-independent, so a resize never invalidates
	 * it — the band is derived at lookup time via `laneOffsetForIndex`.
	 */
	function gridItemIndexForId(id: string): number {
		const items = gridInputModel.nodes;
		if (gridItemIndexCacheNodes !== items) {
			gridItemIndexCacheNodes = items;
			gridItemIndexCache = new Map<string, number>();
			items.forEach((node, index) => indexGridNode(gridItemIndexCache, node, index));
		}
		return gridItemIndexCache.get(id) ?? -1;
	}

	function inlineRowKey(rowNodes: TreeNode[], rowIndex: number): string {
		return `${rowIndex}:${rowNodes.map((node) => node.id).join('\u0000')}`;
	}

</script>

{#snippet nodeTile(node: TreeNode, lane?: number)}
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
		class="vm-node-grid-tile {node.cls ?? ''} {nativeVocab?.rowRoot ?? ''} {rowStateClassString(
			{
				isSelected,
				isFocused,
				isActive,
				isDragSource: dndState.dragging === true,
				isDropTarget: dndState.dropTarget === true,
			},
		)}"
		class:is-selected={isSelected}
		class:is-focused={isFocused}
		class:is-active={isActive}
		class:is-active-node={isActive}
		class:is-manual-dnd={manualDndEnabled}
		class:is-expanded={nodeExpanded}
		class:is-inline-hierarchy={hierarchyMode === 'inline'}
		style:grid-column={lane === undefined ? undefined : lane + 1}
		data-id={node.id}
		data-vm-manual-dnd={manualDndEnabled ? 'true' : undefined}
		draggable={manualDndEnabled}
		ondragstart={(e) => handleManualDragStart(node, e)}
		ondragover={(e) => handleManualDragOver(node, e)}
		ondrop={(e) => handleManualDrop(node, e)}
		ondragend={handleManualDragEnd}
		{...gridTileProps(node.id, {
			selected: isSelected,
			focused: isFocused,
			expandable: hierarchyMode === 'inline' && nodeHasChildren,
			expanded: nodeExpanded,
		})}
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
				<span class="vm-node-grid-label {nativeVocab?.primaryLabel ?? ''}">
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
	{@attach layout.attach}
	onclick={handleDelegatedGridClick}
	onauxclick={handleDelegatedGridAuxClick}
	oncontextmenu={handleDelegatedGridContextMenu}
	onkeydown={handleDelegatedGridKeydown}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
>
	<div
		class="vm-node-grid-inner"
		style="--vm-node-grid-total-h: {layout.totalHeight}px; --vm-node-grid-columns: {columnCount}"
	>
		{#each gridVirtualBands as band (band.renderKey)}
			<div
				class="vm-node-grid-row"
				style="--vm-node-grid-y: {band.start}px"
				{@attach layout.measureRow(band.bandIndex)}
			>
				<div class="vm-node-grid-row-tiles">
					{#each band.entries as entry (entry.node.id)}
						{@render nodeTile(entry.node, entry.lane)}
					{/each}
				</div>
				{#each band.entries as entry (entry.node.id)}
					{@render inlinePanel(entry.node, 1)}
				{/each}
			</div>
		{/each}
	</div>
	{#if selectionBox}
		<div
			class="vm-selection-box"
			style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
		></div>
	{/if}
</div>
