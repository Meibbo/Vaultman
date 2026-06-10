import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('FilesExplorerPanel source guards', () => {
	it('destroys the file table view before remounting another view', () => {
		expect(explorerFilesSource).toContain('this.gridView?.destroy()');
		expect(explorerFilesSource).toContain('this.gridView = null');
		expect(explorerFilesSource).toContain('this.treeView?.destroy()');
	});

	it('listens to queue changes so file operation badges update live', () => {
		expect(explorerFilesSource).toContain(
			"this.plugin.queueService.on('changed', this._handleQueueChange)",
		);
		expect(explorerFilesSource).toContain(
			"this.plugin.queueService.off('changed', this._handleQueueChange)",
		);
	});

	it('routes folder destructive actions through the operation queue', () => {
		expect(explorerFilesSource).toContain("id: 'folder.rename'");
		expect(explorerFilesSource).toContain('this._queueFolderMove');
		expect(explorerFilesSource).toContain('this._queueFolderDelete');
		expect(explorerFilesSource).toContain('targetFolder: folder.path');
	});

	it('uses the Vaultman folder autosuggest move modal for file move actions', () => {
		expect(explorerFilesSource).toContain("id: 'file.move'");
		expect(explorerFilesSource).toContain("label: `${translate('ops.move')}...`");
		expect(explorerFilesSource).toContain('new FileMoveModal');
	});

	it('does not inject empty known folders when Files grouping or other narrowing constraints are active', () => {
		expect(explorerFilesSource).toContain(
			'private _hasNarrowingConstraintsBeyondFolderScopes()',
		);
		expect(explorerFilesSource).toContain(
			'Boolean(this.searchName || this.searchFolder || this.nodeTypeFilter)',
		);
		expect(explorerFilesSource).toContain(
			'if (this._hasNarrowingConstraintsBeyondFolderScopes()) return []',
		);
		expect(explorerFilesSource).toContain(
			"if (node.type === 'rule') return node.filterType !== 'folder'",
		);
	});
});
