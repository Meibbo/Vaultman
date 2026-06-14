import { describe, expect, it } from 'vitest';

import activeFiltersIslandSource from '../../src/components/layout/islandActiveFilters.ts?raw';

describe('ActiveFiltersIslandComponent source guards', () => {
	it('uses active filter warning copy as the row hover title', () => {
		expect(activeFiltersIslandSource).toContain(
			"row.setAttribute('title', rule.warning ?? rule.description)",
		);
	});
});
