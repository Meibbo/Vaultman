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

	it('publishes the Content query as a pending filter before async search results settle', () => {
		expect(pageFiltersSource).toContain('onContentFilterChanged');
		expect(pageFiltersSource).toContain(
			'plugin.filterService.setContentSearchPending(find)',
		);
		expect(pageFiltersSource).toContain('onContentFilterChanged?.()');
		expect(frameSource).toContain('onContentFilterChanged={refreshFiles}');
	});

	it('uses one Content scope summary for the preview file count and active-filter context', () => {
		expect(pageFiltersSource).toContain('contentScopeSummary');
		expect(pageFiltersSource).toContain('contentPreviewFileCount');
		expect(pageFiltersSource).toContain('contentHasActiveNonContentFilters');
		expect(pageFiltersSource).toContain(
			'contentScopeSummary.resultFileCount ?? contentScopeSummary.baseFileCount',
		);
		expect(tabContentSource).toContain('contentPreviewFileCount');
		expect(tabContentSource).toContain('contentHasActiveNonContentFilters');
		expect(tabContentSource).toContain("translate('content.with_active_filters')");
		expect(tabContentSource).not.toContain(
			'contentPreviewResult.files.length +',
		);
	});

	it('shows the active-filters hint only in the header, as link text', () => {
		// Regression: it had become a button repeated on every content node.
		expect(tabContentSource).toContain('vaultman-content-filter-link');
		expect(tabContentSource).not.toContain('vaultman-content-filter-context');
		// The link lives next to the match/file count in the preview header, and
		// the per-node file title no longer carries it.
		const perNode = tabContentSource.slice(
			tabContentSource.indexOf('{fileResult.file.path}'),
		);
		expect(perNode).not.toContain("translate('content.with_active_filters')");
	});

	it('does not render the old Content scope hint row', () => {
		expect(tabContentSource).not.toContain('contentScopeHint');
		expect(tabContentSource).not.toContain('vaultman-content-scope-hint');
		expect(pageFiltersSource).not.toContain('{contentScopeHint}');
	});

	it('clears Content search state when active filters are cleared', () => {
		expect(frameSource).toContain('filtersClearRevision');
		expect(frameSource).toContain('filtersClearRevision += 1');
		expect(pageFiltersSource).toContain('clearFiltersRevision');
		expect(pageFiltersSource).toContain('clearContentSearchState()');
		expect(pageFiltersSource).toContain("contentFind = ''");
		expect(pageFiltersSource).toContain("contentReplace = ''");
		expect(pageFiltersSource).toContain(
			'plugin.filterService.setContentSearchRule(\'\', [])',
		);
		expect(frameSource).toContain('() => clearActiveFilters(),');
	});
});
