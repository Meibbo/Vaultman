import { describe, it, expect } from 'vitest';
import { createGenerator } from 'unocss';
import unoConfig from '../../../uno.config';
import { shortcutsTable } from '../../../src/styles/shortcuts/index';

describe('Data Views, Bases Tables and Filter Islands Shortcuts (Slice 3)', () => {
	it('should provide shortcuts for table layout, headers, cells, rows and resizers', () => {
		const names = shortcutsTable.map(([name]) => name);
		expect(names).toContain('vm-node-table');
		expect(names).toContain('vm-node-table-header');
		expect(names).toContain('vm-node-table-cell');
		expect(names).toContain('vm-node-table-row');
		expect(names).toContain('vm-node-table-row-selected');
		expect(names).toContain('vm-node-table-header-resizer');
	});

	it('should generate valid CSS rules for table shortcuts and resizers without legacy prefixes', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate([
			'vm-node-table',
			'vm-node-table-header',
			'vm-node-table-cell',
			'vm-node-table-row',
			'vm-node-table-row-selected',
			'vm-node-table-header-resizer',
		]);

		expect(css).toContain('.vm-node-table');
		expect(css).toContain('.vm-node-table-header');
		expect(css).toContain('.vm-node-table-cell');
		expect(css).toContain('.vm-node-table-row');
		expect(css).toContain('.vm-node-table-row-selected');
		expect(css).toContain('.vm-node-table-header-resizer');
		expect(css).not.toContain('.vaultman-node-table');
		expect(css).not.toContain('.vaultman-table');
	});

	it('should ensure cursor-col-resize is emitted for header resizer', async () => {
		const uno = await createGenerator(unoConfig);
		const { css } = await uno.generate(['vm-node-table-header-resizer']);

		expect(css).toContain('cursor:col-resize');
	});
});
