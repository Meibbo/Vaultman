import { describe, expect, it } from 'vitest';

import {
	niagaraActionOrder,
	niagaraClampOverdrive,
	niagaraClampShiftToRoom,
	niagaraClampToFrame,
	niagaraGaussian,
	niagaraNodeTransform,
	niagaraSigma,
	niagaraTrackShift,
	niagaraTrackTarget,
	shouldSuppressNiagaraClick,
} from '../../src/logic/logicNiagaraTrack';

describe('Niagara track math', () => {
	it('clamps the proto sigma curve between 3 and 7', () => {
		expect(niagaraSigma(0)).toBe(3);
		expect(niagaraSigma(20)).toBeCloseTo(5.6);
		expect(niagaraSigma(25)).toBe(7);
		expect(niagaraSigma(100)).toBe(7);
	});

	it('uses the proto Gaussian bell', () => {
		expect(niagaraGaussian(0, 3)).toBe(1);
		expect(niagaraGaussian(3, 3)).toBeCloseTo(Math.exp(-0.5));
		expect(niagaraGaussian(-3, 3)).toBeCloseTo(Math.exp(-0.5));
	});

	it('derives scale, perpendicular pull, and signed neighbour spread', () => {
		const center = niagaraNodeTransform(0, 25, -1, 38);
		expect(center).toEqual({
			scale: 1.5,
			perpendicular: -38,
			spread: 0,
		});

		const distance = 1;
		const gaussian = niagaraGaussian(distance, niagaraSigma(25));
		const neighbour = niagaraNodeTransform(distance, 25, 1, 38);
		expect(neighbour.scale).toBeCloseTo(1 + 0.5 * gaussian);
		expect(neighbour.perpendicular).toBeCloseTo(38 * gaussian);
		expect(neighbour.spread).toBeCloseTo(
			7 * Math.tanh(distance / 1.5) * gaussian,
		);

		const atSigma = niagaraNodeTransform(7, 25, 1, 38);
		expect(atSigma.scale).toBeCloseTo(1 + 0.5 * Math.exp(-0.5));
		const far = niagaraNodeTransform(40, 25, 1, 38);
		expect(far.scale).toBeCloseTo(1, 6);
		expect(far.perpendicular).toBeCloseTo(0, 5);
		expect(far.spread).toBeCloseTo(0, 5);
	});

	it('keeps close first across every conditional action combination', () => {
		const cases = [
			[false, false, false, ['close']],
			[true, false, false, ['close', 'toggle-kind']],
			[false, true, false, ['close', 'drill']],
			[false, false, true, ['close', 'back']],
			[true, true, false, ['close', 'toggle-kind', 'drill']],
			[true, false, true, ['close', 'toggle-kind', 'back']],
			[false, true, true, ['close', 'drill', 'back']],
			[true, true, true, ['close', 'toggle-kind', 'drill', 'back']],
		] as const;

		for (const [kindToggle, drill, scoped, expected] of cases) {
			expect(niagaraActionOrder({ kindToggle, drill, scoped })).toEqual(
				expected,
			);
		}
	});

	it('returns signed overflow before or after the track and zero inside it', () => {
		expect(niagaraTrackShift(90, 100, 200)).toBe(-10);
		expect(niagaraTrackShift(150, 100, 200)).toBe(0);
		expect(niagaraTrackShift(210, 100, 200)).toBe(10);
	});

	it('clamps pointer input to either frame edge before shifting', () => {
		expect(niagaraClampToFrame(0, 8, 992)).toBe(8);
		expect(niagaraClampToFrame(500, 8, 992)).toBe(500);
		expect(niagaraClampToFrame(1000, 8, 992)).toBe(992);
		expect(niagaraClampToFrame(0, 992, 8)).toBe(8);
	});

	it('holds a downward rail shift while the pointer scrubs back through the track', () => {
		const shiftedDown = niagaraTrackShift(235, 100, 200, 0);
		expect(shiftedDown).toBe(35);
		expect(niagaraTrackShift(220, 100, 200, shiftedDown)).toBe(35);
		expect(niagaraTrackShift(150, 100, 200, shiftedDown)).toBe(35);
		expect(niagaraTrackShift(135, 100, 200, shiftedDown)).toBe(35);
	});

	it('resumes upward rail-follow only after crossing the opposite shifted edge', () => {
		const shiftedDown = niagaraTrackShift(235, 100, 200, 0);
		expect(niagaraTrackShift(125, 100, 200, shiftedDown)).toBe(25);
		expect(niagaraTrackShift(75, 100, 200, 0)).toBe(-25);
	});

	it('supports repeated direction reversals in one held gesture', () => {
		let currentShift = niagaraTrackShift(235, 100, 200, 0);
		expect(currentShift).toBe(35);

		currentShift = niagaraTrackShift(125, 100, 200, currentShift);
		expect(currentShift).toBe(25);
		currentShift = niagaraTrackShift(75, 100, 200, currentShift);
		expect(currentShift).toBe(-25);

		currentShift = niagaraTrackShift(90, 100, 200, currentShift);
		expect(currentShift).toBe(-25);
		currentShift = niagaraTrackShift(185, 100, 200, currentShift);
		expect(currentShift).toBe(-15);
		currentShift = niagaraTrackShift(220, 100, 200, currentShift);
		expect(currentShift).toBe(20);
	});

	it('maps joined actions separately from navigable groups', () => {
		expect(niagaraTrackTarget(0, 4, 10)).toEqual({
			kind: 'action',
			actionIndex: 0,
		});
		expect(niagaraTrackTarget(3, 4, 10)).toEqual({
			kind: 'action',
			actionIndex: 3,
		});
		expect(niagaraTrackTarget(4, 4, 10)).toEqual({
			kind: 'group',
			groupIndex: 0,
		});
		expect(niagaraTrackTarget(13, 4, 10)).toEqual({
			kind: 'group',
			groupIndex: 9,
		});
		expect(niagaraTrackTarget(14, 4, 10)).toBeNull();
		expect(niagaraTrackTarget(-1, 4, 10)).toBeNull();
		expect(niagaraTrackTarget(0, 0, 10)).toEqual({
			kind: 'group',
			groupIndex: 0,
		});
	});

	it('allows only quick action taps to survive scrub click suppression', () => {
		expect(shouldSuppressNiagaraClick(false, false, 'action')).toBe(false);
		expect(shouldSuppressNiagaraClick(false, false, 'group')).toBe(true);
		expect(shouldSuppressNiagaraClick(true, false, 'action')).toBe(true);
		expect(shouldSuppressNiagaraClick(false, true, 'action')).toBe(true);
		expect(shouldSuppressNiagaraClick(false, false, null)).toBe(false);
	});
});

describe('frame containment clamps (BT4-017)', () => {
	it('bounds overdrive to non-negative room', () => {
		expect(niagaraClampOverdrive(30, 50)).toBe(30);
		expect(niagaraClampOverdrive(80, 50)).toBe(50);
		expect(niagaraClampOverdrive(80, -10)).toBe(0);
		expect(niagaraClampOverdrive(-5, 50)).toBe(0);
		expect(niagaraClampOverdrive(Number.NaN, 50)).toBe(0);
	});

	it('clamps the along shift into the remaining room', () => {
		expect(niagaraClampShiftToRoom(120, -40, 60)).toBe(60);
		expect(niagaraClampShiftToRoom(-120, -40, 60)).toBe(-40);
		expect(niagaraClampShiftToRoom(10, -40, 60)).toBe(10);
		expect(niagaraClampShiftToRoom(10, 60, -40)).toBe(10);
		expect(niagaraClampShiftToRoom(Number.NaN, -40, 60)).toBe(0);
	});
});
