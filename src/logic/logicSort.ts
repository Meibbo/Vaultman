import type { TFile } from 'obsidian';

import { compareLastOpenedValues } from './logicLastOpened';

export type ExplorerSortDirection = 'asc' | 'desc';
export type ExplorerFileSortBy =
	| 'name'
	| 'count'
	| 'ext'
	| 'path'
	| 'words'
	| 'tasks'
	| 'mtime'
	| 'ctime'
	| 'opened';

export interface ExplorerFileTimes {
	ctime: number;
	mtime: number;
}

export interface ExplorerFileSortOptions {
	countForFile?: (file: TFile) => number;
	wordCountForFile?: (file: TFile) => number | null | undefined;
	taskCountForFile?: (file: TFile) => number | null | undefined;
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
	/** BT5-013: null means the file was never opened. */
	lastOpenedForFile?: (file: TFile) => number | null;
}

const EXPLORER_TEXT_COLLATOR = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});

export function compareExplorerText(left: string, right: string): number {
	return EXPLORER_TEXT_COLLATOR.compare(left, right);
}

export const DEFAULT_EXPLORER_SORT_DIR: Record<string, ExplorerSortDirection> =
	{
		name: 'asc',
		count: 'desc',
		props: 'desc',
		words: 'desc',
		tasks: 'desc',
		mtime: 'desc',
		ctime: 'desc',
		opened: 'desc',
		sub: 'desc',
		columns: 'asc',
		ext: 'asc',
		path: 'asc',
		installed: 'desc',
		updated: 'desc',
		state: 'desc',
		type: 'asc',
	};

export function nextExplorerSortDirection(
	activeSortBy: string,
	activeDirection: ExplorerSortDirection,
	nextSortBy: string,
): ExplorerSortDirection {
	if (activeSortBy === nextSortBy) {
		return activeDirection === 'asc' ? 'desc' : 'asc';
	}
	return DEFAULT_EXPLORER_SORT_DIR[nextSortBy] ?? 'asc';
}

/** Physical flow: ascending values increase downward; descending increase upward. */
export function sortDirectionGlyph(
	direction: ExplorerSortDirection,
): '↓' | '↑' {
	return direction === 'asc' ? '↓' : '↑';
}

export function sortDirectionIcon(
	direction: ExplorerSortDirection,
): 'lucide-arrow-down' | 'lucide-arrow-up' {
	return direction === 'asc' ? 'lucide-arrow-down' : 'lucide-arrow-up';
}

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
		result = compareExplorerText(a.path, b.path);
	} else if (normalizedSortBy === 'ext') {
		result = compareExplorerText(a.extension, b.extension);
	} else if (normalizedSortBy === 'mtime' || normalizedSortBy === 'ctime') {
		result =
			fileTimeForExplorer(a, normalizedSortBy, options.getFileTimes) -
			fileTimeForExplorer(b, normalizedSortBy, options.getFileTimes);
	} else if (normalizedSortBy === 'opened') {
		result = compareLastOpenedValues(
			options.lastOpenedForFile?.(a) ?? null,
			options.lastOpenedForFile?.(b) ?? null,
		);
		if (result === 0) {
			// BT5-090: every never-opened file ties at 0, so fall back to how
			// recently it was modified rather than to the alphabet.
			result =
				fileTimeForExplorer(a, 'mtime', options.getFileTimes) -
				fileTimeForExplorer(b, 'mtime', options.getFileTimes);
		}
	} else if (normalizedSortBy === 'count') {
		result =
			(options.countForFile?.(a) ?? 0) - (options.countForFile?.(b) ?? 0);
	} else if (normalizedSortBy === 'words') {
		result =
			(options.wordCountForFile?.(a) ?? 0) -
			(options.wordCountForFile?.(b) ?? 0);
	} else if (normalizedSortBy === 'tasks') {
		result =
			(options.taskCountForFile?.(a) ?? 0) -
			(options.taskCountForFile?.(b) ?? 0);
	} else {
		result = compareExplorerText(a.name, b.name);
	}

	return result === 0
		? compareExplorerText(a.path, b.path)
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
