import { describe, expect, it } from 'vitest';

import {
	formatFileTableName,
	resolveFileTableLayout,
} from '../../src/logic/logicTableLayout';

describe('file table layout', () => {
	it('projects visible cells into Bases-style absolute column offsets', () => {
		const layout = resolveFileTableLayout(new Set(['name', 'ext', 'path']));

		expect(layout.totalWidth).toBe(612);
		expect(
			layout.columns.map((column) => ({
				id: column.id,
				left: column.left,
				width: column.width,
				dataProperty: column.dataProperty,
			})),
		).toEqual([
			{ id: 'name', left: 0, width: 300, dataProperty: 'file.name' },
			{ id: 'ext', left: 300, width: 111, dataProperty: 'file.ext' },
			{ id: 'path', left: 411, width: 201, dataProperty: 'file.folder' },
		]);
	});

	it('maps the visible date column to the active date sort property', () => {
		const modified = resolveFileTableLayout(new Set(['name', 'date']), 'mtime');
		const created = resolveFileTableLayout(new Set(['name', 'date']), 'ctime');

		expect(modified.columns[1]).toMatchObject({
			id: 'date',
			sortColumn: 'mtime',
			dataProperty: 'file.mtime',
			left: 300,
			width: 213,
		});
		expect(created.columns[1]).toMatchObject({
			id: 'date',
			sortColumn: 'ctime',
			dataProperty: 'file.ctime',
			left: 300,
			width: 213,
		});
	});

	it('keeps optional icon and count columns stable without shrinking text columns', () => {
		const layout = resolveFileTableLayout(
			new Set(['icon', 'name', 'count', 'ext', 'path']),
		);

		expect(layout.totalWidth).toBe(742);
		expect(layout.columns.map((column) => [column.id, column.left])).toEqual([
			['icon', 0],
			['name', 34],
			['count', 334],
			['ext', 430],
			['path', 541],
		]);
	});

	it('shows Markdown files without extension but keeps non-Markdown extensions visible', () => {
		expect(
			formatFileTableName({
				basename: 'Daily note',
				extension: 'md',
				name: 'Daily note.md',
			}),
		).toBe('Daily note');
		expect(
			formatFileTableName({
				basename: '_vaultman_table_parity_reference',
				extension: 'base',
				name: '_vaultman_table_parity_reference.base',
			}),
		).toBe('_vaultman_table_parity_reference.base');
	});
});
