import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';

describe('settings change rendering boundary (BT5-001)', () => {
	it('refreshes reactive settings without remounting the explorer pages', () => {
		const callback = frameSource.match(
			/const unsubscribeSettings = plugin\.onSettingsChange\(\(\) => \{([\s\S]*?)\n\t\t\}\);/,
		)?.[1];

		expect(callback).toBeDefined();
		expect(callback).toContain('settingsRevision += 1;');
		expect(callback).not.toContain('pageRenderKey');
		expect(frameSource).not.toContain('{#key settingsRevision}');
		const statisticsProps = frameSource.match(
			/<StatisticsPage([\s\S]*?)\/>/,
		)?.[1];
		expect(statisticsProps).toBeDefined();
		expect(statisticsProps).toContain('{settingsRevision}');
	});

	it('still remounts pages when their order actually changes', () => {
		const reorderHandler = frameSource.match(
			/function onPillPointerUp\([\s\S]*?\n\t\}/,
		)?.[0];

		expect(reorderHandler).toBeDefined();
		expect(reorderHandler).toContain('pageRenderKey++');
	});
});
