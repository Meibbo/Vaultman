import type { SasiRegistry } from './logicSasiRegistry';

export const SETTINGS_OPEN_ID = 'vaultman.settings.open';

/**
 * Direct command to open Vaultman settings tab in Obsidian.
 */
export function registerSettingsActions(registry: SasiRegistry): void {
	registry.register({
		id: SETTINGS_OPEN_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'command.open_settings',
		icon: 'lucide-sliders',
		supports: [{ surface: 'command' }, { surface: 'settings' }],
	});
}
