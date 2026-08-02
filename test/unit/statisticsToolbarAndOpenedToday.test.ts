import { describe, expect, it } from 'vitest';

import {
	countOpenedSince,
	startOfDay,
} from '../../src/logic/logicLastOpened';
import { dataTabForStatisticsCard } from '../../src/logic/logicStatisticsNavigation';
import statisticsSource from '../../src/components/pages/pageStatistics.svelte?raw';
import filtersSource from '../../src/components/pages/pageFilters.svelte?raw';
import serviceSource from '../../src/services/serviceLastOpened.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';

describe('statistics toolbar parity + opened-today card', () => {
	it('matches the explorer toolbar tab labels and icons', () => {
		// The stat tabs must use the same filter.tab.* labels + icons as the
		// real explorer toolbar, not the old nav.* names / different icons.
		const tabBlock = statisticsSource.slice(
			statisticsSource.indexOf('statsTabOptions'),
			statisticsSource.indexOf('function iconAction'),
		);
		expect(tabBlock).toContain("translate('filter.tab.files')");
		expect(tabBlock).toContain("translate('filter.tab.props')");
		expect(tabBlock).toContain("translate('filter.tab.tags')");
		expect(tabBlock).toContain("translate('filter.tab.content')");
		expect(tabBlock).toContain("'lucide-folder'");
		expect(tabBlock).toContain("'lucide-file-search'");
		expect(statisticsSource).not.toContain("icon: 'lucide-folder-tree'");
		expect(statisticsSource).not.toContain("icon: 'lucide-bar-chart-2'");
		// And the explorer toolbar it mirrors really uses those.
		expect(filtersSource).toContain("label: translate('filter.tab.files')");
		expect(tabBlock.indexOf("id: 'files'")).toBeLessThan(
			tabBlock.indexOf("id: 'statistics'"),
		);
		expect(statisticsSource).toContain('tabMenuActions: statsTabMenuActions');
		expect(statisticsSource).toContain("id: 'filters'");
		expect(statisticsSource).toContain("id: 'queue'");
	});

	it('publishes the requested provider before Filters reclaims the toolbar', () => {
		// The handoff is synchronous: it selects the provider, opens a Scene
		// generation for it, and only then switches the page. Publication rides
		// that generation, so it never waits on a tick and never forces a flush.
		expect(frameSource).not.toContain('async function navigateToDataTab');
		const handoff = frameSource.slice(
			frameSource.indexOf('function navigateToDataTab'),
			frameSource.indexOf('async function waitForFrameDom'),
		);
		const selectProvider = handoff.indexOf('filtersActiveTab = tab;');
		const publishProvider = handoff.indexOf('sceneController.begin(tab)');
		const activateFilters = handoff.indexOf("activePage = 'filters';");
		expect(selectProvider).toBeGreaterThanOrEqual(0);
		expect(publishProvider).toBeGreaterThan(selectProvider);
		expect(activateFilters).toBeGreaterThan(publishProvider);
		expect(handoff).not.toContain('await tick();');
		expect(handoff).not.toContain('flushSync');
	});

	it('counts files opened since a moment', () => {
		const record = { a: 1000, b: 2000, c: 500 };
		expect(countOpenedSince(record, 1000)).toBe(2);
		expect(countOpenedSince(record, 3000)).toBe(0);
		expect(countOpenedSince({}, 0)).toBe(0);
	});

	it('startOfDay is local midnight of its instant', () => {
		const noon = new Date(2026, 5, 15, 12, 30).getTime();
		const midnight = new Date(2026, 5, 15, 0, 0, 0, 0).getTime();
		expect(startOfDay(noon)).toBe(midnight);
	});

	it('adds an Opened today card wired to the last-opened service', () => {
		expect(statisticsSource).toContain("id: 'opened-today'");
		expect(statisticsSource).toContain('plugin.lastOpenedService.openedTodayCount()');
		expect(statisticsSource).toContain("translate('stats.opened_today')");
		expect(serviceSource).toContain('openedTodayCount(');
		// The card navigates somewhere valid.
		expect(dataTabForStatisticsCard('opened-today')).toBe('files');
	});
});
