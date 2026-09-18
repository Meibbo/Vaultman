import { describe, expect, it } from 'vitest';

import {
	cellMenuOrder,
	shouldOfferCheckboxViewOption,
	viewMenuCells,
} from '../../src/logic/logicCellRegistry';
import type { ExplorerTabId } from '../../src/types/typeUI';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import snippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import popupSource from '../../src/components/layout/popupView.svelte?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

const SCENES: readonly ExplorerTabId[] = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
];

describe('U121-108 live repaint + hidden view_option', () => {
	it('offers the checkbox view_option unless the edge is hidden', () => {
		expect(shouldOfferCheckboxViewOption('start')).toBe(true);
		expect(shouldOfferCheckboxViewOption('end')).toBe(true);
		expect(shouldOfferCheckboxViewOption(undefined)).toBe(true);
		expect(shouldOfferCheckboxViewOption('hidden')).toBe(false);
	});

	it('keeps the checkbox in the view menu for start/end and the default', () => {
		for (const explorer of SCENES) {
			expect(
				viewMenuCells(explorer, 'tree').map((cell) => cell.id),
			).toContain('checkbox');
			for (const position of ['start', 'end'] as const) {
				expect(
					viewMenuCells(explorer, 'tree', undefined, {
						selectionCheckboxPosition: position,
					}).map((cell) => cell.id),
				).toContain('checkbox');
			}
		}
	});

	it('hides the checkbox view_option in every scene when hidden', () => {
		for (const explorer of SCENES) {
			const ids = viewMenuCells(explorer, 'tree', undefined, {
				selectionCheckboxPosition: 'hidden',
			}).map((cell) => cell.id);
			expect(ids).not.toContain('checkbox');
			// The rest of the menu is untouched: only the checkbox drops out.
			const defaultIds = viewMenuCells(explorer, 'tree').map(
				(cell) => cell.id,
			);
			expect(ids).toEqual(defaultIds.filter((id) => id !== 'checkbox'));
		}
	});

	it('drops the checkbox from the native menu projection when hidden', () => {
		for (const explorer of SCENES) {
			const visible = viewMenuCells(explorer, 'tree').map(
				(cell) => cell.id,
			);
			const shown = cellMenuOrder(explorer, visible, {
				byActivation: false,
				viewMode: 'tree',
			}).map((entry) => entry.id);
			expect(shown).toContain('checkbox');
			const hidden = cellMenuOrder(explorer, visible, {
				byActivation: false,
				viewMode: 'tree',
				selectionCheckboxPosition: 'hidden',
			}).map((entry) => entry.id);
			expect(hidden).not.toContain('checkbox');
		}
	});

	it('repaints every mounted scene live on settings change', () => {
		// Files already repainted; props/tags/snippets/plugins must subscribe
		// to the same broadcast so start/end/hidden applies without reload.
		expect(filesSource).toContain('onSettingsChange');
		for (const source of [
			propsSource,
			tagsSource,
			snippetsSource,
			pluginsSource,
		]) {
			expect(source).toContain('onSettingsChange');
			expect(source).toContain('U121-108');
		}
	});

	it('threads the hidden edge through both view menus', () => {
		expect(popupSource).toContain('selectionCheckboxPosition');
		expect(popupSource).toContain(
			'viewMenuCells(activeTab, activeView, activePills, {',
		);
		expect(navbarSource).toContain('selectionCheckboxPosition');
		expect(navbarSource).toContain('{selectionCheckboxPosition}');
		expect(pageFiltersSource).toContain('selectionCheckboxPosition');
	});
});
