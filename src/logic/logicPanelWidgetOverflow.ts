export interface MeasuredPanelWidgetNode {
	id: string;
	width: number;
	condensable?: boolean;
}

export interface PanelWidgetOverflowResult {
	visibleIds: string[];
	overflowIds: string[];
}

/**
 * The narrowest inline search field that is still usable. Below this the field
 * is better off on its own row than squeezing the action nodes.
 */
export const MIN_INLINE_SEARCH_WIDTH = 160;

/**
 * U121-029: whether the expanded search field has to drop to its own row.
 *
 * This is a measurement, not a breakpoint. It used to be
 * `@container (max-width: 799px)` — a threshold wider than any Obsidian
 * sidebar, so in a sidebar the field was supposed to always wrap; in practice
 * the wrap fought the packer, which assumes the action row is a single line, and
 * the Tools button ended up on the second row while the field stayed inline.
 *
 * The row is owned by the action nodes. The field may share it only if what is
 * left after the nodes (and the Tools button, when it is showing) is still a
 * usable field. It is deliberately independent of the overflow strategy: the dev
 * wants the second row under condensed, scroll and wrap alike.
 */
export function searchNeedsOwnRow({
	availableWidth,
	nodeWidths,
	gap,
	toolsWidth,
	minSearchWidth = MIN_INLINE_SEARCH_WIDTH,
}: {
	availableWidth: number;
	/** Widths of the nodes that stay in the bar, excluding the search field. */
	nodeWidths: readonly number[];
	gap: number;
	/** 0 when no Tools button is showing. */
	toolsWidth: number;
	minSearchWidth?: number;
}): boolean {
	// An unmeasurable bar decides nothing, exactly as the packer does.
	if (availableWidth <= 0) return false;
	const items = nodeWidths.filter((width) => width > 0);
	const itemCount = items.length + (toolsWidth > 0 ? 1 : 0);
	const used =
		items.reduce((total, width) => total + width, 0) +
		Math.max(0, toolsWidth) +
		// One gap per item, including the one before the field itself.
		Math.max(0, itemCount) * Math.max(0, gap);
	return availableWidth - used < minSearchWidth;
}

export function resolveCondensedPanelWidgetOverflow({
	availableWidth,
	nodes,
	gap,
	toolsWidth,
}: {
	availableWidth: number;
	nodes: readonly MeasuredPanelWidgetNode[];
	gap: number;
	toolsWidth: number;
}): PanelWidgetOverflowResult {
	const widthOf = (
		visible: readonly MeasuredPanelWidgetNode[],
		includeTools: boolean,
	): number => {
		const itemCount = visible.length + (includeTools ? 1 : 0);
		const itemWidth =
			visible.reduce((total, node) => total + Math.max(0, node.width), 0) +
			(includeTools ? Math.max(0, toolsWidth) : 0);
		return itemWidth + Math.max(0, itemCount - 1) * Math.max(0, gap);
	};

	// U121-029: a non-positive available width means the bar could not be
	// measured — a page mid-slide, a hidden toolbar (`height: 0`), a collapsed
	// or still-deferred sidebar. Treating it as "nothing fits" condensed the
	// whole bar into Tools for one frame and then restored it, which is the
	// flicker the dev sees when switching provider quickly. An unmeasurable bar
	// must keep whatever it already shows, so report everything visible and let
	// the next real measurement decide.
	if (availableWidth <= 0) {
		return { visibleIds: nodes.map((node) => node.id), overflowIds: [] };
	}

	if (widthOf(nodes, false) <= Math.max(0, availableWidth)) {
		return {
			visibleIds: nodes.map((node) => node.id),
			overflowIds: [],
		};
	}

	const condensable = nodes.filter((node) => node.condensable !== false);
	let hiddenCount = Math.min(2, condensable.length);
	let hiddenIds = new Set(
		condensable.slice(condensable.length - hiddenCount).map((node) => node.id),
	);
	let visible = nodes.filter((node) => !hiddenIds.has(node.id));

	while (
		hiddenCount < condensable.length &&
		widthOf(visible, true) > Math.max(0, availableWidth)
	) {
		hiddenCount += 1;
		hiddenIds = new Set(
			condensable
				.slice(condensable.length - hiddenCount)
				.map((node) => node.id),
		);
		visible = nodes.filter((node) => !hiddenIds.has(node.id));
	}

	return {
		visibleIds: visible.map((node) => node.id),
		overflowIds: nodes
			.filter((node) => hiddenIds.has(node.id))
			.map((node) => node.id),
	};
}
