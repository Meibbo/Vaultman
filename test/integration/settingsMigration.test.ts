import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import type { App } from 'obsidian';
import type { VaultmanSettings } from '../../src/types/typeSettings';

interface ExtendedApp extends App {
	plugins: {
		plugins: Record<
			string,
			{
				settings?: VaultmanSettings;
				saveSettings?: () => Promise<void>;
			}
		>;
	};
}

// NOTE: Full Svelte mount/unmount round-trip requires E2E (wdio) because
// SettingsUI.svelte needs to be accessible inside the Obsidian window context.
// This suite verifies the data-layer invariant: saveSettings() is idempotent
// and does not mutate or corrupt the stored settings object.
describe('settings migration', () => {
	it('saveSettings() preserves all existing field values', async () => {
		const result = await evalInObsidian({
			fn: async ({ app }) => {
				const ext = app as ExtendedApp;
				const plugin = ext.plugins.plugins.vaultman;
				if (!plugin?.settings || !plugin.saveSettings) {
					return { ok: false, reason: 'plugin not loaded' };
				}

				// Snapshot before
				const before = JSON.stringify(plugin.settings);

				// Save (simulates what the $effect does in SettingsUI)
				await plugin.saveSettings();

				// Snapshot after
				const after = JSON.stringify(plugin.settings);

				if (before !== after) {
					return { ok: false, reason: `settings changed: ${before} → ${after}` };
				}
				return { ok: true, reason: '' };
			},
		});

		expect(result.ok).toBe(true);
	});

	it('settings object has all required fields after load', async () => {
		const result = await evalInObsidian({
			fn: ({ app }) => {
				const ext = app as ExtendedApp;
				const plugin = ext.plugins.plugins.vaultman;
				if (!plugin?.settings) return { ok: false, missing: ['plugin not loaded'] };

				const required: (keyof VaultmanSettings)[] = [
					'defaultPropertyType',
					'filterTemplates',
					'sessionFilePath',
					'explorerCtrlClickSearch',
					'explorerShowQueuePreview',
					'explorerContentSearch',
					'explorerOperationScope',
					'explorerFilesShowHidden',
					'explorerFilesFoldersFirst',
					'openMode',
					'pageOrder',
					'separatePanes',
					'filtersShowTabLabels',
					'contextMenuShowInFileMenu',
					'contextMenuShowInEditorMenu',
					'contextMenuShowInMoreOptions',
					'contextMenuHideRules',
				];

				const missing = required.filter((k) => plugin.settings![k] === undefined);
				return { ok: missing.length === 0, missing };
			},
		});

		expect(result.ok).toBe(true);
	});
});
