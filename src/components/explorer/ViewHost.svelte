<script lang="ts" generics="TMeta = unknown">
	import { getContext, setContext, untrack } from 'svelte';
	import type { ActiveOpsByNode, BadgeKind } from '../../badges/serviceBadge';
	import type { MouseGestureConfig } from '../../services/serviceMouse';
	import type { DndDropResult } from '../../services/serviceDnd';
	import type { ThemeService } from '../../services/serviceTheme.svelte';
	import type { ViewSizePresetId } from '../../services/serviceViewSize';
	import { ViewHostService } from '../../services/serviceViewHost.svelte';
	import { createVariableProviderRegistry } from '../../services/serviceSharedVirtualLayout';
	import {
		getSharedGeometryRegistry,
		setSharedGeometryRegistry,
	} from '../../services/serviceSharedVirtualLayout.svelte';
	import type { ExplorerProjection } from '../../services/serviceExplorerProjection';
	import type { ExplorerRowInput } from '../../services/serviceExplorerRowInput';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ExplorerRevealTarget } from '../../types/typeExplorerDataPlane';
	import type { TreeNode } from '../../types/typeNode';
	import type { ThemePreset } from '../../types/typeThemePreset';
	import type { ExplorerViewMode } from '../../types/typeViews';
	import type { ViewHostMountContext } from '../../types/typeViewHost';
	import GridNavigationToolbar from '../layout/GridNavigationToolbar.svelte';
	import ViewNodeCards from '../views/ViewNodeCards.svelte';
	import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
	import ViewNodeList from '../views/ViewNodeList.svelte';
	import ViewNodeTable from '../views/ViewNodeTable.svelte';
	import ViewTree from '../views/viewTree.svelte';
	import {
		NODE_ELEMENT_MASK_KEY,
		PRESET_KEY,
		VIEW_HOST_KEY,
		type NodeElementMaskContextValue,
		type PresetContextValue,
		type ViewHostContextValue,
	} from './viewHostContext';

	type IconAction = (node: HTMLElement, name: string) => { update(n: string): void };
	type GridHierarchyMode = 'folder' | 'inline';
	type ScrollTarget = ExplorerRevealTarget | { id: string; serial: number };
	type ListRowInput = ExplorerRowInput<NodeBase>;

	interface Props {
		preset: ThemePreset;
		mountContext?: ViewHostMountContext;
		viewMode?: ExplorerViewMode;

		nodes?: TreeNode<TMeta>[];
		rowInputs?: readonly ExplorerRowInput<TMeta>[];
		listRowInputs?: readonly ListRowInput[];
		projection?: ExplorerProjection<TMeta>;
		listProjection?: ExplorerProjection<NodeBase>;
		gridNodes?: TreeNode<TMeta>[];
		cardNodes?: TreeNode<TMeta>[];
		tableRows?: unknown[];
		tableColumns?: unknown[];

		expandedIds?: ReadonlySet<string>;
		gridExpandedIds?: ReadonlySet<string>;
		selectedIds?: ReadonlySet<string>;
		selectedMap?: ReadonlyMap<string, boolean>;
		focusedId?: string | null;
		activeId?: string | null;
		activeOpsByNode?: ActiveOpsByNode;
		scrollTarget?: ScrollTarget | null;
		snapshotRevision?: number | null;
		idToIndex?: ReadonlyMap<string, number> | null;
		sizePresetId?: ViewSizePresetId;
		providerId?: string;
		visibleFields?: readonly string[];
		stickyTopOffset?: number;
		mouseGestureConfig?: MouseGestureConfig;
		themeService?: ThemeService;
		manualDndEnabled?: boolean;

		gridHierarchyMode?: GridHierarchyMode;
		currentGridPath?: TreeNode<TMeta>[];
		gridPath?: TreeNode<TMeta>[];
		gridCanBack?: boolean;
		gridCanForward?: boolean;
		gridCanUp?: boolean;
		onGridColumnCountChange?: (columns: number) => void;
		onBack?: () => void;
		onForward?: () => void;
		onUp?: () => void;
		onRefresh?: () => void;
		onNavigateRoot?: () => void;
		onNavigateCrumb?: (id: string) => void;

		icon: IconAction;
		onToggle: (id: string, e?: MouseEvent | KeyboardEvent) => void;
		onRowClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent | KeyboardEvent) => void;
		onBoxSelect?: (ids: string[], e: PointerEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		onSelectAll?: (ids: string[], e: Event) => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
		onManualDrop?: (result: DndDropResult) => void;
	}

	let {
		preset,
		mountContext = 'panel',
		viewMode = $bindable<ExplorerViewMode>('tree'),
		...rest
	}: Props = $props();

	const inheritedService = getContext<ViewHostContextValue | undefined>(VIEW_HOST_KEY);
	// svelte-ignore state_referenced_locally
	const service =
		inheritedService ?? new ViewHostService({ preset, mountContext, initialViewMode: viewMode });
	const renderedViewMode = $derived(service.viewMode);
	const gridPath = $derived(rest.gridPath ?? rest.currentGridPath ?? []);

	setContext<ViewHostContextValue>(VIEW_HOST_KEY, service);
	setContext<NodeElementMaskContextValue>(NODE_ELEMENT_MASK_KEY, {
		value: () => service.nodeElementMask,
	});
	setContext<PresetContextValue>(PRESET_KEY, { value: () => service.preset });
	// V.D shared render-runtime (slice 2b): the warm per-provider Geometry registry, stood up
	// once near the explorer root so N mounted Geometry views (table now; grid/cards in later
	// slices) share ONE VariableProviderRegistry — a mode switch (e.g. table -> grid on the same
	// provider) reuses the warm Fenwick instead of re-measuring from scratch (Q1/Q2). Only wired
	// here if no ancestor ViewHost already provided one (mirrors the inheritedService fallback
	// above): a nested ViewHost (e.g. an in-editor embed under a panel ViewHost) should share its
	// ancestor's registry, not shadow it with an empty one.
	if (getSharedGeometryRegistry() === undefined) {
		setSharedGeometryRegistry(createVariableProviderRegistry());
	}

	$effect(() => {
		service.preset = preset;
		service.mountContext = mountContext;
	});

	$effect(() => {
		if (untrack(() => service.viewMode) !== viewMode) service.setViewMode(viewMode);
	});

	$effect(() => {
		const selectableModes = service.selectableModes;
		if ((selectableModes as readonly string[]).includes(service.viewMode)) return;
		const fallback = selectableModes[0] ?? 'tree';
		if (service.viewMode !== fallback) service.setViewMode(fallback);
		if (viewMode !== fallback) viewMode = fallback;
	});
</script>

{#if renderedViewMode === 'tree'}
	<ViewTree
		nodes={rest.nodes ?? []}
		rowInputs={rest.rowInputs}
		projection={rest.projection}
		expandedIds={rest.expandedIds as Set<string>}
		selectedIds={rest.selectedIds as Set<string> | undefined}
		focusedId={rest.focusedId}
		onToggle={rest.onToggle}
		onRowClick={rest.onRowClick}
		onPrimaryAction={rest.onPrimaryAction}
		onSecondaryAction={rest.onSecondaryAction}
		onTertiaryAction={rest.onTertiaryAction}
		onBoxSelect={rest.onBoxSelect}
		onContextMenu={rest.onContextMenu}
		onRowKeydown={rest.onRowKeydown}
		onBadgeDoubleClick={rest.onBadgeDoubleClick}
		onHoverBadgeAction={rest.onHoverBadgeAction}
		activeOpsByNode={rest.activeOpsByNode}
		scrollTarget={rest.scrollTarget as never}
		snapshotRevision={rest.snapshotRevision ?? null}
		idToIndex={rest.idToIndex ?? null}
		mouseGestureConfig={rest.mouseGestureConfig}
		sizePresetId={rest.sizePresetId}
		providerId={rest.providerId}
		visibleFields={rest.visibleFields}
		stickyTopOffset={rest.stickyTopOffset}
		themeService={rest.themeService}
		icon={rest.icon}
	/>
{:else if renderedViewMode === 'list'}
	<ViewNodeList
		rowInputs={rest.listRowInputs}
		projection={rest.listProjection}
		canReorder={false}
		selectedIds={rest.selectedIds}
		focusedId={rest.focusedId}
		onRowClick={rest.onRowClick}
		onRowKeydown={rest.onRowKeydown}
		onSecondaryAction={rest.onSecondaryAction}
		onTertiaryAction={rest.onTertiaryAction as never}
		onContextMenu={rest.onContextMenu}
		icon={rest.icon}
	/>
{:else if renderedViewMode === 'table'}
	<ViewNodeTable
		rows={(rest.tableRows ?? []) as never}
		columns={(rest.tableColumns ?? []) as never}
		projection={rest.projection as never}
		selectedIds={rest.selectedIds}
		selectedMap={rest.selectedMap}
		focusedId={rest.focusedId}
		activeId={rest.activeId}
		onRowClick={rest.onRowClick}
		onPrimaryAction={rest.onPrimaryAction}
		onSecondaryAction={rest.onSecondaryAction}
		onTertiaryAction={rest.onTertiaryAction as never}
		onContextMenu={rest.onContextMenu}
		onRowKeydown={rest.onRowKeydown}
		onSelectAll={rest.onSelectAll}
		onBadgeDoubleClick={rest.onBadgeDoubleClick}
		scrollTarget={rest.scrollTarget as never}
		mouseGestureConfig={rest.mouseGestureConfig}
		themeService={rest.themeService}
		visibleFields={rest.visibleFields}
		icon={rest.icon}
	/>
{:else if renderedViewMode === 'grid'}
	{#if rest.gridHierarchyMode === 'folder'}
		<GridNavigationToolbar
			path={gridPath}
			canBack={rest.gridCanBack}
			canForward={rest.gridCanForward}
			canUp={rest.gridCanUp}
			onBack={rest.onBack}
			onForward={rest.onForward}
			onUp={rest.onUp}
			onRefresh={rest.onRefresh}
			onNavigateRoot={rest.onNavigateRoot}
			onNavigateCrumb={rest.onNavigateCrumb}
			icon={rest.icon}
		/>
	{/if}
	<ViewNodeGrid
		nodes={rest.gridNodes ?? []}
		rowInputs={rest.rowInputs as never}
		projection={rest.projection as never}
		selectedIds={rest.selectedIds}
		selectedMap={rest.selectedMap}
		focusedId={rest.focusedId}
		activeId={rest.activeId}
		hierarchyMode={rest.gridHierarchyMode}
		expandedIds={rest.gridExpandedIds}
		onTileClick={rest.onRowClick}
		onPrimaryAction={rest.onPrimaryAction}
		onSecondaryAction={rest.onSecondaryAction}
		onTertiaryAction={rest.onTertiaryAction as never}
		onBoxSelect={rest.onBoxSelect}
		onContextMenu={rest.onContextMenu}
		onTileKeydown={rest.onRowKeydown}
		onBadgeDoubleClick={rest.onBadgeDoubleClick}
		onHoverBadgeAction={rest.onHoverBadgeAction}
		activeOpsByNode={rest.activeOpsByNode}
		onToggleExpand={rest.onToggle}
		scrollTarget={rest.scrollTarget as never}
		mouseGestureConfig={rest.mouseGestureConfig}
		sizePresetId={rest.sizePresetId}
		providerId={rest.providerId}
		visibleFields={rest.visibleFields}
		manualDndEnabled={rest.manualDndEnabled}
		onManualDrop={rest.onManualDrop as never}
		onColumnCountChange={rest.onGridColumnCountChange}
		themeService={rest.themeService}
		icon={rest.icon}
	/>
{:else if renderedViewMode === 'cards'}
	<ViewNodeCards
		providerId={rest.providerId ?? 'nodes'}
		nodes={rest.cardNodes ?? []}
		rowInputs={rest.rowInputs as never}
		projection={rest.projection as never}
		visibleFields={rest.visibleFields ?? []}
		selectedIds={rest.selectedIds}
		focusedId={rest.focusedId}
		activeId={rest.activeId}
		onCardClick={rest.onRowClick}
		onSecondaryAction={rest.onSecondaryAction}
		onTertiaryAction={rest.onTertiaryAction as never}
		onContextMenu={rest.onContextMenu}
		onCardKeydown={rest.onRowKeydown}
		onBadgeDoubleClick={rest.onBadgeDoubleClick}
		scrollTarget={rest.scrollTarget as never}
		mouseGestureConfig={rest.mouseGestureConfig}
		themeService={rest.themeService}
		icon={rest.icon}
	/>
{/if}
