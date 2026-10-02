import { afterEach, describe, expect, it, vi } from 'vitest';
import { sasiLifecycleFor } from '../../src/logic/logicSasiLifecycle';

afterEach(() => vi.useRealTimers());
describe('SASI implementation lifecycle', () => {
	it('exposes repository-backed dates for an implemented command', () => {
		const dates = sasiLifecycleFor('vaultman.toolbar.revealActiveFile');
		expect(dates?.createdAt).toBeGreaterThan(0);
		expect(dates?.updatedAt).toBeGreaterThanOrEqual(dates?.createdAt ?? 0);
		expect(dates?.source).toContain('src/');
	});
	it('does not invent creation dates for unknown consumer extensions', () => {
		expect(sasiLifecycleFor('unregistered.external.function')).toBeUndefined();
	});
	it('does not change metadata when the runtime clock advances or the provider reloads', () => {
		const before = sasiLifecycleFor('vaultman.toolbar.revealActiveFile');
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2126-01-01'));
		expect(sasiLifecycleFor('vaultman.toolbar.revealActiveFile')).toEqual(before);
	});
});
