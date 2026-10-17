import { describe, expect, it } from 'vitest';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import pageStatisticsSource from '../../src/components/pages/pageStatistics.svelte?raw';
import navbarTabsSource from '../../src/components/layout/navbarTabs.svelte?raw';
import { GOTO_ICONS } from '../../src/logic/logicSasiSceneActions';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';

describe('SettingScene icon polish', () => {
	it('uses lucide-settings for the plugins/settings scene tab and menu', () => {
		expect(pageFiltersSource).toContain("id: 'plugins',\n\t\t\t\tlabel: translate('filter.tab.plugins'),\n\t\t\t\ticon: 'lucide-settings',");
		expect(pageStatisticsSource).toContain("id: 'plugins',\n\t\t\tlabel: translate('filter.tab.plugins'),\n\t\t\ticon: 'lucide-settings',");
		expect(navbarTabsSource).toContain("plugins: 'lucide-settings',");
		expect(GOTO_ICONS.plugins).toBe('lucide-settings');
	});

	it('preserves lucide-plug for individual plugin node fallback in explorerPlugins', () => {
		expect(explorerPluginsSource).toContain("fallback: 'lucide-plug'");
	});
});
