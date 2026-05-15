<script lang="ts">
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { untrack } from 'svelte';
	import {
		createRafElementRectObserver,
		fallbackFixedVirtualRows,
	} from '../../services/serviceScroll';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewBadge, ViewRow } from '../../types/typeViews';

	interface Props {
		model: ExplorerRenderModel<NodeBase>;
		onAction?: (action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) => void;
		onReorder?: (request: ListReorderRequest) => void;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	interface ListReorderRequest {
		sourceId: string;
		targetId: string;
		position: 'before' | 'after';
	}

	let { model, onAction, onReorder, icon }: Props = $props();

	const LIST_OVERSCAN = 5;
	const LIST_FALLBACK_HEIGHT = 400;
	const LIST_FALLBACK_WIDTH = 320;

	let outerEl: HTMLDivElement | undefined = $state();
	let draggingRowId: string | null = $state(null);
	let fallbackScrollTop = $state(0);
	let fallbackViewportHeight = $state(LIST_FALLBACK_HEIGHT);

	const rowHeight = $derived(model.virtualization.rowHeight);
	const rowCount = $derived(model.rows.length);
	const observeListRect = createRafElementRectObserver<HTMLDivElement, HTMLDivElement>({
		getElement: () => outerEl ?? null,
		fallbackWidth: LIST_FALLBACK_WIDTH,
		fallbackHeight: LIST_FALLBACK_HEIGHT,
	});
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => model.rows[index]?.id ?? index,
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
			getKey: (index) => model.rows[index]?.id ?? index,
		});
	});
	const totalH = $derived($rowVirtualizer.getTotalSize());

	$effect(() => {
		const count = rowCount;
		const rows = model.rows;
		const scrollElement = outerEl;
		const height = rowHeight;
		const overscan = model.virtualization.overscan;
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

	function rowIcon(row: ViewRow<NodeBase>): string | undefined {
		return row.icon ?? row.layers.icons?.[0]?.icon;
	}

	function allBadges(row: ViewRow<NodeBase>): ViewBadge[] {
		const badges = row.layers.badges;
		return [
			...(badges?.ops ?? []),
			...(badges?.filters ?? []),
			...(badges?.warnings ?? []),
			...(badges?.inherited ?? []),
			...(badges?.counts ?? []),
		];
	}

	function handleAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) {
		if (action.disabled) return;
		action.run?.(row);
		onAction?.(action, row);
	}

	function actionRegionClass(row: ViewRow<NodeBase>): string {
		return isQueueChildRow(row)
			? 'vm-view-list-actions is-counter-slot'
			: 'vm-view-list-actions';
	}

	function actionButtonClass(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>): string {
		return [
			'vm-btn-icon',
			action.tone === 'danger' ? 'vm-btn-danger' : '',
			isInlineCancelAction(action, row) ? 'is-inline-cancel' : '',
		]
			.filter(Boolean)
			.join(' ');
	}

	function isGroupRow(row: ViewRow<NodeBase>): boolean {
		return (row.node as { kind?: string }).kind === 'group';
	}

	function isQueueChildRow(row: ViewRow<NodeBase>): boolean {
		return hasRowClass(row, 'is-queue-child');
	}

	function isInlineCancelAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>): boolean {
		return isQueueChildRow(row) && action.id === 'remove';
	}

	function hasRowClass(row: ViewRow<NodeBase>, className: string): boolean {
		return (row.cls ?? '').split(/\s+/).includes(className);
	}

	function dragEnabled(): boolean {
		return Boolean(model.capabilities.canDrag && model.capabilities.canDrop && onReorder);
	}

	function handleDragStart(event: DragEvent, row: ViewRow<NodeBase>) {
		if (!dragEnabled()) return;
		draggingRowId = row.id;
		event.dataTransfer?.setData('text/plain', row.id);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(event: DragEvent, row: ViewRow<NodeBase>) {
		if (!dragEnabled() || !draggingRowId || draggingRowId === row.id) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event: DragEvent, row: ViewRow<NodeBase>) {
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
</script>

<div bind:this={outerEl} class="vm-view-list vm-explorer-popup-list" role="list" onscroll={onScroll}>
	<div class="vm-view-list-inner vm-explorer-popup-inner" style="height: {totalH}px">
		{#each renderedVirtualRows as virtualRow (virtualRow.key)}
			{@const row = model.rows[virtualRow.index]}
			{#if row}
				{@const iconName = rowIcon(row)}
				{@const badges = allBadges(row)}
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

					{#if row.actions.length > 0}
						<span class={actionRegionClass(row)}>
							{#each row.actions as action (action.id)}
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
