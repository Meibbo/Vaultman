/**
 * U121-027: the pure decision core of the LivreUI statistics pipeline.
 *
 * `file-stats-refreshed` fires on every autosave while the user is typing
 * (vault `modify` → statisticsCache → explorer), so the handler that receives
 * it must never buy a render it cannot prove it needs — BT5-030 removed the
 * typing micro-stalls precisely by keeping renders off this path, and U121-027
 * reintroduced them by routing the new time cells through `_render()`.
 *
 * Extracting the decision keeps that invariant behaviourally testable: the
 * perf guard asserts that the typing scenarios can only ever resolve to a
 * targeted cell patch, never to a render, without having to mount the
 * explorer.
 */

/**
 * Sorts whose relative order can be answered incrementally from an order
 * snapshot plus the changed paths (`changedItemsRemainOrdered`). For these the
 * explorer patches cell text in place unless the order provably changed.
 */
const TRACKED_PRIMARY_SORTS = new Set([
	'words',
	'tasks',
	'mtime',
	'ctime',
	'opened',
]);

export function isTrackedPrimarySort(primarySort: string): boolean {
	return TRACKED_PRIMARY_SORTS.has(primarySort);
}

export interface StatsChangeDecisionInput {
	/** `StatisticsCacheChange['kind']` — only refresh kinds reach this. */
	kind: string;
	/** Already normalized via `normalizeExplorerSortBy`. */
	primarySort: string;
	/** Any scope-sort level orders by words/tasks. */
	secondaryStatsSort: boolean;
	/** Any scope-sort level orders by mtime/ctime. */
	secondaryTimeSort: boolean;
	/** A words or tasks cell is on screen. */
	statsCellVisible: boolean;
	/** An mtime/ctime/opened cell is on screen. */
	timeCellVisible: boolean;
	/**
	 * Whether the changed paths broke the last rendered order. Lazy because it
	 * compares against the order snapshot and is only meaningful for tracked
	 * primary sorts.
	 */
	needsReorder: () => boolean;
}

export type StatsChangeAction =
	/** Nothing on screen depends on the change. */
	| 'ignore'
	/** Write the changed cells' text in place — never a render. */
	| 'patch'
	/** The primary order provably changed: reposition, render only as fallback. */
	| 'reorder'
	/** Defer to the debounced refresh; `resolveScheduledStatsAction` decides. */
	| 'schedule';

export function resolveStatsChangeAction(
	input: StatsChangeDecisionInput,
): StatsChangeAction {
	if (isTrackedPrimarySort(input.primarySort)) {
		if (input.kind === 'file-stats-refreshed') {
			return input.needsReorder() ? 'reorder' : 'patch';
		}
		// Bulk kinds (warmup completion) have no per-path signal to patch from.
		return 'schedule';
	}
	if (input.secondaryStatsSort || input.secondaryTimeSort) return 'schedule';
	if (!input.statsCellVisible && !input.timeCellVisible) return 'ignore';
	return 'schedule';
}

export interface ScheduledStatsDecisionInput {
	primarySort: string;
	secondaryStatsSort: boolean;
	secondaryTimeSort: boolean;
	/** A failed statistics warmup queued a retry render. */
	retryPending: boolean;
}

/**
 * What the debounced refresh timer is allowed to do once it fires. Renders are
 * reserved for orders the incremental path could not preserve; everything else
 * is a targeted cell patch.
 */
export function resolveScheduledStatsAction(
	input: ScheduledStatsDecisionInput,
): 'render' | 'patch' {
	if (isTrackedPrimarySort(input.primarySort)) return 'render';
	if (input.secondaryStatsSort || input.secondaryTimeSort) return 'render';
	if (input.retryPending) return 'render';
	return 'patch';
}
