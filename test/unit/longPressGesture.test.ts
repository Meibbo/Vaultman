import { describe, expect, it, vi } from 'vitest';

import {
	LongPressGesture,
	type LongPressScheduler,
} from '../../src/utils/longPressGesture';

function schedulerHarness() {
	let currentTime = 0;
	let nextId = 1;
	const callbacks = new Map<number, () => void>();
	const scheduler: LongPressScheduler = {
		setTimeout: (callback) => {
			const id = nextId++;
			callbacks.set(id, callback);
			return id;
		},
		clearTimeout: (id) => callbacks.delete(id),
		now: () => currentTime,
	};
	return {
		scheduler,
		fire: () => {
			for (const [id, callback] of [...callbacks]) {
				callbacks.delete(id);
				callback();
			}
		},
		setNow: (value: number) => {
			currentTime = value;
		},
	};
}

const primaryPointer = {
	pointerId: 1,
	button: 0,
	isPrimary: true,
	clientX: 10,
	clientY: 20,
};

describe('LongPressGesture', () => {
	it('fires after the threshold and suppresses the generated click briefly', () => {
		const harness = schedulerHarness();
		const gesture = new LongPressGesture(harness.scheduler);
		const onLongPress = vi.fn();

		expect(gesture.start(primaryPointer, onLongPress)).toBe(true);
		expect(gesture.isTrackingPointer()).toBe(true);
		harness.fire();

		expect(onLongPress).toHaveBeenCalledOnce();
		expect(gesture.isActivationSuppressed()).toBe(true);
		gesture.end(primaryPointer.pointerId);
		expect(gesture.isTrackingPointer()).toBe(false);
		harness.setNow(1_000);
		expect(gesture.isActivationSuppressed()).toBe(false);
	});

	it('cancels when pointer travel exceeds the movement tolerance', () => {
		const harness = schedulerHarness();
		const gesture = new LongPressGesture(harness.scheduler);
		const onLongPress = vi.fn();

		gesture.start(primaryPointer, onLongPress);
		gesture.move({ ...primaryPointer, clientX: 30 });
		harness.fire();

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it('ignores non-primary and non-left pointer starts', () => {
		const harness = schedulerHarness();
		const gesture = new LongPressGesture(harness.scheduler);
		const onLongPress = vi.fn();

		expect(
			gesture.start({ ...primaryPointer, isPrimary: false }, onLongPress),
		).toBe(false);
		expect(gesture.start({ ...primaryPointer, button: 2 }, onLongPress)).toBe(
			false,
		);
		harness.fire();
		expect(onLongPress).not.toHaveBeenCalled();
	});
});
