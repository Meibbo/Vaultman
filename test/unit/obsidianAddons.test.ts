import { describe, expect, it, vi } from 'vitest';

import {
	listCommunityPluginEntries,
	listCssSnippetEntries,
	setCommunityPluginEnabled,
	setCssSnippetEnabled,
} from '../../src/utils/obsidianAddons';

describe('Obsidian add-on adapters', () => {
	it('lists and normalizes CSS snippets from the internal custom CSS service', async () => {
		const app = {
			customCss: {
				snippets: ['zeta.css', 'alpha', 'alpha'],
				enabledSnippets: new Set(['folder/alpha.css']),
			},
		} as never;

		await expect(listCssSnippetEntries(app)).resolves.toEqual([
			{ name: 'alpha', enabled: true },
			{ name: 'zeta', enabled: false },
		]);
	});

	it('falls back to the vault adapter when the internal list is unavailable', async () => {
		const configDir = 'custom-config';
		const list = vi.fn(async () => ({
			files: [
				`${configDir}/snippets/cards.css`,
				`${configDir}/snippets/readme.md`,
			],
			folders: [],
		}));
		const app = {
			customCss: { enabledSnippets: new Set(['cards']) },
			vault: { configDir, adapter: { list } },
		} as never;

		await expect(listCssSnippetEntries(app)).resolves.toEqual([
			{ name: 'cards', enabled: true },
		]);
		expect(list).toHaveBeenCalledWith(`${configDir}/snippets`);
	});

	it('toggles snippets through the compatible internal API surface', async () => {
		const setCssEnabledStatus = vi.fn(async () => {});
		const requestLoadSnippets = vi.fn(async () => {});
		const app = {
			customCss: { setCssEnabledStatus, requestLoadSnippets },
		} as never;

		await expect(setCssSnippetEnabled(app, 'cards', true)).resolves.toBe(true);
		expect(setCssEnabledStatus).toHaveBeenCalledWith('cards', true);
		expect(requestLoadSnippets).toHaveBeenCalledOnce();
	});

	it('lists community plugin metadata and uses persistent toggle methods', async () => {
		const enablePluginAndSave = vi.fn(async () => {});
		const disablePluginAndSave = vi.fn(async () => {});
		const app = {
			plugins: {
				manifests: {
					zeta: { id: 'zeta', name: 'Zeta', version: '1.0.0' },
					alpha: { id: 'alpha', name: 'Alpha', author: 'A' },
				},
				enabledPlugins: new Set(['alpha']),
				plugins: { alpha: { _loaded: true } },
				enablePluginAndSave,
				disablePluginAndSave,
			},
		} as never;

		expect(listCommunityPluginEntries(app)).toEqual([
			expect.objectContaining({ pluginId: 'alpha', enabled: true, loaded: true }),
			expect.objectContaining({ pluginId: 'zeta', enabled: false, loaded: false }),
		]);
		await expect(setCommunityPluginEnabled(app, 'zeta', true)).resolves.toBe(
			true,
		);
		await expect(setCommunityPluginEnabled(app, 'alpha', false)).resolves.toBe(
			true,
		);
		expect(enablePluginAndSave).toHaveBeenCalledWith('zeta');
		expect(disablePluginAndSave).toHaveBeenCalledWith('alpha');
	});
});
