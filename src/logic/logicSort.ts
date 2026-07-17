import type { TFile } from 'obsidian';

export type ExplorerSortDirection = 'asc' | 'desc';
export type ExplorerFileSortBy =
	| 'name'
	| 'count'
	| 'ext'
	| 'path'
	| 'words'
	| 'mtime'
	| 'ctime';

export interface ExplorerFileTimes {
	ctime: number;
	mtime: number;
}

export interface ExplorerFileSortOptions {
	countForFile?: (file: TFile) => number;
	wordCountForFile?: (file: TFile) => number | null | undefined;
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
}

export const DEFAULT_EXPLORER_SORT_DIR: Record<string, ExplorerSortDirection> =
	{
		name: 'asc',
		count: 'desc',
		props: 'desc',
		words: 'desc',
		mtime: 'desc',
		ctime: 'desc',
		sub: 'desc',
		columns: 'asc',
		ext: 'asc',
		path: 'asc',
		installed: 'desc',
		updated: 'desc',
	};

export function normalizeExplorerSortBy(sortBy: string): string {
	return sortBy === 'date' ? 'mtime' : sortBy;
}

export function fileTimeForExplorer(
	file: TFile,
	sortBy: 'mtime' | 'ctime',
	getFileTimes?: (file: TFile) => ExplorerFileTimes,
): number {
	const cached = getFileTimes?.(file);
	return cached?.[sortBy] ?? file.stat[sortBy] ?? 0;
}

export function compareFilesForExplorer(
	a: TFile,
	b: TFile,
	sortBy: string,
	direction: ExplorerSortDirection,
	options: ExplorerFileSortOptions = {},
): number {
	const normalizedSortBy = normalizeExplorerSortBy(sortBy);
	const dir = direction === 'asc' ? 1 : -1;
	let result = 0;

	const numericLocale = { numeric: true, sensitivity: 'base' } as const;
	if (normalizedSortBy === 'path') {
		result = (a.parent?.path ?? '').localeCompare(
			b.parent?.path ?? '',
			undefined,
			numericLocale,
		);
	} else if (normalizedSortBy === 'ext') {
		result = a.extension.localeCompare(b.extension, undefined, numericLocale);
	} else if (normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') {
		result =
			fileTimeForExplorer(a, normalizedSortBy, options.getFileTimes) -
			fileTimeForExplorer(b, normalizedSortBy, options.getFileTimes);
	} else if (normalizedSortBy === 'count') {
		result =
			(options.countForFile?.(a) ?? 0) - (options.countForFile?.(b) ?? 0);
	} else if (normalizedSortBy === 'words') {
		result =
			(options.wordCountForFile?.(a) ?? 0) -
			(options.wordCountForFile?.(b) ?? 0);
	} else {
		result = a.basename.localeCompare(b.basename, undefined, numericLocale);
	}

	return result === 0
		? a.path.localeCompare(b.path, undefined, numericLocale)
		: dir * result;
}

export function changedItemsRemainOrdered<T>(
	items: readonly T[],
	changedIds: readonly string[],
	getId: (item: T) => string,
	compare: (a: T, b: T) => number,
): boolean {
	const indexById = new Map<string, number>();
	items.forEach((item, index) => indexById.set(getId(item), index));
	for (const id of changedIds) {
		const index = indexById.get(id);
		if (index === undefined) continue;
		const current = items[index];
		const previous = items[index - 1];
		const next = items[index + 1];
		if (previous !== undefined && compare(previous, current) > 0) return false;
		if (next !== undefined && compare(current, next) > 0) return false;
	}
	return true;
}
