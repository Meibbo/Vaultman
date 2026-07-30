export interface MeasuredPanelWidgetNode {
	id: string;
	width: number;
	condensable?: boolean;
}

export interface PanelWidgetOverflowResult {
	visibleIds: string[];
	overflowIds: string[];
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
