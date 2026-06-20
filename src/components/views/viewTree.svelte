<script lang="ts" generics="TMeta = unknown">
	import { getContext } from 'svelte';
	import { SharedVirtualLayout } from '../../services/serviceSharedVirtualLayout.svelte';
	import type { NodeBadge, TreeNode } from '../../types/typeNode';
	import type { ExplorerRevealTarget } from '../../types/typeExplorerDataPlane';
	import { getActivePerfProbe } from '../../dev/perfProbe';
	import NodeRow from './NodeRow.svelte';
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
		buildRowInputIdIndex,
		rowInputCallbackId,
		rowInputFromTreeNode,
		rowInputToTreeNode,
		rowInputVirtualKey,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import { createExplorerScrollGeometry } from '../../services/serviceExplorerScrollGeometry';
	import {
		handleNodeBadgePress,
		inheritedNodeBadges,
		ownNodeBadges,
	} from './nodeBadgeHelpers';
	import {
		DEFAULT_NODE_ELEMENT_MASK,
		visibleNodeBadgesForMask,
	} from './nodeElementMask';
	import {
		NODE_ELEMENT_MASK_KEY,
		PRESET_KEY,
		type NodeElementMaskContextValue,
		type PresetContextValue,
	} from '../explorer/viewHostContext';
	import {
		explorerViewContract,
		type NativeClassVocabulary,
	} from '../../services/serviceExplorerViewContract';
	import { createRowAction, type RowProps, type RowState } from '../../services/serviceRowAction';
	import type { DndViewState } from '../../services/serviceDnd';
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const DEFAULT_VIEW_SIZE = getViewSizePreset(DEFAULT_VIEW_SIZE_PRESET);
	const TREE_ROW_HEIGHT = DEFAULT_VIEW_SIZE.treeRowHeight;
	const TREE_FALLBACK_WIDTH = 320;
	const TREE_FALLBACK_HEIGHT = 400;
	const TREE_STICKY_MAX_ROWS = 7;
	const TREE_STICKY_MAX_VIEWPORT_RATIO = 0.4;
	type ScrollTarget = ExplorerRevealTarget;

	interface FlatNode<TMeta = unknown> {
		node: TreeNode<TMeta>;
		depth: number;
		isExpanded: boolean;
		hasChildren: boolean;
	}

	interface TreeFlatNode extends FlatNode<TMeta> {
		row: ExplorerRowInput<TMeta>;
		index: number;
		parentIndex: number | null;
		ancestorIndices: number[];
		subtreeEndIndex: number;
	}

	interface TreeRowNode {
		row: ExplorerRowInput<TMeta>;
		node: TreeNode<TMeta>;
		children: TreeRowNode[];
	}

	interface StickyTreeRow {
		flat: TreeFlatNode;
		key: string;
		top: number;
	}

	interface Props {
		nodes: TreeNode<TMeta>[];
		rowInputs?: readonly ExplorerRowInput<TMeta>[];
		projection?: ExplorerProjection<TMeta>;
		expandedIds: Set<string>;
		selectedIds?: Set<string>;
		focusedId?: string | null;
		onToggle: (id: string, e?: MouseEvent | KeyboardEvent) => void;
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
		scrollTarget?: ScrollTarget | null;
		snapshotRevision?: number | null;
		idToIndex?: ReadonlyMap<string, number> | null;
		resolveIndexById?: (id: string) => number | null | undefined;
		mouseGestureConfig?: MouseGestureConfig;
		sizePresetId?: ViewSizePresetId;
		providerId?: string;
		visibleFields?: readonly string[];
		stickyTopOffset?: number;
		dndStateForId?: (id: string) => DndViewState | undefined;
		themeService?: ThemeService;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		rowInputs,
		projection,
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
		scrollTarget = null,
		snapshotRevision = null,
		idToIndex = null,
		resolveIndexById,
		mouseGestureConfig,
		sizePresetId = DEFAULT_VIEW_SIZE_PRESET,
		providerId = 'nodes',
		visibleFields = [],
		stickyTopOffset = 0,
		dndStateForId,
		themeService = undefined,
		icon,
	}: Props = $props();

	const presetCtx = getContext<PresetContextValue | undefined>(PRESET_KEY);
	const presetUseNativeDom = $derived(presetCtx?.value().useNativeDom);
	const useNativeDom = $derived(presetUseNativeDom ?? themeService?.useNativeDom ?? false);
	const nativeVocab = $derived<NativeClassVocabulary | null>(
		useNativeDom ? explorerViewContract('tree').nativeDomEmission.panel : null,
	);
	const treeFeatures = explorerViewContract('tree').features;
	const treeInnerClass = $derived(
		['vm-tree-virtual-inner', nativeVocab?.childrenContainer].filter(Boolean).join(' '),
	);
	const effectiveProviderId = $derived(projection?.providerId ?? providerId);
	const rowAction = $derived(
		createRowAction({
			explorerId: effectiveProviderId,
			role: 'treeitem',
			features: treeFeatures,
			contract: {
				onToggle,
				onContextMenu,
				onRowKeydown,
			},
		}),
	);
	const projectionRowInputs = $derived(projection ? rowInputsFromProjection(projection) : undefined);
	const effectiveRowInputs = $derived(projectionRowInputs ?? rowInputs);
	const effectiveSnapshotRevision = $derived(snapshotRevision ?? projection?.rowsRevision ?? null);
	const effectiveIdToIndex = $derived(idToIndex ?? projection?.idToIndex ?? null);
	const maskCtx = getContext<NodeElementMaskContextValue | undefined>(NODE_ELEMENT_MASK_KEY);
	const nodeElementMask = $derived(maskCtx?.value() ?? DEFAULT_NODE_ELEMENT_MASK);
	const effectiveVisibleFields = $derived(
		visibleFields.length > 0 ? visibleFields : defaultVisibleFields(effectiveProviderId, 'tree'),
	);
	const showNodeIcon = $derived(nodeElementMask.icon && isNodeIconVisible(effectiveVisibleFields));
	const showNodeText = $derived(
		nodeElementMask.label && isNodeTextVisible(effectiveProviderId, 'tree', effectiveVisibleFields),
	);
	const showNodeCount = $derived(
		nodeElementMask.badges.counts && isNodeCountVisible(effectiveVisibleFields),
	);

	function hoverBadgesFor(id: string): BadgeDescriptor[] {
		// Hover badges are an opt-in feature. Adapters that have not wired
		// the registry yet (or unit tests that mount the view in isolation)
		// pass no `activeOpsByNode` and we render no hover badges.
		if (!activeOpsByNode || !nodeElementMask.actions) return [];
		return visibleHoverBadgeDescriptors({ id }, activeOpsByNode);
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

	function iconForNode(node: TreeNode, flat: FlatNode): string | undefined {
		if (!node.icon) return undefined;
		if (flat.hasChildren && flat.isExpanded && node.icon === 'lucide-folder') {
			return 'lucide-folder-open';
		}
		return node.icon;
	}

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

	function indentGuideDepths(depth: number): number[] {
		return Array.from({ length: Math.max(0, depth) }, (_, index) => index);
	}

	let outerEl: HTMLDivElement | undefined = $state();
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let capturedSelectionPointerId: number | null = null;
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;
	let consumedScrollTargetSerial: number | null = null;
	const mouse = createMouseGestureService();
	const viewSize = $derived(getViewSizePreset(sizePresetId));
	const viewSizeStyle = $derived(viewSizeCssVars(viewSize));
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	const treeRows = $derived(
		projectionRowInputs ? [] : treeRowsFromInputs(nodes, effectiveRowInputs),
	);
	const flatArray = $derived(
		projectionRowInputs
			? flatProjectionRows(projectionRowInputs, expandedIds)
			: flattenMeasured(treeRows, expandedIds),
	);
	const flatRowInputs = $derived(flatArray.map((flat) => flat.row));
	const flatIdToIndex = $derived(buildRowInputIdIndex(flatRowInputs));

	// Shared render-runtime (V.D): the pure-core fixed geometry is the AUTHORITATIVE window
	// source — no fallbackFixedVirtualRows cover-check. `layout.attach` wires scroll/resize and
	// owns the @tanstack/svelte-virtual seam. `flatArray`/`flatRowInputs` are read lazily through
	// the option getters so the controller stays in sync with the reactive projection.
	const layout = new SharedVirtualLayout({
		rowCount: () => flatArray.length,
		estimateSize: () => TREE_ROW_HEIGHT,
		getKey: (index) => treeVirtualItemKey(flatRowInputs, index),
		resolveId: (index) => {
			const flat = flatArray[index];
			return flat ? rowInputCallbackId(flat.row) : undefined;
		},
		rowHeightVar: '--vm-tree-row-h',
		fallbackViewportHeight: TREE_FALLBACK_HEIGHT,
		fallbackWidth: TREE_FALLBACK_WIDTH,
	});
	const stickyRows = $derived(
		computeStickyRows(flatArray, layout.scrollTop, layout.viewportHeight, layout.rowHeight),
	);

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		if (target.serial === consumedScrollTargetSerial) return;
		const index = resolveRevealIndex(target);
		if (index < 0) return;
		consumedScrollTargetSerial = target.serial;
		layout.scrollToIndex(index, target.align ?? 'auto');
	});

	function onScroll() {
		getActivePerfProbe()?.count('viewTree.scroll', {
			rows: flatArray.length,
			visibleRows: layout.rows.length,
		});
	}

	function resolveRevealIndex(target: ScrollTarget): number {
		return (
			getActivePerfProbe()?.measure(
				'explorerDataPlane.reveal.lookup',
				{ rows: flatArray.length },
				() => resolveRevealIndexNow(target),
			) ?? resolveRevealIndexNow(target)
		);
	}

	function resolveRevealIndexNow(target: ScrollTarget): number {
		const externalIdToIndex = effectiveIdToIndex;
		const mappedIndex = externalIdToIndex?.get(target.id);
		const resolvedIdToIndex =
			externalIdToIndex &&
			typeof mappedIndex === 'number' &&
			flatRowInputs[mappedIndex]?.id === target.id
				? externalIdToIndex
				: flatIdToIndex;
		const coordinator = createExplorerScrollGeometry({
			idToIndex: resolvedIdToIndex,
			rowHeight: layout.rowHeight,
			rowCount: flatRowInputs.length,
			revision: effectiveSnapshotRevision ?? undefined,
			resolveIndexById,
		});
		const resolved = coordinator.resolve({
			kind: 'id',
			id: target.id,
			reason: target.reason ?? 'selection',
			align: target.align,
			minRevision: target.minSnapshotRevision,
		});
		if (!resolved) return -1;
		return flatRowInputs[resolved.index]?.id === target.id ? resolved.index : -1;
	}

	function flattenMeasured(items: readonly TreeRowNode[], expanded: ReadonlySet<string>): TreeFlatNode[] {
		return (
			getActivePerfProbe()?.measure('viewTree.flatten', { nodes: items.length }, () =>
				flattenTreeRows(items, expanded),
			) ?? flattenTreeRows(items, expanded)
		);
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

	function treeRowProps(id: string, state: RowState): RowProps {
		const props = rowAction.getRowProps(id, state);
		if (onRowKeydown) return props;
		return {
			...props,
			onkeydown: (e) => {
				if (e.key === 'Enter') onPrimaryAction?.(id, e as unknown as MouseEvent);
			},
		};
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
		if (e.button !== 0 || !outerEl || !onBoxSelect || shouldIgnoreBoxStart(e.target)) return;
		dragStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
		selectionBox = null;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragStart || !outerEl || e.pointerId !== dragStart.pointerId) return;
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (!selectionBox && Math.hypot(dx, dy) < 4) return;
		e.preventDefault();
		if (!selectionBox) capturePointer(e.pointerId);
		selectionBox = makeSelectionBox(dragStart.x, dragStart.y, e.clientX, e.clientY);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragStart || e.pointerId !== dragStart.pointerId) return;
		const box = selectionBox;
		releasePointer(e.pointerId);
		dragStart = null;
		selectionBox = null;
		if (!box) return;
		const ids = layout.idsInRect({ top: box.top, bottom: box.top + box.height });
		suppressNextClick = true;
		if (ids.length > 0) onBoxSelect?.(ids, e);
	}

	function handlePointerCancel() {
		if (dragStart) releasePointer(dragStart.pointerId);
		dragStart = null;
		selectionBox = null;
	}

	function releasePointer(pointerId: number) {
		if (capturedSelectionPointerId !== pointerId) return;
		capturedSelectionPointerId = null;
		if (!outerEl?.hasPointerCapture(pointerId)) return;
		outerEl.releasePointerCapture(pointerId);
	}

	function capturePointer(pointerId: number) {
		if (!outerEl) return;
		try {
			outerEl.setPointerCapture(pointerId);
			capturedSelectionPointerId = pointerId;
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

	function flatProjectionRows(
		inputs: readonly ExplorerRowInput<TMeta>[],
		expanded: ReadonlySet<string>,
	): TreeFlatNode[] {
		const indexById = new Map(inputs.map((row, index) => [row.id, index]));
		const visibleChildParentIds = new Set(
			inputs.map((row) => row.parentId).filter((id): id is string => Boolean(id)),
		);
		const flats: TreeFlatNode[] = inputs.map((row, index) => {
			const node = rowInputToTreeNode(row);
			const hasChildren =
				(row.childrenIds?.length ?? 0) > 0 ||
				(node.children?.length ?? 0) > 0 ||
				visibleChildParentIds.has(row.id);
			return {
				row,
				node,
				depth: row.depth,
				isExpanded: hasChildren && (expanded.has(rowInputCallbackId(row)) || visibleChildParentIds.has(row.id)),
				hasChildren,
				index,
				parentIndex: null,
				ancestorIndices: [],
				subtreeEndIndex: index,
			};
		});

		for (const flat of flats) {
			const parentIndex =
				flat.row.parentId === null || flat.row.parentId === undefined
					? null
					: (indexById.get(flat.row.parentId) ?? null);
			flat.parentIndex = parentIndex;
			if (parentIndex !== null) {
				const parent = flats[parentIndex];
				flat.ancestorIndices = [...parent.ancestorIndices, parent.index];
			}
			let subtreeEndIndex = flat.index;
			for (let index = flat.index + 1; index < flats.length; index += 1) {
				if (flats[index].depth <= flat.depth) break;
				subtreeEndIndex = index;
			}
			flat.subtreeEndIndex = subtreeEndIndex;
		}

		return flats;
	}

	function inheritedBadgeTitle(badges: NodeBadge[]): string {
		return `${badges.length} hidden descendant badge${badges.length === 1 ? '' : 's'}`;
	}

	function handleBadgePress(e: MouseEvent | KeyboardEvent, badge: NodeBadge) {
		handleNodeBadgePress(e, badge, onBadgeDoubleClick);
	}

	function handleBadgeKeydown(e: KeyboardEvent, badge: NodeBadge) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleBadgePress(e, badge);
		}
	}

	function treeRowsFromInputs(
		items: readonly TreeNode<TMeta>[],
		inputs: readonly ExplorerRowInput<TMeta>[] | undefined,
	): TreeRowNode[] {
		return inputs === undefined ? treeRowsFromNodes(items) : treeRowsFromRowInputs(inputs);
	}

	function treeRowsFromNodes(items: readonly TreeNode<TMeta>[]): TreeRowNode[] {
		return items.map((node) => {
			const children = treeRowsFromNodes(node.children ?? []);
			const row = rowInputFromTreeNode(node);
			return { row, node, children };
		});
	}

	function treeRowsFromRowInputs(inputs: readonly ExplorerRowInput<TMeta>[]): TreeRowNode[] {
		const byId = new Map(inputs.map((row) => [row.id, row]));
		const childrenByParent = new Map<string, ExplorerRowInput<TMeta>[]>();
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

		const built = new Map<string, TreeRowNode>();
		const building = new Set<string>();
		const build = (row: ExplorerRowInput<TMeta>): TreeRowNode => {
			const existing = built.get(row.id);
			if (existing) return existing;
			if (building.has(row.id)) return treeRowNode(row, []);
			building.add(row.id);
			const explicitChildren =
				row.childrenIds
					?.map((childId) => byId.get(childId))
					.filter((child): child is ExplorerRowInput<TMeta> => Boolean(child)) ?? [];
			const childRows =
				explicitChildren.length > 0 ? explicitChildren : (childrenByParent.get(row.id) ?? []);
			const children =
				childRows.length > 0
					? childRows.map(build)
					: treeRowsFromNodes(row.node.children ?? []);
			const node = treeRowNode(row, children);
			building.delete(row.id);
			built.set(row.id, node);
			return node;
		};

		return inputs.filter((row) => !referencedChildIds.has(row.id)).map(build);
	}

	function treeRowNode(row: ExplorerRowInput<TMeta>, children: TreeRowNode[]): TreeRowNode {
		const node = rowInputToTreeNode(row);
		node.children = children.length > 0 ? children.map((child) => child.node) : undefined;
		return { row, node, children };
	}

	function flattenTreeRows(items: readonly TreeRowNode[], expanded: ReadonlySet<string>): TreeFlatNode[] {
		const out: TreeFlatNode[] = [];
		const walk = (
			list: readonly TreeRowNode[],
			depth: number,
			parentIndex: number | null,
			ancestorIndices: number[],
		): void => {
			for (const rowNode of list) {
				const hasChildren = rowNode.children.length > 0;
				const id = rowInputCallbackId(rowNode.row);
				const isExpanded = hasChildren && expanded.has(id);
				const index = out.length;
				const flat: TreeFlatNode = {
					row: rowNode.row,
					node: rowNode.node,
					depth,
					isExpanded,
					hasChildren,
					index,
					parentIndex,
					ancestorIndices,
					subtreeEndIndex: index,
				};
				out.push(flat);
				if (isExpanded) walk(rowNode.children, depth + 1, index, [...ancestorIndices, index]);
				flat.subtreeEndIndex = out.length - 1;
			}
		};
		walk(items, 0, null, []);
		return out;
	}

	function computeStickyRows(
		items: readonly TreeFlatNode[],
		scrollTop: number,
		viewportHeight: number,
		height: number,
	): StickyTreeRow[] {
		if (items.length === 0 || scrollTop <= 0 || height <= 0 || viewportHeight <= 0) return [];
		const firstVisibleIndex = Math.min(items.length - 1, Math.max(0, Math.floor(scrollTop / height)));
		const firstVisible = items[firstVisibleIndex];
		if (!firstVisible) return [];

		const maxRowsByViewport = Math.floor((viewportHeight * TREE_STICKY_MAX_VIEWPORT_RATIO) / height);
		const maxRows = Math.max(1, Math.min(TREE_STICKY_MAX_ROWS, maxRowsByViewport));
		const candidateIndices =
			firstVisible.hasChildren && firstVisible.isExpanded
				? [...firstVisible.ancestorIndices, firstVisible.index]
				: firstVisible.ancestorIndices;

		return candidateIndices
			.map((ancestorIndex) => items[ancestorIndex])
			.filter((flat): flat is TreeFlatNode => {
				if (!flat?.hasChildren || !flat.isExpanded) return false;
				const originalTop = flat.index * height;
				const subtreeBottom = (flat.subtreeEndIndex + 1) * height;
				return originalTop < scrollTop && subtreeBottom > scrollTop;
			})
			.slice(0, maxRows)
			.map((flat, stickyIndex) => {
				const preferredTop = stickyIndex * height;
				const subtreeBottom = (flat.subtreeEndIndex + 1) * height;
				const top = Math.min(preferredTop, subtreeBottom - scrollTop - height);
				return {
					flat,
					key: `sticky:${rowInputCallbackId(flat.row)}`,
					top,
				};
			})
			.filter((row) => row.top + height > 0);
	}

	function treeVirtualItemKey(
		items: readonly ExplorerRowInput<TMeta>[],
		index: number,
	): string | number {
		return rowInputVirtualKey(items, index);
	}

</script>

{#snippet treeRow(flat: TreeFlatNode, y: number, sticky: boolean)}
	{@const row = flat.row}
	{@const node = flat.node}
	{@const id = rowInputCallbackId(row)}
	{@const isActive = activeFilterIds?.has(id) ?? false}
	{@const isWarning = warningIds?.has(id) ?? false}
	{@const isEditing = editingId === id}
	{@const isHighlighted = searchHighlightIds?.has(id) ?? false}
	{@const isSelected = selectedIds?.has(id) ?? false}
	{@const isFocused = focusedId === id}
	{@const directBadges = visibleNodeBadgesForMask(ownNodeBadges(node), nodeElementMask)}
	{@const childBadges = visibleNodeBadgesForMask(inheritedNodeBadges(node), nodeElementMask)}
	{@const hoverBadges = hoverBadgesFor(id)}
	{@const rowIcon = showNodeIcon ? iconForNode(node, flat) : undefined}
	{@const fieldValues = nodeElementMask.detail
		? visibleNodeFieldValues(effectiveProviderId, 'tree', node, effectiveVisibleFields)
		: []}
	{@const dndState = dndStateForId?.(id)}

	<div
		class="vm-tree-virtual-row {sticky ? 'vm-tree-sticky-row' : ''} {node.cls ?? ''} {nativeVocab?.rowRoot ??
			''} {rowStateClassString({ isSelected, isFocused, isActive }, dndState)}"
		class:is-active-filter={isActive}
		class:is-selected={isSelected}
		class:is-focused={isFocused}
		class:vm-badge-warning={isWarning}
		class:vm-search-highlight={isHighlighted}
		class:is-editing={isEditing}
		style="--vm-tree-y: {y}px; --depth: {flat.depth}"
		data-id={id}
		data-index={flat.index}
		data-vm-virtual-index={flat.index}
		data-vm-total-rows={flatArray.length}
		data-sticky={sticky ? 'true' : undefined}
		onclick={(e) => handleRowClick(e, id)}
		onauxclick={(e) => handleRowAuxClick(e, id)}
		{...treeRowProps(id, {
			selected: isSelected,
			focused: isFocused,
			expandable: flat.hasChildren,
			expanded: flat.isExpanded,
		})}
	>
		<NodeRow
			label={node.label}
			labelPrefix={node.labelPrefix}
			highlights={node.highlights ?? []}
			iconName={rowIcon}
			fields={fieldValues}
			count={showNodeCount ? node.count : null}
			countLabel={showNodeCount ? node.countLabel : null}
			showLabel={showNodeText}
			editing={isEditing}
			onRename={(value) => onRename?.(id, value)}
			{onCancelRename}
			{directBadges}
			{childBadges}
			{hoverBadges}
			childBadgeTitle={inheritedBadgeTitle(childBadges)}
			onBadgePress={handleBadgePress}
			onBadgeKeydown={handleBadgeKeydown}
			onHoverBadgePress={(e, kind) => handleHoverBadgePress(e, id, kind)}
			onHoverBadgeKeydown={(e, kind) => handleHoverBadgeKeydown(e, id, kind)}
			{isSelected}
			{isFocused}
			isActiveFilter={isActive}
			{isWarning}
			{isHighlighted}
			hasToggle={flat.hasChildren}
			isExpandedParent={flat.isExpanded}
			{dndState}
			{nativeVocab}
			{icon}
		>
			{#snippet leading()}
				{#if flat.depth > 0}
					<div class="vm-tree-indent-guides" aria-hidden="true">
						{#each indentGuideDepths(flat.depth) as guideDepth (guideDepth)}
							<span class="vm-tree-indent-guide" style="--guide-depth: {guideDepth}"></span>
						{/each}
					</div>
				{/if}

				{#if flat.hasChildren}
					<div
						class="vm-tree-toggle {nativeVocab?.collapseIcon ?? ''}"
						{...rowAction.getCaretProps(id)}
					>
						<span use:icon={flat.isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}></span>
					</div>
				{:else}
					<div
						class="vm-tree-toggle is-placeholder {nativeVocab?.collapseIcon ?? ''}"
						aria-hidden="true"
					></div>
				{/if}
			{/snippet}
		</NodeRow>
	</div>
{/snippet}

<div
	bind:this={outerEl}
	{@attach layout.attach}
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
	{#if stickyRows.length > 0}
		<div
			class="vm-tree-sticky-layer"
			style="--vm-tree-sticky-scroll-y: {layout.scrollTop}px; --vm-tree-sticky-top-offset: {stickyTopOffset}px"
		>
			{#each stickyRows as stickyRow (stickyRow.key)}
				{@render treeRow(stickyRow.flat, stickyRow.top, true)}
			{/each}
		</div>
	{/if}
	<div class={treeInnerClass} style="--vm-tree-total-h: {layout.totalHeight}px">
		{#each layout.rows as virtualRow (virtualRow.key)}
			{@render treeRow(flatArray[virtualRow.index], virtualRow.start, false)}
		{/each}
	</div>
	{#if selectionBox}
		<div
			class="vm-selection-box"
			style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
		></div>
	{/if}
</div>
