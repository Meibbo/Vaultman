import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
	explorerRainbowGlyphColor,
	GLYPH_COLOR_CHOICES,
	normalizeGlyphColorChoice,
	normalizeGlyphColorScope,
	normalizeGlyphCustomColor,
	pastelRainbowGlyphColor,
	rainbowGlyphColor,
	resolveExplorerGlyphColor,
	resolveExplorerGlyphDecoration,
	resolveGlyphColorCss,
} from '../../src/logic/logicGlyphColor';
import floatingTocSource from '../../src/components/layout/floatingToc.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import mainSource from '../../src/main.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('BT5-025 shared glyph color palette', () => {
	it('exposes the same strong and pastel choices to both panels', () => {
		expect(GLYPH_COLOR_CHOICES).toEqual([
			'default',
			'faint',
			'accent',
			'custom',
			'rainbow',
			'rainbow-pastel',
		]);
		expect(settingsSource).not.toContain('EXPLORER_GLYPH_COLOR_CHOICES');
	});

	it('resolves faint and accent to semantic vars, never a copied hex', () => {
		expect(resolveGlyphColorCss('faint', '#fff')).toBe('var(--text-faint)');
		expect(resolveGlyphColorCss('accent', '#fff')).toBe(
			'var(--interactive-accent)',
		);
		expect(resolveGlyphColorCss('default', '#fff')).toBe('');
		expect(resolveGlyphColorCss('rainbow', '#fff')).toBe('');
		expect(resolveGlyphColorCss('rainbow-pastel', '#fff')).toBe('');
	});

	it('resolves custom to a validated hex with a safe fallback', () => {
		expect(resolveGlyphColorCss('custom', '#1a2b3c')).toBe('#1a2b3c');
		expect(normalizeGlyphCustomColor('not-a-color')).toMatch(/^#[0-9a-f]{6}$/i);
		expect(normalizeGlyphCustomColor('#abc')).toBe('#abc');
	});

	it('migrates a legacy color name to custom with its documented hex', () => {
		expect(normalizeGlyphColorChoice('blue')).toEqual({
			choice: 'custom',
			migratedCustom: '#086ddd',
		});
		expect(normalizeGlyphColorChoice('rainbow')).toEqual({ choice: 'rainbow' });
		expect(normalizeGlyphColorChoice('rainbow-pastel')).toEqual({
			choice: 'rainbow-pastel',
		});
		expect(normalizeGlyphColorChoice('faint')).toEqual({ choice: 'faint' });
		expect(normalizeGlyphColorChoice('garbage')).toEqual({ choice: 'default' });
	});

	it('resolves the shared rainbow through theme-aware CSS variables', () => {
		// U121-029: the palettes are CSS variables, not literals. The snippet
		// declares its ten slots per theme because one fixed palette cannot have
		// correct contrast in both; freezing its light values as our only strong
		// palette is what darkened the glyphs in a dark vault.
		expect(rainbowGlyphColor(0, 10)).toBe('var(--vaultman-rainbow-1)');
		expect(rainbowGlyphColor(9, 10)).toBe('var(--vaultman-rainbow-10)');
		expect(pastelRainbowGlyphColor(0, 10)).toBe(
			'var(--vaultman-rainbow-pastel-1)',
		);
		expect(pastelRainbowGlyphColor(9, 10)).toBe(
			'var(--vaultman-rainbow-pastel-10)',
		);
	});

	it('declares both palettes per theme and inherits the snippet slots', () => {
		// Chaining through `--color-rainbow-N` means a vault running the reference
		// snippet gets glyphs identical to its own core file explorer.
		expect(stylesSource).toContain(
			'--vaultman-rainbow-1: var(--color-rainbow-1, hsl(18, 60%, 40%));',
		);
		expect(stylesSource).toContain(
			'--vaultman-rainbow-1: var(--color-rainbow-1, hsl(18, 70%, 60%));',
		);
		expect(stylesSource).toContain('--vaultman-rainbow-pastel-1: hsl(0, 100%, 84%);');
		for (let slot = 1; slot <= 10; slot += 1) {
			expect(stylesSource).toContain(`--vaultman-rainbow-${slot}:`);
			expect(stylesSource).toContain(`--vaultman-rainbow-pastel-${slot}:`);
		}
	});

	it('normalizes the explorer scope', () => {
		expect(normalizeGlyphColorScope('both')).toBe('both');
		expect(normalizeGlyphColorScope('files')).toBe('files');
		expect(normalizeGlyphColorScope('nonsense')).toBe('folders');
	});

	it('maps Explorer rainbow positions to the ten-slot snippet order', () => {
		expect(explorerRainbowGlyphColor(0)).toBe('var(--vaultman-rainbow-10)');
		expect(explorerRainbowGlyphColor(1)).toBe('var(--vaultman-rainbow-1)');
		expect(explorerRainbowGlyphColor(9)).toBe('var(--vaultman-rainbow-9)');
		expect(explorerRainbowGlyphColor(10)).toBe('var(--vaultman-rainbow-10)');
		expect(explorerRainbowGlyphColor(-1)).toBe('var(--vaultman-rainbow-9)');
	});

	it('maps Explorer pastel rainbow to all ten original snippet tones', () => {
		const first = resolveExplorerGlyphColor({
			choice: 'rainbow-pastel',
			customColor: '#123456',
			scope: 'both',
			kind: 'folder',
			position: 0,
		});
		const second = resolveExplorerGlyphColor({
			choice: 'rainbow-pastel',
			customColor: '#123456',
			scope: 'both',
			kind: 'folder',
			position: 1,
		});
		expect(first).toBe('var(--vaultman-rainbow-pastel-10)');
		expect(second).toBe('var(--vaultman-rainbow-pastel-1)');
	});

	it('applies Explorer glyph color only inside the configured scope', () => {
		const base = {
			choice: 'accent' as const,
			customColor: '#123456',
			position: 0,
		};
		expect(
			resolveExplorerGlyphColor({
				...base,
				scope: 'files',
				kind: 'file',
			}),
		).toBe('var(--interactive-accent)');
		expect(
			resolveExplorerGlyphColor({
				...base,
				scope: 'files',
				kind: 'folder',
			}),
		).toBeNull();
		expect(
			resolveExplorerGlyphColor({
				...base,
				scope: 'folders',
				kind: 'file',
			}),
		).toBeNull();
		expect(
			resolveExplorerGlyphColor({
				...base,
				scope: 'both',
				kind: 'folder',
			}),
		).toBe('var(--interactive-accent)');
	});

	it('inherits a branch rainbow and keeps Iconic precedence on cell_icon', () => {
		const inherited = 'var(--color-rainbow-4, #22c55e)';
		const glyphColor = resolveExplorerGlyphColor({
			choice: 'rainbow',
			customColor: '#123456',
			scope: 'files',
			kind: 'file',
			position: 7,
			inheritedRainbowColor: inherited,
		});
		expect(glyphColor).toBe(inherited);
		expect(resolveExplorerGlyphDecoration(glyphColor, '#abcdef')).toEqual({
			iconColor: '#abcdef',
			labelColor: inherited,
		});
		expect(resolveExplorerGlyphDecoration(glyphColor, null)).toEqual({
			iconColor: inherited,
			labelColor: inherited,
		});
		expect(resolveExplorerGlyphDecoration(null, null)).toEqual({
			iconColor: undefined,
			labelColor: undefined,
		});
	});

	it('the floating index consumes the shared resolver', () => {
		expect(floatingTocSource).toContain('resolveGlyphColorCss(');
		expect(floatingTocSource).toContain('rainbowGlyphColor(');
		expect(floatingTocSource).toContain("choice === 'rainbow-pastel'");
		expect(floatingTocSource).toContain('pastelRainbowGlyphColor(');
		// The individual color vars are gone from the glyph style path.
		expect(floatingTocSource).not.toContain('var(--color-${color})');
	});

	it('settings show the shared selector, not the individual color vars', () => {
		expect(settingsSource).toContain('GLYPH_COLOR_CHOICES');
		expect(settingsSource).toContain('explorerGlyphColor');
		expect(settingsSource).toContain('explorerGlyphScope');
		// Rainbow folders toggle is gone from the UI (setting/code stay).
		expect(settingsSource).not.toContain("translate('settings.rainbow_folders')");
	});

	it('migrates the legacy glyph color once on load', () => {
		expect(mainSource).toContain('normalizeGlyphColorChoice(');
	});

	it('colors explorer glyphs by scope but never over an Iconic color', () => {
		expect(explorerFilesSource).toContain('_explorerGlyphColorFor(');
		// The shared precedence helper receives the explicit resolved (Iconic)
		// color, which wins the icon while glyph color still owns the label.
		expect(explorerFilesSource).toContain(
			'resolveExplorerGlyphDecoration(',
		);
		expect(explorerFilesSource).toContain('resolved?.color');
		expect(explorerFilesSource).toContain('this.plugin.settings.explorerGlyphScope');
	});

	it('tints hover backgrounds only for non-default glyph-colored surfaces', () => {
		expect(stylesSource).toContain('.vaultman-glyph-colored:hover');
		expect(stylesSource).toContain(
			'color-mix(\n\t\tin srgb,\n\t\tvar(--vaultman-glyph-color),\n\t\ttransparent 80%\n\t)',
		);
	});
});
