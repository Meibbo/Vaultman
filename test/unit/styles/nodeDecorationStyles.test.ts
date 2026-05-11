import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('node decoration styles', () => {
	it('keeps hover badges neutral while adding a visible hover background', () => {
		const source = readFileSync('src/styles/components/_badges.scss', 'utf8');

		expect(source).not.toContain('&.is-primary-action');
		expect(source).toMatch(/&:hover,\s*&:focus-visible\s*\{[^}]*background:/s);
	});

	it('uses accent decoration for active filters and faint decoration for selected tree rows', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');
		const selectedBlock = source.match(/\.vm-tree-row-surface\.is-selected\s*\{([\s\S]*?)\n\t\t\}/)?.[1] ?? '';
		const activeFilterBlock =
			source.match(/\.vm-tree-row-surface\.is-active-filter\s*\{([\s\S]*?)\n\t\t\}/)?.[1] ?? '';

		expect(selectedBlock).toContain('var(--text-faint)');
		expect(selectedBlock).not.toContain('inset 3px 0');
		expect(activeFilterBlock).toContain('inset 3px 0');
	});
});
