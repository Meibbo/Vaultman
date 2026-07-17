import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

describe('FilesExplorerPanel source guards', () => {
	it('does not inherit the native File Explorer container padding contract', () => {
		expect(explorerFilesSource).not.toContain('nav-files-container');
	});

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
		expect(explorerFilesSource).toContain(
			"label: `${translate('ops.move')}...`",
		);
		expect(explorerFilesSource).toContain('new FileMoveModal');
	});

	it('does not inject empty known folders when Files grouping or other narrowing constraints are active', () => {
		expect(explorerFilesSource).toContain(
			'private _hasNarrowingConstraintsBeyondFolderScopes()',
		);
		expect(explorerFilesSource).toContain('this.nodeTypeFilters.length > 0');
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

	it('offers Make a copy for both files and folders', () => {
		expect(explorerFilesSource).toContain("id: 'file.make_copy'");
		expect(explorerFilesSource).toContain("nodeTypes: ['file']");
		expect(explorerFilesSource).toContain(
			"label: translate('file.ctx.make_copy')",
		);
		expect(explorerFilesSource).toContain('await this._copyFile(meta.file);');
		expect(explorerFilesSource).toContain("id: 'folder.make_copy'");
		expect(explorerFilesSource).toContain('await this._copyFolder(folder);');
	});

	it('copies individual and nested files through binary-safe vault APIs', () => {
		expect(explorerFilesSource).toMatch(
			/private async _copyFileToPath\(\s*file: TFile,\s*targetPath: string,?\s*\)/,
		);
		expect(explorerFilesSource).toContain('copyFileBinary');
		expect(explorerFilesSource).toContain(
			'await this._copyFileToPath(file, targetPath);',
		);
		expect(explorerFilesSource).toContain('buildFolderCopyPlan');
		expect(explorerFilesSource).toContain(
			'Partial copy retained at "${targetRoot}".',
		);

		const copyFolderBlock = explorerFilesSource.match(
			/private async _copyFolder[\s\S]*?\n\tprivate readonly _scheduleRefresh/,
		)?.[0];
		expect(copyFolderBlock).not.toContain('vault.read(file)');
		expect(copyFolderBlock).not.toContain('vault.create(');
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
		expect(explorerFilesSource).toContain(
			"workspace.getLeaf('split', 'vertical')",
		);
		expect(explorerFilesSource).toContain('workspace.openPopoutLeaf()');
	});

	it('uses Obsidian core modifier routing for file clicks while preserving add mode', () => {
		expect(explorerFilesSource).toContain('Keymap.isModEvent(event)');
		expect(explorerFilesSource).toContain(
			'this.plugin.app.workspace.getLeaf(paneType)',
		);
		expect(explorerFilesSource).toContain(
			'fileSelectionGesture(event, this.addMode)',
		);
		expect(explorerFilesSource).toContain('if (this.addMode)');
		expect(explorerFilesSource).toMatch(
			/onFileClick: \(file: TFile, event\) =>\s+this\._handleFileClick\(file, event\)/,
		);
	});

	it('keeps Parents First separate from nested display mode', () => {
		expect(explorerFilesSource).toContain('private parentsFirst = true;');
		expect(explorerFilesSource).toContain('parentsFirst = true');
		expect(explorerFilesSource).toContain('this.parentsFirst === parentsFirst');
		expect(explorerFilesSource).toContain('this.parentsFirst = parentsFirst');
		expect(explorerFilesSource).toContain('parentsFirst: this.parentsFirst');
		expect(explorerFilesSource).toContain('parentsFirst: this.parentsFirst,');
	});

	it('keeps Words sorting owned by the panel across Table mounts and header clicks', () => {
		expect(explorerFilesSource).toContain("words: 'words'");
		expect(explorerFilesSource).toContain(
			'onSortChange: (column, direction) =>',
		);
		expect(explorerFilesSource).toContain(
			"column === 'props' ? 'count' : column",
		);
		expect(explorerFilesSource).toContain(
			"if (normalizedSortBy === 'words') this._warmWordCountSort()",
		);
	});

	it('ignores cache invalidations and only reorders when refreshed keys cross neighbors', () => {
		expect(explorerFilesSource).toContain(
			"if (change.kind === 'invalidated') return;",
		);
		expect(explorerFilesSource).toContain(
			"if (this.sortBy === 'words') this._warmWordCountSort(displayFiles);",
		);
		expect(explorerFilesSource).toContain(
			'this.wordSortWarmup = this.wordSortWarmup',
		);
		expect(explorerFilesSource).toContain(
			'.then(() => this.plugin.statisticsCache.ensureFileStats(files))',
		);
		expect(explorerFilesSource).toContain(
			'this.wordSortWarmSignature === signature',
		);
		expect(explorerFilesSource).toContain('changedItemsRemainOrdered(');
		expect(explorerFilesSource).toContain(
			'!this._wordSortNeedsReorder(change.paths ?? [])',
		);
		expect(explorerFilesSource).toContain(
			'this._patchVisibleWordCounts(new Set(change.paths ?? []))',
		);
		expect(explorerFilesSource).toContain("this.wordSortWarmSignature = '';");
		expect(explorerFilesSource).not.toContain(
			'if (sortingByWords) this._render();',
		);
		const patchCellsBlock = explorerFilesSource.match(
			/private _patchVisibleWordCounts[\s\S]*?\n\tprivate readonly _handleActiveFileChange/,
		)?.[0];
		expect(patchCellsBlock).toContain('.vaultman-file-words');
		expect(patchCellsBlock).toContain('.vaultman-files-grid-card-words');
		expect(patchCellsBlock).not.toContain('this._render();');
		expect(explorerFilesSource).toContain('this._scheduleStatsRefresh();');
	});
});
