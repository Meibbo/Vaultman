// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

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
		const treeGuideBlock =
			stylesSource.match(/\.vaultman-tree-row::before\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';

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
		expect(stylesSource).toContain(
			'--vaultman-tree-row-padding-start: var(--size-4-6)',
		);
		expect(stylesSource).toContain(
			'--vaultman-tree-caret-offset: var(--size-4-5)',
		);
		expect(treeGuideBlock).toContain(
			'inset-inline-start: var(--vaultman-tree-guide-start)',
		);
		expect(treeGuideBlock).not.toContain('inset-inline-start: 16px');
		expect(treeGuideBlock).not.toContain('inset-inline-start: 8px');
		expect(stylesSource).toContain('height: 27px');
		expect(stylesSource).toContain('height: 37px');
	});

	it('keeps Tags and Props grid operation badges visually quieter than Files operation badges', () => {
		const mutedBadgeBlock =
			stylesSource.match(
				/\.vaultman-tag-card \.vaultman-badge,\n\.vaultman-prop-card \.vaultman-badge\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(mutedBadgeBlock).toContain('color: var(--text-muted)');
		expect(mutedBadgeBlock).toContain('background: transparent');
		expect(mutedBadgeBlock).toContain('opacity: 0.8');
		expect(stylesSource).toContain('.vaultman-badge--blue');
		expect(stylesSource).toContain('.vaultman-badge--orange');
	});
});
