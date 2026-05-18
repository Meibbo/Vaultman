import { describe, expect, it, vi } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	getActivePerfProbe,
	PERF_SCENARIO_NAMES,
	type PerfScenarioName,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';

const explorerPlatformScenarioNames = [
	'files-list-10k-scroll-jump',
	'files-tree-10k-scroll-jump',
	'files-tree-50k-scroll-jump',
	'projection-50k-build-or-refresh',
	'projection-100k-proof',
	'view-menu-element-toggle',
	'view-mode-native-preset-restore',
	'tree-box-selection',
	'tree-filtered-highlight',
	'node-media-descriptor-build',
	'node-media-hidden-cost',
	'node-media-visible-subscribe',
] as const satisfies readonly PerfScenarioName[];

describe('perf probe contract', () => {
	it('counts events with payload totals', () => {
		const probe = createPerfProbe({ now: () => 10 });

		probe.count('panel.getTree', { nodes: 4 });
		probe.count('panel.getTree', { nodes: 6 });

		expect(probe.snapshot().counters['panel.getTree']).toMatchObject({
			count: 2,
			totalNodes: 10,
		});
	});

	it('measures synchronous work duration', () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const result = probe.measure('view.flatten', { nodes: 3 }, () => {
			now = 12;
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(probe.snapshot().timings['view.flatten']).toMatchObject({
			count: 1,
			totalMs: 12,
			maxMs: 12,
			totalNodes: 3,
		});
	});

	it('measures async work duration', async () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const result = await probe.api.measureAsync('queue.ingest', { files: 2 }, async () => {
			now = 5;
			await Promise.resolve();
			now = 17;
			return 'done';
		});

		expect(result).toBe('done');
		expect(probe.snapshot().timings['queue.ingest']).toMatchObject({
			count: 1,
			totalMs: 17,
			maxMs: 17,
			totalFiles: 2,
		});
	});

	it('installs and restores a global hook', () => {
		const target = {} as { __vaultmanPerfProbe?: unknown };
		const probe = createPerfProbe({ now: () => 0 });
		const uninstall = probe.installGlobal(target);

		expect(target.__vaultmanPerfProbe).toBe(probe.api);

		uninstall();
		expect(target.__vaultmanPerfProbe).toBeUndefined();
	});

	it('exposes an optional active probe for hot path instrumentation', () => {
		const probe = createPerfProbe({ now: () => 0 });

		clearActivePerfProbe();
		expect(getActivePerfProbe()).toBeUndefined();

		setActivePerfProbe(probe.api);
		getActivePerfProbe()?.count('service.decorate', { nodes: 1 });

		expect(probe.snapshot().counters['service.decorate'].count).toBe(1);

		clearActivePerfProbe();
		expect(getActivePerfProbe()).toBeUndefined();
	});

	it('finishes scenarios when animation frames are not delivered', async () => {
		const setTimeout = vi.fn((cb: () => void) => {
			cb();
			return 0;
		});
		const doc = {
			defaultView: {
				requestAnimationFrame: vi.fn(),
				setTimeout,
			},
			querySelector: () => null,
		} as unknown as Document;
		const probe = createPerfProbe({ now: () => 0, doc });

		const result = await probe.api.run('tree-scroll');

		expect(setTimeout).toHaveBeenCalled();
		expect(result.scenario).toBe('tree-scroll');
	});

	it('records event-loop delay after scroll scenarios as long-frame data', async () => {
		let now = 0;
		const scroller = {
			clientHeight: 100,
			scrollHeight: 1_000,
			scrollTop: 0,
			dispatchEvent: vi.fn(),
		} as unknown as HTMLElement;
		const doc = {
			defaultView: {
				setTimeout: (cb: () => void) => {
					now += 75;
					cb();
					return 0;
				},
			},
			querySelector: (selector: string) =>
				selector === '.vm-tree-virtual-outer' ? scroller : null,
		} as unknown as Document;
		const probe = createPerfProbe({ now: () => now, doc });

		const result = await probe.api.run('files-tree-50k-scroll-jump');

		expect(scroller.scrollTop).toBe(900);
		expect(result.longFrameCount).toBeGreaterThan(0);
		expect(result.maxLongFrameMs).toBeGreaterThanOrEqual(75);
	});

	it('registers explorer platform scenarios as runnable snapshot contracts', async () => {
		expect(PERF_SCENARIO_NAMES).toEqual(expect.arrayContaining(explorerPlatformScenarioNames));

		for (const name of explorerPlatformScenarioNames) {
			const probe = createPerfProbe({ now: () => 0 });
			const result = await probe.api.run(name);

			expect(result.scenario).toBe(name);
			expect(result.counters[`scenario.${name}`].count).toBe(1);
		}
	});

	it('includes jank-ready snapshot fields for future live probes', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const snapshot = probe.snapshot();

		expect(Object.hasOwn(snapshot, 'longFrameCount')).toBe(true);
		expect(Object.hasOwn(snapshot, 'maxLongFrameMs')).toBe(true);
		expect(Object.hasOwn(snapshot, 'heapDeltaBytes')).toBe(true);
		expect(snapshot.longFrameCount).toBeUndefined();
		expect(snapshot.maxLongFrameMs).toBeUndefined();
		expect(snapshot.heapDeltaBytes).toBeUndefined();
	});
});
