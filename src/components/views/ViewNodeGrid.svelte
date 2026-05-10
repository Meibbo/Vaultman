<script lang="ts">
	import { untrack } from 'svelte';
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
		type ViewSizePresetId,
	} from '../../services/serviceViewSize';
	import {
		createManualDndService,
		manualWorkspacePayloadForNode,
		writeManualDndTransfer,
	} from '../../services/serviceManualDnd';
	import type { DndDropPosition, DndDropResult } from '../../services/serviceDnd';

	const GRID_FALLBACK_WIDTH = 480;
	const GRID_FALLBACK_HEIGHT = 360;
	const GRID_OVERSCAN = 6;
	const EMPTY_EXPANDED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };

	type HierarchyMode = 'folder' | 'inline';

	interface GridRow {
		key: string;
		nodes: TreeNode[];
		height: number;
	}

	interface Props {
		nodes: TreeNode[];
		selectedIds?: Set<string>;
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
		onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
		activeOpsByNode?: ActiveOpsByNode;
		primaryHoverBadgeKind?: BadgeKind | null;
		onToggleExpand?: (id: string, e: MouseEvent | KeyboardEvent) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		sizePresetId?: ViewSizePresetId;
		providerId?: string;
		manualDndEnabled?: boolean;
		onManualDrop?: (result: DndDropResult) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		selectedIds,
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
		onHoverBadgeAction,
		activeOpsByNode,
		primaryHoverBadgeKind = null,
		onToggleExpand,
		scrollTarget = null,
		mouseGestureConfig,
		sizePresetId = DEFAULT_VIEW_SIZE_PRESET,
		providerId = 'nodes',
		manualDndEnabled = false,
		onManualDrop,
		icon,
	}: Props = $props();

	function hoverBadgesFor(node: TreeNode): BadgeDescriptor[] {
		if (!activeOpsByNode) return [];
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
	const mouse = createMouseGestureService();
	const manualDnd = createManualDndService();
	let manualDndVersion = $state(0);
	const viewSize = $derived(getViewSizePreset(sizePresetId));
	const viewSizeStyle = $derived(viewSizeCssVars(viewSize));
	const gridRowBaseHeight = $derived(viewSize.tileHeight + viewSize.gap);
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());
	$effect(() => manualDnd.subscribe(() => (manualDndVersion += 1)));
	$effect(() => {
		manualDnd.setEnabled(manualDndEnabled);
	});

	const gridRows = $derived(buildGridRows(nodes, columnCount, hierarchyMode, expandedIds));
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => gridVirtualRowKey(gridRows, index),
		estimateSize: () => gridRowBaseHeight,
		observeElementRect: observeGridRect,
		overscan: GRID_OVERSCAN,
		initialRect: { width: GRID_FALLBACK_WIDTH, height: GRID_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedRows = $derived.by(() => {
		const rows = virtualRows.filter((row) => row.index < gridRows.length);
		if (rows.length > 0 || gridRows.length === 0) return rows;
		return fallbackGridRows(gridRows);
	});
	const totalHeight = $derived($rowVirtualizer.getTotalSize() + viewSize.gap * 2);

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
				estimateSize: (index) => rows[index]?.height ?? gridRowBaseHeight,
				observeElementRect: observeGridRect,
				overscan: GRID_OVERSCAN,
				initialRect: { width, height: GRID_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const rowIndex = gridRows.findIndex((row) =>
			row.nodes.some((node) => containsNodeId(node, target.id)),
		);
		if (rowIndex >= 0) scrollGridRowIntoView(rowIndex);
	});

	$effect(() => {
		if (!outerEl) return;
		updateGridMetrics();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(scheduleGridMetricsUpdate);
		ro.observe(outerEl);
		return () => {
			if (gridMetricsFrame !== null) cancelAnimationFrame(gridMetricsFrame);
			gridMetricsFrame = null;
			ro.disconnect();
		};
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

	function scrollGridRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		const row = gridRows[rowIndex];
		const rowHeight = row?.height ?? gridRowBaseHeight;
		const viewportHeight = outerEl.clientHeight || GRID_FALLBACK_HEIGHT;
		const rowTop = rowIndex * gridRowBaseHeight + viewSize.gap;
		const rowBottom = rowTop + rowHeight;
		const currentTop = outerEl.scrollTop;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		$rowVirtualizer.scrollToIndex(rowIndex, { align: rowTop < currentTop ? 'start' : 'end' });
		outerEl.scrollTop = nextTop;
		outerEl.dispatchEvent(new Event('scroll'));
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
		const width = outerEl?.clientWidth || GRID_FALLBACK_WIDTH;
		gridWidth = width;
		columnCount = columnsForWidth(width);
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

	function observeGridRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		let rectFrame: number | null = null;
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || gridWidth || GRID_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || GRID_FALLBACK_HEIGHT,
			});
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

	function columnsForWidth(width: number): number {
		const tileWidth = viewSize.tileWidth;
		const gap = viewSize.gap;
		const contentWidth = Math.max(tileWidth, width - gap * 2);
		return Math.max(1, Math.floor((contentWidth + gap) / (tileWidth + gap)));
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}

	function buildGridRows(
		items: TreeNode[],
		columns: number,
		mode: HierarchyMode,
		expanded: ReadonlySet<string>,
	): GridRow[] {
		const safeColumns = Math.max(1, columns);
		const rows: GridRow[] = [];
		for (let index = 0; index < items.length; index += safeColumns) {
			const rowNodes = items.slice(index, index + safeColumns);
			rows.push({
				key: rowNodes.map((node) => node.id).join('\u0000'),
				nodes: rowNodes,
				height: gridRowHeight(rowNodes, safeColumns, mode, expanded),
			});
		}
		return rows;
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

	function containsNodeId(node: TreeNode, id: string): boolean {
		if (node.id === id) return true;
		return node.children?.some((child) => containsNodeId(child, id)) ?? false;
	}

	function inlineRowKey(rowNodes: TreeNode[], rowIndex: number): string {
		return `${rowIndex}:${rowNodes.map((node) => node.id).join('\u0000')}`;
	}

	function gridVirtualRowKey(rows: readonly GridRow[], index: number): string | number {
		return rows[index]?.key ?? index;
	}

	function fallbackGridRows(rows: readonly GridRow[]) {
		const viewportHeight = outerEl?.clientHeight || GRID_FALLBACK_HEIGHT;
		const scrollTop = outerEl?.scrollTop ?? 0;
		let top = viewSize.gap;
		let startIndex = 0;
		for (let index = 0; index < rows.length; index += 1) {
			const bottom = top + rows[index].height;
			if (bottom >= scrollTop) {
				startIndex = Math.max(0, index - GRID_OVERSCAN);
				break;
			}
			top = bottom + viewSize.gap;
		}
		const out: Array<{ index: number; key: string | number; start: number }> = [];
		let start = viewSize.gap;
		for (let index = 0; index < rows.length; index += 1) {
			if (index >= startIndex && start <= scrollTop + viewportHeight + GRID_OVERSCAN * gridRowBaseHeight) {
				out.push({ index, key: gridVirtualRowKey(rows, index), start });
			}
			start += rows[index].height + viewSize.gap;
		}
		return out;
	}
</script>

{#snippet nodeTile(node: TreeNode)}
	{@const nodeHasChildren = hasChildren(node)}
	{@const nodeExpanded = nodeHasChildren && expandedIds.has(node.id)}
	{@const isSelected = selectedIds?.has(node.id) ?? false}
	{@const isFocused = focusedId === node.id}
	{@const isActive = activeId === node.id}
	{@const hoverBadges = hoverBadgesFor(node)}
	{@const dndState = manualDndStateFor(node.id)}
	<div
		class="vm-node-grid-tile {node.cls ?? ''}"
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
		onclick={(e) => handleTileClick(node.id, e)}
		onauxclick={(e) => handleTileAuxClick(node.id, e)}
		oncontextmenu={(e) => onContextMenu(node.id, e)}
		onkeydown={(e) => handleTileKeydown(node.id, e)}
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
		{#if node.icon}
			<span class="vm-node-grid-icon" use:icon={node.icon}></span>
		{:else}
			<span class="vm-node-grid-icon-placeholder" aria-hidden="true"></span>
		{/if}
		<span class="vm-node-grid-label">
			{#if node.labelPrefix}<span class="vm-node-grid-label-prefix">{node.labelPrefix}</span
				>{/if}{node.label}
		</span>
		{#if hoverBadges.length > 0}
			<div class="vm-node-grid-hover-badge-zone">
				{#each hoverBadges as badge (badge.kind)}
					<div
						class="vm-badge is-hover-badge is-actionable"
						class:is-primary-action={badge.kind === primaryHoverBadgeKind}
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
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
>
	<div
		class="vm-node-grid-inner"
		style="--vm-node-grid-total-h: {totalHeight}px; --vm-node-grid-columns: {columnCount}"
	>
		{#each renderedRows as virtualRow (virtualRow.key)}
			{@const row = gridRows[virtualRow.index]}
			{#if row}
				<div
					class="vm-node-grid-row"
					style="--vm-node-grid-y: {virtualRow.start +
						viewSize.gap}px; --vm-node-grid-row-h: {row.height}px"
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
