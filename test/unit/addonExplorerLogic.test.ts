import { describe, expect, it } from 'vitest';

import {
	buildAddonHoverInfo,
	filterAddonEntries,
	sortAddonEntries,
} from '../../src/logic/logicAddonExplorer';

const entries = [
	{ name: 'Zeta', installedTime: 10, updatedTime: 40 },
	{ name: 'Alpha', installedTime: 30, updatedTime: 20 },
	{ name: 'Missing' },
];

describe('add-on explorer pure projection', () => {
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
