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

	it('publishes Statistics into the Scene-owned panelWidget host', () => {
		expect(statisticsPageSource).not.toContain('import NavbarFilters');
		const projection = statisticsPageSource.slice(
			statisticsPageSource.indexOf(
				'const state: NavbarPanelWidgetState = {',
			),
			statisticsPageSource.indexOf('onPanelWidgetStateChange?.(state)'),
		);
		expect(projection).not.toBe('');
		expect(projection).toContain("providerId: 'statistics'");
		expect(projection).toContain('statsTabOptions');
		expect(projection).toContain("activeSectionTab: 'statistics'");
		expect(projection).toContain('showExplorerControls: false');
		expect(projection).toContain('onSectionTabChange: navigateFromHeader');
		// The page owns no host: it hands one projection to the Scene, tagged
		// with the owner triple, and releases it when that owner is torn down.
		expect(statisticsPageSource).toContain('onPanelWidgetStateChange?.(state)');
		const publication = statisticsPageSource.slice(
			statisticsPageSource.indexOf('if (sceneInstanceId && generation) {'),
		);
		expect(publication).toContain('sceneInstanceId,');
		expect(publication).toContain("providerId: 'statistics'");
		expect(publication).toContain('generation,');
		expect(publication).toContain('onPublishPanelWidget?.({');
		expect(publication).toContain('projection: state,');
		expect(publication).toContain('onClearPanelWidget?.(owner)');
	});
});
