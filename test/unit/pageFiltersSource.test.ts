import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('pageFilters tab switching source guard', () => {
	it('does not transition active tab content in document flow', () => {
		expect(pageFiltersSource).not.toContain("from 'svelte/transition'");
		expect(pageFiltersSource).not.toContain('in:fade');
		expect(pageFiltersSource).not.toContain('out:fade');
	});

	it('keeps visited explorer tabs mounted instead of remounting on every tab switch', () => {
		expect(pageFiltersSource).toContain('visitedTabs');
		expect(pageFiltersSource).toContain('vaultman-filters-tab-pane');
		expect(pageFiltersSource).not.toContain(
			"{#if filtersActiveTab === 'files'}",
		);
	});

	it('passes each mounted explorer its own tab search state', () => {
		expect(pageFiltersSource).toContain('searchTerm={filtersSearchByTab.tags}');
		expect(pageFiltersSource).toContain(
			'searchTerm={filtersSearchByTab.props}',
		);
		expect(pageFiltersSource).not.toContain('searchTerm={filtersSearch}');
	});

	it('marks externally activated tabs as visited so routed statistics cards mount their explorers', () => {
		expect(pageFiltersSource).toContain('ensureActiveTabVisited');
		expect(pageFiltersSource).toContain(
			'ensureActiveTabVisited(filtersActiveTab)',
		);
		expect(pageFiltersSource).toContain(
			"visitedTabs.props || filtersActiveTab === 'props'",
		);
	});

	it('adds Statistics to the dock-off Data tabs menu before Filters and Queue actions', () => {
		expect(pageFiltersSource).toContain("id: 'statistics'");
		expect(pageFiltersSource).toContain("label: translate('nav.statistics')");
		expect(pageFiltersSource).toContain('onOpenStatistics');
	});

	it('moves Content sort and expand controls into the filters header actions after the tab menu', () => {
		expect(pageFiltersSource).toContain('contentHeaderActions');
		expect(pageFiltersSource).toContain('openContentSortMenu');
		expect(pageFiltersSource).toContain('toggleAllContentFiles');
		// The published header actions are composed now — an operation mode adds
		// its own — but the Content controls still reach them, and still lead.
		const published = pageFiltersSource.slice(
			pageFiltersSource.indexOf('headerActions: '),
		);
		expect(published).toMatch(/^headerActions: \[\.\.\.contentHeaderActions/);
	});

	it('projects Text Pause, Has/Hasn’t, then Sort in canonical panelWidget order', () => {
		const pause = pageFiltersSource.indexOf("id: 'content-pause'");
		const has = pageFiltersSource.indexOf("id: 'content-has'");
		const sort = pageFiltersSource.indexOf("id: 'content-sort'");

		expect(pause).toBeGreaterThan(-1);
		expect(has).toBeGreaterThan(pause);
		expect(sort).toBeGreaterThan(has);
		expect(pageFiltersSource).toContain(
			'contentIsExclusion = !contentIsExclusion;',
		);
	});

	it('adds a Content header action to reveal the active file in results', () => {
		expect(pageFiltersSource).toContain('revealActiveContentFile');
		expect(pageFiltersSource).toContain("id: 'content-reveal'");
		expect(pageFiltersSource).toContain("icon: 'lucide-gallery-vertical'");
		expect(pageFiltersSource).toContain('contentRevealRevision');
	});

	it('passes Content scope counters and filter launcher into the Content tab', () => {
		expect(pageFiltersSource).toContain('contentScopeFilteredCount');
		expect(pageFiltersSource).toContain('contentScopeTotalCount');
		expect(pageFiltersSource).toContain('contentScopeFilterCount');
		expect(pageFiltersSource).toContain('{onOpenFilters}');
	});

	it('passes the reactive Files tools-menu preference into the explorer toolbar', () => {
		expect(pageFiltersSource).toContain('const toolbarToolsMenu = $derived.by');
		expect(pageFiltersSource).toContain(
			'plugin.settings.toolbarToolsMenu === true',
		);
		expect(pageFiltersSource).toContain('toolbarToolsMenu,');
		expect(pageFiltersSource).toContain('frameWidth = 0');
		expect(pageFiltersSource).toContain('frameWidth,');
	});
});
