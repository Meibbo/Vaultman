import { describe, expect, it } from 'vitest';

import { byLevelModel } from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';

import type { ExplorerSortState } from '../../src/types/typeUI';

function filesState(nodeTypeFilters: string[] = []): ExplorerSortState {
	return {
		...normalizeExplorerSortState('files', null),
		nodeTypeFilters,
	};
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
