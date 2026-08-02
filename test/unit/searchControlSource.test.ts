import { describe, expect, it } from 'vitest';
import searchControlSource from '../../src/components/layout/searchControl.svelte?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { readFileSync } from 'node:fs';

//  resolves to an empty string under the CSS pipeline, so the
// stylesheet is read from disk like the other stylesheet guards in this repo.
// Two of the guards below passed vacuously against the empty import first.
const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

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

	// Task 2.1 required the configured clear, category and create ActionCells to
	// be "descendants of that root in both inline and wrapped modes". The guards
	// above never asserted it, and they were green while the cells rendered on
	// their own line for twelve hours.
	it('keeps every trailing control inside the search root', () => {
		const root = searchControlSource.slice(
			searchControlSource.indexOf('class="search-input-container'),
		);
		const closing = root.lastIndexOf('</div>');
		const inside = root.slice(0, closing);
		for (const control of [
			'search-input-clear-button',
			'vaultman-filters-search-mode',
			'vaultman-filters-search-create',
		]) {
			expect(inside).toContain(control);
		}
	});

	it('gives the category and create cells Core’s decorator slot', () => {
		// Core styles `.search-input-container` as `position: relative` only — it
		// is not a flex row. Its trailing controls are absolutely positioned:
		// `.search-input-clear-button` and `.input-right-decorator`, which Core
		// already shifts aside when the clear button appears. A plain child in
		// that container is a block box and lands under the input, which is the
		// defect. So the two cells share one Core decorator rather than sitting
		// loose in the container.
		expect(searchControlSource).toContain('input-right-decorator');
		const decorator = searchControlSource.slice(
			searchControlSource.indexOf('input-right-decorator'),
		);
		const modeAt = decorator.indexOf('vaultman-filters-search-mode');
		const createAt = decorator.indexOf('vaultman-filters-search-create');
		expect(modeAt).toBeGreaterThan(0);
		expect(createAt).toBeGreaterThan(0);
	});

	it('does not reintroduce a hand-rolled flex row on the Core container', () => {
		// Making the container a flex row would fight Core's absolute
		// positioning for the clear button instead of composing with it.
		const pill = stylesSource.slice(
			stylesSource.indexOf('.vaultman-filters-header-search-pill {'),
			stylesSource.indexOf('.vaultman-filters-header-search-pill--row {'),
		);
		expect(pill).not.toContain('display: flex');
	});

	it('reserves room in the input for the decorator it carries', () => {
		expect(stylesSource).toContain('.vaultman-filters-search-decorator');
		const decorator = stylesSource.slice(
			stylesSource.indexOf('.vaultman-filters-search-decorator'),
		);
		expect(decorator).toContain('display: flex');
	});

	it('targets the clear button by the class it actually renders', () => {
		// `.vaultman-filters-search-clear` was never rendered; the component uses
		// Core's `search-input-clear-button`, so the phone sizing rule that named
		// the Vaultman class matched nothing.
		expect(searchControlSource).not.toContain('vaultman-filters-search-clear');
		expect(stylesSource).not.toContain('.vaultman-filters-search-clear');
	});
});
