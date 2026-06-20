import { describe, expect, it } from 'vitest';

import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';

describe('search highlight render stability source guards', () => {
	it('keeps tree row signatures independent from transient search highlight membership', () => {
		const signatureBlock =
			treeSource.match(/private rowSignature[\s\S]*?\n\t\}/)?.[0] ?? '';
		const stableReturnBlock =
			treeSource.match(
				/if \(row\.dataset\.renderSignature === signature\) \{[\s\S]*?\n\t\t\}/,
			)?.[0] ?? '';

		expect(signatureBlock).not.toContain('opts.searchHighlightIds?.has(node.id)');
		expect(stableReturnBlock).toContain('this.applyMutableRowState({');
		expect(treeSource).toContain(
			"row.toggleClass('vaultman-search-highlight', isHighlighted);",
		);
	});

	it('keeps node table row signatures independent from transient search highlight membership', () => {
		const signatureBlock =
			nodeTableSource.match(/private rowSignature[\s\S]*?\n\t\}/)?.[0] ?? '';
		const stableReturnBlock =
			nodeTableSource.match(
				/if \(row\.dataset\.renderSignature === signature\) \{[\s\S]*?\n\t\t\}/,
			)?.[0] ?? '';

		expect(signatureBlock).not.toContain('opts.searchHighlightIds?.has(node.id)');
		expect(stableReturnBlock).toContain(
			"row.toggleClass('vaultman-search-highlight', isHighlighted);",
		);
	});

	it('keeps transient highlights opt-in at explorer sources', () => {
		expect(propsSource).toContain(
			'this.plugin.settings?.explorerSearchHighlights',
		);
		expect(tagsSource).toContain(
			'this.plugin.settings?.explorerSearchHighlights',
		);
	});
});
