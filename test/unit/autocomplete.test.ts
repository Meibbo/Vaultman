import { describe, expect, it } from 'vitest';

import {
	dedupeSuggestItems,
	excludeSuggestItems,
	normalizeFrontmatterValues,
	PropertySuggest,
} from '../../src/utils/autocomplete';

function makeSuggest(items: string[]): PropertySuggest {
	return new PropertySuggest(
		{} as never,
		{} as never,
		items,
		() => undefined,
	);
}

describe('PropertySuggest native-parity fuzzy matching', () => {
	it('returns the first 20 items on an empty query', () => {
		const items = Array.from({ length: 25 }, (_, i) => `prop-${i}`);
		expect(makeSuggest(items).getSuggestions('')).toEqual(items.slice(0, 20));
	});

	it('matches intermediate fragments the old includes-check missed', () => {
		const suggest = makeSuggest(['status', 'priority', 'project']);
		// 'rj' is a subsequence of 'project' (p-r-o-j) but a substring of none.
		expect(suggest.getSuggestions('rj')).toEqual(['project']);
	});

	it('keeps prefix matches ahead of deeper fuzzy hits', () => {
		const suggest = makeSuggest(['priority', 'project', 'status']);
		const results = suggest.getSuggestions('pro');
		expect(results[0]).toBe('project');
		expect(results).toContain('priority');
	});

	it('caps results at 30', () => {
		const items = Array.from({ length: 40 }, (_, i) => `prop-${i}`);
		expect(makeSuggest(items).getSuggestions('prop')).toHaveLength(30);
	});

	it('matches case-insensitively', () => {
		const suggest = makeSuggest(['Status', 'Priority']);
		expect(suggest.getSuggestions('STATUS')).toEqual(['Status']);
	});

	it('searches native {value, icon} pairs by value and exposes the icon', () => {
		const suggest = new PropertySuggest(
			{} as never,
			{} as never,
			[
				{ value: 'status', icon: 'lucide-text' },
				{ value: 'priority' },
			],
			() => undefined,
		);
		expect(suggest.getSuggestions('stat')).toEqual(['status']);
		expect(suggest.iconFor('status')).toBe('lucide-text');
		expect(suggest.iconFor('priority')).toBeUndefined();
	});
});

describe('propScene-fed suggester helpers', () => {
	it('dedupes case-insensitively keeping the first icon-bearing entry', () => {
		expect(
			dedupeSuggestItems([
				{ value: 'Status', icon: 'lucide-text' },
				'status',
				'Priority',
			]),
		).toEqual([
			{ value: 'Status', icon: 'lucide-text' },
			{ value: 'Priority' },
		]);
	});

	it('upgrades a plain entry when a later duplicate carries an icon', () => {
		expect(dedupeSuggestItems(['status', { value: 'Status', icon: 'lucide-tag' }])).toEqual([
			{ value: 'status', icon: 'lucide-tag' },
		]);
	});

	it('keeps case variants apart for value lists', () => {
		expect(dedupeSuggestItems(['TODO', 'todo'], false).map((i) => i.value)).toEqual([
			'TODO',
			'todo',
		]);
	});

	it('excludes what the note already holds', () => {
		const items = dedupeSuggestItems(['status', 'priority', 'tags']);
		expect(
			excludeSuggestItems(items, new Set(['status', 'tags'])).map((i) => i.value),
		).toEqual(['priority']);
	});

	it('normalizes frontmatter values like the tree rawValues', () => {
		expect(normalizeFrontmatterValues(null)).toEqual(['']);
		expect(normalizeFrontmatterValues([])).toEqual(['']);
		expect(normalizeFrontmatterValues('done')).toEqual(['done']);
		expect(normalizeFrontmatterValues(3)).toEqual(['3']);
		expect(normalizeFrontmatterValues(['a', 'b'])).toEqual(['a', 'b']);
		expect(normalizeFrontmatterValues({ k: 1 })).toEqual(['{"k":1}']);
	});
});
