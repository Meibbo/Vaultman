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

	it('gives each gesture its own worst, not the worst of the whole run', () => {
		const base = 1_700_000_000_000;
		const stable = { longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 };
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 120, ...stable },
				{ at: base + 1000, fps: 30, ...stable },
				{ at: base + 2000, fps: 118, ...stable },
				{ at: base + 3000, fps: 90, ...stable },
				{ at: base + 4000, fps: 119, ...stable },
			],
			actions: [
				{
					surface: 'tree',
					name: 'scroll',
					at: base + 1000,
					// Recorded after settling; the span comes from startedAt.
					detail: { delta: 5000, durationMs: 1000, startedAt: base + 800 },
				},
				{
					surface: 'tree',
					name: 'scroll',
					at: base + 3000,
					detail: { delta: 300, durationMs: 200, startedAt: base + 2900 },
				},
			],
		});

		// El gesto suave NO hereda la caida del brusco.
		expect(out).toContain('+1.0s  scroll 5000px in 1000ms -> 30 fps · worst 30 fps');
		expect(out).toContain('+3.0s  scroll 300px in 200ms -> 90 fps · worst 90 fps');
		expect(out).toContain('worst overall 30 fps');
	});

	it('keeps a gesture that lands between samples', () => {
		// El sampler corre cada 2 s. Un gesto a 700 ms de la muestra mas cercana
		// es de lo mas corriente, y con una tolerancia fija se perdia entero.
		const base = 1_700_000_000_000;
		const stable = { longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 };
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 119, ...stable },
				{ at: base + 2000, fps: 22, ...stable },
				{ at: base + 4000, fps: 118, ...stable },
			],
			actions: [
				{
					surface: 'tree',
					name: 'scroll',
					at: base + 1300,
					detail: { delta: 6000, durationMs: 1100, startedAt: base + 1200 },
				},
			],
		});

		expect(out).toContain('scroll 6000px in 1100ms');
		expect(out.split('\n').filter((line) => line.includes('scroll'))).toHaveLength(1);
	});

	it('shows both gestures when two land on the same sample', () => {
		const base = 1_700_000_000_000;
		const stable = { longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 };
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 119, ...stable },
				{ at: base + 2000, fps: 40, ...stable },
			],
			actions: [
				{ surface: 'tree', name: 'scroll', at: base + 1900, detail: { delta: 100, durationMs: 90 } },
				{ surface: 'tree', name: 'scroll', at: base + 2100, detail: { delta: 250, durationMs: 80 } },
			],
		});

		expect(out).toContain('scroll 100px in 90ms');
		expect(out).toContain('scroll 250px in 80ms');
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
	it('narrates an action that is not a gesture without inventing numbers', () => {
		// `render` no lleva desplazamiento; el volcado real sacaba
		// "render undefinedpx in undefinedms" justo donde se pega en un issue.
		const base = 1_700_000_000_000;
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 65, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
			],
			actions: [
				{ surface: 'tree', name: 'render', at: base, detail: { rows: 93 } },
			],
		});

		expect(out).not.toContain('undefined');
		expect(out).toContain('render (rows 93) -> 65 fps');
	});

	it('rounds the sub-pixel displacement a real gesture reports', () => {
		const base = 1_700_000_000_000;
		const out = formatPerfTimeline({
			samples: [
				{ at: base, fps: 47, longTasks: 0, longTaskMs: 0, mainThreadPressure: 0 },
			],
			actions: [
				{
					surface: 'tree',
					name: 'scroll',
					at: base,
					detail: { delta: 62.22216796875, durationMs: 461 },
				},
			],
		});

		expect(out).toContain('scroll 62px in 461ms');
	});
});
