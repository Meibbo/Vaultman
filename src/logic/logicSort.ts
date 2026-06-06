import type { TFile } from 'obsidian';

export type ExplorerSortDirection = 'asc' | 'desc';
export type ExplorerFileSortBy =
	| 'name'
	| 'count'
	| 'ext'
	| 'path'
	| 'mtime'
	| 'ctime';

export interface ExplorerFileTimes {
	ctime: number;
	mtime: number;
}

export interface ExplorerFileSortOptions {
	countForFile?: (file: TFile) => number;
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
}

export const DEFAULT_EXPLORER_SORT_DIR: Record<string, ExplorerSortDirection> = {
	name: 'asc',
	count: 'desc',
	mtime: 'desc',
	ctime: 'desc',
	sub: 'desc',
	columns: 'asc',
	ext: 'asc',
	path: 'asc',
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

	if (normalizedSortBy === 'path') {
		result = (a.parent?.path ?? '').localeCompare(b.parent?.path ?? '');
	} else if (normalizedSortBy === 'ext') {
		result = a.extension.localeCompare(b.extension);
	} else if (normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') {
		result =
			fileTimeForExplorer(a, normalizedSortBy, options.getFileTimes) -
			fileTimeForExplorer(b, normalizedSortBy, options.getFileTimes);
	} else if (normalizedSortBy === 'count') {
		result = (options.countForFile?.(a) ?? 0) - (options.countForFile?.(b) ?? 0);
	} else {
		result = a.basename.localeCompare(b.basename);
	}

	return result === 0 ? a.path.localeCompare(b.path) : dir * result;
}
