import type { App, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { FilesLogic } from '../../src/logic/logicsFiles';

// Spec 08 §2, "Compact folders": mirrors VS Code's `CompressedObjectTreeModel.
// compress` -- a folder absorbs its single child into the SAME row only while
// that child count stays at exactly 1 AND the child is itself a folder. A
// lone file child, or 2+ children of any kind, stops the chain right there.

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	const name = path === '/' ? '' : (path.split('/').pop() ?? path);
	return {
		children: [],
		isRoot: () => path === '/',
		name,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const parentPath = lastSlash === -1 ? '/' : path.slice(0, lastSlash);
	const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	const dot = fileName.lastIndexOf('.');
	const basename = dot === -1 ? fileName : fileName.slice(0, dot);

	return {
		basename,
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

function makeApp(): App {
	return {
		metadataCache: {
			getFileCache() {
				return { frontmatter: {} };
			},
		},
	} as unknown as App;
}

describe('FilesLogic.buildFileTree compactFolders (spec 08 §2)', () => {
	it('leaves the tree alone when compactFolders is off (default)', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree([makeFile('a/b/c/file.md')]);

		expect(tree.map((n) => n.label)).toEqual(['a']);
		expect(tree[0].children?.[0]?.label).toBe('b');
		expect(tree[0].meta.compactedSegments).toBeUndefined();
	});

	it('merges a run of single-child folders into one row', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree([makeFile('a/b/c/file.md')], [], {
			compactFolders: true,
		});

		expect(tree).toHaveLength(1);
		const merged = tree[0];
		expect(merged.label).toBe('a/b/c');
		expect(merged.depth).toBe(0);
		expect(merged.meta.isFolder).toBe(true);
		expect(merged.meta.compactedSegments).toEqual(['a', 'b', 'c']);
		// The merged row keeps the DEEPEST folder as the operable target.
		expect(merged.meta.folderPath).toBe('a/b/c');
		expect(merged.id).toBe('folder:a/b/c');

		expect(merged.children).toHaveLength(1);
		expect(merged.children?.[0]?.label).toBe('file');
		expect(merged.children?.[0]?.depth).toBe(1);
	});

	it('does not merge a folder with a lone FILE child (only folder chains compact)', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree([makeFile('a/file.md')], [], {
			compactFolders: true,
		});

		expect(tree).toHaveLength(1);
		expect(tree[0].label).toBe('a');
		expect(tree[0].meta.compactedSegments).toBeUndefined();
		expect(tree[0].children?.[0]?.label).toBe('file');
	});

	it('stops the chain at a folder with 2+ children', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree(
			[makeFile('a/b/x.md'), makeFile('a/b/y.md')],
			[],
			{ compactFolders: true },
		);

		expect(tree).toHaveLength(1);
		expect(tree[0].label).toBe('a/b');
		expect(tree[0].meta.compactedSegments).toEqual(['a', 'b']);
		expect(tree[0].children?.map((n) => n.label)).toEqual(['x', 'y']);
		expect(tree[0].children?.every((n) => n.depth === 1)).toBe(true);
	});

	it('merges independent branches separately', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree(
			[makeFile('a/b/x.md'), makeFile('c/d/e/y.md')],
			[],
			{ compactFolders: true },
		);

		expect(tree.map((n) => n.label).sort()).toEqual(['a/b', 'c/d/e']);
		for (const node of tree) expect(node.depth).toBe(0);
	});

	it('re-numbers descendant depth under a merged chain', () => {
		const logic = new FilesLogic(makeApp());
		const tree = logic.buildFileTree(
			[makeFile('a/b/c/d/one.md'), makeFile('a/b/c/d/nested/two.md')],
			[],
			{ compactFolders: true },
		);

		const merged = tree[0];
		expect(merged.label).toBe('a/b/c/d');
		expect(merged.depth).toBe(0);
		const one = merged.children?.find((n) => n.label === 'one');
		const nested = merged.children?.find((n) => n.label === 'nested');
		expect(one?.depth).toBe(1);
		expect(nested?.depth).toBe(1);
		expect(nested?.children?.[0]?.depth).toBe(2);
	});
});
