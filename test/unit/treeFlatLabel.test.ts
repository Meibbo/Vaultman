// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { flatTreeLabelTarget } from '../../src/logic/logicTreeFlatLabel';
import type { TreeNode } from '../../src/types/typeTree';

describe('flat label semantic halves', () => {
	it('gives the scene only its own name while keeping parent context outside the link', () => {
		// Given a path projection with a node-note binding.
		const row = document.createElement('div');
		const node: TreeNode = { id: 'inbox/99_unsorted.md', label: 'inbox/99_unsorted.md', flatParentLabel: 'inbox', flatOwnLabel: '99_unsorted.md', depth: 0, meta: { hasNodeNote: true } };
		// When the scene formats its operable node.
		const target = flatTreeLabelTarget(row, node);
		const link = document.createElement('span');
		link.className = 'vaultman-node-note-link';
		link.textContent = target.node.label;
		target.host.append(link);
		// Then the binding's decoration cannot include the ancestor context.
		expect(link.textContent).toBe('99_unsorted.md');
		expect(row.textContent).toBe('inbox/99_unsorted.md');
		expect(target.node.id).toBe(node.id);
		expect(row.querySelector('.vaultman-tree-flat-parent')?.textContent).toBe('inbox');
	});

	it('keeps a name-only projection unchanged even when ancestor metadata exists', () => {
		const row = document.createElement('div');
		const node: TreeNode = { id: 'inbox/note.md', label: 'note.md', flatParentLabel: 'inbox', flatOwnLabel: 'note.md', depth: 0, meta: {} };
		const target = flatTreeLabelTarget(row, node);
		expect(target.host).toBe(row);
		expect(target.node).toBe(node);
	});
});
