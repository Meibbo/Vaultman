import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	EXPLORER_CELL_DEFS,
	defaultVisibleCells,
	shouldOfferCaretViewOption,
	viewMenuCells,
} from '../../src/logic/logicCellRegistry';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('caretPosition setting and cell_caret view option', () => {
	it('registers caretPosition default as start and removes iconInCaretSlot setting toggle', () => {
		expect(DEFAULT_SETTINGS.caretPosition).toBe('start');
		expect(settingsSource).toContain('settings.caret_position');
		expect(settingsSource).not.toContain('settings.icon_in_caret_slot');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.caret_position':");
			expect(source).toContain("'settings.caret_position.desc':");
			expect(source).toContain("'settings.caret_position.start':");
			expect(source).toContain("'settings.caret_position.end':");
			expect(source).toContain("'settings.caret_position.hidden':");
			expect(source).toContain("'viewmode.pill.caret':");
		}
	});

	it('registers caret cell in registry with control role and default on', () => {
		const caretCell = EXPLORER_CELL_DEFS.find((cell) => cell.id === 'caret');
		expect(caretCell).toBeDefined();
		expect(caretCell?.role).toBe('control');
		expect(caretCell?.supports.every((s) => s.defaultOn)).toBe(true);
		expect(defaultVisibleCells('files')).toContain('caret');
		expect(defaultVisibleCells('props')).toContain('caret');
		expect(defaultVisibleCells('tags')).toContain('caret');
		expect(shouldOfferCaretViewOption('start')).toBe(true);
		expect(shouldOfferCaretViewOption('end')).toBe(true);
		expect(shouldOfferCaretViewOption('hidden')).toBe(false);

		const menuStart = viewMenuCells('files', 'tree', undefined, {
			caretPosition: 'start',
		});
		expect(menuStart.some((c) => c.id === 'caret')).toBe(true);

		const menuHidden = viewMenuCells('files', 'tree', undefined, {
			caretPosition: 'hidden',
		});
		expect(menuHidden.some((c) => c.id === 'caret')).toBe(false);
	});

	it('emits caret at start or end depending on caretPosition and respects cell_caret', () => {
		expect(viewTreeSource).toContain('vaultman-tree-caret--${position}');
		expect(viewTreeSource).toContain("opts.caretPosition ?? 'start'");
		expect(viewTreeSource).not.toContain("'vaultman-tree-row--icon-in-caret'");
		expect(stylesSource).not.toContain('.vaultman-tree-row--icon-in-caret');
		expect(stylesSource).toContain('.vaultman-tree-caret--end');
	});

	it('leaves the caret toggle button and affordance intact', () => {
		expect(viewTreeSource).toContain("setIcon(toggleEl, 'right-triangle')");
		expect(viewTreeSource).toContain(
			"toggleEl.setAttribute('aria-hidden', 'true')",
		);
		expect(viewTreeSource).toContain("'vaultman-tree-toggle--empty'");
	});

	it('re-renders rows when caretPosition changes at runtime', () => {
		expect(viewTreeSource).toContain("opts.caretPosition ?? 'start'");
	});

	it('reaches every tree surface with caretPosition', () => {
		for (const source of [
			explorerFilesSource,
			explorerSnippetsSource,
			explorerPluginsSource,
			explorerPropsSource,
			explorerTagsSource,
		]) {
			expect(source).toContain('caretPosition: this.plugin.settings');
		}
	});
});
