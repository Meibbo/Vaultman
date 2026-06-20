// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('search highlight flicker guards', () => {
	it('keeps search highlight out of virtual row render signatures', () => {
		for (const source of [treeSource, nodeTableSource]) {
			const rowSignatureBody =
				source.match(/private rowSignature[\s\S]*?return \[[\s\S]*?\]\.join/)?.[0] ??
				'';
			expect(rowSignatureBody).not.toContain('searchHighlightIds');
			expect(rowSignatureBody).not.toContain('isHighlighted');
			expect(rowSignatureBody).not.toContain('vaultman-search-highlight');
		}
	});

	it('does not animate search highlight decorations on row rebuilds', () => {
		const highlightBlocks =
			stylesSource.match(
				/\.vaultman[\w\s.,:-]*search-highlight[^{]*\{[\s\S]*?\n\}/g,
			) ?? [];
		expect(highlightBlocks.length).toBeGreaterThan(0);
		for (const block of highlightBlocks) {
			expect(block).not.toMatch(/\banimation\s*:/);
			expect(block).not.toMatch(/\btransition\s*:/);
		}
		expect(stylesSource).not.toContain('@keyframes vaultman-search-pulse');
		expect(stylesSource).not.toContain('@keyframes vaultman-fade-in-simple');
	});

	it('gates explorer search highlights behind a settings toggle', () => {
		expect(settingsSource).toContain("translate('settings.search_highlights')");
		expect(propsSource).toContain(
			'this.plugin.settings?.explorerSearchHighlights',
		);
		expect(tagsSource).toContain(
			'this.plugin.settings?.explorerSearchHighlights',
		);
	});
});
