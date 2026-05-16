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

export function rowInputsFromProjection<TMeta = unknown>(
	projection: ExplorerProjection<TMeta>,
): ExplorerRowInput<TMeta>[] {
	return projection.rows.map((row) => row.rowInput);
}

export function createExplorerProjection<TMeta = unknown>({
	providerId,
	viewMode,
	rowInputs,
	sourceRevision,
	layoutRevision = sourceRevision,
}: ExplorerProjectionInput<TMeta>): ExplorerProjection<TMeta> {
	const rowCount = rowInputs.length;
	const rows: ExplorerProjectionRow<TMeta>[] = [];
	const visibleIds: string[] = [];
	rows.length = rowCount;
	visibleIds.length = rowCount;
	const idToIndex = new Map<string, number>();
	let mediaById: Map<string, ExplorerMediaRecord> | undefined;

	for (let index = 0; index < rowInputs.length; index += 1) {
		const rowInput = rowInputs[index];
		const id = rowInput.id;
		const mediaDescriptor = rowInput.mediaDescriptor
			? descriptorOnlyMediaRecord(rowInput.mediaDescriptor)
			: undefined;

		visibleIds[index] = id;
		idToIndex.set(id, index);
		if (mediaDescriptor) {
			mediaById ??= new Map<string, ExplorerMediaRecord>();
			mediaById.set(id, mediaDescriptor);
		}

		rows[index] = {
			id,
			key: id,
			index,
			providerId,
			viewMode,
			depth: rowInput.depth,
			parentId: rowInput.parentId ?? null,
			node: rowInput.node,
			rowInput,
			mediaDescriptor,
		};
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
		indexToId: new IndexToIdMap(visibleIds),
		mediaById: mediaById ?? EMPTY_MEDIA_BY_ID,
	};
}

const EMPTY_MEDIA_BY_ID: ReadonlyMap<string, ExplorerMediaRecord> = new Map();

class IndexToIdMap implements ReadonlyMap<number, string> {
	readonly [Symbol.toStringTag] = 'IndexToIdMap';

	constructor(private readonly ids: readonly string[]) {}

	get size(): number {
		return this.ids.length;
	}

	get(index: number): string | undefined {
		return Number.isInteger(index) && index >= 0 && index < this.ids.length
			? this.ids[index]
			: undefined;
	}

	has(index: number): boolean {
		return Number.isInteger(index) && index >= 0 && index < this.ids.length;
	}

	forEach(
		callbackfn: (value: string, key: number, map: ReadonlyMap<number, string>) => void,
		thisArg?: unknown,
	): void {
		for (let index = 0; index < this.ids.length; index += 1) {
			callbackfn.call(thisArg, this.ids[index], index, this);
		}
	}

	*entries(): IterableIterator<[number, string]> {
		for (let index = 0; index < this.ids.length; index += 1) {
			yield [index, this.ids[index]];
		}
	}

	*keys(): IterableIterator<number> {
		for (let index = 0; index < this.ids.length; index += 1) {
			yield index;
		}
	}

	*values(): IterableIterator<string> {
		yield* this.ids;
	}

	[Symbol.iterator](): IterableIterator<[number, string]> {
		return this.entries();
	}
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
