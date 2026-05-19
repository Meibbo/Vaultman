<script lang="ts">
	import { getContext, untrack } from 'svelte';
	import { createVirtualizer, type Rect, type Virtualizer } from '@tanstack/svelte-virtual';
	import type { TreeNode } from '../../types/typeNode';
	import {
		rowInputCallbackId,
		rowInputFromTreeNode,
		rowInputGroupKey,
		rowInputToTreeNode,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
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
	import { createExplorerVariableGeometry } from '../../services/serviceExplorerScrollGeometry';
	import {
		NODE_MOUSE_GESTURE_CONFIG,
		NODE_MOUSE_IGNORE_SELECTOR,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';
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
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const CARD_FALLBACK_WIDTH = 560;
	const CARD_FALLBACK_HEIGHT = 360;
	const CARD_MIN_WIDTH = 176;
	const CARD_GAP = 8;
	const CARD_HORIZONTAL_PADDING = 24;
	const CARD_OVERSCAN = 4;
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();

	type ScrollTarget = { id: string; serial: number };

	interface CardItem {
		input: ExplorerRowInput;
		node: TreeNode;
		layout: NodeCardLayout;
	}

	interface CardRow {
		key: string | number;
		cards: CardItem[];
		height: number;
	}

	interface Props {
		providerId: string;
		nodes?: TreeNode[];
		rowInputs?: ExplorerRowInput[];
		projection?: ExplorerProjection;
		visibleFields: readonly string[];
		selectedIds?: ReadonlySet<string>;
		focusedId?: string | null;
		activeId?: string | null;
		onCardClick: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onCardKeydown?: (id: string, e: KeyboardEvent) => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		measure?: TextMeasureService;
		themeService?: ThemeService;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		providerId,
		nodes = [],
		rowInputs = undefined,
		projection = undefined,
		visibleFields,
		selectedIds = EMPTY_SELECTED_IDS,
		focusedId = null,
		activeId = null,
		onCardClick,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		onCardKeydown,
		onBadgeDoubleClick,
		scrollTarget = null,
		mouseGestureConfig,
		measure = createCardsTextMeasureService(),
		themeService = undefined,
		icon,
	}: Props = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let cardsWidth = $state(CARD_FALLBACK_WIDTH);
	let columnCount = $state(columnsForWidth(CARD_FALLBACK_WIDTH));
	let cardMeasureStyle = $state(DEFAULT_NODE_CARD_MEASURE_STYLE);
	let metricsFrame: number | null = null;
	let consumedScrollTargetSerial: number | null = null;
	let fallbackScrollTop = $state(0);
	let fallbackViewportHeight = $state(CARD_FALLBACK_HEIGHT);
	let cardRowIndexCacheRows: readonly CardRow[] | null = null;
	let cardRowIndexCache = new Map<string, number>();
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);
	const presetCtx = getContext<PresetContextValue | undefined>(PRESET_KEY);
	const presetUseNativeDom = $derived(presetCtx?.value().useNativeDom);
	const useNativeDom = $derived(presetUseNativeDom ?? themeService?.useNativeDom ?? false);
	const nativeVocab = $derived<NativeClassVocabulary | null>(
		useNativeDom ? explorerViewContract('cards').nativeDomEmission.panel : null,
	);
	const maskCtx = getContext<NodeElementMaskContextValue | undefined>(NODE_ELEMENT_MASK_KEY);
	const nodeElementMask = $derived(maskCtx?.value() ?? DEFAULT_NODE_ELEMENT_MASK);

	$effect(() => () => mouse.cancelAll());

	const contentWidth = $derived(contentWidthFor(cardsWidth, columnCount));
	const cardInputs = $derived(
		projection
			? rowInputsFromProjection(projection)
			: (rowInputs ?? nodes.map((node) => rowInputFromTreeNode(node))),
	);
	const cardRows = $derived(buildCardRows(cardInputs, columnCount, contentWidth, cardMeasureStyle));
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
	const cardGeometry = $derived(
		createExplorerVariableGeometry({
			rowCount: cardRows.length,
			estimateSize: (index) => (cardRows[index]?.height ?? CARD_HEIGHT_BUCKETS.standard) + CARD_GAP,
		}),
	);
	const renderedRows = $derived.by(() => {
		const visibleRows = virtualRows
			.filter((row) => row.index < cardRows.length)
			.map((row) => ({ key: row.key, index: row.index, start: row.start }));
		if (visibleRows.length > 0 || cardRows.length === 0) return visibleRows;
		const range = cardGeometry.visibleRange({
			scrollTop: fallbackScrollTop,
			viewportHeight: fallbackViewportHeight,
			overscan: CARD_OVERSCAN,
		});
		const out: Array<{ key: string | number; index: number; start: number }> = [];
		for (let index = range.startIndex; index < range.endIndex; index += 1) {
			const row = cardRows[index];
			if (!row) continue;
			out.push({
				key: row.key,
				index,
				start: CARD_GAP + cardGeometry.topForIndex(index),
			});
		}
		return out;
	});
	const totalHeight = $derived.by(() => {
		const virtualTotal = $rowVirtualizer.getTotalSize();
		return virtualTotal > 0 || cardRows.length === 0 ? virtualTotal : CARD_GAP + cardGeometry.totalSize();
	});

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
		if (target.serial === consumedScrollTargetSerial) return;
		const rowIndex = cardRowIndexForId(target.id);
		if (rowIndex < 0) return;
		consumedScrollTargetSerial = target.serial;
		scrollCardRowIntoView(rowIndex);
	});

	$effect(() => {
		if (!outerEl) return;
		updateCardMetrics();
		updateCardMeasureStyle();
		updateCardFallbackViewport();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			scheduleCardMetricsUpdate();
			updateCardMeasureStyle();
			updateCardFallbackViewport();
		});
		ro.observe(outerEl);
		return () => {
			if (metricsFrame !== null) cancelAnimationFrame(metricsFrame);
			metricsFrame = null;
			ro.disconnect();
		};
	});

	function handleCardClick(input: ExplorerRowInput, e: MouseEvent) {
		const callbackId = rowInputCallbackId(input);
		mouse.handleClick(
			{
				key: `cards:${input.id}`,
				eventTarget: e.target,
				ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR,
			},
			e,
			{
				primary: (event) => onCardClick(callbackId, event),
				secondary: (event) => onSecondaryAction?.(callbackId, event),
				tertiary: (event) => onTertiaryAction?.(callbackId, event),
			},
			nodeMouseConfig,
		);
	}

	function handleCardAuxClick(input: ExplorerRowInput, e: MouseEvent) {
		const callbackId = rowInputCallbackId(input);
		mouse.handleAuxClick(
			{
				key: `cards:${input.id}`,
				eventTarget: e.target,
				ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR,
			},
			e,
			{ tertiary: (event) => onTertiaryAction?.(callbackId, event) },
			nodeMouseConfig,
		);
	}

	function handleBadgeKeydown(
		e: KeyboardEvent,
		badge: Parameters<typeof handleNodeBadgePress>[1],
	) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleNodeBadgePress(e, badge, onBadgeDoubleClick);
		}
	}

	function scrollCardRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		const row = cardRows[rowIndex];
		const rowHeight = row?.height ?? CARD_HEIGHT_BUCKETS.standard;
		const viewportHeight = outerEl.clientHeight || CARD_FALLBACK_HEIGHT;
		const rowTop = CARD_GAP + cardGeometry.topForIndex(rowIndex);
		const rowBottom = rowTop + rowHeight;
		const currentTop = outerEl.scrollTop;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		untrack(() =>
			$rowVirtualizer.scrollToIndex(rowIndex, {
				align: rowTop < currentTop ? 'start' : 'end',
				behavior: 'auto',
			}),
		);
		outerEl.scrollTop = nextTop;
		updateCardFallbackViewport();
		outerEl.dispatchEvent(new Event('scroll'));
	}

	function handleCardsScroll(e: Event): void {
		const element = e.currentTarget as HTMLDivElement;
		fallbackScrollTop = element.scrollTop;
		fallbackViewportHeight = element.clientHeight || CARD_FALLBACK_HEIGHT;
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

	function updateCardFallbackViewport() {
		fallbackScrollTop = outerEl?.scrollTop ?? 0;
		fallbackViewportHeight = outerEl?.clientHeight || CARD_FALLBACK_HEIGHT;
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
		items: readonly ExplorerRowInput[],
		columns: number,
		width: number,
		style: typeof cardMeasureStyle,
	): CardRow[] {
		const safeColumns = Math.max(1, columns);
		const rows: CardRow[] = [];
		for (let index = 0; index < items.length; index += safeColumns) {
			const rowInputs = items.slice(index, index + safeColumns);
			const cards = rowInputs.map((input) => {
				const node = rowInputToTreeNode(input);
				return {
					input,
					node,
					layout: measureNodeCard({
						providerId,
						node,
						visibleFields,
						contentWidth: width,
						style,
						measure,
					}),
				};
			});
			rows.push({
				key: rowInputGroupKey(rowInputs, index),
				cards,
				height: rowHeightForCards(cards.map((card) => card.layout)),
			});
		}
		return rows;
	}

	function visibleCardFields(fields: readonly NodeCardLayout['fields'][number][]) {
		return fields.filter((field) => {
			if (field.kind === 'title') return nodeElementMask.label;
			if (field.id === 'count' || field.id === 'files') return nodeElementMask.badges.counts;
			return nodeElementMask.detail;
		});
	}

	function rowStateClassString(state: {
		isSelected: boolean;
		isFocused: boolean;
		isActive: boolean;
	}): string {
		return stateModEmissions(nativeVocab, {
			...state,
			isDragSource: false,
			isDropTarget: false,
			hasActiveMenu: false,
		}).join(' ');
	}

	function cardFieldNativeClass(kind: NodeCardLayout['fields'][number]['kind']): string {
		if (!nativeVocab) return '';
		if (kind === 'title') return nativeVocab.primaryLabel ?? nativeVocab.cellWrapper ?? '';
		return nativeVocab.cellWrapper ?? '';
	}

	function cardVirtualRowKey(rows: readonly CardRow[], index: number): string | number {
		return rows[index]?.key ?? index;
	}

	function cardRowIndexForId(id: string): number {
		if (cardRowIndexCacheRows !== cardRows) {
			cardRowIndexCacheRows = cardRows;
			cardRowIndexCache = new Map<string, number>();
			cardRows.forEach((row, index) => {
				for (const card of row.cards) {
					cardRowIndexCache.set(card.input.id, index);
					cardRowIndexCache.set(rowInputCallbackId(card.input), index);
				}
			});
		}
		return cardRowIndexCache.get(id) ?? -1;
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
	onscroll={handleCardsScroll}
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
					{#each row.cards as card (card.input.id)}
						{@const input = card.input}
						{@const node = card.node}
						{@const layout = card.layout}
						{@const callbackId = rowInputCallbackId(input)}
						{@const isSelected = selectedIds.has(input.id) || selectedIds.has(callbackId)}
						{@const isFocused = focusedId === input.id || focusedId === callbackId}
						{@const isActive = activeId === input.id || activeId === callbackId}
						{@const directBadges = visibleNodeBadgesForMask(
							ownNodeBadges(node),
							nodeElementMask,
						)}
						<div
							class="vm-node-card {node.cls ?? ''} {nativeVocab?.rowRoot ?? ''} {rowStateClassString(
								{ isSelected, isFocused, isActive },
							)}"
							class:is-selected={isSelected}
							class:is-focused={isFocused}
							class:is-active-node={isActive}
							data-id={input.id}
							data-node-id={input.id}
							data-callback-id={callbackId}
							data-card-bucket={layout.bucket}
							role="gridcell"
							tabindex="0"
							aria-selected={isSelected}
							onclick={(e) => handleCardClick(input, e)}
							onauxclick={(e) => handleCardAuxClick(input, e)}
							oncontextmenu={(e) => onContextMenu(callbackId, e)}
							onkeydown={(e) => onCardKeydown?.(callbackId, e)}
						>
							{#if nodeElementMask.media && input.mediaDescriptor}
								<div
									class="vm-node-card-cover {nativeVocab?.coverImage ?? ''}"
									data-media-status={input.mediaDescriptor.status}
									data-media-key={input.mediaDescriptor.mediaKey ?? undefined}
								></div>
							{/if}
							{#if nodeElementMask.icon && visibleFields.includes('icon') && node.icon}
								<span class="vm-node-card-icon" use:icon={node.icon}></span>
							{:else if nodeElementMask.icon}
								<span class="vm-node-card-icon" aria-hidden="true"></span>
							{/if}
							<div class="vm-node-card-fields">
								{#each visibleCardFields(layout.fields) as field (field.id)}
									<span
										class="vm-node-card-field {cardFieldNativeClass(field.kind)}"
										class:is-title={field.kind === 'title'}
										class:is-meta={field.kind === 'meta'}
										data-card-field={field.id}
									>
										{field.text}
									</span>
								{/each}
							</div>
							{#if directBadges.length > 0}
								<div class="vm-node-card-badge-zone">
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
						</div>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
</div>
