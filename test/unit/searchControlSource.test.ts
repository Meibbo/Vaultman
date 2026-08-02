import { describe, expect, it } from 'vitest';
import searchControlSource from '../../src/components/layout/searchControl.svelte?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';

describe('SearchControl component source guards', () => {
	it('has one root search-input-container element', () => {
		expect(searchControlSource).toContain('class="search-input-container');
		const match = searchControlSource.match(/class="[^"]*search-input-container[^"]*"/g);
		expect(match).not.toBeNull();
		expect(match).toHaveLength(1);
	});

	it('contains a single text/search input element', () => {
		expect(searchControlSource).toContain('<input');
		const inputs = searchControlSource.match(/<input\b/g);
		expect(inputs).toHaveLength(1);
	});

	it('does not render a second magnifier element or pseudo-element', () => {
		expect(searchControlSource).not.toContain('search-input-icon');
		expect(searchControlSource).not.toContain('lucide-search');
	});

	it('does not automatically close on blur', () => {
		expect(searchControlSource).not.toContain('onblur');
		expect(searchControlSource).not.toContain('onfocusout');
	});

	it('contains no provider-specific imports or code', () => {
		expect(searchControlSource).not.toContain('explorerFiles');
		expect(searchControlSource).not.toContain('explorerProps');
		expect(searchControlSource).not.toContain('explorerTags');
		expect(searchControlSource).not.toContain('filterService');
	});

	it('navbarFilters delegates search rendering to SearchControl component', () => {
		expect(navbarFiltersSource).toContain('import SearchControl');
		expect(navbarFiltersSource).toContain('<SearchControl');
	});
});
