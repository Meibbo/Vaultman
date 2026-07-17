import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import fileTableSource from '../../src/components/layout/viewGrid.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('Files explorer multi-selection source contracts', () => {
	it('keeps selection policy in a pure helper before core modifier-open routing', () => {
		expect(explorerFilesSource).toContain('fileSelectionGesture');
		expect(explorerFilesSource).toContain('updateFileSelection');
		expect(explorerFilesSource).toContain(
			'const selectionGesture = fileSelectionGesture(event, this.addMode);',
		);
		expect(explorerFilesSource).toContain(
			'const paneType = Keymap.isModEvent(event);',
		);
	});

	it('projects one panel-owned selection into tree, table, and grid', () => {
		expect(explorerFilesSource).toContain(
			'selectedIds: this.selectedFilePaths',
		);
		expect(explorerFilesSource).toContain(
			'this.tableView.setSelectedPaths(this.selectedFilePaths);',
		);
		expect(explorerFilesSource).toContain(
			'this.gridView.setSelectedPaths(this.selectedFilePaths);',
		);
		expect(treeSource).toContain('selectedIds?: Set<string>;');
		expect(treeSource).toContain("row.toggleClass('is-selected', isSelected);");
		expect(fileTableSource).toContain(
			'setSelectedPaths(paths: ReadonlySet<string>)',
		);
		expect(filesGridSource).toContain(
			'setSelectedPaths(paths: ReadonlySet<string>)',
		);
	});

	it('passes a selected file batch into the existing native drag bridge', () => {
		expect(explorerFilesSource).toContain(
			'this._selectedFileDragPayload(nodePayload)',
		);
		expect(explorerFilesSource).toContain("kind: 'file' as const");
		expect(explorerFilesSource).toContain('path: selectedPath');
	});

	it('does not let the grid intercept Ctrl/Cmd before panel open routing', () => {
		expect(filesGridSource).not.toContain(
			'this.callbacks.isAddMode?.() === true &&',
		);
		expect(filesGridSource).toContain(
			'this.callbacks.onFileClick(file, event);',
		);
	});
});
