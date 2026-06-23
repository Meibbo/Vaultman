// src/components/FilesExplorerPanel.ts
import { Component, Notice, TFile, TFolder } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { FilesLogic } from '../../logic/logicsFiles';
import { FilesGridView } from '../layout/viewFilesGrid';
import { GridView as FilesTableView } from '../layout/viewGrid';
import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, FileMeta, NodeBadge } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';
import type { FilterNode } from '../../types/typeFilter';
import type { ExplorerSortState } from '../../types/typeUI';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import { DELETE_FILE, MOVE_FILE } from '../../types/typeOps';
import { translate } from '../../i18n/index';
import { showInputModal } from '../../utils/inputModal';
import {
	compareFilesForExplorer,
	normalizeExplorerSortBy,
} from '../../logic/logicSort';
import {
	filesInsideFolder,
	movedParentPathForFolderFile,
} from '../../logic/logicFolderQueue';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';

export type FilesViewMode = 'grid' | 'table' | 'tree';

export interface FilesTypeFilterState {
	id: string;
	label: string;
}

function sameStringSet(a: Set<string>, b: Set<string>): boolean {
	if (a.size !== b.size) return false;
	for (const value of a) {
		if (!b.has(value)) return false;
	}
	return true;
}

export class FilesExplorerPanel extends Component {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private logic: FilesLogic;
	private tableView: FilesTableView | null = null;
	private gridView: FilesGridView | null = null;
	private treeView: UnifiedTreeView | null = null;
	private expandedIds = new Set<string>();
	private viewMode: FilesViewMode = 'tree';
	private _sourceFiles: TFile[] = [];
	private _currentFiles: TFile[] = [];
	private _totalCount = 0;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private nodeTypeFilter: string | null = null;
	private parentsFirst = true;
	private addMode = false;
	private visibleCells = new Set<string>(['name', 'ext', 'count', 'nested']);
	private searchName = '';
	private searchFolder = '';
	private refreshTimer: number | null = null;
	private statsRefreshTimer: number | null = null;
	private activeRevealPath: string | null = null;
	private sparseAutoExpandSignature = '';

	private onSelectionChange?: (count: number) => void;
	private onExpansionChange?: () => void;
	private onSortStateChange?: (state: ExplorerSortState) => void;

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		onSelectionChange?: (count: number) => void,
	) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new FilesLogic(plugin.app);
		this.onSelectionChange = onSelectionChange;
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'file.open_tab',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: translate('file.ctx.open_tab'),
			icon: 'lucide-panel-top',
			run: async (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				const leaf = this.plugin.app.workspace.getLeaf('tab');
				await leaf.openFile(meta.file, { active: true });
			},
		});
		svc.registerAction({
			id: 'file.open_right',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: translate('file.ctx.open_right'),
			icon: 'lucide-panel-right',
			run: async (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
				await leaf.openFile(meta.file, { active: true });
			},
		});
		svc.registerAction({
			id: 'file.open_window',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: translate('file.ctx.open_window'),
			icon: 'lucide-app-window',
			run: async (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const workspace = this.plugin.app.workspace as any;
				const leaf = workspace.openPopoutLeaf() as import('obsidian').WorkspaceLeaf;
				await leaf.openFile(meta.file, { active: true });
			},
		});
		svc.registerAction({
			id: 'file.rename',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				new FileRenameModal(
					this.plugin.app,
					this.plugin.propertyIndex,
					[meta.file],
					(change) => this.plugin.queueService.addOrRun(change),
				).open();
			},
		});

		svc.registerAction({
			id: 'file.delete',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Delete',
			icon: 'lucide-trash',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				this.plugin.queueService.addOrRun({
					type: 'file_delete',
					action: 'delete',
					details: `Delete file "${meta.file.path}"`,
					files: [meta.file],
					customLogic: true,
					logicFunc: () => ({ [DELETE_FILE]: true }),
				});
			},
		});

		svc.registerAction({
			id: 'file.move',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: `${translate('ops.move')}...`,
			icon: 'lucide-folder-input',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				new FileMoveModal(this.plugin.app, [meta.file], (change) =>
					this.plugin.queueService.addOrRun(change),
				).open();
			},
		});

		svc.registerAction({
			id: 'folder.new_note',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.new_note'),
			icon: 'lucide-file-plus',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				await this._createFileInFolder(folder, 'Untitled.md', '', true);
			},
		});

		svc.registerAction({
			id: 'folder.new_folder',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.new_folder'),
			icon: 'lucide-folder-plus',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				await this._createFolderInFolder(folder);
			},
		});

		svc.registerAction({
			id: 'folder.new_canvas',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.new_canvas'),
			icon: 'lucide-layout-dashboard',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				await this._createFileInFolder(
					folder,
					'Untitled.canvas',
					JSON.stringify({ nodes: [], edges: [] }, null, '\t'),
					true,
				);
			},
		});

		svc.registerAction({
			id: 'folder.new_base',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.new_base'),
			icon: 'lucide-database',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				await this._createFileInFolder(
					folder,
					'Untitled.base',
					'views:\n  - type: table\n    name: Table\n',
					true,
				);
			},
		});

		svc.registerAction({
			id: 'folder.make_copy',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.make_copy'),
			icon: 'lucide-copy',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				await this._copyFolder(folder);
			},
		});

		svc.registerAction({
			id: 'folder.filter_include',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.filter_include'),
			icon: 'lucide-filter',
			run: (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'folder',
					property: '',
					values: [folder.path],
				});
			},
		});

		svc.registerAction({
			id: 'folder.filter_exclude',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.filter_exclude'),
			icon: 'lucide-filter-x',
			separatorBefore: true,
			run: (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'folder_exclude',
					property: '',
					values: [folder.path],
				});
			},
		});

		svc.registerAction({
			id: 'folder.rename',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.rename'),
			icon: 'lucide-pencil',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				const newName = await showInputModal(
					this.plugin.app,
					translate('folder.prompt.rename'),
				);
				if (!newName || newName === folder.name) return;
				const parentPath =
					folder.parent?.path && folder.parent.path !== '/'
						? folder.parent.path
						: '';
				const newPath = parentPath ? `${parentPath}/${newName}` : newName;
				this._queueFolderMove(
					folder,
					newPath,
					`Rename folder "${folder.path}" to "${newPath}"`,
				);
			},
		});

		svc.registerAction({
			id: 'folder.move',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.move'),
			icon: 'lucide-folder-input',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				const target = await showInputModal(
					this.plugin.app,
					translate('folder.prompt.move'),
				);
				if (target === null) return;
				const targetFolder = target.trim().replace(/^\/|\/$/g, '');
				const newPath = targetFolder
					? `${targetFolder}/${folder.name}`
					: folder.name;
				if (newPath === folder.path) return;
				this._queueFolderMove(
					folder,
					newPath,
					`Move folder "${folder.path}" to "${newPath}"`,
				);
			},
		});

		svc.registerAction({
			id: 'folder.delete',
			nodeTypes: ['folder'],
			surfaces: ['panel'],
			label: translate('folder.ctx.delete'),
			icon: 'lucide-trash',
			run: async (ctx: MenuCtx) => {
				const folder = this._folderFromCtx(ctx);
				if (!folder) return;
				this._queueFolderDelete(folder);
			},
		});

		this.registerEvent(
			this.plugin.app.vault.on('create', this._scheduleRefresh),
		);
		this.registerEvent(
			this.plugin.app.vault.on('delete', this._scheduleRefresh),
		);
		this.registerEvent(
			this.plugin.app.vault.on('rename', this._scheduleRefresh),
		);
		this.registerEvent(
			this.plugin.app.workspace.on('file-open', this._handleActiveFileChange),
		);
		this.plugin.queueService.on('changed', this._handleQueueChange);
		this.plugin.statisticsCache.on('changed', this._handleStatsChange);
		this.containerEl.addEventListener('dragover', this._handleRootFileDragOver);
		this.containerEl.addEventListener('drop', this._handleRootFileDrop);

		this._mountView();
		this._syncActiveFilePath();
		this._render();
	}

	onunload(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
		if (this.statsRefreshTimer !== null) {
			window.clearTimeout(this.statsRefreshTimer);
			this.statsRefreshTimer = null;
		}
		this.plugin.queueService.off('changed', this._handleQueueChange);
		this.plugin.statisticsCache.off('changed', this._handleStatsChange);
		this.containerEl.removeEventListener(
			'dragover',
			this._handleRootFileDragOver,
		);
		this.containerEl.removeEventListener('drop', this._handleRootFileDrop);
		this.tableView?.destroy();
		this.gridView?.destroy();
		this.treeView?.destroy();
		super.onunload();
	}

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	setViewMode(mode: FilesViewMode): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		this._mountView();
		this._render();
	}

	setVisibleCells(cells: Set<string>): void {
		if (sameStringSet(this.visibleCells, cells)) return;
		this.visibleCells = new Set(cells);
		this.tableView?.setVisibleCells(this.visibleCells);
		this.gridView?.setVisibleCells(this.visibleCells);
		this._render();
	}

	hasExpandedNodes(): boolean {
		return this._nestedEnabled() && this.expandedIds.size > 0;
	}

	setExpansionChangeHandler(handler?: () => void): void {
		this.onExpansionChange = handler;
	}

	setSortStateChangeHandler(
		handler?: (state: ExplorerSortState) => void,
	): void {
		this.onSortStateChange = handler;
		handler?.(this._sortState());
	}

	setSortBy(
		sortBy: string,
		direction: 'asc' | 'desc',
		_childLevel = false,
		nodeTypeFilter: string | null = null,
		parentsFirst = true,
	): void {
		const normalizedSortBy = normalizeExplorerSortBy(sortBy);
		if (
			this.sortBy === normalizedSortBy &&
			this.sortDir === direction &&
			this.nodeTypeFilter === nodeTypeFilter &&
			this.parentsFirst === parentsFirst
		) {
			return;
		}
		this.sortBy = normalizedSortBy;
		this.sortDir = direction;
		this.nodeTypeFilter = nodeTypeFilter;
		this.parentsFirst = parentsFirst;
		if (this.viewMode === 'table' && this.tableView) {
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				ext: 'ext',
				mtime: 'mtime',
				ctime: 'ctime',
				path: 'path',
			};
			this.tableView.setSortColumn(
				COL_MAP[normalizedSortBy] ?? 'name',
				direction,
			);
		}
		this._notifySortStateChanged();
		this._render();
	}

	getActiveTypeFilter(): FilesTypeFilterState | null {
		if (!this.nodeTypeFilter) return null;
		const option = this.getFileTypeOptions().find(
			(candidate) => candidate.id === this.nodeTypeFilter,
		);
		return {
			id: this.nodeTypeFilter,
			label: option?.label ?? this._fileTypeLabel(this.nodeTypeFilter),
		};
	}

	hasViewFilters(): boolean {
		return Boolean(this.nodeTypeFilter);
	}

	getVisibleFileCount(): number {
		return this._filesForDisplay().length;
	}

	getDisplayedCount(): { filtered: number; total: number } {
		return {
			filtered: this.getVisibleFileCount(),
			total: this.plugin.app.vault.getFiles().length,
		};
	}

	clearNodeTypeFilter(): void {
		if (!this.nodeTypeFilter) return;
		this.setSortBy(this.sortBy, this.sortDir, false, null, this.parentsFirst);
	}

	render(filteredFiles: TFile[], totalCount: number): void {
		this._sourceFiles = filteredFiles;
		this._currentFiles = filteredFiles;
		this._totalCount = totalCount;
		this._syncSearchTermsFromActiveFilters();
		this._expandSearchMatches();
		this._render();
	}

	setSearchFilter(name: string, folder: string): void {
		if (this.searchName === name && this.searchFolder === folder) return;
		this.searchName = name;
		this.searchFolder = folder;
		const base =
			this._sourceFiles.length > 0
				? this._sourceFiles
				: this._filesForCurrentScope();
		const total = this._totalCount || this.plugin.app.vault.getFiles().length;
		this._currentFiles = this.logic.filterFlat(base, name, folder);
		this._totalCount = total;
		this._expandSearchMatches();
		this._render();
	}

	expandAll(): void {
		if (!this._nestedEnabled()) return;
		const tree = this.logic.buildFileTree(
			this._sortFiles(this._filesForDisplay()),
			this._foldersForCurrentView(),
			{
				rebaseFolderPaths: this._activeFolderFilterPaths(),
				parentsFirst: this.parentsFirst,
			},
		);
		const walk = (nodes: TreeNode<FileMeta>[]) => {
			for (const node of nodes) {
				if (node.meta.isFolder) this.expandedIds.add(node.id);
				if (node.children?.length) walk(node.children);
			}
		};
		walk(tree);
		this._notifyExpansionChanged();
		this._render();
	}

	collapseAll(): void {
		this.expandedIds.clear();
		this._notifyExpansionChanged();
		this._render();
	}

	autoRevealActiveFile(): void {
		const file = this.plugin.app.workspace.getActiveFile();
		if (!file) return;
		this._syncActiveFilePath(file);
		for (const id of this.logic.getAncestorFolderIds([file])) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
		this._render();
		window.requestAnimationFrame(() => {
			if (this.viewMode === 'table') {
				this.tableView?.scrollToPath(file.path);
				return;
			}
			if (this.viewMode === 'grid') {
				this.gridView?.scrollToPath(file.path);
				return;
			}
			this.treeView?.scrollToId(file.path);
		});
	}

	async createFromSearch(category: number, term: string): Promise<void> {
		if (category === 1) {
			await this._createFolder(term);
			return;
		}
		await this._createNote(term);
	}

	private _mountView(): void {
		this.tableView?.destroy();
		this.gridView?.destroy();
		this.treeView?.destroy();
		this.containerEl.empty();
		this.tableView = null;
		this.gridView = null;
		this.treeView = null;
		if (this.viewMode === 'table') {
			this.tableView = new FilesTableView(this.containerEl, this.plugin.app, {
				getFileTimes: (file: TFile) =>
					this.plugin.statisticsCache.getFileTimes(file),
				getWordCount: (file: TFile) =>
					this.plugin.statisticsCache.getFileWordCount(file),
				getBadges: (file: TFile) => this._badgesForFile(file),
				onContextMenu: (file: TFile, e: MouseEvent) =>
					this._openFileContextMenu(file, e),
				onSelectionChange: (selected: Set<string>) => {
					this.plugin.filterService.setSelectedFiles(
						this.tableView?.getSelectedFiles() ?? [],
					);
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile) => this._handleFileClick(file),
				onDragStart: (file: TFile, event: DragEvent) =>
					this._setFileDragPayload(file, event),
			});
			this.tableView.setVisibleCells(this.visibleCells);
			this.tableView.setActivePath(this.activeRevealPath);
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				ext: 'ext',
				mtime: 'mtime',
				ctime: 'ctime',
				path: 'path',
			};
			this.tableView.setSortColumn(
				COL_MAP[this.sortBy] ?? 'name',
				this.sortDir,
			);
		} else if (this.viewMode === 'grid') {
			this.gridView = new FilesGridView(this.containerEl, {
				onContextMenu: (file: TFile, e: MouseEvent) =>
					this._openFileContextMenu(file, e),
				onSelectionChange: (selected: Set<string>) => {
					this.plugin.filterService.setSelectedFiles(
						this.gridView?.getSelectedFiles() ?? [],
					);
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile) => this._handleFileClick(file),
				onDragStart: (file: TFile, event: DragEvent) =>
					this._setFileDragPayload(file, event),
				getBadges: (file: TFile) => this._badgesForFile(file),
				getPropCount: (file: TFile) => this._propCountForFile(file),
				getFileTimes: (file: TFile) =>
					this.plugin.statisticsCache.getFileTimes(file),
				getWordCount: (file: TFile) =>
					this.plugin.statisticsCache.getFileWordCount(file),
			});
			this.gridView.setVisibleCells(this.visibleCells);
			this.gridView.setActivePath(this.activeRevealPath);
		} else {
			this.treeView = new UnifiedTreeView(this.containerEl);
		}
	}

	private _sortFiles(files: TFile[]): TFile[] {
		return [...files].sort((a, b) =>
			compareFilesForExplorer(a, b, this.sortBy, this.sortDir, {
				countForFile: (file) => this._propCountForFile(file),
				getFileTimes: (file) => this.plugin.statisticsCache.getFileTimes(file),
			}),
		);
	}

	private _filesForDisplay(): TFile[] {
		if (!this.nodeTypeFilter) return this._currentFiles;
		return this._currentFiles.filter(
			(file) => this._fileTypeId(file) === this.nodeTypeFilter,
		);
	}

	private _fileTypeId(file: TFile): string {
		return file.extension || 'none';
	}

	getFileTypeOptions(): Array<{ id: string; icon: string; label: string }> {
		const files =
			this._sourceFiles.length > 0
				? this._sourceFiles
				: this.plugin.app.vault.getFiles();
		const extensions = new Set<string>();
		for (const file of files) extensions.add(this._fileTypeId(file));
		return Array.from(extensions)
			.sort((a, b) => {
				if (a === 'md') return -1;
				if (b === 'md') return 1;
				return a.localeCompare(b);
			})
			.map((extension) => ({
				id: extension,
				icon: extension === 'base' ? 'lucide-database' : 'lucide-file-type',
				label: this._fileTypeLabel(extension),
			}));
	}

	private _fileTypeLabel(extension: string): string {
		return extension === 'none' ? 'No extension' : `.${extension}`;
	}

	private _propCountForFile(file: TFile): number {
		return Object.keys(
			this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
		).filter((key) => key !== 'position').length;
	}

	private _openFileContextMenu(file: TFile, event: MouseEvent): void {
		const syntheticNode = {
			id: file.path,
			label: file.name,
			meta: {
				file,
				isFolder: false,
				folderPath: file.parent?.path ?? '',
			} as FileMeta,
			icon: '',
			depth: 0,
		};
		this.plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'file',
				node: syntheticNode,
				surface: 'panel',
				file,
				...this._viewFilterMenuActions(),
			},
			event,
		);
	}

	private _handleFileClick(file: TFile): void {
		if (this.addMode) {
			const selected = this.getSelectedFiles();
			const targets =
				selected.length > 0
					? selected.includes(file)
						? selected
						: [...selected, file]
					: [file];
			new PropertyManagerModal(
				this.plugin.app,
				this.plugin.propertyIndex,
				targets,
				(change) => this.plugin.queueService.addOrRun(change),
			).open();
			return;
		}
		void this.plugin.app.workspace.openLinkText(file.path, '', false);
	}

	private _setFileDragPayload(file: TFile, event: DragEvent): void {
		this._setFileNodeDragPayload(
			{
				kind: 'file',
				path: file.path,
			},
			event,
		);
	}

	private _render(): void {
		if (this._shouldShowEmptyFilteredState()) {
			this._renderEmptyFilteredState();
			return;
		}
		const displayFiles = this._filesForDisplay();
		if (this.viewMode === 'table' && this.tableView) {
			this.tableView.setActivePath(this.activeRevealPath);
			this.tableView.render(displayFiles, this._totalCount);
		} else if (this.viewMode === 'grid' && this.gridView) {
			this.gridView.setActivePath(this.activeRevealPath);
			this.gridView.render(this._sortFiles(displayFiles));
		} else if (this.viewMode === 'tree' && this.treeView) {
			const sortedFiles = this._sortFiles(displayFiles);
			const rebaseFolderPaths = this._activeFolderFilterPaths();
			const renderTree = this._nestedEnabled()
				? this.logic.buildFileTree(sortedFiles, this._foldersForCurrentView(), {
						rebaseFolderPaths,
						parentsFirst: this.parentsFirst,
					})
				: this.logic.buildFlatFileNodes(sortedFiles, { rebaseFolderPaths });
			if (this._nestedEnabled()) this._autoExpandSparseTopLevel(renderTree);
			this._decorateTreeWithFileTimes(renderTree);
			this._decorateTreeWithQueue(renderTree);
			this._decorateTreeWithActiveReveal(renderTree);
			const applyFolderIcons = (
				nodes: TreeNode<FileMeta>[],
				expanded: Set<string>,
			): void => {
				for (const n of nodes) {
					if (n.meta.isFolder) {
						n.icon = expanded.has(n.id)
							? 'lucide-folder-open'
							: 'lucide-folder';
					}
					if (n.children?.length) applyFolderIcons(n.children, expanded);
				}
			};
			applyFolderIcons(renderTree, this.expandedIds);
			this.treeView.render({
				nodes: renderTree,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				onToggle: (id: string) => {
					if (this.expandedIds.has(id)) this.expandedIds.delete(id);
					else this.expandedIds.add(id);
					this._notifyExpansionChanged();
					this._render();
				},
				onRowClick: (id: string) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						if (!this._nestedEnabled()) return;
						if (this.expandedIds.has(id)) this.expandedIds.delete(id);
						else this.expandedIds.add(id);
						this._notifyExpansionChanged();
						this._render();
						return;
					}
					if (!meta.isFolder && meta.file) {
						if (this.addMode) {
							new PropertyManagerModal(
								this.plugin.app,
								this.plugin.propertyIndex,
								[meta.file],
								(change) => this.plugin.queueService.addOrRun(change),
							).open();
							return;
						}
						void this.plugin.app.workspace.openLinkText(
							meta.file.path,
							'',
							false,
						);
					}
				},
				onContextMenu: (id: string, e: MouseEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						this.plugin.contextMenuService.openPanelMenu(
							{
								nodeType: 'folder',
								node,
								surface: 'panel',
								...this._viewFilterMenuActions(),
							},
							e,
						);
						return;
					}
					if (!meta.file) return;
					this.plugin.contextMenuService.openPanelMenu(
						{
							nodeType: 'file',
							node,
							surface: 'panel',
							file: meta.file,
							...this._viewFilterMenuActions(),
						},
						e,
					);
				},
				onDragStart: (id: string, event: DragEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						this._setFileNodeDragPayload(
							{
								kind: 'folder',
								path: meta.folder?.path ?? meta.folderPath,
							},
							event,
						);
						return;
					}
					if (!meta.file) return;
					this._setFileNodeDragPayload(
						{
							kind: 'file',
							path: meta.file.path,
						},
						event,
					);
				},
				onDragOver: (id: string, event: DragEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					this._handleFileDragOver(node, event);
				},
				onDrop: (id: string, event: DragEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					this._handleFileDrop(node, event);
				},
				onBadgeDoubleClick: (queueIndex: number) => {
					this.plugin.queueService.remove(queueIndex);
					this._render();
				},
				badgeCancelClickMode: this.plugin.settings.badgeCancelClickMode,
			});
		}
	}

	private _handleFileDragOver(
		targetNode: TreeNode<FileMeta>,
		event: DragEvent,
	): void {
		const targetFolderPath = this._fileDropTargetFolderPath(targetNode);
		if (targetFolderPath === null) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		this.plugin.showDragActionGuide(this._fileDropGuide(payload, targetFolderPath));
	}

	private _handleFileDrop(
		targetNode: TreeNode<FileMeta>,
		event: DragEvent,
	): void {
		const targetFolderPath = this._fileDropTargetFolderPath(targetNode);
		if (targetFolderPath === null) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		this.plugin.clearDragActionGuide();
		void this._moveDraggedNodesIntoFolder(payload, targetFolderPath);
	}

	private _fileDropTargetFolderPath(targetNode: TreeNode<FileMeta>): string | null {
		if (targetNode.meta.isFolder) return targetNode.meta.folderPath;
		if (targetNode.depth === 0) return '';
		return null;
	}

	private readonly _handleRootFileDragOver = (event: DragEvent): void => {
		if (this._isRowDropTarget(event.target)) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload || this._fileDragNodes(payload).length === 0) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		this.plugin.showDragActionGuide(this._fileDropGuide(payload, ''));
	};

	private readonly _handleRootFileDrop = (event: DragEvent): void => {
		if (this._isRowDropTarget(event.target)) return;
		const payload = readVaultmanDragPayload(event);
		if (!payload || this._fileDragNodes(payload).length === 0) return;
		event.preventDefault();
		event.stopPropagation();
		this.plugin.clearDragActionGuide();
		void this._moveDraggedNodesIntoFolder(payload, '');
	};

	private _isRowDropTarget(target: EventTarget | null): boolean {
		if (typeof HTMLElement === 'undefined') return false;
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest(
				'.vaultman-tree-row, .vaultman-file-row, .vaultman-file-card, .vaultman-node-table-row',
			),
		);
	}

	private async _moveDraggedNodesIntoFolder(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
		targetFolderPath: string,
	): Promise<void> {
		const nodes = this._fileDragNodes(payload);
		if (nodes.length === 0) return;

		let moved = 0;
		for (const node of nodes) {
			const source = this.plugin.app.vault.getAbstractFileByPath(node.path);
			if (!(source instanceof TFile || source instanceof TFolder)) continue;
			if (source.parent?.path === targetFolderPath) continue;
			if (
				source instanceof TFolder &&
				(targetFolderPath === source.path ||
					targetFolderPath.startsWith(`${source.path}/`))
			) {
				continue;
			}
			const targetPath = this._uniqueMovePath(
				targetFolderPath ? `${targetFolderPath}/${source.name}` : source.name,
			);
			await this.plugin.app.fileManager.renameFile(source, targetPath);
			moved += 1;
		}
		if (moved === 0) return;
		this.plugin.filterService.applyFilters();
		this._refreshFromFilterService();
	}

	private _dragNodes(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
	): VaultmanDragNodePayload[] {
		return payload.selection?.length ? payload.selection : [payload];
	}

	private _fileDragNodes(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
	): Array<Extract<VaultmanDragNodePayload, { kind: 'file' | 'folder' }>> {
		return this._dragNodes(payload).filter(
			(
				node,
			): node is Extract<
				VaultmanDragNodePayload,
				{ kind: 'file' | 'folder' }
			> => node.kind === 'file' || node.kind === 'folder',
		);
	}

	private _setFileNodeDragPayload(
		nodePayload: Extract<VaultmanDragNodePayload, { kind: 'file' | 'folder' }>,
		event: DragEvent,
	): void {
		const payload = withActiveFilterDragSelection(
			nodePayload,
			this.plugin.filterService.activeFilter,
			'files',
		);
		setVaultmanDragPayload(event, payload);
		this._setNativeFileDragPayload(event, payload);
	}

	private _setNativeFileDragPayload(
		event: DragEvent,
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
	): void {
		const dragManager = (
			this.plugin.app as unknown as {
				dragManager?: {
					draggable?: unknown;
					dragFile?: (event: DragEvent, file: TFile, source?: string) => unknown;
					dragFiles?: (
						event: DragEvent,
						files: Array<TFile | TFolder>,
						source?: string,
					) => unknown;
				};
			}
		).dragManager;
		if (!dragManager) return;
		const entries = this._fileDragNodes(payload)
			.map((node) => this.plugin.app.vault.getAbstractFileByPath(node.path))
			.filter((entry): entry is TFile | TFolder =>
				entry instanceof TFile || entry instanceof TFolder,
			);
		if (entries.length === 0) return;
		const draggable =
			entries.length === 1 && entries[0] instanceof TFile
				? dragManager.dragFile?.(event, entries[0], 'vaultman')
				: dragManager.dragFiles?.(event, entries, 'vaultman');
		if (draggable !== undefined) dragManager.draggable = draggable;
	}

	private _fileDropGuide(
		payload: VaultmanDragNodePayload & { selection?: VaultmanDragNodePayload[] },
		targetFolderPath: string,
	): string {
		const nodes = this._fileDragNodes(payload);
		const subject =
			nodes.length === 1 ? `"${this._dragNodeName(nodes[0])}"` : `${nodes.length} items`;
		const target = targetFolderPath ? `"${targetFolderPath}"` : 'vault root';
		return `Move ${subject} to ${target}`;
	}

	private _dragNodeName(node: VaultmanDragNodePayload): string {
		if (node.kind !== 'file' && node.kind !== 'folder') return '';
		return node.path.split('/').filter(Boolean).pop() ?? node.path;
	}

	private _folderFromCtx(ctx: MenuCtx): TFolder | null {
		const meta = ctx.node.meta as Partial<FileMeta> | undefined;
		return meta?.folder ?? null;
	}

	private _notifyExpansionChanged(): void {
		this.onExpansionChange?.();
	}

	private _sortState(): ExplorerSortState {
		return {
			sortBy: this.sortBy,
			direction: this.sortDir,
			childLevel: false,
			nodeTypeFilter: this.nodeTypeFilter,
			parentsFirst: this.parentsFirst,
		};
	}

	private _notifySortStateChanged(): void {
		this.onSortStateChange?.(this._sortState());
	}

	private _viewFilterMenuActions(): Pick<
		MenuCtx,
		'hasViewFilters' | 'clearViewFilters'
	> {
		return {
			hasViewFilters: () => this.hasViewFilters(),
			clearViewFilters: () => this.clearNodeTypeFilter(),
		};
	}

	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	private _decorateTreeWithActiveReveal(nodes: TreeNode<FileMeta>[]): void {
		for (const node of nodes) {
			if (node.meta.file?.path === this.activeRevealPath) {
				node.cls =
					`${node.cls ?? ''} tree-item-self nav-file-title tappable is-clickable is-active`.trim();
			}
			if (node.children?.length)
				this._decorateTreeWithActiveReveal(node.children);
		}
	}

	private _decorateTreeWithQueue(nodes: TreeNode<FileMeta>[]): void {
		const decorateNode = (node: TreeNode<FileMeta>): NodeBadge[] => {
			const childBadges = node.children?.flatMap(decorateNode) ?? [];
			if (node.meta.file) {
				const badges = this._badgesForFile(node.meta.file);
				node.badges = badges;
				if (badges.some((badge) => badge.color === 'red')) {
					node.cls = `${node.cls ?? ''} is-deleted-file`.trim();
				}
				return badges;
			}
			const inherited = this._dedupeInheritedBadges(childBadges);
			if (inherited.length > 0) {
				node.badges = inherited;
			}
			return inherited;
		};
		for (const node of nodes) decorateNode(node);
	}

	private _badgesForFile(file: TFile): NodeBadge[] {
		const badges: NodeBadge[] = [];
		this.plugin.queueService.queue.forEach((change, queueIndex) => {
			if (
				!('files' in change) ||
				!change.files.some((f) => f.path === file.path)
			)
				return;
			if (change.type === 'file_delete') {
				badges.push({
					text: change.details,
					icon: 'lucide-trash',
					color: 'red',
					solid: true,
					queueIndex,
				});
			} else if (change.type === 'file_move') {
				badges.push({
					text: change.details,
					icon: 'lucide-folder-input',
					color: 'blue',
					solid: true,
					queueIndex,
				});
			} else if (change.type === 'file_rename') {
				badges.push({
					text: change.details,
					icon: 'lucide-pencil',
					color: 'orange',
					solid: true,
					queueIndex,
				});
			}
		});
		return badges;
	}

	private readonly _handleQueueChange = (): void => {
		this._render();
	};

	// The statistics cache refreshes a modified file's word count in the
	// background; re-render so the Words cell tracks it in near-real time.
	// Only relevant when the Words cell is visible — skip the churn otherwise.
	private readonly _handleStatsChange = (): void => {
		if (!this.visibleCells.has('words')) return;
		if (this.statsRefreshTimer !== null) {
			window.clearTimeout(this.statsRefreshTimer);
		}
		this.statsRefreshTimer = window.setTimeout(() => {
			this.statsRefreshTimer = null;
			this._render();
		}, 60);
	};

	private readonly _handleActiveFileChange = (file: TFile | null): void => {
		this._syncActiveFilePath(file ?? undefined);
		this._render();
	};

	private _syncActiveFilePath(
		file = this.plugin.app.workspace.getActiveFile(),
	): void {
		const nextPath = file?.path ?? null;
		if (this.activeRevealPath === nextPath) return;
		this.activeRevealPath = nextPath;
		this.tableView?.setActivePath(nextPath);
		this.gridView?.setActivePath(nextPath);
	}

	private _dedupeInheritedBadges(badges: NodeBadge[]): NodeBadge[] {
		const seen = new Set<string>();
		const inherited: NodeBadge[] = [];
		for (const badge of badges) {
			if (!badge.solid) continue;
			const key = `${badge.icon}:${badge.color}`;
			if (seen.has(key)) continue;
			seen.add(key);
			inherited.push({
				text: badge.text,
				icon: badge.icon,
				color: badge.color,
				solid: badge.solid,
				isInherited: true,
			});
		}
		return inherited;
	}

	private _decorateTreeWithFileTimes(nodes: TreeNode<FileMeta>[]): void {
		for (const node of nodes) {
			if (node.meta.file) {
				const times = this.plugin.statisticsCache.getFileTimes(node.meta.file);
				const wordCount = this.plugin.statisticsCache.getFileWordCount(
					node.meta.file,
				);
				node.mtimeText = this._formatDateCell(times.mtime);
				node.ctimeText = this._formatDateCell(times.ctime);
				node.wordCountText =
					wordCount === null ? undefined : this._formatWordCountCell(wordCount);
			}
			if (node.children?.length) this._decorateTreeWithFileTimes(node.children);
		}
	}

	private _formatWordCountCell(wordCount: number): string {
		return String(wordCount);
	}

	private _formatDateCell(time: number): string | undefined {
		if (!Number.isFinite(time) || time <= 0) return undefined;
		return new Date(time).toLocaleDateString();
	}

	private _findNode(
		id: string,
		nodes: TreeNode<FileMeta>[],
	): TreeNode<FileMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	getSelectedFiles(): TFile[] {
		if (this.viewMode === 'table')
			return this.tableView?.getSelectedFiles() ?? [];
		if (this.viewMode === 'grid')
			return this.gridView?.getSelectedFiles() ?? [];
		return [];
	}

	private _shouldShowEmptyFilteredState(): boolean {
		return (
			this.plugin.filterService.activeFilter.children.length > 0 &&
			this._currentFiles.length === 0
		);
	}

	private _renderEmptyFilteredState(): void {
		this.tableView?.destroy();
		this.gridView?.destroy();
		this.treeView?.destroy();
		this.containerEl.empty();
		const emptyEl = this.containerEl.createDiv({
			cls: 'vaultman-files-empty-state',
		});
		emptyEl.createDiv({
			cls: 'vaultman-files-empty-state-title',
			text: translate('files.empty_filtered_title'),
		});
		emptyEl.createDiv({
			cls: 'vaultman-files-empty-state-desc',
			text: translate('files.empty_filtered_desc'),
		});
	}

	private async _createNote(term: string): Promise<void> {
		const baseName = this._safeName(term, 'Untitled');
		const path = this._uniquePath(`${baseName}.md`);
		const file = await this.plugin.app.vault.create(path, '');
		this.plugin.filterService.applyFilters();
		for (const id of this.logic.getAncestorFolderIds([file])) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
		this._refreshFromFilterService();
		await this.plugin.app.workspace.openLinkText(path, '', false);
		new Notice(`Created ${path}`);
	}

	private async _createFolder(term: string): Promise<void> {
		const baseName = this._safeName(term, 'New folder');
		const path = this._uniquePath(baseName);
		await this.plugin.app.vault.createFolder(path);
		for (const id of this.logic.getAncestorFolderIdsFromPaths([path])) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
		this._render();
		new Notice(`Created ${path}`);
	}

	private async _createFileInFolder(
		folder: TFolder,
		name: string,
		content: string,
		openFile: boolean,
	): Promise<void> {
		const path = this._uniquePath(this._joinPath(folder.path, name));
		const file = await this.plugin.app.vault.create(path, content);
		this.plugin.filterService.applyFilters();
		for (const id of this.logic.getAncestorFolderIds([file])) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
		this._refreshFromFilterService();
		if (openFile) await this.plugin.app.workspace.openLinkText(path, '', false);
		new Notice(`Created ${path}`);
	}

	private async _createFolderInFolder(folder: TFolder): Promise<void> {
		const path = this._uniquePath(this._joinPath(folder.path, 'New folder'));
		await this.plugin.app.vault.createFolder(path);
		for (const id of this.logic.getAncestorFolderIdsFromPaths([path])) {
			this.expandedIds.add(id);
		}
		this._notifyExpansionChanged();
		this._refreshFromFilterService();
		new Notice(`Created ${path}`);
	}

	private async _copyFolder(folder: TFolder): Promise<void> {
		const targetRoot = this._uniquePath(this._folderCopyPath(folder.path));
		await this._ensureFolderExists(targetRoot);
		const nestedFolders = this._allVaultFolders()
			.filter((candidate) => candidate.path.startsWith(`${folder.path}/`))
			.sort((a, b) => a.path.localeCompare(b.path));
		for (const nestedFolder of nestedFolders) {
			const relative = nestedFolder.path.slice(folder.path.length + 1);
			await this._ensureFolderExists(this._joinPath(targetRoot, relative));
		}
		for (const file of this._filesInsideFolder(folder)) {
			const relative = file.path.slice(folder.path.length + 1);
			const targetPath = this._joinPath(targetRoot, relative);
			await this._ensureFolderExists(this._parentPath(targetPath));
			await this.plugin.app.vault.create(
				this._uniquePath(targetPath),
				await this.plugin.app.vault.read(file),
			);
		}
		this.plugin.filterService.applyFilters();
		this._refreshFromFilterService();
		new Notice(`Copied ${folder.path} to ${targetRoot}`);
	}

	private readonly _scheduleRefresh = (): void => {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this._refreshFromFilterService();
		}, 40);
	};

	private _refreshFromFilterService(): void {
		this._sourceFiles = this._filesForCurrentScope();
		this._currentFiles = this._sourceFiles;
		this._totalCount = this.plugin.app.vault.getFiles().length;
		this._syncSearchTermsFromActiveFilters();
		this._expandSearchMatches();
		this._render();
	}

	private _filesForCurrentScope(): TFile[] {
		const activeFolderPaths = this._activeFolderFilterPaths();
		if (activeFolderPaths.length > 0) {
			return this.plugin.filterService.filteredVaultFilesForFolderScopes(
				activeFolderPaths,
			);
		}
		return this.plugin.filterService.filteredVaultFiles;
	}

	private _activeFolderFilterPaths(): string[] {
		return this.plugin.filterService.activeFolderFilterPaths();
	}

	private _syncSearchTermsFromActiveFilters(): void {
		let name = '';
		let folder = '';
		const walk = (node: FilterNode): void => {
			if (node.enabled === false) return;
			if (node.type === 'rule') {
				if (node.filterType === 'file_name') {
					name = node.values[0] ?? '';
				}
				if (node.filterType === 'file_folder') {
					folder = node.values[0] ?? '';
				}
				return;
			}
			node.children.forEach(walk);
		};
		walk(this.plugin.filterService.activeFilter);
		this.searchName = name;
		this.searchFolder = folder;
	}

	private _expandSearchMatches(): void {
		if (!this.searchName && !this.searchFolder) return;
		let changed = false;
		for (const id of this.logic.getAncestorFolderIds(this._currentFiles)) {
			if (!this.expandedIds.has(id)) {
				this.expandedIds.add(id);
				changed = true;
			}
		}
		if (this.searchFolder) {
			const matchedFolders = this._allVaultFolders()
				.filter((folder) =>
					folder.path.toLowerCase().includes(this.searchFolder.toLowerCase()),
				)
				.map((folder) => folder.path);
			for (const id of this.logic.getAncestorFolderIdsFromPaths(
				matchedFolders,
			)) {
				if (!this.expandedIds.has(id)) {
					this.expandedIds.add(id);
					changed = true;
				}
			}
		}
		if (changed) this._notifyExpansionChanged();
	}

	private _foldersForCurrentView(): TFolder[] {
		if (this.viewMode !== 'tree') return [];
		const folders = this._allVaultFolders();
		const activeFolderPaths = this._activeFolderFilterPaths();
		if (activeFolderPaths.length > 0) {
			if (this._hasNarrowingConstraintsBeyondFolderScopes()) return [];
			return folders.filter((folder) =>
				activeFolderPaths.some(
					(path) =>
						folder.path !== path &&
						(folder.path === path || folder.path.startsWith(`${path}/`)),
				),
			);
		}
		if (this._hasActiveConstraints()) return [];
		if (this.searchName && !this.searchFolder) return [];
		if (!this.searchFolder) return folders;
		const term = this.searchFolder.toLowerCase();
		return folders.filter((folder) => folder.path.toLowerCase().includes(term));
	}

	private _hasActiveConstraints(): boolean {
		return (
			this.plugin.filterService.activeFilter.children.length > 0 ||
			Boolean(this.searchName || this.searchFolder || this.nodeTypeFilter)
		);
	}

	private _hasNarrowingConstraintsBeyondFolderScopes(): boolean {
		return (
			Boolean(this.searchName || this.searchFolder || this.nodeTypeFilter) ||
			this._hasEnabledNonFolderIncludeFilter(
				this.plugin.filterService.activeFilter,
			)
		);
	}

	private _hasEnabledNonFolderIncludeFilter(node: FilterNode): boolean {
		if (node.enabled === false) return false;
		if (node.type === 'rule') return node.filterType !== 'folder';
		return node.children.some((child) =>
			this._hasEnabledNonFolderIncludeFilter(child),
		);
	}

	private _autoExpandSparseTopLevel(tree: TreeNode<FileMeta>[]): void {
		if (!this._hasActiveConstraints()) {
			this.sparseAutoExpandSignature = '';
			return;
		}
		const topFolders = tree.filter((node) => node.meta.isFolder);
		if (topFolders.length === 0 || topFolders.length >= 4) {
			this.sparseAutoExpandSignature = '';
			return;
		}
		const signature = [
			topFolders.map((node) => node.id).join('|'),
			this._currentFiles.map((file) => file.path).join('|'),
		].join('::');
		if (signature === this.sparseAutoExpandSignature) return;
		this.sparseAutoExpandSignature = signature;
		let changed = false;
		for (const node of topFolders) {
			if (!this.expandedIds.has(node.id)) {
				this.expandedIds.add(node.id);
				changed = true;
			}
		}
		if (changed) this._notifyExpansionChanged();
	}

	private _allVaultFolders(): TFolder[] {
		return this.plugin.app.vault
			.getAllFolders(true)
			.filter((folder) => folder.path && folder.path !== '/');
	}

	private _filesInsideFolder(folder: TFolder): TFile[] {
		return filesInsideFolder(this.plugin.app.vault.getFiles(), folder.path);
	}

	private _queueFolderMove(
		folder: TFolder,
		newFolderPath: string,
		details: string,
	): void {
		const files = this._filesInsideFolder(folder);
		this.plugin.queueService.addOrRun({
			type: 'file_move',
			action: 'move',
			details,
			files,
			targetFolder: newFolderPath,
			customLogic: true,
			logicFunc: (file) => ({
				[MOVE_FILE]: movedParentPathForFolderFile(
					file.path,
					folder.path,
					newFolderPath,
				),
			}),
		});
	}

	private _queueFolderDelete(folder: TFolder): void {
		const files = this._filesInsideFolder(folder);
		this.plugin.queueService.addOrRun({
			type: 'file_delete',
			action: 'delete',
			details: `Delete folder "${folder.path}"`,
			files,
			targetFolder: folder.path,
			customLogic: true,
			logicFunc: () => ({ [DELETE_FILE]: true }),
		});
	}

	private _safeName(term: string, fallback: string): string {
		const cleaned = term
			.trim()
			.replace(/[\\/#^[\]|?*:<>"]/g, '-')
			.replace(/\s+/g, ' ')
			.slice(0, 80);
		return cleaned || fallback;
	}

	private _uniquePath(path: string): string {
		const slashIndex = path.lastIndexOf('/');
		const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
		const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
		const dotIndex = name.lastIndexOf('.');
		const hasExtension = dotIndex > 0;
		const base = `${dir}${hasExtension ? name.slice(0, dotIndex) : name}`;
		const dot = hasExtension ? name.slice(dotIndex) : '';
		let candidate = path;
		let counter = 1;
		while (this.plugin.app.vault.getAbstractFileByPath(candidate)) {
			candidate = `${base} ${counter}${dot}`;
			counter += 1;
		}
		return candidate;
	}

	private _folderCopyPath(path: string): string {
		const slashIndex = path.lastIndexOf('/');
		const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
		const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
		return `${dir}${name} copy`;
	}

	private async _ensureFolderExists(path: string): Promise<void> {
		if (!path) return;
		if (this.plugin.app.vault.getAbstractFileByPath(path)) return;
		await this.plugin.app.vault.createFolder(path);
	}

	private _parentPath(path: string): string {
		const slashIndex = path.lastIndexOf('/');
		if (slashIndex < 0) return '';
		return path.slice(0, slashIndex);
	}

	private _joinPath(...parts: string[]): string {
		return parts
			.map((part) => part.replace(/^\/|\/$/g, ''))
			.filter((part) => part.length > 0)
			.join('/');
	}

	private _uniqueMovePath(path: string): string {
		if (!this.plugin.app.vault.getAbstractFileByPath(path)) return path;
		const slashIndex = path.lastIndexOf('/');
		const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
		const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
		const dotIndex = name.lastIndexOf('.');
		const hasExtension = dotIndex > 0;
		const base = hasExtension ? name.slice(0, dotIndex) : name;
		const ext = hasExtension ? name.slice(dotIndex) : '';
		let counter = 1;
		let candidate = `${dir}${base} ${counter}${ext}`;
		while (this.plugin.app.vault.getAbstractFileByPath(candidate)) {
			counter += 1;
			candidate = `${dir}${base} ${counter}${ext}`;
		}
		return candidate;
	}
}
