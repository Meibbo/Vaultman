import { describe, expect, it, vi } from 'vitest';
import { explorerFiles } from '../../../src/providers/explorerFiles';
import { AdoptionService } from '../../../src/services/serviceAdoption.svelte';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import type { FnRRenameHandoff } from '../../../src/types/typeFnR';
import type { FileMeta, TreeNode } from '../../../src/types/typeNode';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

function makePlugin(): {
	plugin: VaultmanPlugin;
	files: TFile[];
	openLinkText: ReturnType<typeof vi.fn>;
	setSelectedFiles: ReturnType<typeof vi.fn>;
} {
	const a = mockTFile('Notes/a.md', { frontmatter: { status: 'draft' } });
	const b = mockTFile('Notes/b.md', { frontmatter: { status: 'done' } });
	const files = [a, b] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft' } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	const openLinkText = vi.fn();
	(app.workspace as unknown as { openLinkText: typeof openLinkText }).openLinkText = openLinkText;
	const setSelectedFiles = vi.fn();
	const decorationManager = new DecorationManager(app);

	return {
		files,
		openLinkText,
		setSelectedFiles,
		plugin: {
			app,
			settings: {
				explorerFilesShowHidden: false,
				explorerOperationScope: 'auto',
			},
			contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
			queueService: { add: vi.fn() },
			filesIndex: {
				nodes: [],
				revision: 42,
				getSearchBuffer: vi.fn(() => ''),
			},
			propsIndex: {
				revision: 7,
			},
			operationsIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
			activeFiltersIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
			filterService: {
				filteredFiles: files,
				selectedFiles: [],
				setSelectedFiles,
			},
			decorationManager,
			viewService: new ViewService({ decorationManager }),
			propertyIndex: {},
		} as unknown as VaultmanPlugin,
	};
}

describe('explorerFiles interactions', () => {
	it('turns a file node click into selected files instead of filtering or opening the note', () => {
		const { plugin, files, openLinkText, setSelectedFiles } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();

		explorer.handleNodeClick(fileNode!);

		expect(setSelectedFiles).toHaveBeenCalledWith([files[0]]);
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('opens a file from the secondary node action', () => {
		const { plugin, files, openLinkText, setSelectedFiles } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();

		explorer.handleNodeSecondaryAction?.(fileNode!);

		expect(openLinkText).toHaveBeenCalledWith(files[0].path, '', false);
		expect(setSelectedFiles).not.toHaveBeenCalled();
	});

	it('queues file deletion from the registered context menu action', async () => {
		const { plugin, files } = makePlugin();
		const trashFile = vi.spyOn(plugin.app.fileManager, 'trashFile');
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.delete')?.[0];

		expect(fileNode).toBeTruthy();
		expect(deleteAction).toBeTruthy();

		await deleteAction.run({
			nodeType: 'file',
			node: fileNode,
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		expect(trashFile).not.toHaveBeenCalled();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('file_delete');
		expect(change.action).toBe('delete');
		expect(change.files).toEqual([files[0]]);
	});

	it('queues file deletion for all selected file context nodes', async () => {
		const { plugin, files } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.delete')?.[0];

		expect(fileNodes.length).toBe(2);
		expect(deleteAction).toBeTruthy();

		await deleteAction.run({
			nodeType: 'file',
			node: fileNodes[0],
			selectedNodes: fileNodes,
			surface: 'panel',
			file: files[0],
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.files[0],
			),
		).toEqual(files);
	});

	it('can show only the selected files without changing the active filter', () => {
		const { plugin, files, setSelectedFiles } = makePlugin();
		(plugin.filterService as unknown as { selectedFiles: TFile[] }).selectedFiles = [files[1]];
		const explorer = new explorerFiles(plugin);

		explorer.setShowSelectedOnly(true);

		expect(explorer.getFiles()).toEqual([files[1]]);
		expect(setSelectedFiles).not.toHaveBeenCalled();
	});

	it('shows non-markdown vault files when no active filter tree is narrowing the explorer', () => {
		const { plugin, files } = makePlugin();
		const pdf = mockTFile('Assets/manual.pdf');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [...files, pdf];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		expect(explorer.getFiles()).toEqual([...files, pdf]);
		expect(explorer.getTree().some((node) => node.id === 'folder:Assets')).toBe(true);
	});

	it('hides dot-prefixed files and folders by default', () => {
		const { plugin, files } = makePlugin();
		const hiddenFile = mockTFile('Notes/.draft.md');
		const hiddenFolderFile = mockTFile('.vaultman/cache.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [
			...files,
			hiddenFile,
			hiddenFolderFile,
		];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const paths = explorer.getFiles().map((file) => file.path);

		expect(paths).toEqual(files.map((file) => file.path));
		expect(explorer.getTree().some((node) => node.id === 'folder:.vaultman')).toBe(false);
	});

	it('shows dot-prefixed files and folders when enabled in settings', () => {
		const { plugin, files } = makePlugin();
		(plugin.settings as unknown as { explorerFilesShowHidden: boolean }).explorerFilesShowHidden =
			true;
		const hiddenFile = mockTFile('Notes/.draft.md');
		const hiddenFolderFile = mockTFile('.vaultman/cache.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [
			...files,
			hiddenFile,
			hiddenFolderFile,
		];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const paths = explorer.getFiles().map((file) => file.path);

		expect(paths).toEqual([...files, hiddenFile, hiddenFolderFile].map((file) => file.path));
		expect(explorer.getTree().some((node) => node.id === 'folder:.vaultman')).toBe(true);
	});

	it('places folders before root files by default when building the Files tree', () => {
		const { plugin } = makePlugin();
		const rootA = mockTFile('alpha.md');
		const rootB = mockTFile('beta.md');
		const nested = mockTFile('Projects/project.md');
		const nestedChild = mockTFile('Projects/zz/deep.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [
			rootA,
			rootB,
			nested,
			nestedChild,
		];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		expect(explorer.getTree().map((node) => node.id)).toEqual([
			'folder:Projects',
			rootA.path,
			rootB.path,
		]);
		expect(
			explorer
				.getTree()
				.find((node) => node.id === 'folder:Projects')
				?.children?.map((node) => node.id),
		).toEqual(['folder:Projects/zz', nested.path]);
	});

	it('keeps root files before later folders when folders-first is disabled', () => {
		const { plugin } = makePlugin();
		(
			plugin.settings as unknown as { explorerFilesFoldersFirst: boolean }
		).explorerFilesFoldersFirst = false;
		const rootA = mockTFile('alpha.md');
		const rootB = mockTFile('beta.md');
		const nested = mockTFile('Projects/project.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [
			rootA,
			rootB,
			nested,
		];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		expect(explorer.getTree().map((node) => node.id)).toEqual([
			rootA.path,
			rootB.path,
			'folder:Projects',
		]);
	});

	it('creates missing ancestor folders so nested folder nodes follow the file path', () => {
		const { plugin } = makePlugin();
		const nested = mockTFile('Root/Child/file.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [nested];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const tree = explorer.getTree();
		const root = tree.find((node) => node.id === 'folder:Root');
		const child = root?.children?.find((node) => node.id === 'folder:Root/Child');

		expect(root).toBeTruthy();
		expect(root?.depth).toBe(0);
		expect(child).toBeTruthy();
		expect(child?.depth).toBe(1);
		expect(child?.children?.[0]).toMatchObject({
			id: 'Root/Child/file.md',
			depth: 2,
		});
		expect(tree.some((node) => node.id === 'folder:Root/Child')).toBe(false);
	});

	it('opens the panel context menu for folder nodes', () => {
		const { plugin } = makePlugin();
		const nested = mockTFile('Root/Child/file.md');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [nested];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);
		const root = explorer.getTree().find((node) => node.id === 'folder:Root');
		const event = {} as MouseEvent;

		expect(root).toBeTruthy();

		explorer.handleContextMenu(root!, event);

		expect(plugin.contextMenuService.openPanelMenu).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeType: 'folder',
				node: root,
				surface: 'panel',
			}),
			event,
		);
	});

	it('uses the file extension as the non-markdown count label', () => {
		const { plugin, files } = makePlugin();
		const pdf = mockTFile('Assets/manual.pdf', { frontmatter: { ignored: true } });
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [...files, pdf];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const assets = explorer.getTree().find((node) => node.id === 'folder:Assets');
		const pdfNode = assets?.children?.find((node) => node.id === pdf.path);

		expect(pdfNode).toBeTruthy();
		expect(pdfNode?.countLabel).toBe('pdf');
		expect(pdfNode?.count).toBeUndefined();
	});

	it('shows root image files with an image icon', () => {
		const { plugin, files } = makePlugin();
		const png = mockTFile('cover.png');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [...files, png];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const pngNode = explorer.getTree().find((node) => node.id === 'cover.png');

		expect(pngNode).toBeTruthy();
		expect(pngNode?.icon).toBe('lucide-image');
	});

	it('starts a file rename handoff from selected registered context menu nodes', async () => {
		const { plugin, files } = makePlugin();
		const startRenameHandoff = vi.fn<(handoff: FnRRenameHandoff) => void>();
		const explorer = new explorerFiles(plugin, { startRenameHandoff });
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];
		const renameAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.rename')?.[0];

		expect(fileNodes.length).toBe(2);
		expect(renameAction).toBeTruthy();

		await renameAction.run({
			nodeType: 'file',
			node: fileNodes[0],
			selectedNodes: fileNodes,
			surface: 'panel',
			file: files[0],
		});

		expect(plugin.queueService.add).not.toHaveBeenCalled();
		expect(startRenameHandoff).toHaveBeenCalledWith({
			status: 'editing',
			sourceKind: 'file',
			original: files[0].name,
			replacement: '',
			files,
			scope: 'selected',
		});
	});

	it('routes set and delete hover badges to file queue operations', () => {
		const { plugin, files } = makePlugin();
		const explorer = new explorerFiles(plugin) as explorerFiles & {
			handleHoverBadge?: (node: ReturnType<explorerFiles['getTree']>[number], kind: string) => void;
		};
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();
		expect(typeof explorer.handleHoverBadge).toBe('function');

		explorer.handleHoverBadge?.(fileNode!, 'set');
		explorer.handleHoverBadge?.(fileNode!, 'delete');

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.action,
			),
		).toEqual(['append-links', 'delete']);
	});

	it('routes selected file hover badges to all same-type selected nodes', () => {
		const { plugin, files, setSelectedFiles } = makePlugin();
		const explorer = new explorerFiles(plugin) as explorerFiles & {
			handleHoverBadge?: (
				node: ReturnType<explorerFiles['getTree']>[number],
				kind: string,
				selectedNodes?: ReturnType<explorerFiles['getTree']>,
			) => void;
		};
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];

		expect(fileNodes.length).toBe(2);

		explorer.handleHoverBadge?.(fileNodes[0], 'filter', fileNodes);
		explorer.handleHoverBadge?.(fileNodes[0], 'delete', fileNodes);

		expect(setSelectedFiles).toHaveBeenCalledWith(files);
		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.files[0],
			),
		).toEqual(files);
	});

	it('adds cached adopted header and task children to file nodes when adoption is enabled', async () => {
		const { plugin, files } = makePlugin();
		const adoptionService = new AdoptionService();
		adoptionService.enabled = true;
		adoptionService.adoptTasks = true;
		const explorer = new explorerFiles(plugin, {
			adoptionService,
			readFileContent: async () => `# Project
- [ ] Follow up
`,
		});

		await explorer.preloadAdoptedChildren([files[0]]);

		const noteFolder = explorer.getTree()[0];
		const fileNode = noteFolder.children?.find((node) => node.meta.file === files[0]);

		expect(fileNode?.children?.map((node) => node.label)).toEqual(['Project']);
		expect(fileNode?.children?.[0].children?.map((node) => node.label)).toEqual(['Follow up']);
	});

	it('keeps file node children unchanged when adoption is disabled', async () => {
		const { plugin, files } = makePlugin();
		const adoptionService = new AdoptionService();
		const readFileContent = vi.fn(async () => `# Project
- [ ] Follow up
`);
		const notify = vi.fn();
		const explorer = new explorerFiles(plugin, {
			adoptionService,
			readFileContent,
		});
		explorer.subscribe(notify);

		await explorer.preloadAdoptedChildren([files[0]]);

		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(readFileContent).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
		expect(fileNode?.children).toEqual([]);
	});

	it('preloads adopted children asynchronously and notifies subscribers without async getTree reads', async () => {
		const { plugin, files } = makePlugin();
		const adoptionService = new AdoptionService();
		adoptionService.enabled = true;
		const readFileContent = vi.fn(async () => '# Cached');
		const explorer = new explorerFiles(plugin, { adoptionService, readFileContent });
		const notify = vi.fn();

		explorer.subscribe(notify);
		const before = explorer.getTree();

		expect(before[0].children?.find((node) => node.meta.file === files[0])?.children).toEqual([]);
		expect(readFileContent).not.toHaveBeenCalled();

		await explorer.preloadAdoptedChildren([files[0]]);
		const after = explorer.getTree();

		expect(readFileContent).toHaveBeenCalledOnce();
		expect(notify).toHaveBeenCalledOnce();
		expect(after[0].children?.find((node) => node.meta.file === files[0])?.children?.[0].label).toBe(
			'Cached',
		);
	});
});

describe('explorerFiles structural source', () => {
	it('getStructuralTree returns the same node ids and shape as getTree()', () => {
		const { plugin } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const decorated = explorer.getTree();
		const structural = explorer.getStructuralTree();

		expect(idShape(structural)).toEqual(idShape(decorated));
	});

	it('getStructuralTree does not invoke viewService.getModel', () => {
		const { plugin } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const spy = vi.spyOn(plugin.viewService, 'getModel');

		explorer.getStructuralTree();

		expect(spy).not.toHaveBeenCalled();
	});

	it('action hooks operate on nodes returned by getStructuralTree', () => {
		const { plugin, openLinkText } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const structural = explorer.getStructuralTree();
		const firstFile = findFirstFileNode(structural);

		expect(firstFile).toBeDefined();

		explorer.handleNodeSecondaryAction(firstFile!);

		expect(openLinkText).toHaveBeenCalledWith(firstFile!.meta.file!.path, '', false);
	});

	it('getStructuralRevisions returns files and props revisions from indexes', () => {
		const { plugin } = makePlugin();
		const explorer = new explorerFiles(plugin);

		expect(explorer.getStructuralRevisions()).toEqual({
			filesRevision: plugin.filesIndex.revision,
			propsRevision: plugin.propsIndex.revision,
		});
	});
});

function idShape(nodes: TreeNode<FileMeta>[]): unknown {
	return nodes.map((node) => ({
		id: node.id,
		label: node.label,
		children: node.children ? idShape(node.children) : undefined,
	}));
}

function findFirstFileNode(nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta> | undefined {
	for (const node of nodes) {
		if (node.meta?.file) return node;
		const childMatch = node.children ? findFirstFileNode(node.children) : undefined;
		if (childMatch) return childMatch;
	}
	return undefined;
}
