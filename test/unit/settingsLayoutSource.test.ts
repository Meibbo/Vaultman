import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import typeSettingsSource from '../../src/types/typeSettings.ts?raw';
import {
	FILTER_TEMPLATES,
	FLOATING_TOC_PAGE,
	ROOT,
	TOOLBAR_COMMANDS,
	TOOLBAR_PAGE,
	sliceBetween,
} from './settingsSourceAnchors';

describe('Vaultman Settings layout', () => {
	it('stores the full explorer sort state in saved view configs', () => {
		expect(typeSettingsSource).toContain('sortState: ExplorerSortState;');
		expect(typeSettingsSource).not.toContain('childLevel: boolean;');
	});

	it('uses the current operation-template labels in both languages', () => {
		expect(en['queue.template.templates']).toBe('Operation Sets');
		expect(es['queue.template.templates']).toBe('Presets de operaciones');
	});

	// U121-029: the port invented `settings.explorer`, `settings.context_menus`
	// and `settings.files_hover` for the sub-page entries. Neither language had
	// them, so the tab rendered the raw key. `translate()` falls back to the key
	// instead of throwing, so only a guard catches this.
	it('resolves every settings label in both languages', () => {
		const keys = [
			...new Set(
				Array.from(
					settingsSource.matchAll(/translate\(\s*'([^']+)'/g),
					(match) => match[1],
				),
			),
		];

		expect(keys.length).toBeGreaterThan(100);
		expect(keys.filter((key) => !(key in en))).toEqual([]);
		expect(keys.filter((key) => !(key in es))).toEqual([]);
	});

	// The keys the tab builds from a template literal, which the scan above
	// cannot see. Every member of the union needs copy in both languages.
	it('resolves the computed label families in both languages', () => {
		const families: Record<string, readonly string[]> = {
			'settings.context_menu_kind.': [
				'files',
				'props',
				'tags',
				'content',
				'snippets',
				'plugins',
			],
			'settings.glyph_color.': [
				'default',
				'accent',
				'faint',
				'rainbow',
				'rainbow-pastel',
				'custom',
			],
			'settings.prop_conflict_warnings.': ['off', 'badge', 'full'],
		};

		const missing: string[] = [];
		for (const [prefix, members] of Object.entries(families)) {
			for (const member of members) {
				const key = `${prefix}${member}`;
				if (!(key in en)) missing.push(`en:${key}`);
				if (!(key in es)) missing.push(`es:${key}`);
			}
		}
		expect(missing).toEqual([]);
	});

	// BT5-065: Layout Configuration moved ahead of the templates/sets/saved
	// sections, so it is now the first heading rather than the last.
	it('places View Config after Operation Sets, with Layout Config ahead of them', () => {
		const operationsIndex = settingsSource.indexOf(
			"translate('queue.template.templates')",
		);
		const viewConfigIndex = settingsSource.indexOf(
			"translate('settings.saved_view_config')",
		);
		const styleConfigIndex = settingsSource.indexOf(
			"translate('settings.style_config')",
		);
		const viewConfigBodyIndex = settingsSource.indexOf(
			'const layouts = this.plugin.settings.savedLayouts ?? []',
		);

		expect(operationsIndex).toBeGreaterThan(-1);
		expect(viewConfigIndex).toBeGreaterThan(operationsIndex);
		expect(viewConfigBodyIndex).toBeGreaterThan(viewConfigIndex);
		expect(styleConfigIndex).toBeGreaterThan(-1);
		expect(styleConfigIndex).toBeLessThan(operationsIndex);
	});

	it('places the Files tools toggle immediately after Show toolbar in its sub-page', () => {
		const toolbarSource = sliceBetween(TOOLBAR_PAGE, TOOLBAR_COMMANDS);
		const showToolbarIndex = toolbarSource.indexOf(
			"translate('settings.show_toolbar')",
		);
		const toolsIndex = toolbarSource.indexOf(
			"translate('settings.toolbar_tools_menu')",
		);

		expect(showToolbarIndex).toBeGreaterThan(-1);
		expect(toolsIndex).toBeGreaterThan(showToolbarIndex);
	});

	it('renders the inline-sort setting independently from the tools toggle callback', () => {
		const toolbarSource = sliceBetween(TOOLBAR_PAGE, TOOLBAR_COMMANDS);
		const toolsIndex = toolbarSource.indexOf(
			"translate('settings.toolbar_tools_menu')",
		);
		const inlineSortIndex = toolbarSource.indexOf(
			"translate('settings.sort_level_inline')",
		);
		// BT5-023 inserts the Create File binding between the tools toggle and
		// the inline-sort setting, so the tools block ends at the NEXT item
		// pushed, not at the inline-sort one.
		const nextSettingIndex = toolbarSource.indexOf('items.push({', toolsIndex);
		const toolsBlock = toolbarSource.slice(toolsIndex, nextSettingIndex);

		expect(inlineSortIndex).toBeGreaterThan(toolsIndex);
		expect(nextSettingIndex).toBeGreaterThan(toolsIndex);
		// The tools toggle owns a fully closed onChange callback, independent of
		// whatever setting is declared next.
		expect(toolsBlock).toMatch(
			/await this\.plugin\.saveSettings\(\);\s*}\),\s*\);/,
		);
	});

	it('routes Floating TOC to a declarative sub-page reachable from the root', () => {
		// Obsidian 1.13 renders and indexes the page from the definition tree,
		// which is what makes it reachable from the settings search.
		expect(settingsSource).toMatch(
			/type: 'page',[\s\S]*?items: this\.getFloatingTocPageItems\(\),/,
		);

		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);
		const styleIndex = rootSource.indexOf("translate('settings.style_config')");
		const tocLinkIndex = rootSource.indexOf(
			"translate('settings.floating_toc')",
		);
		const developerIndex = rootSource.indexOf(
			"translate('settings.developer_tools')",
		);
		expect(tocLinkIndex).toBeGreaterThan(styleIndex);
		expect(tocLinkIndex).toBeLessThan(developerIndex);
		expect(rootSource).not.toContain(
			"translate('settings.floating_toc_enable')",
		);

		const subpageSource = sliceBetween(FLOATING_TOC_PAGE);
		expect(subpageSource).toContain(
			"translate('settings.floating_toc_enable')",
		);
	});

	it('places Performance monitor in its own Developer Tools section', () => {
		const developerIndex = settingsSource.indexOf(
			"translate('settings.developer_tools')",
		);
		const monitorIndex = settingsSource.indexOf(
			"translate('settings.performance_monitor')",
		);
		expect(developerIndex).toBeGreaterThan(-1);
		expect(monitorIndex).toBeGreaterThan(developerIndex);
		expect(en['settings.developer_tools']).toBe('Developer Tools');
		expect(es['settings.developer_tools']).toBe('Herramientas de desarrollo');
	});

	it('places the compatibility-preserving Iconic toggle in Add-ons', () => {
		const addonsIndex = settingsSource.indexOf("translate('settings.addons')");
		const iconicIndex = settingsSource.indexOf(
			"translate('settings.addons.iconic')",
		);
		const developerIndex = settingsSource.indexOf(
			"translate('settings.developer_tools')",
		);

		expect(addonsIndex).toBeGreaterThan(-1);
		expect(iconicIndex).toBeGreaterThan(addonsIndex);
		expect(iconicIndex).toBeLessThan(developerIndex);
		expect(settingsSource).toContain(
			'.setValue(this.plugin.settings.iconicEnabled !== false)',
		);
		expect(settingsSource).toContain(
			'this.plugin.iconicService?.setEnabled(value)',
		);
		expect(en['settings.addons']).toBe('Add-ons');
		expect(es['settings.addons']).toBe('Complementos');
		expect(en['settings.addons.iconic']).toBe('Iconic');
		expect(es['settings.addons.iconic']).toBe('Iconic');
	});

	it('renames the Niagara join option as an action-track operation', () => {
		expect(en['settings.toc_niagara_nodes']).toBe('Join action nodes to slide');
		expect(es['settings.toc_niagara_nodes']).toBe(
			'Unir acciones al deslizamiento',
		);
	});

	it('defers unfinished Niagara name and glow controls outside the beta UI', () => {
		for (const key of [
			'settings.toc_label_mode',
			'settings.toc_reveal',
			'settings.toc_name_order',
			'settings.toc_glow',
			'settings.toc_name_pill',
		]) {
			expect(settingsSource).not.toContain(`translate('${key}')`);
		}

		expect(frameSource).toContain("labelMode: 'off'");
		expect(frameSource).toContain('glow: false');
		expect(frameSource).toContain('namePill: false');
	});
});
