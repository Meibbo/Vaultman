import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_PRESETS,
	PRESET_NATIVE,
	PRESET_VAULTMAN,
} from '../../../src/config/themePresetsBuiltin';

describe('PRESET_NATIVE invariants', () => {
	it('source is built-in, id is "native"', () => {
		expect(PRESET_NATIVE.source).toBe('built-in');
		expect(PRESET_NATIVE.id).toBe('native');
	});

	it('chameleon disguise flags', () => {
		expect(PRESET_NATIVE.useNativeDom).toBe(true);
		expect(PRESET_NATIVE.lockNodeElementVisibility).toBe(true);
		expect(PRESET_NATIVE.viewModes).toEqual(['tree']);
		expect(PRESET_NATIVE.dock.visible).toBe(false);
		expect(PRESET_NATIVE.tabs.visible).toBe(false);
		expect(PRESET_NATIVE.toolbar.buttons).toBe('core');
	});

	it('nodeElements match core file explorer feature set', () => {
		expect(PRESET_NATIVE.nodeElements.media).toBe(false);
		expect(PRESET_NATIVE.nodeElements.detail).toBe(false);
		expect(PRESET_NATIVE.nodeElements.actions).toBe(false);
		expect(PRESET_NATIVE.nodeElements.badges.warnings).toBe(true);
		expect(PRESET_NATIVE.nodeElements.badges.ops).toBe(false);
	});
});

describe('PRESET_VAULTMAN invariants', () => {
	it('source is built-in, id is "vaultman"', () => {
		expect(PRESET_VAULTMAN.source).toBe('built-in');
		expect(PRESET_VAULTMAN.id).toBe('vaultman');
	});

	it('full plugin flags', () => {
		expect(PRESET_VAULTMAN.useNativeDom).toBe(false);
		expect(PRESET_VAULTMAN.lockNodeElementVisibility).toBe(false);
		expect(PRESET_VAULTMAN.viewModes).toEqual(['tree', 'table', 'grid', 'cards', 'list']);
		expect(PRESET_VAULTMAN.viewModes).not.toContain('markmap');
		expect(PRESET_VAULTMAN.dock.visible).toBe(true);
		expect(PRESET_VAULTMAN.tabs.visible).toBe(true);
		expect(PRESET_VAULTMAN.toolbar.buttons).toBe('full');
	});

	it('media slot defaults off even in full vm', () => {
		expect(PRESET_VAULTMAN.nodeElements.media).toBe(false);
	});
});

describe('BUILT_IN_PRESETS array', () => {
	it('contains exactly native + vaultman in canonical order', () => {
		expect(BUILT_IN_PRESETS).toHaveLength(2);
		expect(BUILT_IN_PRESETS.map((preset) => preset.id)).toEqual(['native', 'vaultman']);
	});
});

describe('cross-preset invariants', () => {
	const lengthRe = /^\d+(\.\d+)?(px|em|rem|%)$|^0$/;

	it('all chrome.popupBgOpacity values are in [0..1]', () => {
		for (const preset of BUILT_IN_PRESETS) {
			expect(preset.chrome.popupBgOpacity).toBeGreaterThanOrEqual(0);
			expect(preset.chrome.popupBgOpacity).toBeLessThanOrEqual(1);
		}
	});

	it('all density values are valid CSS lengths', () => {
		for (const preset of BUILT_IN_PRESETS) {
			expect(preset.density.rowHeight).toMatch(lengthRe);
			expect(preset.density.rowPaddingY).toMatch(lengthRe);
			expect(preset.density.iconSize).toMatch(lengthRe);
		}
	});

	it('all chrome.popupBackdropBlur values are valid CSS lengths', () => {
		for (const preset of BUILT_IN_PRESETS) {
			expect(preset.chrome.popupBackdropBlur).toMatch(lengthRe);
		}
	});

	it('native rowHeight numerically less than vaultman rowHeight', () => {
		const nativeRowHeight = Number.parseInt(PRESET_NATIVE.density.rowHeight, 10);
		const vaultmanRowHeight = Number.parseInt(PRESET_VAULTMAN.density.rowHeight, 10);
		expect(nativeRowHeight).toBeLessThan(vaultmanRowHeight);
	});
});
