import { describe, expect, it } from 'vitest';
import { NodeSwipeRecognizer } from '../../src/logic/logicNodeSwipe';

describe('NodeSwipeRecognizer touch gesture contracts', () => {
	it('recognizes left-to-right horizontal swipe', () => {
		const recognizer = new NodeSwipeRecognizer({ minHorizontalDistance: 30, maxVerticalDrift: 20 });
		recognizer.start(10, 10, null);

		expect(recognizer.move(25, 12)).toBe('pending');
		expect(recognizer.move(45, 14)).toBe('recognized');
	});

	it('cancels gesture when vertical drift exceeds threshold', () => {
		const recognizer = new NodeSwipeRecognizer({ minHorizontalDistance: 30, maxVerticalDrift: 20 });
		recognizer.start(10, 10, null);

		expect(recognizer.move(20, 35)).toBe('cancelled');
	});

	it('cancels gesture on excluded targets such as buttons, inputs, links, or pill remove buttons', () => {
		const recognizer = new NodeSwipeRecognizer();
		const btn = { closest: () => true } as unknown as Element;

		recognizer.start(10, 10, btn);
		expect(recognizer.getState()).toBe('cancelled');
	});
});
