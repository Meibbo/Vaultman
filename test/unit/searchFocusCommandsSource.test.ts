import { describe, expect, it } from 'vitest';

import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import frameHostSource from '../../src/VaultmanFrame.ts?raw';
import mainSource from '../../src/main.ts?raw';

describe('search focus command source guards', () => {
	it('registers Obsidian commands without custom hotkey settings', () => {
		expect(mainSource).toContain("id: 'focus-content-search'");
		expect(mainSource).toContain(
			"name: translate('command.focus_content_search')",
		);
		expect(mainSource).toContain("id: 'focus-active-explorer-search'");
		expect(mainSource).toContain(
			"name: translate('command.focus_active_explorer_search')",
		);
		expect(mainSource).toContain('void this.focusVaultmanContentSearch();');
		expect(mainSource).toContain('void this.focusVaultmanExplorerSearch();');
		expect(mainSource).not.toContain('hotkeys:');
	});

	it('opens or reveals Vaultman before routing command focus to the mounted frame', () => {
		expect(mainSource).toContain('private async vaultmanFrameForCommand()');
		// BT5-067: this used to require `await this.activateView()`, which is the
		// toggle. With Vaultman already open the toggle detaches every frame, so
		// the focus commands closed it and then had nothing to focus. The guard
		// now requires the idempotent route instead of enshrining that bug.
		expect(mainSource).toContain('await this.ensureVaultmanFrame();');
		expect(mainSource).toContain('getLeavesOfType(VAULTMAN_FRAME_TYPE)');
		expect(mainSource).toContain('view instanceof VaultmanFrame');
		// U121-019 #51 widened this to carry an optional query, for the editor
		// menu's "search selection in Vaultman". The routing this guard exists for
		// is unchanged.
		expect(mainSource).toContain('await view.focusContentSearch(query);');
		expect(mainSource).toContain('await view.focusActiveExplorerSearch();');
	});

	it('bridges frame host methods to exported Svelte focus handlers', () => {
		expect(frameHostSource).toContain('type VaultmanFrameSvelteApi');
		expect(frameHostSource).toContain(
			'focusContentSearch?(query?: string): Promise<void> | void;',
		);
		expect(frameHostSource).toContain(
			'focusActiveExplorerSearch?(): Promise<void> | void;',
		);
		expect(frameHostSource).toContain(
			'await this.svelteApp?.focusContentSearch?.(query);',
		);
		expect(frameHostSource).toContain(
			'await this.svelteApp?.focusActiveExplorerSearch?.();',
		);
	});

	it('exports focus handlers that navigate to existing search inputs', () => {
		expect(frameSource).toContain(
			'export async function focusContentSearch(query?: string): Promise<void>',
		);
		expect(frameSource).toContain("navigateToDataTab('content')");
		expect(frameSource).toContain('.vaultman-content-input[type="search"]');
		expect(frameSource).toContain(
			'export async function focusActiveExplorerSearch(): Promise<void>',
		);
		expect(frameSource).toContain("filtersActiveTab === 'files'");
		expect(frameSource).toContain("filtersActiveTab === 'props'");
		expect(frameSource).toContain("filtersActiveTab === 'tags'");
		expect(frameSource).toContain(": 'props';");
		expect(frameSource).toContain(
			'.vaultman-panel-widget-host .vaultman-navbar-filters .vaultman-filters-search-input',
		);
		expect(frameSource).toContain(
			'.vaultman-panel-widget-host [data-vaultman-search-toggle="true"]',
		);
		expect(frameSource).toContain('input?.focus();');
		expect(frameSource).toContain('input?.select();');
		expect(frameSource).toContain(
			"new Notice(translate('command.focus_search_unavailable'))",
		);
		expect(enSource).toMatch(
			/'command\.focus_search_unavailable':\s*'No Vaultman search field is available\.'/,
		);
		expect(esSource).toMatch(
			/'command\.focus_search_unavailable':\s*'No hay un campo de busqueda de Vaultman disponible\.'/,
		);
	});
});
