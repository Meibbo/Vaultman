import type {
	PanelWidgetNode,
	PanelWidgetProjection,
	PanelWidgetPvpuiConfig,
} from '../types/typePanelWidget';

export const PANEL_WIDGET_HOST_ID = 'vaultman-frame-navbar';

export function resolvePanelWidgetProjection({
	providerId,
	nodes,
	config,
}: {
	providerId: string;
	nodes: readonly PanelWidgetNode[];
	config: PanelWidgetPvpuiConfig;
}): PanelWidgetProjection {
	const seen = new Set<string>();
	for (const node of nodes) {
		if (seen.has(node.id)) {
			throw new Error(`Duplicate panelWidget node id: ${node.id}`);
		}
		seen.add(node.id);
	}

	const hidden = new Set(config.hiddenNodeIds ?? []);
	const configuredOrder = new Map(
		(config.nodeOrder ?? []).map((id, index) => [id, index]),
	);
	const fallbackOffset = configuredOrder.size;
	const resolvedNodes = nodes
		.map((node, sourceIndex) => ({ node, sourceIndex }))
		.filter(({ node }) => !hidden.has(node.id))
		.sort((left, right) => {
			const leftConfigured = configuredOrder.get(left.node.id);
			const rightConfigured = configuredOrder.get(right.node.id);
			const leftOrder =
				leftConfigured ?? fallbackOffset + left.node.order;
			const rightOrder =
				rightConfigured ?? fallbackOffset + right.node.order;
			return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
		})
		.map(({ node }) => node);

	return {
		hostId: PANEL_WIDGET_HOST_ID,
		providerId,
		nodes: resolvedNodes,
	};
}
