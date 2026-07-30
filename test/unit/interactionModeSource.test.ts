import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import pageSource from '../../src/components/pages/pageFilters.svelte?raw';
import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import settingsTypesSource from '../../src/types/typeSettings.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

function functionSlice(source: string, name: string): string {
	const start = source.indexOf(`function ${name}`);
	const end = source.indexOf('\n\tfunction ', start + 1);
	return source.slice(start, end < 0 ? undefined : end);
}

describe('BT3 native menu and interaction-mode source guards', () => {
	it('orders the Tabs menu into the locked sections', () => {
		const menu = functionSlice(navbarSource, 'openNativeTabsMenu');
		const orderedTokens = [
			'for (const option of primaryTabOptions)',
			'launcherActions',
			"translate('floating_toc.menu')",
			'renderTabAction(statisticsAction)',
			'for (const option of addonTabOptions)',
			"translate('viewmenu.toolbar')",
		];
		let previous = -1;
		for (const token of orderedTokens) {
			const index = menu.indexOf(token);
			expect(index, token).toBeGreaterThan(previous);
			previous = index;
		}
	});

	it('orders View as Layouts, In mode, Cells, then engines', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const layouts = menu.indexOf("translate('viewmenu.layouts')");
		const inMode = menu.indexOf("translate('viewmenu.in_mode')");
		const cells = menu.indexOf('cellMenuOrder(');
		const engines = menu.indexOf(
			'for (const option of minimalNativeViewModes)',
		);

		expect(layouts).toBeGreaterThan(-1);
		expect(inMode).toBeGreaterThan(layouts);
		expect(cells).toBeGreaterThan(inMode);
		expect(engines).toBeGreaterThan(cells);
		expect(menu.indexOf('for (const layout of savedLayouts)')).toBeLessThan(
			menu.indexOf("translate('viewmenu.save_layout')"),
		);
		expect(menu).not.toContain("translate('viewmode.add_mode')");
	});

	it('persists per-tab modes through the existing saved-layout channel', () => {
		expect(settingsTypesSource).toContain('interactionMode?: InteractionMode;');
		expect(navbarSource).toContain(
			'interactionMode: interactionModeByTab[tab]',
		);
		expect(navbarSource).toContain('saved.interactionMode');
		expect(navbarSource).not.toContain('addModeActive');
		expect(navbarSource).not.toContain('handleAddModeChange');
		for (const source of [filesSource, propsSource, tagsSource]) {
			expect(source).toContain('setInteractionMode(');
			expect(source).not.toContain('setAddMode(');
		}
	});

	it('wires Ctrl+Open to Content search and Files Select to local selection', () => {
		expect(pageSource).toContain(
			'function activateNodeContentSearch(query: string)',
		);
		expect(pageSource).toContain("switchFiltersTab('content')");
		expect(pageSource).toContain(
			'onContentSearch: activateNodeContentSearch',
		);
		expect(propsSource).toContain("action === 'content-search'");
		expect(tagsSource).toContain("action === 'content-search'");
		expect(filesSource).toContain("action === 'select'");
		expect(filesSource).toContain("selectionGesture = 'toggle'");
	});

	it('adds synchronized labels for the native submenu', () => {
		expect(en['viewmenu.layouts']).toBe('Layout');
		expect(es['viewmenu.layouts']).toBe('Composiciones de vista');
		expect(en['viewmenu.in_mode']).toBe('In mode');
		expect(es['viewmenu.in_mode']).toBe('En modo');
		for (const key of ['open', 'add', 'select', 'filter']) {
			expect(en[`viewmenu.in_mode.${key}`]).toBeTruthy();
			expect(es[`viewmenu.in_mode.${key}`]).toBeTruthy();
		}
	});
});
