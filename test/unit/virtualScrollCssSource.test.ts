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

	it('draws Obsidian-like nested indentation guides without changing virtual row heights', () => {
		expect(stylesSource).toContain('--vaultman-tree-indent-unit: 16px');
		expect(stylesSource).toContain(
			'--vaultman-tree-indent-line-color: var(--nav-indentation-guide-color, var(--background-modifier-border))',
		);
		expect(stylesSource).toContain(
			'--vaultman-tree-indent-line-width: var(--nav-indentation-guide-width, 1px)',
		);
		expect(stylesSource).toContain(
			'.vaultman-tree-virtual-viewport:not(.vaultman-tree-nested-guides) .vaultman-tree-row::before',
		);
		expect(stylesSource).toContain('background-image: repeating-linear-gradient');
		expect(stylesSource).toContain('width: calc(var(--depth, 0) * var(--vaultman-tree-indent-unit))');
		expect(stylesSource).toContain('height: 27px');
		expect(stylesSource).toContain('height: 37px');
	});
});
