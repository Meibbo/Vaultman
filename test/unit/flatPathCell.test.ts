import type { App, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { FilesLogic } from '../../src/logic/logicsFiles';
import {
	cellDef,
	cellMenuOrder,
	resolveCellRenderOrder,
	viewMenuCells,
} from '../../src/logic/logicCellRegistry';
import { compareFilesForExplorer } from '../../src/logic/logicSort';
import { isSortOptionVisible } from '../../src/logic/logicScopedSort';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';

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

describe('BT5-012 path label projection', () => {
	it('keeps the Path cell out of the menu while Nested is active', () => {
		expect(cellDef('path')?.requiresCellsOff).toEqual(['nested']);

		const nestedOn = viewMenuCells('files', 'tree', [
			'name',
			'ext',
			'nested',
		]).map((definition) => definition.id);
		expect(nestedOn).not.toContain('path');

		const nestedOff = viewMenuCells('files', 'tree', ['name', 'ext']).map(
			(definition) => definition.id,
		);
		expect(nestedOff).toContain('path');
	});

	it('offers Path in the cell menu only when Nested is off', () => {
		const withNested = cellMenuOrder('files', ['name', 'ext', 'nested'], {
			byActivation: false,
			viewMode: 'tree',
		}).map((entry) => entry.id);
		expect(withNested).not.toContain('path');

		const flat = cellMenuOrder('files', ['name', 'ext'], {
			byActivation: false,
			viewMode: 'tree',
		}).map((entry) => entry.id);
		expect(flat).toContain('path');
	});

	it('drops the Path projection from the render order while Nested is active', () => {
		expect(
			resolveCellRenderOrder('files', ['name', 'path', 'nested'], {
				byActivation: true,
				viewMode: 'tree',
			}),
		).toEqual(['name', 'nested']);
		expect(
			resolveCellRenderOrder('files', ['name', 'path'], {
				byActivation: true,
				viewMode: 'tree',
			}),
		).toEqual(['name', 'path']);
	});

	it('projects the label onto file.name or file.path, never a folder-relative hybrid', () => {
		const logic = new FilesLogic(makeApp());
		const files = [makeFile('alpha/note.md'), makeFile('beta/note.md')];

		expect(logic.buildFlatFileNodes(files).map((node) => node.label)).toEqual([
			'note.md',
			'note.md',
		]);
		expect(
			logic
				.buildFlatFileNodes(files, { labelMode: 'path' })
				.map((node) => node.label),
		).toEqual(['alpha/note.md', 'beta/note.md']);
	});

	it('keeps both projections absolute when the view is rebased into a folder', () => {
		const logic = new FilesLogic(makeApp());
		const file = makeFile('alpha/deep/note.md');

		expect(
			logic
				.buildFlatFileNodes([file], {
					rebaseFolderPaths: ['alpha'],
					labelMode: 'path',
				})
				.map((node) => node.label),
		).toEqual(['alpha/deep/note.md']);
		expect(
			logic
				.buildFlatFileNodes([file], { rebaseFolderPaths: ['alpha'] })
				.map((node) => node.label),
		).toEqual(['note.md']);
	});

	it('keeps Name and Path sorts reading their own field', () => {
		const zebraInAlpha = makeFile('alpha/zebra.md');
		const alphaInZebra = makeFile('zebra/alpha.md');

		expect(
			compareFilesForExplorer(zebraInAlpha, alphaInZebra, 'name', 'asc'),
		).toBeGreaterThan(0);
		expect(
			compareFilesForExplorer(zebraInAlpha, alphaInZebra, 'path', 'asc'),
		).toBeLessThan(0);
		expect(
			isSortOptionVisible('path', {
				tab: 'files',
				nestedActive: true,
				activeScope: 'all',
			}),
		).toBe(false);
	});

	it('wires the label mode through the Files explorer and the view popup', () => {
		expect(explorerFilesSource).toContain('private _pathLabelActive()');
		expect(explorerFilesSource).toContain(
			"labelMode: this._pathLabelActive() ? 'path' : 'name'",
		);
		expect(popupViewSource).toContain(
			'viewMenuCells(activeTab, activeView, activePills)',
		);
	});
});
