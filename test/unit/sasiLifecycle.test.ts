import { afterEach, describe, expect, it, vi } from 'vitest';
import { sasiLifecycleFor } from '../../src/logic/logicSasiLifecycle';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';

afterEach(() => vi.useRealTimers());
describe('SASI implementation lifecycle', () => {
	it('honors authoritative definition dates instead of generated module dates', () => {
		const registry = createSasiRegistry();
		registry.register({
			id: 'vaultman.toolbar.revealActiveFile', axis: 'function', kind: 'action',
			labelKey: 'reveal', supports: [],
			lifecycle: { createdAt: 100, updatedAt: 200, source: 'definition', precision: 'definition' },
		});
		const provider = createSasiProvider(registry);
		expect(provider.lifecycleFor('vaultman.toolbar.revealActiveFile')?.createdAt).toBe(100);
		expect(provider.nodesFor('function')[0]?.updatedAt).toBe(200);
	});
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
