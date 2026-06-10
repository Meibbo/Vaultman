import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';

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

	it('adds hover titles for file modified and created dates', () => {
		expect(treeSource).toContain('private rowTitle');
		expect(treeSource).toContain('Last modified:');
		expect(treeSource).toContain('Created at:');
		expect(treeSource).toContain('row.setAttribute');
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
});
