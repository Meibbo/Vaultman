import type { FilterGroup, FilterNode } from '../types/typeFilter';

/**
 * BT5-009: file exclusion is a composable node filter (`file_exclude`, exact
 * path), not a parallel list applied in the render path. These pure helpers
 * keep the active filter tree the single source of truth so every surface that
 * reads the pipeline stays consistent.
 */

function isFileExcludeFor(node: FilterNode, path: string): boolean {
	return (
		node.type === 'rule' &&
		node.filterType === 'file_exclude' &&
		node.values[0] === path
	);
}

function excludedPaths(group: FilterGroup): Set<string> {
	const paths = new Set<string>();
	for (const node of group.children) {
		if (node.type === 'rule' && node.filterType === 'file_exclude') {
			const path = node.values[0];
			if (path) paths.add(path);
		}
	}
	return paths;
}

/**
 * Move the legacy persisted `excludedFilePaths` into the active filter as
 * `file_exclude` rules. Idempotent: a path already excluded is not duplicated,
 * and an empty list is a no-op. Returns whether anything changed.
 */
export function migrateExcludedPathsToFilter(
	paths: readonly string[],
	group: FilterGroup,
): boolean {
	const present = excludedPaths(group);
	let changed = false;
	for (const path of paths) {
		if (!path || present.has(path)) continue;
		group.children.push({
			type: 'rule',
			filterType: 'file_exclude',
			property: '',
			values: [path],
			id: Math.random().toString(36).slice(2, 11),
			enabled: true,
		});
		present.add(path);
		changed = true;
	}
	return changed;
}

/** True when `path` is the file itself or a file beneath the folder `path`. */
function pathIsWithin(candidate: string, path: string): boolean {
	return candidate === path || candidate.startsWith(`${path}/`);
}

/**
 * A rename moves the exclusion key: the excluded file itself, or every excluded
 * file beneath a renamed folder. Returns whether anything changed.
 */
export function renameFilterPath(
	group: FilterGroup,
	oldPath: string,
	newPath: string,
): boolean {
	if (!oldPath || !newPath || oldPath === newPath) return false;
	let changed = false;
	for (const node of group.children) {
		if (node.type !== 'rule' || node.filterType !== 'file_exclude') continue;
		const current = node.values[0];
		if (!current || !pathIsWithin(current, oldPath)) continue;
		node.values = [`${newPath}${current.slice(oldPath.length)}`];
		changed = true;
	}
	return changed;
}

/**
 * A delete purges the exclusion: the excluded file, or every excluded file
 * beneath a deleted folder. Returns whether anything changed.
 */
export function purgeFilterPath(group: FilterGroup, path: string): boolean {
	if (!path) return false;
	const before = group.children.length;
	group.children = group.children.filter(
		(node) =>
			!(
				node.type === 'rule' &&
				node.filterType === 'file_exclude' &&
				node.values[0] != null &&
				pathIsWithin(node.values[0], path)
			),
	);
	return group.children.length !== before;
}

/** Whether a specific file is currently excluded through the pipeline. */
export function isFileExcluded(group: FilterGroup, path: string): boolean {
	return group.children.some((node) => isFileExcludeFor(node, path));
}
