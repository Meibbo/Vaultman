import { describe, expect, it } from 'vitest';

import {
	nodeTypeFilterPatch,
	nodeTypeFiltersForState,
	normalizeNodeTypeFilters,
	sameNodeTypeFilters,
	toggleNodeTypeFilter,
} from '../../src/logic/logicNodeTypeFilters';

describe('node type multiselect', () => {
	it('loads legacy single-selection sort states', () => {
		expect(
			nodeTypeFiltersForState({
				nodeTypeFilter: 'markdown',
			}),
		).toEqual(['markdown']);
	});

	it('prefers the new array state and normalizes duplicates/all', () => {
		expect(normalizeNodeTypeFilters(['text', 'all', 'date', 'text'])).toEqual([
			'date',
			'text',
		]);
		expect(
			nodeTypeFiltersForState({
				nodeTypeFilter: 'legacy',
				nodeTypeFilters: [],
			}),
		).toEqual([]);
	});

	it('toggles independent types while All clears the selection', () => {
		const first = toggleNodeTypeFilter([], 'text');
		const second = toggleNodeTypeFilter(first, 'date');
		expect(second).toEqual(['date', 'text']);
		expect(toggleNodeTypeFilter(second, 'text')).toEqual(['date']);
		expect(toggleNodeTypeFilter(second, 'all')).toEqual([]);
	});

	it('keeps the legacy scalar only for a single selected type', () => {
		expect(nodeTypeFilterPatch(['text'])).toEqual({
			nodeTypeFilter: 'text',
			nodeTypeFilters: ['text'],
		});
		expect(nodeTypeFilterPatch(['text', 'date']).nodeTypeFilter).toBeNull();
		expect(sameNodeTypeFilters(['text', 'date'], ['date', 'text'])).toBe(true);
	});
});
