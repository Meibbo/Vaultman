import type { TFile } from 'obsidian';
import { getActivePerfProbe } from '../dev/perfProbe';
import type { VaultmanPlugin } from '../main';
import { buildExplorerSnapshot } from '../logic/logicExplorerSnapshot';
import {
	buildFileTree,
	filterFlat,
	isHiddenPath,
	sortFileDescriptors,
	type FileDescriptor,
} from '../logic/logicFiles';
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
import { PerfMeter } from '../services/perfMeter';
import {
	buildExplorerLayerMap,
	decorateTreeWithExplorerLayers,
	flattenTreeNodes,
} from '../services/serviceExplorerLayers';
import { buildOutlineForFile } from './explorerOutline';
import type { AdoptionService } from '../services/serviceAdoption.svelte';
import type { AdoptedNode } from '../types/typeAdoptedNode';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
} from '../types/typeExplorerDataPlane';

export interface ExplorerFilesOptions {
	startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
	adoptionService?: AdoptionService;
	readFileContent?: (file: TFile) => Promise<string>;
}

export class explorerFiles implements ExplorerProvider<FileMeta> {
	id = 'files';
	private plugin: VaultmanPlugin;
	private options: ExplorerFilesOptions;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private showSelectedOnly = false;
	private showHiddenFiles = false;
	private searchName = '';
	private searchFolder = '';
	private adoptedOutlineCache = new Map<string, AdoptedNode[]>();
	private subscribers = new Set<() => void>();
	private structuralCache: { key: string; tree: TreeNode<FileMeta>[] } | null = null;

	constructor(plugin: VaultmanPlugin, options: ExplorerFilesOptions = {}) {
		this.plugin = plugin;
		this.options = options;
		this.showHiddenFiles = plugin.settings?.explorerFilesShowHidden === true;
		this.registerActions();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'file.open',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Open',
			icon: 'lucide-file-text',
			run: (ctx: MenuCtx) => {
				const [file] = this.contextFiles(ctx);
				if (file) this.openFile(file);
			},
		});

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

	private readStructuralTree(): TreeNode<FileMeta>[] {
		const source = this.sourceFiles();
		const cacheKey = this.structuralCacheKey(source);
		const probe = getActivePerfProbe();
		if (this.structuralCache?.key === cacheKey) {
			probe?.count('explorerDataPlane.files.structure.cacheHit', { files: source.length });
			return this.structuralCache.tree;
		}
		probe?.count('explorerDataPlane.files.structure.rebuild', { files: source.length });

		const getSearchBuffer = this.plugin.filesIndex
			? (path: string) => this.fileSearchBuffer(path)
			: undefined;
		const descriptors = this.toDescriptors(source);
		const filtered = PerfMeter.time(
			'explorer.files.filterFlat',
			() => filterFlat(descriptors, this.searchName, this.searchFolder, getSearchBuffer),
			'service',
			{ files: descriptors.length },
		);
		const sorted = PerfMeter.time(
			'explorer.files.sort',
			() => sortFileDescriptors(filtered, this.sortBy, this.sortDir),
			'service',
			{ files: filtered.length },
		);
		const tree = PerfMeter.time(
			'explorer.files.buildTree',
			() => buildFileTree(sorted, { foldersFirst: this.foldersFirstEnabled() }) as TreeNode<FileMeta>[],
			'service',
			{ files: sorted.length },
		);
		this.structuralCache = { key: cacheKey, tree };
		return tree;
	}

	private buildStructuralTree(): TreeNode<FileMeta>[] {
		const tree = cloneTreeNodes(this.readStructuralTree());
		this.attachAdoptedChildren(tree);
		return tree;
	}

	getStructuralTree(): TreeNode<FileMeta>[] {
		return this.buildStructuralTree();
	}

	getStructuralRevisions(): ExplorerDataPlaneRevisions {
		return {
			filesRevision: this.plugin.filesIndex?.revision ?? 0,
			propsRevision: this.plugin.propsIndex?.revision,
		};
	}

	getSnapshot(expandedIds: ReadonlySet<string> = new Set()): ExplorerSnapshot<FileMeta> {
		return buildExplorerSnapshot({
			explorerId: this.id,
			providerKey: this.id,
			tree: this.getStructuralTree(),
			expandedIds,
			revisions: this.getStructuralRevisions(),
			projection: {
				searchTerm: this.searchName,
				searchMode: 'all',
				sortBy: this.sortBy,
				sortDirection: this.sortDir,
				sortTarget: 'top',
			},
			kindFor: ({ node }) => (node.meta.isFolder ? 'folder' : 'file'),
			pathFor: ({ node }) => (node.meta.isFolder ? undefined : node.meta.file?.path),
			folderPathFor: ({ node }) => node.meta.folderPath,
			domainKeyFor: ({ node }) => node.meta.file?.path ?? node.meta.folderPath,
		});
	}

	getTree(): TreeNode<FileMeta>[] {
		const structuralTree = this.readStructuralTree();
		const tree = PerfMeter.time(
			'explorer.files.decorateTree',
			() => this.decorateTree(structuralTree),
			'service',
			{ nodes: countTreeNodes(structuralTree) },
		);
		this.attachAdoptedChildren(tree);
		return tree;
	}

	subscribe(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => this.subscribers.delete(cb);
	}

	async preloadAdoptedChildren(files: TFile[] = this.getFiles()): Promise<void> {
		if (!this.options.adoptionService?.enabled) return;
		const reader = this.options.readFileContent ?? this.defaultReadFileContent;
		let changed = false;
		for (const file of files) {
			if (file.extension?.toLowerCase() !== 'md') continue;
			const content = await reader(file);
			this.adoptedOutlineCache.set(
				file.path,
				buildOutlineForFile({ path: file.path, content, file }),
			);
			changed = true;
		}
		if (changed) this.fire();
	}

	private decorateTree(nodes: readonly TreeNode<FileMeta>[]): TreeNode<FileMeta>[] {
		const operations = this.plugin.operationsIndex.nodes;
		const activeFilters = this.plugin.activeFiltersIndex.nodes;
		const revisions = {
			filesRevision: this.plugin.filesIndex?.revision,
			queueRevision: this.plugin.operationsIndex?.revision,
			filterRevision: this.plugin.activeFiltersIndex?.revision,
		};
		const flatNodes = flattenTreeNodes(nodes);
		const layers = buildExplorerLayerMap({
			viewService: this.plugin.viewService,
			explorerId: 'files',
			mode: 'tree',
			nodes: flatNodes,
			operations,
			activeFilters,
			revisions,
			getLabel: (item) => item.label,
			getDecorationContext: (node) => ({
				kind: 'file',
				highlightQuery: node.meta.isFolder ? this.searchFolder : this.searchName,
				isFolder: node.meta.isFolder,
				filePath: node.meta.file?.path,
				basename: node.meta.file?.basename ?? node.label,
				folderPath: node.meta.folderPath,
				extension: node.meta.file?.extension,
			}),
		});
		return decorateTreeWithExplorerLayers(nodes, layers, { operations });
	}

	getFiles(): TFile[] {
		const source = this.sourceFiles();
		const getSearchBuffer = this.plugin.filesIndex
			? (path: string) => this.fileSearchBuffer(path)
			: undefined;
		const descriptors = this.toDescriptors(source);
		return PerfMeter.time(
			'explorer.files.filterFlat',
			() =>
				filterFlat(descriptors, this.searchName, this.searchFolder, getSearchBuffer).map(
					(d) => d.ref,
				),
			'service',
			{ files: descriptors.length },
		);
	}

	handleNodeClick(node: TreeNode<FileMeta>): void {
		this.handleNodeSelection([node]);
	}

	handleNodeSecondaryAction(node: TreeNode<FileMeta>): void {
		const file = node.meta.file;
		if (!file || node.meta.isFolder) return;
		this.openFile(file);
	}

	private openFile(file: TFile): void {
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
		const indexedFiles = this.plugin.filesIndex?.nodes?.map((node) => node.file) ?? [];
		if (indexedFiles.length > 0) return indexedFiles;
		const vault = this.plugin.app.vault as typeof this.plugin.app.vault & {
			getFiles?: () => TFile[];
		};
		return vault.getFiles?.() ?? vault.getMarkdownFiles();
	}

	private fileSearchBuffer(path: string): string {
		return this.plugin.filesIndex?.getSearchBuffer(path) ?? '';
	}

	private visibleFiles(files: TFile[]): TFile[] {
		if (this.showHiddenFiles) return files;
		return files.filter((file) => !isHiddenPath(file.path));
	}

	private foldersFirstEnabled(): boolean {
		return this.plugin.settings?.explorerFilesFoldersFirst !== false;
	}

	private structuralCacheKey(source: readonly TFile[]): string {
		return [
			this.searchName,
			this.searchFolder,
			this.sortBy,
			this.sortDir,
			this.showSelectedOnly ? 'selected' : 'all',
			this.showHiddenFiles ? 'hidden' : 'visible',
			this.foldersFirstEnabled() ? 'folders-first' : 'natural',
			this.plugin.filesIndex?.revision ?? '-',
			this.plugin.propsIndex?.revision ?? '-',
			source.map((file) => `${file.path}:${file.stat.mtime}:${file.stat.size}`).join('\u0001'),
		].join('\u0000');
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

	/**
	 * The single impurity boundary: flatten `TFile[]` into the app-free
	 * `FileDescriptor[]` the pure `logicFiles` module consumes. Frontmatter
	 * prop-count is read here (the only place that touches metadataCache for
	 * the structural build).
	 */
	private toDescriptors(files: readonly TFile[]): FileDescriptor<TFile>[] {
		return files.map((file) => {
			const rawParent = file.parent?.path ?? '';
			const folderPath = rawParent === '/' ? '' : rawParent;
			return {
				path: file.path,
				basename: file.basename,
				extension: file.extension?.trim() ?? '',
				folderPath,
				parentPath: folderPath,
				mtime: file.stat.mtime,
				ctime: file.stat.ctime,
				propCount: this.propCountFor(file),
				ref: file,
			};
		});
	}

	private propCountFor(file: TFile): number {
		return Object.keys(
			this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
		).filter((k) => k !== 'position').length;
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

	private defaultReadFileContent = async (file: TFile): Promise<string> => {
		const vault = this.plugin.app.vault as typeof this.plugin.app.vault & {
			cachedRead?: (file: TFile) => Promise<string>;
			read?: (file: TFile) => Promise<string>;
		};
		if (vault.cachedRead) return vault.cachedRead(file);
		return vault.read(file);
	};

	private attachAdoptedChildren(nodes: TreeNode<FileMeta>[]): void {
		const adoptionService = this.options.adoptionService;
		if (!adoptionService?.enabled) return;
		for (const node of nodes) {
			if (node.meta.isFolder) {
				if (node.children?.length) this.attachAdoptedChildren(node.children);
				continue;
			}
			const file = node.meta.file;
			if (!file) continue;
			const cached = this.adoptedOutlineCache.get(file.path);
			if (!cached) continue;
			node.children = this.toAdoptedTreeNodes(
				adoptionService.filterChildren(cached),
				node.depth + 1,
				node.meta.folderPath,
			);
		}
	}

	private toAdoptedTreeNodes(
		nodes: AdoptedNode[],
		depth: number,
		folderPath: string,
	): TreeNode<FileMeta>[] {
		return nodes.map((node) => ({
			id: node.id,
			label: node.label,
			icon: adoptedNodeIcon(node.kind),
			depth,
			relation: 'adopted' as const,
			children: this.toAdoptedTreeNodes(node.children, depth + 1, folderPath),
			meta: {
				file: node.file,
				isFolder: false,
				folderPath,
			},
		}));
	}

	private fire(): void {
		for (const cb of this.subscribers) cb();
	}
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

function cloneTreeNodes<TMeta>(nodes: readonly TreeNode<TMeta>[]): TreeNode<TMeta>[] {
	return nodes.map((node) => ({
		...node,
		children: node.children ? cloneTreeNodes(node.children) : undefined,
	}));
}

function adoptedNodeIcon(kind: AdoptedNode['kind']): string {
	if (kind === 'header') return 'lucide-heading';
	if (kind === 'task') return 'lucide-square-check';
	return 'lucide-box';
}
