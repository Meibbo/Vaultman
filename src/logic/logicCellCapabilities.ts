import type { ScopeSort } from '../types/typeUI';
import type { MenuCtx } from '../types/typeCMenu';

export type CanonicalExplorerEngine = 'tree' | 'table' | 'cards';

export function toCanonicalEngine(engineOrViewMode: string): CanonicalExplorerEngine {
	if (engineOrViewMode === 'table') return 'table';
	if (engineOrViewMode === 'grid' || engineOrViewMode === 'cards') return 'cards';
	return 'tree';
}

export interface CellCapabilityContext {
	providerId: string;
	engine: CanonicalExplorerEngine;
	nested: boolean;
	fixedFolders: boolean;
	selectionMode: boolean;
	nodeKinds: ReadonlySet<MenuCtx['nodeType']>;
}

export interface CellCapabilityResolution {
	availableCellIds: ReadonlySet<string>;
	effectiveVisibleCellIds: ReadonlySet<string>;
	availableSortIds: ReadonlySet<string>;
	availableFilterTypeIds: ReadonlySet<string>;
	effectiveSort: ScopeSort;
}

export function resolveCellCapabilities(
	ctx: CellCapabilityContext,
	requestedCellIds: readonly string[],
	currentSort?: ScopeSort,
): CellCapabilityResolution {
	const availableCellIds = new Set<string>();
	const availableSortIds = new Set<string>();
	const availableFilterTypeIds = new Set<string>();

	// Standard cells always available
	availableCellIds.add('name');
	availableCellIds.add('ext');
	availableCellIds.add('mtime');
	availableCellIds.add('size');

	availableSortIds.add('name');
	availableSortIds.add('mtime');
	availableSortIds.add('size');
	availableSortIds.add('ext');
	availableSortIds.add('badges');

	availableFilterTypeIds.add('file');
	availableFilterTypeIds.add('folder');

	// Cell: count (file-count) is available for Files + Tree + nested + folders
	if (
		ctx.providerId === 'files' &&
		ctx.engine === 'tree' &&
		ctx.nested &&
		ctx.nodeKinds.has('folder')
	) {
		availableCellIds.add('count');
		if (!ctx.fixedFolders) {
			availableSortIds.add('count');
		}
	}

	// Cell: checkbox is available when selectionMode is true
	if (ctx.selectionMode) {
		availableCellIds.add('checkbox');
		availableSortIds.add('checkbox');
		availableFilterTypeIds.add('selected');
	}

	const effectiveVisibleCellIds = new Set<string>();
	for (const id of requestedCellIds) {
		if (availableCellIds.has(id)) {
			effectiveVisibleCellIds.add(id);
		}
	}

	const defaultSort: ScopeSort = { sortBy: 'name', direction: 'asc' };
	const effectiveSort =
		currentSort && availableSortIds.has(currentSort.sortBy)
			? currentSort
			: defaultSort;

	return {
		availableCellIds: Object.freeze(availableCellIds),
		effectiveVisibleCellIds: Object.freeze(effectiveVisibleCellIds),
		availableSortIds: Object.freeze(availableSortIds),
		availableFilterTypeIds: Object.freeze(availableFilterTypeIds),
		effectiveSort,
	};
}
