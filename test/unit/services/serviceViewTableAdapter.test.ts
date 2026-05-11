import { describe, expect, it } from 'vitest';
import type { RowSelectionState } from '@tanstack/table-core';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	buildNodeTableColumnDefs,
	nodeRowsFromTree,
	nodeTableColumnsForProvider,
	rowSelectionFromSnapshot,
	rowSelectionIds,
	resolveRowSelectionUpdate,
} from '../../../src/services/serviceViewTableAdapter';
import type { NodeSelectionSnapshot } from '../../../src/types/typeSelection';
import type { ContentMeta, FileMeta, PropMeta, TagMeta, TreeNode } from '../../../src/types/typeNode';

const tree: TreeNode[] = [
	{
		id: 'parent',
		label: 'Parent',
		depth: 0,
		meta: {},
		count: 2,
		children: [{ id: 'child', label: 'Child', depth: 1, meta: {}, icon: 'lucide-file' }],
	},
];

describe('serviceViewTableAdapter', () => {
	it('flattens tree nodes into stable table rows with default cells', () => {
		const rows = nodeRowsFromTree(tree);

		expect(rows.map((row) => row.id)).toEqual(['parent', 'child']);
		expect(rows[0].cells.map((cell) => [cell.columnId, cell.display])).toEqual([
			['label', 'Parent'],
			['detail', ''],
			['count', '2'],
		]);
		expect(rows[1].depth).toBe(1);
		expect(rows[1].icon).toBe('lucide-file');
	});

	it('builds TanStack column definitions from Vaultman columns', () => {
		const defs = buildNodeTableColumnDefs(DEFAULT_NODE_TABLE_COLUMNS);

		expect(defs.map((column) => column.id)).toEqual(['label', 'detail', 'count']);
		expect(defs[0].enableSorting).toBe(true);
		expect(defs[1].enableSorting).toBe(false);
		expect(defs[0].accessorFn?.(nodeRowsFromTree(tree)[0], 0)).toBe('Parent');
	});

	it('defines provider-specific table columns for property nodes', () => {
		const propTree: TreeNode<PropMeta>[] = [
			{
				id: 'status',
				label: 'status',
				count: 3,
				depth: 0,
				meta: { propName: 'status', propType: 'list', isValueNode: false },
				children: [
					{
						id: 'status::draft',
						label: 'draft',
						count: 2,
						depth: 1,
						meta: {
							propName: 'status',
							propType: 'list',
							isValueNode: true,
							rawValue: 'draft',
						},
					},
				],
			},
		];
		const columns = nodeTableColumnsForProvider('props');
		const defs = buildNodeTableColumnDefs(columns);
		const rows = nodeRowsFromTree(propTree);

		expect(columns.map((column) => column.id)).toEqual(['label', 'nodeKind', 'propType', 'count']);
		expect(defs[1].accessorFn?.(rows[0], 0)).toBe('Property');
		expect(defs[1].accessorFn?.(rows[1], 1)).toBe('Value');
		expect(defs[2].accessorFn?.(rows[0], 0)).toBe('list');
	});

	it('defines provider-specific table columns for tag nodes', () => {
		const tagTree: TreeNode<TagMeta>[] = [
			{
				id: 'project/active',
				label: 'active',
				count: 5,
				depth: 1,
				meta: { tagPath: 'project/active' },
			},
		];
		const columns = nodeTableColumnsForProvider('tags');
		const defs = buildNodeTableColumnDefs(columns);
		const rows = nodeRowsFromTree(tagTree);

		expect(columns.map((column) => column.id)).toEqual(['label', 'tagPath', 'depth', 'count']);
		expect(defs[1].accessorFn?.(rows[0], 0)).toBe('#project/active');
		expect(defs[2].accessorFn?.(rows[0], 0)).toBe(1);
	});

	it('defines provider-specific table columns for file nodes', () => {
		const fileTree: TreeNode<FileMeta>[] = [
			{
				id: 'folder:Projects',
				label: 'Projects',
				depth: 0,
				meta: { file: null, isFolder: true, folderPath: 'Projects' },
				children: [
					{
						id: 'Projects/Alpha.md',
						label: 'Alpha',
						count: 4,
						depth: 1,
						meta: {
							file: {
								path: 'Projects/Alpha.md',
								basename: 'Alpha',
								name: 'Alpha.md',
							} as FileMeta['file'],
							isFolder: false,
							folderPath: 'Projects',
						},
					},
				],
			},
		];
		const columns = nodeTableColumnsForProvider('files');
		const defs = buildNodeTableColumnDefs(columns);
		const rows = nodeRowsFromTree(fileTree);

		expect(columns.map((column) => column.id)).toEqual(['label', 'fileType', 'path', 'count']);
		expect(defs[1].accessorFn?.(rows[0], 0)).toBe('Folder');
		expect(defs[1].accessorFn?.(rows[1], 1)).toBe('File');
		expect(defs[2].accessorFn?.(rows[1], 1)).toBe('Projects/Alpha.md');
	});

	it('defines provider-specific table columns for content nodes', () => {
		const contentTree: TreeNode<ContentMeta>[] = [
			{
				id: 'content:file:Notes/Alpha.md',
				label: 'Notes/Alpha.md',
				count: 2,
				depth: 0,
				meta: { kind: 'file', filePath: 'Notes/Alpha.md', file: null },
				children: [
					{
						id: 'content:match:1',
						label: '3: before match after',
						depth: 1,
						meta: {
							kind: 'match',
							filePath: 'Notes/Alpha.md',
							file: null,
							line: 2,
							before: 'before ',
							match: 'match',
							after: ' after',
						},
					},
				],
			},
		];
		const columns = nodeTableColumnsForProvider('content');
		const defs = buildNodeTableColumnDefs(columns);
		const rows = nodeRowsFromTree(contentTree);

		expect(columns.map((column) => column.id)).toEqual(['label', 'filePath', 'line', 'count']);
		expect(defs[1].accessorFn?.(rows[1], 1)).toBe('Notes/Alpha.md');
		expect(defs[2].accessorFn?.(rows[1], 1)).toBe(3);
	});

	it('converts node selection snapshots to row selection state', () => {
		const snapshot: NodeSelectionSnapshot = {
			ids: new Set(['parent', 'child']),
			selected: new Map([
				['parent', true],
				['child', true],
			]),
			anchorId: 'parent',
			focusedId: 'child',
			hoveredId: null,
			activeId: 'child',
		};

		expect(rowSelectionFromSnapshot(snapshot)).toEqual({ parent: true, child: true });
	});

	it('resolves TanStack row selection updates without losing stable ids', () => {
		const previous: RowSelectionState = { parent: true };
		const next = resolveRowSelectionUpdate((state) => ({ ...state, child: true }), previous);

		expect(rowSelectionIds(next)).toEqual(['parent', 'child']);
	});
});
