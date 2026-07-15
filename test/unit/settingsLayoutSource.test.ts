import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

describe('Vaultman Settings layout', () => {
	it('renames Action Presets to Operations Presets in both languages', () => {
		expect(en['queue.template.templates']).toBe('Operations Presets');
		expect(es['queue.template.templates']).toBe('Presets de operaciones');
	});

	it('places View Config after Operations Presets and before Style Config', () => {
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
		expect(styleConfigIndex).toBeGreaterThan(viewConfigBodyIndex);
	});

	it('places the Files tools toggle immediately after Show toolbar', () => {
		const showToolbarIndex = settingsSource.indexOf(
			"translate('settings.show_toolbar')",
		);
		const toolsIndex = settingsSource.indexOf(
			"translate('settings.toolbar_tools_menu')",
		);
		const showDockIndex = settingsSource.indexOf(
			"translate('settings.show_dock')",
		);

		expect(toolsIndex).toBeGreaterThan(showToolbarIndex);
		expect(toolsIndex).toBeLessThan(showDockIndex);
	});
});
