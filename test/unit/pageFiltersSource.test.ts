import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('pageFilters tab switching source guard', () => {
	it('does not transition active tab content in document flow', () => {
		expect(pageFiltersSource).not.toContain("from 'svelte/transition'");
		expect(pageFiltersSource).not.toContain('in:fade');
		expect(pageFiltersSource).not.toContain('out:fade');
	});

	it('keeps visited explorer tabs mounted instead of remounting on every tab switch', () => {
		expect(pageFiltersSource).toContain('visitedTabs');
		expect(pageFiltersSource).toContain('vaultman-filters-tab-pane');
		expect(pageFiltersSource).not.toContain(
			"{#if filtersActiveTab === 'files'}",
		);
	});

	it('passes each mounted explorer its own tab search state', () => {
		expect(pageFiltersSource).toContain(
			'searchTerm={filtersSearchByTab.tags}',
		);
		expect(pageFiltersSource).toContain(
			'searchTerm={filtersSearchByTab.props}',
		);
		expect(pageFiltersSource).not.toContain('searchTerm={filtersSearch}');
	});
});
