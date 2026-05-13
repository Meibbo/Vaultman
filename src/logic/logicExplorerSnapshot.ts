import type { TreeNode } from '../types/typeNode';
import { getActivePerfProbe } from '../dev/perfProbe';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
	ExplorerSnapshotKind,
	ExplorerSnapshotProjection,
	ExplorerSnapshotRow,
} from '../types/typeExplorerDataPlane';
import { DEFAULT_EXPLORER_SNAPSHOT_PROJECTION } from '../types/typeExplorerDataPlane';

export interface BuildExplorerSnapshotInput<TMeta = unknown> {
	explorerId: string;
	providerKey: string;
	tree: readonly TreeNode<TMeta>[];
	expandedIds: ReadonlySet<string>;
	revisions: ExplorerDataPlaneRevisions;
	projection?: Partial<ExplorerSnapshotProjection>;
	kindFor: (row: { node: TreeNode<TMeta>; parentId: string | null }) => ExplorerSnapshotKind;
	pathFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
	folderPathFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
	domainKeyFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
}

export function buildExplorerSnapshot<TMeta = unknown>(
	input: BuildExplorerSnapshotInput<TMeta>,
): ExplorerSnapshot<TMeta> {
	const nodeCount = countTreeNodes(input.tree);
	return (
		getActivePerfProbe()?.measure(
			'explorerDataPlane.snapshot.create',
			{ nodes: nodeCount },
			() => buildExplorerSnapshotNow(input),
		) ?? buildExplorerSnapshotNow(input)
	);
}

function buildExplorerSnapshotNow<TMeta = unknown>(
	input: BuildExplorerSnapshotInput<TMeta>,
): ExplorerSnapshot<TMeta> {
	const rows: ExplorerSnapshotRow<TMeta>[] = [];
	const visibleIds: string[] = [];
	const byId = new Map<string, ExplorerSnapshotRow<TMeta>>();
	const idToIndex = new Map<string, number>();
	const pathToId = new Map<string, string>();
	const folderPathToId = new Map<string, string>();
	const domainKeyToId = new Map<string, string>();
	const projection: ExplorerSnapshotProjection = {
		...DEFAULT_EXPLORER_SNAPSHOT_PROJECTION,
		...input.projection,
	};

	function walk(
		node: TreeNode<TMeta>,
		depth: number,
		parentId: string | null,
		visibleAncestors: boolean,
	): void {
		const rowInput = { node, parentId };
		const path = input.pathFor?.(rowInput);
		const row: ExplorerSnapshotRow<TMeta> = {
			id: node.id,
			label: node.label,
			depth,
			parentId,
			childrenIds: (node.children ?? []).map((child) => child.id),
			node,
			kind: input.kindFor(rowInput),
			domainKey: input.domainKeyFor?.(rowInput),
			path,
		};

		rows.push(row);
		byId.set(node.id, row);
		if (path !== undefined) pathToId.set(path, node.id);

		const folderPath = input.folderPathFor?.(rowInput);
		if (folderPath !== undefined) folderPathToId.set(folderPath, node.id);
		if (row.domainKey !== undefined) domainKeyToId.set(row.domainKey, node.id);

		if (visibleAncestors) {
			idToIndex.set(node.id, visibleIds.length);
			visibleIds.push(node.id);
		}

		const childrenVisible = visibleAncestors && input.expandedIds.has(node.id);
		for (const child of node.children ?? []) {
			walk(child, depth + 1, node.id, childrenVisible);
		}
	}

	for (const root of input.tree) {
		walk(root, 0, null, true);
	}

	getActivePerfProbe()?.measure(
		'explorerDataPlane.snapshot.lookupMaps',
		{ rows: rows.length, visibleRows: visibleIds.length },
		() => undefined,
	);

	return {
		explorerId: input.explorerId,
		providerKey: input.providerKey,
		revision: 0,
		structureRevision: 0,
		rows,
		tree: input.tree,
		visibleIds,
		byId,
		idToIndex,
		pathToId,
		folderPathToId,
		domainKeyToId,
		projection,
		sourceRevisions: input.revisions,
	};
}

function countTreeNodes<TMeta>(tree: readonly TreeNode<TMeta>[]): number {
	let count = 0;
	const visit = (nodes: readonly TreeNode<TMeta>[]) => {
		for (const node of nodes) {
			count += 1;
			if (node.children?.length) visit(node.children);
		}
	};
	visit(tree);
	return count;
}
