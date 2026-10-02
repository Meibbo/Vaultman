import { describe, expect, it } from 'vitest';
import { selectCommandFrame } from '../../src/logic/logicFrameActivation';

describe('panel_scope:last_focused', () => {
	const first = { id: 'first' };
	const last = { id: 'last' };
	it('targets the last focused mounted frame instead of the first frame', () => {
		expect(selectCommandFrame([first, last], last)).toBe(last);
	});
	it('does not revive a closed frame', () => {
		expect(selectCommandFrame([first], last)).toBe(first);
	});
	it('reports no frame when all frames are closed', () => {
		expect(selectCommandFrame([], last)).toBeNull();
	});
});
