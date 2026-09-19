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
				tab: 'theme',
				page: 'Appearance',
				pagePath: 'Appearance',
				tabNameMatch: [[0, 5]],
				bestScore: 12,
				results: [
					{
						entry: {
							tab: 'theme',
							definition: 'Accent color',
							page: 'Appearance',
							pagePath: 'Appearance',
						},
						nameMatch: [[0, 6]],
						descMatch: [],
						score: 12,
					},
				],
			},
			{
				tab: 'calendar',
				page: 'General',
				pagePath: 'General',
				tabNameMatch: [],
				bestScore: 4,
				results: [
					{
						entry: {
							tab: 'calendar',
							definition: 'Week start',
							page: 'General',
							pagePath: 'General',
						},
						nameMatch: [],
						descMatch: [[5, 10]],
						score: 4,
					},
				],
			},
		];
		const app = nativeApp(() => payload);
		const groups = queryNativeSettingsSearch(app, 'e');
		expect(groups).toHaveLength(2);
		expect(groups[0]?.tab).toBe('theme');
		expect(groups[0]?.results).toHaveLength(1);
		expect(groups[0]?.results[0]?.entry.definition).toBe('Accent color');
		expect(groups[0]?.results[0]?.nameMatch).toEqual([{ start: 0, end: 6 }]);
		expect(groups[0]?.bestScore).toBe(12);
		expect(groups[1]?.tab).toBe('calendar');
		expect(groups[1]?.results[0]?.score).toBe(4);
	});

	it('drops malformed groups and items instead of failing', () => {
		const app = nativeApp(() => [
			null,
			'nope',
			{ tab: 'theme', results: [{ nameMatch: [], score: 1 }, null] },
			{
				tab: 'editor',
				page: 'Display',
				pagePath: 'Display',
				tabNameMatch: [],
				bestScore: 2,
				results: [
					{
						entry: {
							tab: 'editor',
							definition: 'Font size',
							page: 'Display',
							pagePath: 'Display',
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
		expect(groups[0]?.tab).toBe('theme');
		expect(groups[0]?.results).toEqual([]);
		expect(groups[1]?.results[0]?.entry.definition).toBe('Font size');
	});

	it('returns no rows when native answers a non-array', () => {
		const app = nativeApp(() => ({ groups: [] }));
		expect(queryNativeSettingsSearch(app, 'theme')).toEqual([]);
	});
});
