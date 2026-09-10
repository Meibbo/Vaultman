import type { ExplorerSortState } from '../types/typeUI';
import { TAG_SOURCE_ORDER } from './logicTagSource';

export type NodeTypeFilterInput = string | readonly string[] | null | undefined;

const TAG_SOURCE_TYPES = new Set<string>(TAG_SOURCE_ORDER);

export function normalizeNodeTypeFilters(input: NodeTypeFilterInput): string[] {
	const values: readonly string[] =
		typeof input === 'string' ? [input] : (input ?? []);
	const normalized = Array.from(
		new Set(values.filter((value) => value.length > 0 && value !== 'all')),
	);
	// Inline and frontmatter answer the same question. If an old layout has
	// persisted both, normalize it to the unfiltered "all types" state instead
	// of retaining a selection the UI can no longer create.
	const selectedSources = normalized.filter((value) =>
		TAG_SOURCE_TYPES.has(value),
	);
	if (selectedSources.length > 1) {
		return normalized
			.filter((value) => !TAG_SOURCE_TYPES.has(value))
			.sort((left, right) => left.localeCompare(right));
	}
	return normalized.sort((left, right) => left.localeCompare(right));
}

export function nodeTypeFiltersForState(
	state: Pick<ExplorerSortState, 'nodeTypeFilter' | 'nodeTypeFilters'>,
): string[] {
	return state.nodeTypeFilters !== undefined
		? normalizeNodeTypeFilters(state.nodeTypeFilters)
		: normalizeNodeTypeFilters(state.nodeTypeFilter);
}

export function nodeTypeFilterPatch(
	filters: NodeTypeFilterInput,
): Pick<ExplorerSortState, 'nodeTypeFilter' | 'nodeTypeFilters'> {
	const normalized = normalizeNodeTypeFilters(filters);
	return {
		nodeTypeFilter: normalized.length === 1 ? normalized[0] : null,
		nodeTypeFilters: normalized,
	};
}

export function toggleNodeTypeFilter(
	filters: NodeTypeFilterInput,
	id: string,
): string[] {
	if (id === 'all') return [];
	const selected = new Set(normalizeNodeTypeFilters(filters));
	if (TAG_SOURCE_TYPES.has(id)) {
		if (selected.has(id)) selected.delete(id);
		else {
			for (const source of TAG_SOURCE_TYPES) selected.delete(source);
			selected.add(id);
		}
	} else if (selected.has(id)) selected.delete(id);
	else selected.add(id);
	return normalizeNodeTypeFilters(Array.from(selected));
}

export function sameNodeTypeFilters(
	left: NodeTypeFilterInput,
	right: NodeTypeFilterInput,
): boolean {
	const normalizedLeft = normalizeNodeTypeFilters(left);
	const normalizedRight = normalizeNodeTypeFilters(right);
	return (
		normalizedLeft.length === normalizedRight.length &&
		normalizedLeft.every((value, index) => value === normalizedRight[index])
	);
}
