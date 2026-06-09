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

	it('uses Obsidian clickable-icon semantics instead of selector specificity to keep Statistics controls transparent', () => {
		expect(statisticsPageSource).toContain(
			'class="clickable-icon vaultman-stat-card"',
		);
		expect(statisticsPageSource).toContain(
			'class="clickable-icon vaultman-stat-scope-pill"',
		);
	});
});
