import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import {
	SORT_MENU_OPTIONS,
	visibleSortOptions,
} from '../../src/logic/logicSortMenu';
import { isSortOptionVisible } from '../../src/logic/logicScopedSort';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';
import sortPopupSource from '../../src/components/layout/popupSort.svelte?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';

/**
 * U121-029 — `Custom` sorts by the anchored note's own order: the order its
 * frontmatter declares its properties, and inside each one, its values. It is
 * the first concrete use of that order, which reveal restored, and the seed of
 * the CUSTOM_SORT option meant to reach every scene and provider.
 */
describe('U121-029 Custom sort option', () => {
	it('is offered by the node providers, last in the row', () => {
		for (const tab of ['props', 'tags'] as const) {
			const options = SORT_MENU_OPTIONS[tab];
			const custom = options.at(-1);
			expect(custom?.id).toBe('custom');
			expect(custom?.labelKey).toBe('sort.by.custom');
		}
		// Not offered where there is no note to take an order from.
		expect(SORT_MENU_OPTIONS.files.some((o) => o.id === 'custom')).toBe(false);
	});

	it('exists only while a note is anchored', () => {
		const context = {
			tab: 'props' as const,
			nestedActive: true,
			activeScope: 'properties' as const,
		};
		expect(isSortOptionVisible('custom', context)).toBe(false);
		expect(
			isSortOptionVisible('custom', { ...context, revealActive: true }),
		).toBe(true);
		// It gates nothing else.
		expect(isSortOptionVisible('name', context)).toBe(true);
	});

	it('reaches both menus, so the option is not hidden in one of them', () => {
		// The popup and the native menu render the same option list from the same
		// filter. The native caller omitted the reveal signal, which filtered
		// `custom` out there even while a note was anchored — the option looked
		// broken rather than gated.
		expect(filtersPageSource).toContain('revealActive: revealingActiveFile');
		expect(navbarSource).toContain('{revealActive}');
		expect(navbarSource).toMatch(
			/visibleSortOptions\(\s*activeTab,\s*current,\s*nestedActive,\s*revealActive,\s*\)/,
		);
		expect(sortPopupSource).toContain(
			'visibleSortOptions(activeTab, sortState, nestedActive, revealActive)',
		);
	});

	it('appears in the sort row for both node providers once anchored', () => {
		const state = normalizeExplorerSortState('props', null);
		for (const tab of ['props', 'tags'] as const) {
			expect(
				visibleSortOptions(tab, state, true, false).map((o) => o.id),
			).not.toContain('custom');
			expect(
				visibleSortOptions(tab, state, true, true).map((o) => o.id),
			).toContain('custom');
		}
		expect(
			visibleSortOptions('files', state, true, true).map((o) => o.id),
		).not.toContain('custom');
	});

	it('leaves the projected order untouched in both node providers', () => {
		// The projection already arrives in the note's order, so the comparator's
		// job is to not re-sort it. The sort is stable, so returning 0 preserves
		// the sequence exactly — for properties and for each property's values.
		for (const source of [propsExplorerSource, tagsExplorerSource]) {
			expect(source).toMatch(/normalizedSortBy === 'custom'\) return 0;/);
		}
	});

	it('reaches the sort menu through the surface state', () => {
		expect(sortPopupSource).toContain('revealActive = false');
		expect(sortPopupSource).toContain(
			'visibleSortOptions(activeTab, sortState, nestedActive, revealActive)',
		);
	});

	it('is localized in both languages', () => {
		expect(en['sort.by.custom']).toBeTruthy();
		expect(es['sort.by.custom']).toBeTruthy();
		expect(es['sort.by.custom']).not.toBe(en['sort.by.custom']);
	});
});
