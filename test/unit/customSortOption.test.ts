import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { SORT_MENU_OPTIONS, visibleSortOptions } from '../../src/logic/logicSortMenu';
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

	it('is offered unconditionally for now, with the reveal gate still plumbed', () => {
		const context = {
			tab: 'props' as const,
			nestedActive: true,
			activeScope: 'properties' as const,
		};
		// The anchoring modes (Current File / Scope drill) are not built yet, so
		// the option is exercised without them. `revealActive` still reaches this
		// function, which is what makes restoring the gate a one-line change.
		expect(isSortOptionVisible('custom', context)).toBe(true);
		expect(isSortOptionVisible('custom', { ...context, revealActive: true })).toBe(
			true,
		);
		expect(isSortOptionVisible('name', context)).toBe(true);
	});

	it('keeps the reveal signal wired end to end for when the gate returns', () => {
		// pageFilters publishes it, the host spreads it, the navbar forwards it and
		// the popup passes it to the filter. If any link breaks, re-gating would
		// silently hide the option instead of following the mode.
		expect(filtersPageSource).toContain('revealActive: revealingActiveFile');
		expect(navbarSource).toContain('{revealActive}');
		expect(sortPopupSource).toContain('revealActive = false');
	});

	it('appears in the sort row for both node providers', () => {
		const state = normalizeExplorerSortState('props', null);
		for (const tab of ['props', 'tags'] as const) {
			const ids = visibleSortOptions(tab, state, true).map((option) => option.id);
			expect(ids).toContain('custom');
		}
		const fileIds = visibleSortOptions('files', state, true).map((o) => o.id);
		expect(fileIds).not.toContain('custom');
	});

	it('leaves the projected order untouched in both node providers', () => {
		// The projection already arrives in the note's order, so the comparator's
		// job is to not re-sort it. The sort is stable, so returning 0 preserves
		// the sequence exactly — for properties and for each property's values.
		for (const source of [propsExplorerSource, tagsExplorerSource]) {
			expect(source).toMatch(
				/normalizedSortBy === 'custom'\) return 0;/,
			);
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
