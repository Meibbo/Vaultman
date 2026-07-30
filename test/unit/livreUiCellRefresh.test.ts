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
 */
describe('U121-027 LivreUI cell refresh', () => {
	it('routes every live source through one coalescer', () => {
		// One flag, one microtask, one render: a burst from several sources at
		// once must still cost a single repaint.
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

	it('ticks relative timestamps on the wall clock, behind a guard', () => {
		// Relative copy goes stale with no vault event to hang a repaint on.
		expect(explorerFilesSource).toContain('LIVE_TIMESTAMP_TICK_MS');
		expect(explorerFilesSource).toContain('this.registerInterval(');
		// An idle or absolute-mode vault must not pay for a render.
		expect(explorerFilesSource).toContain('if (!this._hasLiveTimestamps) return;');
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
		const shortcut = explorerFilesSource.slice(
			explorerFilesSource.indexOf('const result = moveNodeToSiblingEdge('),
			explorerFilesSource.indexOf('// Table and Cards have no equivalent projection yet'),
		);
		expect(shortcut).toContain('this._refreshNodeTimeCells(moved)');
		// Re-opening a file already at the edge still bumps Last opened, so the
		// no-reorder branch must refresh too.
		expect(shortcut).toContain('if (!result.changed) {');
	});

	it('puts the time cells on the statistics pipeline that already works for words', () => {
		// The signal was already arriving: `statisticsCache` listens to vault
		// `modify` and emits `file-stats-refreshed` with the changed paths. The
		// explorer dropped it unless a words/tasks cell was visible, so editing a
		// note left the mtime cell — and an mtime sort — stale until the minute
		// ticker fired. cell_words appeared to have a better pipeline only because
		// it was the one plugged in.
		const handler = explorerFilesSource.slice(
			explorerFilesSource.indexOf('private readonly _handleStatsChange'),
			explorerFilesSource.indexOf('private _patchVisibleStatisticsCells'),
		);
		expect(handler).not.toBe('');
		// The drop-out guard must consider time cells, not only words/tasks.
		expect(handler).toContain('!this._timeCellVisible()');
		// A time sort re-orders; a visible time cell re-derives. Both go through
		// the 60ms debounce, never the microtask coalescer, because vault
		// `modify` fires on autosave while the user is typing.
		expect(handler).toContain('this._usesTimeSort()');
		expect(handler).toContain('}, 60);');
		expect(handler).not.toContain('_scheduleLiveRender');
	});

	it('repaints time cells on open even when the sort is not Last opened', () => {
		// Under any other sort the node does not move, so nothing repainted it.
		const handler = explorerFilesSource.slice(
			explorerFilesSource.indexOf('private readonly _handleActiveFileChange'),
			explorerFilesSource.indexOf('const result = moveNodeToSiblingEdge('),
		);
		expect(handler).toContain('this._refreshNodeTimeCells(opened)');
		// BT5-030 still owns this event: the narrow fix repaints the tree window
		// for one refreshed node and must never reach the panel render.
		expect(handler).not.toContain('this._render()');
		// Skipped entirely when no clock-driven cell is on screen.
		expect(handler).toContain('this._timeCellVisible()');
	});
});
