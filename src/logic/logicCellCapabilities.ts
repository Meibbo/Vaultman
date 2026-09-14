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
	/**
	 * `reveal this file` narrows the projection to one file. Cells whose meaning
	 * is vault-wide have none here, so they resolve unavailable rather than
	 * rendering a number that means nothing.
	 */
	reveal?: boolean;
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
	if (ctx.providerId === 'files') availableCellIds.add('tags');

	// Cell: count (file-count) for Files + Tree + nested + folders,
	// and never inside reveal, where there is only one file to count.
	if (
		!ctx.reveal &&
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

	// A16: count cell for Props and Tags
	// - Props reveal: each node_value has a single semantic occurrence → no count
	// - Props non-reveal: count makes sense (property can appear on multiple files)
	// - Tags reveal: count makes sense (frontmatter + inline occurrences)
	if (ctx.providerId === 'props') {
		if (!ctx.reveal) {
			availableCellIds.add('count');
			availableSortIds.add('count');
		}
	} else if (ctx.providerId === 'tags') {
		// Tags always have count (frontmatter + inline)
		availableCellIds.add('count');
		availableSortIds.add('count');
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
