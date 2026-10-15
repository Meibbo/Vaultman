import { describe, expect, it } from 'vitest';
import {
	ADAPTIVE_FALLBACK_MIN_SAMPLES,
	TreeHeightIndex,
} from '../../src/logic/logicTreeHeightIndex';

describe('U200 L1: adaptive unknown-key fallback', () => {
	it('uses the static estimate with no samples', () => {
		const index = new TreeHeightIndex(28);
		index.setRows(['a', 'b']);
		expect(index.unknownFallback()).toBe(28);
		expect(index.totalHeight()).toBe(56);
		expect(index.getEstimate()).toBe(28);
	});

	it('keeps the static estimate below the sample threshold', () => {
		const index = new TreeHeightIndex(28);
		for (let i = 0; i < ADAPTIVE_FALLBACK_MIN_SAMPLES - 1; i += 1) {
			index.setMeasured(`k${i}`, 26.89);
		}
		expect(index.unknownFallback()).toBe(28);
	});

	it('switches to the measured mean once warmed', () => {
		const index = new TreeHeightIndex(28);
		for (let i = 0; i < 20; i += 1) {
			index.setMeasured(`k${i}`, 26.89);
		}
		expect(index.unknownFallback()).toBeCloseTo(26.89, 10);
		// Unknown keys price at the mean, known keys keep their measure.
		index.setRows(['k0', 'cold-1', 'cold-2']);
		expect(index.heightForIndex(0)).toBeCloseTo(26.89, 10);
		expect(index.heightForIndex(1)).toBeCloseTo(26.89, 10);
		expect(index.totalHeight()).toBeCloseTo(26.89 * 3, 8);
	});

	it('tracks varying heights with a running mean', () => {
		const index = new TreeHeightIndex(28);
		for (let i = 0; i < 10; i += 1) {
			index.setMeasured(`tall${i}`, 40);
			index.setMeasured(`short${i}`, 20);
		}
		expect(index.unknownFallback()).toBeCloseTo(30, 10);
	});

	it('invalidateAll keeps the prior but drops per-key measures', () => {
		const index = new TreeHeightIndex(28);
		for (let i = 0; i < 10; i += 1) {
			index.setMeasured(`k${i}`, 26.89);
		}
		index.setRows(['k0']);
		expect(index.heightForIndex(0)).toBeCloseTo(26.89, 10);
		index.invalidateAll();
		// Per-key measure gone, but the warmed prior survives.
		expect(index.unknownFallback()).toBeCloseTo(26.89, 10);
		expect(index.heightForIndex(0)).toBeCloseTo(26.89, 10);
	});

	it('rejects non-finite measurements without feeding the mean', () => {
		const index = new TreeHeightIndex(28);
		expect(index.setMeasured('a', 0)).toBe(false);
		expect(index.setMeasured('b', Number.NaN)).toBe(false);
		expect(index.setMeasured('c', Number.POSITIVE_INFINITY)).toBe(false);
		expect(index.unknownFallback()).toBe(28);
	});

	it('getEstimate still reports the density pitch', () => {
		const index = new TreeHeightIndex(28);
		for (let i = 0; i < 20; i += 1) {
			index.setMeasured(`k${i}`, 26.89);
		}
		expect(index.getEstimate()).toBe(28);
		index.setEstimate(37);
		expect(index.getEstimate()).toBe(37);
	});
});
