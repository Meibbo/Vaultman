// src/components/FilesExplorerPanel.ts
import {
	Component,
	Keymap,
	Notice,
	setTooltip,
	TFile,
	TFolder,
} from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { FilesLogic } from '../../logic/logicsFiles';
import { FilesGridView } from '../layout/viewFilesGrid';
import { GridView as FilesTableView } from '../layout/viewGrid';
import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, FileMeta, NodeBadge } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';
import type { FilterNode } from '../../types/typeFilter';
import type { ExplorerSortState, ScopeSort } from '../../types/typeUI';
import {
	DEFAULT_FILES_HOVER_INFO,
	FILES_HOVER_INFO_FIELDS,
	type FilesHoverInfoField,
} from '../../types/typeSettings';
import {
	nodeTypeFilterPatch,
	normalizeNodeTypeFilters,
	sameNodeTypeFilters,
} from '../../logic/logicNodeTypeFilters';
import type { RevealNodeOptions } from '../../services/routerFloatingToc';
import type { StatisticsCacheChange } from '../../services/serviceStatisticsCache';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import { DELETE_FILE, MOVE_FILE } from '../../types/typeOps';
import { translate } from '../../i18n/index';
import { showInputModal } from '../../utils/inputModal';
import {
	changedItemsRemainOrdered,
	compareFilesForExplorer,
	normalizeExplorerSortBy,
} from '../../logic/logicSort';
import {
	activeScopeSort,
	normalizeExplorerSortState,
	replaceActiveScopeSort,
	sameExplorerSortState,
} from '../../logic/logicScopedSort';
import {
	findParentId,
	indexLevel,
	type FloatingTocExpansionChange,
	type IndexNodeRef,
} from '../../logic/logicIndexGroups';
import {
	filesInsideFolder,
	movedParentPathForFolderFile,
} from '../../logic/logicFolderQueue';
import {
	buildFolderCopyPlan,
	copyFileBinary,
	fileCopyPath,
	nextAvailableVaultPath,
} from '../../logic/logicFileCopy';
import {
	buildFileHoverInfo,
	filesHoverNeedsStatistics,
} from '../../logic/logicFileHoverInfo';
import { collectExpandableSubtreeIds } from '../../logic/logicTreeExpansion';
import {
	normalizeFilesIconScope,
	resolveScopedFileIcon,
	type ResolvedExplorerIcon,
} from '../../logic/logicFileIcons';
import {
	fileSelectionGesture,
	updateFileSelection,
} from '../../logic/logicFileSelection';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';
import { flattenVisibleTree } from '../../utils/treeVirtualization';

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
	private sortState = normalizeExplorerSortState('files', null);
	private nodeTypeFilters: string[] = [];
	private parentsFirst = true;
	private interactionMode: InteractionMode = 'open';
	private selectedFilePaths = new Set<string>();
	private selectionAnchorPath: string | null = null;
	private visibleCells = new Set<string>(['name', 'ext', 'count', 'nested']);
	private searchName = '';
	private searchFolder = '';
	private refreshTimer: number | null = null;
	private statsRefreshTimer: number | null = null;
	private pendingStatsPaths = new Set<string>();
	private pendingHoverStats = new Map<string, Set<HTMLElement>>();
	private wordSortWarmSignature = '';
	private wordSortWarmup: Promise<void> = Promise.resolve();
	private wordSortRetrySignature = '';
	private lastWordSortOrder: TFile[] = [];
	private lastWordSortComplete = false;
	private activeRevealPath: string | null = null;
	private sparseAutoExpandSignature = '';
	/** Last rendered hierarchy — feeds the floating TOC (index/scope drill). */
	private _lastRenderTree: TreeNode<FileMeta>[] = [];
	private _lastFlatFiles: { id: string; label: string }[] = [];
	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

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
				const workspace = this.plugin.app
					.workspace as typeof this.plugin.app.workspace & {
					openPopoutLeaf(): import('obsidian').WorkspaceLeaf;
				};
				const leaf = workspace.openPopoutLeaf();
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
			id: 'file.make_copy',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: translate('file.ctx.make_copy'),
			icon: 'lucide-copy',
			run: async (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				await this._copyFile(meta.file);
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
		this.plugin.iconicService?.onLoaded(() => this._render());
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
		this.pendingStatsPaths.clear();
		this.pendingHoverStats.clear();
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

	setInteractionMode(mode: InteractionMode): void {
		this.interactionMode = normalizeInteractionMode('files', mode);
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

	setSortState(state: ExplorerSortState): void {
		const normalizedState = normalizeExplorerSortState('files', state);
		const activeSort = activeScopeSort('files', normalizedState);
		const normalizedSortBy = normalizeExplorerSortBy(activeSort.sortBy);
		const nextNodeTypeFilters = normalizeNodeTypeFilters(
			normalizedState.nodeTypeFilters ?? normalizedState.nodeTypeFilter,
		);
		if (
			sameExplorerSortState(this.sortState, normalizedState) &&
			sameNodeTypeFilters(this.nodeTypeFilters, nextNodeTypeFilters)
		) {
			return;
		}
		this.sortState = normalizedState;
		this.sortBy = normalizedSortBy;
		this.sortDir = activeSort.direction;
		this.nodeTypeFilters = nextNodeTypeFilters;
		this.parentsFirst = normalizedState.parentsFirst !== false;
		if (this._usesWordSort()) this._warmWordCountSort();
		if (this.viewMode === 'table' && this.tableView) {
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				words: 'words',
				ext: 'ext',
				mtime: 'mtime',
				ctime: 'ctime',
				path: 'path',
			};
			this.tableView.setSortColumn(
				COL_MAP[normalizedSortBy] ?? 'name',
				activeSort.direction,
			);
		}
		this._notifySortStateChanged();
		this._render();
	}

	getActiveTypeFilter(): FilesTypeFilterState | null {
		if (this.nodeTypeFilters.length === 0) return null;
		const options = new Map(
			this.getFileTypeOptions().map((option) => [option.id, option]),
		);
		return {
			id: this.nodeTypeFilters.join('\u001f'),
			label: this.nodeTypeFilters
				.map((id) => options.get(id)?.label ?? this._fileTypeLabel(id))
				.join(', '),
		};
	}

	hasViewFilters(): boolean {
		return this.nodeTypeFilters.length > 0;
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
		if (this.nodeTypeFilters.length === 0) return;
		this.setSortState({
			...this.sortState,
			...nodeTypeFilterPatch([]),
		});
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
				sorts: {
					all: activeScopeSort('files', this.sortState, 'all'),
					drill: activeScopeSort('files', this.sortState, 'drill'),
				},
				drillNodeId: this.sortState.drillNodeId,
				compareNodes: (a, b, sort) =>
					this._compareFileTreeNodes(a, b, sort),
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
		this._notifyExpansionChanged({ type: 'collapse-all' });
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
				getFileIcon: (file: TFile, defaultIcon: string) =>
					this._resolveFileIcon(file.path, false, defaultIcon),
				onContextMenu: (file: TFile, e: MouseEvent) =>
					this._openFileContextMenu(file, e),
				onSelectionChange: (selected: Set<string>) => {
					this.plugin.filterService.setSelectedFiles(
						this.tableView?.getSelectedFiles() ?? [],
					);
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile, event) => this._handleFileClick(file, event),
				onFileHover: (file: TFile, element: HTMLElement) =>
					this._handleFileHover(file, element),
				onSortChange: (column, direction) =>
					this.setSortState(
						replaceActiveScopeSort('files', this.sortState, {
							sortBy: column === 'props' ? 'count' : column,
							direction,
						}),
					),
				onDragStart: (file: TFile, event: DragEvent) =>
					this._setFileDragPayload(file, event),
			});
			this.tableView.setVisibleCells(this.visibleCells);
			this.tableView.setSelectedPaths(this.selectedFilePaths);
			this.tableView.setActivePath(this.activeRevealPath);
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				words: 'words',
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
				onFileClick: (file: TFile, event) => this._handleFileClick(file, event),
				onFileHover: (file: TFile, element: HTMLElement) =>
					this._handleFileHover(file, element),
				onDragStart: (file: TFile, event: DragEvent) =>
					this._setFileDragPayload(file, event),
				getBadges: (file: TFile) => this._badgesForFile(file),
				getFileIcon: (file: TFile, defaultIcon: string) =>
					this._resolveFileIcon(file.path, false, defaultIcon),
				getPropCount: (file: TFile) => this._propCountForFile(file),
				getFileTimes: (file: TFile) =>
					this.plugin.statisticsCache.getFileTimes(file),
				getWordCount: (file: TFile) =>
					this.plugin.statisticsCache.getFileWordCount(file),
			});
			this.gridView.setVisibleCells(this.visibleCells);
			this.gridView.setSelectedPaths(this.selectedFilePaths);
			this.gridView.setActivePath(this.activeRevealPath);
		} else {
			this.treeView = new UnifiedTreeView(this.containerEl);
		}
	}

	private _sortFiles(files: TFile[]): TFile[] {
		return [...files].sort((a, b) =>
			compareFilesForExplorer(a, b, this.sortBy, this.sortDir, {
				countForFile: (file) => this._propCountForFile(file),
				wordCountForFile: (file) =>
					this.plugin.statisticsCache.getFileWordCount(file) ?? 0,
				getFileTimes: (file) => this.plugin.statisticsCache.getFileTimes(file),
			}),
		);
	}

	private _compareFileTreeNodes(
		a: TreeNode<FileMeta>,
		b: TreeNode<FileMeta>,
		sort: ScopeSort,
	): number {
		if (a.meta.file && b.meta.file) {
			return compareFilesForExplorer(
				a.meta.file,
				b.meta.file,
				sort.sortBy,
				sort.direction,
				{
					countForFile: (file) => this._propCountForFile(file),
					wordCountForFile: (file) =>
						this.plugin.statisticsCache.getFileWordCount(file) ?? 0,
					getFileTimes: (file) =>
						this.plugin.statisticsCache.getFileTimes(file),
				},
			);
		}

		const dir = sort.direction === 'asc' ? 1 : -1;
		const sortBy = normalizeExplorerSortBy(sort.sortBy);
		const numberValue = (node: TreeNode<FileMeta>): number => {
			if (sortBy === 'count') return node.count ?? 0;
			if (sortBy === 'sub') return node.children?.length ?? 0;
			if (sortBy === 'words') {
				return node.meta.file
					? (this.plugin.statisticsCache.getFileWordCount(node.meta.file) ?? 0)
					: 0;
			}
			if (sortBy === 'mtime' || sortBy === 'ctime') {
				return node.meta.file
					? this.plugin.statisticsCache.getFileTimes(node.meta.file)[sortBy]
					: 0;
			}
			return 0;
		};
		if (['count', 'sub', 'words', 'mtime', 'ctime'].includes(sortBy)) {
			return dir * (numberValue(a) - numberValue(b));
		}

		const stringValue = (node: TreeNode<FileMeta>): string => {
			if (sortBy === 'ext') return node.meta.file?.extension ?? '';
			if (sortBy === 'path') {
				return node.meta.file?.path ?? node.meta.folderPath;
			}
			return node.label;
		};
		return (
			dir *
			stringValue(a).localeCompare(stringValue(b), undefined, {
				numeric: true,
				sensitivity: 'base',
			})
		);
	}

	private _filesForDisplay(): TFile[] {
		if (this.nodeTypeFilters.length === 0) return this._currentFiles;
		const selectedTypes = new Set(this.nodeTypeFilters);
		return this._currentFiles.filter((file) =>
			selectedTypes.has(this._fileTypeId(file)),
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

	private _handleFileClick(
		file: TFile,
		event?: MouseEvent | KeyboardEvent,
	): void {
		const action = resolveInteractionAction(
			'files',
			this.interactionMode,
			false,
		);
		let selectionGesture = fileSelectionGesture(event, action === 'add');
		if (action === 'select' && !event?.shiftKey) {
			selectionGesture = 'toggle';
		}
		const selection = updateFileSelection(
			{
				selectedPaths: this.selectedFilePaths,
				anchorPath: this.selectionAnchorPath,
			},
			this._orderedVisibleFilePaths(),
			file.path,
			selectionGesture,
		);
		if (selectionGesture !== 'open') {
			this._applyFileSelection(selection);
			return;
		}
		if (action === 'add') {
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
		if (this.selectedFilePaths.size > 0) this._applyFileSelection(selection);
		const paneType = Keymap.isModEvent(event);
		void this.plugin.app.workspace.getLeaf(paneType).openFile(file);
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

	/** Floating TOC: nodes at a scope level (rootId=null → top level). */
	getIndexNodes(rootId: string | null): IndexNodeRef[] {
		if (this.viewMode === 'tree') {
			return indexLevel(
				this._lastRenderTree,
				rootId,
				(node) => node.meta.isFolder,
			);
		}
		// Flat / table / grid have no folder hierarchy: files only.
		return this._lastFlatFiles.map((file) => ({
			id: file.id,
			label: file.label,
			isContainer: false,
		}));
	}

	/** The rail's first-glyph index only makes sense for text-ordered sorts. */
	isIndexableSort(): boolean {
		return ['name', 'path', 'ext'].includes(
			normalizeExplorerSortBy(this.sortBy),
		);
	}

	/** Files/folders toggle only applies to the tree (flat/table/grid = files). */
	supportsKindToggle(): boolean {
		return this.viewMode === 'tree';
	}

	/** Scope drill needs a hierarchy — tree mode only. */
	supportsDrill(): boolean {
		return this.viewMode === 'tree';
	}

	/** Scope root that owns a picked node's level (its parent id, or null). */
	scopeRootForNode(id: string): string | null {
		if (this.viewMode !== 'tree') return null;
		return findParentId(this._lastRenderTree, id);
	}

	hasSortNode(id: string): boolean {
		return this._findNode(id, this._lastRenderTree) !== null;
	}

	/** Expand a node so the scope-drill can reveal its children. */
	expandNodeById(id: string): void {
		if (this.viewMode !== 'tree' || this.expandedIds.has(id)) return;
		this.expandedIds.add(id);
		this._notifyExpansionChanged();
		this._render();
	}

	/** Floating TOC reveal port (FTC-002): scroll to a node by id/path. */
	revealNode(id: string, options?: RevealNodeOptions): boolean {
		if (this.viewMode === 'table') {
			if (!this.tableView) return false;
			this.tableView.scrollToPath(id, options?.behavior);
			return true;
		}
		if (this.viewMode === 'grid') {
			if (!this.gridView) return false;
			this.gridView.scrollToPath(id, options?.behavior);
			return true;
		}
		if (!this.treeView) return false;
		this.treeView.scrollToId(id, 'start', options?.behavior);
		return true;
	}

	private _setIndexRoots(
		tree: TreeNode<FileMeta>[],
		flatFiles: { id: string; label: string }[],
	): void {
		this._lastRenderTree = tree;
		this._lastFlatFiles = flatFiles;
		this.onIndexChanged?.();
	}

	private _render(): void {
		if (this._shouldShowEmptyFilteredState()) {
			this._renderEmptyFilteredState();
			this._rememberWordSortOrder([]);
			this._setIndexRoots([], []);
			return;
		}
		const displayFiles = this._filesForDisplay();
		if (this._usesWordSort()) this._warmWordCountSort(displayFiles);
		if (this.viewMode === 'table' && this.tableView) {
			this.tableView.setSelectedPaths(this.selectedFilePaths);
			this.tableView.setActivePath(this.activeRevealPath);
			this.tableView.render(displayFiles, this._totalCount);
			const sortedTableFiles = [...this.tableView.getDisplayedFiles()];
			this._rememberWordSortOrder(sortedTableFiles);
			this._setIndexRoots(
				[],
				sortedTableFiles.map((file) => ({
					id: file.path,
					label: file.basename,
				})),
			);
		} else if (this.viewMode === 'grid' && this.gridView) {
			this.gridView.setSelectedPaths(this.selectedFilePaths);
			this.gridView.setActivePath(this.activeRevealPath);
			const sortedGridFiles = this._sortFiles(displayFiles);
			this.gridView.render(sortedGridFiles);
			this._rememberWordSortOrder(sortedGridFiles);
			this._setIndexRoots(
				[],
				sortedGridFiles.map((file) => ({
					id: file.path,
					label: file.basename,
				})),
			);
		} else if (this.viewMode === 'tree' && this.treeView) {
			const sortedFiles = this._sortFiles(displayFiles);
			this._rememberWordSortOrder(sortedFiles);
			const rebaseFolderPaths = this._activeFolderFilterPaths();
			const renderTree = this._nestedEnabled()
				? this.logic.buildFileTree(sortedFiles, this._foldersForCurrentView(), {
						rebaseFolderPaths,
						parentsFirst: this.parentsFirst,
						sorts: {
							all: activeScopeSort('files', this.sortState, 'all'),
							drill: activeScopeSort('files', this.sortState, 'drill'),
						},
						drillNodeId: this.sortState.drillNodeId,
						compareNodes: (a, b, sort) =>
							this._compareFileTreeNodes(a, b, sort),
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
			this._decorateTreeWithIcons(renderTree);
			this._setIndexRoots(renderTree, []);
			this.treeView.render({
				nodes: renderTree,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				selectedIds: this.selectedFilePaths,
				onToggle: (id: string) => {
					this._toggleExpanded(id);
					this._render();
				},
				onRecursiveExpand: (id: string) =>
					this._expandSubtree(id, renderTree),
				onRowClick: (id: string, event?: MouseEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						if (event?.button === 1) return;
						if (!this._nestedEnabled()) return;
						this._toggleExpanded(id);
						this._render();
						return;
					}
					if (!meta.isFolder && meta.file) {
						this._handleFileClick(meta.file, event);
					}
				},
				onRowHover: (id: string, row: HTMLElement) => {
					const node = this._findNode(id, renderTree);
					if (node?.meta.file) this._handleFileHover(node.meta.file, row);
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
		this.plugin.showDragActionGuide(
			this._fileDropGuide(payload, targetFolderPath),
		);
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

	private _fileDropTargetFolderPath(
		targetNode: TreeNode<FileMeta>,
	): string | null {
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
	): VaultmanDragNodePayload[] {
		return payload.selection?.length ? payload.selection : [payload];
	}

	private _fileDragNodes(
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
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
		nodePayload: Extract<
			VaultmanDragNodePayload,
			{ kind: 'file' | 'folder' }
		>,
		event: DragEvent,
	): void {
		const payload =
			this._selectedFileDragPayload(nodePayload) ??
			withActiveFilterDragSelection(
				nodePayload,
				this.plugin.filterService.activeFilter,
				'files',
			);
		setVaultmanDragPayload(event, payload);
		this._setNativeFileDragPayload(event, payload);
	}

	private _selectedFileDragPayload(
		nodePayload: Extract<VaultmanDragNodePayload, { kind: 'file' | 'folder' }>,
	):
		| (VaultmanDragNodePayload & { selection: VaultmanDragNodePayload[] })
		| null {
		if (
			nodePayload.kind !== 'file' ||
			!this.selectedFilePaths.has(nodePayload.path) ||
			this.selectedFilePaths.size <= 1
		) {
			return null;
		}
		const selection = this._orderedVisibleFilePaths()
			.filter((selectedPath) => this.selectedFilePaths.has(selectedPath))
			.map((selectedPath) => ({
				kind: 'file' as const,
				path: selectedPath,
			}));
		return selection.length > 1 ? { ...nodePayload, selection } : null;
	}

	private _setNativeFileDragPayload(
		event: DragEvent,
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
	): void {
		const dragManager = (
			this.plugin.app as unknown as {
				dragManager?: {
					draggable?: unknown;
					dragFile?: (
						event: DragEvent,
						file: TFile,
						source?: string,
					) => unknown;
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
			.filter(
				(entry): entry is TFile | TFolder =>
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
		payload: VaultmanDragNodePayload & {
			selection?: VaultmanDragNodePayload[];
		},
		targetFolderPath: string,
	): string {
		const nodes = this._fileDragNodes(payload);
		const subject =
			nodes.length === 1
				? `"${this._dragNodeName(nodes[0])}"`
				: `${nodes.length} items`;
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

	private _toggleExpanded(id: string): void {
		const wasExpanded = this.expandedIds.has(id);
		if (wasExpanded) this.expandedIds.delete(id);
		else this.expandedIds.add(id);
		this._notifyExpansionChanged(
			wasExpanded ? { type: 'collapse-node', id } : undefined,
		);
	}

	private _expandSubtree(id: string, nodes: TreeNode<FileMeta>[]): void {
		const root = this._findNode(id, nodes);
		if (!root) return;
		let changed = false;
		for (const expandableId of collectExpandableSubtreeIds(root)) {
			if (this.expandedIds.has(expandableId)) continue;
			this.expandedIds.add(expandableId);
			changed = true;
		}
		if (!changed) return;
		this._notifyExpansionChanged();
		this._render();
	}

	private _warmWordCountSort(files = this._filesForDisplay()): void {
		if (!this._usesWordSort()) return;
		const signature = this.plugin.statisticsCache.signatureFor(files);
		if (signature === this.wordSortWarmSignature) return;
		this.wordSortWarmSignature = signature;
		this.wordSortWarmup = this.wordSortWarmup
			.then(() => this.plugin.statisticsCache.ensureFileStats(files))
			.then(() => {
				if (this.wordSortRetrySignature === signature) {
					this.wordSortRetrySignature = '';
				}
			})
			.catch((error) => {
				if (this.wordSortWarmSignature === signature) {
					this.wordSortWarmSignature = '';
				}
				if (
					this._usesWordSort() &&
					this.wordSortRetrySignature !== signature
				) {
					this.wordSortRetrySignature = signature;
					this._scheduleStatsRefresh();
				}
				console.error('Vaultman word-count sort failed', error);
			});
	}

	private _usesWordSort(): boolean {
		return Object.values(this.sortState.sorts).some(
			(sort) => sort?.sortBy === 'words',
		);
	}

	private _rememberWordSortOrder(files: readonly TFile[]): void {
		if (this.sortBy !== 'words') {
			this.lastWordSortOrder = [];
			this.lastWordSortComplete = false;
			return;
		}
		this.lastWordSortOrder = [...files];
		this.lastWordSortComplete = files.every(
			(file) =>
				file.extension !== 'md' ||
				this.plugin.statisticsCache.getFileWordCount(file) !== null,
		);
	}

	private _wordSortNeedsReorder(paths: readonly string[]): boolean {
		if (!this.lastWordSortComplete || paths.length === 0) return true;
		return !changedItemsRemainOrdered(
			this.lastWordSortOrder,
			paths,
			(file) => file.path,
			(a, b) =>
				compareFilesForExplorer(a, b, 'words', this.sortDir, {
					wordCountForFile: (file) =>
						this.plugin.statisticsCache.getFileWordCount(file),
				}),
		);
	}

	private _notifyExpansionChanged(change?: FloatingTocExpansionChange): void {
		this.onExpansionChange?.();
		if (change) this.onIndexChanged?.(change);
	}

	private _sortState(): ExplorerSortState {
		return {
			...this.sortState,
			sorts: this.sortState.sorts,
			drillNodeId: this.sortState.drillNodeId,
			...nodeTypeFilterPatch(this.nodeTypeFilters),
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

	private _resolveFileIcon(
		path: string,
		isFolder: boolean,
		defaultIcon: string,
	): ResolvedExplorerIcon | null {
		return resolveScopedFileIcon(
			normalizeFilesIconScope(this.plugin.settings.filesIconScope),
			isFolder,
			defaultIcon,
			this.plugin.iconicService?.getFileIcon(path, isFolder) ?? null,
		);
	}

	private _decorateTreeWithIcons(nodes: TreeNode<FileMeta>[]): void {
		for (const node of nodes) {
			const resolved = this._resolveFileIcon(
				node.meta.file?.path ?? node.meta.folderPath,
				node.meta.isFolder,
				node.icon ?? (node.meta.isFolder ? 'lucide-folder' : 'lucide-file'),
			);
			node.icon = resolved?.icon;
			node.iconColor = resolved?.color;
			if (node.children?.length) this._decorateTreeWithIcons(node.children);
		}
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
	// background; patch the Words cell in place so it tracks the change in
	// near-real time. Only relevant when the Words cell is visible. We avoid a
	// full _render() here on purpose: rebuilding the whole tree per edit was the
	// typing-FPS regression (see issue p112-word-count-realtime-perf).
	private readonly _handleStatsChange = (
		change: StatisticsCacheChange,
	): void => {
		if (change.kind === 'invalidated') return;
		if (change.kind === 'cleared') {
			this.wordSortWarmSignature = '';
			this.wordSortRetrySignature = '';
			this.lastWordSortComplete = false;
			if (this._usesWordSort()) this._warmWordCountSort();
			return;
		}
		if (this.sortBy === 'words') {
			if (
				change.kind === 'file-stats-refreshed' &&
				!this._wordSortNeedsReorder(change.paths ?? [])
			) {
				this._patchVisibleWordCounts(new Set(change.paths ?? []));
				return;
			}
			this._scheduleStatsRefresh();
			return;
		}
		if (this._usesWordSort()) {
			this._scheduleStatsRefresh();
			return;
		}
		if (!this.visibleCells.has('words')) return;
		this._scheduleStatsRefresh(change.paths);
	};

	private _scheduleStatsRefresh(paths: readonly string[] = []): void {
		for (const path of paths) this.pendingStatsPaths.add(path);
		if (this.statsRefreshTimer !== null) {
			window.clearTimeout(this.statsRefreshTimer);
		}
		this.statsRefreshTimer = window.setTimeout(() => {
			this.statsRefreshTimer = null;
			const changedPaths = new Set(this.pendingStatsPaths);
			this.pendingStatsPaths.clear();
			if (this._usesWordSort()) this._render();
			else this._patchVisibleWordCounts(changedPaths);
		}, 60);
	}

	private _patchVisibleWordCounts(paths = new Set<string>()): void {
		if (!this.visibleCells.has('words')) return;
		const rowSelector =
			this.viewMode === 'tree'
				? '.vaultman-tree-row[data-path]'
				: this.viewMode === 'table'
					? '.vaultman-file-table-row[data-path]'
					: '.vaultman-files-grid-card[data-path]';
		const cellSelector =
			this.viewMode === 'tree'
				? '.vaultman-tree-words'
				: this.viewMode === 'table'
					? '.vaultman-file-words'
					: '.vaultman-files-grid-card-words';
		const rows = this.containerEl.querySelectorAll<HTMLElement>(rowSelector);
		for (const row of Array.from(rows)) {
			const path = row.dataset.path;
			if (!path) continue;
			if (paths.size > 0 && !paths.has(path)) continue;
			const cell = row.querySelector<HTMLElement>(cellSelector);
			if (!cell) continue;
			const file = this.plugin.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) continue;
			const wordCount = this.plugin.statisticsCache.getFileWordCount(file);
			if (wordCount === null) continue;
			const text = this._formatWordCountCell(wordCount);
			if (cell.textContent !== text) cell.textContent = text;
		}
	}

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

	private _filesHoverFields(): FilesHoverInfoField[] {
		const configured = this.plugin.settings.filesHoverInfo;
		if (!Array.isArray(configured)) return [...DEFAULT_FILES_HOVER_INFO];
		const validFields = new Set<string>(FILES_HOVER_INFO_FIELDS);
		return configured.filter(
			(field): field is FilesHoverInfoField =>
				typeof field === 'string' && validFields.has(field),
		);
	}

	private _fileHoverText(
		file: TFile,
		fields: readonly FilesHoverInfoField[] = this._filesHoverFields(),
	): string {
		const times = this.plugin.statisticsCache.getFileTimes(file);
		return buildFileHoverInfo(
			fields,
			{
				path: file.path,
				modified: this._formatDateCell(times.mtime) ?? null,
				created: this._formatDateCell(times.ctime) ?? null,
				words: this.plugin.statisticsCache.getFileWordCount(file),
				characters: this.plugin.statisticsCache.getFileCharacterCount(file),
			},
			{
				path: translate('settings.files_hover_info.path'),
				modified: translate('settings.files_hover_info.modified'),
				created: translate('settings.files_hover_info.created'),
				words: translate('settings.files_hover_info.words'),
				characters: translate('settings.files_hover_info.characters'),
			},
		);
	}

	private _applyFileHoverTooltip(
		file: TFile,
		element: HTMLElement,
		fields: readonly FilesHoverInfoField[],
	): void {
		element.removeAttribute('title');
		setTooltip(element, this._fileHoverText(file, fields));
	}

	private _handleFileHover(file: TFile, element: HTMLElement): void {
		const fields = this._filesHoverFields();
		this._applyFileHoverTooltip(file, element, fields);
		if (file.extension !== 'md' || !filesHoverNeedsStatistics(fields)) return;

		const missingWords =
			fields.includes('words') &&
			this.plugin.statisticsCache.getFileWordCount(file) === null;
		const missingCharacters =
			fields.includes('characters') &&
			this.plugin.statisticsCache.getFileCharacterCount(file) === null;
		if (!missingWords && !missingCharacters) return;

		const waitingElements = this.pendingHoverStats.get(file.path);
		if (waitingElements) {
			waitingElements.add(element);
			return;
		}

		this.pendingHoverStats.set(file.path, new Set([element]));
		void this.plugin.statisticsCache
			.ensureFileStats([file])
			.then(() => {
				for (const waitingElement of this.pendingHoverStats.get(file.path) ??
					[]) {
					if (
						waitingElement.isConnected &&
						waitingElement.dataset.path === file.path
					) {
						this._applyFileHoverTooltip(
							file,
							waitingElement,
							this._filesHoverFields(),
						);
					}
				}
			})
			.catch((error: unknown) => {
				console.warn(
					`Vaultman could not load hover stats for ${file.path}`,
					error,
				);
			})
			.finally(() => this.pendingHoverStats.delete(file.path));
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
		return this._orderedVisibleFilePaths()
			.filter((path) => this.selectedFilePaths.has(path))
			.map((path) => this.plugin.app.vault.getAbstractFileByPath(path))
			.filter((file): file is TFile => file instanceof TFile);
	}

	private _orderedVisibleFilePaths(): string[] {
		if (this.viewMode === 'tree') {
			return (
				flattenVisibleTree(
					this._lastRenderTree,
					this.expandedIds,
				) as TreeNode<FileMeta>[]
			)
				.map((node) => node.meta.file)
				.filter((file): file is TFile => file instanceof TFile)
				.map((file) => file.path);
		}
		return this._lastFlatFiles.map((file) => file.id);
	}

	private _applyFileSelection({
		selectedPaths,
		anchorPath,
	}: {
		selectedPaths: Set<string>;
		anchorPath: string | null;
	}): void {
		this.selectedFilePaths = selectedPaths;
		this.selectionAnchorPath = anchorPath;
		this.tableView?.setSelectedPaths(selectedPaths);
		this.gridView?.setSelectedPaths(selectedPaths);
		this.plugin.filterService.setSelectedFiles(this.getSelectedFiles());
		this.onSelectionChange?.(selectedPaths.size);
		if (this.viewMode === 'tree') this._render();
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

	private async _copyFile(file: TFile): Promise<void> {
		const copy = await this._copyFileToPath(
			file,
			this._fileCopyPath(file.path),
		);
		this.plugin.filterService.applyFilters();
		this._refreshFromFilterService();
		new Notice(`Copied ${file.path} to ${copy.path}`);
	}

	private async _copyFileToPath(
		file: TFile,
		targetPath: string,
	): Promise<TFile> {
		return await copyFileBinary(this.plugin.app.vault, file, targetPath);
	}

	private async _copyFolder(folder: TFolder): Promise<void> {
		const targetRoot = this._uniquePath(this._folderCopyPath(folder.path));
		const plan = buildFolderCopyPlan(
			folder.path,
			targetRoot,
			this._allVaultFolders().map((candidate) => candidate.path),
			this._filesInsideFolder(folder),
		);
		let targetCreated = false;
		try {
			await this._ensureFolderExists(targetRoot);
			targetCreated = true;
			for (const folderPath of plan.folderPaths) {
				await this._ensureFolderExists(folderPath);
			}
			for (const { file, targetPath } of plan.files) {
				await this._ensureFolderExists(this._parentPath(targetPath));
				await this._copyFileToPath(file, targetPath);
			}
		} catch (error) {
			const detail = error instanceof Error ? ` ${error.message}` : '';
			const state = targetCreated
				? `Partial copy retained at "${targetRoot}".`
				: `Could not create copy at "${targetRoot}".`;
			throw new Error(`${state}${detail}`);
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
			Boolean(
				this.searchName || this.searchFolder || this.nodeTypeFilters.length > 0,
			)
		);
	}

	private _hasNarrowingConstraintsBeyondFolderScopes(): boolean {
		return (
			Boolean(
				this.searchName || this.searchFolder || this.nodeTypeFilters.length > 0,
			) ||
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
		return nextAvailableVaultPath(path, (candidate) =>
			Boolean(this.plugin.app.vault.getAbstractFileByPath(candidate)),
		);
	}

	private _folderCopyPath(path: string): string {
		const slashIndex = path.lastIndexOf('/');
		const dir = slashIndex >= 0 ? `${path.slice(0, slashIndex)}/` : '';
		const name = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
		return `${dir}${name} copy`;
	}

	private _fileCopyPath(path: string): string {
		return fileCopyPath(path);
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
