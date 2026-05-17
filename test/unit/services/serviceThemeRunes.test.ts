import { describe, expect, it } from 'vitest';
import { PRESET_NATIVE, PRESET_VAULTMAN } from '../../../src/config/themePresetsBuiltin';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

describe('ThemeService (runes-backed elastic theme)', () => {
	it('defaults to thin mode + native identity, faint off', () => {
		const svc = new ThemeService();
		expect(svc.mode).toBe('thin');
		expect(svc.identity).toBe('native');
		expect(svc.faintActive).toBe(false);
		expect(svc.reducedMotion).toBe(false);
	});

	it('reports the canonical root class set', () => {
		const svc = new ThemeService();
		svc.mode = 'balanced';
		svc.identity = 'outline';
		svc.windowFocused = false;
		svc.faintModeEnabled = true;
		svc.reducedMotion = true;
		const classes = svc.rootClasses;
		expect(classes).toContain('vm-root');
		expect(classes).toContain('vm-mode-balanced');
		expect(classes).toContain('vm-id-outline');
		expect(classes).toContain('vm-faint');
		expect(classes).toContain('vm-reduced-motion');
	});

	it('faintActive flips only when windowFocused is false AND faintModeEnabled is true', () => {
		const svc = new ThemeService();
		svc.faintModeEnabled = true;
		svc.windowFocused = true;
		expect(svc.faintActive).toBe(false);
		svc.windowFocused = false;
		expect(svc.faintActive).toBe(true);
		svc.faintModeEnabled = false;
		expect(svc.faintActive).toBe(false);
	});

	it('useUtilities is true when mode is balanced or thick', () => {
		const svc = new ThemeService();
		svc.mode = 'thin';
		expect(svc.useUtilities).toBe(false);
		svc.mode = 'balanced';
		expect(svc.useUtilities).toBe(true);
		svc.mode = 'thick';
		expect(svc.useUtilities).toBe(true);
	});

	it('useNativeDom ignores mode and identity once presets own the DOM contract', () => {
		const svc = new ThemeService();
		svc.mode = 'thin';
		svc.identity = 'bases';
		expect(svc.useNativeDom).toBe(false);
		svc.mode = 'thick';
		svc.identity = 'native';
		expect(svc.useNativeDom).toBe(false);
		svc.activePresetId = 'native';
		expect(svc.useNativeDom).toBe(true);
	});

	it('hydrate copies all 5 settings fields', () => {
		const svc = new ThemeService();
		svc.hydrate({
			mode: 'thick',
			identity: 'bases',
			faintModeEnabled: true,
			reducedMotion: true,
			foulDetection: true,
		});
		expect(svc.mode).toBe('thick');
		expect(svc.identity).toBe('bases');
		expect(svc.faintModeEnabled).toBe(true);
		expect(svc.reducedMotion).toBe(true);
		expect(svc.foulDetection).toBe(true);
	});
});

describe('ThemeService preset registry - state + activePreset', () => {
	it('defaults activePresetId to "vaultman"', () => {
		const svc = new ThemeService();
		expect(svc.activePresetId).toBe('vaultman');
	});

	it('activePreset returns PRESET_VAULTMAN by default', () => {
		const svc = new ThemeService();
		expect(svc.activePreset).toBe(PRESET_VAULTMAN);
	});

	it('activePreset returns PRESET_NATIVE when activePresetId is "native"', () => {
		const svc = new ThemeService();
		svc.activePresetId = 'native';
		expect(svc.activePreset).toBe(PRESET_NATIVE);
	});

	it('activePreset falls back to PRESET_VAULTMAN for unknown id', () => {
		const svc = new ThemeService();
		svc.activePresetId = 'nonexistent';
		expect(svc.activePreset).toBe(PRESET_VAULTMAN);
	});

	it('availablePresets starts with just the two built-ins', () => {
		const svc = new ThemeService();
		expect(svc.availablePresets.map((preset) => preset.id)).toEqual(['native', 'vaultman']);
	});

	it('customPresets defaults to empty', () => {
		const svc = new ThemeService();
		expect(svc.customPresets).toEqual([]);
	});
});

describe('ThemeService useNativeDom + rootClasses derive from preset', () => {
	it('useNativeDom is false for vaultman preset (default)', () => {
		const svc = new ThemeService();
		expect(svc.useNativeDom).toBe(false);
	});

	it('useNativeDom is true for native preset', () => {
		const svc = new ThemeService();
		svc.activePresetId = 'native';
		expect(svc.useNativeDom).toBe(true);
	});

	it('rootClasses contains exactly one vm-theme-{id}', () => {
		const svc = new ThemeService();
		expect(svc.rootClasses).toContain('vm-theme-vaultman');
		expect(svc.rootClasses).not.toContain('vm-theme-native');
		svc.activePresetId = 'native';
		expect(svc.rootClasses).toContain('vm-theme-native');
		expect(svc.rootClasses).not.toContain('vm-theme-vaultman');
	});

	it('rootClasses encodes special characters in custom preset id', () => {
		const svc = new ThemeService();
		const custom: ThemePreset = {
			source: 'custom',
			id: 'Native + dock',
			displayName: 'Native + dock',
			useNativeDom: true,
			chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
			density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '14px' },
			dock: { visible: true, presentation: 'drawer' },
			tabs: { visible: false, presentation: 'hidden', kind: 'workspace' },
			toolbar: { buttons: 'core' },
			viewModes: ['tree'],
			nodeElements: {
				icon: true,
				label: true,
				detail: false,
				media: false,
				badges: { ops: false, filters: false, warnings: true, inherited: false, counts: false },
				actions: false,
			},
			lockNodeElementVisibility: false,
		};
		svc.customPresets = [custom];
		svc.activePresetId = 'Native + dock';
		expect(svc.rootClasses).toContain('vm-theme-Native---dock');
		expect(svc.rootClasses).not.toContain('vm-theme-Native + dock');
	});
});

function makeCustom(id: string, overrides: Partial<ThemePreset> = {}): ThemePreset {
	return {
		source: 'custom',
		id,
		displayName: id,
		useNativeDom: false,
		chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
		density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
		dock: { visible: true, presentation: 'bar' },
		tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
		toolbar: { buttons: 'full' },
		viewModes: ['tree', 'list'],
		nodeElements: {
			icon: true,
			label: true,
			detail: true,
			media: false,
			badges: { ops: true, filters: false, warnings: true, inherited: false, counts: false },
			actions: true,
		},
		lockNodeElementVisibility: false,
		...overrides,
	};
}

describe('ThemeService writes', () => {
	it('setPreset(unknownId) falls back to "native"', () => {
		const svc = new ThemeService();
		svc.setPreset('nonexistent-id');
		expect(svc.activePresetId).toBe('native');
	});

	it('setPreset("native") and setPreset("vaultman") accept built-in ids', () => {
		const svc = new ThemeService();
		svc.setPreset('native');
		expect(svc.activePresetId).toBe('native');
		svc.setPreset('vaultman');
		expect(svc.activePresetId).toBe('vaultman');
	});

	it('setPreset accepts a registered custom id', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('mine'));
		svc.setPreset('mine');
		expect(svc.activePresetId).toBe('mine');
	});

	it('registerCustomPreset rejects source="built-in"', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset({ ...PRESET_NATIVE });
		expect(svc.customPresets).toHaveLength(0);
	});

	it('registerCustomPreset rejects built-in id collisions', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('native'));
		svc.registerCustomPreset(makeCustom('vaultman'));
		expect(svc.customPresets).toHaveLength(0);
	});

	it('registerCustomPreset replaces existing on id collision', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('mine', { displayName: 'First' }));
		svc.registerCustomPreset(makeCustom('mine', { displayName: 'Second' }));
		expect(svc.customPresets).toHaveLength(1);
		expect(svc.customPresets[0].displayName).toBe('Second');
	});

	it('unregisterCustomPreset removes by id', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('mine'));
		svc.unregisterCustomPreset('mine');
		expect(svc.customPresets).toHaveLength(0);
	});

	it('unregisterCustomPreset falls back to native when removing active', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('mine'));
		svc.setPreset('mine');
		svc.unregisterCustomPreset('mine');
		expect(svc.activePresetId).toBe('native');
	});

	it('updateCustomPreset patches displayName preserving id and source', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustom('mine', { displayName: 'Old' }));
		svc.updateCustomPreset('mine', { displayName: 'New' });
		expect(svc.customPresets[0].displayName).toBe('New');
		expect(svc.customPresets[0].id).toBe('mine');
		expect(svc.customPresets[0].source).toBe('custom');
	});
});
