import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('uno.config.ts preflight gate', () => {
	const text = readFileSync(resolve('uno.config.ts'), 'utf8');

	it('does not enable preflights', () => {
		expect(text).not.toMatch(/preflights\s*:/);
		expect(text).not.toMatch(/presetWind\s*\(/);
	});

	it('declares an explicit safelist scoped to vm- and obsidian-mimic-', () => {
		expect(text).toMatch(/safelist/);
		expect(text).toMatch(/vm-/);
		expect(text).toMatch(/obsidian-mimic-/);
	});

	it('uses presetUno + presetIcons + presetAttributify', () => {
		expect(text).toMatch(/presetUno\(/);
		expect(text).toMatch(/presetIcons\(/);
		expect(text).toMatch(/presetAttributify\(/);
	});

	it('disables preset preflight explicitly on presetUno', () => {
		expect(text).toMatch(/presetUno\(\s*\{\s*preflight\s*:\s*false/);
	});

	it('declares all four identity classes in safelist', () => {
		expect(text).toMatch(/vm-id-native/);
		expect(text).toMatch(/vm-id-bases/);
		expect(text).toMatch(/vm-id-outline/);
		expect(text).toMatch(/vm-id-bookmarks/);
	});
});
