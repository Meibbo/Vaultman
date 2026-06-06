import { describe, expect, it } from 'vitest';

import gridViewSource from '../../src/components/layout/viewGrid.ts?raw';

describe('GridView source guards', () => {
	it('uses Bases-style absolute column offsets instead of CSS grid tracks', () => {
		expect(gridViewSource).toContain('resolveFileTableLayout');
		expect(gridViewSource).toContain('insetInlineStart');
		expect(gridViewSource).toContain('style.width');
		expect(gridViewSource).not.toContain('gridTemplateColumns');
	});
});
