import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import statisticsPageSource from '../../src/components/pages/pageStatistics.svelte?raw';

describe('active page mounting contract', () => {
	it('mounts only the active page so inactive statistics controls cannot enter Tab order', () => {
		const pageLoop = frameSource.slice(
			frameSource.indexOf('{#each pageOrder as pageId'),
			frameSource.indexOf('\n\t\t</div>', frameSource.indexOf('{#each pageOrder as pageId')),
		);

		expect(pageLoop).toContain('{#if pageId === activePage}');
		expect(pageLoop).toContain('<StatisticsPage');
		expect(pageLoop).toContain('<FiltersPage');
		expect(statisticsPageSource.match(/class="clickable-icon vaultman-stat-card"/g)).toHaveLength(1);
	});
});
