import { describe, expect, it } from 'vitest';

import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('BT5-032 one tooltip owner per row', () => {
	it('drops the hardcoded English tooltip the view fabricated', () => {
		expect(viewTreeSource).not.toContain('Last modified: ');
		expect(viewTreeSource).not.toContain('Created at: ');
		expect(viewTreeSource).not.toContain('Words: ');
		expect(viewTreeSource).not.toContain('private rowTitle(');
	});

	it('leaves the row without a tooltip until the configured owner sets one', () => {
		expect(viewTreeSource).toContain('private clearRowTooltip(');
		expect(viewTreeSource).toContain("setTooltip(row, '')");
	});

	it('never leaves the native title attribute behind', () => {
		expect(viewTreeSource).toContain("row.removeAttribute('title')");
		expect(explorerFilesSource).toContain("element.removeAttribute('title')");
	});

	it('re-applies the configured tooltip to a row repainted under the pointer', () => {
		// Scroll recycling and state changes repaint rows; without this the
		// configured tooltip would vanish until the pointer left and returned.
		expect(viewTreeSource).toContain('private _hoveredRowId');
		expect(viewTreeSource).toContain('this._hoveredRowId = node.id;');
		expect(viewTreeSource).toContain(
			'if (this._hoveredRowId === node.id) opts.onRowHover?.(node.id, row);',
		);
	});

	it('keeps each surface on its own configurable hover builder', () => {
		expect(explorerFilesSource).toContain('buildFileHoverInfo(');
		expect(explorerFilesSource).toContain('this._filesHoverFields()');
		for (const source of [explorerPluginsSource, explorerSnippetsSource]) {
			expect(source).toContain('onRowHover:');
			expect(source).toContain('setTooltip(row, this.tooltip(node.meta))');
		}
	});

	it('leaves explorers without a configured hover with no tooltip at all', () => {
		// Props and Tags never registered a hover builder, so after the fix
		// they must show nothing rather than an invented generic text.
		for (const source of [explorerPropsSource, explorerTagsSource]) {
			expect(source).not.toContain('onRowHover:');
		}
	});
});
