<script lang="ts">
	import { getContext } from 'svelte';
	import type { TreeNode } from '../../types/typeNode';
	import {
		rowInputCallbackId,
		rowInputFromTreeNode,
		rowInputToTreeNode,
		type ExplorerRowInput,
	} from '../../services/serviceExplorerRowInput';
	import {
		rowInputsFromProjection,
		type ExplorerProjection,
	} from '../../services/serviceExplorerProjection';
	import {
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
		createVariableProviderRegistry,
		laneOffsetForIndex,
		laneRangeForBand,
	} from '../../services/serviceSharedVirtualLayout';
	import {
		SharedVariableVirtualLayout,
		getSharedGeometryRegistry,
	} from '../../services/serviceSharedVirtualLayout.svelte';
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
	import { createRowAction, type RowProps, type RowState } from '../../services/serviceRowAction';
	import type { DndViewState } from '../../services/serviceDnd';
	import { stateModEmissions } from '../../services/serviceNodeClassEmission';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	const CARD_FALLBACK_WIDTH = 560;
	const CARD_FALLBACK_HEIGHT = 360;
	const CARD_MIN_WIDTH = 176;
	const CARD_GAP = 8;
	const CARD_HORIZONTAL_PADDING = 24;
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();

	type ScrollTarget = { id: string; serial: number };

	interface CardItem {
		input: ExplorerRowInput;
		node: TreeNode;
		layout: NodeCardLayout;
	}

	/** One rendered row-band: the cards sharing a virtualized y-offset (see ViewNodeGrid precedent). */
	interface CardVirtualBand {
		bandIndex: number;
		renderKey: string | number;
		start: number;
		cards: CardItem[];
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
		dndStateForId?: (id: string) => DndViewState | undefined;
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
		dndStateForId,
		icon,
	}: Props = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let cardsWidth = $state(CARD_FALLBACK_WIDTH);
	let columnCount = $state(columnsForWidth(CARD_FALLBACK_WIDTH));
	let cardMeasureStyle = $state(DEFAULT_NODE_CARD_MEASURE_STYLE);
	let metricsFrame: number | null = null;
	let consumedScrollTargetSerial: number | null = null;
	let cardItemIndexCacheInputs: readonly ExplorerRowInput[] | null = null;
	let cardItemIndexCache = new Map<string, number>();
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
	const cardsFeatures = explorerViewContract('cards').features;
	const rowAction = $derived(
		createRowAction({
			explorerId: providerId,
			role: 'gridcell',
			features: cardsFeatures,
			contract: {
				onToggle: noopCardToggle,
				onContextMenu,
				onRowKeydown: onCardKeydown,
			},
		}),
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

	// Shared render-runtime (V.D, slice 2b): cards adopts the SAME variable-height + lanes
	// strategy grid already uses band-for-band — `laneCount` = `columnCount` (the responsive
	// column count), and the layout runs over the FLAT top-level item list: the shared
	// striped-Fenwick band math (`laneOffsetForIndex`/`laneRangeForBand`) replaces the local
	// `buildCardRows` chunking + local `createExplorerVariableGeometry` + TanStack `setOptions`
	// seam + fallback cover path this component carried (D-2b-1 full migration). A column-count
	// change is a genuine RESHAPE per the locked 2a warmth semantics (band boundaries move) — the
	// shape-keyed registry gives each `(providerId, laneCount)` its own permanently-warm Fenwick.
	// `providerId` keys the warm per-provider registry (context'd once near the explorer root by
	// ViewHost); standalone mounts (most component tests) fall back to a local, unshared registry.
	//
	// CARD_GAP is folded INTO every stored band size (`cardBandEstimate`/`cardBandRealHeight` both
	// return `predictedHeight + CARD_GAP`) rather than kept purely in view-turf arithmetic layered
	// on top of gap-free Fenwick offsets — a DELIBERATE departure from the initial "gap-free
	// runtime, gap in the view's positioning only" design, discovered wrong via this slice's own
	// deep-scroll characterization test (`viewNodeVariableScrollFallback.test.ts`'s 2,000-node
	// reveal): the shell's `{@attach layout.attach}` scroll listener (frozen,
	// `serviceSharedVirtualLayout.svelte.ts`) syncs `layout.scrollTop = node.scrollTop` DIRECTLY
	// from the real DOM's `scrollTop` on every real scroll event — there is no seam to convert a
	// gap-inclusive DOM scroll position into the Fenwick's gap-free coordinate space before that
	// assignment. Keeping the Fenwick gap-free while the DOM/CSS render gap-inclusive positions
	// means `layout.scrollTop` (and hence `variableVisibleRange`'s window) silently drifts off the
	// visible target by (bandsScrolledPast * CARD_GAP) on any real scroll — invisible at small
	// scroll depths (drift << overscan margin) but catastrophic at deep scroll (drift of ~5000px
	// at ~2,000 nodes pushed the rendered window ~40 bands off the revealed target, reproduced by
	// the failing characterization test before this fix). Folding the gap into the STORED Fenwick
	// size keeps DOM-scroll-space and Fenwick-space 1:1 (same trick ViewNodeGrid gets for free via
	// its `padding-bottom` CSS + `offsetHeight` measurement — real DOM layout naturally includes
	// the padding in what gets measured; cards' pretext prediction has no such free ride since
	// `measureRow`'s `sizeOf` override is a plain JS number, not a DOM read, so the `+ CARD_GAP` is
	// added explicitly here instead), matching the PRE-ADOPTION Fenwick's own
	// `estimateSize: (index) => row.height + CARD_GAP` exactly. `cardBandTop` below needs only ONE
	// leading `CARD_GAP` (the gap before band 0), not per-band accumulation, because every OTHER
	// band's gap already lives inside its own measured/estimated size.
	//
	// `estimateSize` computes the band's PREDICTED height (+gap) on demand (pretext text-
	// measurement via `measureNodeCard`/`rowHeightForCards` — the same synchronous prediction
	// `buildCardRows` used eagerly for every row; now only the queried band is computed) — cards'
	// height is a synchronous TEXT-WRAP PREDICTION, not a real-DOM measurement, so the shell's
	// `measureRow` below is wired with that SAME prediction as its `sizeOf` override (D-2b-2),
	// mirroring ViewNodeTable's pretext precedent rather than ViewNodeGrid's `offsetHeight` default:
	// the estimate and the "real" measured size are the SAME synchronous computation here, so
	// `measureRow` settles on the first pass, never a flash-of-wrong-height correction.
	// svelte-ignore state_referenced_locally -- the layout controller (and the provider key it
	// warms) is intentionally fixed per mounted view instance: a provider swap is a different
	// panel, not a reshape of this one (same lifecycle stance as ViewHost's inherited service).
	// Reactive inputs (rowCount / keys / estimates / laneCount) flow through the option getters;
	// the `laneCount` getter tracks `columnCount` (the single place it changes, in updateCardMetrics).
	const cardProviderId = projection?.providerId ?? providerId;
	const localGeometryRegistry = getSharedGeometryRegistry() ?? createVariableProviderRegistry();
	const layout = new SharedVariableVirtualLayout({
		providerId: cardProviderId,
		registry: localGeometryRegistry,
		rowCount: () => cardInputs.length,
		estimateSize: (itemIndex) => cardBandEstimate(itemIndex),
		laneCount: () => columnCount,
		getKey: (itemIndex) => cardInputs[itemIndex]?.id ?? itemIndex,
		resolveId: (itemIndex) => cardInputs[itemIndex]?.id,
		fallbackViewportHeight: CARD_FALLBACK_HEIGHT,
	});

	/**
	 * The rendered row-bands: `layout.rows` (one entry per card, each carrying its `lane`) grouped
	 * back into bands purely for the template — the band wrapper positions a row of cards at one
	 * shared y-offset, exactly the DOM shape the pre-adoption cards view rendered. The grouping is
	 * O(window) over the visible+overscan range (never the whole item list — that was
	 * `buildCardRows`, deleted) and uses the shared `laneOffsetForIndex` band math, so it can never
	 * disagree with the Fenwick's banding. Each card's `NodeCardLayout` is computed here (same
	 * `measureNodeCard` call `buildCardRows` made), windowed to the rendered range.
	 */
	const cardVirtualBands: CardVirtualBand[] = $derived.by(() => {
		const inputs = cardInputs;
		const width = contentWidth;
		const style = cardMeasureStyle;
		const lanes = Math.max(1, Math.floor(layout.laneCount));
		const bands: CardVirtualBand[] = [];
		let current: CardVirtualBand | null = null;
		for (const row of layout.rows) {
			const input = inputs[row.index];
			if (!input) continue;
			const band = laneOffsetForIndex(row.index, lanes).band;
			if (!current || current.bandIndex !== band) {
				current = { bandIndex: band, renderKey: input.id, start: row.start, cards: [] };
				bands.push(current);
			}
			const node = rowInputToTreeNode(input);
			current.cards.push({
				input,
				node,
				layout: measureNodeCard({ providerId, node, visibleFields, contentWidth: width, style, measure }),
			});
		}
		return bands;
	});

	/**
	 * Total scrollable content height (px). Since every band's STORED Fenwick size already
	 * includes its own CARD_GAP (see the `layout` constructor docblock above), `layout.totalHeight`
	 * would need only a single leading gap added — EXCEPT `layout.totalHeight`'s own derived has a
	 * flagged staleness bug after a `laneCount` reshape (reported, NOT patched —
	 * `serviceSharedVirtualLayout.svelte.ts` is frozen for this slice): it reads the registry's
	 * Fenwick handle via a plain non-reactive `Map` lookup and only tracks `#measurementRevision`;
	 * a reshape silently REPLACES that Map entry (proven correct by
	 * `serviceSharedVirtualLayoutVariableShell.test.ts`'s "genuine reshape" case) without bumping
	 * the revision, so `totalHeight` can return a value computed against the Fenwick from BEFORE
	 * the reshape. `topForIndex`/`sizeForIndex` are plain pass-through METHODS (not `$derived`-
	 * cached) — each call queries the CURRENT registry entry fresh, so summing the last band's
	 * top+size can never observe that staleness. Zero bands -> zero height exactly (no orphan
	 * leading gap for an empty list), matching TanStack's own `getTotalSize()` returning
	 * `paddingStart` (unset, so 0) when there is nothing to measure — the pre-adoption
	 * `totalHeight` derived used that raw virtualizer total whenever `cardRows.length === 0`.
	 */
	const cardsTotalHeight = $derived.by(() => {
		const bandCount = cardBandCount;
		if (bandCount === 0) return 0;
		const lastBand = bandCount - 1;
		return CARD_GAP + layout.topForIndex(lastBand) + layout.sizeForIndex(lastBand);
	});

	/**
	 * Total band count under the current lane count — used by `cardsTotalHeight`'s empty-list
	 * guard. Mirrors `laneOffsetForIndex`'s own band derivation so it can never disagree with the
	 * per-band offsets the template actually renders.
	 */
	const cardBandCount = $derived.by(() => {
		const lanes = Math.max(1, Math.floor(layout.laneCount));
		return Math.max(0, Math.ceil(cardInputs.length / lanes));
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		if (target.serial === consumedScrollTargetSerial) return;
		const itemIndex = cardItemIndexForId(target.id);
		if (itemIndex < 0) return;
		consumedScrollTargetSerial = target.serial;
		scrollCardRowIntoView(laneOffsetForIndex(itemIndex, layout.laneCount).band);
	});

	// Container metrics only (width -> responsive column count). Viewport height / scrollTop /
	// per-band measurement all moved into the shared runtime: `layout.attach` owns the scroll
	// listener + viewport ResizeObserver, and `layout.measureRow` (template) owns band heights.
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

	function scrollCardRowIntoView(bandIndex: number): void {
		if (!outerEl) return;
		// Read the viewport live (clientHeight), not the layout's tracked $state, so reveal works
		// even when no scroll/resize event has refreshed it since the element was last sized —
		// matches the shared runtime's own fixed-path scrollToIndex + ViewNodeTable's
		// scrollTableRowIntoView precedent. Band top/size come from the warm Fenwick (off-window
		// reach, gap-inclusive — see the `layout` constructor docblock for why CARD_GAP lives
		// inside the stored sizes rather than as separate view-turf offset arithmetic).
		const viewportHeight = outerEl.clientHeight || CARD_FALLBACK_HEIGHT;
		const currentTop = outerEl.scrollTop;
		const rowTop = cardBandTop(bandIndex);
		const rowBottom = rowTop + layout.sizeForIndex(bandIndex);
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		// DOM scroll space and Fenwick space are 1:1 now (CARD_GAP folded into every stored band
		// size — see the `layout` constructor docblock), so `layout.scrollTop` takes the SAME
		// `nextTop` the real DOM element scrolls to, no separate gap-space conversion needed.
		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		outerEl.scrollTop = nextTop;
		layout.scrollTop = nextTop;
		layout.viewportHeight = viewportHeight;
		outerEl.dispatchEvent(new Event('scroll'));
	}

	/**
	 * Rendered top offset (px) for band `bandIndex`. Only ONE leading CARD_GAP is added here (the
	 * gap before band 0) — every other inter-band gap already lives INSIDE `layout.topForIndex`'s
	 * cumulative sum, because each band's stored Fenwick size already includes its own trailing
	 * CARD_GAP (see the `layout` constructor docblock: this keeps DOM-scroll-space and
	 * Fenwick-space 1:1, required by the frozen shell's direct `scrollTop` sync). Matches the
	 * pre-adoption `CARD_GAP + cardGeometry.topForIndex(index)` exactly, since that Fenwick ALSO
	 * stored gap-inclusive sizes.
	 */
	function cardBandTop(bandIndex: number): number {
		return CARD_GAP + layout.topForIndex(bandIndex);
	}

	// Keep the runtime's lane strategy in step with the responsive column count. A lane-count
	// change is a genuine reshape (locked 2a semantics): the shape-keyed registry parks the old
	// shape's warm Fenwick and activates (or creates) the one for the new shape.
	function updateCardMetrics() {
		const width = outerEl?.clientWidth || CARD_FALLBACK_WIDTH;
		cardsWidth = width;
		const nextColumnCount = columnsForWidth(width);
		if (columnCount !== nextColumnCount) columnCount = nextColumnCount;
		if (layout.laneCount !== nextColumnCount) layout.laneCount = nextColumnCount;
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

	function cardRowProps(id: string, state: RowState): RowProps {
		return rowAction.getRowProps(id, state);
	}

	function noopCardToggle(): void {}

	/**
	 * Structural band-height ESTIMATE for the shared runtime — the SAME synchronous pretext
	 * prediction `buildCardRows` used eagerly for every row (`measureNodeCard`/`rowHeightForCards`),
	 * now computed on demand for just the queried band. The runtime hands this the band's FIRST
	 * item index; `laneOffsetForIndex`/`laneRangeForBand` recover the band's item slice under the
	 * current column count. Because the prediction is synchronous and deterministic, this doubles
	 * as the `measureRow` `sizeOf` source (see the template) — there is no separate "real" DOM
	 * measurement pass the way ViewNodeGrid's `offsetHeight` default provides one.
	 */
	function cardBandEstimate(itemIndex: number): number {
		const lanes = Math.max(1, Math.floor(columnCount));
		const band = laneOffsetForIndex(itemIndex, lanes).band;
		const itemRange = laneRangeForBand({ startIndex: band, endIndex: band + 1 }, lanes);
		const bandInputs = cardInputs.slice(itemRange.startIndex, itemRange.endIndex);
		const layouts = bandInputs.map((input) =>
			measureNodeCard({
				providerId,
				node: rowInputToTreeNode(input),
				visibleFields,
				contentWidth,
				style: cardMeasureStyle,
				measure,
			}),
		);
		return CARD_GAP + rowHeightForCards(layouts);
	}

	/** CONTENT-only band height (no gap) for an already-built band's cards — the CSS row height. */
	function cardBandContentHeight(cards: readonly CardItem[]): number {
		return rowHeightForCards(cards.map((card) => card.layout));
	}

	/**
	 * GAP-INCLUSIVE band height for an already-built band's cards — the `measureRow` sizeOf (feeds
	 * the Fenwick, which stores gap-inclusive sizes; see the `layout` constructor docblock).
	 */
	function cardBandRealHeight(cards: readonly CardItem[]): number {
		return CARD_GAP + cardBandContentHeight(cards);
	}

	function visibleCardFields(fields: readonly NodeCardLayout['fields'][number][]) {
		return fields.filter((field) => {
			if (field.kind === 'title') return nodeElementMask.label;
			if (field.id === 'count' || field.id === 'files') return nodeElementMask.badges.counts;
			return nodeElementMask.detail;
		});
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

	function cardFieldNativeClass(kind: NodeCardLayout['fields'][number]['kind']): string {
		if (!nativeVocab) return '';
		if (kind === 'title') return nativeVocab.primaryLabel ?? nativeVocab.cellWrapper ?? '';
		return nativeVocab.cellWrapper ?? '';
	}

	/**
	 * Flat item index for a card id (own id or callback id) — cached per `cardInputs` array
	 * identity; the ITEM index is column-count-independent, so a resize never invalidates it — the
	 * band is derived at lookup time via `laneOffsetForIndex` (see the scrollTarget $effect).
	 */
	function cardItemIndexForId(id: string): number {
		const inputs = cardInputs;
		if (cardItemIndexCacheInputs !== inputs) {
			cardItemIndexCacheInputs = inputs;
			cardItemIndexCache = new Map<string, number>();
			inputs.forEach((input, index) => {
				cardItemIndexCache.set(input.id, index);
				cardItemIndexCache.set(rowInputCallbackId(input), index);
			});
		}
		return cardItemIndexCache.get(id) ?? -1;
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
	{@attach layout.attach}
>
	<div
		class="vm-node-cards-inner"
		style:--vm-node-cards-total-h={`${cardsTotalHeight}px`}
		style:--vm-node-cards-columns={columnCount}
	>
		{#each cardVirtualBands as band (band.renderKey)}
			<div
				class="vm-node-card-row"
				style:--vm-node-card-y={`${cardBandTop(band.bandIndex)}px`}
				style:--vm-node-card-row-h={`${cardBandContentHeight(band.cards)}px`}
				{@attach layout.measureRow(band.bandIndex, () => cardBandRealHeight(band.cards))}
			>
				{#each band.cards as card (card.input.id)}
					{@const input = card.input}
					{@const node = card.node}
					{@const cardLayout = card.layout}
					{@const callbackId = rowInputCallbackId(input)}
					{@const isSelected = selectedIds.has(input.id) || selectedIds.has(callbackId)}
					{@const isFocused = focusedId === input.id || focusedId === callbackId}
					{@const isActive = activeId === input.id || activeId === callbackId}
					{@const directBadges = visibleNodeBadgesForMask(
						ownNodeBadges(node),
						nodeElementMask,
					)}
					{@const dndState = dndStateForId?.(input.id)}
					<div
						class="vm-node-card {node.cls ?? ''} {nativeVocab?.rowRoot ?? ''} {rowStateClassString(
							{ isSelected, isFocused, isActive },
							dndState,
						)}"
						class:is-selected={isSelected}
						class:is-focused={isFocused}
						class:is-active-node={isActive}
						data-id={input.id}
						data-node-id={input.id}
						data-callback-id={callbackId}
						data-card-bucket={cardLayout.bucket}
						onclick={(e) => handleCardClick(input, e)}
						onauxclick={(e) => handleCardAuxClick(input, e)}
						{...cardRowProps(callbackId, {
							selected: isSelected,
							focused: isFocused,
							expandable: false,
							expanded: false,
						})}
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
							{#each visibleCardFields(cardLayout.fields) as field (field.id)}
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
		{/each}
	</div>
</div>
