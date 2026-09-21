import { describe, expect, it, vi } from 'vitest';

import {
	isNativeSettingsSearchAvailable,
	queryNativeSettingsSearch,
} from '../../src/services/serviceSettingSearchAdapter';

function nativeApp(search: (query: string) => unknown) {
	return { setting: { searchIndex: { search } } };
}

describe('native settings search adapter availability', () => {
	it.each([
		['missing app', undefined],
		['null app', null],
		['non-object app', 42],
		['missing setting', {}],
		['null setting', { setting: null }],
		['missing searchIndex', { setting: {} }],
		['null searchIndex', { setting: { searchIndex: null } }],
		['missing search', { setting: { searchIndex: {} } }],
		['non-function search', { setting: { searchIndex: { search: 'x' } } }],
	])('reports unavailable for %s', (_label, app) => {
		expect(isNativeSettingsSearchAvailable(app)).toBe(false);
		expect(queryNativeSettingsSearch(app, 'theme')).toEqual([]);
	});

	it('reports available when the native search is a function', () => {
		const app = nativeApp(() => []);
		expect(isNativeSettingsSearchAvailable(app)).toBe(true);
	});
});

describe('native settings search query', () => {
	it('clears without calling native on blank terms (spaces included)', () => {
		const search = vi.fn(() => []);
		const app = nativeApp(search);
		expect(queryNativeSettingsSearch(app, '')).toEqual([]);
		expect(queryNativeSettingsSearch(app, '   ')).toEqual([]);
		expect(search).not.toHaveBeenCalled();
	});

	it('issues a single native search per effective term', () => {
		const search = vi.fn(() => []);
		const app = nativeApp(search);
		queryNativeSettingsSearch(app, 'theme');
		expect(search).toHaveBeenCalledTimes(1);
		expect(search).toHaveBeenCalledWith('theme');
	});

	it('mirrors native groups, items and scores in native order', () => {
		const payload = [
			{
				tab: { id: 'theme', name: 'Theme' },
				page: { id: 'appearance', name: 'Appearance' },
				pagePath: {},
				tabNameMatch: { score: 12, matches: [[0, 5]] },
				bestScore: { score: 12 },
				results: [
					{
						entry: {
							tab: { id: 'theme', name: 'Theme' },
							definition: { name: 'Accent color', desc: 'Accent color' },
							page: { id: 'appearance', name: 'Appearance' },
							pagePath: {},
						},
						nameMatch: { score: 12, matches: [[0, 6]] },
						descMatch: { score: 4, matches: [] },
						score: { score: 12 },
					},
				],
			},
			{
				tab: { id: 'calendar', name: 'Calendar' },
				page: { id: 'general', name: 'General' },
				pagePath: {},
				tabNameMatch: { score: 0, matches: [] },
				bestScore: 4,
				results: [
					{
						entry: {
							tab: { id: 'calendar', name: 'Calendar' },
							definition: { name: 'Week start' },
							page: { id: 'general', name: 'General' },
							pagePath: {},
						},
						nameMatch: { score: 0, matches: [] },
						descMatch: { score: 4, matches: [[5, 10]] },
						score: 4,
					},
				],
			},
			{
				tab: { id: 'empty', name: 'Empty state' },
				page: { name: 'General' },
				pagePath: {},
				tabNameMatch: { score: 1, matches: [[0, 1]] },
				bestScore: { score: 1 },
				results: [],
			},
		];
		const app = nativeApp(() => payload);
		const groups = queryNativeSettingsSearch(app, 'e');
		expect(groups).toHaveLength(3);
		expect(groups[0]?.tab).toBe('theme');
		expect(groups[0]?.results).toHaveLength(1);
		expect(groups[0]?.results[0]?.entry.definition).toBe('Accent color');
		expect(groups[0]?.results[0]?.nameMatch).toEqual([{ start: 0, end: 6 }]);
		expect(groups[0]?.bestScore).toBe(12);
		expect(groups[1]?.tab).toBe('calendar');
		expect(groups[1]?.results[0]?.score).toBe(4);
		expect(groups[2]?.tab).toBe('empty');
		expect(groups[2]?.results).toEqual([]);
	});

	it('keeps the tab id and the visible tab name apart', () => {
		const payload = [
			{
				tab: { id: 'hotkeys', name: 'Hotkeys' },
				page: { id: 'general', name: 'General' },
				pagePath: {},
				tabNameMatch: { score: 1, matches: [[0, 1]] },
				bestScore: { score: 1 },
				results: [],
			},
			{
				tab: 'plain',
				page: { name: 'General' },
				pagePath: {},
				tabNameMatch: { score: 0, matches: [] },
				bestScore: 0,
				results: [],
			},
		];
		const app = nativeApp(() => payload);
		const groups = queryNativeSettingsSearch(app, 'hot');
		expect(groups).toHaveLength(2);
		expect(groups[0]?.tab).toBe('hotkeys');
		expect(groups[0]?.tabName).toBe('Hotkeys');
		expect(groups[0]?.results).toEqual([]);
		expect(groups[0]?.tabNameMatch).toEqual([{ start: 0, end: 1 }]);
		expect(groups[1]?.tab).toBe('plain');
		expect(groups[1]?.tabName).toBe('plain');
	});

	it('drops malformed groups and items instead of failing', () => {
		const app = nativeApp(() => [
			null,
			'nope',
			{ tab: { name: 'Theme' }, results: [{ nameMatch: [], score: 1 }, null] },
			{
				tab: { id: 'editor', name: 'Editor' },
				page: { name: 'Display' },
				pagePath: {},
				tabNameMatch: [],
				bestScore: 2,
				results: [
					{
						entry: {
							tab: { id: 'editor', name: 'Editor' },
							definition: { name: 'Font size' },
							page: { name: 'Display' },
							pagePath: {},
						},
						nameMatch: [],
						descMatch: [],
						score: 2,
					},
				],
			},
		]);
		const groups = queryNativeSettingsSearch(app, 'font');
		expect(groups).toHaveLength(2);
		expect(groups[0]?.tab).toBe('Theme');
		expect(groups[0]?.results).toEqual([]);
		expect(groups[1]?.results[0]?.entry.definition).toBe('Font size');
	});

	it('returns no rows when native answers a non-array', () => {
		const app = nativeApp(() => ({ groups: [] }));
		expect(queryNativeSettingsSearch(app, 'theme')).toEqual([]);
	});
});
