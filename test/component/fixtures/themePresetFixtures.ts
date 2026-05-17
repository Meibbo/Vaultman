import type { ThemePreset } from '../../../src/types/typeThemePreset';

export function makeCustomPreset(
	id: string,
	overrides: Partial<ThemePreset> = {},
): ThemePreset {
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
