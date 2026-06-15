import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import frameHostSource from '../../src/VaultmanFrame.ts?raw';
import mainSource from '../../src/main.ts?raw';

describe('search focus command source guards', () => {
	it('registers Obsidian commands without custom hotkey settings', () => {
		expect(mainSource).toContain("id: 'focus-content-search'");
		expect(mainSource).toContain("name: translate('command.focus_content_search')");
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
		expect(mainSource).toContain('await this.activateView();');
		expect(mainSource).toContain('getLeavesOfType(VAULTMAN_FRAME_TYPE)');
		expect(mainSource).toContain('view instanceof VaultmanFrame');
		expect(mainSource).toContain('await view.focusContentSearch();');
		expect(mainSource).toContain('await view.focusActiveExplorerSearch();');
	});

	it('bridges frame host methods to exported Svelte focus handlers', () => {
		expect(frameHostSource).toContain('type VaultmanFrameSvelteApi');
		expect(frameHostSource).toContain('focusContentSearch?(): Promise<void> | void;');
		expect(frameHostSource).toContain(
			'focusActiveExplorerSearch?(): Promise<void> | void;',
		);
		expect(frameHostSource).toContain(
			'await this.svelteApp?.focusContentSearch?.();',
		);
		expect(frameHostSource).toContain(
			'await this.svelteApp?.focusActiveExplorerSearch?.();',
		);
	});

	it('exports focus handlers that navigate to existing search inputs', () => {
		expect(frameSource).toContain(
			'export async function focusContentSearch(): Promise<void>',
		);
		expect(frameSource).toContain("navigateToDataTab('content')");
		expect(frameSource).toContain('.vaultman-content-input[type="search"]');
		expect(frameSource).toContain(
			'export async function focusActiveExplorerSearch(): Promise<void>',
		);
		expect(frameSource).toContain(
			"filtersActiveTab === 'content' ? 'props' : filtersActiveTab",
		);
		expect(frameSource).toContain('.vaultman-filters-search-input');
		expect(frameSource).toContain('input?.focus();');
		expect(frameSource).toContain('input?.select();');
	});
});
