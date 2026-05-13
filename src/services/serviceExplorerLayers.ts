import type { ActiveFilterEntry, NodeBase, QueueChange } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';
import type { TreeNode } from '../types/typeNode';
import type {
	ExplorerViewMode,
	ExplorerViewRevisions,
	IViewService,
	ViewLayers,
} from '../types/typeViews';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../utils/utilViewLayers';

export interface ExplorerLayerBatchInput<TNode extends NodeBase> {
	viewService: Pick<IViewService, 'getModel'>;
	explorerId: string;
	mode: ExplorerViewMode;
	nodes: readonly TNode[];
	operations?: readonly QueueChange[];
	activeFilters?: readonly ActiveFilterEntry[];
	revisions?: ExplorerViewRevisions;
	getLabel?: (node: TNode) => string;
	getDetail?: (node: TNode) => string | undefined;
	getDecorationContext?: (node: TNode) => unknown;
}

export interface ExplorerLayerBridgeOptions {
	operations?: readonly QueueChange[];
	includeBadges?: boolean;
	attachLayersToMeta?: boolean;
	deletedClass?: string;
}

export function buildExplorerLayerMap<TNode extends NodeBase>(
	input: ExplorerLayerBatchInput<TNode>,
): ReadonlyMap<string, ViewLayers> {
	if (input.nodes.length === 0) return new Map();
	const model =
		getActivePerfProbe()?.measure(
			'explorerDataPlane.layers.batch',
			{
				nodes: input.nodes.length,
				operations: input.operations?.length ?? 0,
				filters: input.activeFilters?.length ?? 0,
			},
			() => getLayerModel(input),
		) ?? getLayerModel(input);
	const layers = new Map<string, ViewLayers>();
	for (const row of model.rows) layers.set(row.id, row.layers);
	return layers;
}

function getLayerModel<TNode extends NodeBase>(input: ExplorerLayerBatchInput<TNode>) {
	return input.viewService.getModel({
		explorerId: input.explorerId,
		mode: input.mode,
		nodes: input.nodes,
		operations: input.operations,
		activeFilters: input.activeFilters,
		revisions: input.revisions,
		getLabel: input.getLabel,
		getDetail: input.getDetail,
		getDecorationContext: input.getDecorationContext,
	});
}

export function decorateTreeWithExplorerLayers<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	layersById: ReadonlyMap<string, ViewLayers>,
	options: ExplorerLayerBridgeOptions = {},
): TreeNode<TMeta>[] {
	return nodes.map((node) => {
		const layers = layersById.get(node.id);
		const next: TreeNode<TMeta> = {
			...node,
			children: node.children
				? decorateTreeWithExplorerLayers(node.children, layersById, options)
				: undefined,
		};
		if (!layers) return next;

		next.icon = layers.icons?.[0]?.icon;
		next.highlights = highlightsFromViewLayers(layers);
		next.cls = withViewStateClasses(node.cls, layers, {
			deletedClass: options.deletedClass,
		});
		if (options.includeBadges !== false) {
			const badges = nodeBadgesFromViewLayers(layers, options.operations);
			next.badges = badges.length > 0 ? badges : undefined;
		}
		if (options.attachLayersToMeta !== false) next.meta = metaWithLayers(node.meta, layers);
		return next;
	});
}

export function flattenTreeNodes<TMeta>(nodes: readonly TreeNode<TMeta>[]): TreeNode<TMeta>[] {
	const out: TreeNode<TMeta>[] = [];
	const visit = (list: readonly TreeNode<TMeta>[]) => {
		for (const node of list) {
			out.push(node);
			if (node.children?.length) visit(node.children);
		}
	};
	visit(nodes);
	return out;
}

function metaWithLayers<TMeta>(meta: TMeta, layers: ViewLayers): TMeta {
	if (!meta || typeof meta !== 'object') return meta;
	return { ...(meta as Record<string, unknown>), layers } as TMeta;
}
