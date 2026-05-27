import { getAllTags } from 'obsidian';
import type { TFile, CachedMetadata } from 'obsidian';
import type { FilterNode, FilterGroup, FilterRule } from '../types/typeFilter';

/**
 * Metadata accessor — wraps how we get frontmatter for a file.
 * Injected so this module stays pure (no App dependency).
 */
export type MetadataGetter = (file: TFile) => CachedMetadata | null;

/**
 * Evaluate a filter tree against a universe of files.
 * Returns the Set of file paths that match.
 *
 * Direct port of Python's eval_node() using set arithmetic.
 */
export function evalNode(
	node: FilterNode,
	universe: TFile[],
	getMeta: MetadataGetter
): Set<string> {
	if (node.enabled === false) return new Set();
	if (node.type === 'rule') {
		return matchRule(node, universe, getMeta);
	}
	return matchGroup(node, universe, getMeta);
}

function matchGroup(
	group: FilterGroup,
	universe: TFile[],
	getMeta: MetadataGetter
): Set<string> {
	const universePaths = new Set(universe.map((f) => f.path));

	const activeChildren = group.children.filter(c => c.enabled !== false);

	if (activeChildren.length === 0) {
		// Empty / All-disabled group: ALL = universe, ANY = empty, NONE = universe
		return group.logic === 'any' ? new Set() : new Set(universePaths);
	}

	const childResults = activeChildren.map((child) =>
		evalNode(child, universe, getMeta)
	);

	switch (group.logic) {
		case 'all': {
			// Intersection of all children
			let result = new Set(childResults[0]);
			for (let i = 1; i < childResults.length; i++) {
				result = setIntersection(result, childResults[i]);
			}
			return result;
		}
		case 'any': {
			// Union of all children
			let result = new Set<string>();
			for (const cr of childResults) {
				result = setUnion(result, cr);
			}
			return result;
		}
		case 'none': {
			// Universe minus union of all children
			let union = new Set<string>();
			for (const cr of childResults) {
				union = setUnion(union, cr);
			}
			return setDifference(universePaths, union);
		}
	}
}

function matchRule(
	rule: FilterRule,
	universe: TFile[],
	getMeta: MetadataGetter
): Set<string> {
	const result = new Set<string>();

	for (const file of universe) {
		if (matchesFile(rule, file, getMeta)) {
			result.add(file.path);
		}
	}
	return result;
}

function matchesFile(
	rule: FilterRule,
	file: TFile,
	getMeta: MetadataGetter
): boolean {
	const meta = getMeta(file);
	const fm = meta?.frontmatter ?? {};

	switch (rule.filterType) {
		case 'has_property':
			return rule.property in fm;

		case 'missing_property':
			return !(rule.property in fm);

		case 'specific_value': {
			if (!(rule.property in fm)) return false;
			const val: unknown = fm[rule.property];
			const target = rule.values[0] ?? '';
			return matchValue(val, target);
		}

		case 'multiple_values': {
			if (!(rule.property in fm)) return false;
			const val: unknown = fm[rule.property];
			// File matches if its value matches ANY of the specified values
			return rule.values.some((target) => matchValue(val, target));
		}

		case 'folder': {
			const folder = rule.values[0] ?? '';
			return file.path.toLowerCase().includes(folder.toLowerCase());
		}

		case 'folder_exclude': {
			const folder = rule.values[0] ?? '';
			return !file.path.toLowerCase().includes(folder.toLowerCase());
		}

		case 'file_name': {
			const term = rule.values[0] ?? '';
			return file.basename.toLowerCase().includes(term.toLowerCase());
		}

		case 'file_name_exclude': {
			const term = rule.values[0] ?? '';
			return !file.basename.toLowerCase().includes(term.toLowerCase());
		}

		case 'file_folder': {
			const folder = rule.values[0] ?? '';
			if (!folder) return true;
			const parentPath = (file.parent?.path ?? '').toLowerCase();
			return parentPath.includes(folder.toLowerCase());
		}

		case 'has_tag': {
			const tagTarget = (rule.values[0] ?? '').toLowerCase().replace(/^#/, '');
			const allTags = getAllTags(meta ?? {}) ?? [];
			return allTags.some((tag) => tag.toLowerCase().replace(/^#/, '') === tagTarget);
		}

		default:
			return false;
	}
}

/** Compare a frontmatter value (possibly array) against a target string */
function matchValue(val: unknown, target: string): boolean {
	if (Array.isArray(val)) {
		return val.some((v) => String(v).toLowerCase() === target.toLowerCase());
	}
	return String(val).toLowerCase() === target.toLowerCase();
}

// --- Set utilities ---

function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set<T>();
	for (const item of a) {
		if (b.has(item)) result.add(item);
	}
	return result;
}

function setUnion<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set(a);
	for (const item of b) result.add(item);
	return result;
}

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
	const result = new Set<T>();
	for (const item of a) {
		if (!b.has(item)) result.add(item);
	}
	return result;
}
