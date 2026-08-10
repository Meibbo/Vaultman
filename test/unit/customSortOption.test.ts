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
			isSortOptionVisible('custom', { ...context, revealActive: false }),
		).toBe(false);
		expect(
			isSortOptionVisible('custom', { ...context, revealActive: true }),
		).toBe(true);
		// It does not gate anything else.
		expect(isSortOptionVisible('name', context)).toBe(true);
	});

	it('appears in the menu only when the surface reports reveal', () => {
		const state = normalizeExplorerSortState('props', null);
		const idsWithout = visibleSortOptions('props', state, true).map(
			(o) => o.id,
		);
		const idsWith = visibleSortOptions('props', state, true, true).map(
			(o) => o.id,
		);

		expect(idsWithout).not.toContain('custom');
		expect(idsWith).toContain('custom');
		// Nothing else moves in or out with it.
		expect(idsWith.filter((id) => id !== 'custom')).toEqual(idsWithout);
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
