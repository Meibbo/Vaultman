import { describe, it, expect } from 'vitest';
import { createGenerator } from 'unocss';
import unoConfig from '../../../uno.config';
import { shortcutsTree } from '../../../src/styles/shortcuts/index';

describe('Tree Virtualization, NodeRow Vocabularies and Badges (Slice 4)', () => {
	it('should provide shortcuts for tree row surfaces, active/focus states, badges and chevrons', () => {
		const names = shortcutsTree.map(([name]) => name);
		expect(names).toContain('vm-tree-row');
		expect(names).toContain('vm-tree-row-active');
		expect(names).toContain('vm-tree-row-focused');
		expect(names).toContain('vm-badge');
		expect(names).toContain('vm-badge-accent');
		expect(names).toContain('vm-badge-warning');
		expect(names).toContain('vm-badge-error');
		expect(names).toContain('vm-toggle-chevron');
		expect(names).toContain('vm-toggle-chevron-open');
	});

	it('should generate valid CSS rules for tree shortcuts and state modifiers without legacy prefixes', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate([
			'vm-tree-row',
			'vm-tree-row-active',
			'vm-tree-row-focused',
			'vm-badge',
			'vm-badge-accent',
			'vm-toggle-chevron',
			'vm-toggle-chevron-open',
		]);

		expect(css).toContain('.vm-tree-row');
		expect(css).toContain('.vm-tree-row-active');
		expect(css).toContain('.vm-tree-row-focused');
		expect(css).toContain('.vm-badge');
		expect(css).toContain('.vm-badge-accent');
		expect(css).toContain('.vm-toggle-chevron');
		expect(css).toContain('.vm-toggle-chevron-open');
		expect(css).not.toContain('.vaultman-tree-row');
		expect(css).not.toContain('.vaultman-badge');
	});

	it('should ensure rotation transform is emitted for open toggle chevron', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-toggle-chevron-open']);

		expect(css).toContain('--un-rotate:90deg');
		expect(css).toContain('rotate(var(--un-rotate))');
	});
});
