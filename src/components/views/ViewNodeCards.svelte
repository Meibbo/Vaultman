<script lang="ts">
	import { untrack } from 'svelte';
	import { createVirtualizer, type Rect, type Virtualizer } from '@tanstack/svelte-virtual';
	import type { TreeNode } from '../../types/typeNode';
	import {
		CARD_HEIGHT_BUCKETS,
		measureNodeCard,
		rowHeightForCards,
		type NodeCardLayout,
	} from '../../services/serviceNodeCardLayout';
	import {
		DEFAULT_NODE_CARD_MEASURE_STYLE,
		nodeCardMeasureStyleKey,
		resolveNodeCardMeasureStyle,
	} from '../../services/serviceNodeCardStyle';
	import {
		createTextMeasureService,
		fallbackTextMeasureEngine,
		type TextMeasureService,
	} from '../../services/serviceTextMeasure';
	import {
		NODE_MOUSE_GESTURE_CONFIG,
		NODE_MOUSE_IGNORE_SELECTOR,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';

	const CARD_FALLBACK_WIDTH = 560;
	const CARD_FALLBACK_HEIGHT = 360;
	const CARD_MIN_WIDTH = 176;
	const CARD_GAP = 8;
	const CARD_HORIZONTAL_PADDING = 24;
	const CARD_OVERSCAN = 4;
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();

	type ScrollTarget = { id: string; serial: number };

	interface CardItem {
		node: TreeNode;
		layout: NodeCardLayout;
	}

	interface CardRow {
		key: string;
		cards: CardItem[];
		height: number;
	}

	interface Props {
		providerId: string;
		nodes: TreeNode[];
		visibleFields: readonly string[];
		selectedIds?: ReadonlySet<string>;
		focusedId?: string | null;
		activeId?: string | null;
		onCardClick: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onCardKeydown?: (id: string, e: KeyboardEvent) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		measure?: TextMeasureService;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		providerId,
		nodes,
		visibleFields,
		selectedIds = EMPTY_SELECTED_IDS,
		focusedId = null,
		activeId = null,
		onCardClick,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		onCardKeydown,
		scrollTarget = null,
		mouseGestureConfig,
		measure = createCardsTextMeasureService(),
		icon,
	}: Props = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let cardsWidth = $state(CARD_FALLBACK_WIDTH);
	let columnCount = $state(1);
	let cardMeasureStyle = $state(DEFAULT_NODE_CARD_MEASURE_STYLE);
	let metricsFrame: number | null = null;
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	const contentWidth = $derived(contentWidthFor(cardsWidth, columnCount));
	const cardRows = $derived(buildCardRows(nodes, columnCount, contentWidth, cardMeasureStyle));
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		getItemKey: (index) => cardVirtualRowKey(cardRows, index),
		estimateSize: () => CARD_HEIGHT_BUCKETS.standard,
		observeElementRect: observeCardsRect,
		overscan: CARD_OVERSCAN,
		initialRect: { width: CARD_FALLBACK_WIDTH, height: CARD_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedRows = $derived.by(() => {
		const visibleRows = virtualRows
			.filter((row) => row.index < cardRows.length)
			.map((row) => ({ key: row.key, index: row.index, start: row.start }));
		if (visibleRows.length > 0 || cardRows.length === 0) return visibleRows;
		let start = CARD_GAP;
		return cardRows.map((row, index) => {
			const out = { key: row.key, index, start };
			start += row.height + CARD_GAP;
			return out;
		});
	});
	const totalHeight = $derived(
		Math.max(
			$rowVirtualizer.getTotalSize(),
			cardRows.reduce((height, row) => height + row.height + CARD_GAP, CARD_GAP),
		),
	);

	$effect(() => {
		const rows = cardRows;
		const count = rows.length;
		const scrollElement = outerEl;
		const width = cardsWidth;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				getItemKey: (index) => cardVirtualRowKey(rows, index),
				estimateSize: (index) => rows[index]?.height ?? CARD_HEIGHT_BUCKETS.standard,
				observeElementRect: observeCardsRect,
				overscan: CARD_OVERSCAN,
				initialRect: { width, height: CARD_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const rowIndex = cardRows.findIndex((row) =>
			row.cards.some((card) => card.node.id === target.id),
		);
		if (rowIndex >= 0) scrollCardRowIntoView(rowIndex);
	});

	$effect(() => {
		if (!outerEl) return;
		updateCardMetrics();
		updateCardMeasureStyle();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			scheduleCardMetricsUpdate();
			updateCardMeasureStyle();
		});
		ro.observe(outerEl);
		return () => {
			if (metricsFrame !== null) cancelAnimationFrame(metricsFrame);
			metricsFrame = null;
			ro.disconnect();
		};
	});

	function handleCardClick(id: string, e: MouseEvent) {
		mouse.handleClick(
			{ key: `cards:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onCardClick(id, event),
				secondary: (event) => onSecondaryAction?.(id, event),
				tertiary: (event) => onTertiaryAction?.(id, event),
			},
			nodeMouseConfig,
		);
	}

	function handleCardAuxClick(id: string, e: MouseEvent) {
		mouse.handleAuxClick(
			{ key: `cards:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(id, event) },
			nodeMouseConfig,
		);
	}

	function scrollCardRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		const row = cardRows[rowIndex];
		const rowHeight = row?.height ?? CARD_HEIGHT_BUCKETS.standard;
		const viewportHeight = outerEl.clientHeight || CARD_FALLBACK_HEIGHT;
		const rowTop = cardRows.slice(0, rowIndex).reduce((top, item) => top + item.height + CARD_GAP, CARD_GAP);
		const rowBottom = rowTop + rowHeight;
		const currentTop = outerEl.scrollTop;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		$rowVirtualizer.scrollToIndex(rowIndex, { align: rowTop < currentTop ? 'start' : 'end' });
		outerEl.scrollTop = nextTop;
		outerEl.dispatchEvent(new Event('scroll'));
	}

	function observeCardsRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		let rectFrame: number | null = null;
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || cardsWidth || CARD_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || CARD_FALLBACK_HEIGHT,
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

	function updateCardMetrics() {
		const width = outerEl?.clientWidth || CARD_FALLBACK_WIDTH;
		cardsWidth = width;
		columnCount = columnsForWidth(width);
	}

	function updateCardMeasureStyle() {
		const nextStyle = resolveNodeCardMeasureStyle(outerEl, cardMeasureStyle);
		if (nodeCardMeasureStyleKey(nextStyle) !== nodeCardMeasureStyleKey(cardMeasureStyle)) {
			cardMeasureStyle = nextStyle;
		}
	}

	function scheduleCardMetricsUpdate() {
		if (typeof requestAnimationFrame === 'undefined') {
			updateCardMetrics();
			return;
		}
		if (metricsFrame !== null) return;
		metricsFrame = requestAnimationFrame(() => {
			metricsFrame = null;
			updateCardMetrics();
		});
	}

	function columnsForWidth(width: number): number {
		const contentWidth = Math.max(CARD_MIN_WIDTH, width - CARD_GAP * 2);
		return Math.max(1, Math.floor((contentWidth + CARD_GAP) / (CARD_MIN_WIDTH + CARD_GAP)));
	}

	function contentWidthFor(width: number, columns: number): number {
		const safeColumns = Math.max(1, columns);
		const available = Math.max(CARD_MIN_WIDTH, width - CARD_GAP * 2);
		return Math.max(1, Math.floor((available - CARD_GAP * (safeColumns - 1)) / safeColumns) - CARD_HORIZONTAL_PADDING);
	}

	function buildCardRows(
		items: TreeNode[],
		columns: number,
		width: number,
		style: typeof cardMeasureStyle,
	): CardRow[] {
		const safeColumns = Math.max(1, columns);
		const rows: CardRow[] = [];
		for (let index = 0; index < items.length; index += safeColumns) {
			const rowNodes = items.slice(index, index + safeColumns);
			const cards = rowNodes.map((node) => ({
				node,
				layout: measureNodeCard({
					providerId,
					node,
					visibleFields,
					contentWidth: width,
					style,
					measure,
				}),
			}));
			rows.push({
				key: rowNodes.map((node) => node.id).join('\u0000'),
				cards,
				height: rowHeightForCards(cards.map((card) => card.layout)),
			});
		}
		return rows;
	}

	function cardVirtualRowKey(rows: readonly CardRow[], index: number): string | number {
		return rows[index]?.key ?? index;
	}

	function createCardsTextMeasureService(): TextMeasureService {
		if (typeof document === 'undefined') {
			return createTextMeasureService({ engine: fallbackTextMeasureEngine });
		}
		if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
			return createTextMeasureService({ engine: fallbackTextMeasureEngine });
		}
		return createTextMeasureService();
	}
</script>

<div
	class="vm-node-cards"
	bind:this={outerEl}
	role="grid"
	aria-multiselectable="true"
	tabindex="-1"
>
	<div
		class="vm-node-cards-inner"
		style:--vm-node-cards-total-h={`${totalHeight}px`}
		style:--vm-node-cards-columns={columnCount}
	>
		{#each renderedRows as virtualRow (virtualRow.key)}
			{@const row = cardRows[virtualRow.index]}
			{#if row}
				<div
					class="vm-node-card-row"
					style:--vm-node-card-y={`${virtualRow.start}px`}
					style:--vm-node-card-row-h={`${row.height}px`}
				>
					{#each row.cards as card (card.node.id)}
						{@const node = card.node}
						{@const layout = card.layout}
						{@const isSelected = selectedIds.has(node.id)}
						{@const isFocused = focusedId === node.id}
						{@const isActive = activeId === node.id}
						<div
							class="vm-node-card {node.cls ?? ''}"
							class:is-selected={isSelected}
							class:is-focused={isFocused}
							class:is-active-node={isActive}
							data-id={node.id}
							data-node-id={node.id}
							data-card-bucket={layout.bucket}
							role="gridcell"
							tabindex="0"
							aria-selected={isSelected}
							onclick={(e) => handleCardClick(node.id, e)}
							onauxclick={(e) => handleCardAuxClick(node.id, e)}
							oncontextmenu={(e) => onContextMenu(node.id, e)}
							onkeydown={(e) => onCardKeydown?.(node.id, e)}
						>
							{#if visibleFields.includes('icon') && node.icon}
								<span class="vm-node-card-icon" use:icon={node.icon}></span>
							{:else}
								<span class="vm-node-card-icon" aria-hidden="true"></span>
							{/if}
							<div class="vm-node-card-fields">
								{#each layout.fields as field (field.id)}
									<span
										class="vm-node-card-field"
										class:is-title={field.kind === 'title'}
										class:is-meta={field.kind === 'meta'}
										data-card-field={field.id}
									>
										{field.text}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
</div>
