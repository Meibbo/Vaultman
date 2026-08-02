import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import hostSource from '../../src/components/layout/navbarPanelWidgetHost.svelte?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import opsPageSource from '../../src/components/pages/pageOps.svelte?raw';
import statisticsPageSource from '../../src/components/pages/pageStatistics.svelte?raw';

describe('Scene-owned Navbar panelWidget source guards', () => {
	it('mounts one stable panelWidget host in the Scene frame', () => {
		expect(frameSource.match(/<NavbarPanelWidgetHost/g)).toHaveLength(1);
		expect(frameSource).not.toContain('{#key activePage}');
		expect(hostSource).toContain('PANEL_WIDGET_HOST_ID');
		expect(hostSource).toContain('data-panel-widget-host-id');
		expect(frameSource).not.toContain('publishFiltersPanelWidgetState');
		expect(frameSource).not.toContain('publishStatisticsPanelWidgetState');
		expect(frameSource).not.toContain('filtersPanelWidgetState');
		expect(frameSource).not.toContain('statisticsPanelWidgetState');
		expect(frameSource).toContain('ScenePanelWidgetController');
	});

	it('rebinds the renderer atomically when Scene provider ownership changes', () => {
		expect(hostSource).not.toContain('{#key');
		expect(hostSource).toContain('<NavbarFilters {...mountedState} />');
	});

	it('does not wait on tick() before publishing provider navigation', () => {
		const navigation =
			frameSource.match(
				/function navigateToDataTab\([\s\S]*?\n\t\}/,
			)?.[0] ?? '';
		expect(navigation).not.toBe('');
		expect(navigation).not.toContain('await tick();');
	});

	it('keeps provider pages from mounting renderer instances', () => {
		for (const source of [filtersPageSource, statisticsPageSource, opsPageSource]) {
			expect(source).not.toContain('import NavbarFilters');
			expect(source).not.toContain('<NavbarFilters');
		}
	});

	it('depends on Scene ports instead of concrete Explorer panels', () => {
		expect(navbarSource).not.toContain("from '../containers/explorerFiles'");
		expect(navbarSource).not.toContain("from '../containers/explorerProps'");
		expect(navbarSource).not.toContain("from '../containers/explorerTags'");
		expect(navbarSource).toContain('PanelWidgetFilesExplorerPort');
		expect(navbarSource).toContain('PanelWidgetTreeExplorerPort');
		expect(navbarSource).toContain('actionPort.invoke({');
	});
});
