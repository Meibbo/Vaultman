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
});
