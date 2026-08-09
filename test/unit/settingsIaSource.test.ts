import { describe, expect, it } from 'vitest';

import settingsSource from '../../src/VaultmanSettings.ts?raw';
import mainSource from '../../src/main.ts?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import {
	cellLabelKey,
	cellsForExplorer,
	defaultVisibleCells,
} from '../../src/logic/logicCellRegistry';
import {
	CONTEXT_MENUS_PAGE,
	EXPLORER_PAGE,
	FILTER_TEMPLATES,
	ROOT,
	TOOLBAR_COMMANDS,
	TOOLBAR_PAGE,
	sliceBetween,
} from './settingsSourceAnchors';

describe('BT3 settings information architecture source guards', () => {
	it('removes language from UI and exposes the locked heading copy', () => {
		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);

		expect(rootSource).not.toContain("translate('settings.language')");
		// Renamed to Layout Configuration (dev request 2026-07-20).
		expect(en['settings.style_config']).toBe('Layout Configuration');
		expect(es['settings.style_config']).toBe('Configuración de Layout');
		expect(en['settings.saved_view_config']).toBe('Saved compositions');
		expect(es['settings.saved_view_config']).toBe('Composiciones de vista');
		expect(en['settings.badge_colors']).toBe('Colored cell badges');
		expect(es['settings.badge_colors']).toBe('Badges de celda con color');
		expect(en).not.toHaveProperty('settings.language');
		expect(es).not.toHaveProperty('settings.language');
		expect(DEFAULT_SETTINGS.language).toBe('auto');
		expect(mainSource).toContain('setLanguage(this.settings.language)');
	});

	it('routes the three toolbar controls into one Layout Settings sub-page', () => {
		// The sub-page is a declarative `type: 'page'` entry, so Obsidian owns
		// the navigation and the search index reaches its items.
		expect(settingsSource).toContain('getSettingDefinitions()');
		expect(settingsSource).toMatch(
			/type: 'page',[\s\S]*?items: this\.getToolbarPageItems\(\),/,
		);

		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);
		const toolbarSource = sliceBetween(TOOLBAR_PAGE, TOOLBAR_COMMANDS);

		expect(rootSource).toContain("translate('settings.toolbar')");
		for (const key of [
			'settings.filters_show_tab_labels',
			'settings.show_toolbar',
			'settings.toolbar_tools_menu',
		]) {
			expect(rootSource).not.toContain(`translate('${key}')`);
		}
		expect(toolbarSource).toContain('if (!Platform.isMobile)');
		expect(toolbarSource).toContain("translate('settings.show_toolbar')");
		// Navigation is the framework's job now: no hand-rolled back buttons and
		// no page state machine of our own.
		expect(settingsSource).not.toContain('settings.back_to_layout_settings');
		expect(settingsSource).not.toContain('settings.back_to_style_config');
		expect(settingsSource).not.toContain('this.page =');
	});

	it('gates blur rendering and delegates the runtime CSS update', () => {
		const blurIndex = settingsSource.indexOf(
			"translate('settings.background_blur')",
		);
		const guardIndex = settingsSource.lastIndexOf(
			'if (!this.plugin.settings.minimalStyle)',
			blurIndex,
		);
		expect(guardIndex).toBeGreaterThan(-1);
		expect(mainSource).toContain(
			'applyGlassBlurSetting(activeDocument.body.style, this.settings)',
		);
		const presetStart = settingsSource.indexOf(
			"translate('settings.style_preset')",
		);
		const presetSource = settingsSource.slice(presetStart, blurIndex);
		expect(presetSource).toContain('this.plugin.updateGlassBlur()');
		// The preset shows and hides the blur slider, so it re-renders the tab.
		expect(presetSource).toContain('this.update()');
		expect(DEFAULT_SETTINGS.glassBlurIntensity).toBe(60);
	});

	it('keeps Props available but off by default for new Files layouts', () => {
		// BT5-010: Files defaults come from the shared registry.
		expect(defaultVisibleCells('files', 'tree')).toEqual([
			'name',
			'ext',
			'nested',
		]);
		expect(
			cellLabelKey(
				cellsForExplorer('files', 'tree').find((cell) => cell.id === 'count')!,
				'files',
				'tree',
			),
		).toBe('viewmode.pill.prop_count');
		expect(
			SORT_MENU_OPTIONS.files.find((option) => option.id === 'count')?.labelKey,
		).toBe('sort.by.props');
		// BT5-010: the popup no longer repeats the cell once per Files view
		// mode; the registry answers for every one of them.
		for (const viewMode of ['tree', 'table', 'cards'] as const) {
			const count = cellsForExplorer('files', viewMode).find(
				(cell) => cell.id === 'count',
			);
			expect(count).toBeDefined();
			expect(cellLabelKey(count!, 'files', viewMode)).toBe(
				'viewmode.pill.prop_count',
			);
			expect(defaultVisibleCells('files', viewMode)).not.toContain('count');
		}
		expect(popupViewSource).toContain('initialPills');
	});
});

describe('BT4-010 settings IA (D34)', () => {
	it('leads Layout Configuration with the Node Dock widget, ahead of the style preset', () => {
		// v1.2.0 relabel/reorg: the dock ("Widget: Node Dock") now sits directly
		// under the Layout Configuration heading, above the style preset.
		const layout = settingsSource.indexOf("translate('settings.style_config')");
		const dock = settingsSource.indexOf("translate('settings.show_dock')");
		const preset = settingsSource.indexOf("translate('settings.style_preset')");
		const blur = settingsSource.indexOf(
			"translate('settings.background_blur')",
		);
		expect(layout).toBeGreaterThan(-1);
		expect(dock).toBeGreaterThan(layout);
		expect(dock).toBeLessThan(preset);
		expect(preset).toBeLessThan(blur);
	});

	it('groups explorer cells/badges/highlights into the Explorer sub-page', () => {
		const page = sliceBetween(EXPLORER_PAGE, CONTEXT_MENUS_PAGE);
		for (const key of [
			"settings.addon_cell_style'",
			"settings.badge_colors'",
			"settings.badge_cancel_click'",
			"settings.search_highlights'",
		]) {
			expect(page).toContain(key);
		}
	});

	it('turns the context-menu section into a trailing Layout Settings sub-page', () => {
		const page = sliceBetween(CONTEXT_MENUS_PAGE);
		expect(page).toContain("settings.context_menu.file_menu'");
		expect(page).toContain("settings.context_menu.editor_menu'");
		expect(page).toContain("settings.context_menu.more_options'");
		// The Explorer/Context menus launch buttons close the Layout section.
		const explorerBtn = settingsSource.indexOf(
			"translate('settings.explorer_page')",
		);
		const addonsHeading = settingsSource.indexOf(
			"translate('settings.addons')",
		);
		expect(explorerBtn).toBeGreaterThan(-1);
		expect(explorerBtn).toBeLessThan(addonsHeading);
	});
});

// U121-029: the port to the declarative tab carried the five sub-pages over
// but dropped the whole root page, so the build shipped a handful of settings
// where it used to show dozens. This is the inventory guard for the root: every
// control that has no sub-page of its own must be reachable from it.
describe('U121-029 declarative settings root inventory', () => {
	const ROOT_CONTROLS = [
		'settings.open_mode',
		'settings.operation_scope',
		'settings.bulk_operation_warning_threshold',
		'settings.prop_move_conflict',
		'settings.bypass_operations',
		'settings.queue_warn_supersede',
		'settings.text_search_intercepts',
		'settings.show_dock',
		'settings.style_preset',
		'settings.background_blur',
		'settings.addons.iconic',
		'settings.performance_monitor',
	];

	const ROOT_HEADINGS = [
		'settings.style_config',
		'settings.operations',
		'settings.addons',
		'settings.developer_tools',
	];

	it('keeps every root-only control on the root page', () => {
		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);
		const missing = [...ROOT_CONTROLS, ...ROOT_HEADINGS].filter(
			(key) => !rootSource.includes(`translate('${key}')`),
		);
		expect(missing).toEqual([]);
	});

	it('keeps the template and saved-composition sections on the root page', () => {
		const templates = sliceBetween(FILTER_TEMPLATES, TOOLBAR_PAGE);
		for (const key of [
			'settings.templates',
			'queue.template.templates',
			'settings.bulk_operation_warning',
			'settings.saved_view_config',
		]) {
			expect(templates).toContain(`translate('${key}')`);
		}
		// The lists render the persisted payloads, not just their headings.
		expect(templates).toContain('this.plugin.settings.filterTemplates');
		expect(templates).toContain('this.plugin.settings.queueTemplates');
		expect(templates).toContain('this.plugin.settings.savedLayouts');
		expect(templates).toContain('PayloadPreviewModal');
	});

	it('wires all five sub-pages into the root', () => {
		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);
		for (const builder of [
			'getToolbarPageItems',
			'getFloatingTocPageItems',
			'getExplorerPageItems',
			'getContextMenusPageItems',
			'getFilesHoverPageItems',
		]) {
			expect(rootSource).toContain(`items: this.${builder}(),`);
		}
	});

	it('re-renders the tab from the toggles that add or remove rows', () => {
		const rootSource = sliceBetween(ROOT, FILTER_TEMPLATES);
		// The threshold row is gated on bypassOperations and the blur slider on
		// minimalStyle; both toggles have to ask for a re-render.
		expect(rootSource).toContain('if (!this.plugin.settings.bypassOperations)');
		expect(rootSource).toContain('if (!this.plugin.settings.minimalStyle)');
		const bypassStart = rootSource.indexOf(
			"translate('settings.bypass_operations')",
		);
		const styleConfig = rootSource.indexOf(
			"translate('settings.style_config')",
		);
		expect(rootSource.slice(bypassStart, styleConfig)).toContain(
			'this.update()',
		);
	});
});
