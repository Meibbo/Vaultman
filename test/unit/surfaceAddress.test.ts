import { describe, expect, it } from 'vitest';
import { addressForLeaf } from '../../src/logic/logicSurfaceAddress';
import type { Workspace, WorkspaceLeaf } from 'obsidian';

type FakeParent = { parent: FakeParent | null };

function harness() {
	const root: FakeParent = { parent: null };
	const leftSplit: FakeParent = { parent: root };
	const rightSplit: FakeParent = { parent: root };
	const leftTabs: FakeParent = { parent: leftSplit };
	const rightTabs: FakeParent = { parent: rightSplit };
	const mainTabs: FakeParent = { parent: root };
	const leftLeaf = { parent: leftTabs } as unknown as WorkspaceLeaf;
	const rightLeaf = { parent: rightTabs } as unknown as WorkspaceLeaf;
	const mainLeaf = { parent: mainTabs } as unknown as WorkspaceLeaf;
	const workspace = { leftSplit, rightSplit, rootSplit: root } as unknown as Workspace;
	return { workspace, leftLeaf, rightLeaf, mainLeaf };
}

describe('addressForLeaf', () => {
	it('returns logical sidebar edges from the live physical parent', () => {
		const h = harness();

		expect(addressForLeaf(h.workspace, h.leftLeaf, false)).toMatchObject({
			kind: 'sidebar',
			edge: 'start',
		});
		expect(addressForLeaf(h.workspace, h.leftLeaf, true)).toMatchObject({
			kind: 'sidebar',
			edge: 'end',
		});
		expect(addressForLeaf(h.workspace, h.rightLeaf, true)).toMatchObject({
			kind: 'sidebar',
			edge: 'start',
		});
	});

	it('falls back to main only for a leaf outside both sidebars', () => {
		const h = harness();
		expect(addressForLeaf(h.workspace, h.mainLeaf, false)).toMatchObject({ kind: 'main' });
	});
});
