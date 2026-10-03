import { describe, expect, it } from 'vitest';

import {
	activePaneInOwner,
	scopePickAvailability,
} from '../../src/logic/logicScopePick';
import {
	findNodeLevel,
	findScopeParentId,
	hasScopeParentNodes,
} from '../../src/logic/logicIndexGroups';

describe('scope pick ownership and availability', () => {
	const tree = [
		{
			id: 'prop',
			label: 'status',
			children: [{ id: 'value', label: 'open' }],
		},
		{ id: 'leaf', label: 'standalone' },
	];

	it('lets a p-node own itself and a leaf fall back to its parent', () => {
		expect(findScopeParentId(tree, 'prop')).toBe('prop');
		expect(findScopeParentId(tree, 'value')).toBe('prop');
		expect(findScopeParentId(tree, 'leaf')).toBeNull();
		expect(hasScopeParentNodes(tree)).toBe(true);
		expect(hasScopeParentNodes([{ id: 'leaf', label: 'standalone' }])).toBe(
			false,
		);
	});

	it('accepts a semantic parent even when its children are not projected', () => {
		const flatFolders = [
			{ id: 'folder', label: 'folder', isFolder: true },
			{ id: 'note.md', label: 'note', isFolder: false },
		];
		const isFolder = (node: (typeof flatFolders)[number]) => node.isFolder;

		expect(findScopeParentId(flatFolders, 'folder', null, isFolder)).toBe(
			'folder',
		);
		expect(hasScopeParentNodes(flatFolders, isFolder)).toBe(true);
	});

	it('U130-GGC-028: allows node_group as parent and resolves level 0 for root / level N for nested', () => {
		const treeWithGroups = [
			{
				id: 'root-group-header',
				label: 'Group A',
				isGroupHeader: true,
				children: [
					{
						id: 'folder-1',
						label: 'Folder 1',
						children: [
							{
								id: 'nested-group-header',
								label: 'Nested Group',
								isGroupHeader: true,
								children: [{ id: 'file-1.md', label: 'File 1' }],
							},
						],
					},
				],
			},
			{
				id: 'empty-group-header',
				label: 'Group Empty',
				isGroupHeader: true,
				children: [],
			},
		];

		// Group header is an eligible parent even if empty
		expect(hasScopeParentNodes([{ id: 'empty-group-header', label: 'Group Empty', isGroupHeader: true }])).toBe(true);
		expect(findScopeParentId(treeWithGroups, 'empty-group-header')).toBe('empty-group-header');

		// Picking root group header selects it as parent
		expect(findScopeParentId(treeWithGroups, 'root-group-header')).toBe('root-group-header');

		// Picking nested child under nested group resolves nested group as parent
		expect(findScopeParentId(treeWithGroups, 'file-1.md')).toBe('nested-group-header');

		// Root group header is Level 0+1
		expect(findNodeLevel(treeWithGroups, 'root-group-header')).toBe('0+1');
		expect(findNodeLevel(treeWithGroups, 'empty-group-header')).toBe('0+1');

		// Normal root level is Level 1 (if not group header)
		expect(findNodeLevel([{ id: 'root-item', label: 'Root Item' }], 'root-item')).toBe(1);

		// Folder under root group is Level 1 (natural node at root)
		expect(findNodeLevel(treeWithGroups, 'folder-1')).toBe(1);

		// Nested group header keeps compound depth (Level 1+1 under folder-1)
		expect(findNodeLevel(treeWithGroups, 'nested-group-header')).toBe('1+1');
	});

	it('keeps Scope but hides Level when Nested is off', () => {
		expect(
			scopePickAvailability({
				tab: 'props',
				treeCapable: true,
				nestedActive: false,
				hasParentNodes: true,
			}),
		).toEqual({ parent: false, level: false });
		expect(
			scopePickAvailability({
				tab: 'props',
				treeCapable: true,
				nestedActive: true,
				hasParentNodes: true,
			}),
		).toEqual({ parent: true, level: true });
	});

	it('keeps Files Parent for folders-only while Nested is off', () => {
		expect(
			scopePickAvailability({
				tab: 'files',
				treeCapable: true,
				nestedActive: false,
				hasParentNodes: true,
				filesFoldersOnly: true,
			}),
		).toEqual({ parent: true, level: false });
	});

	it('resolves the active pane only from the owner root', () => {
		const pane = {} as HTMLElement;
		const owner = {
			querySelector: (selector: string) =>
				selector === '.vaultman-filters-tab-pane.is-active' ? pane : null,
		} as unknown as ParentNode;
		expect(activePaneInOwner(owner)).toBe(pane);
		expect(activePaneInOwner(null)).toBeNull();
	});
});
