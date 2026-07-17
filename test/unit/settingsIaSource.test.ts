import { describe, expect, it } from 'vitest';

import settingsSource from '../../src/VaultmanSettings.ts?raw';
import mainSource from '../../src/main.ts?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

describe('BT3 settings information architecture source guards', () => {
	it('removes language from UI and exposes the locked heading copy', () => {
		const rootStart = settingsSource.indexOf('display(): void');
		const rootEnd = settingsSource.indexOf(
			'private displayToolbarPage(containerEl: HTMLElement)',
		);
		const rootSource = settingsSource.slice(rootStart, rootEnd);

		expect(rootSource).not.toContain("translate('settings.language')");
		expect(en['settings.style_config']).toBe('Layout Settings');
		expect(es['settings.style_config']).toBe('Ajustes de diseño');
		expect(en['settings.saved_view_config']).toBe('Layouts');
		expect(es['settings.saved_view_config']).toBe('Diseños');
		expect(en['settings.badge_colors']).toBe('Colored cell badges');
		expect(es['settings.badge_colors']).toBe('Badges de celda con color');
		expect(en).not.toHaveProperty('settings.language');
		expect(es).not.toHaveProperty('settings.language');
		expect(DEFAULT_SETTINGS.language).toBe('auto');
		expect(mainSource).toContain('setLanguage(this.settings.language)');
	});

	it('routes the three toolbar controls into one Layout Settings sub-page', () => {
		expect(settingsSource).toContain(
			"private page: 'root' | 'toolbar' | 'floating-toc' | 'files-hover' = 'root'",
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
		expect(navbarFiltersSource).toContain("files: ['name', 'ext', 'nested']");
		expect(navbarFiltersSource).toContain("count: 'viewmode.pill.prop_count'");
		expect(navbarFiltersSource).toContain("labelKey: 'sort.by.props'");
		expect(
			popupViewSource.match(
				/\{ id: 'count', labelKey: 'viewmode\.pill\.prop_count', defaultOn: false \}/g,
			),
		).toHaveLength(3);
		expect(popupViewSource).toContain(
			'initialPills\n\t\t\t\t? new Set(initialPills)',
		);
	});
});
