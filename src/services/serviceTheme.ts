export type LayoutTheme = 'default' | 'polish' | 'glass' | 'custom';

export interface ThemeSettingsLike {
	layoutTheme?: unknown;
	islandBackdropBlur?: boolean;
	faintAccentsWhenWorkspaceFocused?: boolean;
	explorerNodeBackgrounds?: boolean;
	explorerNodeBorders?: boolean;
}

export const LAYOUT_THEME_OPTIONS: readonly {
	value: LayoutTheme;
	labelKey: string;
	disabled?: boolean;
}[] = [
	{ value: 'default', labelKey: 'settings.layout_theme.default' },
	{ value: 'polish', labelKey: 'settings.layout_theme.polish' },
	{ value: 'glass', labelKey: 'settings.layout_theme.glass' },
	{ value: 'custom', labelKey: 'settings.layout_theme.custom', disabled: true },
];

const THEME_CLASSES: readonly string[] = [
	'vm-theme-default',
	'vm-theme-native',
	'vm-theme-polish',
	'vm-theme-glass',
	'vm-theme-custom',
];

export function normalizeLayoutTheme(value: unknown): LayoutTheme {
	if (value === 'native' || value === 'default') return 'default';
	if (value === 'polish' || value === 'glass' || value === 'custom') return value;
	return 'default';
}

export function applyVaultmanTheme(body: HTMLElement, settings: ThemeSettingsLike): void {
	const theme = normalizeLayoutTheme(settings.layoutTheme);
	for (const className of THEME_CLASSES) {
		body.classList.toggle(className, className === `vm-theme-${theme}`);
	}
	body.classList.toggle('vm-island-backdrop-enabled', settings.islandBackdropBlur === true);
	body.classList.toggle(
		'vm-faint-accents-workspace-focus',
		settings.faintAccentsWhenWorkspaceFocused === true,
	);
	body.classList.toggle('vm-node-backgrounds-off', settings.explorerNodeBackgrounds === false);
	body.classList.toggle('vm-node-borders-off', settings.explorerNodeBorders === false);
}
