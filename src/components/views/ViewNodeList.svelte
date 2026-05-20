<script lang="ts">
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { getContext, untrack } from 'svelte';
	import {
		createRafElementRectObserver,
		fallbackFixedVirtualRows,
	} from '../../services/serviceScroll';
	import {
		buildRowInputIdIndex,
		rowInputVirtualKey,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import { createExplorerScrollGeometry } from '../../services/serviceExplorerScrollGeometry';
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
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import {
		DEFAULT_NODE_ELEMENT_MASK,
		visibleViewBadgesForMask,
	} from './nodeElementMask';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ViewAction, ViewBadge, ViewRow } from '../../types/typeViews';

	type ListRowInput = ExplorerRowInput<NodeBase>;
	type ListAction = ViewAction<NodeBase>;
	type ListRowProps = Omit<RowProps, 'role' | 'tabindex' | 'aria-selected'> & {
		role: 'option' | 'listitem';
		tabindex?: 0 | -1;
		'aria-selected'?: boolean;
	};

	interface Props {
		rowInputs?: readonly ListRowInput[];
		projection?: ExplorerProjection<NodeBase>;
		canReorder?: boolean;
		onAction?: (action: ListAction, row: ListRowInput) => void;
		onReorder?: (request: ListReorderRequest) => void;
		onRowClick?: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onContextMenu?: (id: string, e: MouseEvent) => void;
		selectedIds?: ReadonlySet<string>;
		focusedId?: string | null;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	interface ListReorderRequest {
		sourceId: string;
		targetId: string;
		position: 'before' | 'after';
	}

	let {
		rowInputs = [],
		projection,
		canReorder = false,
		onAction,
		onReorder,
		onRowClick,
		onRowKeydown,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		selectedIds,
		focusedId,
		icon,
	}: Props = $props();

	const LIST_OVERSCAN = 5;
	const LIST_FALLBACK_HEIGHT = 400;
	const LIST_FALLBACK_WIDTH = 320;
	const ROW_HEIGHT = 32;

	let outerEl: HTMLDivElement | undefined = $state();
	let draggingRowId: string | null = $state(null);
	let localFocusedId: string | null = $state(null);
	let fallbackScrollTop = $state(0);
	let fallbackViewportHeight = $state(LIST_FALLBACK_HEIGHT);
	let consumedFocusedRevealKey: string | null = null;

	const rowHeight = $derived(ROW_HEIGHT);
	const effectiveRowInputs = $derived(projection ? rowInputsFromProjection(projection) : rowInputs);
	const rowCount = $derived(effectiveRowInputs.length);
	const rowIdToIndex = $derived(buildRowInputIdIndex(effectiveRowInputs));
	const isListboxMode = $derived(Boolean(onRowClick || onRowKeydown));
	const activeFocusedId = $derived(localFocusedId ?? focusedId ?? null);
	const maskCtx = getContext<NodeElementMaskContextValue | undefined>(NODE_ELEMENT_MASK_KEY);
	const nodeElementMask = $derived(maskCtx?.value() ?? DEFAULT_NODE_ELEMENT_MASK);
	const presetCtx = getContext<PresetContextValue | undefined>(PRESET_KEY);
	const useNativeDom = $derived(presetCtx?.value().useNativeDom ?? false);
	const nativeVocab = $derived<NativeClassVocabulary | null>(
		useNativeDom ? explorerViewContract('list').nativeDomEmission.panel : null,
	);
	const listFeatures = explorerViewContract('list').features;
	const rowAction = $derived(
		createRowAction({
			explorerId: projection?.providerId ?? 'list',
			role: 'option',
			features: listFeatures,
			contract: {
				onToggle: noopListToggle,
				onContextMenu: listActionContextMenu,
				onRowKeydown,
			},
		}),
	);
	const observeListRect = createRafElementRectObserver<HTMLDivElement, HTMLDivElement>({
		getElement: () => outerEl ?? null,
		fallbackWidth: LIST_FALLBACK_WIDTH,
		fallbackHeight: LIST_FALLBACK_HEIGHT,
	});
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => rowInputVirtualKey(effectiveRowInputs, index),
		estimateSize: () => rowHeight,
		observeElementRect: observeListRect,
		overscan: LIST_OVERSCAN,
		initialRect: { width: LIST_FALLBACK_WIDTH, height: LIST_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedVirtualRows = $derived.by(() => {
		const rows = virtualRows.filter((virtualRow) => virtualRow.index < rowCount);
		if (rows.length > 0 || rowCount === 0) return rows;
		return fallbackFixedVirtualRows({
			count: rowCount,
			rowHeight,
			viewportHeight: fallbackViewportHeight,
			scrollTop: fallbackScrollTop,
			overscan: LIST_OVERSCAN,
			getKey: (index) => rowInputVirtualKey(effectiveRowInputs, index),
		});
	});
	const totalH = $derived($rowVirtualizer.getTotalSize());

	$effect(() => {
		const count = rowCount;
		const rows = effectiveRowInputs;
		const scrollElement = outerEl;
		const height = rowHeight;
		const overscan = LIST_OVERSCAN;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => rowInputVirtualKey(rows, index),
				estimateSize: () => height,
				observeElementRect: observeListRect,
				overscan,
				initialRect: { width: LIST_FALLBACK_WIDTH, height: LIST_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		if (!outerEl) return;
		fallbackViewportHeight = outerEl.clientHeight || LIST_FALLBACK_HEIGHT;
		const ro = new ResizeObserver(() => {
			if (outerEl) fallbackViewportHeight = outerEl.clientHeight || LIST_FALLBACK_HEIGHT;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	$effect(() => {
		const id = focusedId;
		if (!id) {
			consumedFocusedRevealKey = null;
			return;
		}
		localFocusedId = id;
		const currentIndex = rowIdToIndex.get(id);
		const revealKey = `${id}:${currentIndex ?? -1}:${rowCount}`;
		if (revealKey === consumedFocusedRevealKey) return;
		const coordinator = createExplorerScrollGeometry({
			idToIndex: rowIdToIndex,
			rowHeight,
			rowCount,
		});
		const target = coordinator.resolve({ kind: 'id', id, reason: 'keyboard' });
		if (!target) return;
		consumedFocusedRevealKey = revealKey;
		untrack(() =>
			$rowVirtualizer.scrollToIndex(target.index, { align: target.align, behavior: 'auto' }),
		);
	});

	function onScroll(e: Event) {
		fallbackScrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	function iconAction(el: HTMLElement, name: string) {
		return icon?.(el, name) ?? { update: () => {} };
	}

	function rowIcon(row: ListRowInput): string | undefined {
		return row.icon ?? row.layers.icons?.[0]?.icon;
	}

	function allBadges(row: ListRowInput): ViewBadge[] {
		return visibleViewBadgesForMask(row.layers.badges, nodeElementMask);
	}

	function handleAction(action: ListAction, row: ListRowInput) {
		if (action.disabled) return;
		action.run?.(rowInputToViewRow(row));
		onAction?.(action, row);
	}

	function actionRegionClass(row: ListRowInput): string {
		return isQueueChildRow(row)
			? 'vm-view-list-actions is-counter-slot'
			: 'vm-view-list-actions';
	}

	function actionButtonClass(action: ListAction, row: ListRowInput): string {
		return [
			'vm-btn-icon',
			action.tone === 'danger' ? 'vm-btn-danger' : '',
			isInlineCancelAction(action, row) ? 'is-inline-cancel' : '',
		]
			.filter(Boolean)
			.join(' ');
	}

	function isGroupRow(row: ListRowInput): boolean {
		return (row.node as { kind?: string }).kind === 'group';
	}

	function isQueueChildRow(row: ListRowInput): boolean {
		return hasRowClass(row, 'is-queue-child');
	}

	function isInlineCancelAction(action: ListAction, row: ListRowInput): boolean {
		return isQueueChildRow(row) && action.id === 'remove';
	}

	function isRowSelected(row: ListRowInput): boolean {
		return Boolean(selectedIds?.has(row.id) || row.layers.state?.selected);
	}

	function hasRowClass(row: ListRowInput, className: string): boolean {
		return (row.cls ?? '').split(/\s+/).includes(className);
	}

	function dragEnabled(): boolean {
		return Boolean(canReorder && onReorder);
	}

	function handleContextMenu(event: MouseEvent, row: ListRowInput): void {
		if (!onContextMenu) return;
		event.preventDefault();
		onContextMenu(row.id, event);
	}

	function handleDragStart(event: DragEvent, row: ListRowInput) {
		if (!dragEnabled()) return;
		draggingRowId = row.id;
		event.dataTransfer?.setData('text/plain', row.id);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(event: DragEvent, row: ListRowInput) {
		if (!dragEnabled() || !draggingRowId || draggingRowId === row.id) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event: DragEvent, row: ListRowInput) {
		if (!dragEnabled() || !draggingRowId || draggingRowId === row.id) {
			draggingRowId = null;
			return;
		}
		event.preventDefault();
		onReorder?.({
			sourceId: draggingRowId,
			targetId: row.id,
			position: dropPosition(event.currentTarget as HTMLElement, event),
		});
		draggingRowId = null;
	}

	function handleDragEnd() {
		draggingRowId = null;
	}

	function dropPosition(rowEl: HTMLElement, event: DragEvent): 'before' | 'after' {
		const rect = rowEl.getBoundingClientRect();
		const clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top;
		return clientY <= rect.top + rect.height / 2 ? 'before' : 'after';
	}

	function rowActions(row: ListRowInput): readonly ListAction[] {
		return (row.actions ?? []) as unknown as readonly ListAction[];
	}

	function rowInputToViewRow(row: ListRowInput): ViewRow<NodeBase> {
		return {
			id: row.id,
			node: row.node as unknown as NodeBase,
			label: row.label,
			detail: row.detail,
			icon: row.icon,
			cls: row.cls,
			depth: row.depth,
			cells: row.cells ?? [],
			layers: row.layers,
			actions: rowActions(row),
			disabled: row.disabled,
		};
	}

	function rowStateClassString(row: ListRowInput): string {
		return stateModEmissions(nativeVocab, {
			isSelected: isRowSelected(row),
			isFocused: activeFocusedId === row.id,
			isActive: false,
			isDragSource: draggingRowId === row.id,
			isDropTarget: false,
			hasActiveMenu: false,
		}).join(' ');
	}

	function listRowProps(row: ListRowInput, state: RowState): ListRowProps {
		if (!isListboxMode) {
			return {
				role: 'listitem',
				tabindex: undefined,
				'aria-selected': undefined,
				'aria-expanded': undefined,
				'data-row-key': row.id,
				oncontextmenu: undefined,
				onkeydown: undefined,
			};
		}
		const props = rowAction.getRowProps(row.id, state);
		return { ...props, role: 'option', oncontextmenu: undefined, onkeydown: undefined };
	}

	function listActionContextMenu(id: string, event: MouseEvent): void {
		onContextMenu?.(id, event);
	}

	function noopListToggle(): void {}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={outerEl}
	class="vm-view-list vm-explorer-popup-list"
	role={isListboxMode ? 'listbox' : 'list'}
	aria-activedescendant={isListboxMode && activeFocusedId
		? `vm-listrow-${activeFocusedId}`
		: undefined}
	tabindex={isListboxMode ? 0 : undefined}
	onscroll={onScroll}
>
	<div class="vm-view-list-inner vm-explorer-popup-inner" style="height: {totalH}px">
		{#each renderedVirtualRows as virtualRow (virtualRow.key)}
			{@const row = effectiveRowInputs[virtualRow.index]}
			{#if row}
				{@const iconName = !nodeElementMask.icon ? undefined : rowIcon(row)}
				{@const badges = allBadges(row)}
				{@const actions = nodeElementMask.actions ? rowActions(row) : []}
				{@const selected = isRowSelected(row)}
				<div
					id="vm-listrow-{row.id}"
					class="vm-view-list-row vm-explorer-popup-row {row.cls ?? ''} {nativeVocab?.rowRoot ?? ''} {rowStateClassString(
						row,
					)}"
					class:is-selected={selected}
					class:is-disabled={row.disabled || row.layers.state?.disabled}
					class:is-group={isGroupRow(row)}
					class:is-dragging={draggingRowId === row.id}
					style="position: absolute; top: 0; left: 0; right: 0; height: {virtualRow.size}px; transform: translateY({virtualRow.start}px); --vm-list-depth-indent: {(row.depth ?? 0) * 14}px"
					data-id={row.id}
					data-index={virtualRow.index}
					{...listRowProps(row, {
						selected,
						focused: activeFocusedId === row.id,
						expandable: false,
						expanded: false,
					})}
					draggable={dragEnabled()}
					onclick={onRowClick ? (event) => onRowClick(row.id, event) : undefined}
					ondblclick={onSecondaryAction ? (event) => onSecondaryAction(row.id, event) : undefined}
					onauxclick={onTertiaryAction ? (event) => onTertiaryAction(row.id, event) : undefined}
					oncontextmenu={(event) => handleContextMenu(event, row)}
					onkeydown={onRowKeydown ? (event) => onRowKeydown(row.id, event) : undefined}
					ondragstart={(event) => handleDragStart(event, row)}
					ondragover={(event) => handleDragOver(event, row)}
					ondrop={(event) => handleDrop(event, row)}
					ondragend={handleDragEnd}
				>
					{#if iconName}
						<span class="vm-view-list-icon" use:iconAction={iconName}></span>
					{/if}

					<span class="vm-view-list-main">
						{#if nodeElementMask.label}
							<span class="vm-view-list-label">{row.label}</span>
						{/if}
						{#if nodeElementMask.detail && row.detail}
							<span class="vm-view-list-detail">{row.detail}</span>
						{/if}
					</span>

					{#if badges.length > 0}
						<span class="vm-view-list-badges">
							{#each badges as badge (badge.id)}
								<span class="vm-badge" class:is-solid={badge.solid} title={badge.label ?? ''}>
									{#if badge.icon}
										<span class="vm-badge-icon" use:iconAction={badge.icon}></span>
									{/if}
									{#if badge.label}
										<span class="vm-badge-label">{badge.label}</span>
									{/if}
								</span>
							{/each}
						</span>
					{/if}

					{#if actions.length > 0}
						<span class={actionRegionClass(row)}>
							{#each actions as action (action.id)}
								<button
									class={actionButtonClass(action, row)}
									disabled={action.disabled}
									onclick={() => handleAction(action, row)}
									aria-label={action.label}
								>
									{#if action.icon}
										<span use:iconAction={action.icon}></span>
									{:else}
										{action.label}
									{/if}
								</button>
							{/each}
						</span>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>
