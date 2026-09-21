import { describe, expect, it } from 'vitest';

import {
	activePaneInOwner,
	scopePickAvailability,
} from '../../src/logic/logicScopePick';
import {
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
