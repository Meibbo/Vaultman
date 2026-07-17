import type { ExplorerSortState } from '../types/typeUI';

export type NodeTypeFilterInput = string | readonly string[] | null | undefined;

export function normalizeNodeTypeFilters(input: NodeTypeFilterInput): string[] {
	const values: readonly string[] =
		typeof input === 'string' ? [input] : (input ?? []);
	return Array.from(
		new Set(values.filter((value) => value.length > 0 && value !== 'all')),
	).sort((left, right) => left.localeCompare(right));
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
	if (selected.has(id)) selected.delete(id);
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
