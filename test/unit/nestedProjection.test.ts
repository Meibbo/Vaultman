import { describe, expect, it } from 'vitest';

import {
	cellDef,
	cellsForExplorer,
	defaultVisibleCells,
} from '../../src/logic/logicCellRegistry';
import { expansionActionAvailable } from '../../src/logic/logicTreeExpansion';

import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';

/**
 * U130 parity B: nested/viewco reactivity + toolbar expand/collapse.
 *
 * Registry: `nested` cell must offer `plugins` explorer (defaultOn = true,
 * so zero visual regression by default).
 *
 * Projection: `explorerPlugins.ts` must branch on `_nestedEnabled()` —
 * nested off → flat rows, no caret expansion of plugin children;
 * nested on → caret + spec-07 children preserved.
 *
 * Toolbar: `expandAll/collapseAll/hasExpandedNodes/setExpansionChangeHandler`
 * must reach the host for the plugins scene (already wired; proven here).
 */

describe('U130 parity B · registry', () => {
	it('offers the nested cell to the plugins explorer, defaultOn', () => {
		const nested = cellDef('nested');
		expect(nested?.id).toBe('nested');
		expect(nested?.role).toBe('topology');
		// plugins must be in the supports list
		expect(
			nested?.supports.some(
				(s) => s.explorer === 'plugins' && s.defaultOn === true,
			),
		).toBe(true);
	});

	it('defaultVisibleCells for plugins includes nested', () => {
		expect(defaultVisibleCells('plugins', 'tree')).toContain('nested');
	});

	it('cellsForExplorer plugins includes nested', () => {
		expect(cellsForExplorer('plugins', 'tree').map((d) => d.id)).toContain(
			'nested',
		);
	});
});

describe('U130 parity B · expansion availability', () => {
	it.each([['plugins'], ['snippets']] as const)(
		'tab=%s con nested visible ofrece expand/collapse',
		(tab) => {
			expect(expansionActionAvailable(tab, ['nested'])).toBe(true);
		},
	);

	it('plugins con agrupacion activa y sin nested ofrece el boton', () => {
		expect(expansionActionAvailable('plugins', [], true)).toBe(true);
	});

	it('plugins sin agrupacion ni nested no ofrece el boton', () => {
		expect(expansionActionAvailable('plugins', [], false)).toBe(false);
	});
});

describe('U130 parity B · projection source guards', () => {
	it('exposes _nestedEnabled in explorerPlugins', () => {
		expect(pluginsSource).toContain('_nestedEnabled(): boolean');
	});

	it('branches projection on nested state in rebuildNodes', () => {
		// Nested on: attaches spec-07 children via _getPluginSettingsChildren
		// (matched by call shape, not by the assignment target: since the
		// canonical core/community grouping the call assigns `rawRoots`
		// before `this.nodes`, not `this.nodes` directly).
		expect(pluginsSource).toContain('buildCanonicalRestRoots({');
		// Nested off: flat rows — children cleared, no caret expansion
		expect(pluginsSource).toContain("node.children = []");
		expect(pluginsSource).toContain("node.showCaret = false");
	});

	it('reads nested state from visibleCells', () => {
		expect(pluginsSource).toContain("this.visibleCells.has('nested')");
	});

	it('default visibleCells for plugins includes nested', () => {
		// No `checkbox`: intentionally off by default since the checkbox-flash
		// fix (panel starts without checkbox flash by design).
		expect(pluginsSource).toContain(
			"new Set(['icon', 'text', 'state', 'config', 'nested'])",
		);
	});

	it('exposes expandAll/collapseAll/hasExpandedNodes/setExpansionChangeHandler',
		() => {
			expect(pluginsSource).toContain('expandAll(): void');
			expect(pluginsSource).toContain('collapseAll(): void');
			expect(pluginsSource).toContain('hasExpandedNodes(): boolean');
			expect(pluginsSource).toContain(
				'setExpansionChangeHandler(handler?: () => void): void',
			);
		},
	);
});
