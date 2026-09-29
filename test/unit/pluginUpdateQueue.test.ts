import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import {
	OperationQueueService,
	type PluginUpdateAdapter,
} from '../../src/services/serviceOperationQueue';
import type { PluginUpdateItem } from '../../src/types/typeOps';

const item = (id: string, toVersion = '2.0.0'): PluginUpdateItem => ({
	id,
	name: id,
	fromVersion: '1.0.0',
	toVersion,
});

function adapterFor(
	versions: Record<string, string | undefined>,
	available: Record<string, boolean> = {},
): PluginUpdateAdapter {
	return {
		hasUpdate: vi.fn(async (id: string) => available[id] ?? true),
		installPlugin: vi.fn(async (id: string) => {
			versions[id] = '2.0.0';
		}),
		getInstalledVersion: vi.fn(async (id: string) => versions[id]),
	};
}

describe('plugin update queue contract', () => {
	it('snapshots items, sorts by id, runs sequentially, and persists results', async () => {
		const service = new OperationQueueService({} as App);
		const versions: Record<string, string | undefined> = { alpha: '1.0.0', zeta: '1.0.0' };
		const adapter = adapterFor(versions);
		const calls: string[] = [];
		vi.mocked(adapter.installPlugin).mockImplementation(async (id) => {
			calls.push(`start:${id}`);
			versions[id] = '2.0.0';
			calls.push(`end:${id}`);
		});
		const input = [item('zeta'), item('alpha')];

		const result = await service.runPluginUpdates(input, adapter);
		input[0].name = 'mutated';

		expect(result.items.map(({ item: update }) => update.id)).toEqual(['alpha', 'zeta']);
		expect(calls).toEqual(['start:alpha', 'end:alpha', 'start:zeta', 'end:zeta']);
		expect(result.items.every(({ status }) => status === 'success')).toBe(true);
		expect(service.getPluginUpdateQueueState()).toMatchObject({
			running: false,
			results: [
				{ item: { id: 'alpha', name: 'alpha' }, status: 'success' },
				{ item: { id: 'zeta', name: 'zeta' }, status: 'success' },
			],
		});
	});

	it('continues after errors and warns when an update disappears', async () => {
		const service = new OperationQueueService({} as App);
		const versions: Record<string, string | undefined> = { a: '1.0.0', b: '1.0.0', c: '1.0.0' };
		const adapter = adapterFor(versions, { a: true, b: false, c: true });
		vi.mocked(adapter.installPlugin).mockImplementationOnce(async () => {
			throw new Error('install failed');
		});

		const result = await service.runPluginUpdates([item('c'), item('a'), item('b')], adapter);

		expect(result.items.map(({ status }) => status)).toEqual(['error', 'warning', 'success']);
		expect(adapter.installPlugin).toHaveBeenCalledTimes(2);
	});

	it('warns when the plugin is absent from the post-install state', async () => {
		const service = new OperationQueueService({} as App);
		const versions: Record<string, string | undefined> = { gone: '1.0.0' };
		const adapter = adapterFor(versions);
		vi.mocked(adapter.installPlugin).mockImplementation(async () => {
			versions.gone = undefined;
		});

		const result = await service.runPluginUpdates([item('gone')], adapter);

		expect(result.items[0]).toMatchObject({
			status: 'warning',
			message: 'Plugin disappeared after update',
		});
	});

	it('supports cancellation and re-entry without starting a second run', async () => {
		const service = new OperationQueueService({} as App);
		const versions: Record<string, string | undefined> = { a: '1.0.0', b: '1.0.0' };
		let releaseFirst!: () => void;
		const first = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		const adapter = adapterFor(versions);
		vi.mocked(adapter.installPlugin).mockImplementationOnce(async () => {
			await first;
			versions.a = '2.0.0';
		});

		const run = service.runPluginUpdates([item('b'), item('a')], adapter);
		const reentry = service.runPluginUpdates([item('other')], adapter);
		expect(reentry).toBe(run);
		service.cancelPluginUpdates();
		releaseFirst();

		const result = await run;
		expect(result.cancelled).toBe(true);
		expect(result.items.map(({ item: update, status }) => [update.id, status])).toEqual([
			['a', 'success'],
			['b', 'warning'],
		]);
		expect(service.getPluginUpdateQueueState().results).toHaveLength(2);

		const rerun = await service.runPluginUpdates([item('a')], adapter);
		expect(rerun.cancelled).toBe(false);
	});
});
