// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('virtual scroll CSS source guards', () => {
	it('does not force scroll anchoring policy on virtualized explorer scrollports', () => {
		const guardedBlocks = [
			'.vaultman-tree-virtual-viewport',
			'.vaultman-files-table',
			'.vaultman-node-table-scroll',
			'.vaultman-files-grid-scroll',
		];

		for (const selector of guardedBlocks) {
			const escaped = selector.replace('.', '\\.');
			expect(stylesSource).not.toMatch(
				new RegExp(`${escaped}\\s*\\{[^}]*overflow-anchor\\s*:\\s*none`, 's'),
			);
		}
	});
});
