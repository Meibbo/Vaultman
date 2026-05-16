import {
	createExplorerMediaTargetKey,
	type ExplorerMediaRecord,
} from '../../src/services/serviceExplorerMediaCache';
import {
	rowInputFromTreeNode,
	type ExplorerRowInput,
} from '../../src/services/serviceExplorerRowInput';
import type { TreeNode } from '../../src/types/typeNode';
import type { ViewLayers } from '../../src/types/typeViews';

export type ExplorerSyntheticShape = 'flat' | 'deep' | 'mixed';

export interface ExplorerSyntheticDatasetOptions {
	nodes: number;
	shape: ExplorerSyntheticShape;
	providerId: string;
	filteredEvery?: number;
	selectedEvery?: number;
	expandedEvery?: number;
	withBadges?: boolean;
	withMediaDescriptors?: boolean;
}

export interface ExplorerSyntheticFileMeta {
	file: {
		path: string;
		basename: string;
		extension: 'md';
	} | null;
	folderPath: string;
	isFolder: false;
	providerId: string;
	index: number;
}

export interface ExplorerSyntheticDataset {
	nodes: TreeNode<ExplorerSyntheticFileMeta>[];
	rowInputs: ExplorerRowInput<ExplorerSyntheticFileMeta>[];
	idToIndex: Map<string, number>;
	indexToId: Map<number, string>;
	expandedIds: Set<string>;
	selectedIds: Set<string>;
	activeFilterIds: Set<string>;
	mediaDescriptors: Map<string, ExplorerMediaRecord>;
	expectedVisibleIds: string[];
}

export function createExplorerSyntheticDataset(
	options: ExplorerSyntheticDatasetOptions,
): ExplorerSyntheticDataset {
	const total = Math.max(0, Math.floor(options.nodes));
	const parentIds = Array.from({ length: total }, (_, index) =>
		syntheticParentId(index, options.shape),
	);
	const nodes = Array.from({ length: total }, (_, index) =>
		createSyntheticNode(index, options, parentIds[index]),
	);

	for (let index = 0; index < nodes.length; index++) {
		const parentId = parentIds[index];
		if (!parentId) continue;
		const parentIndex = nodeIndexFromId(parentId);
		const parent = nodes[parentIndex];
		if (parent) parent.children?.push(nodes[index]);
	}

	const idToIndex = new Map<string, number>();
	const indexToId = new Map<number, string>();
	const expandedIds = new Set<string>();
	const selectedIds = new Set<string>();
	const activeFilterIds = new Set<string>();
	const mediaDescriptors = new Map<string, ExplorerMediaRecord>();
	const expectedVisibleIds: string[] = [];

	const rowInputs = nodes.map((node, index) => {
		const id = node.id;
		const parentId = parentIds[index];
		const path = node.meta.file?.path;
		const layers = syntheticLayers(index, options);
		const mediaDescriptor =
			options.withMediaDescriptors && path
				? createSyntheticMediaDescriptor(id, path, index)
				: undefined;

		idToIndex.set(id, index);
		indexToId.set(index, id);
		expectedVisibleIds.push(id);

		if (node.children?.length) expandedIds.add(id);
		if (isNth(index, options.selectedEvery)) selectedIds.add(id);
		if (isNth(index, options.filteredEvery)) activeFilterIds.add(id);
		if (mediaDescriptor) {
			mediaDescriptors.set(id, mediaDescriptor);
		}

		return {
			...rowInputFromTreeNode(node, { layers, mediaDescriptor }),
			parentId,
			childrenIds: node.children?.map((child) => child.id) ?? [],
			domainKey: `${options.providerId}:${id}`,
			path,
			mediaDescriptor,
		};
	});

	return {
		nodes,
		rowInputs,
		idToIndex,
		indexToId,
		expandedIds,
		selectedIds,
		activeFilterIds,
		mediaDescriptors,
		expectedVisibleIds,
	};
}

function createSyntheticNode(
	index: number,
	options: ExplorerSyntheticDatasetOptions,
	parentId: string | null,
): TreeNode<ExplorerSyntheticFileMeta> {
	const path = syntheticPath(index);
	const id = `node-${index}`;
	const label = `Note ${index}.md`;
	const badges = options.withBadges
		? [
				{
					text: String(index % 100),
					color: 'accent' as const,
					title: `Synthetic badge ${index}`,
				},
			]
		: undefined;

	return {
		id,
		label,
		icon: 'lucide-file-text',
		depth: syntheticDepth(index, options.shape, parentId),
		meta: {
			file: {
				path,
				basename: `Note ${index}`,
				extension: 'md',
			},
			folderPath: path.slice(0, path.lastIndexOf('/')),
			isFolder: false,
			providerId: options.providerId,
			index,
		},
		badges,
		children: [],
	};
}

function syntheticLayers(index: number, options: ExplorerSyntheticDatasetOptions): ViewLayers {
	const selected = isNth(index, options.selectedEvery);
	const activeFilter = isNth(index, options.filteredEvery);
	const badges = options.withBadges
		? {
				counts: [
					{
						id: `badge-${index}`,
						label: String(index % 100),
						tone: 'accent' as const,
					},
				],
			}
		: undefined;

	return {
		badges,
		state: selected || activeFilter ? { selected, activeFilter } : undefined,
	};
}

function createSyntheticMediaDescriptor(
	nodeId: string,
	filePath: string,
	index: number,
): ExplorerMediaRecord {
	const target = { kind: 'file' as const, filePath };
	return {
		targetKey: createExplorerMediaTargetKey(target),
		target,
		status: 'unprocessed',
		mediaKey: null,
		revision: index,
		sourceMtime: index,
		dimensions: {
			width: 320 + (index % 5) * 32,
			height: 180 + (index % 3) * 24,
		},
		generatedAt: 0,
		sourceHash: `synthetic-${nodeId}`,
	};
}

function syntheticParentId(index: number, shape: ExplorerSyntheticShape): string | null {
	if (index === 0 || shape === 'flat') return null;
	if (shape === 'deep') return `node-${index - 1}`;
	if (index % 10 === 0) return null;
	return `node-${index - (index % 10)}`;
}

function syntheticDepth(
	index: number,
	shape: ExplorerSyntheticShape,
	parentId: string | null,
): number {
	if (!parentId) return 0;
	if (shape === 'deep') return index;
	return index % 10;
}

function syntheticPath(index: number): string {
	return `Synthetic/Folder ${index % 250}/Note ${index}.md`;
}

function nodeIndexFromId(id: string): number {
	return Number(id.slice('node-'.length));
}

function isNth(index: number, every: number | undefined): boolean {
	return typeof every === 'number' && every > 0 && index % every === 0;
}
