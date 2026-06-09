import { describe, expect, it } from 'vitest';

import filesTableSource from '../../src/components/layout/viewGrid.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';

describe('table surface source guards', () => {
	it('stretches virtual tables to the available surface width', () => {
		for (const source of [filesTableSource, nodeTableSource]) {
			expect(source).toContain('private surfaceWidth');
			expect(source).toContain('Math.max(layout.totalWidth');
			expect(source).toContain('this.surfaceWidth(layout)');
		}
	});
});
