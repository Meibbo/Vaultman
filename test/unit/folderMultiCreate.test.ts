import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder } from 'obsidian';

import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import {
	runMultiCreate,
	toErrorMessage,
} from '../../src/logic/logicMultiCreate';
import { resolveSelectionTargets } from '../../src/logic/logicSelectionTargets';
import type { MenuCtx } from '../../src/types/typeCMenu';
import type { FileMeta, TreeNode } from '../../src/types/typeTree';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

function makeFolder(path: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = path.split('/').pop() ?? path;
	return folder;
}

function makeFile(path: string): TFile {
	const file = new TFile();
	file.path = path;
	file.name = path.split('/').pop() ?? path;
	return file;
}

function folderNode(path: string): TreeNode<FileMeta> {
	const folder = makeFolder(path);
	return {
		id: `folder:${path}`,
		label: path,
		depth: 0,
		meta: {
			file: null,
			folder,
			isFolder: true,
			folderPath: path,
		},
	} as TreeNode<FileMeta>;
}

function fileNode(path: string): TreeNode<FileMeta> {
	return {
		id: path,
		label: path,
		depth: 0,
		meta: {
			file: makeFile(path),
			isFolder: false,
			folderPath: path.split('/').slice(0, -1).join('/'),
		},
	} as TreeNode<FileMeta>;
}

type MultiCreateHarness = {
	_resolveFolderTargets: (ctx: MenuCtx) => TFolder[];
	_createFilesInFolders: (
		actionId: string,
		folders: readonly TFolder[],
		fileName: string,
		content: string,
		openFirst: boolean,
	) => Promise<{ succeeded: { destinationPath: string; createdPath: string }[]; failed: { destinationPath: string; error: string }[] }>;
	_createFoldersInFolders: (
		actionId: string,
		folders: readonly TFolder[],
	) => Promise<{ succeeded: { destinationPath: string; createdPath: string }[]; failed: { destinationPath: string; error: string }[] }>;
	lastMultiCreateResult: {
		actionId: string;
		succeeded: { destinationPath: string; createdPath: string }[];
		failed: { destinationPath: string; error: string }[];
	} | null;
	_lastRenderTree: TreeNode<FileMeta>[];
	expandedIds: Set<string>;
	selectedFilePaths: Set<string>;
	plugin: unknown;
	logic: unknown;
	_notifyExpansionChanged: () => void;
	_refreshFromFilterService: () => void;
};

function createPanelHarness(options: {
	nodes: TreeNode<FileMeta>[];
	failOn?: Set<string>;
} ): {
	panel: MultiCreateHarness;
	vault: {
		created: string[];
		contents: Map<string, string>;
		create: ReturnType<typeof vi.fn>;
		createFolder: ReturnType<typeof vi.fn>;
	};
	workspace: { openLinkText: ReturnType<typeof vi.fn> };
} {
	const base: Record<string, unknown> = {};
	Object.setPrototypeOf(base, FilesExplorerPanel.prototype);
	const panel = base as unknown as MultiCreateHarness;
	const failOn = options.failOn ?? new Set<string>();
	const created: string[] = [];
	const contents = new Map<string, string>();
	const store = new Map<string, unknown>();
	const vault = {
		created,
		contents,
		getAbstractFileByPath: vi.fn((path: string) => store.get(path) ?? null),
		getRoot: vi.fn(() => makeFolder('')),
		create: vi.fn(async (path: string, content: string) => {
			if (failOn.has(path)) throw new Error(`EACCES ${path}`);
			const file = makeFile(path);
			store.set(path, file);
			created.push(path);
			contents.set(path, content);
			return file;
		}),
		createFolder: vi.fn(async (path: string) => {
			if (failOn.has(path)) throw new Error(`EACCES ${path}`);
			const folder = makeFolder(path);
			store.set(path, folder);
			created.push(path);
		}),
	};
	const workspace = {
		openLinkText: vi.fn(async () => undefined),
	};
	panel.plugin = {
		app: { vault, workspace },
		filterService: { applyFilters: vi.fn() },
	};
	panel.logic = {
		getAncestorFolderIdsFromPaths: vi.fn(() => []),
		getAncestorFolderIds: vi.fn(() => []),
	};
	panel._lastRenderTree = options.nodes;
	panel.expandedIds = new Set<string>();
	panel.selectedFilePaths = new Set<string>();
	panel._notifyExpansionChanged = () => undefined;
	panel._refreshFromFilterService = () => undefined;
	return {
		panel,
		vault: {
			created,
			contents,
			create: vault.create,
			createFolder: vault.createFolder,
		},
		workspace,
	};
}

function folderCtx(
	node: TreeNode<FileMeta>,
	selectedIds: string[],
	orderedIds: string[],
): MenuCtx {
	return {
		nodeType: 'folder',
		node: node as unknown as MenuCtx['node'],
		surface: 'panel',
		selectedIds: new Set(selectedIds),
		orderedIds,
	};
}

describe('U130 A12 runMultiCreate preserves per-destination results', () => {
	it('runs destinations in order and records created paths', async () => {
		const seen: string[] = [];
		const report = await runMultiCreate(['a', 'b', 'c'], async (dest) => {
			seen.push(dest);
			return `${dest}/Untitled.md`;
		});
		expect(seen).toEqual(['a', 'b', 'c']);
		expect(report.succeeded.map((entry) => entry.createdPath)).toEqual([
			'a/Untitled.md',
			'b/Untitled.md',
			'c/Untitled.md',
		]);
		expect(report.failed).toEqual([]);
	});

	it('keeps earlier successes when a later destination fails', async () => {
		const report = await runMultiCreate(['a', 'b', 'c'], async (dest) => {
			if (dest === 'b') throw new Error('EACCES b');
			return `${dest}/Untitled.md`;
		});
		expect(report.succeeded.map((entry) => entry.destinationPath)).toEqual([
			'a',
			'c',
		]);
		expect(report.failed).toEqual([
			{ destinationPath: 'b', error: 'EACCES b' },
		]);
	});

	it('normalizes non-Error rejections to messages', () => {
		expect(toErrorMessage('nope')).toBe('nope');
		expect(toErrorMessage(new Error('boom'))).toBe('boom');
	});

	it('follows the canonical selection rule for folder ids', () => {
		const selected = new Set(['folder:a', 'folder:b', 'folder:c']);
		expect(
			resolveSelectionTargets('folder:b', selected, [
				'folder:c',
				'folder:b',
				'folder:a',
			]),
		).toEqual(['folder:c', 'folder:b', 'folder:a']);
		expect(resolveSelectionTargets('folder:z', selected, ['folder:a'])).toEqual([
			'folder:z',
		]);
	});
});

describe('U130 A12 folder.new_* selection destinations', () => {
	it('invoked inside the selection reaches every selected folder in visible order', () => {
		const nodes = [folderNode('a'), folderNode('b'), folderNode('c')];
		const { panel } = createPanelHarness({ nodes });
		const ctx = folderCtx(
			nodes[1],
			['folder:a', 'folder:b', 'folder:c'],
			['folder:c', 'folder:b', 'folder:a'],
		);
		const targets = panel._resolveFolderTargets(ctx);
		expect(targets.map((folder) => folder.path)).toEqual(['c', 'b', 'a']);
	});

	it('invoked outside the selection acts only on the invoked folder', () => {
		const nodes = [folderNode('a'), folderNode('b'), folderNode('c')];
		const { panel } = createPanelHarness({ nodes });
		const ctx = folderCtx(nodes[2], ['folder:a', 'folder:b'], [
			'folder:a',
			'folder:b',
			'folder:c',
		]);
		const targets = panel._resolveFolderTargets(ctx);
		expect(targets.map((folder) => folder.path)).toEqual(['c']);
	});

	it('a mixed file+folder selection still creates in the folders alone', () => {
		const nodes = [fileNode('a.md'), folderNode('a'), folderNode('b')];
		const { panel } = createPanelHarness({ nodes });
		const ctx = folderCtx(nodes[1], ['a.md', 'folder:a', 'folder:b'], [
			'a.md',
			'folder:a',
			'folder:b',
		]);
		const targets = panel._resolveFolderTargets(ctx);
		expect(targets.map((folder) => folder.path)).toEqual(['a', 'b']);
	});
});

describe('U130 A12 folder.new_* creations per destination', () => {
	it('folder.new_note creates Untitled.md in every selected folder and opens only the first', async () => {
		const nodes = [folderNode('a'), folderNode('b'), folderNode('c')];
		const { panel, vault, workspace } = createPanelHarness({ nodes });
		const folders = panel._resolveFolderTargets(
			folderCtx(nodes[0], ['folder:a', 'folder:b', 'folder:c'], [
				'folder:a',
				'folder:b',
				'folder:c',
			]),
		);
		const report = await panel._createFilesInFolders(
			'folder.new_note',
			folders,
			'Untitled.md',
			'',
			true,
		);
		expect(vault.created).toEqual([
			'a/Untitled.md',
			'b/Untitled.md',
			'c/Untitled.md',
		]);
		expect(report.failed).toEqual([]);
		expect(workspace.openLinkText).toHaveBeenCalledTimes(1);
		expect(workspace.openLinkText).toHaveBeenCalledWith(
			'a/Untitled.md',
			'',
			false,
		);
		expect(panel.lastMultiCreateResult?.actionId).toBe('folder.new_note');
		expect(
			panel.lastMultiCreateResult?.succeeded.map((entry) => entry.createdPath),
		).toEqual(['a/Untitled.md', 'b/Untitled.md', 'c/Untitled.md']);
	});

	it('folder.new_folder creates New folder in every selected folder without opening', async () => {
		const nodes = [folderNode('a'), folderNode('b')];
		const { panel, vault, workspace } = createPanelHarness({ nodes });
		const folders = panel._resolveFolderTargets(
			folderCtx(nodes[1], ['folder:a', 'folder:b'], ['folder:a', 'folder:b']),
		);
		const report = await panel._createFoldersInFolders(
			'folder.new_folder',
			folders,
		);
		expect(vault.created).toEqual(['a/New folder', 'b/New folder']);
		expect(report.failed).toEqual([]);
		expect(workspace.openLinkText).not.toHaveBeenCalled();
		expect(panel.lastMultiCreateResult?.actionId).toBe('folder.new_folder');
	});

	it('folder.new_canvas and folder.new_base keep their names and contents per destination', async () => {
		const canvasNodes = [folderNode('a'), folderNode('b')];
		const canvasHarness = createPanelHarness({ nodes: canvasNodes });
		const canvasFolders = canvasHarness.panel._resolveFolderTargets(
			folderCtx(canvasNodes[0], ['folder:a', 'folder:b'], [
				'folder:a',
				'folder:b',
			]),
		);
		const canvasContent = JSON.stringify({ nodes: [], edges: [] }, null, '\t');
		await canvasHarness.panel._createFilesInFolders(
			'folder.new_canvas',
			canvasFolders,
			'Untitled.canvas',
			canvasContent,
			true,
		);
		expect(canvasHarness.vault.created).toEqual([
			'a/Untitled.canvas',
			'b/Untitled.canvas',
		]);
		expect(canvasHarness.vault.contents.get('a/Untitled.canvas')).toBe(
			canvasContent,
		);

		const baseNodes = [folderNode('a'), folderNode('b')];
		const baseHarness = createPanelHarness({ nodes: baseNodes });
		const baseFolders = baseHarness.panel._resolveFolderTargets(
			folderCtx(baseNodes[0], ['folder:a', 'folder:b'], [
				'folder:a',
				'folder:b',
			]),
		);
		const baseContent = 'views:\n  - type: table\n    name: Table\n';
		await baseHarness.panel._createFilesInFolders(
			'folder.new_base',
			baseFolders,
			'Untitled.base',
			baseContent,
			true,
		);
		expect(baseHarness.vault.created).toEqual([
			'a/Untitled.base',
			'b/Untitled.base',
		]);
		expect(baseHarness.vault.contents.get('b/Untitled.base')).toBe(baseContent);
	});

	it('a failing destination preserves earlier creations and records the failure', async () => {
		const nodes = [folderNode('a'), folderNode('b'), folderNode('c')];
		const { panel, vault, workspace } = createPanelHarness({
			nodes,
			failOn: new Set(['b/Untitled.md']),
		});
		const folders = panel._resolveFolderTargets(
			folderCtx(nodes[0], ['folder:a', 'folder:b', 'folder:c'], [
				'folder:a',
				'folder:b',
				'folder:c',
			]),
		);
		const report = await panel._createFilesInFolders(
			'folder.new_note',
			folders,
			'Untitled.md',
			'',
			true,
		);
		expect(vault.created).toEqual(['a/Untitled.md', 'c/Untitled.md']);
		expect(report.succeeded.map((entry) => entry.createdPath)).toEqual([
			'a/Untitled.md',
			'c/Untitled.md',
		]);
		expect(report.failed.map((entry) => entry.destinationPath)).toEqual(['b']);
		expect(panel.lastMultiCreateResult?.failed).toHaveLength(1);
		expect(panel.lastMultiCreateResult?.succeeded).toHaveLength(2);
		// The first success still opens; the failure never masquerades as success.
		expect(workspace.openLinkText).toHaveBeenCalledTimes(1);
		expect(workspace.openLinkText).toHaveBeenCalledWith(
			'a/Untitled.md',
			'',
			false,
		);
	});
});

describe('U130 A12 folder.new_* source wiring', () => {
	it('wires all four creations through the canonical selection rule', () => {
		for (const actionId of [
			'folder.new_note',
			'folder.new_folder',
			'folder.new_canvas',
			'folder.new_base',
		]) {
			expect(explorerFilesSource).toContain(`id: '${actionId}'`);
		}
		expect(explorerFilesSource).toContain('this._resolveFolderTargets(ctx)');
		expect(explorerFilesSource).toContain('this._createFilesInFolders(');
		expect(explorerFilesSource).toContain('this._createFoldersInFolders(');
		expect(explorerFilesSource).toContain("'Untitled.md'");
		expect(explorerFilesSource).toContain("'Untitled.canvas'");
		expect(explorerFilesSource).toContain("'Untitled.base'");
		expect(explorerFilesSource).toContain("_createFoldersInFolders('folder.new_folder'");
	});
});
