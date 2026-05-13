<script lang="ts" generics="TMeta = unknown">
	import type { TFile } from 'obsidian';
	import { untrack } from 'svelte';
	import { SvelteSet, createSubscriber } from 'svelte/reactivity';
	import type { VaultmanPlugin } from '../../main';
	import type {
		ExplorerExpansionCommand,
		ExplorerExpansionSummary,
		ExplorerProvider,
		ExplorerViewMode,
		PanelExplorerImperativeApi,
	} from '../../types/typeExplorer';
	import type { INodeSelectionService, NodeSelectionSnapshot } from '../../types/typeSelection';
	import type { ViewEmptyState } from '../../types/typeViews';
	import type { ExplorerRevealTarget } from '../../types/typeExplorerDataPlane';
	import GridNavigationToolbar from '../layout/GridNavigationToolbar.svelte';
	import ViewTree from '../views/viewTree.svelte';
	import ViewNodeCards from '../views/ViewNodeCards.svelte';
	import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
	import ViewNodeTable from '../views/ViewNodeTable.svelte';
	import ViewMarkmap from '../views/ViewMarkmap.svelte';
	import ViewSvarFileManager from '../views/ViewSvarFileManager.svelte'; //temp
	import ViewEmptyLanding from '../views/viewEmptyLanding.svelte';
	import { getActivePerfProbe } from '../../dev/perfProbe';
	import {
		nodeRowsFromTree,
		nodeTableColumnsForProvider,
	} from '../../services/serviceViewTableAdapter';
	import { NodeSelectionService } from '../../services/serviceSelection.svelte';
	import type { TreeNode } from '../../types/typeNode';
	import { bubbleHiddenTreeBadges } from '../../utils/utilBadgeBubbling';
	import { collectAutoExpandedIds, resolveExpandedIds } from '../../utils/utilExplorerExpansion';
	import {
		activeBadges,
		badgeKindFromNodeBadge,
		detectBadgeContradictions,
		type ActiveOpsByNode,
		type BadgeKind,
	} from '../../badges/serviceBadge';
	import { serviceMessage } from '../../services/serviceMessage';
	import { applyManualNodeReorder } from '../../services/serviceManualDnd';
	import type { DndDropResult } from '../../services/serviceDnd';
	import {
		LEGACY_NODE_MOUSE_ACTIONS,
		resolveNodeMouseActions,
		type NodeMouseAction,
	} from '../../services/serviceMouse';
	import { nodeToBindingInput, type BindingNodeKind } from '../../services/serviceNodeBinding';

	type ScrollTarget = ExplorerRevealTarget;

	let {
		plugin,
		provider,
		viewMode = $bindable('tree'),
		searchTerm = $bindable(''),
		searchMode = 0,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		sortTarget = 'top',
		addMode = false,
		active = true,
		showSelectedOnly = false,
		showHiddenFiles = false,
		manualDndEnabled = false,
		selectedFiles = $bindable(new Set<string>()),
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
		onImperativeApiReady,
		visibleFields = [],
		icon,
	}: {
		plugin: VaultmanPlugin;
		provider: ExplorerProvider<TMeta>;
		viewMode?: ExplorerViewMode;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		sortTarget?: 'top' | 'children';
		addMode?: boolean;
		active?: boolean;
		showSelectedOnly?: boolean;
		showHiddenFiles?: boolean;
		manualDndEnabled?: boolean;
		selectedFiles?: Set<string>;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		/**
		 * Receives the panel's imperative API (currently `focusFirstNode`).
		 * Used by the `vaultman:open` command to land keyboard focus on the
		 * first virtual row immediately after revealing the leaf.
		 */
		onImperativeApiReady?: (api: PanelExplorerImperativeApi) => void;
		visibleFields?: readonly string[];
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	const PAGE_NAVIGATION_STEP = 10;

	let nodes = $state<TreeNode<TMeta>[]>([]);
	let flatFiles = $state<TFile[]>([]);
	let rootEl: HTMLDivElement | undefined = $state();
	let scrollTarget = $state<ScrollTarget | null>(null);
	let scrollTargetSerial = 0;
	let currentGridParentId = $state<string | null>(null);
	let gridBackStack = $state<(string | null)[]>([]);
	let gridForwardStack = $state<(string | null)[]>([]);
	const manualExpandedIds = new SvelteSet<string>();
	const manualCollapsedIds = new SvelteSet<string>();
	const fallbackSelectionService = new NodeSelectionService();
	const selectionService = $derived(
		((plugin as VaultmanPlugin & { selectionService?: INodeSelectionService }).selectionService ??
			fallbackSelectionService) as INodeSelectionService,
	);
	const selectionSnapshot = $derived(selectionService.snapshot(provider.id));
	const selectedNodeIds = $derived(new Set(selectionSnapshot.ids));
	const selectedNodeMap = $derived(selectionSnapshot.selected);
	const focusedNodeId = $derived(selectionSnapshot.focusedId);
	let previousSearchTerm = '';
	const autoExpandedIds = $derived(
		collectAutoExpandedIds(nodes, { searchTerm, smallTreeThreshold: 8 }),
	);
	const expandedIds = $derived(
		resolveExpandedIds({
			manualExpandedIds,
			manualCollapsedIds,
			autoExpandedIds,
		}),
	);
	const expandableNodeIds = $derived(collectExpandableNodeIds(nodes));
	const hasExpandedParents = $derived(expandableNodeIds.some((id) => expandedIds.has(id)));
	const displayNodes = $derived(resolveDisplayNodes(nodes, expandedIds));
	const gridHierarchyMode = $derived.by((): 'folder' | 'inline' => {
		const configured = (
			plugin as VaultmanPlugin & {
				settings?: { gridHierarchyMode?: 'folder' | 'inline' };
			}
		).settings?.gridHierarchyMode;
		return configured === 'inline' ? 'inline' : 'folder';
	});
	const gridExpandedIds = $derived(
		gridHierarchyMode === 'inline' ? manualExpandedIds : expandedIds,
	);
	const currentGridPath = $derived(
		currentGridParentId ? findNodePath(nodes, currentGridParentId) : [],
	);
	const currentGridNodes = $derived(childrenForGridLocation(nodes, currentGridParentId));
	const gridNodes = $derived(
		viewMode === 'grid' ? (gridHierarchyMode === 'folder' ? currentGridNodes : nodes) : [],
	);
	const cardNodes = $derived(viewMode === 'cards' ? nodes : []);
	const markmapNodes = $derived(viewMode === 'markmap' ? nodes : []);
	const tableRows = $derived(viewMode === 'table' ? nodeRowsFromTree(nodes) : []);
	const tableColumns = $derived(nodeTableColumnsForProvider<TMeta>(provider.id, visibleFields));
	const visibleFieldsKey = $derived(visibleFields.join('\u0001'));
	const emptyState = $derived.by(() => resolveEmptyState(viewMode, searchTerm, provider));
	const fallbackItemCount = $derived(flatFiles.length + nodes.length);
	const fallbackState = $derived.by(() =>
		resolveFallbackState(viewMode, fallbackItemCount, emptyState),
	);
	const isTreeEmpty = $derived(viewMode === 'tree' && nodes.length === 0);
	const isGridEmpty = $derived(viewMode === 'grid' && gridNodes.length === 0);
	const isCardsEmpty = $derived(viewMode === 'cards' && cardNodes.length === 0);
	const isMarkmapEmpty = $derived(viewMode === 'markmap' && markmapNodes.length === 0);
	const isTableEmpty = $derived(viewMode === 'table' && tableRows.length === 0);
	const isSvarEmpty = $derived(viewMode === 'svar' && nodes.length === 0); //temp
	let lastCommittedSelectionKey = '';
	let lastExpansionSummaryKey = '';
	let lastExpansionCommandSerial = -1;
	let queueVersion = $state(0);
	const subscribeFilesSnapshot = createSubscriber((update) => {
		const service = plugin.explorerDataPlaneService;
		if (!service) return;
		return service.subscribe('files', update);
	});
	const activeOpsByNode: ActiveOpsByNode = $derived.by(() => {
		// Touch the queue version counter so this derivation re-runs whenever
		// the queue mutates. Memoizing on the version avoids render loops:
		// the map only rebuilds when the queue actually changed.
		void queueVersion;
		const map = new Map<string, Set<BadgeKind>>();
		const walk = (list: TreeNode<TMeta>[]): void => {
			for (const node of list) {
				const kinds = new Set<BadgeKind>();
				for (const badge of node.badges ?? []) {
					if (badge.isInherited || badge.quickAction) continue;
					const kind = badgeKindFromNodeBadge(badge);
					if (kind) kinds.add(kind);
				}
				if (kinds.size > 0) map.set(node.id, kinds);
				if (node.children) walk(node.children);
			}
		};
		walk(nodes);
		return map;
	});
	const nodeMouseActions = $derived.by(() =>
		resolveNodeMouseActions(plugin.settings?.nodeMouseActions, LEGACY_NODE_MOUSE_ACTIONS),
	);
	const filesSnapshot = $derived.by(() => {
		if (provider.id !== 'files') return null;
		subscribeFilesSnapshot();
		return plugin.explorerDataPlaneService?.snapshot('files') ?? null;
	});

	$effect(() => {
		const queue = (
			plugin as VaultmanPlugin & {
				queueService?: { on?: (e: 'changed', cb: () => void) => () => void };
			}
		).queueService;
		if (!queue?.on) return;
		const off = queue.on('changed', () => {
			queueVersion += 1;
		});
		return () => off();
	});

	$effect(() => {
		// React directly to prop changes
		const mode: 'leaf' | 'all' = searchMode === 1 ? 'leaf' : 'all';
		provider.setSearchTerm?.(searchTerm, mode);
		provider.setSortBy?.(sortBy, sortDirection);
		provider.setSortTarget?.(sortTarget);
		provider.setViewMode?.(viewMode);
		provider.setAddMode?.(addMode);
		provider.setShowSelectedOnly?.(showSelectedOnly);
		provider.setShowHiddenFiles?.(showHiddenFiles);
		if (active) untrack(refreshData);
	});

	$effect(() => {
		const normalizedSearch = searchTerm.trim();
		if (normalizedSearch !== previousSearchTerm) {
			manualCollapsedIds.clear();
			previousSearchTerm = normalizedSearch;
		}
	});

	$effect(() => {
		if (!active) return;
		const refresh = () => untrack(refreshData);
		const unsubscribeOperations = plugin.operationsIndex.subscribe(refresh);
		const unsubscribeActiveFilters = plugin.activeFiltersIndex.subscribe(refresh);
		const unsubscribeProvider = provider.subscribe?.(refresh);
		return () => {
			unsubscribeOperations();
			unsubscribeActiveFilters();
			unsubscribeProvider?.();
		};
	});

	$effect(() => {
		if (!active) return;
		const snapshot = selectionService.prune(provider.id, visibleNodeIds());
		untrack(() => commitSelection(snapshot));
	});

	$effect(() => {
		if (viewMode !== 'grid' || gridHierarchyMode !== 'folder') return;
		if (currentGridParentId && !findNodeById(nodes, currentGridParentId)) {
			currentGridParentId = null;
			gridBackStack = [];
			gridForwardStack = [];
		}
	});

	$effect(() => {
		const summary = {
			canToggle: expandableNodeIds.length > 0,
			hasExpandedParents,
		};
		const key = `${summary.canToggle}:${summary.hasExpandedParents}`;
		if (key === lastExpansionSummaryKey) return;
		lastExpansionSummaryKey = key;
		onNodeExpansionSummaryChange?.(summary);
	});

	$effect(() => {
		if (!nodeExpansionCommand || nodeExpansionCommand.serial === lastExpansionCommandSerial) {
			return;
		}
		lastExpansionCommandSerial = nodeExpansionCommand.serial;
		if (nodeExpansionCommand.action === 'expand-all') {
			expandAllParents();
		} else {
			collapseAllParents();
		}
	});

	function refreshData() {
		const probe = getActivePerfProbe();
		if (probe) {
			probe.measure('panelExplorer.refresh.total', undefined, refreshDataNow);
			return;
		}
		refreshDataNow();
	}

	function refreshDataNow() {
		if (viewMode === 'tree') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'grid') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'cards') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'markmap') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'table') {
			nodes = readProviderTree();
			flatFiles = [];
		} else {
			const files = provider.getFiles?.() || [];
			getActivePerfProbe()?.count('panelExplorer.getFiles', { rows: files.length });
			flatFiles = files;
			nodes = files.length === 0 ? readProviderTree() : [];
		}
	}

	function readProviderTree(): TreeNode<TMeta>[] {
		return (
			getActivePerfProbe()?.measure('panelExplorer.getTree', undefined, () => provider.getTree()) ??
			provider.getTree()
		);
	}

	function resolveDisplayNodes(
		items: TreeNode<TMeta>[],
		expanded: ReadonlySet<string>,
	): TreeNode<TMeta>[] {
		return (
			getActivePerfProbe()?.measure(
				'panelExplorer.bubbleHiddenTreeBadges',
				{ nodes: items.length },
				() => bubbleHiddenTreeBadges(items, expanded),
			) ?? bubbleHiddenTreeBadges(items, expanded)
		);
	}

	function handleNodeClick(id: string, e: MouseEvent) {
		runNodeMouseAction(nodeMouseActions.primary, id, e);
	}

	function selectNode(id: string, e: MouseEvent | KeyboardEvent): TreeNode<TMeta> | undefined {
		const node = findNodeById(nodes, id);
		if (!node) return undefined;
		const additive = e.ctrlKey || e.metaKey;
		const range = e.shiftKey;
		commitSelection(
			selectionService.selectPointer(provider.id, visibleNodeIds(), id, { additive, range }),
		);
		return node;
	}

	function handleSecondaryAction(id: string, e: MouseEvent) {
		runNodeMouseAction(nodeMouseActions.secondary, id, e);
	}

	function handleTertiaryAction(id: string, e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		e.stopPropagation();
		runNodeMouseAction(nodeMouseActions.tertiary, id, e);
	}

	function runNodeMouseAction(action: NodeMouseAction, id: string, e: MouseEvent | KeyboardEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		if (action === 'select') {
			selectNode(id, e);
			return;
		}
		if (action !== 'delete') selectNode(id, e);
		if (action === 'filter') {
			provider.handleNodeClick(node);
			return;
		}
		if (action === 'open') {
			openNode(node);
			return;
		}
		if (action === 'node-note') {
			void openNodeNote(node);
			return;
		}
		deleteNode(node, id);
	}

	function openNode(node: TreeNode<TMeta>) {
		if (viewMode === 'grid' && gridHierarchyMode === 'folder' && node.children?.length) {
			navigateGridTo(node.id);
			return;
		}
		activateNode(node);
	}

	function deleteNode(node: TreeNode<TMeta>, id: string) {
		const selectedNodes = selectedNodesForContext(node);
		if (provider.handleNodeTertiaryAction) {
			provider.handleNodeTertiaryAction(node, selectedNodes);
			return;
		}
		void plugin.queueService.requestDelete({
			nodeId: id,
			nodeLabel: node.label,
			enqueueDelete: () =>
				provider.handleHoverBadge?.(node, 'delete', selectedNodesForAction(node)),
		});
	}

	async function openNodeNote(node: TreeNode<TMeta>): Promise<void> {
		const kind = provider.getNodeType?.(node);
		if (!kind || kind === 'file') {
			activateNode(node);
			return;
		}
		const input = nodeToBindingInput(kind as BindingNodeKind, node as TreeNode<unknown>);
		if (!input) return;
		await plugin.nodeBindingService?.bindOrCreate(input);
	}

	function handleContextMenu(id: string, e: MouseEvent) {
		e.preventDefault();
		const node = findNodeById(nodes, id);
		if (!node) return;
		if (!selectedNodeIds.has(id)) {
			commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), id));
		}
		provider.handleContextMenu(node, e, selectedNodesForContext(node));
	}

	function handleRowKeydown(id: string, e: KeyboardEvent) {
		const orderedIds = visibleNodeIds();
		const logicalId = keyboardTargetId(id, orderedIds);
		if (viewMode === 'grid' && gridHierarchyMode === 'folder' && handleGridNavigationKeydown(e)) {
			return;
		}
		if (
			viewMode === 'grid' &&
			gridHierarchyMode === 'inline' &&
			handleInlineGridExpansionKeydown(logicalId, e)
		) {
			return;
		}
		if (viewMode === 'tree' && e.key === 'ArrowLeft') {
			handleTreeArrowLeft(logicalId, e);
		} else if (viewMode === 'tree' && e.key === 'ArrowRight') {
			handleTreeArrowRight(logicalId, e);
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!focusedNodeId) selectionService.setFocused(provider.id, logicalId);
			commitSelection(
				selectionService.moveFocus(provider.id, orderedIds, e.key === 'ArrowDown' ? 1 : -1, {
					additive: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
				}),
			);
		} else if (e.key === 'PageDown' || e.key === 'PageUp') {
			handlePageNavigation(logicalId, orderedIds, e);
		} else if (e.key === ' ' || e.key === 'Spacebar') {
			e.preventDefault();
			if (!focusedNodeId) selectionService.setFocused(provider.id, logicalId);
			commitSelection(
				selectionService.toggleFocused(provider.id, orderedIds, {
					additive: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
				}),
			);
		} else if (e.key === 'Enter') {
			const node = findNodeById(nodes, logicalId);
			if (node) handleSecondaryAction(logicalId, e as unknown as MouseEvent);
		}
	}

	function keyboardTargetId(fallbackId: string, orderedIds: readonly string[]): string {
		return focusedNodeId && orderedIds.includes(focusedNodeId) ? focusedNodeId : fallbackId;
	}

	function handlePageNavigation(
		currentId: string,
		orderedIds: readonly string[],
		e: KeyboardEvent,
	): void {
		if (!focusedNodeId && selectedNodeIds.size === 0) return;
		const currentIndex = orderedIds.indexOf(currentId);
		if (currentIndex < 0) return;
		e.preventDefault();
		const direction = e.key === 'PageDown' ? 1 : -1;
		const targetIndex = Math.max(
			0,
			Math.min(orderedIds.length - 1, currentIndex + direction * PAGE_NAVIGATION_STEP),
		);
		const targetId = orderedIds[targetIndex];
		if (!targetId) return;
		commitSelection(selectionService.selectPointer(provider.id, orderedIds, targetId));
		revealNode(targetId);
	}

	function handleInlineGridExpansionKeydown(id: string, e: KeyboardEvent): boolean {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return false;
		const node = findNodeById(nodes, id);
		const hasChildren = !!node?.children && node.children.length > 0;
		if (!hasChildren) return false;
		if (e.key === 'ArrowRight' && !gridExpandedIds.has(id)) {
			e.preventDefault();
			expandNode(id);
			return true;
		}
		if (e.key === 'ArrowLeft' && gridExpandedIds.has(id)) {
			e.preventDefault();
			collapseNode(id);
			return true;
		}
		return false;
	}

	function handleGridNavigationKeydown(e: KeyboardEvent): boolean {
		if (e.altKey && e.key === 'ArrowLeft') {
			e.preventDefault();
			navigateGridBack();
			return true;
		}
		if (e.altKey && e.key === 'ArrowRight') {
			e.preventDefault();
			navigateGridForward();
			return true;
		}
		if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
			e.preventDefault();
			navigateGridUp();
			return true;
		}
		return false;
	}

	function handleTreeArrowLeft(id: string, e: KeyboardEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		const hasChildren = !!node.children && node.children.length > 0;
		if (hasChildren && expandedIds.has(id)) {
			e.preventDefault();
			collapseNode(id);
			return;
		}
		const parentId = parentIdFor(nodes, id);
		if (!parentId) return;
		e.preventDefault();
		commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), parentId));
	}

	function handleTreeArrowRight(id: string, e: KeyboardEvent) {
		const node = findNodeById(nodes, id);
		if (!node?.children || node.children.length === 0 || expandedIds.has(id)) return;
		e.preventDefault();
		expandNode(id);
	}

	function activateNode(node: TreeNode<TMeta>) {
		if (provider.handleNodeSecondaryAction) {
			provider.handleNodeSecondaryAction(node, selectedNodesForContext(node));
			return;
		}
		provider.handleNodeClick(node);
	}

	function handleBadgeClick(queueIndex: number) {
		const operation = plugin.operationsIndex.nodes[queueIndex];
		if (!operation) return;
		plugin.queueService.remove(operation.id);
	}

	function handleHoverBadgeAction(id: string, kind: BadgeKind) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		const targetNodes = selectedNodesForAction(node);
		if (kind === 'node-note') {
			for (const candidate of targetNodes) void openNodeNote(candidate);
			return;
		}
		warnBadgeContradictions(kind, targetNodes);
		if (kind !== 'delete') {
			// Non-delete hover badges are forwarded to the provider so each
			// adapter can decide how to dispatch them. Providers that have
			// not opted in are no-ops.
			provider.handleHoverBadge?.(node, kind, targetNodes);
			return;
		}
		// Delete is special-cased through `requestDelete` so the queue can
		// open the conflict modal when other ops already touch this node.
		void plugin.queueService.requestDelete({
			nodeId: id,
			nodeLabel: node.label,
			enqueueDelete: () => provider.handleHoverBadge?.(node, 'delete', targetNodes),
		});
	}

	function findNodeById(nodes: TreeNode<TMeta>[], id: string): TreeNode<TMeta> | undefined {
		const snapshotNode = filesSnapshot?.byId.get(id)?.node as TreeNode<TMeta> | undefined;
		if (snapshotNode) return snapshotNode;
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = findNodeById(n.children, id);
				if (found) return found;
			}
		}
		return undefined;
	}

	function toggleExpand(id: string, _e?: MouseEvent | KeyboardEvent) {
		const targetExpandedIds =
			viewMode === 'grid' && gridHierarchyMode === 'inline' ? gridExpandedIds : expandedIds;
		if (targetExpandedIds.has(id)) {
			collapseNode(id);
		} else {
			expandNode(id);
		}
	}

	function expandNode(id: string) {
		manualExpandedIds.add(id);
		manualCollapsedIds.delete(id);
	}

	function collapseNode(id: string) {
		manualExpandedIds.delete(id);
		manualCollapsedIds.add(id);
	}

	function expandAllParents() {
		for (const id of expandableNodeIds) expandNode(id);
	}

	function collapseAllParents() {
		for (const id of expandableNodeIds) collapseNode(id);
	}

	function handleBoxSelect(ids: string[], e: PointerEvent) {
		commitSelection(
			selectionService.selectBox(provider.id, visibleNodeIds(), ids, {
				additive: e.ctrlKey || e.metaKey,
			}),
		);
	}

	function handleTableSelectAll(ids: string[], e: Event) {
		const additive = e instanceof MouseEvent ? e.ctrlKey || e.metaKey : false;
		commitSelection(selectionService.selectBox(provider.id, visibleNodeIds(), ids, { additive }));
	}

	function handleManualNodeDrop(result: DndDropResult): void {
		if (result.operation !== 'reorder') return;
		nodes = applyManualTreeReorder(nodes, result.sourceIds, result.targetId, result.position);
	}

	function commitSelection(snapshot: NodeSelectionSnapshot) {
		const key = selectionKey(snapshot);
		if (key === lastCommittedSelectionKey) return;
		lastCommittedSelectionKey = key;
		plugin.viewService.clearSelection(provider.id);
		for (const id of snapshot.ids) plugin.viewService.select(provider.id, id, 'add');
		plugin.viewService.setFocused(provider.id, snapshot.focusedId);
		syncFileSelectionFromNodes(snapshot.ids);
	}

	function syncFileSelectionFromNodes(ids: ReadonlySet<string>) {
		if (provider.id !== 'files') return;
		const files = [...ids]
			.map((id) => findNodeById(nodes, id))
			.map((node) => (node ? nodeFile(node) : null))
			.filter((file): file is TFile => Boolean(file));
		selectedFiles = new Set(files.map((file) => file.path));
		plugin.filterService.setSelectedFiles(files);
		if (showSelectedOnly) untrack(refreshData);
	}

	function selectionKey(snapshot: NodeSelectionSnapshot): string {
		return [
			[...snapshot.ids].join('\u0000'),
			snapshot.anchorId ?? '',
			snapshot.focusedId ?? '',
			snapshot.hoveredId ?? '',
		].join('\u0001');
	}

	function nodeFile(node: TreeNode<TMeta>): TFile | null {
		const meta = node.meta as { file?: TFile; isFolder?: boolean } | undefined;
		if (!meta?.file || meta.isFolder) return null;
		return meta.file;
	}

	function visibleNodeIds(): string[] {
		if (viewMode === 'grid') {
			if (gridHierarchyMode === 'inline') return collectVisibleHierarchyIds(nodes, gridExpandedIds);
			return gridNodes.map((node) => node.id);
		}
		if (viewMode === 'cards') return cardNodes.map((node) => node.id);
		if (viewMode === 'markmap') return collectAllHierarchyIds(markmapNodes);
		if (viewMode === 'table') return tableRows.map((row) => row.id);
		if (filesSnapshot) return [...filesSnapshot.visibleIds];
		const ids: string[] = [];
		const walk = (items: TreeNode<TMeta>[]) => {
			for (const node of items) {
				ids.push(node.id);
				if (node.children && expandedIds.has(node.id)) walk(node.children);
			}
		};
		walk(nodes);
		return ids;
	}

	function navigateGridTo(parentId: string | null, recordHistory = true) {
		if (parentId === currentGridParentId) return;
		if (recordHistory) {
			gridBackStack = [...gridBackStack, currentGridParentId];
			gridForwardStack = [];
		}
		currentGridParentId = parentId;
		clearNodeSelection();
	}

	function navigateGridBack() {
		if (gridBackStack.length === 0) return;
		const previous = gridBackStack[gridBackStack.length - 1];
		gridBackStack = gridBackStack.slice(0, -1);
		gridForwardStack = [currentGridParentId, ...gridForwardStack];
		currentGridParentId = previous;
		clearNodeSelection();
	}

	function navigateGridForward() {
		if (gridForwardStack.length === 0) return;
		const next = gridForwardStack[0];
		gridForwardStack = gridForwardStack.slice(1);
		gridBackStack = [...gridBackStack, currentGridParentId];
		currentGridParentId = next;
		clearNodeSelection();
	}

	function navigateGridUp() {
		if (!currentGridParentId) return;
		const path = findNodePath(nodes, currentGridParentId);
		const parent = path.length > 1 ? path[path.length - 2] : null;
		navigateGridTo(parent?.id ?? null);
	}

	function refreshGridLocation() {
		refreshData();
		if (currentGridParentId && !findNodeById(nodes, currentGridParentId)) {
			currentGridParentId = null;
			gridBackStack = [];
			gridForwardStack = [];
		}
	}

	function collectExpandableNodeIds(items: TreeNode<TMeta>[]): string[] {
		const ids: string[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				if (node.children && node.children.length > 0) {
					ids.push(node.id);
					walk(node.children);
				}
			}
		};
		walk(items);
		return ids;
	}

	function collectVisibleHierarchyIds(
		items: TreeNode<TMeta>[],
		expanded: ReadonlySet<string>,
	): string[] {
		const ids: string[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				ids.push(node.id);
				if (node.children && expanded.has(node.id)) walk(node.children);
			}
		};
		walk(items);
		return ids;
	}

	function collectAllHierarchyIds(items: TreeNode<TMeta>[]): string[] {
		const ids: string[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				ids.push(node.id);
				if (node.children) walk(node.children);
			}
		};
		walk(items);
		return ids;
	}

	function parentIdFor(items: TreeNode<TMeta>[], childId: string): string | null {
		const snapshotRow = filesSnapshot?.byId.get(childId);
		if (snapshotRow) return snapshotRow.parentId;
		for (const node of items) {
			if (node.children?.some((child) => child.id === childId)) return node.id;
			if (node.children) {
				const found = parentIdFor(node.children, childId);
				if (found) return found;
			}
		}
		return null;
	}

	function findNodePath(items: TreeNode<TMeta>[], id: string): TreeNode<TMeta>[] {
		for (const node of items) {
			if (node.id === id) return [node];
			if (node.children) {
				const childPath = findNodePath(node.children, id);
				if (childPath.length > 0) return [node, ...childPath];
			}
		}
		return [];
	}

	function childrenForGridLocation(
		items: TreeNode<TMeta>[],
		parentId: string | null,
	): TreeNode<TMeta>[] {
		if (!parentId) return items;
		const parent = findNodeById(items, parentId);
		return parent?.children ? [...parent.children] : [];
	}

	function selectedNodesForContext(node: TreeNode<TMeta>): TreeNode<TMeta>[] {
		const clickedType = provider.getNodeType?.(node);
		const selected = [...selectedNodeIds]
			.map((id) => findNodeById(nodes, id))
			.filter((candidate): candidate is TreeNode<TMeta> => Boolean(candidate));
		if (!clickedType) return selected.length > 0 ? selected : [node];
		const sameType = selected.filter(
			(candidate) => provider.getNodeType?.(candidate) === clickedType,
		);
		return sameType.length > 0 ? sameType : [node];
	}

	function selectedNodesForAction(node: TreeNode<TMeta>): TreeNode<TMeta>[] {
		if (!selectedNodeIds.has(node.id)) return [node];
		return selectedNodesForContext(node);
	}

	function applyManualTreeReorder(
		items: TreeNode<TMeta>[],
		sourceIds: readonly string[],
		targetId: string,
		position: DndDropResult['position'],
	): TreeNode<TMeta>[] {
		const ids = new Set(items.map((node) => node.id));
		if (sourceIds.some((id) => ids.has(id)) && ids.has(targetId)) {
			return applyManualNodeReorder(items, sourceIds, targetId, position);
		}
		return items.map((node) =>
			node.children
				? { ...node, children: applyManualTreeReorder(node.children, sourceIds, targetId, position) }
				: node,
		);
	}

	function warnBadgeContradictions(kind: BadgeKind, targetNodes: TreeNode<TMeta>[]): void {
		const kinds = new Set<BadgeKind>([kind]);
		for (const target of targetNodes) {
			for (const active of activeBadges(target, activeOpsByNode)) kinds.add(active);
		}
		const contradictions = detectBadgeContradictions(kinds);
		const warning = contradictions[0];
		if (!warning) return;
		serviceMessage.warning(warning.message, { details: warning });
	}

	function clearNodeSelection() {
		commitSelection(selectionService.clear(provider.id));
	}

	function revealNode(id: string): void {
		const snapshot = filesSnapshot;
		const serial = ++scrollTargetSerial;
		scrollTarget = snapshot
			? {
					id,
					serial,
					minSnapshotRevision: snapshot.structureRevision,
					reason: 'keyboard',
					providerKey: snapshot.providerKey,
					explorerId: snapshot.explorerId,
					structureRevision: snapshot.structureRevision,
				}
			: { id, serial };
	}

	/**
	 * Land keyboard focus on the first virtual row (or grid tile). Used
	 * by `vaultman:open` so arrow keys navigate immediately after the
	 * command reveals the panel. TanStack lazy-mounts rows during the
	 * first measure pass, so this retries up to three animation frames
	 * before giving up. Returns true on success, false on failure.
	 */
	function focusFirstNode(): boolean {
		const ids = visibleNodeIds();
		if (ids.length === 0) return false;
		const firstId = ids[0];
		// Move selection focus through the service so the navigator
		// keyboard handler picks up where the command left off.
		commitSelection(selectionService.selectPointer(provider.id, ids, firstId));
		selectionService.setFocused(provider.id, firstId);

		const tryDomFocus = (attempt: number): boolean => {
			if (!rootEl) return false;
			const candidate =
				rootEl.querySelector<HTMLElement>(`[data-node-id="${cssEscape(firstId)}"]`) ??
				rootEl.querySelector<HTMLElement>('[role="treeitem"], [role="row"], [role="gridcell"]');
			if (candidate) {
				candidate.focus({ preventScroll: false });
				return true;
			}
			if (attempt >= 3) return false;
			activeWindow.requestAnimationFrame(() => {
				tryDomFocus(attempt + 1);
			});
			return false;
		};
		// Defer to the next animation frame so any pending TanStack mount
		// settles before we try to grab focus.
		activeWindow.requestAnimationFrame(() => {
			tryDomFocus(0);
		});
		return true;
	}

	function cssEscape(value: string): string {
		if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
		return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
	}

	$effect(() => {
		const api: PanelExplorerImperativeApi = { focusFirstNode };
		onImperativeApiReady?.(api);
		if (!active) return;
		// Auto-register with the plugin so commands (e.g. `vaultman:open`)
		// can drive the active panel without threading callbacks through
		// every tab wrapper. Cleared on teardown so stale refs do not
		// outlive the mount.
		const host = plugin as VaultmanPlugin & {
			activePanelExplorerApi?: PanelExplorerImperativeApi | null;
		};
		host.activePanelExplorerApi = api;
		return () => {
			if (host.activePanelExplorerApi === api) {
				host.activePanelExplorerApi = null;
			}
		};
	});

	function handleDocumentClick(e: MouseEvent) {
		if (!active || !rootEl) return;
		const target = e.target instanceof Node ? e.target : null;
		if (target && rootEl.contains(target)) return;
		clearNodeSelection();
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (!active || e.key !== 'Escape') return;
		clearNodeSelection();
	}

	function resolveEmptyState(
		mode: ExplorerViewMode,
		term: string,
		source: ExplorerProvider<TMeta>,
	): ViewEmptyState {
		const fromProvider = source.getEmptyState?.({ mode, searchTerm: term }) ?? source.empty;
		if (fromProvider) return fromProvider;
		if (term.trim()) {
			return {
				kind: 'search',
				label: 'No matches',
				detail: 'Try a different search term.',
				icon: 'lucide-search',
			};
		}
		if (mode === 'grid') {
			return {
				kind: 'empty',
				label: 'No files',
				detail: 'This view has no files to show.',
				icon: 'lucide-files',
			};
		}
		return {
			kind: 'empty',
			label: 'No items',
			detail: 'This explorer has no items to show.',
			icon: 'lucide-inbox',
		};
	}

	function resolveFallbackState(
		mode: ExplorerViewMode,
		itemCount: number,
		empty: ViewEmptyState,
	): ViewEmptyState {
		if (itemCount === 0) return empty;
		return {
			kind: 'empty',
			label: `${mode[0].toUpperCase()}${mode.slice(1)} view not available`,
			detail: 'Switch to tree or grid to inspect these items.',
			icon: 'lucide-layout-list',
		};
	}

</script>

<svelte:document onclick={handleDocumentClick} />
<svelte:window onkeydown={handleWindowKeydown} />

<div class="vm-panel-explorer" data-visible-fields={visibleFieldsKey} bind:this={rootEl}>
	{#if viewMode === 'tree'}
		<div class="vm-tree-container">
			{#if isTreeEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewTree
					nodes={displayNodes}
					{expandedIds}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					onToggle={toggleExpand}
					onRowClick={handleNodeClick}
					onSecondaryAction={handleSecondaryAction}
					onTertiaryAction={handleTertiaryAction}
					onBoxSelect={handleBoxSelect}
					onContextMenu={handleContextMenu}
					onRowKeydown={handleRowKeydown}
					onBadgeDoubleClick={handleBadgeClick}
					onHoverBadgeAction={handleHoverBadgeAction}
					{activeOpsByNode}
					{scrollTarget}
					snapshotRevision={filesSnapshot?.structureRevision ?? null}
					idToIndex={filesSnapshot?.idToIndex ?? null}
					mouseGestureConfig={plugin.settings?.mouseGestures?.node}
					themeService={plugin.themeService}
					providerId={provider.id}
					{visibleFields}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'grid'}
		<div class="vm-grid-container">
			{#if gridHierarchyMode === 'folder'}
				<GridNavigationToolbar
					path={currentGridPath}
					canBack={gridBackStack.length > 0}
					canForward={gridForwardStack.length > 0}
					canUp={currentGridParentId !== null}
					onBack={navigateGridBack}
					onForward={navigateGridForward}
					onUp={navigateGridUp}
					onRefresh={refreshGridLocation}
					onNavigateRoot={() => navigateGridTo(null)}
					onNavigateCrumb={(id) => navigateGridTo(id)}
					{icon}
				/>
			{/if}
			{#if isGridEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeGrid
					nodes={gridNodes}
					selectedIds={selectedNodeIds}
					selectedMap={selectedNodeMap}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					hierarchyMode={gridHierarchyMode}
					expandedIds={gridHierarchyMode === 'inline' ? gridExpandedIds : undefined}
					providerId={provider.id}
					{visibleFields}
					{manualDndEnabled}
					onManualDrop={handleManualNodeDrop}
					onTileClick={handleNodeClick}
					onSecondaryAction={handleSecondaryAction}
					onTertiaryAction={handleTertiaryAction}
					onBoxSelect={handleBoxSelect}
					onContextMenu={handleContextMenu}
					onTileKeydown={handleRowKeydown}
					onToggleExpand={toggleExpand}
					onBadgeDoubleClick={handleBadgeClick}
					onHoverBadgeAction={handleHoverBadgeAction}
					{activeOpsByNode}
					{scrollTarget}
					mouseGestureConfig={plugin.settings?.mouseGestures?.node}
					themeService={plugin.themeService}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'cards'}
		<div class="vm-cards-container">
			{#if isCardsEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeCards
					providerId={provider.id}
					nodes={cardNodes}
					{visibleFields}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					onCardClick={handleNodeClick}
					onSecondaryAction={handleSecondaryAction}
					onTertiaryAction={handleTertiaryAction}
					onContextMenu={handleContextMenu}
					onCardKeydown={handleRowKeydown}
					onBadgeDoubleClick={handleBadgeClick}
					{scrollTarget}
					mouseGestureConfig={plugin.settings?.mouseGestures?.node}
					themeService={plugin.themeService}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'markmap'}
		<div class="vm-markmap-container">
			{#if isMarkmapEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewMarkmap
					nodes={markmapNodes}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					onNodeClick={handleNodeClick}
					onSecondaryAction={handleSecondaryAction}
					onTertiaryAction={handleTertiaryAction}
					onContextMenu={handleContextMenu}
					onNodeKeydown={handleRowKeydown}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'table'}
		<div class="vm-table-container">
			{#if isTableEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeTable
					rows={tableRows}
					columns={tableColumns}
					selectedIds={selectedNodeIds}
					selectedMap={selectedNodeMap}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					onRowClick={handleNodeClick}
					onSecondaryAction={handleSecondaryAction}
					onTertiaryAction={handleTertiaryAction}
					onContextMenu={handleContextMenu}
					onRowKeydown={handleRowKeydown}
					onSelectAll={(ids, e) => handleTableSelectAll(ids, e)}
					onBadgeDoubleClick={handleBadgeClick}
					{scrollTarget}
					mouseGestureConfig={plugin.settings?.mouseGestures?.node}
					themeService={plugin.themeService}
					{visibleFields}
					{icon}
				/>
			{/if}
		</div>
		<!-- temp until i add the new svars provider -->
	{:else if viewMode === 'svar'}
		<div class="vm-svar-container-inner">
			{#if isSvarEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewSvarFileManager {plugin} {provider} />
			{/if}
		</div>
	{:else}
		<div class="vm-fallback-container">
			<ViewEmptyLanding state={fallbackState} {icon} />
		</div>
	{/if}
</div>

<style>
	.vm-tree-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}
	.vm-grid-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	.vm-cards-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	.vm-markmap-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	.vm-table-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	/* temp until i add the new svars provider */
	.vm-svar-container-inner {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.vm-fallback-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
