import type { ContentPreviewResult } from '../types/typeUI';

export type ContentSortBy = 'count' | 'name' | 'mtime' | 'ctime';
export type ContentSortDirection = 'asc' | 'desc';
export type ContentPreviewFile = ContentPreviewResult['files'][number];

export function sortContentPreviewFiles(
	files: ContentPreviewFile[],
	sortBy: ContentSortBy,
	direction: ContentSortDirection,
): ContentPreviewFile[] {
	const dir = direction === 'asc' ? 1 : -1;
	return [...files].sort((left, right) => {
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
