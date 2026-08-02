import type {
	PanelWidgetNode,
	PanelWidgetProjection,
	PanelWidgetPvpuiConfig,
} from '../types/typePanelWidget';

export const PANEL_WIDGET_HOST_ID = 'vaultman-frame-navbar';

/**
 * The Props panelWidget keeps one slot between `search` and `collapse/expand`
 * for the control that acts on the current file. `reveal this file` occupies it
 * at rest; a composing operation mode takes it over, because revealing the
 * active file's own properties is meaningless while a cross-property move is
 * being composed. Reusing the slot is what makes the two mutually exclusive by
 * construction instead of by a rule someone has to remember.
 */
export const PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER = 20;

export interface PanelWidgetExclusiveSlot {
	/** What holds the slot at rest, or `null` when nothing does. */
	idleNode: PanelWidgetNode | null;
	/** The controls of an active operation mode, which take the slot over. */
	moveMode: { proceed: PanelWidgetNode; cancel: PanelWidgetNode } | null;
}

export function resolveExclusiveSlotNodes({
	idleNode,
	moveMode,
}: PanelWidgetExclusiveSlot): readonly PanelWidgetNode[] {
	if (moveMode) return Object.freeze([moveMode.proceed, moveMode.cancel]);
	return Object.freeze(idleNode ? [idleNode] : []);
}

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
