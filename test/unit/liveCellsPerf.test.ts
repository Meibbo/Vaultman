import { describe, expect, it } from 'vitest';

import {
	isTrackedPrimarySort,
	resolveScheduledStatsAction,
	resolveStatsChangeAction,
	type StatsChangeDecisionInput,
} from '../../src/logic/logicLiveCells';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

/**
 * U121-027 performance guard for the typing path.
 *
 * The regression this pins: vault `modify` fires on every autosave while the
 * user is typing, statisticsCache turns it into `file-stats-refreshed`, and any
 * decision on that path that ends in `_render()` stalls the editor — the exact
 * micro-stalls BT5-030 removed and `b5176943` reintroduced. 1021 green tests
 * did not see it because no test asserted what the typing path is ALLOWED to
 * cost. These do, behaviourally, on the pure decision core in logicLiveCells.
 */

const typingBurst: Omit<StatsChangeDecisionInput, 'primarySort'> = {
	kind: 'file-stats-refreshed',
	secondaryStatsSort: false,
	secondaryTimeSort: false,
	statsCellVisible: false,
	timeCellVisible: true,
	needsReorder: () => {
		throw new Error('untracked sorts must not pay for an order comparison');
	},
};

describe('U121-027 typing-path performance guard', () => {
	it('typing with visible time cells under an untracked sort only ever patches', () => {
		// The dev's default layout: modified-date cell visible, name sort. Every
		// autosave lands here; the debounced follow-up must resolve to a patch.
		// `needsReorder` throws to also prove the order comparator never runs.
		for (const primarySort of ['name', 'path', 'ext', 'count']) {
			expect(isTrackedPrimarySort(primarySort)).toBe(false);
			expect(
				resolveStatsChangeAction({ ...typingBurst, primarySort }),
			).toBe('schedule');
			expect(
				resolveScheduledStatsAction({
					primarySort,
					secondaryStatsSort: false,
					secondaryTimeSort: false,
					retryPending: false,
				}),
			).toBe('patch');
		}
	});

	it('typing under the Modified sort patches while the order holds and repositions when it breaks', () => {
		// Steady-state typing: after the first save the file is already the
		// recency extreme, so the order holds and only cell text changes.
		expect(
			resolveStatsChangeAction({
				...typingBurst,
				primarySort: 'mtime',
				needsReorder: () => false,
			}),
		).toBe('patch');
		// First save from mid-list: reposition (BT5-089's edge move), still not
		// an unconditional render.
		expect(
			resolveStatsChangeAction({
				...typingBurst,
				primarySort: 'mtime',
				needsReorder: () => true,
			}),
		).toBe('reorder');
	});

	it('a layout with nothing statistics-driven on screen ignores the change outright', () => {
		expect(
			resolveStatsChangeAction({
				...typingBurst,
				primarySort: 'name',
				timeCellVisible: false,
			}),
		).toBe('ignore');
	});

	it('renders stay reserved for orders the incremental path cannot preserve', () => {
		// Bulk warmup kinds carry no per-path signal to patch from.
		expect(
			resolveStatsChangeAction({
				...typingBurst,
				kind: 'stats-warmed',
				primarySort: 'words',
			}),
		).toBe('schedule');
		// Tracked primary sorts that fell through to the timer provably
		// re-ordered (or arrived in bulk): the honest answer is a render.
		expect(
			resolveScheduledStatsAction({
				primarySort: 'mtime',
				secondaryStatsSort: false,
				secondaryTimeSort: false,
				retryPending: false,
			}),
		).toBe('render');
		// Secondary sorts have no incremental projection yet.
		expect(
			resolveScheduledStatsAction({
				primarySort: 'name',
				secondaryStatsSort: false,
				secondaryTimeSort: true,
				retryPending: false,
			}),
		).toBe('render');
		// A failed warmup queued a retry render.
		expect(
			resolveScheduledStatsAction({
				primarySort: 'name',
				secondaryStatsSort: false,
				secondaryTimeSort: false,
				retryPending: true,
			}),
		).toBe('render');
	});

	it('the explorer delegates both decisions to the pure resolvers', () => {
		// Structural half: the behavioural guarantees above only protect the
		// explorer if the explorer actually asks these functions.
		expect(explorerFilesSource).toContain('resolveStatsChangeAction({');
		expect(explorerFilesSource).toContain('resolveScheduledStatsAction({');
	});
});
