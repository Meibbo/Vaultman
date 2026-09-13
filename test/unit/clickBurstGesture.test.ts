import { describe, expect, it, vi } from 'vitest';

import {
	ClickBurstGesture,
	type ClickBurstScheduler,
} from '../../src/utils/clickBurstGesture';

function schedulerHarness() {
	let now = 0;
	let nextId = 1;
	const callbacks = new Map<number, () => void>();
	const scheduler: ClickBurstScheduler = {
		setTimeout: (callback) => {
			const id = nextId++;
			callbacks.set(id, callback);
			return id;
		},
		clearTimeout: (id) => callbacks.delete(id),
		now: () => now,
	};
	return {
		scheduler,
		setNow: (value: number) => {
			now = value;
		},
		fireAll: () => {
			for (const [id, callback] of [...callbacks]) {
				callbacks.delete(id);
				callback();
			}
		},
		pendingCount: () => callbacks.size,
	};
}

describe('ClickBurstGesture', () => {
	it('coalesces two fast clicks on the same target into one secondary gesture', () => {
		const harness = schedulerHarness();
		const gesture = new ClickBurstGesture(harness.scheduler, 300);
		const primary = vi.fn();
		const secondary = vi.fn();

		gesture.click('same', 100, primary, secondary);
		gesture.click('same', 250, primary, secondary);
		harness.fireAll();

		expect(secondary).toHaveBeenCalledOnce();
		expect(primary).not.toHaveBeenCalled();
	});

	it('keeps two slow clicks on the same target as two primary gestures', () => {
		const harness = schedulerHarness();
		const gesture = new ClickBurstGesture(harness.scheduler, 300);
		const primary = vi.fn();
		const secondary = vi.fn();

		// Deliberately do not fire the first timer before the second click. The
		// event timestamps, not a late event loop callback, define the burst.
		gesture.click('same', 100, primary, secondary);
		gesture.click('same', 401, primary, secondary);
		expect(primary).toHaveBeenCalledOnce();
		harness.fireAll();

		expect(primary).toHaveBeenCalledTimes(2);
		expect(secondary).not.toHaveBeenCalled();
	});

	it('keeps fast clicks on different targets as two primary gestures', () => {
		const harness = schedulerHarness();
		const gesture = new ClickBurstGesture(harness.scheduler, 300);
		const primary = vi.fn();
		const secondary = vi.fn();

		gesture.click('first', 100, primary, secondary);
		gesture.click('second', 200, primary, secondary);
		expect(primary).toHaveBeenCalledOnce();
		harness.fireAll();

		expect(primary).toHaveBeenCalledTimes(2);
		expect(secondary).not.toHaveBeenCalled();
	});

	it('cancels a pending primary on teardown without a late callback', () => {
		const harness = schedulerHarness();
		const gesture = new ClickBurstGesture(harness.scheduler, 300);
		const primary = vi.fn();

		gesture.click('same', 100, primary, vi.fn());
		expect(harness.pendingCount()).toBe(1);
		gesture.cancel();
		harness.fireAll();

		expect(primary).not.toHaveBeenCalled();
		expect(harness.pendingCount()).toBe(0);
	});

	it('routes a click immediately when no secondary gesture exists', () => {
		const harness = schedulerHarness();
		const gesture = new ClickBurstGesture(harness.scheduler, 300);
		const primary = vi.fn();

		gesture.click('leaf', 100, primary);

		expect(primary).toHaveBeenCalledOnce();
		expect(harness.pendingCount()).toBe(0);
	});
});
