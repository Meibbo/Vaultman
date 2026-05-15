<script lang="ts">
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { untrack } from 'svelte';
	import {
		createRafElementRectObserver,
		fallbackFixedVirtualRows,
	} from '../../services/serviceScroll';
	import {
		rowInputFromViewRow,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewBadge, ViewRow } from '../../types/typeViews';

	type ListRowInput = ExplorerRowInput<NodeBase>;
	type ListAction = ViewAction<NodeBase>;

	interface Props {
		rowInputs?: readonly ListRowInput[];
		canReorder?: boolean;
		model?: ExplorerRenderModel<NodeBase>;
		onAction?: (action: ListAction, row: ListRowInput) => void;
		onReorder?: (request: ListReorderRequest) => void;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	interface ListReorderRequest {
		sourceId: string;
		targetId: string;
		position: 'before' | 'after';
	}

	let { rowInputs, canReorder, model, onAction, onReorder, icon }: Props = $props();

	const LIST_OVERSCAN = 5;
	const LIST_FALLBACK_HEIGHT = 400;
	const LIST_FALLBACK_WIDTH = 320;

	let outerEl: HTMLDivElement | undefined = $state();
	let draggingRowId: string | null = $state(null);
	let fallbackScrollTop = $state(0);
	let fallbackViewportHeight = $state(LIST_FALLBACK_HEIGHT);

	const effectiveRows = $derived<readonly ListRowInput[]>(
		rowInputs ?? model?.rows.map(viewRowToRowInput) ?? [],
	);
	const effectiveCanReorder = $derived(
		canReorder ?? Boolean(model?.capabilities.canDrag && model?.capabilities.canDrop),
	);
	const effectiveRowHeight = $derived(model?.virtualization.rowHeight ?? 32);
	const rowHeight = $derived(effectiveRowHeight);
	const rowCount = $derived(effectiveRows.length);
	const observeListRect = createRafElementRectObserver<HTMLDivElement, HTMLDivElement>({
		getElement: () => outerEl ?? null,
		fallbackWidth: LIST_FALLBACK_WIDTH,
		fallbackHeight: LIST_FALLBACK_HEIGHT,
	});
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => effectiveRows[index]?.id ?? index,
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
			getKey: (index) => effectiveRows[index]?.id ?? index,
		});
	});
	const totalH = $derived($rowVirtualizer.getTotalSize());

	$effect(() => {
		const count = rowCount;
		const rows = effectiveRows;
		const scrollElement = outerEl;
		const height = rowHeight;
		const overscan = model?.virtualization.overscan ?? LIST_OVERSCAN;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => rows[index]?.id ?? index,
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
		const badges = row.layers.badges;
		return [
			...(badges?.ops ?? []),
			...(badges?.filters ?? []),
			...(badges?.warnings ?? []),
			...(badges?.inherited ?? []),
			...(badges?.counts ?? []),
		];
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

	function hasRowClass(row: ListRowInput, className: string): boolean {
		return (row.cls ?? '').split(/\s+/).includes(className);
	}

	function dragEnabled(): boolean {
		return Boolean(effectiveCanReorder && onReorder);
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

	function viewRowToRowInput(row: ViewRow<NodeBase>): ListRowInput {
		return rowInputFromViewRow(row as never) as ListRowInput;
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
</script>

<div bind:this={outerEl} class="vm-view-list vm-explorer-popup-list" role="list" onscroll={onScroll}>
	<div class="vm-view-list-inner vm-explorer-popup-inner" style="height: {totalH}px">
		{#each renderedVirtualRows as virtualRow (virtualRow.key)}
			{@const row = effectiveRows[virtualRow.index]}
			{#if row}
				{@const iconName = rowIcon(row)}
				{@const badges = allBadges(row)}
				{@const actions = rowActions(row)}
				<div
					class="vm-view-list-row vm-explorer-popup-row {row.cls ?? ''}"
					class:is-selected={row.layers.state?.selected}
					class:is-disabled={row.disabled || row.layers.state?.disabled}
					class:is-group={isGroupRow(row)}
					class:is-dragging={draggingRowId === row.id}
					style="position: absolute; top: 0; left: 0; right: 0; height: {virtualRow.size}px; transform: translateY({virtualRow.start}px); --vm-list-depth-indent: {(row.depth ?? 0) * 14}px"
					data-id={row.id}
					data-index={virtualRow.index}
					role="listitem"
					draggable={dragEnabled()}
					ondragstart={(event) => handleDragStart(event, row)}
					ondragover={(event) => handleDragOver(event, row)}
					ondrop={(event) => handleDrop(event, row)}
					ondragend={handleDragEnd}
				>
					{#if iconName}
						<span class="vm-view-list-icon" use:iconAction={iconName}></span>
					{/if}

					<span class="vm-view-list-main">
						<span class="vm-view-list-label">{row.label}</span>
						{#if row.detail}
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
