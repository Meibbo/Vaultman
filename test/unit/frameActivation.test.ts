import { describe, expect, it } from 'vitest';
import {
	normalizeFramePlacement,
	normalizeOpenMode,
	shouldToggleCloseFrame,
} from '../../src/logic/logicFrameActivation';

describe('normalizeFramePlacement legacy migration and routing', () => {
	it('migrates legacy sidebar setting to left_sidebar', () => {
		expect(normalizeFramePlacement('sidebar')).toBe('left_sidebar');
	});

	it('preserves left_sidebar, right_sidebar, tab, popout_window', () => {
		expect(normalizeFramePlacement('left_sidebar')).toBe('left_sidebar');
		expect(normalizeFramePlacement('right_sidebar')).toBe('right_sidebar');
		expect(normalizeFramePlacement('tab')).toBe('tab');
		expect(normalizeFramePlacement('popout_window')).toBe('popout_window');
	});

	it('falls back to left_sidebar on invalid values', () => {
		expect(normalizeFramePlacement('invalid')).toBe('left_sidebar');
	});

	it('migrates legacy sidebar to left_sidebar in normalizeOpenMode', () => {
		expect(normalizeOpenMode('sidebar')).toBe('left_sidebar');
	});

	it('preserves normalizeOpenMode and toggle contracts', () => {
		expect(normalizeOpenMode('left_sidebar')).toBe('left_sidebar');
		expect(normalizeOpenMode('right_sidebar')).toBe('right_sidebar');
		expect(normalizeOpenMode('main')).toBe('main');
		expect(normalizeOpenMode('new_instance')).toBe('new_instance');
		expect(normalizeOpenMode('both')).toBe('new_instance');
		expect(shouldToggleCloseFrame('left_sidebar', 1)).toBe(true);
		expect(shouldToggleCloseFrame('right_sidebar', 1)).toBe(true);
		expect(shouldToggleCloseFrame('new_instance', 1)).toBe(false);
	});
});
