import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('Page filters Content source guards', () => {
	it('does not restart Content search from the result count it changes itself', () => {
		expect(pageFiltersSource).toContain('contentSearchScopeRevision');
		expect(pageFiltersSource).toContain('void contentSearchScopeRevision;');
		expect(pageFiltersSource).not.toContain('void filteredCount;');
	});

	it('uses the vault-wide non-content filter scope as Content search candidates', () => {
		expect(pageFiltersSource).toContain(
			'plugin.filterService.getFilesIgnoringContentSearch(true)',
		);
	});

	it('uses reactive frame counters for dock-off Filters and Queue menu labels', () => {
		expect(pageFiltersSource).toContain('filterRuleCount = 0');
		expect(pageFiltersSource).toContain('queuedCount = 0');
		expect(pageFiltersSource).toContain('count: filterRuleCount');
		expect(pageFiltersSource).toContain('count: queuedCount');
		expect(pageFiltersSource).not.toContain(
			'plugin.filterService.activeFilter.children.length',
		);
		expect(pageFiltersSource).not.toContain('plugin.queueService.queue.length');
	});
});
