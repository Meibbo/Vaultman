import type { ExplorerMediaRecord } from './serviceExplorerMediaCache';
import type { ExplorerRowInput } from './serviceExplorerRowInput';
import type { TreeNode } from '../types/typeNode';
import type { ExplorerViewMode } from '../types/typeViews';

export type ExplorerProjectionViewMode = Exclude<ExplorerViewMode, 'markmap'>;

export interface ExplorerProjectionInput<TMeta = unknown> {
	providerId: string;
	viewMode: ExplorerProjectionViewMode;
	rowInputs: readonly ExplorerRowInput<TMeta>[];
	sourceRevision: number;
	layoutRevision?: number;
}

export interface ExplorerProjectionRow<TMeta = unknown> {
	id: string;
	key: string;
	index: number;
	providerId: string;
	viewMode: ExplorerProjectionViewMode;
	depth: number;
	parentId: string | null;
	node: TreeNode<TMeta>;
	rowInput: ExplorerRowInput<TMeta>;
	mediaDescriptor?: ExplorerMediaRecord;
}

export interface ExplorerProjection<TMeta = unknown> {
	providerId: string;
	viewMode: ExplorerProjectionViewMode;
	sourceRevision: number;
	rowsRevision: number;
	layoutRevision: number;
	rows: readonly ExplorerProjectionRow<TMeta>[];
	visibleIds: readonly string[];
	idToIndex: ReadonlyMap<string, number>;
	indexToId: ReadonlyMap<number, string>;
	mediaById: ReadonlyMap<string, ExplorerMediaRecord>;
}

export function createExplorerProjection<TMeta = unknown>({
	providerId,
	viewMode,
	rowInputs,
	sourceRevision,
	layoutRevision = sourceRevision,
}: ExplorerProjectionInput<TMeta>): ExplorerProjection<TMeta> {
	const rows: ExplorerProjectionRow<TMeta>[] = [];
	const visibleIds: string[] = [];
	const idToIndex = new Map<string, number>();
	const indexToId = new Map<number, string>();
	const mediaById = new Map<string, ExplorerMediaRecord>();

	for (let index = 0; index < rowInputs.length; index += 1) {
		const rowInput = rowInputs[index];
		const id = rowInput.id;
		const mediaDescriptor = rowInput.mediaDescriptor
			? descriptorOnlyMediaRecord(rowInput.mediaDescriptor)
			: undefined;

		visibleIds.push(id);
		idToIndex.set(id, index);
		indexToId.set(index, id);
		if (mediaDescriptor) mediaById.set(id, mediaDescriptor);

		rows.push({
			id,
			key: `${providerId}:${viewMode}:${id}`,
			index,
			providerId,
			viewMode,
			depth: rowInput.depth,
			parentId: rowInput.parentId ?? null,
			node: rowInput.node,
			rowInput,
			mediaDescriptor,
		});
	}

	return {
		providerId,
		viewMode,
		sourceRevision,
		rowsRevision: sourceRevision,
		layoutRevision,
		rows,
		visibleIds,
		idToIndex,
		indexToId,
		mediaById,
	};
}

function descriptorOnlyMediaRecord(record: ExplorerMediaRecord): ExplorerMediaRecord {
	const descriptor: ExplorerMediaRecord = {
		targetKey: record.targetKey,
		target: { ...record.target },
		status: record.status,
		mediaKey: record.mediaKey,
	};
	if (record.revision !== undefined) descriptor.revision = record.revision;
	if (record.sourceMtime !== undefined) descriptor.sourceMtime = record.sourceMtime;
	if (record.sourceHash !== undefined) descriptor.sourceHash = record.sourceHash;
	if (record.dimensions) descriptor.dimensions = { ...record.dimensions };
	if (record.generatedAt !== undefined) descriptor.generatedAt = record.generatedAt;
	if (record.error !== undefined) descriptor.error = record.error;
	return descriptor;
}
