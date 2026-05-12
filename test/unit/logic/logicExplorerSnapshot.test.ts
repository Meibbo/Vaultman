import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../../../src/types/typeNode';
import { buildExplorerSnapshot } from '../../../src/logic/logicExplorerSnapshot';
import type { ExplorerDataPlaneRevisions } from '../../../src/types/typeExplorerDataPlane';

type FileMetaLite = {
	file: { path: string } | null;
	isFolder: boolean;
	folderPath: string;
};

function leaf(
	id: string,
	label: string,
	folderPath: string,
	isFolder = false,
): TreeNode<FileMetaLite> {
	return {
		id,
		label,
		depth: 0,
		meta: {
			file: isFolder ? null : { path: id },
			isFolder,
			folderPath,
		},
	};
}

function buildTree(): TreeNode<FileMetaLite>[] {
	const fileA = leaf('a/x.md', 'x.md', 'a');
	const fileB = leaf('a/b/y.md', 'y.md', 'a/b');
	const fileDupe = leaf('a/b/x.md', 'x.md', 'a/b');
	const folderB: TreeNode<FileMetaLite> = {
		...leaf('a/b', 'b', 'a/b', true),
		children: [fileDupe, fileB],
	};
	const folderA: TreeNode<FileMetaLite> = {
		...leaf('a', 'a', 'a', true),
		children: [folderB, fileA],
	};
	return [folderA];
}

const revisions: ExplorerDataPlaneRevisions = { filesRevision: 1 };

describe('buildExplorerSnapshot', () => {
	it('produces rows in DFS visible order with depth and parent links', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.rows.map((r) => r.id)).toEqual([
			'a',
			'a/b',
			'a/b/x.md',
			'a/b/y.md',
			'a/x.md',
		]);
		expect(snap.rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 1]);
		expect(snap.byId.get('a/b/y.md')?.parentId).toBe('a/b');
		expect(snap.byId.get('a')?.parentId).toBe(null);
		expect(snap.byId.get('a')?.childrenIds).toEqual(['a/b', 'a/x.md']);
	});

	it('builds idToIndex matching visibleIds order', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect([...snap.visibleIds]).toEqual(snap.rows.map((r) => r.id));
		expect(snap.idToIndex.get('a/x.md')).toBe(snap.visibleIds.indexOf('a/x.md'));
	});

	it('handles duplicate labels under distinct paths', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.byId.has('a/x.md')).toBe(true);
		expect(snap.byId.has('a/b/x.md')).toBe(true);
	});

	it('collapses non-expanded subtrees out of visibleIds but keeps them in byId', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.visibleIds).not.toContain('a/b/x.md');
		expect(snap.visibleIds).not.toContain('a/b/y.md');
		expect(snap.byId.has('a/b/x.md')).toBe(true);
		expect(snap.byId.has('a/b/y.md')).toBe(true);
	});

	it('preserves TreeNode identity in row.node and snapshot.tree', () => {
		const tree = buildTree();
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree,
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.tree[0]).toBe(tree[0]);
		expect(snap.byId.get('a')?.node).toBe(tree[0]);
	});

	it('exposes pathToId and folderPathToId from meta.file.path and meta.folderPath', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
			pathFor: (row) => row.node.meta.file?.path,
			folderPathFor: (row) => (row.node.meta.isFolder ? row.node.meta.folderPath : undefined),
		});
		expect(snap.pathToId.get('a/x.md')).toBe('a/x.md');
		expect(snap.pathToId.get('a/b/y.md')).toBe('a/b/y.md');
		expect(snap.folderPathToId.get('a')).toBe('a');
		expect(snap.folderPathToId.get('a/b')).toBe('a/b');
	});

	it('carries sourceRevisions through unchanged', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions: { filesRevision: 7, propsRevision: 3 },
			kindFor: () => 'file',
		});
		expect(snap.sourceRevisions).toEqual({ filesRevision: 7, propsRevision: 3 });
	});

	it('returns structureRevision=0 from the pure builder because service owns the counter', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.revision).toBe(0);
		expect(snap.structureRevision).toBe(0);
	});
});
