import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import { FilesLogic } from '../logic/logicsFiles';
import type { TreeNode, FileMeta } from '../types/typeNode';
import type { MenuCtx } from '../types/typeCtxMenu';
import { FileRenameModal } from '../modals/modalFileRename';
import { FileMoveModal } from '../modals/modalFileMove';
import { PropertyManagerModal } from '../modals/modalPropertyManager';
import type { ExplorerProvider, ExplorerViewMode } from '../types/typeExplorer';
import {
	buildAppendLinksChange,
	buildFileDeleteChange,
} from '../services/serviceFileQueue';
import { createFnRState, startFileRenameHandoff } from '../services/serviceFnR';
import type { FnRRenameHandoff } from '../types/typeFnR';
import { resolveOperationScopeFiles } from '../services/serviceOperationScope';
import { getActivePerfProbe } from '../dev/perfProbe';
import { highlightsFromViewLayers, withViewStateClasses } from '../utils/utilViewLayers';

export interface ExplorerFilesOptions {
	startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
}

export class explorerFiles implements ExplorerProvider<FileMeta> {
	id = 'files';
	private plugin: VaultmanPlugin;
	private options: ExplorerFilesOptions;
	private logic: FilesLogic;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private showSelectedOnly = false;
	private showHiddenFiles = false;
	private searchName = '';
	private searchFolder = '';

	constructor(plugin: VaultmanPlugin, options: ExplorerFilesOptions = {}) {
		this.plugin = plugin;
		this.options = options;
		this.logic = new FilesLogic(plugin.app);
		this.showHiddenFiles = plugin.settings?.explorerFilesShowHidden === true;
		this.registerActions();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'file.rename',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				const files = this.contextFiles(ctx);
				this.renameFiles(files);
			},
		});

		svc.registerAction({
			id: 'file.delete',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Delete',
			icon: 'lucide-trash',
			run: (ctx: MenuCtx) => {
				this.deleteFiles(this.contextFiles(ctx));
			},
		});

		svc.registerAction({
			id: 'file.set',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: 'Set (append link)',
			icon: 'lucide-link',
			run: (ctx: MenuCtx) => {
				const sourceFiles = this.contextFiles(ctx);
				this.appendLinksToScope(sourceFiles);
			},
		});

		svc.registerAction({
			id: 'file.move',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: 'Move file',
			icon: 'lucide-folder-input',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				new FileMoveModal(
					this.plugin.app,
					[meta.file],
					(change) => void this.plugin.queueService.add(change),
				).open();
			},
		});

		svc.registerAction({
			id: 'folder.filter',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: (ctx) => `Filter: is in folder ${ctx.node.label}`,
			icon: 'lucide-filter',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.isFolder || !meta.folderPath) return;
				const filterService = this.plugin.filterService as typeof this.plugin.filterService & {
					addIsInFolderFilter?: (folder: { path: string; name: string }) => void;
				};
				filterService.addIsInFolderFilter?.({
					path: meta.folderPath,
					name: ctx.node.label,
				});
			},
		});
	}

	getTree(): TreeNode<FileMeta>[] {
		const probe = getActivePerfProbe();
		const source = this.sourceFiles();
		const filterFlat = () => this.logic.filterFlat(source, this.searchName, this.searchFolder);
		const filtered =
			probe?.measure('explorerFiles.filterFlat', { files: source.length }, filterFlat) ??
			filterFlat();
		const sortFiles = () => this._sortFiles(filtered);
		const sorted =
			probe?.measure('explorerFiles.sort', { files: filtered.length }, sortFiles) ?? sortFiles();
		const buildTree = () => this.logic.buildFileTree(sorted);
		const tree =
			probe?.measure('explorerFiles.buildTree', { files: sorted.length }, buildTree) ?? buildTree();
		if (probe) {
			probe.measure('explorerFiles.decorateTree', { nodes: countTreeNodes(tree) }, () =>
				this._decorateTree(tree),
			);
		} else {
			this._decorateTree(tree);
		}
		return tree;
	}

	private _decorateTree(nodes: TreeNode<FileMeta>[]): void {
		const operations = this.plugin.operationsIndex.nodes;
		const activeFilters = this.plugin.activeFiltersIndex.nodes;
		const revisions = {
			filesRevision: this.plugin.filesIndex?.revision,
			queueRevision: this.plugin.operationsIndex?.revision,
			filterRevision: this.plugin.activeFiltersIndex?.revision,
		};

		for (const n of nodes) {
			const viewRow = this.plugin.viewService.getModel({
				explorerId: 'files',
				mode: 'tree',
				nodes: [n],
				operations,
				activeFilters,
				revisions,
				getLabel: (item) => item.label,
				getDecorationContext: () => ({
					kind: 'file',
					highlightQuery: n.meta.isFolder ? this.searchFolder : this.searchName,
					isFolder: n.meta.isFolder,
					filePath: n.meta.file?.path,
					basename: n.meta.file?.basename ?? n.label,
					folderPath: n.meta.folderPath,
					extension: n.meta.file?.extension,
				}),
			}).rows[0];

			n.icon = viewRow.icon;
			n.highlights = highlightsFromViewLayers(viewRow.layers);
			n.cls = withViewStateClasses(n.cls, viewRow.layers);

			if (n.children?.length) this._decorateTree(n.children);
		}
	}

	getFiles(): TFile[] {
		const probe = getActivePerfProbe();
		const source = this.sourceFiles();
		const filterFlat = () => this.logic.filterFlat(source, this.searchName, this.searchFolder);
		return (
			probe?.measure('explorerFiles.getFiles.filterFlat', { files: source.length }, filterFlat) ??
			filterFlat()
		);
	}

	handleNodeClick(node: TreeNode<FileMeta>): void {
		this.handleNodeSelection([node]);
	}

	handleNodeSecondaryAction(node: TreeNode<FileMeta>): void {
		const file = node.meta.file;
		if (!file || node.meta.isFolder) return;
		const workspace = this.plugin.app.workspace as typeof this.plugin.app.workspace & {
			openLinkText?: (linktext: string, sourcePath: string, newLeaf?: boolean) => unknown;
		};
		void workspace.openLinkText?.(file.path, '', false);
	}

	handleNodeSelection(nodes: TreeNode<FileMeta>[]): void {
		const files = nodes
			.map((node) => node.meta)
			.filter((meta) => !meta.isFolder && Boolean(meta.file))
			.map((meta) => meta.file!);
		if (files.length === 0) return;
		if (this.addMode) {
			new PropertyManagerModal(
				this.plugin.app,
				this.plugin.propertyIndex,
				files,
				(change) => void this.plugin.queueService.add(change),
			).open();
			return;
		}
		this.setSelectedFiles(files);
	}

	handleContextMenu(
		node: TreeNode<FileMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<FileMeta>[] = [],
	): void {
		const meta = node.meta;
		if (meta.isFolder) {
			this.plugin.contextMenuService.openPanelMenu(
				{ nodeType: 'folder', node, selectedNodes, surface: 'panel' },
				e,
			);
			return;
		}
		if (!meta.file) return;
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'file', node: node, selectedNodes, surface: 'panel', file: meta.file },
			e,
		);
	}

	getNodeType(node: TreeNode<FileMeta>): 'file' | 'folder' {
		return node.meta.isFolder ? 'folder' : 'file';
	}

	handleHoverBadge(
		node: TreeNode<FileMeta>,
		kind: string,
		selectedNodes: TreeNode<FileMeta>[] = [],
	): void {
		const files = this.contextFilesFromNodes(selectedNodes.length > 0 ? selectedNodes : [node]);
		const primaryFile = node.meta.file;
		if ((!primaryFile || node.meta.isFolder) && files.length === 0) return;
		if (kind === 'set') {
			this.appendLinksToScope(files);
			return;
		}
		if (kind === 'delete') {
			this.deleteFiles(files);
			return;
		}
		if (kind === 'rename') {
			this.renameFiles(primaryFile && !node.meta.isFolder ? [primaryFile] : files.slice(0, 1));
			return;
		}
		if (kind === 'filter') this.handleNodeSelection(selectedNodes.length > 0 ? selectedNodes : [node]);
	}

	setSearchTerm(term: string): void {
		this.searchName = term;
	}
	setSearchFilter(name: string, folder: string): void {
		this.searchName = name;
		this.searchFolder = folder;
	}
	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}
	setViewMode(_mode: ExplorerViewMode): void {}
	setAddMode(active: boolean): void {
		this.addMode = active;
	}
	setShowSelectedOnly(active: boolean): void {
		this.showSelectedOnly = active;
	}
	setShowHiddenFiles(active: boolean): void {
		this.showHiddenFiles = active;
	}

	private sourceFiles(): TFile[] {
		if (this.showSelectedOnly)
			return this.visibleFiles([...(this.plugin.filterService.selectedFiles ?? [])]);
		if (this.hasActiveFilterTree()) return this.visibleFiles([...this.plugin.filterService.filteredFiles]);
		return this.visibleFiles(this.vaultFiles());
	}

	private hasActiveFilterTree(): boolean {
		const activeFilter = (this.plugin.filterService as { activeFilter?: { children?: unknown[] } })
			.activeFilter;
		return (activeFilter?.children?.length ?? 0) > 0;
	}

	private vaultFiles(): TFile[] {
		const vault = this.plugin.app.vault as typeof this.plugin.app.vault & {
			getFiles?: () => TFile[];
		};
		return vault.getFiles?.() ?? vault.getMarkdownFiles();
	}

	private visibleFiles(files: TFile[]): TFile[] {
		if (this.showHiddenFiles) return files;
		return files.filter((file) => !hasHiddenPathSegment(file.path));
	}

	private appendLinksToScope(sourceFiles: TFile[]): void {
		if (sourceFiles.length === 0) return;
		const links = sourceFiles.map((f) => `[[${f.basename}]]`);
		const change = buildAppendLinksChange(this.operationScopeFiles(), links);
		if (change) void this.plugin.queueService.add(change);
	}

	private deleteFiles(files: TFile[]): void {
		for (const file of files) {
			void this.plugin.queueService.add(buildFileDeleteChange(file));
		}
	}

	private renameFiles(files: TFile[]): void {
		if (files.length === 0) return;
		if (this.options.startRenameHandoff) {
			const state = startFileRenameHandoff(createFnRState(), {
				files,
				scope: 'selected',
			});
			this.options.startRenameHandoff(state.rename);
			return;
		}
		new FileRenameModal(
			this.plugin.app,
			this.plugin.propertyIndex,
			files,
			(change) => void this.plugin.queueService.add(change),
		).open();
	}

	private operationScopeFiles(): TFile[] {
		const filteredFiles = [...(this.plugin.filterService.filteredFiles ?? [])] as TFile[];
		const selectedFiles = [...(this.plugin.filterService.selectedFiles ?? [])] as TFile[];
		return resolveOperationScopeFiles({
			scope: this.plugin.settings?.explorerOperationScope,
			selectedFiles,
			filteredFiles,
		});
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		if (this.sortBy === 'count') {
			const countMap = new Map<string, number>();
			for (const file of files) {
				const count = Object.keys(
					this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
				).filter((k) => k !== 'position').length;
				countMap.set(file.path, count);
			}
			return [...files].sort((a, b) => dir * ((countMap.get(a.path) ?? 0) - (countMap.get(b.path) ?? 0)));
		}
		return [...files].sort((a, b) => {
			if (this.sortBy === 'date') return dir * (b.stat.mtime - a.stat.mtime);
			return dir * a.basename.localeCompare(b.basename);
		});
	}

	private setSelectedFiles(files: TFile[]): void {
		this.plugin.filterService.setSelectedFiles(files);
	}

	private contextFiles(ctx: MenuCtx): TFile[] {
		const selected = (ctx.selectedNodes ?? []) as TreeNode<FileMeta>[];
		const nodes = selected.length > 0 ? selected : [ctx.node as TreeNode<FileMeta>];
		return this.contextFilesFromNodes(nodes);
	}

	private contextFilesFromNodes(nodes: TreeNode<FileMeta>[]): TFile[] {
		return nodes
			.map((node) => node.meta)
			.filter((meta) => !meta.isFolder && Boolean(meta.file))
			.map((meta) => meta.file!);
	}
}

function hasHiddenPathSegment(path: string): boolean {
	return path
		.split('/')
		.filter(Boolean)
		.some((segment) => segment.startsWith('.'));
}

function countTreeNodes(nodes: TreeNode<FileMeta>[]): number {
	let count = 0;
	const stack = [...nodes];
	while (stack.length > 0) {
		const node = stack.pop()!;
		count += 1;
		if (node.children) stack.push(...node.children);
	}
	return count;
}
