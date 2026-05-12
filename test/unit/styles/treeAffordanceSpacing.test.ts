import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tree affordance spacing styles', () => {
	it('keeps toggle slots in the flex layout and restores virtual-row hover feedback', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');

		expect(source).not.toMatch(
			/\.vm-tree-toggle,\s*\.vm-tree-icon\s*\{[^}]*position:\s*absolute/s,
		);
		expect(source).toContain('.vm-tree-toggle.is-placeholder');
		expect(source).toContain('pointer-events: none');
		expect(source).toContain('&:hover .vm-tree-row-surface');
		expect(source).toContain('background: $vm-bg-modifier-hover');
	});

	it('draws depth and parent-node indentation guides without intercepting input', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');

		expect(source).toContain('.vm-tree-indent-guides');
		expect(source).toContain('.vm-tree-indent-guide');
		expect(source).toContain('.vm-tree-row-surface.is-expanded-parent::after');
		expect(source).toContain('left: calc(var(--guide-depth, 0) * 16px + 10px)');
		expect(source).toContain('pointer-events: none');
	});

	it('reserves counter width while keeping row badges as a hover overlay', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');

		expect(source).toContain('.vm-tree-row-surface.has-count');
		expect(source).toContain('padding-right: calc(var(--vm-tree-counter-reserve, 44px) + 8px)');
		expect(source).toContain('.vm-tree-badge-zone.has-count');
		expect(source).toContain('min-width: var(--vm-tree-counter-reserve, 44px)');
		expect(source).toContain('.vm-tree-overlay-badge-zone:not(.has-active-badges)');
		expect(source).toContain('opacity: 0');
	});
});
