import type { ActiveFilterEntry, NodeBase, QueueChange } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';
import type { TreeNode } from '../types/typeNode';
import type {
	ExplorerViewMode,
	ExplorerViewRevisions,
	IViewService,
	ViewAction,
	ViewLayers,
} from '../types/typeViews';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../utils/utilViewLayers';
import type { ExplorerProjection, ExplorerProjectionRow } from './serviceExplorerProjection';

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

export interface ExplorerProjectionLayerBuildInput<TMeta = unknown> {
	viewService: Pick<IViewService, 'getModel'>;
	projection: ExplorerProjection<TMeta>;
	operations?: readonly QueueChange[];
	activeFilters?: readonly ActiveFilterEntry[];
	revisions?: ExplorerViewRevisions;
	getActions?: (row: ExplorerProjectionRow<TMeta>) => readonly ViewAction<TreeNode<TMeta>>[];
	getDecorationContext?: (row: ExplorerProjectionRow<TMeta>) => unknown;
}

export interface ExplorerProjectionLayerBatch<TMeta = unknown> {
	revisionKey: string;
	layersById: ReadonlyMap<string, ViewLayers>;
	actionsById: ReadonlyMap<string, readonly ViewAction<TreeNode<TMeta>>[]>;
}

export interface ExplorerLayerBuilder {
	build<TMeta = unknown>(
		input: ExplorerProjectionLayerBuildInput<TMeta>,
	): ExplorerProjectionLayerBatch<TMeta>;
	clear(): void;
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

export function createExplorerLayerBuilder(): ExplorerLayerBuilder {
	const cache = new Map<string, ExplorerProjectionLayerBatch<unknown>>();

	return {
		build<TMeta = unknown>(
			input: ExplorerProjectionLayerBuildInput<TMeta>,
		): ExplorerProjectionLayerBatch<TMeta> {
			const revisionKey = explorerProjectionLayerRevisionKey(input);
			const cached = cache.get(revisionKey);
			if (cached) return cached as ExplorerProjectionLayerBatch<TMeta>;

			const rowsById = new Map(input.projection.rows.map((row) => [row.id, row]));
			const nodes = input.projection.rows.map((row) => row.node);
			const model =
				getActivePerfProbe()?.measure(
					'explorer.layers.build',
					{ nodes: nodes.length },
					() => buildProjectionLayerModel(input, rowsById, nodes),
				) ?? buildProjectionLayerModel(input, rowsById, nodes);
			const layersById = new Map<string, ViewLayers>();
			const actionsById = new Map<string, readonly ViewAction<TreeNode<TMeta>>[]>();

			for (const row of model.rows) {
				layersById.set(row.id, row.layers);
				actionsById.set(row.id, row.actions);
			}

			const batch: ExplorerProjectionLayerBatch<TMeta> = {
				revisionKey,
				layersById,
				actionsById,
			};
			cache.set(revisionKey, batch as ExplorerProjectionLayerBatch<unknown>);
			return batch;
		},

		clear(): void {
			cache.clear();
		},
	};
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

function buildProjectionLayerModel<TMeta>(
	input: ExplorerProjectionLayerBuildInput<TMeta>,
	rowsById: ReadonlyMap<string, ExplorerProjectionRow<TMeta>>,
	nodes: readonly TreeNode<TMeta>[],
) {
	return input.viewService.getModel({
		explorerId: input.projection.providerId,
		mode: input.projection.viewMode,
		nodes,
		operations: input.operations,
		activeFilters: input.activeFilters,
		revisions: input.revisions,
		getLabel: (node) => rowsById.get(node.id)?.rowInput.label ?? node.label,
		getDetail: (node) => rowsById.get(node.id)?.rowInput.detail,
		getActions: (node) => {
			const row = rowsById.get(node.id);
			if (!row) return [];
			return input.getActions?.(row) ?? row.rowInput.actions ?? [];
		},
		getDecorationContext: input.getDecorationContext
			? (node) => {
					const row = rowsById.get(node.id);
					return row ? input.getDecorationContext?.(row) : undefined;
				}
			: undefined,
	});
}

function explorerProjectionLayerRevisionKey<TMeta>(
	input: ExplorerProjectionLayerBuildInput<TMeta>,
): string {
	const revisions = input.revisions;
	return [
		`provider:${input.projection.providerId}`,
		`mode:${input.projection.viewMode}`,
		`source:${input.projection.sourceRevision}`,
		`rows:${input.projection.rowsRevision}`,
		`layout:${input.projection.layoutRevision}`,
		`files:${revisions?.filesRevision ?? '-'}`,
		`props:${revisions?.propsRevision ?? '-'}`,
		`tags:${revisions?.tagsRevision ?? '-'}`,
		`content:${revisions?.contentRevision ?? '-'}`,
		`queue:${revisions?.queueRevision ?? '-'}`,
		`filter:${revisions?.filterRevision ?? '-'}`,
		`ops:${collectionIdKey(input.operations)}`,
		`filters:${collectionIdKey(input.activeFilters)}`,
	].join('|');
}

function collectionIdKey(items: readonly NodeBase[] | undefined): string {
	if (!items || items.length === 0) return '-';
	return items.map((item) => item.id).join('\u0001');
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
