import { describe, expect, it } from 'vitest';

import { formatPerfTimeline } from '../../src/utils/perfTimeline';

describe('formatPerfTimeline', () => {
	it('narrates a scroll gesture between two stable stretches', () => {
		const base = 1_700_000_000_000;
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 118, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
				{ at: base + 1000, fps: 24, longTasks: 3, longTaskMs: 90, mainThreadPressure: 0.7 },
				{ at: base + 2000, fps: 117, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
			],
			actions: [
				{
					surface: 'tree',
					name: 'scroll',
					at: base + 1000,
					detail: { delta: 4200, durationMs: 800, rows: 10432, sticky: true },
				},
			],
		});

		expect(out).toContain('+0.0s  stable 118 fps');
		expect(out).toContain('+1.0s  scroll 4200px in 800ms (rows 10432, sticky on) -> 24 fps');
		expect(out).toContain('+2.0s  stable 117 fps');
	});

	it('marks the worst fps reached during each gesture', () => {
		const base = 1_700_000_000_000;
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 60, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
				{ at: base + 500, fps: 18, longTasks: 1, longTaskMs: 40, mainThreadPressure: 0.5 },
			],
			actions: [
				{ surface: 'tree', name: 'scroll', at: base, detail: { delta: -900, durationMs: 600 } },
			],
		});

		expect(out).toContain('worst 18 fps');
	});

	it('says so instead of throwing when the sampler produced nothing', () => {
		expect(formatPerfTimeline({ samples: [], actions: [] })).toBe('no samples');
	});

	it('reads the same however the ring buffer happened to be ordered', () => {
		const base = 1_700_000_000_000;
		const shuffled = formatPerfTimeline({
			samples: [
				{ at: base + 1000, fps: 24, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
				{ at: base, fps: 118, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
			],
			actions: [],
		});

		// El origen es la muestra MAS ANTIGUA, no la primera del array.
		expect(shuffled.split('\n')[0]).toBe('+0.0s  stable 118 fps');
		expect(shuffled.split('\n')[1]).toBe('+1.0s  stable 24 fps');
	});
});
