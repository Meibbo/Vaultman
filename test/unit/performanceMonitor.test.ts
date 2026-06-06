import { describe, expect, it } from 'vitest';

import { VaultmanPerformanceMonitor } from '../../src/utils/performanceMonitor';

describe('VaultmanPerformanceMonitor live diagnostics', () => {
	it('keeps bounded samples and action logs for the HUD', () => {
		const monitor = new VaultmanPerformanceMonitor({
			entryLimit: 4,
			sampleLimit: 2,
			actionLimit: 2,
		});

		monitor.recordSample({
			fps: 58,
			longTasks: 1,
			mainThreadPressure: 0.25,
			memoryMb: 128,
			cpuPercent: 12,
		});
		monitor.recordSample({
			fps: 49,
			longTasks: 3,
			mainThreadPressure: 0.62,
			memoryMb: 136,
			cpuPercent: 24,
		});
		monitor.recordSample({
			fps: 60,
			longTasks: 0,
			mainThreadPressure: 0.05,
			memoryMb: 130,
			cpuPercent: 8,
		});

		monitor.recordAction('files', 'expand-all', { rows: 10_000 });
		monitor.recordAction('statistics', 'compute-cache-hit', { scope: 'vault' });
		monitor.recordAction('files', 'scroll-bottom', { index: 9_999 });

		expect(monitor.samples().map((sample) => sample.fps)).toEqual([49, 60]);
		expect(monitor.latestSample()?.longTasks).toBe(0);
		expect(monitor.actions().map((action) => action.name)).toEqual([
			'compute-cache-hit',
			'scroll-bottom',
		]);
		expect(monitor.actions()[1]).toMatchObject({
			surface: 'files',
			detail: { index: 9_999 },
		});
	});
});
