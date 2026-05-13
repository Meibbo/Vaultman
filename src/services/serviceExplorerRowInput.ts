import type { QueueChange } from '../types/typeContracts';
import type { ExplorerRevealTarget, ExplorerSnapshotRow } from '../types/typeExplorerDataPlane';
import type { TreeNode } from '../types/typeNode';
import type { ViewAction, ViewCell, ViewLayers, ViewRow } from '../types/typeViews';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../utils/utilViewLayers';

export type ExplorerRowInputSource = 'snapshot' | 'tree-node' | 'view-row';

/**
 * Stable adapter input shared by tree, grid, table, and cards.
 *
 * `id` is the semantic row/callback id. Virtualizer grouping and measurement
 * stay adapter-local; shared helpers only expose stable keys derived from row
 * ids so later adapter slices can avoid index-derived identities.
 */
export interface ExplorerRowInput<TMeta = unknown> {
	id: string;
	callbackId: string;
	source: ExplorerRowInputSource;
	node: TreeNode<TMeta>;
	label: string;
	detail?: string;
	icon?: string;
	cls?: string;
	depth: number;
	layers: ViewLayers;
	cells?: readonly ViewCell[];
	actions?: readonly ViewAction<TreeNode<TMeta>>[];
	disabled?: boolean;
	parentId?: string | null;
	childrenIds?: readonly string[];
	domainKey?: string;
	path?: string;
}

export interface RowInputOptions {
	layers?: ViewLayers;
	detail?: string;
	disabled?: boolean;
}

export interface RowInputTreeBridgeOptions {
	operations?: readonly QueueChange[];
	deletedClass?: string;
	includeBadges?: boolean;
	attachLayersToMeta?: boolean;
}

export interface RowInputRevealLookup<TMeta = unknown> {
	rows: readonly ExplorerRowInput<TMeta>[];
	target: ExplorerRevealTarget | null | undefined;
	snapshotRevision?: number | null;
	idToIndex?: ReadonlyMap<string, number> | null;
	resolveIndexById?: (id: string) => number | null | undefined;
}

export function rowInputFromSnapshotRow<TMeta>(
	row: ExplorerSnapshotRow<TMeta>,
	options: RowInputOptions = {},
): ExplorerRowInput<TMeta> {
	return {
		id: row.id,
		callbackId: row.id,
		source: 'snapshot',
		node: row.node,
		label: row.label,
		detail: options.detail ?? detailFromTreeNode(row.node),
		icon: row.node.icon,
		cls: row.node.cls,
		depth: row.depth,
		layers: options.layers ?? layersFromTreeNode(row.node),
		disabled: options.disabled,
		parentId: row.parentId,
		childrenIds: row.childrenIds,
		domainKey: row.domainKey,
		path: row.path,
	};
}

export function rowInputFromTreeNode<TMeta>(
	node: TreeNode<TMeta>,
	options: RowInputOptions = {},
): ExplorerRowInput<TMeta> {
	return {
		id: node.id,
		callbackId: node.id,
		source: 'tree-node',
		node,
		label: node.label,
		detail: options.detail ?? detailFromTreeNode(node),
		icon: node.icon,
		cls: node.cls,
		depth: node.depth,
		layers: options.layers ?? layersFromTreeNode(node),
		disabled: options.disabled,
		childrenIds: node.children?.map((child) => child.id),
	};
}

export function rowInputFromViewRow<TMeta>(
	row: ViewRow<TreeNode<TMeta>>,
): ExplorerRowInput<TMeta> {
	return {
		id: row.id,
		callbackId: row.id,
		source: 'view-row',
		node: row.node,
		label: row.label,
		detail: row.detail,
		icon: row.icon,
		cls: row.cls,
		depth: row.depth ?? row.node.depth,
		layers: row.layers,
		cells: row.cells,
		actions: row.actions,
		disabled: row.disabled,
		childrenIds: row.node.children?.map((child) => child.id),
	};
}

export function rowInputCallbackId<TMeta>(row: ExplorerRowInput<TMeta>): string {
	return row.callbackId;
}

export function rowInputVirtualKey<TMeta>(
	rows: readonly ExplorerRowInput<TMeta>[],
	index: number,
): string | number {
	return rows[index]?.id ?? index;
}

export function rowInputGroupKey<TMeta>(
	rows: readonly ExplorerRowInput<TMeta>[],
	fallbackIndex: number,
): string | number {
	return rows.length > 0 ? rows.map((row) => row.id).join('\u0000') : fallbackIndex;
}

export function buildRowInputIdIndex<TMeta>(
	rows: readonly ExplorerRowInput<TMeta>[],
): ReadonlyMap<string, number> {
	return new Map(rows.map((row, index) => [row.id, index]));
}

export function resolveRowInputRevealIndex<TMeta>({
	rows,
	target,
	snapshotRevision,
	idToIndex,
	resolveIndexById,
}: RowInputRevealLookup<TMeta>): number {
	if (!target || !revealSnapshotIsCurrent(target, snapshotRevision)) return -1;
	const mappedIndex = resolveIndexById?.(target.id) ?? idToIndex?.get(target.id);
	if (rowIndexMatches(rows, mappedIndex, target.id)) return mappedIndex;
	return rows.findIndex((row) => row.id === target.id || row.callbackId === target.id);
}

export function rowInputToTreeNode<TMeta>(
	row: ExplorerRowInput<TMeta>,
	options: RowInputTreeBridgeOptions = {},
): TreeNode<TMeta> {
	const bridged: TreeNode<TMeta> = {
		...row.node,
		id: row.id,
		label: row.label,
		icon: row.icon ?? row.node.icon,
		depth: row.depth,
		cls: withViewStateClasses(row.cls ?? row.node.cls, row.layers, {
			deletedClass: options.deletedClass,
		}),
	};
	const highlights = highlightsFromViewLayers(row.layers);
	if (highlights) bridged.highlights = highlights;
	if (options.includeBadges !== false) {
		const badges = nodeBadgesFromViewLayers(row.layers, options.operations);
		bridged.badges = badges.length > 0 ? badges : row.node.badges;
	}
	if (options.attachLayersToMeta !== false) {
		bridged.meta = metaWithLayers(row.node.meta, row.layers);
	}
	return bridged;
}

function revealSnapshotIsCurrent(
	target: ExplorerRevealTarget,
	snapshotRevision: number | null | undefined,
): boolean {
	if (target.minSnapshotRevision === undefined) return true;
	return typeof snapshotRevision === 'number' && snapshotRevision >= target.minSnapshotRevision;
}

function rowIndexMatches<TMeta>(
	rows: readonly ExplorerRowInput<TMeta>[],
	index: number | null | undefined,
	id: string,
): index is number {
	return typeof index === 'number' && index >= 0 && index < rows.length && rows[index]?.id === id;
}

function layersFromTreeNode<TMeta>(node: TreeNode<TMeta>): ViewLayers {
	const meta = node.meta as { layers?: ViewLayers } | undefined;
	return meta?.layers ?? {};
}

function detailFromTreeNode<TMeta>(node: TreeNode<TMeta>): string | undefined {
	const meta = node.meta as
		| { file?: { path?: string }; folderPath?: string; propType?: string }
		| undefined;
	return meta?.file?.path ?? meta?.folderPath ?? meta?.propType;
}

function metaWithLayers<TMeta>(meta: TMeta, layers: ViewLayers): TMeta {
	if (!meta || typeof meta !== 'object') return meta;
	return { ...(meta as Record<string, unknown>), layers } as TMeta;
}
