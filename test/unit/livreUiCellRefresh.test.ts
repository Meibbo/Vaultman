import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

/**
 * LivreUI ("live redesign user interface"): a runtime change the user makes must
 * be visible without waiting for an unrelated event to force a repaint.
 *
 * Three regressions of this class shipped in 1.2.0, each a different way of
 * moving a node or a setting without refreshing the cell that depends on it.
 * These are source-level guards, in the style of BT5-031's icon guard, because
 * the failure is structural — a code path that repositions or re-sorts without
 * routing through a repaint — rather than a wrong value from a pure function.
 *
 * The counterpart invariant is BT5-030's: liveness must be bought with targeted
 * cell patches, never with renders on the typing path. The behavioural half of
 * that guard lives in liveCellsPerf.test.ts on the pure decision functions.
 */

function sliceBetween(start: string, end: string, from = 0): string {
	const startIndex = explorerFilesSource.indexOf(start, from);
	if (startIndex === -1) return '';
	const endIndex = explorerFilesSource.indexOf(end, startIndex);
	if (endIndex === -1) return '';
	return explorerFilesSource.slice(startIndex, endIndex);
}

describe('U121-027 LivreUI cell refresh', () => {
	it('routes every full-render live source through one coalescer', () => {
		// One flag, one microtask, one render: a burst from several sources at
		// once must still cost a single repaint. Only sources that genuinely
		// need a full render (Iconic, settings toggles) may use it — the cell
		// pipeline patches instead.
		expect(explorerFilesSource).toContain('_scheduleLiveRender = () => {');
		expect(explorerFilesSource).toContain('if (this._iconicRenderQueued) return;');
		expect(explorerFilesSource).toContain('queueMicrotask(');
	});

	it('subscribes the explorer to settings changes', () => {
		// The regression: `onSettingsChange` existed since 1.2.0 with no
		// subscribers, so toggling a cell setting repainted nothing.
		expect(explorerFilesSource).toContain(
			'this.register(this.plugin.onSettingsChange(this._scheduleLiveRender))',
		);
	});

	it('ticks relative timestamps on the wall clock, behind a guard, without a render', () => {
		// Relative copy goes stale with no vault event to hang a repaint on.
		expect(explorerFilesSource).toContain('LIVE_TIMESTAMP_TICK_MS');
		// An idle or absolute-mode vault must not pay for the tick.
		expect(explorerFilesSource).toContain('if (!this._hasLiveTimestamps) return;');
		// The tick writes cell text in place. A full `_render()` on a timer is
		// the exact regression that reintroduced the typing micro-stalls.
		const tick = sliceBetween(
			'this.registerInterval(',
			'LIVE_TIMESTAMP_TICK_MS),',
		);
		expect(tick).toContain('this._patchVisibleTimeCells()');
		expect(tick).not.toContain('_scheduleLiveRender');
		expect(tick).not.toContain('_render()');
		// The flag is raised in the shared formatter, not in the tree decoration
		// pass, because grid and table never run that pass.
		const formatterStart = explorerFilesSource.indexOf('private _formatDateCell');
		expect(formatterStart).toBeGreaterThan(-1);
		const formatter = explorerFilesSource.slice(
			formatterStart,
			explorerFilesSource.indexOf('formatTimestampCell(time,', formatterStart),
		);
		expect(formatter).toContain('this._hasLiveTimestamps = true');
	});

	it('refreshes the moved node when the open-shortcut skips a full render', () => {
		// BT5-089 repositions one node and calls treeView.render directly, so
		// `_render()` — and with it the decoration pass — never runs. The node
		// landed first while still reading "4 minutes ago".
		const openHandlerStart = explorerFilesSource.indexOf(
			'private readonly _handleActiveFileChange',
		);
		expect(openHandlerStart).toBeGreaterThan(-1);
		const shortcut = sliceBetween(
			'const result = moveNodeToSiblingEdge(',
			'// Table and Cards have no equivalent projection yet',
			openHandlerStart,
		);
		expect(shortcut).toContain('this._refreshNodeTimeCells(moved)');
		// Re-opening a file already at the edge still bumps Last opened, so the
		// no-reorder branch must refresh too.
		expect(shortcut).toContain('if (!result.changed) {');
	});

	it('puts the time cells on the statistics patch pipeline that works for words', () => {
		// The signal was already arriving: `statisticsCache` listens to vault
		// `modify` and emits `file-stats-refreshed` with the changed paths on
		// every autosave while the user is typing. The handler routes it through
		// the pure decision in logicLiveCells and answers with targeted cell
		// patches — never with a render it cannot prove it needs.
		const handler = sliceBetween(
			'private readonly _handleStatsChange',
			'private _scheduleStatsRefresh',
		);
		expect(handler).not.toBe('');
		expect(handler).toContain('resolveStatsChangeAction({');
		expect(handler).toContain('this._patchVisibleTimeCells(pathSet)');
		// The Modified sort gives the modified note the same edge treatment
		// BT5-089 gives the opened one.
		expect(handler).toContain('this._tryMoveModifiedToEdge(paths)');
		expect(handler).not.toContain('_scheduleLiveRender');
		expect(handler).not.toContain('this._render()');
		// The debounced fallback also decides through the pure resolver, still
		// behind the 60ms debounce, never the microtask coalescer.
		const timer = sliceBetween(
			'private _scheduleStatsRefresh',
			'private _patchVisibleStatisticsCells',
		);
		expect(timer).toContain('resolveScheduledStatsAction({');
		expect(timer).toContain('this._patchVisibleTimeCells(changedPaths)');
		expect(timer).toContain('}, 60);');
	});

	it('patches time cells on open even when the sort is not Last opened', () => {
		// Under any other sort the node does not move, so nothing repainted it.
		// BT5-030 owns this event: the opened row's cells are patched in place —
		// no `_render()`, no tree window repaint.
		const handler = sliceBetween(
			'private readonly _handleActiveFileChange',
			'queueMicrotask(() => {\n\t\t\tif (!this.containerEl.isConnected) return;\n\t\t\t// BT5-089',
		);
		expect(handler).not.toBe('');
		expect(handler).toContain(
			"if (normalizeExplorerSortBy(this.sortBy) !== 'opened') {",
		);
		expect(handler).toContain('this._patchVisibleTimeCells(new Set([file.path]))');
		expect(handler).not.toContain('this._render()');
		expect(handler).not.toContain('this.treeView.render(');
		// Skipped entirely when no clock-driven cell is on screen.
		expect(handler).toContain('this._timeCellVisible()');
	});
});
