import { describe, expect, it } from 'vitest';

import settingsSource from '../../src/VaultmanSettings.ts?raw';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

describe('Vaultman default settings', () => {
	it('keeps the performance monitor disabled by default', () => {
		expect(DEFAULT_SETTINGS.performanceHudEnabled).toBe(false);
	});

	it('shows bulk operation warnings by default', () => {
		expect(DEFAULT_SETTINGS.suppressBulkOperationWarning).toBe(false);
	});

	it('uses 200 files as the default queued operation warning threshold', () => {
		expect(DEFAULT_SETTINGS.bulkOperationWarningThreshold).toBe(200);
	});

	it('keeps Files inside the Data tab menu instead of the dock', () => {
		expect(DEFAULT_SETTINGS.pageOrder).toEqual(['filters', 'statistics']);
	});

	it('keeps the bottom dock disabled by default', () => {
		expect(DEFAULT_SETTINGS.showDock).toBe(false);
	});

	it('keeps explorer search highlights disabled by default', () => {
		expect(DEFAULT_SETTINGS.explorerSearchHighlights).toBe(false);
	});

	it('enables sticky parent rows for both style presets by default', () => {
		expect(DEFAULT_SETTINGS.stickyParentRows).toBe(true);
	});

	it('keeps floating TOC soft scrolling opt-in', () => {
		expect(DEFAULT_SETTINGS.tocSoftScroll).toBe(false);
	});

	it('keeps the floating TOC reserved lane opt-in', () => {
		expect(DEFAULT_SETTINGS.tocReservedLane).toBe(false);
	});

	it('keeps the condensed Files tools menu opt-in', () => {
		expect(DEFAULT_SETTINGS.toolbarToolsMenu).toBe(false);
	});

	it('preserves the existing Files hover information by default', () => {
		expect(DEFAULT_SETTINGS.filesHoverInfo).toEqual([
			'mtime',
			'ctime',
			'words',
		]);
		expect(DEFAULT_SETTINGS.filesHoverInfoOrder).toBeUndefined();
	});

	it('keeps the existing Iconic integration enabled by default', () => {
		expect(DEFAULT_SETTINGS.iconicEnabled).toBe(true);
		expect(DEFAULT_SETTINGS.filesIconScope).toBe('all');
	});

	// U121-003: type-incompatibility warnings decorated every affected row with a
	// badge and a yellow outline, which reads as noise in a browser whose whole
	// job is showing values. Hidden by default; the data stays available to
	// validation either way.
	it('hides property conflict warnings by default', () => {
		expect(DEFAULT_SETTINGS.propConflictWarnings).toBe('off');
	});

	it('keeps the standing reveal opt-in', () => {
		expect(DEFAULT_SETTINGS.autoRevealActiveFile).toBe(false);
	});
});

// The toolbar reveal action is a one-shot: it reveals the current file and then
// holds still, so moving between notes costs a click each. The setting turns it
// into a mode the explorer stays in.
describe('always reveal the current file', () => {
	it('follows the focus from the handler the early returns sit under', () => {
		const handler = filesExplorerSource.slice(
			filesExplorerSource.indexOf('_handleActiveFileChange = (file'),
			filesExplorerSource.indexOf(
				"normalizeExplorerSortBy(this.sortBy) !== 'opened'",
			),
		);
		// Below this point the handler returns early under every sort that is
		// not Last opened, so a reveal placed there would only fire on one.
		expect(handler).toContain(
			'this.plugin.settings.autoRevealActiveFile === true',
		);
		expect(handler).toContain('this.autoRevealActiveFile()');
	});

	it('offers the mode as a setting', () => {
		expect(settingsSource).toContain(
			"translate('settings.auto_reveal_active_file')",
		);
		expect(settingsSource).toContain(
			'this.plugin.settings.autoRevealActiveFile = value;',
		);
	});

	it('localizes the setting', () => {
		for (const key of [
			'settings.auto_reveal_active_file',
			'settings.auto_reveal_active_file.desc',
		]) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});
