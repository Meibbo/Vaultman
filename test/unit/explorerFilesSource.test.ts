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
		expect(explorerFilesSource).toContain(
			'const files = this._filesInsideFolder(folder);',
		);
		expect(explorerFilesSource).toContain('files,');
		expect(explorerFilesSource).not.toContain('files: [],');
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

	it('does not inject all vault folders into the default nested Files result surface', () => {
		expect(explorerFilesSource).toContain(
			'if (!this.searchFolder) return folders',
		);
		expect(explorerFilesSource).toContain(
			'return folders.filter((folder) => folder.path.toLowerCase().includes(term))',
		);
	});

	it('keeps folder create actions and separates include/exclude folder filters in panel menus', () => {
		expect(explorerFilesSource).toContain("id: 'folder.new_note'");
		expect(explorerFilesSource).toContain("id: 'folder.new_folder'");
		expect(explorerFilesSource).toContain("id: 'folder.new_canvas'");
		expect(explorerFilesSource).toContain("id: 'folder.new_base'");
		expect(explorerFilesSource).toContain("id: 'folder.make_copy'");
		expect(explorerFilesSource).toContain('this._createFileInFolder');
		expect(explorerFilesSource).toContain('this._copyFolder');
		expect(explorerFilesSource).toContain('separatorBefore: true');
	});

	it('narrows dragged file and folder payloads before passing paths into Obsidian vault APIs', () => {
		const moveDraggedNodesBlock = explorerFilesSource.match(
			/private async _moveDraggedNodesIntoFolder[\s\S]*?\n\tprivate _dragNodes/,
		)?.[0];

		expect(moveDraggedNodesBlock).toContain(
			'const nodes = this._fileDragNodes(payload);',
		);
		expect(moveDraggedNodesBlock).toContain(
			'this.plugin.app.vault.getAbstractFileByPath(node.path)',
		);
		expect(moveDraggedNodesBlock).not.toContain(
			'this._dragNodes(payload).filter',
		);
	});

	it('uses direct flat file nodes when nested display is disabled', () => {
		expect(explorerFilesSource).toContain('this.logic.buildFlatFileNodes(');
		expect(explorerFilesSource).toContain(
			'const renderTree = this._nestedEnabled()',
		);
		expect(explorerFilesSource).toContain(': this.logic.buildFlatFileNodes');
	});

	it('exposes file open-mode actions for new tab, split-right, and new window', () => {
		expect(explorerFilesSource).toContain("id: 'file.open_tab'");
		expect(explorerFilesSource).toContain("id: 'file.open_right'");
		expect(explorerFilesSource).toContain("id: 'file.open_window'");
		expect(explorerFilesSource).toContain("workspace.getLeaf('tab')");
		expect(explorerFilesSource).toContain("workspace.getLeaf('split', 'vertical')");
		expect(explorerFilesSource).toContain('workspace.openPopoutLeaf()');
	});

	it('keeps Parents First separate from nested display mode', () => {
		expect(explorerFilesSource).toContain('private parentsFirst = true;');
		expect(explorerFilesSource).toContain('parentsFirst = true');
		expect(explorerFilesSource).toContain(
			'this.parentsFirst === parentsFirst',
		);
		expect(explorerFilesSource).toContain('this.parentsFirst = parentsFirst');
		expect(explorerFilesSource).toContain('parentsFirst: this.parentsFirst');
		expect(explorerFilesSource).toContain('parentsFirst: this.parentsFirst,');
	});
});
