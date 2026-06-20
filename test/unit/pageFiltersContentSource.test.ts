import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';

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
		expect(pageFiltersSource).toContain('contentSearchCandidateFiles()');
		expect(pageFiltersSource).toContain('applyContentViewFilters');
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

	it('counts current view filters in displayed scope counters', () => {
		expect(frameSource).toContain('activeFilterViewStates().length');
		expect(frameSource).toContain('displayedFilterRuleCount');
		expect(frameSource).toContain('displayedFilteredCount');
		expect(frameSource).toContain('contentScopeFilteredCount');
		expect(pageFiltersSource).toContain('contentScopeFilteredCount');
		expect(pageFiltersSource).toContain('contentScopeTotalCount');
		expect(pageFiltersSource).toContain('contentScopeFilterCount');
	});

	it('opens Filters from the Content scope hint', () => {
		expect(tabContentSource).toContain('onOpenFilters');
		expect(tabContentSource).toContain(
			'class="vaultman-content-scope-hint"',
		);
		expect(tabContentSource).toContain('onclick={() => onOpenFilters?.()}');
		expect(pageFiltersSource).toContain('{onOpenFilters}');
	});
});
