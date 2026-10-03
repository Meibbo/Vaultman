import { describe, expect, it } from 'vitest';

import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

describe('BT5-034 the tooltip is ready before the pointer arrives', () => {
	it('takes the text from the panel at render time, not only on hover', () => {
		// Setting it during pointerenter is too late for Obsidian to show it on
		// that same entry, which forced a second hover on every node.
		expect(viewTreeSource).toContain('rowTooltip?: (node: TreeNode) => string');
		expect(viewTreeSource).toContain(
			"this.applyRowTooltip(row, opts.rowTooltip?.(node) ?? '')",
		);
	});

	it('keeps the view free of authored tooltip text (BT5-032 holds)', () => {
		expect(viewTreeSource).not.toContain('Last modified: ');
		expect(viewTreeSource).not.toContain('private rowTitle(');
		expect(viewTreeSource).toContain("row.removeAttribute('title')");
	});

	it('still upgrades the tooltip once lazy stats arrive', () => {
		expect(viewTreeSource).toContain('private _hoveredRowId');
		expect(explorerFilesSource).toContain('this._handleFileHover(');
	});

	it('wires every surface that owns a configurable tooltip', () => {
		expect(explorerFilesSource).not.toContain('rowTooltip: (node');
		expect(explorerFilesSource).toContain('onRowHover: (id: string, row: HTMLElement)');
		for (const source of [explorerPluginsSource, explorerSnippetsSource]) {
			expect(source).toContain('rowTooltip: (node');
		}
	});

	it('calls the feature Tooltip in the settings UI', () => {
		expect(enSource).toContain("'settings.files_hover_info': 'Node tooltips'");
		expect(esSource).toContain(
			"'settings.files_hover_info': 'Tooltips de nodos'",
		);
	});
});
