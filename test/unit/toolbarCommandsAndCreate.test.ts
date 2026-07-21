import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

describe('BT5-022 create actions placement', () => {
	it('defaults to the search box, compatible with beta.4', () => {
		expect(DEFAULT_SETTINGS.createActionsPlacement).toBe('searchbox');
	});

	it('renders Create nodes on the toolbar only in toolbar placement', () => {
		expect(navbarSource).toContain(
			"activeTab === 'files' && createActionsPlacement === 'toolbar'",
		);
		expect(navbarSource).toContain('fileList?.createFromSearch(0, filtersSearch)');
		expect(navbarSource).toContain('fileList?.createFromSearch(1, filtersSearch)');
	});

	it('drops the Files searchbox create button when moved to the toolbar', () => {
		expect(navbarSource).toContain(
			"activeTab === 'files' && createActionsPlacement !== 'toolbar'",
		);
	});

	it('exposes the placement selector in settings', () => {
		expect(settingsSource).toContain('createActionsPlacement');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.create_actions_placement':");
		}
	});
});

describe('BT5-024 custom command toolbar actions', () => {
	it('defaults to an empty command list', () => {
		expect(DEFAULT_SETTINGS.toolbarCommandActions).toEqual([]);
	});

	it('projects resolved commands as toolbar nodes that run by id', () => {
		expect(navbarSource).toContain('{#each commandActions as command');
		expect(navbarSource).toContain('onRunCommand?.(command.id)');
		// A retired command is disabled and labelled, not silently dropped.
		expect(navbarSource).toContain('class:is-disabled={!command.available}');
		expect(navbarSource).toContain("translate('command.unavailable')");
	});

	it('resolves the saved list against the live registry in the page', () => {
		expect(pageFiltersSource).toContain('resolveCommandActions(');
		expect(pageFiltersSource).toContain('listObsidianCommands(plugin.app)');
		expect(pageFiltersSource).toContain(
			'onRunCommand={(id) => executeObsidianCommand(plugin.app, id)}',
		);
	});

	it('manages the list with add, remove and reorder in settings', () => {
		expect(settingsSource).toContain('renderToolbarCommandActions(');
		expect(settingsSource).toContain('addCommandId(');
		expect(settingsSource).toContain('removeCommandId(');
		expect(settingsSource).toContain('reorderCommandIds(');
		expect(settingsSource).toContain("settings.toolbar_commands");
	});
});
