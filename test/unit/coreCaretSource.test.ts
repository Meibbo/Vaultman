import { describe, expect, it } from 'vitest';

import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('core Files caret source guards', () => {
	it('uses Obsidian collapse-icon markup for tree carets', () => {
		expect(treeSource).toContain(
			"cls: 'vaultman-tree-toggle tree-item-icon collapse-icon'",
		);
		expect(treeSource).toContain("setIcon(toggleEl, 'right-triangle')");
		expect(treeSource).toContain(
			"toggleEl.toggleClass('is-collapsed', showCaret && !isExpanded)",
		);
		expect(treeSource).not.toContain(
			"isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'",
		);
	});

	it('keeps caret expanded state mutable without rebuilding the row', () => {
		expect(treeSource).toContain('private readonly _markupVersion');
		expect(treeSource).toContain('`markup:${this._markupVersion}`');
		expect(treeSource).toContain('private applyMutableRowState');
		expect(treeSource).toContain("row.toggleClass('mod-collapsible', showCaret)");
		expect(treeSource).toContain('this.applyMutableRowState({');
		expect(treeSource).not.toMatch(
			/const toggleSpan = row\.createSpan\([\s\S]*?\n\t\tif \(showCaret\)/,
		);
		const signatureBlock =
			treeSource.match(/private rowSignature[\s\S]*?\n\t\}/)?.[0] ?? '';
		expect(signatureBlock).not.toContain('opts.expandedIds.has(node.id)');
	});
});
