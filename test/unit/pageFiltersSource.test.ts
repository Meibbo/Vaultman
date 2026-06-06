import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('pageFilters tab switching source guard', () => {
	it('does not transition active tab content in document flow', () => {
		expect(pageFiltersSource).not.toContain("from 'svelte/transition'");
		expect(pageFiltersSource).not.toContain('in:fade');
		expect(pageFiltersSource).not.toContain('out:fade');
	});
});
