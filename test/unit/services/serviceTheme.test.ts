import { describe, expect, it } from 'vitest';
import {
	LAYOUT_THEME_OPTIONS,
	applyVaultmanTheme,
	normalizeLayoutTheme,
} from '../../../src/services/serviceTheme';

function makeBody(): HTMLElement {
	const classes = new Set<string>();

	return {
		classList: {
			add: (...items: string[]) => {
				for (const item of items) {
					classes.add(item);
				}
			},
			contains: (item: string) => classes.has(item),
			toggle: (item: string, force?: boolean) => {
				const shouldAdd = force ?? !classes.has(item);
				if (shouldAdd) {
					classes.add(item);
				} else {
					classes.delete(item);
				}
				return shouldAdd;
			},
		},
	} as unknown as HTMLElement;
}

describe('serviceTheme', () => {
	it('normalizes legacy and unknown layout themes', () => {
		expect(normalizeLayoutTheme('native')).toBe('default');
		expect(normalizeLayoutTheme('default')).toBe('default');
		expect(normalizeLayoutTheme('polish')).toBe('polish');
		expect(normalizeLayoutTheme('glass')).toBe('glass');
		expect(normalizeLayoutTheme('custom')).toBe('custom');
		expect(normalizeLayoutTheme('bogus')).toBe('default');
		expect(normalizeLayoutTheme(undefined)).toBe('default');
	});

	it('exposes selectable layout theme options with custom disabled', () => {
		expect(LAYOUT_THEME_OPTIONS.map((option) => option.value)).toEqual([
			'default',
			'polish',
			'glass',
			'custom',
		]);
		expect(LAYOUT_THEME_OPTIONS.find((option) => option.value === 'custom')?.disabled).toBe(true);
	});

	it('applies only current theme and surface body classes', () => {
		const body = makeBody();
		body.classList.add(
			'outside-class',
			'vm-theme-polish',
			'vm-theme-glass',
			'vm-node-backgrounds-off',
		);

		applyVaultmanTheme(body, {
			layoutTheme: 'native',
			islandBackdropBlur: false,
			faintAccentsWhenWorkspaceFocused: false,
			explorerNodeBackgrounds: true,
			explorerNodeBorders: true,
		});

		expect(body.classList.contains('outside-class')).toBe(true);
		expect(body.classList.contains('vm-theme-default')).toBe(true);
		expect(body.classList.contains('vm-theme-native')).toBe(false);
		expect(body.classList.contains('vm-theme-polish')).toBe(false);
		expect(body.classList.contains('vm-theme-glass')).toBe(false);
		expect(body.classList.contains('vm-theme-custom')).toBe(false);
		expect(body.classList.contains('vm-island-backdrop-enabled')).toBe(false);
		expect(body.classList.contains('vm-faint-accents-workspace-focus')).toBe(false);
		expect(body.classList.contains('vm-node-backgrounds-off')).toBe(false);
		expect(body.classList.contains('vm-node-borders-off')).toBe(false);
	});

	it('toggles glass, backdrop, faint accents, backgrounds, and borders', () => {
		const body = makeBody();

		applyVaultmanTheme(body, {
			layoutTheme: 'glass',
			islandBackdropBlur: true,
			faintAccentsWhenWorkspaceFocused: true,
			explorerNodeBackgrounds: false,
			explorerNodeBorders: false,
		});

		expect(body.classList.contains('vm-theme-glass')).toBe(true);
		expect(body.classList.contains('vm-theme-default')).toBe(false);
		expect(body.classList.contains('vm-island-backdrop-enabled')).toBe(true);
		expect(body.classList.contains('vm-faint-accents-workspace-focus')).toBe(true);
		expect(body.classList.contains('vm-node-backgrounds-off')).toBe(true);
		expect(body.classList.contains('vm-node-borders-off')).toBe(true);
	});
});
