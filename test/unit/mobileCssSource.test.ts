// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('mobile CSS source guards', () => {
	it('keeps phone navbar controls above Obsidian mobile gradients and moves Vaultman dock to the top', () => {
		expect(stylesSource).toContain('position: absolute');
		expect(stylesSource).toContain('bottom: 0');
		expect(stylesSource).toContain('height: 56px');
		expect(stylesSource).toContain('padding: 4px 0 8px');
		expect(stylesSource).toContain('z-index: 1');
		expect(stylesSource).toContain('.vaultman-bottom-nav');
		expect(stylesSource).toContain('top: 0');
		expect(stylesSource).toContain('bottom: auto');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).toContain('border: 0');
		expect(stylesSource).toContain('box-shadow: none');
		expect(stylesSource).toContain(
			'.vaultman-navbar-filters.vaultman-glass::before',
		);
		expect(stylesSource).toContain('-webkit-mask-image: none');
	});

	it('keeps phone minimal search as a top overlay while the search button remains a toggle', () => {
		expect(stylesSource).toContain(
			'.vaultman-filters-header--minimal .vaultman-filters-header-search-pill:focus-within',
		);
		expect(stylesSource).toContain(
			'border-color: var(--background-modifier-border)',
		);
		expect(stylesSource).toContain('container-type: inline-size');
		expect(stylesSource).toContain('@container (max-width: 799px)');
		expect(stylesSource).toContain(
			'.vaultman-filters-header--minimal .vaultman-filters-header-search-pill',
		);
		expect(stylesSource).toContain('.vaultman-filters-phone-search-row');
		expect(stylesSource).toContain('position: static');
		expect(stylesSource).toContain('padding: 8px 8px 4px');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).toContain('border-bottom-color: var(--background-modifier-border)');
		expect(stylesSource).toContain('.vaultman-filters-header-search-pill--inline');
		expect(stylesSource).toContain('.vaultman-filters-header-search-pill--phone');
		expect(stylesSource).toContain('border-radius: var(--radius-s)');
		expect(stylesSource).not.toContain('vaultman-minimal-search-row');
		expect(stylesSource).toContain('width: 28px');
		expect(stylesSource).toContain('height: 28px');
	});

	it('keeps inactive island backdrop from blurring the phone explorer', () => {
		expect(stylesSource).toContain('.vaultman-island-backdrop:not(.is-open)');
		expect(stylesSource).toContain(
			'.vaultman-island-backdrop:not(.is-open)::before',
		);
		expect(stylesSource).toContain('backdrop-filter: none');
	});

	it('keeps container queries scoped to the filters navbar instead of the virtualized page', () => {
		const pageBlock =
			stylesSource.match(/\.vaultman-page\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		const navbarBlock =
			stylesSource.match(/\.vaultman-navbar-filters\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';
		const headerWrapBlocks = Array.from(
			stylesSource.matchAll(
				/(?:^|\n)\.vaultman-filters-header-wrap\s*\{[\s\S]*?\n\}/g,
			),
			(match) => match[0],
		);
		const globalHeaderWrapBlock =
			headerWrapBlocks.find((block) => block.includes('max-width: 520px')) ??
			'';

		expect(pageBlock).not.toContain('container-type');
		expect(navbarBlock).toContain('container-type: inline-size');
		expect(navbarBlock).not.toContain('max-width: 520px');
		expect(globalHeaderWrapBlock).toContain('max-width: 520px');
		expect(globalHeaderWrapBlock).toContain('margin-inline: auto');
	});

	it('aligns phone explorer viewport padding with core panes instead of custom side padding', () => {
		expect(stylesSource).toContain('padding: 8px 0 96px');
	});

	it('keeps mobile tree row CSS height aligned with the fixed virtual row model', () => {
		expect(stylesSource).toContain(
			'.is-mobile .workspace-leaf-content[data-type="vaultman-frame"]',
		);
		expect(stylesSource).toContain('.vaultman-tree-row.tree-item-self');
		expect(stylesSource).toContain('height: 37px');
		expect(stylesSource).not.toContain('height: 36.7969px');
	});

	it('enlarges explorer table, grid, and floating index nodes on mobile surfaces', () => {
		expect(stylesSource).toContain('.vaultman-files-table-header-row');
		expect(stylesSource).toContain('.vaultman-node-table-header-row');
		expect(stylesSource).toContain('--bases-table-row-height: 37px');
		expect(stylesSource).toContain('.vaultman-files-grid-card');
		expect(stylesSource).toContain('.vaultman-floating-toc-item');
		expect(stylesSource).toContain('flex: 0 0 20px');
		expect(stylesSource).toContain('flex-basis: 24px');
	});

	it('keeps Content and Statistics buttons transparent in their resting state', () => {
		expect(stylesSource).toContain(
			'.vaultman-content-find-row .vaultman-icon-toggle',
		);
		expect(stylesSource).toContain('vaultman-content-clear-button');
		expect(stylesSource).toContain('.vaultman-stat-card {\n  display: flex;');
		expect(stylesSource).toContain('background: transparent');
		expect(stylesSource).not.toContain(
			'.vaultman-statistics-page button.vaultman-stat-card',
		);
		expect(stylesSource).not.toContain(
			'.vaultman-statistics-page button.vaultman-stat-scope-pill',
		);
	});

	it('separates Content inputs and aligns explicit Content input icons', () => {
		expect(stylesSource).toContain(
			'.vaultman-content-search-container.search-input-container::before',
		);
		expect(stylesSource).toContain('display: none');
		expect(stylesSource).toContain('.vaultman-content-input-icon');
		expect(stylesSource).toContain(
			'border-top: 1px solid var(--background-modifier-border)',
		);
		expect(stylesSource).toContain('background: var(--color-accent)');
	});

	it('keeps Content clear buttons large enough for the compact input scale', () => {
		expect(stylesSource).toContain('padding-inline-end: 34px');
		expect(stylesSource).toContain('inset-inline-end: 2px');
		expect(stylesSource).toContain('width: 28px');
		expect(stylesSource).toContain('height: 28px');
		expect(stylesSource).toContain('.vaultman-content-clear-button svg');
		expect(stylesSource).toContain('width: 16px');
		expect(stylesSource).toContain('height: 16px');
	});
});
