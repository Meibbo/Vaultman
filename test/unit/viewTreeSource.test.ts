import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';
import tableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('UnifiedTreeView source guards', () => {
	it('reuses visible tree row shells instead of clearing the whole window', () => {
		expect(treeSource).toContain(
			'private rowEls = new Map<string, HTMLElement>()',
		);
		expect(treeSource).toContain('private removeStaleRows');
		expect(treeSource).not.toContain('this._contentEl.empty();');
		expect(treeSource).not.toContain(
			'this.rowEls.clear();\n\t\tfor (const row of projection.visibleRows)',
		);
	});

	it('skips rebuilding unchanged tree row contents', () => {
		expect(treeSource).toContain('private rowSignature');
		expect(treeSource).toContain('row.dataset.renderSignature === signature');
		expect(treeSource).toContain('row.dataset.renderSignature = signature');
	});

	it('leaves row tooltip content to the panel that configures it', () => {
		// BT5-032 replaced the view's own hardcoded English title (Last
		// modified / Created at / Words) with a clear-only contract: the view
		// guarantees a clean slate, the panel's hover builder owns the text.
		expect(treeSource).not.toContain('private rowTitle');
		expect(treeSource).not.toContain('Last modified:');
		expect(treeSource).not.toContain('Created at:');
		expect(treeSource).toContain('private applyRowTooltip(');
		expect(treeSource).toContain('setTooltip(row');
	});

	it('exposes row drop callbacks without rebuilding the virtualized tree', () => {
		expect(treeSource).toContain('onDragOver?: (id: string, event: DragEvent)');
		expect(treeSource).toContain('onDrop?: (id: string, event: DragEvent)');
		expect(treeSource).toContain('row.ondragover = (event) =>');
		expect(treeSource).toContain('row.ondrop = (event) =>');
		expect(treeSource).toContain('this.applyDataPath(row, node)');
	});

	it('renders immediately when scrolling leaves no rendered rows in the viewport', () => {
		expect(treeSource).toContain('private _hasVisibleRenderedRows()');
		expect(treeSource).toContain('this._cancelWindowRender();');
		expect(treeSource).toContain('this._renderWindow();');
		expect(treeSource).toContain('rect.bottom > viewport.top + 1');
	});

	it('toggles nested indent guides from the visible nested cell without rebuilding rows', () => {
		expect(treeSource).toContain('vaultman-tree-nested-guides');
		expect(treeSource).toContain("opts.visibleCells?.has('nested') ?? true");
		expect(treeSource).toContain(
			"this.containerEl.removeClass('vaultman-tree-nested-guides')",
		);
	});

	it('shares the provider-neutral highlight contract with table and adapters', () => {
		expect(treeSource).toContain('highlightIds?: ExplorerHighlightIdSets');
		expect(tableSource).toContain('highlightIds?: ExplorerHighlightIdSets');
		expect(tableSource).toContain('resolveExplorerHighlightForId');
		expect(tableSource).toContain("'is-deletion-highlight'");
		expect(propsSource).toContain('highlightIds: {');
		expect(tagsSource).toContain('highlightIds: {');
		expect(propsSource).toContain('statusDotLabel:');
		expect(tagsSource).toContain('statusDotLabel:');
		expect(propsSource).toContain('deletion: deletionIds');
		expect(tagsSource).toContain('deletion: deletionIds');
	});
});
