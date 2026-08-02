import { describe, expect, it } from 'vitest';

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
});
