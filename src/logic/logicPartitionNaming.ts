/**
 * U130 native polish: shared naming/presentation helpers for counter/date
 * partition headers. The scene explorers own their menu context builders,
 * but the scope-preset lookup and the presentation flip are identical, so
 * they live here once instead of diverging per scene.
 */

import type { ExplorerSortState, ScopeTarget } from '../types/typeUI';
import type {
	GroupPreset,
	PartitionPresentation,
} from '../types/typeGroupPreset';

/** Effective preset for one scope target: scoped set wins, scene preset falls back. */
export function scopePartitionPreset(
	sortState: ExplorerSortState,
	fallback: GroupPreset,
	target: ScopeTarget,
): GroupPreset {
	const scoped = (
		sortState as unknown as {
			scopeState?: { sets?: Partial<Record<string, { groupPreset?: GroupPreset }>> };
		}
	).scopeState?.sets?.[target]?.groupPreset;
	return scoped ?? fallback;
}

/** Display presentation for one scope target (`name-range` when unset). */
export function scopePartitionPresentation(
	sortState: ExplorerSortState,
	fallback: GroupPreset,
	target: ScopeTarget,
): PartitionPresentation {
	return (
		scopePartitionPreset(sortState, fallback, target).partitionPresentation ??
		'name-range'
	);
}

/** Flip the header presentation. Pure: bounds, names and order untouched. */
export function togglePartitionPresentation(
	current: PartitionPresentation | undefined,
): PartitionPresentation {
	return (current ?? 'name-range') === 'name-only' ? 'name-range' : 'name-only';
}

/** Whether a header node carries a nameable counter/date slice. */
export function isNameablePartitionHeader(header: {
	counterRange?: { id: string; displayName?: string } | null;
	counterRanges?: readonly unknown[] | null;
	counterDomain?: unknown;
}): boolean {
	return Boolean(
		header.counterRange && header.counterRanges && header.counterDomain,
	);
}
