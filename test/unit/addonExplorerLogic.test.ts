import { describe, expect, it, vi } from 'vitest';

import {
	buildAddonHoverInfo,
	filterAddonEntries,
	sortAddonEntries,
} from '../../src/logic/logicAddonExplorer';
import {
	canToggleCommunityPlugin,
	canUninstallCommunityPlugin,
	toggleCommunityPlugin,
} from '../../src/logic/logicAddonCells';

const entries = [
	{ name: 'Zeta', enabled: false, installedTime: 10, updatedTime: 40 },
	{ name: 'Alpha', enabled: true, installedTime: 30, updatedTime: 20 },
	{ name: 'Missing', enabled: false },
];

describe('add-on explorer pure projection', () => {
	it('allows Vaultman to self-disable but never to uninstall itself', async () => {
		const disablePluginAndSave = vi.fn(async () => {});
		const app = { plugins: { disablePluginAndSave } };
		const vaultman = {
			pluginId: 'vaultman',
			name: 'Vaultman',
			enabled: true,
			loaded: true,
			isVaultman: true,
		};

		expect(canToggleCommunityPlugin(vaultman)).toBe(true);
		expect(canUninstallCommunityPlugin(vaultman)).toBe(false);
		await expect(toggleCommunityPlugin(app as never, vaultman)).resolves.toBe(
			true,
		);
		expect(disablePluginAndSave).toHaveBeenCalledTimes(1);
		expect(disablePluginAndSave).toHaveBeenCalledWith('vaultman');
	});

	it('sorts name and optional installed/updated timestamps deterministically', () => {
		expect(
			sortAddonEntries(entries, { sortBy: 'name', direction: 'asc' }).map(
				(entry) => entry.name,
			),
		).toEqual(['Alpha', 'Missing', 'Zeta']);
		expect(
			sortAddonEntries(entries, {
				sortBy: 'installed',
				direction: 'desc',
			}).map((entry) => entry.name),
		).toEqual(['Alpha', 'Zeta', 'Missing']);
		expect(
			sortAddonEntries(entries, { sortBy: 'updated', direction: 'asc' }).map(
				(entry) => entry.name,
			),
		).toEqual(['Alpha', 'Zeta', 'Missing']);
	});

	it('filters case-insensitively over provider-supplied searchable text', () => {
		expect(
			filterAddonEntries(entries, 'ALP', (entry) => entry.name).map(
				(entry) => entry.name,
			),
		).toEqual(['Alpha']);
		expect(filterAddonEntries(entries, '  ', (entry) => entry.name)).toEqual(
			entries,
		);
	});

	it('sorts confirmed add-on state descending first and keeps natural Name ties', () => {
		const stateEntries = [
			{ name: 'Plugin 10', enabled: false },
			{ name: 'Vaultman', enabled: false, isVaultman: true },
			{ name: 'Plugin 2', enabled: true },
			{ name: 'Plugin 1', enabled: true },
		];

		expect(
			sortAddonEntries(stateEntries, {
				sortBy: 'state',
				direction: 'desc',
			}).map((entry) => entry.name),
		).toEqual(['Plugin 1', 'Plugin 2', 'Plugin 10', 'Vaultman']);
		expect(
			sortAddonEntries(stateEntries, {
				sortBy: 'state',
				direction: 'asc',
			}).map((entry) => entry.name),
		).toEqual(['Plugin 10', 'Vaultman', 'Plugin 1', 'Plugin 2']);
		expect(stateEntries.map((entry) => entry.enabled)).toEqual([
			false,
			false,
			true,
			true,
		]);
	});

	it('builds labeled hover lines while omitting unavailable metadata', () => {
		expect(
			buildAddonHoverInfo(
				{
					name: 'Alpha',
					installed: '2026-01-02',
					updated: '2026-03-04',
					version: '1.2.3',
				},
				{
					installed: 'Installed',
					updated: 'Updated',
					version: 'Version',
					author: 'Author',
				},
			),
		).toBe('Alpha\nInstalled: 2026-01-02\nUpdated: 2026-03-04\nVersion: 1.2.3');
	});
});
