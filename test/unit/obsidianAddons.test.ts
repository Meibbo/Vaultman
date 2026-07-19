import { describe, expect, it, vi } from 'vitest';

import {
	communityPluginStateSignature,
	cssSnippetStateSignature,
	listCommunityPluginEntries,
	listCssSnippetEntries,
	pluginRibbonItem,
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
			vault: { configDir: 'vault-config', adapter: {} },
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

	it('loads snippet installed and updated times from the CSS file stat', async () => {
		const stat = vi.fn(async () => ({ ctime: 10, mtime: 20 }));
		const app = {
			customCss: { snippets: ['cards'] },
			vault: {
				configDir: 'vault-config',
				adapter: { stat },
			},
		} as never;

		await expect(listCssSnippetEntries(app)).resolves.toEqual([
			{
				name: 'cards',
				enabled: false,
				installedTime: 10,
				updatedTime: 20,
			},
		]);
		expect(stat).toHaveBeenCalledWith('vault-config/snippets/cards.css');
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
			vault: { configDir: 'vault-config', adapter: {} },
		} as never;

		await expect(listCommunityPluginEntries(app)).resolves.toEqual([
			expect.objectContaining({
				pluginId: 'alpha',
				enabled: true,
				loaded: true,
			}),
			expect.objectContaining({
				pluginId: 'zeta',
				enabled: false,
				loaded: false,
			}),
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

	it('loads plugin installed and updated times from each manifest stat', async () => {
		const stat = vi.fn(async () => ({ ctime: 30, mtime: 40 }));
		const app = {
			plugins: {
				manifests: { alpha: { id: 'alpha', name: 'Alpha' } },
			},
			vault: {
				configDir: 'vault-config',
				adapter: { stat },
			},
		} as never;

		await expect(listCommunityPluginEntries(app)).resolves.toEqual([
			expect.objectContaining({
				pluginId: 'alpha',
				installedTime: 30,
				updatedTime: 40,
			}),
		]);
		expect(stat).toHaveBeenCalledWith(
			'vault-config/plugins/alpha/manifest.json',
		);
	});
});

describe('external state signatures (BT4-006)', () => {
	it('captures plugin id/enabled membership without touching the filesystem', () => {
		const app = {
			plugins: {
				manifests: {
					alpha: { id: 'alpha', name: 'Alpha' },
					beta: { id: 'beta', name: 'Beta' },
				},
				enabledPlugins: new Set(['beta']),
			},
			vault: { configDir: 'vault-config' },
		};
		const before = communityPluginStateSignature(app as never);
		app.plugins.enabledPlugins.add('alpha');
		const after = communityPluginStateSignature(app as never);

		expect(before).toContain('alpha:0');
		expect(before).toContain('beta:1');
		expect(after).toContain('alpha:1');
		expect(before).not.toBe(after);
	});

	it('captures snippet name/enabled membership', () => {
		const app = {
			customCss: {
				snippets: ['rainbow', 'spacing'],
				enabledSnippets: new Set(['rainbow']),
			},
			vault: { configDir: 'vault-config' },
		};
		const before = cssSnippetStateSignature(app as never);
		app.customCss.enabledSnippets.delete('rainbow');
		const after = cssSnippetStateSignature(app as never);

		expect(before).toContain('rainbow:1');
		expect(before).toContain('spacing:0');
		expect(after).toContain('rainbow:0');
		expect(before).not.toBe(after);
	});
});

describe('plugin-emitted ribbon icons (BT4-011 / D35)', () => {
	it('finds the first ribbon action a plugin registered', () => {
		const app = {
			workspace: {
				leftRibbon: {
					items: [
						{ id: 'other:Something', icon: 'lucide-x' },
						{ id: 'vaultman:Open Vaultman', icon: 'lucide-vault' },
						{ id: 'vaultman:Second', icon: 'lucide-2' },
					],
				},
			},
			vault: { configDir: 'vault-config' },
		};
		expect(pluginRibbonItem(app as never, 'vaultman')).toEqual({
			id: 'vaultman:Open Vaultman',
			icon: 'lucide-vault',
		});
		expect(pluginRibbonItem(app as never, 'missing')).toBeNull();
	});
});
