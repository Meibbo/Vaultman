import { expect, it } from 'vitest';
import { hasVisibleTableRows } from '../../src/utils/tableVirtualization';

it('detects jumps beyond the rendered range without reading row geometry', () => {
	const range = { startIndex: 10, endIndex: 20, rowHeight: 30 };
	expect(hasVisibleTableRows(range, 600, 300)).toBe(false);
	expect(hasVisibleTableRows(range, 0, 300)).toBe(false);
	expect(hasVisibleTableRows(range, 590, 300)).toBe(true);
	expect(hasVisibleTableRows(range, 299, 300)).toBe(true);
	expect(hasVisibleTableRows(null, 0, 300)).toBe(false);
});
