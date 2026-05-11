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

		expect(source).toContain('.vm-tree-row-surface::before');
		expect(source).toContain('.vm-tree-row-surface.is-expanded-parent::after');
		expect(source).toContain('pointer-events: none');
	});
});
