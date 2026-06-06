import { describe, expect, it } from 'vitest';

import { buildVirtualTableWindow } from '../../src/utils/tableVirtualization';

describe('table virtualization model', () => {
	it('keeps full table height while projecting only visible rows', () => {
		const rows = Array.from({ length: 10_000 }, (_, index) => index);
		const projection = buildVirtualTableWindow({
			rows,
			scrollTop: 30 * 9900,
			viewportHeight: 300,
			rowHeight: 30,
			overscan: 4,
		});

		expect(projection.totalHeight).toBe(300_000);
		expect(projection.startIndex).toBe(9896);
		expect(projection.endIndex).toBe(9914);
		expect(projection.visibleRows).toHaveLength(18);
		expect(projection.visibleRows[0]).toEqual({
			row: 9896,
			index: 9896,
			top: 296_880,
		});
	});
});
