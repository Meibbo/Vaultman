import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

describe('Vaultman default settings', () => {
	it('keeps the performance monitor disabled by default', () => {
		expect(DEFAULT_SETTINGS.performanceHudEnabled).toBe(false);
	});

	it('shows bulk operation warnings by default', () => {
		expect(DEFAULT_SETTINGS.suppressBulkOperationWarning).toBe(false);
	});

	it('uses 400 files as the default queued operation warning threshold', () => {
		expect(DEFAULT_SETTINGS.bulkOperationWarningThreshold).toBe(400);
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
});
