import { describe, expect, it } from 'vitest';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import pageStatisticsSource from '../../src/components/pages/pageStatistics.svelte?raw';

describe('Scene navigation to SASI Registry (apiscene)', () => {
	it('includes apiscene in isFiltersTab guard within pageFilters.svelte', () => {
		const isFiltersTabBlock = pageFiltersSource.slice(
			pageFiltersSource.indexOf('function isFiltersTab(tab: string): tab is FiltersTab {'),
			pageFiltersSource.indexOf('function switchFiltersTab(tab: string) {'),
		);
		expect(isFiltersTabBlock).toContain("tab === 'apiscene'");
		expect(isFiltersTabBlock).toContain("tab === 'files'");
		expect(isFiltersTabBlock).toContain("tab === 'props'");
		expect(isFiltersTabBlock).toContain("tab === 'tags'");
		expect(isFiltersTabBlock).toContain("tab === 'content'");
		expect(isFiltersTabBlock).toContain("tab === 'snippets'");
		expect(isFiltersTabBlock).toContain("tab === 'plugins'");
	});

	it('permits apiscene in navigateFromHeader within pageStatistics.svelte', () => {
		const navigateFromHeaderBlock = pageStatisticsSource.slice(
			pageStatisticsSource.indexOf('function navigateFromHeader(tab: string) {'),
			pageStatisticsSource.indexOf('const panelWidgetActionPort: ScenePanelWidgetActionPort = {'),
		);
		expect(navigateFromHeaderBlock).toContain("tab === 'apiscene'");
		expect(navigateFromHeaderBlock).toContain("onNavigateToDataTab?.(tab as StatisticsDataTab | 'apiscene')");
	});
});
