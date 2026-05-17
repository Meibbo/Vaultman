import type { ThemePreset } from '../types/typeThemePreset';

/**
 * Native preset: chameleon disguise for Obsidian-core-like Explorer surfaces.
 *
 * Not the fresh-install default. Users opt in when they want native DOM
 * classes, compact density, and locked node-element visibility.
 */
export const PRESET_NATIVE: ThemePreset = {
	source: 'built-in',
	id: 'native',
	displayName: 'Native',

	useNativeDom: true,

	chrome: {
		popupBgOpacity: 1,
		popupBackdropBlur: '0px',
		popupBgTint: 0,
	},

	density: {
		rowHeight: '26px',
		rowPaddingY: '2px',
		iconSize: '14px',
	},

	dock: {
		visible: false,
		presentation: 'hidden',
	},

	tabs: {
		visible: false,
		presentation: 'hidden',
		kind: 'workspace',
	},

	toolbar: {
		buttons: 'core',
	},

	viewModes: ['tree'],

	nodeElements: {
		icon: true,
		label: true,
		detail: false,
		media: false,
		badges: {
			ops: false,
			filters: false,
			warnings: true,
			inherited: false,
			counts: false,
		},
		actions: false,
	},

	lockNodeElementVisibility: true,
} as const;

/**
 * Vaultman preset: full plugin layout and the fresh-install default.
 */
export const PRESET_VAULTMAN: ThemePreset = {
	source: 'built-in',
	id: 'vaultman',
	displayName: 'Vaultman',

	useNativeDom: false,

	chrome: {
		popupBgOpacity: 0.92,
		popupBackdropBlur: '4px',
		popupBgTint: 0,
	},

	density: {
		rowHeight: '32px',
		rowPaddingY: '4px',
		iconSize: '16px',
	},

	dock: {
		visible: true,
		presentation: 'bar',
	},

	tabs: {
		visible: true,
		presentation: 'top-tabs',
		kind: 'embedded',
	},

	toolbar: {
		buttons: 'full',
	},

	viewModes: ['tree', 'table', 'grid', 'cards', 'list'],

	nodeElements: {
		icon: true,
		label: true,
		detail: true,
		media: false,
		badges: {
			ops: true,
			filters: true,
			warnings: true,
			inherited: true,
			counts: true,
		},
		actions: true,
	},

	lockNodeElementVisibility: false,
} as const;

export const BUILT_IN_PRESETS = [PRESET_NATIVE, PRESET_VAULTMAN] as const;
