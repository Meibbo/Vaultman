import { describe, expect, it } from 'vitest';

import { byLevelModel } from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import { FilesLogic } from '../../src/logic/logicsFiles';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';

import type { App, TFolder, Vault } from 'obsidian';
import type { ExplorerSortState } from '../../src/types/typeUI';
import type { FileMeta, TreeNode } from '../../src/types/typeTree';

function filesState(nodeTypeFilters: string[] = []): ExplorerSortState {
	return {
		...normalizeExplorerSortState('files', null),
		nodeTypeFilters,
	};
}

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path.split('/').pop() ?? path,
		parent: null,
		path,
		vault: {} as Vault,
	} satisfies TFolder;
}

function foldersOnlyTree(): TreeNode<FileMeta>[] {
	const logic = new FilesLogic({} as App);
	// No file rows: this is what the explorer hands buildFileTree while the
	// mode is on.
	return logic.buildFileTree(
		[],
		[
			makeFolder('alpha'),
			makeFolder('alpha/beta'),
			makeFolder('alpha/beta/gamma'),
		],
		{ emptyFolderCarets: false },
	);
}

describe('folders-only projection', () => {
	it('drops folders-first and fixed-folders while only folders are drawn', () => {
		const normal = byLevelModel('files', filesState(), true)?.items.map(
			(item) => item.id,
		);
		expect(normal).toContain('parentsFirst');
		expect(normal).toContain('fixedFolders');

		// No file rows means folders-first has nothing to order against and
		// fixed-folders has nothing to hold still.
		const foldersOnly = byLevelModel(
			'files',
			filesState(['folders-only']),
			true,
		)?.items.map((item) => item.id);
		expect(foldersOnly).not.toContain('parentsFirst');
		expect(foldersOnly).not.toContain('fixedFolders');
		expect(foldersOnly).toContain('nested');
	});

	it('survives nesting being turned off', () => {
		// The flat branch has its own folder builder, so leaving Nested does not
		// drop the mode back to a file list.
		expect(filesExplorerSource).toContain('buildFlatFolderNodes(');
		const branch = filesExplorerSource.slice(
			filesExplorerSource.indexOf('const renderTree = this._nestedEnabled()'),
			filesExplorerSource.indexOf(
				'if (this._nestedEnabled()) this._autoExpandSparseTopLevel',
			),
		);
		expect(branch).not.toBe('');
		expect(branch).toContain('foldersOnly');
		expect(branch.indexOf('buildFlatFolderNodes(')).toBeLessThan(
			branch.indexOf('buildFlatFileNodes('),
		);
	});

	it('labels by path without waiting for the cell to be toggled on', () => {
		// Two subtrees can share a folder name; the path is what tells them apart,
		// and asking for folders only is asking to work on folders.
		const body = filesExplorerSource.slice(
			filesExplorerSource.indexOf('private _pathLabelActive()'),
			filesExplorerSource.indexOf('private _resolveFileIcon('),
		);
		expect(body).not.toBe('');
		expect(body).toContain('this._foldersOnlyMode()');
		expect(body).toContain("this.visibleCells.has('path')");
	});

	it('drops the caret on folders that are leaves in this projection', () => {
		// The deepest folders keep no file rows to open onto here, so a caret
		// on them promises a level the projection itself removed.
		const tree = foldersOnlyTree();
		const alpha = tree[0];
		const beta = alpha.children?.[0];
		const gamma = beta?.children?.[0];

		expect(gamma?.label).toBe('gamma');
		expect(gamma?.showCaret).toBe(false);
		expect(alpha.showCaret).toBe(true);
		expect(beta?.showCaret).toBe(true);
	});

	it('leaves the caret alone outside the mode', () => {
		// Core draws a caret on every folder, empty ones included, and the
		// normal projection still follows it.
		const logic = new FilesLogic({} as App);
		const tree = logic.buildFileTree([], [makeFolder('beta')]);

		expect(tree[0]).toMatchObject({ label: 'beta', showCaret: true });
	});

	it('asks for the caret rule from the folders-only branch', () => {
		expect(filesExplorerSource).toContain('emptyFolderCarets: !foldersOnly');
	});

	it('keeps the mode out of the shared filter tree', () => {
		// It is a projection: the files it hides are hidden for this explorer, not
		// removed from the filter every frame and scene reads.
		const mode = filesExplorerSource.slice(
			filesExplorerSource.indexOf('private _foldersOnlyMode()'),
			filesExplorerSource.indexOf('private _fileTypeId('),
		);
		expect(mode).not.toBe('');
		expect(mode).toContain('this.nodeTypeFilters.includes');
		expect(mode).not.toContain('filterService');
	});
});
