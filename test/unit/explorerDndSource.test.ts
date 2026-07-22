import { describe, expect, it } from 'vitest';
// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import mainSource from '../../src/main.ts?raw';
import dragEditorDropSource from '../../src/utils/dragEditorDrop.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('explorer drag and drop source guards', () => {
	it('keeps property editor drops scoped to markdown editor targets', () => {
		expect(dragEditorDropSource).toContain(
			'.cm-content, .cm-line, .cm-editor, .cm-scroller',
		);
		expect(mainSource).toMatch(
			/activeDocument\.addEventListener\(\s*'dragover'/,
		);
		expect(mainSource).toContain('private readonly handleVaultmanDragOver');
		expect(mainSource).toContain(
			'this.markdownViewFromDropTarget(event.target)',
		);
		expect(mainSource).toContain(
			"this.app.workspace.getLeavesOfType('markdown')",
		);
		expect(mainSource).toContain(
			'const file = view?.file ?? this.app.workspace.getActiveFile()',
		);
	});

	it('wires internal drop callbacks through node table rows', () => {
		expect(nodeTableSource).toContain(
			'onDragOver?: (id: string, event: DragEvent)',
		);
		expect(nodeTableSource).toContain(
			'onDrop?: (id: string, event: DragEvent)',
		);
		expect(nodeTableSource).toContain('row.ondragover = (event) =>');
		expect(nodeTableSource).toContain('row.ondrop = (event) =>');
	});

	it('emits native drag state classes on virtual tree and table rows', () => {
		for (const source of [treeSource, nodeTableSource]) {
			expect(source).toContain("row.addClass('is-being-dragged')");
			expect(source).toContain("row.removeClass('is-being-dragged')");
			expect(source).toContain("row.removeClass('is-being-dragged-over')");
			expect(source).toContain("row.toggleClass('is-being-dragged-over'");
		}
		expect(stylesSource).toContain('.vaultman-tree-row.is-being-dragged-over');
		expect(stylesSource).toContain('hsla(var(--interactive-accent-hsl), 0.12)');
	});

	it('wires files, props and tags explorer internal drops', () => {
		expect(filesSource).toContain('private _handleFileDrop');
		expect(filesSource).toContain('private _fileDropTargetFolderPath');
		expect(filesSource).toContain("if (targetNode.depth === 0) return ''");
		expect(filesSource).toContain('this._moveDraggedNodesIntoFolder');
		expect(filesSource).toContain('fileManager.renameFile');
		expect(filesSource).toContain(
			'targetFolderPath.startsWith(`${source.path}/`)',
		);
		expect(filesSource).toContain('private readonly _handleRootFileDrop');
		expect(filesSource).toContain(
			"void this._moveDraggedNodesIntoFolder(payload, '')",
		);
		expect(filesSource).toContain(
			"dragManager.dragFile?.(event, entries[0], 'vaultman')",
		);
		expect(filesSource).toContain(
			"dragManager.dragFiles?.(event, entries, 'vaultman')",
		);
		expect(propsSource).toContain('private _handlePropDrop');
		expect(propsSource).toContain('this._copyDraggedValueToProperty');
		expect(propsSource).toContain('this.plugin.showDragActionGuide?.');
		expect(propsSource).toContain('private _stringComparableValue');
		expect(propsSource).not.toContain('String(raw) === value');
		expect(tagsSource).toContain('private _handleTagDrop');
		expect(tagsSource).toContain('this._nestDraggedTags');
		expect(tagsSource).toContain('targetTagPath.startsWith(`${tagPath}/`)');
		expect(tagsSource).toContain('private readonly _handleRootTagDrop');
		expect(tagsSource).toContain("void this._nestDraggedTags(payload, '')");
		expect(tagsSource).toContain(
			'targetTagPath ? `${targetTagPath}/${leaf}` : leaf',
		);
	});

	it('keeps dock-off islands at the frame bottom', () => {
		expect(frameSource).toContain(
			'class:vaultman-pages-viewport--dock-off={!showDock}',
		);
		expect(stylesSource).toContain(
			'.vaultman-pages-viewport--dock-off .vaultman-queue-island-wrap',
		);
		expect(stylesSource).toContain('bottom: 8px;');
	});
});
