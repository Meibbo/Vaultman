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

describe('BT3 settings information architecture source guards', () => {
	it('removes language from UI and exposes the locked heading copy', () => {
		const rootStart = settingsSource.indexOf('display(): void');
		const rootEnd = settingsSource.indexOf(
			'private displayToolbarPage(containerEl: HTMLElement)',
		);
		const rootSource = settingsSource.slice(rootStart, rootEnd);

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
		expect(settingsSource).toMatch(
			/private page:[\s\S]*?'explorer'[\s\S]*?'context-menus' = 'root'/,
		);
		expect(settingsSource).toContain("if (this.page === 'toolbar')");
		expect(settingsSource).toContain('this.displayToolbarPage(containerEl)');

		const rootStart = settingsSource.indexOf('display(): void');
		const toolbarPageStart = settingsSource.indexOf(
			'private displayToolbarPage(containerEl: HTMLElement)',
		);
		const toolbarPageEnd = settingsSource.indexOf(
			'private displayFilesHoverPage(containerEl: HTMLElement)',
		);
		const rootSource = settingsSource.slice(rootStart, toolbarPageStart);
		const toolbarSource = settingsSource.slice(
			toolbarPageStart,
			toolbarPageEnd,
		);

		expect(rootSource).toContain("translate('settings.toolbar')");
		for (const key of [
			'settings.filters_show_tab_labels',
			'settings.show_toolbar',
			'settings.toolbar_tools_menu',
		]) {
			expect(rootSource).not.toContain(`translate('${key}')`);
			expect(toolbarSource).toContain(`translate('${key}')`);
		}
		expect(toolbarSource).toContain(
			"translate('settings.back_to_layout_settings')",
		);
		expect(settingsSource).not.toContain('settings.back_to_style_config');
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
		expect(presetSource).toContain('this.display()');
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
	it('moves show dock directly under the style preset', () => {
		const preset = settingsSource.indexOf("translate('settings.style_preset')");
		const dock = settingsSource.indexOf("translate('settings.show_dock')");
		const blur = settingsSource.indexOf(
			"translate('settings.background_blur')",
		);
		expect(preset).toBeGreaterThan(-1);
		expect(dock).toBeGreaterThan(preset);
		expect(dock).toBeLessThan(blur);
	});

	it('groups explorer cells/badges/highlights into the Explorer sub-page', () => {
		const page = settingsSource.slice(
			settingsSource.indexOf('displayExplorerPage(containerEl: HTMLElement)'),
			settingsSource.indexOf(
				'displayContextMenusPage(containerEl: HTMLElement)',
			),
		);
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
		const page = settingsSource.slice(
			settingsSource.indexOf(
				'displayContextMenusPage(containerEl: HTMLElement)',
			),
		);
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
