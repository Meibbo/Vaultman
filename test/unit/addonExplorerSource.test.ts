import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import navbarTabsSource from '../../src/components/layout/navbarTabs.svelte?raw';
import snippetsPanelSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsPanelSource from '../../src/components/containers/explorerPlugins.ts?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSortSource from '../../src/components/layout/popupSort.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';
import typeUiSource from '../../src/types/typeUI.ts?raw';
import menuTypesSource from '../../src/types/typeCMenu.ts?raw';
import settingsTypesSource from '../../src/types/typeSettings.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import { cellsForExplorer } from '../../src/logic/logicCellRegistry';
import { expansionActionAvailable } from '../../src/logic/logicTreeExpansion';

describe('Snippets and Plugins explorer tabs source guards', () => {
	it('registers both lazy-mounted tabs in the frame and Data page', () => {
		expect(frameSource).toContain("'snippets'");
		expect(frameSource).toContain("'plugins'");
		expect(pageFiltersSource).toContain(
			"import SnippetsTab from './tabSnippets.svelte'",
		);
		expect(pageFiltersSource).toContain(
			"import PluginsTab from './tabPlugins.svelte'",
		);
		expect(pageFiltersSource).toContain("filtersActiveTab === 'snippets'");
		expect(pageFiltersSource).toContain("filtersActiveTab === 'plugins'");
		expect(navbarTabsSource).toContain("'snippets'");
		expect(navbarTabsSource).toContain("'plugins'");
	});

	it('exposes safe toggle actions while allowing Vaultman to disable itself', () => {
		expect(snippetsPanelSource).toContain('setCssSnippetEnabled');
		expect(pluginsPanelSource).toContain('toggleCommunityPlugin');
		expect(pluginsPanelSource).not.toContain('addons.plugins.self_protected');
		expect(menuTypesSource).toContain("| 'snippet'");
		expect(menuTypesSource).toContain("| 'plugin'");
	});

	it('wires add-ons through the typed toolbar, search, layout, and TOC ports', () => {
		expect(typeUiSource).toContain("| 'snippets'");
		expect(typeUiSource).toContain("| 'plugins'");
		expect(pageFiltersSource).not.toContain('tab as FiltersTab');
		expect(frameSource).toContain('bind:snippetsExplorer');
		expect(frameSource).toContain('bind:pluginsExplorer');
		expect(pageFiltersSource).toContain('bind:panel={snippetsExplorer}');
		expect(pageFiltersSource).toContain('bind:panel={pluginsExplorer}');
		expect(frameSource).toContain("case 'snippets':");
		expect(frameSource).toContain("case 'plugins':");
		expect(navbarFiltersSource).toContain(
			'snippetsExplorer?: AddonExplorerPanelPort',
		);
		expect(navbarFiltersSource).toContain(
			'pluginsExplorer?: AddonExplorerPanelPort',
		);
		expect(snippetsPanelSource).toContain('implements AddonExplorerPanelPort');
		expect(pluginsPanelSource).toContain('implements AddonExplorerPanelPort');
		expect(snippetsPanelSource).toContain('setSearchTerm(');
		expect(pluginsPanelSource).toContain('setSortState(');
		for (const source of [snippetsPanelSource, pluginsPanelSource]) {
			expect(source).toContain('refreshRevision');
			expect(source).toContain('revision !== this.refreshRevision');
		}
	});

	it('offers add-on-specific sorts and configurable cells without expand-all', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(SORT_MENU_OPTIONS[tab]).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ labelKey: 'sort.by.state' }),
					expect.objectContaining({ labelKey: 'sort.by.installed' }),
					expect.objectContaining({ labelKey: 'sort.by.updated' }),
				]),
			);
			expect(expansionActionAvailable(tab, ['nested'])).toBe(false);
		}
		// BT5-010: the configurable cells moved from popupView's local map to
		// the shared registry, so the guard asks the registry itself.
		for (const tab of ['snippets', 'plugins'] as const) {
			const cellIds = cellsForExplorer(tab, 'tree').map((cell) => cell.id);
			expect(cellIds).toEqual(
				expect.arrayContaining(['state', 'installed', 'updated']),
			);
		}
		// The popup must read the shared registry, not a local pill map.
		expect(popupViewSource).toContain('logicCellRegistry');
		expect(popupViewSource).toContain('viewMenuCells');
		// The plugins-only config cell is registered centrally too.
		expect(cellsForExplorer('plugins', 'tree').map((cell) => cell.id)).toContain(
			'config',
		);
		expect(navbarFiltersSource).toContain('expansionActionAvailable(');
		expect(popupSortSource).toContain('visibleSortOptions(');
	});

	it('uses one-click cells with a hot native/badge setting and no row double-click', () => {
		for (const source of [snippetsPanelSource, pluginsPanelSource]) {
			expect(source).not.toContain('onRowDoubleClick');
			expect(source).toContain('onCellClick');
			expect(source).toContain('setCellStyle(');
			expect(source).toContain('pendingToggleIds');
			expect(source).toContain('sortAddonEntries(');
			expect(source).toContain('disabled: this.pendingToggleIds.has(');
			expect(source).not.toMatch(/meta\.enabled\s*=/);
		}
		expect(pluginsPanelSource).toContain('settingsTabIds.has(entry.pluginId)');
		expect(settingsTypesSource).toContain(
			"export type AddonCellStyle = 'native' | 'badge'",
		);
		expect(settingsTypesSource).toContain('addonCellStyle: AddonCellStyle');
		expect(settingsTypesSource).toContain("addonCellStyle: 'native'");
		expect(settingsSource).toContain('settings.addon_cell_style');
		expect(pageFiltersSource).toContain('setCellStyle(addonCellStyle)');
	});

	it('projects queued snippet renames as cancellable row badges', () => {
		expect(snippetsPanelSource).toContain('queuedRenameBadgeForPath');
		expect(snippetsPanelSource).toContain("queueService.on('changed'");
		expect(snippetsPanelSource).toContain('onBadgeDoubleClick');
		expect(snippetsPanelSource).toContain('badgeCancelClickMode');
	});
});

describe('addon explorer reveal parity (BT4-004)', () => {
	it('aligns revealed nodes to the top of the frame like every other explorer', () => {
		for (const source of [snippetsPanelSource, pluginsPanelSource]) {
			expect(source).toContain("scrollToId(id, 'start'");
			expect(source).not.toContain("scrollToId(id, 'center'");
		}
	});
});

describe('plugin cell order (BT4-007)', () => {
	it('keeps the config cell before the state toggle so the toggle stays rightmost', () => {
		const configIndex = pluginsPanelSource.indexOf("id: 'config'");
		const stateIndex = pluginsPanelSource.indexOf("id: 'state'");
		expect(configIndex).toBeGreaterThan(-1);
		expect(stateIndex).toBeGreaterThan(-1);
		expect(configIndex).toBeLessThan(stateIndex);
	});
});

describe('external addon state sync (BT4-006)', () => {
	it('polls a cheap visible-only signature and reacts to css-change', () => {
		for (const source of [snippetsPanelSource, pluginsPanelSource]) {
			expect(source).toContain('registerInterval');
			expect(source).toContain('containerEl.isShown()');
			expect(source).toContain('StateSignature(');
			expect(source).toContain('_lastExternalSignature');
		}
		expect(snippetsPanelSource).toContain("workspace.on('css-change'");
	});
});
