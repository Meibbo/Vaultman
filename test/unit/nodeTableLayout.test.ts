import { describe, expect, it } from 'vitest';

import {
	resolveNodeTableLayout,
	type NodeTableSurface,
} from '../../src/logic/logicNodeTableLayout';

describe('node table layout', () => {
	it.each<NodeTableSurface>(['props', 'tags'])(
		'projects %s visible cells into stable Bases-style columns',
		(surface) => {
			const layout = resolveNodeTableLayout(
				surface,
				new Set(['icon', 'text', 'type', 'count']),
			);

			expect(layout.totalWidth).toBe(532);
			expect(
				layout.columns.map((column) => [column.id, column.left, column.width]),
			).toEqual([
				['icon', 0, 34],
				['text', 34, 300],
				['type', 334, 116],
				['count', 450, 82],
			]);
		},
	);

	it('suppresses the type column when the cell is hidden', () => {
		const layout = resolveNodeTableLayout(
			'tags',
			new Set(['icon', 'text', 'count']),
		);

		expect(layout.totalWidth).toBe(416);
		expect(layout.columns.map((column) => column.id)).toEqual([
			'icon',
			'text',
			'count',
		]);
	});

	it('applies resizable node-table column overrides with minimum widths', () => {
		const layout = resolveNodeTableLayout(
			'props',
			new Set(['icon', 'text', 'count']),
			{ text: 420, count: 10 },
		);

		expect(layout.totalWidth).toBe(510);
		expect(
			layout.columns.map((column) => [column.id, column.left, column.width]),
		).toEqual([
			['icon', 0, 34],
			['text', 34, 420],
			['count', 454, 56],
		]);
	});
});
