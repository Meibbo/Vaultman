import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('virtual scroll CSS source guards', () => {
	it('keeps host-qualified compatible slots unindented when the native self owns depth padding', () => {
		const slot = stylesSource.match(/\.workspace-leaf-content\[data-type="vaultman-frame"\] \.vaultman-tree-virtual-viewport\.vaultman-native-tree-compat \.vaultman-tree-row\.vaultman-tree-row,[\s\S]*?\{/);
		const declarations = slot ? stylesSource.slice(slot.index).split('}')[0] : '';
		expect(declarations).toContain('padding-inline-start: 0;');
		expect(declarations).not.toContain('var(--depth');
	});
	it('does not tile the repeating guide gradient at fractional native indent pitches', () => {
		const guide = stylesSource.match(/\.vaultman-tree-guides\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(guide).toContain('background-size: auto 100%');
		expect(guide).toContain('background-repeat: no-repeat');
	});

	it('applies caret gutter and depth padding on the native self in every scene', () => {
		const self = stylesSource.match(/\.vaultman-tree-virtual-viewport\.vaultman-native-tree-compat \.vaultman-tree-row > \.vaultman-tree-self\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(self).toContain('--vaultman-native-row-padding-start');
		expect(self).toContain('var(--depth, 0) * var(--vaultman-tree-indent-unit)');
		expect(self).toContain('padding-inline-end: var(--vaultman-tree-row-padding-end, 8px)');
	});
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
		// U130 native polish: guides are a structural `.vaultman-tree-guides`
		// element, never the row's `::before`, so the native active
		// decoration keeps a free pseudo-element on both levels.
		expect(stylesSource).not.toMatch(/\.vaultman-tree-row::before\s*\{/);
		const treeGuideBlock =
			stylesSource.match(/\.vaultman-tree-guides\s*\{[\s\S]*?\n\}/)?.[0] ??
			'';

		expect(stylesSource).toContain('--vaultman-tree-indent-unit: 16px');
		expect(stylesSource).toContain(
			'--vaultman-tree-indent-line-color: var(--nav-indentation-guide-color, var(--background-modifier-border))',
		);
		expect(stylesSource).toContain(
			'--vaultman-tree-indent-line-width: var(--nav-indentation-guide-width, 1px)',
		);
		expect(stylesSource).toContain(
			'.vaultman-tree-virtual-viewport:not(.vaultman-tree-nested-guides) .vaultman-tree-guides',
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

	it('keeps flat virtual tree row indentation stronger than native collapsible padding without important', () => {
		// U130 native polish: structural indentation lives on the slot
		// (`.vaultman-tree-row`), never on the native `tree-item-self`, so the
		// host-qualified slot rule outranks the native collapsible padding.
		const desktopCoreRowIndentBlock =
			stylesSource.match(
				/\.workspace-leaf-content\[data-type="vaultman-frame"\] \.vaultman-tree-virtual-viewport \.vaultman-tree-row,[\s\S]*?\.workspace-leaf-content\[data-type="vaultman-view"\] \.vaultman-tree-virtual-viewport \.vaultman-tree-row\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(desktopCoreRowIndentBlock).toContain(
			'padding-inline-start: calc(var(--vaultman-tree-row-padding-start) + var(--depth, 0) * var(--vaultman-tree-indent-unit))',
		);
		expect(desktopCoreRowIndentBlock).toContain(
			'padding-inline-end: var(--vaultman-tree-row-padding-end, 8px)',
		);
		expect(desktopCoreRowIndentBlock).not.toContain('!important');
	});

	it('structure-animating does NOT include top transition (moved to drawer-animating opt-in)', () => {
		const structureAnimationBlock =
			stylesSource.match(
				/\.vaultman-tree-virtual-viewport\.vaultman-tree-structure-animating \.vaultman-tree-row--virtual\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(structureAnimationBlock).not.toContain('top 100ms');
		expect(structureAnimationBlock).not.toContain('top 140ms');
		expect(structureAnimationBlock).toContain('background-color 120ms ease');
		expect(structureAnimationBlock).not.toContain('!important');
		expect(stylesSource).toContain('@media (prefers-reduced-motion: reduce)');
	});

	it('drawer-animating includes top transition and drawer clip container', () => {
		expect(stylesSource).toContain('.vaultman-tree-drawer');
		expect(stylesSource).toContain('overflow: hidden');
		const drawerAnimatingBlock =
			stylesSource.match(
				/\.vaultman-tree-virtual-viewport\.vaultman-tree-drawer-animating \.vaultman-tree-row--virtual\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		expect(drawerAnimatingBlock).toContain('top 140ms');
		expect(drawerAnimatingBlock).toContain('background-color 120ms ease');
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
