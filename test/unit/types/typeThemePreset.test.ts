import { describe, expect, it } from 'vitest';
import { isBuiltInPreset, type ThemePreset } from '../../../src/types/typeThemePreset';

const SAMPLE_BUILT_IN: ThemePreset = {
	source: 'built-in',
	id: 'sample',
	displayName: 'Sample',
	useNativeDom: false,
	chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
	density: { rowHeight: '30px', rowPaddingY: '4px', iconSize: '16px' },
	dock: { visible: true, presentation: 'bar' },
	tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
	toolbar: { buttons: 'full' },
	viewModes: ['tree'],
	nodeElements: {
		icon: true,
		label: true,
		detail: true,
		media: false,
		badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
		actions: false,
	},
	lockNodeElementVisibility: false,
};

describe('isBuiltInPreset', () => {
	it('returns true for source: built-in', () => {
		expect(isBuiltInPreset(SAMPLE_BUILT_IN)).toBe(true);
	});

	it('returns false for source: custom', () => {
		const custom: ThemePreset = { ...SAMPLE_BUILT_IN, source: 'custom' };
		expect(isBuiltInPreset(custom)).toBe(false);
	});
});
