import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import navbarTabsSource from '../../src/components/layout/navbarTabs.svelte?raw';
import snippetsPanelSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsPanelSource from '../../src/components/containers/explorerPlugins.ts?raw';
import menuTypesSource from '../../src/types/typeCMenu.ts?raw';

describe('Snippets and Plugins explorer tabs source guards', () => {
	it('registers both lazy-mounted tabs in the frame and Data page', () => {
		expect(frameSource).toContain("'snippets'");
		expect(frameSource).toContain("'plugins'");
		expect(pageFiltersSource).toContain("import SnippetsTab from './tabSnippets.svelte'");
		expect(pageFiltersSource).toContain("import PluginsTab from './tabPlugins.svelte'");
		expect(pageFiltersSource).toContain("filtersActiveTab === 'snippets'");
		expect(pageFiltersSource).toContain("filtersActiveTab === 'plugins'");
		expect(navbarTabsSource).toContain("'snippets'");
		expect(navbarTabsSource).toContain("'plugins'");
	});

	it('exposes safe toggle actions without allowing Vaultman to disable itself', () => {
		expect(snippetsPanelSource).toContain('setCssSnippetEnabled');
		expect(pluginsPanelSource).toContain('setCommunityPluginEnabled');
		expect(pluginsPanelSource).toContain('meta.isVaultman');
		expect(pluginsPanelSource).toContain('addons.plugins.self_protected');
		expect(menuTypesSource).toContain("| 'snippet'");
		expect(menuTypesSource).toContain("| 'plugin'");
	});
});
