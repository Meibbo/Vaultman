import { describe, expect, it } from 'vitest';

import {
	findNodeLevel,
	findParentId,
	findScopeParentId,
	hasScopeParentNodes,
	indexLevel,
} from '../../src/logic/logicIndexGroups';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import { resolveContextClickSelection } from '../../src/logic/logicSelectionTargets';

type FileNode = {
	id: string;
	label: string;
	meta: { isFolder: boolean };
	isGroupHeader?: boolean;
	children?: FileNode[];
};

/** Files scope predicate after the fix: folders + group headers. */
const filesIsScopeParent = (node: FileNode): boolean =>
	node.meta.isFolder || node.isGroupHeader === true;

/** Legacy predicate before the fix: folders only. */
const legacyIsFolderOnly = (node: FileNode): boolean => node.meta.isFolder;

/** Raw model without derived headers (what `_lastRenderTree` holds). */
const rawFilesOnly: FileNode[] = [
	{ id: 'b.md', label: 'b.md', meta: { isFolder: false } },
	{ id: 'a.md', label: 'a.md', meta: { isFolder: false } },
];

/** Projected tree: two L1 gc-nodo headers + one folder, same instance. */
const projectedL1: FileNode[] = [
	{
		id: 'vaultman.group.header:level%3A1:Team',
		label: 'Team',
		meta: { isFolder: true },
		isGroupHeader: true,
		children: [
			{ id: 'a.md', label: 'a.md', meta: { isFolder: false } },
			{ id: 'b.md', label: 'b.md', meta: { isFolder: false } },
		],
	},
	{
		id: 'vaultman.group.header:level%3A1:Inbox',
		label: 'Inbox',
		meta: { isFolder: true },
		isGroupHeader: true,
		children: [{ id: 'c.md', label: 'c.md', meta: { isFolder: false } }],
	},
	{
		id: 'folder:Projects',
		label: 'Projects',
		meta: { isFolder: true },
		children: [{ id: 'Projects/p.md', label: 'p.md', meta: { isFolder: false } }],
	},
];

/** Historic header without the `isGroupHeader` mark (old projection). */
const historicHeader: FileNode[] = [
	{
		id: 'vaultman.group.header:level%3A1:Team',
		label: 'Team',
		meta: { isFolder: true },
		children: [{ id: 'a.md', label: 'a.md', meta: { isFolder: false } }],
	},
];

describe('U130-GGC-028 Files Select-a-parent over the projected tree', () => {
	it('reproduces the bug: raw tree with only files offers no parent', () => {
		expect(hasScopeParentNodes(rawFilesOnly, legacyIsFolderOnly)).toBe(false);
		expect(hasScopeParentNodes(rawFilesOnly, filesIsScopeParent)).toBe(false);
	});

	it('projected L1 group headers are eligible parents (fix)', () => {
		expect(hasScopeParentNodes(projectedL1, filesIsScopeParent)).toBe(true);
		expect(
			findScopeParentId(
				projectedL1,
				'vaultman.group.header:level%3A1:Team',
				null,
				filesIsScopeParent,
			),
		).toBe('vaultman.group.header:level%3A1:Team');
		expect(
			findScopeParentId(projectedL1, 'a.md', null, filesIsScopeParent),
		).toBe('vaultman.group.header:level%3A1:Team');
		expect(
			findScopeParentId(projectedL1, 'Projects/p.md', null, filesIsScopeParent),
		).toBe('folder:Projects');
	});

	it('top-level index lists L1 headers as containers (Select-a-parent roots)', () => {
		const level = indexLevel(projectedL1, null, filesIsScopeParent);
		const ids = level.map((entry) => entry.id);
		expect(ids).toContain('vaultman.group.header:level%3A1:Team');
		expect(ids).toContain('vaultman.group.header:level%3A1:Inbox');
		expect(ids).toContain('folder:Projects');
		expect(level.find((entry) => entry.id === 'vaultman.group.header:level%3A1:Team')?.isContainer).toBe(
			true,
		);
	});

	it('root headers are Level 0, nested headers keep structural depth', () => {
		expect(
			findNodeLevel(projectedL1, 'vaultman.group.header:level%3A1:Team'),
		).toBe(0);
		const nested: FileNode[] = [
			{
				id: 'vaultman.group.header:level%3A1:Team',
				label: 'Team',
				meta: { isFolder: true },
				isGroupHeader: true,
				children: [
					{
						id: 'folder:Sub',
						label: 'Sub',
						meta: { isFolder: true },
						children: [
							{
								id: 'vaultman.group.header:level%3A2:Nested',
								label: 'Nested',
								meta: { isFolder: true },
								isGroupHeader: true,
								children: [
									{ id: 'x.md', label: 'x.md', meta: { isFolder: false } },
								],
							},
						],
					},
				],
			},
		];
		expect(
			findScopeParentId(nested, 'x.md', null, filesIsScopeParent),
		).toBe('vaultman.group.header:level%3A2:Nested');
		expect(findNodeLevel(nested, 'vaultman.group.header:level%3A2:Nested')).toBe(
			3,
		);
		// A group id from another level/instance that is not in this tree
		// never resolves: no cross-level or cross-instance leak.
		expect(
			findScopeParentId(nested, 'vaultman.group.header:level%3A9:Foreign', null, filesIsScopeParent),
		).toBeNull();
		expect(findParentId(nested, 'vaultman.group.header:level%3A1:Team')).toBeNull();
	});

	it('historic headers (meta.isFolder, no mark) stay eligible; clean baseline marks Level 0', () => {
		expect(hasScopeParentNodes(historicHeader, filesIsScopeParent)).toBe(true);
		expect(
			findScopeParentId(
				historicHeader,
				'vaultman.group.header:level%3A1:Team',
				null,
				filesIsScopeParent,
			),
		).toBe('vaultman.group.header:level%3A1:Team');
		// Clean baseline with the mark resolves Level 0; historic without the
		// mark still offers the parent (Level 1) instead of hiding the picker.
		expect(findNodeLevel(historicHeader, 'vaultman.group.header:level%3A1:Team')).toBe(1);
		expect(
			findNodeLevel(projectedL1, 'vaultman.group.header:level%3A1:Team'),
		).toBe(0);
	});

	it('historic sort state normalizes like a clean baseline (no data.json rewrite)', () => {
		const clean = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		});
		const legacy = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
		});
		expect(legacy.sorts).toEqual(clean.sorts);
		expect(legacy.activeScope).toBe(clean.activeScope);
	});
});

describe('U130-GGC-009/026 Files Group/Degroup via context-click on grouped children', () => {
	const orderedProjected = [
		'vaultman.group.header:level%3A1:Team',
		'a.md',
		'b.md',
		'vaultman.group.header:level%3A1:Inbox',
		'c.md',
		'folder:Projects',
		'Projects/p.md',
	];
	const plain = { ctrlKey: false, metaKey: false, shiftKey: false };

	it('plain context-click on a grouped child replaces the selection (009)', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['c.md']),
			anchorId: 'c.md',
			orderedVisibleIds: orderedProjected,
			invokedId: 'a.md',
			modifiers: plain,
		});
		expect([...out.selectedIds]).toEqual(['a.md']);
		expect(out.anchorId).toBe('a.md');
	});

	it('context-click on an already-selected grouped child preserves the batch for Group selected', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['a.md', 'b.md']),
			anchorId: 'a.md',
			orderedVisibleIds: orderedProjected,
			invokedId: 'b.md',
			modifiers: null,
		});
		expect([...out.selectedIds].sort()).toEqual(['a.md', 'b.md']);
	});

	it('Ctrl+Shift unions the anchor range without losing the previous batch', () => {
		const out = resolveContextClickSelection({
			selectedIds: new Set(['c.md']),
			anchorId: 'c.md',
			orderedVisibleIds: orderedProjected,
			invokedId: 'Projects/p.md',
			modifiers: { ctrlKey: true, metaKey: false, shiftKey: true },
		});
		expect(out.selectedIds.has('c.md')).toBe(true);
		expect(out.selectedIds.has('Projects/p.md')).toBe(true);
		expect(out.selectedIds.has('folder:Projects')).toBe(true);
	});
});
