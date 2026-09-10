import type { ContentPreviewResult } from '../types/typeUI';

export type ContentSortBy = 'count' | 'name' | 'mtime' | 'ctime';
export type ContentSortDirection = 'asc' | 'desc';
export type ContentPreviewFile = ContentPreviewResult['files'][number];

export interface ContentPreviewPins {
	activePath?: string | null;
	openPaths?: readonly string[];
}

export function sortContentPreviewFiles(
	files: ContentPreviewFile[],
	sortBy: ContentSortBy,
	direction: ContentSortDirection,
	pins: ContentPreviewPins = {},
): ContentPreviewFile[] {
	const dir = direction === 'asc' ? 1 : -1;
	const pinRanks = new Map<string, number>();
	if (pins.activePath) pinRanks.set(pins.activePath, 0);
	for (const [index, path] of (pins.openPaths ?? []).entries()) {
		if (!pinRanks.has(path)) pinRanks.set(path, index + 1);
	}
	return [...files].sort((left, right) => {
		const leftRank = pinRanks.get(left.file.path);
		const rightRank = pinRanks.get(right.file.path);
		if (leftRank !== undefined || rightRank !== undefined) {
			if (leftRank === undefined) return 1;
			if (rightRank === undefined) return -1;
			if (leftRank !== rightRank) return leftRank - rightRank;
		}
		const compare = compareContentPreviewFile(left, right, sortBy);
		if (compare !== 0) return compare * dir;
		return left.file.path.localeCompare(right.file.path);
	});
}

function compareContentPreviewFile(
	left: ContentPreviewFile,
	right: ContentPreviewFile,
	sortBy: ContentSortBy,
): number {
	if (sortBy === 'count') return left.matchCount - right.matchCount;
	if (sortBy === 'mtime') return left.file.stat.mtime - right.file.stat.mtime;
	if (sortBy === 'ctime') return left.file.stat.ctime - right.file.stat.ctime;
	return left.file.path.localeCompare(right.file.path);
}
