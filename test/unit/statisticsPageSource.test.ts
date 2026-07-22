import { describe, expect, it } from 'vitest';

import statisticsPageSource from '../../src/components/pages/pageStatistics.svelte?raw';

describe('Statistics page source guards', () => {
	it('renders Word Count as a statistics grid card that routes to Content', () => {
		expect(statisticsPageSource).toContain(
			"id: 'words' as StatisticsNavigationCard",
		);
		expect(statisticsPageSource).toContain(
			"label: translate('stats.word_count')",
		);
		expect(statisticsPageSource).toContain("icon: 'lucide-type'");
		expect(statisticsPageSource).toContain('value: statsSnapshot.words');
		expect(statisticsPageSource).not.toContain('vaultman-stat-meta-action');
	});

	it('uses Obsidian clickable-icon cards and moves scope into the toolbar menu', () => {
		expect(statisticsPageSource).toContain(
			'class="clickable-icon vaultman-stat-card"',
		);
		expect(statisticsPageSource).not.toContain('vaultman-stat-scope-pill');
		expect(statisticsPageSource).toContain("id: 'statistics-scope'");
		expect(statisticsPageSource).toContain('openScopeMenu');
	});

	it('keeps the shared filters navbar on Statistics with a tabmenu-only configuration', () => {
		expect(statisticsPageSource).toContain('import NavbarFilters');
		expect(statisticsPageSource).toContain('statsTabOptions');
		expect(statisticsPageSource).toContain('activeSectionTab="statistics"');
		expect(statisticsPageSource).toContain('showExplorerControls={false}');
		expect(statisticsPageSource).toContain(
			'onSectionTabChange={navigateFromHeader}',
		);
	});
});
