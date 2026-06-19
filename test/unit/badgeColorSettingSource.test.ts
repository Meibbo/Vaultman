// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('badge color setting source guards', () => {
	it('defaults operation badges to monotone colors', () => {
		expect(DEFAULT_SETTINGS.coloredBadges).toBe(false);
	});

	it('exposes a global colored badge setting in Settings', () => {
		expect(settingsSource).toContain("translate('settings.badge_colors')");
		expect(settingsSource).toContain('this.plugin.settings.coloredBadges');
		expect(en['settings.badge_colors']).toBeTruthy();
		expect(en['settings.badge_colors.desc']).toBeTruthy();
		expect(es['settings.badge_colors']).toBeTruthy();
		expect(es['settings.badge_colors.desc']).toBeTruthy();
	});

	it('applies badge color classes only when the frame setting is enabled', () => {
		expect(frameSource).toContain(
			'return plugin.settings.coloredBadges === true',
		);
		expect(frameSource).toContain(
			'class:vaultman-badges-colored={coloredBadges}',
		);
		expect(stylesSource).toMatch(
			/\.vaultman-badge--blue,[\s\S]*?color:\s*var\(--text-muted\)/,
		);
		expect(stylesSource).toContain(
			'.vaultman-badges-colored .vaultman-badge--blue',
		);
		expect(stylesSource).toContain(
			'.vaultman-badges-colored .vaultman-badge--orange',
		);
	});
});
