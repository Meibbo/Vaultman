import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import {
	applyTreeIndentUnit,
	DEFAULT_TREE_INDENT_UNIT,
} from '../../src/logic/logicTreeIndent';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

/**
 * U130 indent: el unit es un setting global con slider y aplicado en vivo;
 * cada construcción de render-opts del árbol porta `indent` para que ningún
 * camino (toggle de cells, scroll virtualizado) pinte sin él.
 */
describe('U130 tree indent unit', () => {
	it('defaultea a 16px, el default del stylesheet', () => {
		expect(DEFAULT_TREE_INDENT_UNIT).toBe(16);
		const calls: Array<[string, string]> = [];
		applyTreeIndentUnit(
			{ setProperty: (name, value) => calls.push([name, value]) },
			{},
		);
		expect(calls).toEqual([['--vaultman-tree-indent-unit', '16px']]);
	});

	it('aplica el valor guardado y tolera valores rotos', () => {
		const calls: Array<[string, string]> = [];
		const style = {
			setProperty: (name: string, value: string) => calls.push([name, value]),
		};
		applyTreeIndentUnit(style, { treeIndentUnit: 24 });
		applyTreeIndentUnit(style, { treeIndentUnit: Number.NaN });
		expect(calls).toEqual([
			['--vaultman-tree-indent-unit', '24px'],
			['--vaultman-tree-indent-unit', '16px'],
		]);
	});

	it('expone slider en style settings con aplicado en vivo', () => {
		expect(settingsSource).toContain('settings.tree_indent_unit');
		expect(settingsSource).toContain('updateTreeIndentUnit()');
		expect(en['settings.tree_indent_unit']).toBeTruthy();
		expect(es['settings.tree_indent_unit']).toBeTruthy();
		expect(es['settings.tree_indent_unit']).not.toBe(
			en['settings.tree_indent_unit'],
		);
	});

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
