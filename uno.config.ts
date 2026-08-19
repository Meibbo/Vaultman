import { defineConfig, presetAttributify, presetIcons, presetWind3 } from 'unocss';
import presetTheme from 'unocss-preset-theme';
import { allShortcuts } from './src/styles/shortcuts/index';

const VM_THEME_NATIVE = {
	'popup-bg-opacity': '1',
	'popup-backdrop-blur': '0px',
	'popup-bg-tint': '0',
	'row-height': '26px',
	'row-padding-y': '2px',
	'icon-size': '14px',
};

const VM_THEME_VAULTMAN = {
	'popup-bg-opacity': '0.92',
	'popup-backdrop-blur': '4px',
	'popup-bg-tint': '0',
	'row-height': '32px',
	'row-padding-y': '4px',
	'icon-size': '16px',
};

function toVmThemeVars(theme: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(theme).map(([key, value]) => [`--vm-${key}`, value]),
	);
}

export default defineConfig({
	presets: [
		presetWind3({ preflight: false }),
		presetAttributify(),
		presetIcons({ scale: 1.0, warn: false }),
		presetTheme({
			prefix: '--vm',
			theme: {
				native: VM_THEME_NATIVE,
				vaultman: VM_THEME_VAULTMAN,
			},
			selectors: {
				native: '.vm-theme-native',
				vaultman: '.vm-theme-vaultman',
			},
		}),
	],
	safelist: [
		'vm-root',
		'vm-mode-thin',
		'vm-mode-balanced',
		'vm-mode-thick',
		'vm-id-native',
		'vm-id-bases',
		'vm-id-outline',
		'vm-id-bookmarks',
		'vm-faint',
		'vm-reduced-motion',
		'vm-foul-detect',
		'obsidian-mimic-file',
		'obsidian-mimic-folder',
		'obsidian-mimic-tree-item',
		'obsidian-mimic-property',
		'vm-theme-native',
		'vm-theme-vaultman',
	],
	shortcuts: allShortcuts,
	rules: [
		['vm-theme-native', toVmThemeVars(VM_THEME_NATIVE)],
		['vm-theme-vaultman', toVmThemeVars(VM_THEME_VAULTMAN)],
	],
});
