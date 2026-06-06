import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

describe('Vaultman default settings', () => {
	it('keeps the performance monitor disabled by default', () => {
		expect(DEFAULT_SETTINGS.performanceHudEnabled).toBe(false);
	});

	it('shows bulk operation warnings by default', () => {
		expect(DEFAULT_SETTINGS.suppressBulkOperationWarning).toBe(false);
	});

	it('keeps Files inside the Data tab menu instead of the dock', () => {
		expect(DEFAULT_SETTINGS.pageOrder).toEqual(['filters', 'statistics']);
	});
});
