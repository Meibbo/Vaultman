import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import mainSource from '../../src/main.ts?raw';
import typeSettingsSource from '../../src/types/typeSettings.ts?raw';

function readStyle(relativePath: string): string {
	return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

/**
 * U130 indent: the tree indent step is owned by Style Settings (the
 * `style-manager` plugin reads the `@settings` block below), not by
 * Vaultman's own settings page. A TS-owned copy would fight it: `onload`
 * would repaint the stored default over the user's Style Settings value.
 */
describe('U130 tree indent unit lives in Style Settings', () => {
	it('exposes a variable-number-slider for the canonical indent unit', () => {
		const stylesSource = readStyle(
			'src/styles/residual/_virtual-scroll-compat.scss',
		);
		expect(stylesSource).toContain('/* @settings');
		expect(stylesSource).toContain('id: vaultman-tree-indent-unit');
		expect(stylesSource).toContain('type: variable-number-slider');
		expect(stylesSource).toContain('default: 16');
		expect(stylesSource).toContain('min: 0');
		expect(stylesSource).toContain('max: 32');
	});

	it('keeps the 16px first-paint fallback at :root', () => {
		const stylesSource = readStyle(
			'src/styles/residual/_virtual-scroll-compat.scss',
		);
		expect(stylesSource).toContain('--vaultman-tree-indent-unit: 16px');
	});

	it('is not owned by the Vaultman settings page or the plugin runtime', () => {
		expect(settingsSource).not.toContain('settings.tree_indent_unit');
		expect(settingsSource).not.toContain('updateTreeIndentUnit');
		expect(mainSource).not.toContain('updateTreeIndentUnit');
		expect(mainSource).not.toContain('logicTreeIndent');
		expect(typeSettingsSource).not.toContain('treeIndentUnit');
	});

	it('paints every tree surface from the shared unit, never a fixed px', () => {
		for (const relativePath of [
			'src/styles/views/_files.scss',
			'src/styles/views/_tags.scss',
			'src/styles/views/_tree.scss',
			'src/styles/views/_statistics.scss',
			'src/styles/residual/_mobile-compat.scss',
			'src/styles/residual/_virtual-scroll-compat.scss',
		]) {
			const source = readStyle(relativePath);
			expect(source).toContain('var(--vaultman-tree-indent-unit)');
			expect(source).not.toContain('var(--depth, 0) * 16px');
		}
	});
});

describe('U130 tree indent render-opts plumbing', () => {
	it('cada construcción de render-opts del árbol porta indent', () => {
		// Red contra el flash: ningún camino de render (toggle de cells,
		// scroll virtualizado, re-proyección) puede pintar sin indent. Cada
		// construcción o propaga los opts previos (spread, que ya lo trae) o
		// lo fija desde el override con el mismo fallback del setting.
		const starts = [
			...explorerFilesSource.matchAll(/_treeRenderOpts = \{/g),
		];
		expect(starts.length).toBeGreaterThan(0);
		for (const match of starts) {
			const span = explorerFilesSource.slice(
				match.index ?? 0,
				(match.index ?? 0) + 2500,
			);
			expect(span).toMatch(/(\.\.\.this\._treeRenderOpts|indent:)/);
		}
		expect(navbarSource).toContain('applyIndent(tab, config.indent)');
	});
});
