<script lang="ts">
	import { untrack } from 'svelte';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import type { Rect, Virtualizer } from '@tanstack/svelte-virtual';
	import type { NodeBadge, TreeNode } from '../../types/typeNode';
	import { getActivePerfProbe } from '../../dev/perfProbe';
	import type { FlatNode } from '../../services/serviceVirtualizer.svelte';
	import HighlightText from '../primitives/HighlightText.svelte';
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

	const DEFAULT_VIEW_SIZE = getViewSizePreset(DEFAULT_VIEW_SIZE_PRESET);
	const TREE_ROW_HEIGHT = DEFAULT_VIEW_SIZE.treeRowHeight;
	const TREE_FALLBACK_WIDTH = 320;
	const TREE_FALLBACK_HEIGHT = 400;
	const TREE_OVERSCAN = 5;
	type ScrollTarget = { id: string; serial: number };

	interface Props {
		nodes: TreeNode[];
		expandedIds: Set<string>;
		selectedIds?: Set<string>;
		focusedId?: string | null;
		onToggle: (id: string) => void;
		onRowClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onBoxSelect?: (ids: string[], e: PointerEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		activeFilterIds?: Set<string>;
		searchHighlightIds?: Set<string>;
		warningIds?: Set<string>;
		editingId?: string | null;
		onRename?: (id: string, newLabel: string) => void;
		onCancelRename?: () => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
		activeOpsByNode?: ActiveOpsByNode;
		primaryHoverBadgeKind?: BadgeKind | null;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		sizePresetId?: ViewSizePresetId;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		expandedIds,
		selectedIds,
		focusedId,
		onToggle,
		onRowClick,
		onPrimaryAction,
		onSecondaryAction,
		onTertiaryAction,
		onBoxSelect,
		onContextMenu,
		onRowKeydown,
		activeFilterIds,
		searchHighlightIds,
		warningIds,
		editingId,
		onRename,
		onCancelRename,
		onBadgeDoubleClick,
		onHoverBadgeAction,
		activeOpsByNode,
		primaryHoverBadgeKind = null,
		scrollTarget = null,
		mouseGestureConfig,
		sizePresetId = DEFAULT_VIEW_SIZE_PRESET,
		icon,
	}: Props = $props();

	function hoverBadgesFor(node: TreeNode): BadgeDescriptor[] {
		// Hover badges are an opt-in feature. Adapters that have not wired
		// the registry yet (or unit tests that mount the view in isolation)
		// pass no `activeOpsByNode` and we render no hover badges.
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
	let rowHeight = $state(TREE_ROW_HEIGHT);
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;
	let rowHeightFrame: number | null = null;
	const mouse = createMouseGestureService();
	const viewSize = $derived(getViewSizePreset(sizePresetId));
	const viewSizeStyle = $derived(viewSizeCssVars(viewSize));
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	const flatArray = $derived(flattenMeasured(nodes, expandedIds));
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => treeVirtualItemKey(flatArray, index),
		estimateSize: () => rowHeight,
		observeElementRect: observeTreeRect,
		overscan: TREE_OVERSCAN,
		initialRect: { width: TREE_FALLBACK_WIDTH, height: TREE_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedVirtualRows = $derived(
		virtualRows.filter((virtualRow) => virtualRow.index < flatArray.length),
	);
	const totalH = $derived($rowVirtualizer.getTotalSize());

	$effect(() => {
		const count = flatArray.length;
		const rows = flatArray;
		const scrollElement = outerEl;
		const height = rowHeight;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => treeVirtualItemKey(rows, index),
				estimateSize: () => height,
				observeElementRect: observeTreeRect,
				overscan: TREE_OVERSCAN,
				initialRect: { width: TREE_FALLBACK_WIDTH, height: TREE_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const index = flatArray.findIndex((item) => item.node.id === target.id);
		if (index >= 0) scrollRowIntoView(index);
	});

	function onScroll() {
		getActivePerfProbe()?.count('viewTree.scroll', {
			rows: flatArray.length,
			visibleRows: virtualRows.length,
		});
	}

	function scrollRowIntoView(index: number): void {
		if (!outerEl) return;
		const viewportHeight = outerEl.clientHeight || TREE_FALLBACK_HEIGHT;
		const currentTop = outerEl.scrollTop;
		const rowTop = index * rowHeight;
		const rowBottom = rowTop + rowHeight;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		$rowVirtualizer.scrollToIndex(index, { align: rowTop < currentTop ? 'start' : 'end' });
		outerEl.scrollTop = nextTop;
		outerEl.dispatchEvent(new Event('scroll'));
	}

	function flattenMeasured(items: TreeNode[], expanded: ReadonlySet<string>): FlatNode[] {
		return (
			getActivePerfProbe()?.measure('viewTree.flatten', { nodes: items.length }, () =>
				flattenTreeNodes(items, expanded),
			) ?? flattenTreeNodes(items, expanded)
		);
	}

	$effect(() => {
		if (!outerEl) return;
		updateRowHeight();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			scheduleRowHeightUpdate();
		});
		ro.observe(outerEl);
		return () => {
			if (rowHeightFrame !== null) cancelAnimationFrame(rowHeightFrame);
			rowHeightFrame = null;
			ro.disconnect();
		};
	});

	function handleKeydown(e: KeyboardEvent, id: string) {
		if (onRowKeydown) {
			onRowKeydown(id, e);
			return;
		}
		if (e.key === 'Enter') onPrimaryAction?.(id, e as unknown as MouseEvent);
	}

	function handleInputKeydown(e: KeyboardEvent, id: string, inputEl: HTMLInputElement) {
		if (e.key === 'Enter') {
			e.stopPropagation();
			onRename?.(id, inputEl.value);
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onCancelRename?.();
		}
	}

	function handleRowClick(e: MouseEvent, id: string) {
		if (suppressNextClick) {
			suppressNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		mouse.handleClick(
			{ key: `tree:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onRowClick(id, event),
				secondary: (event) => onSecondaryAction?.(id, event),
				tertiary: (event) => onTertiaryAction?.(id, event),
			},
			nodeMouseConfig,
		);
	}

	function handleRowAuxClick(e: MouseEvent, id: string) {
		mouse.handleAuxClick(
			{ key: `tree:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(id, event) },
			nodeMouseConfig,
		);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !outerEl || shouldIgnoreBoxStart(e.target)) return;
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
		const ids = intersectingRowIds(box);
		suppressNextClick = true;
		if (ids.length > 0) onBoxSelect?.(ids, e);
	}

	function handlePointerCancel() {
		if (dragStart) releasePointer(dragStart.pointerId);
		dragStart = null;
		selectionBox = null;
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

	function intersectingRowIds(box: NonNullable<typeof selectionBox>): string[] {
		const ids: string[] = [];
		const boxRect = rectFromBox(box);
		const width = outerEl?.scrollWidth || outerEl?.clientWidth || TREE_FALLBACK_WIDTH;
		for (let index = 0; index < flatArray.length; index += 1) {
			const rowRect = new DOMRect(0, index * rowHeight, width, rowHeight);
			if (rectsIntersect(boxRect, rowRect)) ids.push(flatArray[index].node.id);
		}
		return ids;
	}

	function rectFromBox(box: NonNullable<typeof selectionBox>): DOMRect {
		return new DOMRect(box.left, box.top, box.width, box.height);
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}

	function ownBadges(node: TreeNode): NodeBadge[] {
		return (node.badges ?? []).filter((badge) => !badge.isInherited);
	}

	function inheritedBadges(node: TreeNode): NodeBadge[] {
		return (node.badges ?? []).filter((badge) => badge.isInherited);
	}

	function badgeKey(badge: NodeBadge, index: number): string {
		return `${badge.queueIndex ?? 'badge'}:${index}:${badge.text ?? ''}:${badge.icon ?? ''}:${badge.color ?? ''}:${badge.isInherited ?? false}`;
	}

	function badgeTitle(badge: NodeBadge, inherited = false): string {
		if (badge.title) return badge.title;
		const label = badge.text ?? '';
		const prefix = inherited ? 'Hidden child ' : '';
		if (badge.queueIndex === undefined) return `${prefix}${label}`.trim();
		return `${prefix}${label} - click to remove from queue`.trim();
	}

	function badgeAriaLabel(badge: NodeBadge, inherited = false): string {
		return badge.ariaLabel ?? badgeTitle(badge, inherited);
	}

	function badgeIsActionable(badge: NodeBadge): boolean {
		return badge.queueIndex !== undefined || typeof badge.onClick === 'function';
	}

	function inheritedBadgeTitle(badges: NodeBadge[]): string {
		return `${badges.length} hidden descendant badge${badges.length === 1 ? '' : 's'}`;
	}

	function handleBadgePress(e: MouseEvent | KeyboardEvent, badge: NodeBadge) {
		if (!badgeIsActionable(badge)) return;
		e.stopPropagation();
		e.preventDefault();
		if (badge.queueIndex !== undefined) {
			onBadgeDoubleClick?.(badge.queueIndex);
			return;
		}
		badge.onClick?.();
	}

	function handleBadgeKeydown(e: KeyboardEvent, badge: NodeBadge) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleBadgePress(e, badge);
		}
	}

	function focus(el: HTMLInputElement) {
		el.focus();
		el.select();
	}

	function updateRowHeight() {
		if (!outerEl) return;
		const value = parseFloat(getComputedStyle(outerEl).getPropertyValue('--vm-tree-row-h'));
		if (value > 0) rowHeight = value;
	}

	function scheduleRowHeightUpdate() {
		if (typeof requestAnimationFrame === 'undefined') {
			updateRowHeight();
			return;
		}
		if (rowHeightFrame !== null) return;
		rowHeightFrame = requestAnimationFrame(() => {
			rowHeightFrame = null;
			updateRowHeight();
		});
	}

	function observeTreeRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		let rectFrame: number | null = null;
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || TREE_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || TREE_FALLBACK_HEIGHT,
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

	function flattenTreeNodes(items: readonly TreeNode[], expanded: ReadonlySet<string>): FlatNode[] {
		const out: FlatNode[] = [];
		const walk = (list: readonly TreeNode[], depth: number): void => {
			for (const node of list) {
				const hasChildren = !!node.children && node.children.length > 0;
				const isExpanded = hasChildren && expanded.has(node.id);
				out.push({ node, depth, isExpanded, hasChildren });
				if (isExpanded) walk(node.children!, depth + 1);
			}
		};
		walk(items, 0);
		return out;
	}

	function treeVirtualItemKey(items: readonly FlatNode[], index: number): string | number {
		return items[index]?.node.id ?? index;
	}
</script>

<div
	bind:this={outerEl}
	class="vm-tree-virtual-outer"
	onscroll={onScroll}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	role="tree"
	aria-multiselectable="true"
	tabindex="-1"
	style={viewSizeStyle}
>
	<div class="vm-tree-virtual-inner" style="--vm-tree-total-h: {totalH}px">
		{#each renderedVirtualRows as virtualRow (virtualRow.key)}
			{@const flat = flatArray[virtualRow.index]}
			{@const node = flat.node}
			{@const isActive = activeFilterIds?.has(node.id) ?? false}
			{@const isWarning = warningIds?.has(node.id) ?? false}
			{@const isEditing = editingId === node.id}
			{@const isHighlighted = searchHighlightIds?.has(node.id) ?? false}
			{@const isSelected = selectedIds?.has(node.id) ?? false}
			{@const isFocused = focusedId === node.id}
			{@const directBadges = ownBadges(node)}
			{@const childBadges = inheritedBadges(node)}
			{@const hoverBadges = hoverBadgesFor(node)}

			<div
				class="vm-tree-virtual-row {node.cls ?? ''}"
				class:is-active-filter={isActive}
				class:is-selected={isSelected}
				class:is-focused={isFocused}
				class:vm-badge-warning={isWarning}
				class:vm-search-highlight={isHighlighted}
				class:is-editing={isEditing}
				style="--vm-tree-y: {virtualRow.start}px; --depth: {flat.depth}"
				data-id={node.id}
				onclick={(e) => handleRowClick(e, node.id)}
				onauxclick={(e) => handleRowAuxClick(e, node.id)}
				oncontextmenu={(e) => onContextMenu(node.id, e)}
				onkeydown={(e) => handleKeydown(e, node.id)}
				role="treeitem"
				aria-selected={isSelected}
				tabindex="0"
				aria-expanded={flat.hasChildren ? flat.isExpanded : undefined}
			>
				<div
					class="vm-tree-row-surface"
					class:is-active-filter={isActive}
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:vm-badge-warning={isWarning}
					class:vm-search-highlight={isHighlighted}
					class:is-editing={isEditing}
				>
					<!-- Chevron / Spacer -->
					<div
						class="vm-tree-toggle"
						onclick={(e) => {
							e.stopPropagation();
							if (flat.hasChildren) onToggle(node.id);
						}}
						onkeydown={() => {}}
						role="button"
						tabindex="-1"
					>
						{#if flat.hasChildren}
							<span use:icon={flat.isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}
							></span>
						{/if}
					</div>

					<!-- Icon -->
					{#if node.icon}
						<span class="vm-tree-icon" use:icon={node.icon}></span>
					{:else}
						<span class="vm-tree-icon-placeholder" aria-hidden="true"></span>
					{/if}

					<!-- Label / Input -->
					{#if isEditing}
						<input
							class="vm-tree-input"
							value={node.label}
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => handleInputKeydown(e, node.id, e.currentTarget)}
							onblur={() => onCancelRename?.()}
							use:focus
						/>
					{:else}
						<span class="vm-tree-label">
							{#if node.labelPrefix}<span class="vm-tree-label-prefix">{node.labelPrefix}</span
								>{/if}<HighlightText text={node.label} ranges={node.highlights ?? []} />
						</span>
					{/if}

					<!-- Badges / Counts -->
					{#if node.countLabel || (node.count != null && node.count > 0) || directBadges.length > 0 || childBadges.length > 0 || hoverBadges.length > 0}
						<div class="vm-tree-badge-zone">
							{#if hoverBadges.length > 0}
								<div class="vm-tree-hover-badge-zone">
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
							{#if directBadges.length > 0}
								{#each directBadges as badge, badgeIndex (badgeKey(badge, badgeIndex))}
									<div
										class="vm-badge"
										role="button"
										class:is-solid={badge.solid}
										class:is-undoable={badge.queueIndex !== undefined}
										class:is-actionable={badgeIsActionable(badge)}
										class:is-quick-action={badge.quickAction}
										class:vm-badge--red={badge.solid && badge.color === 'red'}
										class:vm-badge--blue={badge.solid && badge.color === 'blue'}
										class:vm-badge--purple={badge.solid && badge.color === 'purple'}
										class:vm-badge--orange={badge.solid && badge.color === 'orange'}
										class:vm-badge--green={badge.solid && badge.color === 'green'}
										title={badgeTitle(badge)}
										aria-label={badgeAriaLabel(badge)}
										tabindex={badgeIsActionable(badge) ? 0 : -1}
										onclick={(e) => handleBadgePress(e, badge)}
										onkeydown={(e) => handleBadgeKeydown(e, badge)}
									>
										{#if badge.icon}
											<span class="vm-badge-icon" use:icon={badge.icon}></span>
										{/if}
									</div>
								{/each}
							{/if}

							{#if childBadges.length > 0}
								<div class="vm-tree-child-badge-indicator" title={inheritedBadgeTitle(childBadges)}>
									<span class="vm-tree-child-badge-dot"></span>
									<div class="vm-tree-child-badge-pill">
										{#each childBadges as badge, badgeIndex (badgeKey(badge, badgeIndex))}
											<div
												class="vm-badge"
												role="button"
												class:is-solid={badge.solid}
												class:is-inherited={badge.isInherited}
												class:is-undoable={badge.queueIndex !== undefined}
												class:is-actionable={badgeIsActionable(badge)}
												class:is-quick-action={badge.quickAction}
												class:vm-badge--red={badge.solid && badge.color === 'red'}
												class:vm-badge--blue={badge.solid && badge.color === 'blue'}
												class:vm-badge--purple={badge.solid && badge.color === 'purple'}
												class:vm-badge--orange={badge.solid && badge.color === 'orange'}
												class:vm-badge--green={badge.solid && badge.color === 'green'}
												title={badgeTitle(badge, true)}
												aria-label={badgeAriaLabel(badge, true)}
												tabindex={badgeIsActionable(badge) ? 0 : -1}
												onclick={(e) => handleBadgePress(e, badge)}
												onkeydown={(e) => handleBadgeKeydown(e, badge)}
											>
												{#if badge.icon}
													<span class="vm-badge-icon" use:icon={badge.icon}></span>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if node.countLabel}
								<span class="vm-tree-count">{node.countLabel}</span>
							{:else if node.count != null && node.count > 0}
								<span class="vm-tree-count">{node.count}</span>
							{/if}
						</div>
					{/if}
				</div>
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
