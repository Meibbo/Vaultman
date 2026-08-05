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
import {
	FilesLogic,
	type BuildFileTreeOptions,
} from '../../logic/logicsFiles';
import { FilesGridView } from '../layout/viewFilesGrid';
import { GridView as FilesTableView } from '../layout/viewGrid';
import { UnifiedTreeView } from '../layout/viewTree';
import type {
	TreeNode,
	FileMeta,
	NodeBadge,
	NodeBubbleDot,
} from '../../types/typeTree';
import { resolveCellRenderOrder } from '../../logic/logicCellRegistry';
import {
	applyBubbleDots,
	buildBubbleIndex,
	collectDescendantBadges,
	type BubbleIndex,
} from '../../logic/logicBadgeBubbling';
import { aggregateFolderCells } from '../../logic/logicFolderAggregates';
import { renameTargetFromQueue } from '../../logic/logicRenameBadges';
import type { MenuCtx } from '../../types/typeCMenu';
import type { FilterNode } from '../../types/typeFilter';
import type { ExplorerSortState, ScopeSort } from '../../types/typeUI';
import {
	fileHoverEntries,
	resolveFileHoverEntries,
	type FileHoverInfoId,
} from '../../logic/logicCellRegistry';
import {
	nodeTypeFilterPatch,
	normalizeNodeTypeFilters,
	sameNodeTypeFilters,
} from '../../logic/logicNodeTypeFilters';
import type { RevealNodeOptions } from '../../services/routerFloatingToc';
import type { StatisticsCacheChange } from '../../services/serviceStatisticsCache';
import { buildFileRenameChange, FileRenameModal, formatFileRenameTargetName } from '../../modals/modalFileRename';

import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import { DELETE_FILE, MOVE_FILE } from '../../types/typeOps';
import { translate } from '../../i18n/index';
import {
	formatTimestampCell,
	isLiveTimestamp,
	LIVE_TIMESTAMP_TICK_MS,
} from '../../logic/logicRelativeTime';
import { showInputModal } from '../../utils/inputModal';
import {
	changedItemsRemainOrdered,
	compareExplorerText,
	compareFilesForExplorer,
	normalizeExplorerSortBy,
} from '../../logic/logicSort';
import {
	isTrackedPrimarySort,
	resolveScheduledStatsAction,
	resolveStatsChangeAction,
} from '../../logic/logicLiveCells';
import {
	moveNodeToSiblingEdge,
	recencyEdgeForDirection,
} from '../../logic/logicTreeNodeMove';
import { bubbleMaxToFolders } from '../../logic/logicLastOpened';
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
} from '../../logic/logicNodeSelection';
import {
	isFileExcluded,
	migrateExcludedPathsToFilter,
	purgeFilterPath,
	renameFilterPath,
} from '../../logic/logicExclusionFilter';
import { isVaultmanDefault } from '../../logic/logicCommandActions';
import {
	explorerPastelRainbowGlyphColor,
	explorerRainbowGlyphColor,
	normalizeGlyphColorChoice,
	normalizeGlyphColorScope,
	resolveExplorerGlyphColor,
	resolveExplorerGlyphDecoration,
} from '../../logic/logicGlyphColor';
import {
	executeObsidianCommand,
	obsidianCommandExists,
} from '../../utils/obsidianCommands';
import {
	normalizeInteractionMode,
	resolveInteractionAction,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import {
	DeferredFilterClickCoordinator,
	filterStateToPolarity,
} from '../../logic/logicFilterPolarity';
import {
	readVaultmanDragPayload,
	setVaultmanDragPayload,
	type VaultmanDragNodePayload,
	withActiveFilterDragSelection,
} from '../../utils/dragPayload';
import { flattenVisibleTree } from '../../utils/treeVirtualization';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import type { PanelWidgetExplorerProjectionConfig } from '../../types/typePanelWidget';
import {
	reconcileFilterProjectionItems,
	resolveFilterProjectionDelta,
	type FilterProjectionDelta,
	type FilterProjectionSnapshot,
} from '../../logic/logicFilterProjectionDelta';

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

export interface FileMoveOwner {
	providerId: string;
	generation: number;
}

export interface FileMoveModeState {
	origins: (TFile | TFolder)[];
	destinations: string[]; // Node IDs of selected destination folders
	restore: { interactionMode: string; searchOpen: boolean };
	owner: FileMoveOwner;
}

export class FilesExplorerPanel extends Component {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private logic: FilesLogic;
	private tableView: FilesTableView | null = null;
	private gridView: FilesGridView | null = null;
	private treeView: UnifiedTreeView | null = null;
	private expandedIds = new Set<string>();
	/** BT5-017: descendant-activity index, rebuilt with the projection only. */
	private bubbleIndex: BubbleIndex<FileMeta> | null = null;
	private viewMode: FilesViewMode = 'tree';
	private _sourceFiles: TFile[] = [];
	private _currentFiles: TFile[] = [];
	private hasSourceProjection = false;
	private _totalCount = 0;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private sortState = normalizeExplorerSortState('files', null);

	private fileMoveMode: FileMoveModeState | null = null;
	private onFileMoveChange?: () => void;
	private fileMoveGeneration = 0;
	private nodeTypeFilters: string[] = [];
	private parentsFirst = true;
	private interactionMode: InteractionMode = 'open';
	private readonly filterClicks: DeferredFilterClickCoordinator<string>;
	private selectedFilePaths = new Set<string>();
	private selectionAnchorPath: string | null = null;
	private visibleCells = new Set<string>(['name', 'ext', 'count', 'nested']);
	private searchName = '';
	private searchFolder = '';
	private refreshTimer: number | null = null;
	private metadataRefreshTimer: number | null = null;
	private statsRefreshTimer: number | null = null;
	private pendingMetadataPaths = new Set<string>();
	private pendingStatsPaths = new Set<string>();
	private propertyCountCache = new Map<string, number>();
	private pendingHoverStats = new Map<string, Set<HTMLElement>>();
	private statisticsWarmSignature = '';
	private statisticsWarmup: Promise<void> = Promise.resolve();
	private statisticsRetrySignature = '';
	private lastStatisticsSortOrder: TFile[] = [];
	private lastStatisticsSortComplete = false;
	private activeRevealPath: string | null = null;
	private sparseAutoExpandSignature = '';
	/** Last rendered hierarchy — feeds the floating TOC (index/scope drill). */
	private _lastRenderTree: TreeNode<FileMeta>[] = [];
	private _bubbleTree: TreeNode<FileMeta>[] = [];
	/**
	 * BT5-089: the options the Tree view was last rendered with, so a
	 * single-node reorder can re-project without rebuilding the model.
	 */
	private _treeRenderOpts: Parameters<UnifiedTreeView['render']>[0] | null =
		null;
	private _alternateTreeProjection: {
		nested: boolean;
		nodes: TreeNode<FileMeta>[];
	} | null = null;
	/**
	 * BT5-090: folder -> newest descendant mtime, the tie-break for the recency
	 * sort. Rebuilt from the display set each render, before the comparator runs.
	 */
	private _folderMaxMtime: ReadonlyMap<string, number> = new Map();
	private _folderFileCount: ReadonlyMap<string, number> = new Map();
	private _lastFlatFiles: { id: string; label: string }[] = [];
	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

	private onSelectionChange?: (count: number) => void;
	private onExpansionChange?: () => void;
	private onSortStateChange?: (state: ExplorerSortState) => void;
	private _glyphSettingsSignature = '';
	private renderBatchDepth = 0;
	private renderPending = false;
	private filterProjectionSnapshot: FilterProjectionSnapshot | null = null;

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
		this.filterClicks = new DeferredFilterClickCoordinator({
			onEffect: (folderPath, polarity) => {
				const current = filterStateToPolarity(
					this.plugin.filterService.getFilterState('folder', folderPath),
				);
				if (current === polarity) return;
				const intent =
					polarity === 'none'
						? 'remove'
						: polarity === 'inclusive'
							? 'include'
							: 'exclude';
				this.plugin.filterService.applyIntent('folder', folderPath, intent);
			},
		});
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'file.iconic-change',
			nodeTypes: ['file', 'folder'],
			surfaces: ['panel'],
			label: translate('iconic.change_icon'),
			icon: 'lucide-image-plus',
			section: 'Icon',
			when: () => this.plugin.iconicService?.canChangeFileIcon() === true,
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				const path = meta.file?.path ?? meta.folder?.path ?? meta.folderPath;
				if (!path) return;
				this.plugin.iconicService?.openFileIconPicker(path, ctx.event);
			},
		});

		svc.registerAction({
			id: 'file.exclude',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: translate('file.ctx.exclude'),
			icon: 'lucide-eye-off',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				const path = meta.file?.path;
				if (!path) return;
				// BT5-009: exclusion is a filter node now, so it hides through the
				// pipeline and shows again by removing its chip — coherent with
				// exclude-folder — instead of a parallel list applied in render.
				if (isFileExcluded(this.plugin.filterService.activeFilter, path)) {
					return;
				}
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'file_exclude',
					property: '',
					values: [path],
				});
			},
		});

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
				if (ctx.invokeRename) ctx.invokeRename(ctx.node.id as string);
				else {
					this._editingId = ctx.node.id as string;
					this._render();
				}
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
				
				if (this.plugin.settings.explorerFileMoveMode === 'inline') {
					this._enterFileMoveMode(ctx);
				} else {
					const filesToMove = this.selectedFilePaths.has(ctx.node.id) 
						? this.getSelectedFiles() 
						: [meta.file];
					new FileMoveModal(this.plugin.app, filesToMove, (change) =>
						this.plugin.queueService.addOrRun(change),
					).open();
				}
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
			id: 'file.move.proceed',
			nodeTypes: ['folder', 'file'],
			surfaces: ['panel'],
			label: translate('explorer.ctx.move_to_prop.proceed'), // Can reuse this or add a new one, but let's reuse
			icon: 'lucide-check',
			when: (ctx) => {
				const meta = ctx.node.meta as FileMeta;
				return this._fileMoveProceedAvailable() && 
					this.fileMoveMode?.destinations.some(d => meta.file && (meta.file.path === d || (meta.file instanceof TFile && meta.file.parent?.path === d))) === true;
			},
			run: () => this.proceedFileMove(),
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
				
				if (this.plugin.settings.explorerFileMoveMode === 'inline') {
					this._enterFileMoveMode(ctx);
				} else {
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
				}
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
			this.plugin.app.vault.on('delete', (file) => {
				// BT5-009: a deleted file drops its exclusion so it leaves no
				// orphan path in the filter tree.
				if (
					purgeFilterPath(this.plugin.filterService.activeFilter, file.path)
				) {
					this.plugin.filterService.applyFilters();
				}
				this._scheduleRefresh();
			}),
		);
		this.registerEvent(
			this.plugin.app.vault.on('rename', (file, oldPath) => {
				// BT5-009: a rename carries the exclusion to the new path.
				if (
					renameFilterPath(
						this.plugin.filterService.activeFilter,
						oldPath,
						file.path,
					)
				) {
					this.plugin.filterService.applyFilters();
				}
				this._scheduleRefresh();
			}),
		);
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', this._handleMetadataChange),
		);
		this.registerEvent(
			this.plugin.app.workspace.on('file-open', this._handleActiveFileChange),
		);
		this.plugin.queueService.on('changed', this._handleQueueChange);
		this.plugin.statisticsCache.on('changed', this._handleStatsChange);
		this._glyphSettingsSignature = this._currentGlyphSettingsSignature();
		this.register(
			this.plugin.onSettingsChange(this._handleGlyphSettingsChange),
		);
		const iconic = this.plugin.iconicService;
		if (iconic) {
			// BT5-031: `onLoaded` fires once, so Files was the only explorer that
			// never repainted after an icon changed. Both subscriptions share the
			// existing microtask coalescer, so a burst is still a single render.
			this.register(iconic.onLoaded(this._scheduleIconicRender));
			this.register(iconic.onChanged(this._scheduleIconicRender));
		}
		this.containerEl.addEventListener('dragover', this._handleRootFileDragOver);
		this.containerEl.addEventListener('drop', this._handleRootFileDrop);

		// LivreUI (U121-027): a user-visible setting must repaint the cells that
		// depend on it without waiting for an unrelated event. `onSettingsChange`
		// existed since 1.2.0 but had no subscribers, so every toggle was silent.
		// Deliberately outside the Iconic block above: BT5-031 guards that block
		// as "two subscriptions, no timer", and these belong to neither.
		this.register(this.plugin.onSettingsChange(this._scheduleLiveRender));

		// LivreUI (U121-027): relative copy goes stale on the wall clock, not on
		// any vault event, so it needs its own heartbeat. The guard keeps an idle
		// or absolute-mode vault at one boolean check per minute.
		this.registerInterval(
			window.setInterval(() => {
				if (!this._hasLiveTimestamps) return;
				this._patchVisibleTimeCells();
			}, LIVE_TIMESTAMP_TICK_MS),
		);

		this._migrateLegacyExclusions();
		this._mountView();
		this._syncActiveFilePath();
	}

	/**
	 * BT5-009: one-time move of the old persisted `excludedFilePaths` list into
	 * the filter pipeline. After this the filter tree owns exclusion, so the
	 * setting is cleared and never written again.
	 */
	private _migrateLegacyExclusions(): void {
		const legacy = this.plugin.settings.excludedFilePaths ?? [];
		if (legacy.length === 0) return;
		const changed = migrateExcludedPathsToFilter(
			legacy,
			this.plugin.filterService.activeFilter,
		);
		this.plugin.settings.excludedFilePaths = [];
		void this.plugin.saveSettings();
		if (changed) this.plugin.filterService.applyFilters();
	}

	onunload(): void {
		this.statisticsWarmSignature = '';
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
		if (this.statsRefreshTimer !== null) {
			window.clearTimeout(this.statsRefreshTimer);
			this.statsRefreshTimer = null;
		}
		if (this.metadataRefreshTimer !== null) {
			window.clearTimeout(this.metadataRefreshTimer);
			this.metadataRefreshTimer = null;
		}
		this.pendingMetadataPaths.clear();
		this.pendingStatsPaths.clear();
		this.propertyCountCache.clear();
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
		this.filterClicks.dispose();
		super.onunload();
	}

	private interactionModeChangeHandler?: (mode: InteractionMode) => void;
	setInteractionModeChangeHandler(handler?: (mode: InteractionMode) => void): void {
		this.interactionModeChangeHandler = handler;
	}

	setInteractionMode(mode: InteractionMode): void {
		const next = normalizeInteractionMode('files', mode);
		if (this.interactionMode === next) return;
		this.interactionMode = next;
		this.interactionModeChangeHandler?.(next);
		void this._render();
	}

	configurePanelWidgetProjection(
		config: PanelWidgetExplorerProjectionConfig,
	): void {
		this._withRenderBatch(() => {
			this.setViewMode(config.viewMode);
			this.setVisibleCells(new Set(config.visibleCells));
			this.setSortState(config.sortState);
			if (config.interactionMode) {
				this.setInteractionMode(config.interactionMode);
			}
		});
	}

	setViewMode(mode: FilesViewMode): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		this._mountView();
		this._render();
	}

	setVisibleCells(cells: Set<string>): void {
		if (sameStringSet(this.visibleCells, cells)) return;
		const wasNested = this._nestedEnabled();
		this.visibleCells = new Set(cells);
		this.tableView?.setVisibleCells(this.visibleCells);
		this.gridView?.setVisibleCells(this.visibleCells);
		if (!this._needsStatisticsWarmup()) this.statisticsWarmSignature = '';
		if (
			this.renderBatchDepth === 0 &&
			this.viewMode === 'tree' &&
			this.treeView &&
			this._treeRenderOpts
		) {
			const nested = this._nestedEnabled();
			if (nested !== wasNested) {
				if (this._switchCachedTreeTopology(wasNested, nested)) return;
			} else {
				this._refreshCachedTreeCells();
				return;
			}
		}
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
		const nodeTypeFiltersChanged = !sameNodeTypeFilters(
			this.nodeTypeFilters,
			nextNodeTypeFilters,
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
		if (!this._needsStatisticsWarmup()) this.statisticsWarmSignature = '';
		if (this.viewMode === 'table' && this.tableView) {
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				words: 'words',
				tasks: 'tasks',
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
		if (!nodeTypeFiltersChanged && this._resortCachedTree()) return;
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
		this.hasSourceProjection = true;
		this._sourceFiles = filteredFiles;
		this._currentFiles = filteredFiles;
		this._totalCount = totalCount;
		this.filterProjectionSnapshot = {
			paths: filteredFiles.map((file) => file.path),
			stateSignature:
				this.plugin.filterService.getProjectionStateSignature(),
		};
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
		const changedFolderIds: string[] = [];
		const walk = (nodes: TreeNode<FileMeta>[]) => {
			for (const node of nodes) {
				if (node.meta.isFolder && !this.expandedIds.has(node.id)) {
					this.expandedIds.add(node.id);
					changedFolderIds.push(node.id);
				}
				if (node.children?.length) walk(node.children);
			}
		};
		walk(this._lastRenderTree);
		if (changedFolderIds.length === 0) return;
		this._notifyExpansionChanged();
		this._refreshCompleteTreeExpansion(changedFolderIds);
	}

	collapseAll(): void {
		const changedFolderIds = [...this.expandedIds];
		if (changedFolderIds.length === 0) return;
		this.expandedIds.clear();
		this._notifyExpansionChanged({ type: 'collapse-all' });
		this._refreshCompleteTreeExpansion(changedFolderIds);
	}

	autoRevealActiveFile(): void {
		const file = this.plugin.app.workspace.getActiveFile();
		if (!file) return;
		this._syncActiveFilePath(file);
		const changedFolderIds: string[] = [];
		for (const id of this.logic.getAncestorFolderIds([file])) {
			if (this.expandedIds.has(id)) continue;
			this.expandedIds.add(id);
			changedFolderIds.push(id);
		}
		if (changedFolderIds.length > 0) {
			this._notifyExpansionChanged();
			this._refreshCompleteTreeExpansion(changedFolderIds);
		}
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
		// BT5-023: Create File may be bound to an Obsidian command, resolved by
		// id at invoke time. A missing/disabled command never fails silently:
		// it warns and falls back to the built-in note creation.
		const binding = this.plugin.settings.createFileCommand;
		if (!isVaultmanDefault(binding)) {
			if (obsidianCommandExists(this.plugin.app, binding)) {
				executeObsidianCommand(this.plugin.app, binding);
				return;
			}
			new Notice(translate('command.missing').replace('{id}', binding));
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
				formatTimestamp: this._formatDateCell,
				getFileTimes: (file: TFile) =>
					this.plugin.statisticsCache.getFileTimes(file),
				getWordCount: (file: TFile) =>
					this.plugin.statisticsCache.getFileWordCount(file),
				getTaskCount: (file: TFile) =>
					this.plugin.statisticsCache.getFileRemainingTasks(file),
				getBadges: (file: TFile) => this._badgesForFile(file),
				getFileIcon: (file: TFile, defaultIcon: string) =>
					this._resolveFileIcon(file.path, false, defaultIcon),
				getGlyphColor: (_file: TFile, index: number) =>
					this._explorerGlyphColorFor(false, index),
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
				tasks: 'tasks',
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
				formatTimestamp: this._formatDateCell,
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
				getGlyphColor: (_file: TFile, index: number) =>
					this._explorerGlyphColorFor(false, index),
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
			this.treeView.setActiveId(this.activeRevealPath);
		}
	}

	private _sortFiles(files: TFile[]): TFile[] {
		return [...files].sort((a, b) =>
			compareFilesForExplorer(a, b, this.sortBy, this.sortDir, {
				countForFile: (file) => this._propCountForFile(file),
				wordCountForFile: (file) =>
					this.plugin.statisticsCache.getFileWordCount(file) ?? 0,
				taskCountForFile: (file) =>
					this.plugin.statisticsCache.getFileRemainingTasks(file) ?? 0,
				getFileTimes: (file) => this.plugin.statisticsCache.getFileTimes(file),
				lastOpenedForFile: (file) =>
					this.plugin.lastOpenedService.getLastOpened(file),
			}),
		);
	}

	private _compareFileTreeNodes(
		a: TreeNode<FileMeta>,
		b: TreeNode<FileMeta>,
		sort: ScopeSort,
	): number {
		if (a.meta.file && b.meta.file) {
			const fileSort =
				normalizeExplorerSortBy(sort.sortBy) === 'file-count'
					? { ...sort, sortBy: 'name' }
					: sort;
			return compareFilesForExplorer(
				a.meta.file,
				b.meta.file,
				fileSort.sortBy,
				fileSort.direction,
				{
					countForFile: (file) => this._propCountForFile(file),
					wordCountForFile: (file) =>
						this.plugin.statisticsCache.getFileWordCount(file) ?? 0,
					taskCountForFile: (file) =>
						this.plugin.statisticsCache.getFileRemainingTasks(file) ?? 0,
					getFileTimes: (file) =>
						this.plugin.statisticsCache.getFileTimes(file),
					lastOpenedForFile: (file) =>
						this.plugin.lastOpenedService.getLastOpened(file),
				},
			);
		}

		const dir = sort.direction === 'asc' ? 1 : -1;
		const sortBy = normalizeExplorerSortBy(sort.sortBy);
		const numberValue = (node: TreeNode<FileMeta>): number => {
			if (sortBy === 'file-count') {
				return node.meta.file
					? 1
					: (this._folderFileCount.get(node.meta.folderPath) ?? 0);
			}
			if (sortBy === 'count') return node.count ?? 0;
			if (sortBy === 'sub') return node.children?.length ?? 0;
			if (sortBy === 'words') {
				return node.meta.file
					? (this.plugin.statisticsCache.getFileWordCount(node.meta.file) ?? 0)
					: 0;
			}
			if (sortBy === 'tasks') {
				return node.meta.file
					? (this.plugin.statisticsCache.getFileRemainingTasks(
							node.meta.file,
						) ?? 0)
					: 0;
			}
			if (sortBy === 'mtime' || sortBy === 'ctime') {
				return node.meta.file
					? this.plugin.statisticsCache.getFileTimes(node.meta.file)[sortBy]
					: 0;
			}
			if (sortBy === 'opened') {
				// BT5-090: a folder's recency is the newest open beneath it, so
				// opening a nested file floats its whole branch. Without this a
				// folder fell through to the name comparison below and drifted to
				// a nonsensical position while the sort claimed to be by recency.
				return node.meta.file
					? (this.plugin.lastOpenedService.getLastOpened(node.meta.file) ?? 0)
					: (this.plugin.lastOpenedService.getFolderLastOpened(
							node.meta.folderPath,
						) ?? 0);
			}
			return 0;
		};
		if (
			['file-count', 'count', 'sub', 'words', 'tasks', 'mtime', 'ctime', 'opened'].includes(
				sortBy,
			)
		) {
			const diff = numberValue(a) - numberValue(b);
			// BT5-090: recency ties are common — every never-opened node is 0 —
			// so fall back to modification time, not the alphabet. A folder's
			// mtime mirrors its recency: the newest modification beneath it.
			if (diff === 0 && sortBy === 'opened') {
				const mtimeOf = (node: TreeNode<FileMeta>): number =>
					node.meta.file
						? this.plugin.statisticsCache.getFileTimes(node.meta.file).mtime
						: (this._folderMaxMtime.get(node.meta.folderPath) ?? 0);
				return dir * (mtimeOf(a) - mtimeOf(b));
			}
			return dir * diff;
		}

		const stringValue = (node: TreeNode<FileMeta>): string => {
			if (sortBy === 'ext') return node.meta.file?.extension ?? '';
			if (sortBy === 'path') {
				return node.meta.file?.path ?? node.meta.folderPath;
			}
			return node.meta.file?.name ?? node.label;
		};
		return dir * compareExplorerText(stringValue(a), stringValue(b));
	}

	private _filesForDisplay(): TFile[] {
		// BT5-009: exclusion already ran through the filter pipeline upstream, so
		// there is no parallel excluded-paths pass here.
		const files = this._currentFiles;
		if (this.nodeTypeFilters.length === 0) return files;
		const selectedTypes = new Set(this.nodeTypeFilters);
		return files.filter((file) => selectedTypes.has(this._fileTypeId(file)));
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
		const count = this._readPropertyCount(file);
		this.propertyCountCache.set(file.path, count);
		return count;
	}

	private _readPropertyCount(file: TFile): number {
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
		if (action === 'filter') {
			const folderPath =
				file.parent?.path === '/' ? '' : file.parent?.path ?? '';
			const filterState = this.plugin.filterService.getFilterState(
				'folder',
				folderPath,
			);
			this.filterClicks.click(
				folderPath,
				folderPath,
				filterStateToPolarity(filterState),
			);
			return;
		}
		let selectionGesture = fileSelectionGesture(event, action === 'add');
		if (action === 'select' && !event?.shiftKey) {
			selectionGesture = 'toggle';
		}
		const orderedPaths =
			selectionGesture === 'range' ? this._orderedVisibleFilePaths() : [];
		const selection = updateFileSelection(
			{
				selectedPaths: this.selectedFilePaths,
				anchorPath: this.selectionAnchorPath,
			},
			orderedPaths,
			file.path,
			selectionGesture,
		);

		if (this.fileMoveMode && selectionGesture !== 'open') {
			this._registerFileMoveDestination(file);
			// We handle visual selection in _registerFileMoveDestination
			return;
		}
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

	getFileMoveMode(): FileMoveModeState | null {
		return this.fileMoveMode;
	}

	setFileMoveChangeHandler(handler?: () => void): void {
		this.onFileMoveChange = handler;
	}

	private _setFileMoveMode(next: FileMoveModeState | null): void {
		this.fileMoveMode = next;
		this.onFileMoveChange?.();
	}

	private _fileMoveOwner(): FileMoveOwner {
		return { providerId: 'files', generation: this.fileMoveGeneration };
	}

	reconcileFileMoveOwner(owner: FileMoveOwner): void {
		if (!this.fileMoveMode) return;
		if (this.fileMoveMode.owner.providerId === owner.providerId && this.fileMoveMode.owner.generation === owner.generation) return;
		this._exitFileMoveMode();
	}

	private _enterFileMoveMode(ctx: { node: { meta?: unknown } }): void {
		if (this.fileMoveMode) {
			this._exitFileMoveMode();
			return;
		}

		const meta = ctx.node.meta as FileMeta;
		if (!meta.file) return;

		// The origins are whatever was selected, or the clicked node if no selection.
		const origins: (TFile | TFolder)[] = [];
		const selectedPaths = new Set<string>();
		
		if (this.selectedFilePaths.has(meta.file.path)) {
			// Clicked node is in selection, use full selection
			for (const id of this.selectedFilePaths) {
				const node = this._findNode(id, this._lastRenderTree);
				const nmeta = node?.meta;
				if (nmeta?.file && !selectedPaths.has(nmeta.file.path)) {
					origins.push(nmeta.file);
					selectedPaths.add(nmeta.file.path);
				}
			}
		} else {
			// Clicked node not in selection, use just clicked node
			origins.push(meta.file);
		}

		if (origins.length === 0) return;

		this.fileMoveGeneration += 1;
		this._setFileMoveMode({
			origins,
			destinations: [],
			owner: this._fileMoveOwner(),
			restore: {
				interactionMode: this.interactionMode,
				searchOpen: false, // We don't force search open for file move
			},
		});

		this.selectedFilePaths = new Set<string>();
		this.setInteractionMode('select');
		this._render();
	}

	private _registerFileMoveDestination(file: TFile | TFolder): void {
		if (!this.fileMoveMode) return;
		
		const targetFolder = file instanceof TFolder ? file : file.parent;
		if (!targetFolder) return;

		// Check if it's a valid move (e.g. not moving a folder into itself)
		const isInvalid = this.fileMoveMode.origins.some(origin => {
			if (origin instanceof TFolder && (targetFolder.path === origin.path || targetFolder.path.startsWith(origin.path + '/'))) {
				return true;
			}
			return false;
		});

		if (isInvalid) {
			new Notice(translate('explorer.move_to_folder.rejected'));
			return;
		}

		this.fileMoveGeneration += 1;
		this._setFileMoveMode({
			...this.fileMoveMode,
			destinations: [targetFolder.path]
		});
		
		// Update visual selection to show the destination
		const newSelection = new Set<string>();
		newSelection.add(targetFolder.path);
		this.selectedFilePaths = newSelection;
		this.selectionAnchorPath = targetFolder.path;
		this._render();
	}

	private _exitFileMoveMode(): void {
		const restore = this.fileMoveMode?.restore;
		this._setFileMoveMode(null);
		if (restore) {
			this.setInteractionMode(restore.interactionMode as InteractionMode);
		}
		this._render();
	}

	cancelFileMoveMode(): void {
		this._exitFileMoveMode();
	}

	proceedFileMove(): void {
		if (!this.fileMoveMode || this.fileMoveMode.destinations.length === 0) return;
		
		const destId = this.fileMoveMode.destinations[0];
		const destNode = this._findNode(destId, this._lastRenderTree);
		const destMeta = destNode?.meta;
		
		if (destMeta?.file instanceof TFolder) {
			const targetFolder = destMeta.file;
			const targetPath = targetFolder.path.replace(/^\/|\/$/g, '');
			
			for (const file of this.fileMoveMode.origins) {
				const newPath = targetPath ? `${targetPath}/${file.name}` : file.name;
				if (newPath === file.path) continue;

				if (file instanceof TFile) {
					this.plugin.queueService.addOrRun({
						type: 'file_move',
						action: 'move',
						details: `Move file "${file.path}" to "${newPath}"`,
						files: [file],
						targetFolder: targetPath,
						customLogic: true,
						logicFunc: () => ({ [MOVE_FILE]: newPath }),
					});
				} else if (file instanceof TFolder) {
					this._queueFolderMove(file, newPath, `Move folder "${file.path}" to "${newPath}"`);
				}
			}
		}
		
		this._exitFileMoveMode();
	}

	private _fileMoveProceedAvailable(): boolean {
		return this.fileMoveMode !== null && this.fileMoveMode.destinations.length > 0;
	}

	getFileMoveSlotNodes(params: {
		moveMode: {
			proceed: { id: string; available: boolean };
			cancel: { id: string; available: boolean };
		} | null;
	}) {
		const nodes = [];
		if (params.moveMode) {
			nodes.push({ ...params.moveMode.proceed, available: this._fileMoveProceedAvailable() });
			nodes.push({ ...params.moveMode.cancel, available: true });
		}
		return nodes;
	}

	/** Re-measure the cached virtual window after a hidden pane becomes visible. */
	refreshViewport(): void {
		this.tableView?.refreshViewport();
		this.gridView?.refreshViewport();
		this.treeView?.refreshViewport();
		if (this.pendingMetadataPaths.size > 0) this._scheduleMetadataRefresh();
	}

	hasSortNode(id: string): boolean {
		return this._findNode(id, this._lastRenderTree) !== null;
	}

	/** D31: the floating index drill can drive the sort scope. */
	applyExternalSortScope(drillNodeId: string | null): void {
		const next = normalizeExplorerSortState('files', {
			...this.sortState,
			activeScope: drillNodeId ? 'drill' : 'all',
			drillNodeId,
		});
		if (sameExplorerSortState(this.sortState, next)) return;
		this.sortState = next;
		this.onSortStateChange?.(this._sortState());
		if (this._resortCachedTree()) return;
		this._render();
	}

	sortNodeLabel(id: string): string | null {
		return this._findNode(id, this._lastRenderTree)?.label ?? null;
	}

	/** Expand a node so the scope-drill can reveal its children. */
	expandNodeById(id: string): void {
		if (this.viewMode !== 'tree' || this.expandedIds.has(id)) return;
		this.expandedIds.add(id);
		this._notifyExpansionChanged();
		this._refreshTreeExpansion(id, [id]);
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
		// PVP configuration arrives before the Scene publishes its first source
		// projection. Keep the config, but do not build a fake empty tree that is
		// immediately replaced by the real vault projection.
		if (!this.hasSourceProjection) return;
		if (this.renderBatchDepth > 0) {
			this.renderPending = true;
			return;
		}
		this._alternateTreeProjection = null;
		vaultmanPerfMonitor.measure(
			'explorer.files.render',
			() => this._renderProjection(),
			{
				files: this._currentFiles.length,
				viewMode: this.viewMode,
			},
		);
	}

	private _withRenderBatch(operation: () => void): void {
		this.renderBatchDepth += 1;
		try {
			operation();
		} finally {
			this.renderBatchDepth -= 1;
			if (this.renderBatchDepth === 0 && this.renderPending) {
				this.renderPending = false;
				this._render();
			}
		}
	}

	private _treeOrderingOptions(): BuildFileTreeOptions {
		return {
			parentsFirst: this.parentsFirst,
			fixedFolders: this.sortState.fixedFolders !== false,
			sorts: {
				all: activeScopeSort('files', this.sortState, 'all'),
				drill: activeScopeSort('files', this.sortState, 'drill'),
			},
			drillNodeId: this.sortState.drillNodeId,
			compareNodes: (a, b, sort) =>
				this._compareFileTreeNodes(a, b, sort),
		};
	}

	private _refreshFolderMaxMtime(files = this._filesForDisplay()): void {
		if (!this._usesOpenedSort()) {
			this._folderMaxMtime = new Map();
			return;
		}
		this._folderMaxMtime = vaultmanPerfMonitor.measure(
			'explorer.files.folder-times',
			() =>
				bubbleMaxToFolders(
					files.map((file) => [
						file.path,
						this.plugin.statisticsCache.getFileTimes(file).mtime,
					]),
				),
			{ files: files.length },
		);
	}

	private _refreshFolderFileCount(files: readonly TFile[]): void {
		const counts = new Map<string, number>();
		for (const file of files) {
			const parts = file.path.split('/');
			parts.pop();
			for (let depth = 1; depth <= parts.length; depth += 1) {
				const path = parts.slice(0, depth).join('/');
				counts.set(path, (counts.get(path) ?? 0) + 1);
			}
		}
		this._folderFileCount = counts;
	}

	private _refreshCachedTreeLabels(nodes: TreeNode<FileMeta>[]): void {
		if (this._nestedEnabled()) return;
		const pathLabel = this._pathLabelActive();
		for (const node of nodes) {
			const file = node.meta.file;
			if (file) node.label = pathLabel ? file.path : file.name;
		}
	}

	private _applyCachedTreeProjection(
		nodes: TreeNode<FileMeta>[],
		rebuildQueueIndex: boolean,
	): void {
		if (!this.treeView || !this._treeRenderOpts) return;
		this._refreshCachedTreeLabels(nodes);
		this._decorateTreeWithFileTimes(nodes);
		if (rebuildQueueIndex) this._decorateTreeWithQueue(nodes);
		this._setIndexRoots(nodes, []);
		this._treeRenderOpts = {
			...this._treeRenderOpts,
			nodes,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			cellRenderOrder: this._activationCellOrder(),
			prepareNode: (node) =>
				this._prepareTreeNode(node as TreeNode<FileMeta>),
		};
		this.treeView.render(this._treeRenderOpts);
		if (this._needsStatisticsWarmup()) this._warmStatisticsCache();
	}

	private _refreshCachedTreeCells(): void {
		this._applyCachedTreeProjection(this._lastRenderTree, false);
	}

	private _flattenCachedTree(
		nodes: readonly TreeNode<FileMeta>[],
	): TreeNode<FileMeta>[] {
		const flat: TreeNode<FileMeta>[] = [];
		const visit = (subtree: readonly TreeNode<FileMeta>[]): void => {
			for (const node of subtree) {
				if (node.meta.file) {
					flat.push({
						...node,
						label: this._pathLabelActive()
							? node.meta.file.path
							: node.meta.file.name,
						depth: 0,
						showCaret: false,
						bubbleDot: undefined,
						children: [],
					});
				}
				if (node.children?.length) visit(node.children);
			}
		};
		visit(nodes);
		return this.logic.sortFileTreeNodes(flat, this._treeOrderingOptions());
	}

	private _switchCachedTreeTopology(
		wasNested: boolean,
		nested: boolean,
	): boolean {
		if (!this.treeView || !this._treeRenderOpts) return false;
		const current = {
			nested: wasNested,
			nodes: this._lastRenderTree,
		};
		let nextNodes: TreeNode<FileMeta>[] | null = null;
		if (this._alternateTreeProjection?.nested === nested) {
			nextNodes = this._alternateTreeProjection.nodes;
			this._alternateTreeProjection = current;
		} else if (wasNested && !nested) {
			nextNodes = this._flattenCachedTree(this._lastRenderTree);
			this._alternateTreeProjection = current;
		}
		if (!nextNodes) return false;
		this._applyCachedTreeProjection(nextNodes, true);
		return true;
	}

	private _resortCachedTree(): boolean {
		if (
			this.renderBatchDepth > 0 ||
			this.viewMode !== 'tree' ||
			!this.treeView ||
			!this._treeRenderOpts
		) {
			return false;
		}
		this._alternateTreeProjection = null;
		this._refreshFolderMaxMtime();
		this._refreshFolderFileCount(this._filesForDisplay());
		this.logic.sortFileTreeNodes(
			this._lastRenderTree,
			this._treeOrderingOptions(),
		);
		const sortedFiles = this._nestedEnabled()
			? []
			: this._lastRenderTree.flatMap((node) =>
					node.meta.file ? [node.meta.file] : [],
				);
		this._rememberStatisticsSortOrder(sortedFiles);
		this._applyCachedTreeProjection(this._lastRenderTree, false);
		return true;
	}

	private _renderProjection(): void {
		// Cleared before the pass so the flag always describes what this render
		// actually painted, not what a previous filter state painted (U121-027).
		this._hasLiveTimestamps = false;
		if (this._shouldShowEmptyFilteredState()) {
			this._renderEmptyFilteredState();
			this._rememberStatisticsSortOrder([]);
			this._setIndexRoots([], []);
			return;
		}
		const displayFiles = this._filesForDisplay();
		if (this.viewMode === 'table' && this.tableView) {
			this.tableView.setSelectedPaths(this.selectedFilePaths);
			this.tableView.setActivePath(this.activeRevealPath);
			this.tableView.render(displayFiles, this._totalCount);
			const sortedTableFiles = [...this.tableView.getDisplayedFiles()];
			this._rememberStatisticsSortOrder(sortedTableFiles);
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
			this._rememberStatisticsSortOrder(sortedGridFiles);
			this._setIndexRoots(
				[],
				sortedGridFiles.map((file) => ({
					id: file.path,
					label: file.basename,
				})),
			);
		} else if (this.viewMode === 'tree' && this.treeView) {
			const nested = this._nestedEnabled();
			// buildFileTree orders every sibling scope itself. Sorting the whole
			// vault first duplicated the most expensive comparison pass.
			const sortedFiles = nested
				? displayFiles
				: vaultmanPerfMonitor.measure(
						'explorer.files.sort',
						() => this._sortFiles(displayFiles),
						{ files: displayFiles.length },
					);
			this._rememberStatisticsSortOrder(nested ? [] : sortedFiles);
			// BT5-090: folder mtimes are only read by the Last opened tie-break.
			// Avoid scanning the vault for every other sort.
			this._refreshFolderMaxMtime(displayFiles);
			this._refreshFolderFileCount(displayFiles);
			const rebaseFolderPaths = this._activeFolderFilterPaths();
			const renderTree = this._nestedEnabled()
				? vaultmanPerfMonitor.measure(
						'explorer.files.build-tree',
						() =>
							this.logic.buildFileTree(
								sortedFiles,
								this._foldersForCurrentView(),
								{
									rebaseFolderPaths,
									...this._treeOrderingOptions(),
								},
							),
						{ files: sortedFiles.length },
					)
				: this.logic.buildFlatFileNodes(sortedFiles, {
						rebaseFolderPaths,
						labelMode: this._pathLabelActive() ? 'path' : 'name',
					});
			if (this._nestedEnabled()) this._autoExpandSparseTopLevel(renderTree);
			vaultmanPerfMonitor.measure(
				'explorer.files.decorate-times',
				() => this._decorateTreeWithFileTimes(renderTree),
				{ files: sortedFiles.length },
			);
			vaultmanPerfMonitor.measure(
				'explorer.files.decorate-rainbow',
				() => this._decorateTreeWithRainbow(renderTree),
				{ files: sortedFiles.length },
			);
			vaultmanPerfMonitor.measure(
				'explorer.files.decorate-queue',
				() => this._decorateTreeWithQueue(renderTree),
				{ files: sortedFiles.length },
			);
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
			vaultmanPerfMonitor.measure(
				'explorer.files.decorate-icons',
				() => this._decorateTreeWithIcons(renderTree),
				{ files: sortedFiles.length },
			);
			this._setIndexRoots(renderTree, []);
			this._treeRenderOpts = {
				nodes: renderTree,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				iconInCaretSlot: this.plugin.settings.iconInCaretSlot === true,
				cellRenderOrder: this._activationCellOrder(),
				prepareNode: (node) =>
					this._prepareTreeNode(node as TreeNode<FileMeta>),
				editingId: this._editingId,
				onRename: (id: string, newLabel: string) => {
					this._editingId = undefined;
					const node = this._findNode(id, renderTree);
					const file = node?.meta.file;
					if (file) {
						const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
						const resolved = formatFileRenameTargetName(file, newLabel, fm, 0);
						const change = buildFileRenameChange(file, resolved);
						this.plugin.queueService.addOrRun(change);
					}
					this._render();
				},
				onCancelRename: () => {
					this._editingId = undefined;
					this._render();
				},
				onOpenRichRename: (id: string, _currentValue: string) => {
					this._editingId = undefined;
					const node = this._findNode(id, renderTree);
					const file = node?.meta.file;
					if (file) {
						new FileRenameModal(
							this.plugin.app,
							this.plugin.propertyIndex,
							[file],
							(change) => this.plugin.queueService.addOrRun(change)
						).open();
					}
					this._render();
				},
				bubbleDotLabel: (dot: NodeBubbleDot) => this._bubbleDotLabel(dot),
				selectedIds: this.selectedFilePaths,
				renderLabel: (row, node) => {
					const queue = this.plugin.queueService.queue;
					const target = renameTargetFromQueue(queue, node.id);
					if (target) {
						const label = row.createSpan({
							cls: 'vaultman-tree-label vaultman-rename-preview',
							text: target,
						});
						if (node.labelColor) label.style.color = node.labelColor;
						return true;
					}
					return false;
				},
				onToggle: (id: string) => {
					this._toggleExpanded(id);
					this._refreshTreeExpansion(id, [id]);
				},
				onRecursiveExpand: (id: string) => this._expandSubtree(id, renderTree),
				onRowClick: (id: string, event?: MouseEvent) => {
					const node = this._findNode(id, renderTree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						if (event?.button === 1) return;
						const action = resolveInteractionAction(
							'files',
							this.interactionMode,
							false,
						);
						if (action === 'filter' && meta.folderPath !== undefined) {
							const folderPath = meta.folderPath;
							const filterState = this.plugin.filterService.getFilterState(
								'folder',
								folderPath,
							);
							this.filterClicks.click(
								folderPath,
								folderPath,
								filterStateToPolarity(filterState),
							);
							return;
						}
						if (!this._nestedEnabled()) return;
						this._toggleExpanded(id);
						this._refreshTreeExpansion(id, [id]);
						return;
					}
					if (!meta.isFolder && meta.file) {
						this._handleFileClick(meta.file, event);
					}
				},
				rowTooltip: (node) => {
					const file = (node.meta as Partial<FileMeta> | undefined)?.file;
					return file ? this._fileHoverText(file) : '';
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
							invokeRename: (targetId: string) => {
								this._editingId = targetId;
								this._render();
							},
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
			};
			this.treeView.render(this._treeRenderOpts);
		}
		if (this._needsStatisticsWarmup()) {
			this._warmStatisticsCache(displayFiles);
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
		nodePayload: Extract<VaultmanDragNodePayload, { kind: 'file' | 'folder' }>,
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
		const changedIds: string[] = [];
		for (const expandableId of collectExpandableSubtreeIds(root)) {
			if (this.expandedIds.has(expandableId)) continue;
			this.expandedIds.add(expandableId);
			changedIds.push(expandableId);
		}
		if (changedIds.length === 0) return;
		this._notifyExpansionChanged();
		this._refreshTreeExpansion(id, changedIds);
	}

	private _refreshTreeExpansion(
		rootId: string,
		changedFolderIds: readonly string[],
	): void {
		this._applyBubbleDots();
		for (const id of changedFolderIds) this._refreshFolderIcon(id);
		this.treeView?.updateExpansion(rootId, this.expandedIds);
	}

	/**
	 * Re-project a bulk expansion change from the Scene's current tree model.
	 * Expansion is view state: rebuilding, sorting, and decorating the provider
	 * model here made panelWidget actions scale with the complete vault.
	 */
	private _refreshCompleteTreeExpansion(
		changedFolderIds: readonly string[],
	): void {
		if (this.viewMode !== 'tree' || !this.treeView || !this._treeRenderOpts) {
			return;
		}
		this._applyBubbleDots();
		for (const id of changedFolderIds) this._refreshFolderIcon(id);
		this._treeRenderOpts = {
			...this._treeRenderOpts,
			expandedIds: this.expandedIds,
		};
		this.treeView.render(this._treeRenderOpts);
	}

	private _refreshFolderIcon(id: string): void {
		const node = this.bubbleIndex?.nodesById.get(id);
		if (!node?.meta.isFolder) return;
		const defaultIcon = this.expandedIds.has(id)
			? 'lucide-folder-open'
			: 'lucide-folder';
		const resolved = this._resolveFileIcon(
			node.meta.folderPath,
			true,
			defaultIcon,
		);
		node.icon = resolved?.icon;
		const decoration = resolveExplorerGlyphDecoration(
			node.labelColor ?? null,
			resolved?.color,
		);
		node.iconColor = decoration.iconColor;
	}

	private _warmStatisticsCache(files = this._filesForDisplay()): void {
		if (!this._needsStatisticsWarmup()) return;
		const signature = this.plugin.statisticsCache.signatureFor(files);
		if (signature === this.statisticsWarmSignature) return;
		this.statisticsWarmSignature = signature;
		this.statisticsWarmup = this.statisticsWarmup
			.then(async () => {
				const completed = await this.plugin.statisticsCache.ensureFileStats(
					files,
					{
						priorityPaths: this._visibleRenderedFilePaths(),
						shouldContinue: () =>
							this.statisticsWarmSignature === signature &&
							this._needsStatisticsWarmup(),
					},
				);
				if (!completed && this.statisticsWarmSignature === signature) {
					this.statisticsWarmSignature = '';
				}
				if (this.statisticsRetrySignature === signature) {
					this.statisticsRetrySignature = '';
				}
			})
			.catch((error) => {
				if (this.statisticsWarmSignature === signature) {
					this.statisticsWarmSignature = '';
				}
				if (
					this._needsStatisticsWarmup() &&
					this.statisticsRetrySignature !== signature
				) {
					this.statisticsRetrySignature = signature;
					this._scheduleStatsRefresh();
				}
				console.error('Vaultman explorer statistics warmup failed', error);
			});
	}

	private _needsStatisticsWarmup(): boolean {
		return (
			this.visibleCells.has('words') ||
			this.visibleCells.has('tasks') ||
			this._usesStatisticsSort()
		);
	}

	private _usesStatisticsSort(): boolean {
		return Object.values(this.sortState.sorts).some(
			(sort) => sort?.sortBy === 'words' || sort?.sortBy === 'tasks',
		);
	}

	private _usesOpenedSort(): boolean {
		return Object.values(this.sortState.sorts).some(
			(sort) => sort?.sortBy === 'opened',
		);
	}

	private _usesPropertyCountSort(): boolean {
		return Object.values(this.sortState.sorts).some(
			(sort) => sort?.sortBy === 'count',
		);
	}

	private _rememberStatisticsSortOrder(files: readonly TFile[]): void {
		const sortBy = normalizeExplorerSortBy(this.sortBy);
		if (!isTrackedPrimarySort(sortBy)) {
			this.lastStatisticsSortOrder = [];
			this.lastStatisticsSortComplete = false;
			return;
		}
		this.lastStatisticsSortOrder = [...files];
		// Word/task counts stream in during warmup, so an order snapshot taken
		// before they resolve cannot answer "did this change move anything".
		// File times and Last opened resolve synchronously, so a time-sorted
		// snapshot is always complete (U121-027).
		this.lastStatisticsSortComplete =
			sortBy === 'words' || sortBy === 'tasks'
				? files.every(
						(file) =>
							file.extension !== 'md' ||
							(sortBy === 'words'
								? this.plugin.statisticsCache.getFileWordCount(file)
								: this.plugin.statisticsCache.getFileRemainingTasks(file)) !==
								null,
					)
				: true;
	}

	private _statisticsSortNeedsReorder(paths: readonly string[]): boolean {
		if (!this.lastStatisticsSortComplete || paths.length === 0) return true;
		return !changedItemsRemainOrdered(
			this.lastStatisticsSortOrder,
			paths,
			(file) => file.path,
			// Mirrors `_sortFiles` exactly: the incremental answer must be
			// derived from the same comparator the full sort would use.
			(a, b) =>
				compareFilesForExplorer(a, b, this.sortBy, this.sortDir, {
					countForFile: (file) => this._propCountForFile(file),
					wordCountForFile: (file) =>
						this.plugin.statisticsCache.getFileWordCount(file),
					taskCountForFile: (file) =>
						this.plugin.statisticsCache.getFileRemainingTasks(file),
					getFileTimes: (file) =>
						this.plugin.statisticsCache.getFileTimes(file),
					lastOpenedForFile: (file) =>
						this.plugin.lastOpenedService.getLastOpened(file),
				}),
		);
	}

	private _visibleRenderedFilePaths(): string[] {
		const rowSelector =
			this.viewMode === 'tree'
				? '.vaultman-tree-row[data-path]'
				: this.viewMode === 'table'
					? '.vaultman-file-table-row[data-path]'
					: '.vaultman-files-grid-card[data-path]';
		const paths = new Set<string>();
		for (const row of Array.from(
			this.containerEl.querySelectorAll<HTMLElement>(rowSelector),
		)) {
			if (row.dataset.path) paths.add(row.dataset.path);
		}
		return [...paths];
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

	/**
	 * BT5-011: only hand the view an explicit order while the setting is on;
	 * otherwise the row keeps its structural default.
	 */
	private _activationCellOrder(): string[] | undefined {
		if (this.plugin.settings.orderCellsByActivation !== true) return undefined;
		return resolveCellRenderOrder('files', [...this.visibleCells], {
			byActivation: true,
			viewMode: this.viewMode === 'grid' ? 'cards' : this.viewMode,
		});
	}

	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	/**
	 * BT5-012: Path is an alternative projection of the label, not a second
	 * textual column, and folder rows already spell the hierarchy out — so it
	 * only applies while Nested is off.
	 */
	private _pathLabelActive(): boolean {
		return !this._nestedEnabled() && this.visibleCells.has('path');
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

	/** BT4-014 (research mechanism c): each top-level folder subtree gets a
	 * rainbow bucket. The value prefers the community snippet's palette vars
	 * with a built-in hex fallback, and rides an inline --folder-color so the
	 * coloring is virtualization-proof (never nth-child, never the native
	 * container class whose padding caused BT3-001). */
	private static readonly RAINBOW_FALLBACK = [
		'#ef4444',
		'#f97316',
		'#eab308',
		'#22c55e',
		'#14b8a6',
		'#06b6d4',
		'#3b82f6',
		'#8b5cf6',
		'#d946ef',
		'#ec4899',
	];

	private _decorateTreeWithRainbow(nodes: TreeNode<FileMeta>[]): void {
		const enabled = this.plugin.settings.explorerRainbowFolders === true;
		this.containerEl.classList.toggle('vaultman-rainbow-folders', enabled);
		if (!enabled) return;
		let bucket = 0;
		const paint = (subtree: TreeNode<FileMeta>[], color: string) => {
			for (const node of subtree) {
				if (node.meta.isFolder) node.folderColor = color;
				if (node.children?.length) paint(node.children, color);
			}
		};
		for (const node of nodes) {
			if (!node.meta.isFolder) continue;
			const index = (bucket % 10) + 1;
			const fallback =
				FilesExplorerPanel.RAINBOW_FALLBACK[bucket % 10] ?? '#ef4444';
			const color = `var(--color-rainbow-${index}, ${fallback})`;
			node.folderColor = color;
			if (node.children?.length) paint(node.children, color);
			bucket += 1;
		}
	}

	private _decorateTreeWithIcons(nodes: TreeNode<FileMeta>[]): void {
		const choice = normalizeGlyphColorChoice(
			this.plugin.settings.explorerGlyphColor,
		).choice;
		const positionalRainbow =
			choice === 'rainbow' || choice === 'rainbow-pastel';
		const walk = (
			subtree: TreeNode<FileMeta>[],
			inheritedRainbowColor?: string,
		): void => {
			for (const [position, node] of subtree.entries()) {
				const branchColor = positionalRainbow
					? (inheritedRainbowColor ??
						(choice === 'rainbow'
							? explorerRainbowGlyphColor(position)
							: explorerPastelRainbowGlyphColor(position)))
					: undefined;
				const glyphColor = this._explorerGlyphColorFor(
					node.meta.isFolder,
					position,
					branchColor,
				);
				const decoration = resolveExplorerGlyphDecoration(
					glyphColor,
					null,
				);
				node.iconColor = decoration.iconColor;
				node.labelColor = decoration.labelColor;
				if (node.children?.length) walk(node.children, branchColor);
			}
		};
		walk(nodes);
	}

	private _prepareTreeNode(node: TreeNode<FileMeta>): void {
		this._prepareTreeNodeCells(node);
		this._prepareTreeNodeIcon(node);
	}

	private _prepareTreeNodeCells(node: TreeNode<FileMeta>): void {
		const file = node.meta.file;
		if (!file) return;
		const showMtime =
			this.visibleCells.has('mtime') || this.visibleCells.has('updated');
		const showCtime =
			this.visibleCells.has('ctime') || this.visibleCells.has('installed');
		if (showMtime || showCtime) {
			const times = this.plugin.statisticsCache.getFileTimes(file);
			if (showMtime) node.mtimeText = this._formatDateCell(times.mtime);
			if (showCtime) node.ctimeText = this._formatDateCell(times.ctime);
		}
		if (this.visibleCells.has('opened')) {
			node.openedText = this._formatOpenedCell(file);
		}
		if (this.visibleCells.has('words')) {
			const wordCount = this.plugin.statisticsCache.getFileWordCount(file);
			node.wordCountText =
				wordCount === null
					? undefined
					: this._formatWordCountCell(wordCount);
		}
		if (this.visibleCells.has('tasks')) {
			const tasks = this.plugin.statisticsCache.getFileRemainingTasks(file);
			node.tasksText =
				tasks === null || tasks === 0 ? undefined : String(tasks);
		}
	}

	private _prepareTreeNodeIcon(node: TreeNode<FileMeta>): void {
		const defaultIcon =
			node.icon ??
			(node.meta.isFolder
				? this.expandedIds.has(node.id)
					? 'lucide-folder-open'
					: 'lucide-folder'
				: 'lucide-file');
		const resolved = this._resolveFileIcon(
			node.meta.file?.path ?? node.meta.folderPath,
			node.meta.isFolder,
			defaultIcon,
		);
		node.icon = resolved?.icon;
		const decoration = resolveExplorerGlyphDecoration(
			node.labelColor ?? null,
			resolved?.color,
		);
		node.iconColor = decoration.iconColor;
	}

	/**
	 * BT5-025: the resolved Explorer glyph color for a node, or null when the
	 * feature is off or the node is out of the configured scope.
	 */
	private _explorerGlyphColorFor(
		isFolder: boolean,
		position: number,
		inheritedRainbowColor?: string,
	): string | null {
		return resolveExplorerGlyphColor({
			choice: normalizeGlyphColorChoice(this.plugin.settings.explorerGlyphColor)
				.choice,
			customColor: this.plugin.settings.explorerGlyphCustomColor,
			scope: normalizeGlyphColorScope(this.plugin.settings.explorerGlyphScope),
			kind: isFolder ? 'folder' : 'file',
			position,
			inheritedRainbowColor,
		});
	}

	private _decorateTreeWithQueue(nodes: TreeNode<FileMeta>[]): void {
		const decorateNode = (node: TreeNode<FileMeta>): void => {
			for (const child of node.children ?? []) decorateNode(child);
			if (!node.meta.file) return;

			const badges = this._badgesForFile(node.meta.file);
			node.badges = badges;
			if (badges.some((badge) => badge.color === 'red')) {
				node.cls = `${node.cls ?? ''} is-deleted-file`.trim();
			}
		};
		for (const node of nodes) decorateNode(node);
		// BT5-017: parents no longer copy their descendants' badges. Activity
		// hidden by a collapse is projected as one dot instead, so expanding
		// the parent removes it (the real badge is visible again).
		// BT5-042: unless the dev opts into the detailed mode, where the
		// descendants' own badges bubble onto the collapsed parent.
		this.bubbleIndex = buildBubbleIndex(nodes);
		this._bubbleTree = nodes;
		this._applyBubbleDots();
	}

	private _collapsedBadgesMode(): boolean {
		return this.plugin.settings.collapsedFolderBadges === 'badges';
	}

	/**
	 * Re-project the cached activity index onto the current expansion state.
	 * Touches only the nodes that carry activity, never the whole tree
	 * (BT5-017 acceptance: no full-tree scan per frame).
	 */
	private _applyBubbleDots(): void {
		if (!this.bubbleIndex) return;
		if (this._collapsedBadgesMode()) {
			// Detailed mode: bubble the descendants' own badges instead of a dot.
			const inherited = collectDescendantBadges(
				this._bubbleTree,
				this.expandedIds,
			);
			for (const node of this.bubbleIndex.carriers.values()) {
				delete node.bubbleDot;
			}
			for (const [id, node] of this.bubbleIndex.nodesById) {
				const own = (node.badges ?? []).filter((badge) => !badge.isInherited);
				const bubbled = inherited.get(id) ?? [];
				node.badges = bubbled.length > 0 ? [...own, ...bubbled] : own;
			}
			return;
		}
		applyBubbleDots(this.bubbleIndex, this.expandedIds);
	}

	private _bubbleDotLabel(dot: NodeBubbleDot): string {
		return translate('files.bubble_dot', { count: String(dot.sourceCount) });
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

	private _iconicRenderQueued = false;
	private _editingId?: string;
	private _currentGlyphSettingsSignature(): string {
		return [
			this.plugin.settings.explorerGlyphColor,
			this.plugin.settings.explorerGlyphCustomColor,
			this.plugin.settings.explorerGlyphScope,
		].join('\u001f');
	}

	private readonly _handleGlyphSettingsChange = (): void => {
		const next = this._currentGlyphSettingsSignature();
		if (next === this._glyphSettingsSignature) return;
		this._glyphSettingsSignature = next;
		this._scheduleIconicRender();
	};

	/**
	 * LivreUI: raised by `_formatDateCell` whenever a rendered cell shows relative
	 * copy, cleared at the top of every `_render()`. The ticker reads it so an
	 * idle vault — or one in absolute mode — never pays for a repaint.
	 */
	private _hasLiveTimestamps = false;
	/**
	 * LivreUI: the one coalescer every full-render live source pushes through —
	 * Iconic (BT5-031) and the settings toggles (U121-027). One flag, one
	 * microtask, one `_render()`, so a burst from several sources at once still
	 * costs a single repaint. Cell-level liveness patches instead
	 * (`_patchVisibleTimeCells` / `_patchVisibleStatisticsCells`).
	 */
	private readonly _scheduleLiveRender = () => {
		if (this._iconicRenderQueued) return;
		this._iconicRenderQueued = true;
		queueMicrotask(() => {
			this._iconicRenderQueued = false;
			this._render();
		});
	};

	/**
	 * BT5-031 kept its name at the Iconic call sites. Iconic can finish loading
	 * while the Scene is still configuring the provider; the first projection
	 * already reads the loaded icons, so an empty file set skips the render.
	 */
	private readonly _scheduleIconicRender = () => {
		if (this._currentFiles.length === 0) return;
		this._scheduleLiveRender();
	};

	private readonly _handleQueueChange = (): void => {
		this._render();
	};

	private readonly _handleMetadataChange = (file: TFile): void => {
		if (!this.visibleCells.has('count') && !this._usesPropertyCountSort()) {
			return;
		}
		const nextCount = this._readPropertyCount(file);
		const previousCount = this.propertyCountCache.get(file.path);
		if (previousCount === nextCount) return;
		this.propertyCountCache.set(file.path, nextCount);
		this.pendingMetadataPaths.add(file.path);
		this._scheduleMetadataRefresh();
	};

	private _scheduleMetadataRefresh(): void {
		if (!this.containerEl.isShown()) return;
		if (this.metadataRefreshTimer !== null) {
			window.clearTimeout(this.metadataRefreshTimer);
		}
		this.metadataRefreshTimer = window.setTimeout(() => {
			this.metadataRefreshTimer = null;
			if (!this.containerEl.isShown()) return;
			const changedPaths = new Set(this.pendingMetadataPaths);
			this.pendingMetadataPaths.clear();
			if (this._usesPropertyCountSort()) {
				this._render();
				return;
			}
			this._patchCachedPropertyCounts(changedPaths);
			this.tableView?.refreshViewport();
			this.gridView?.refreshViewport();
			this.treeView?.refreshViewport();
		}, 160);
	}

	private _patchCachedPropertyCounts(paths: ReadonlySet<string>): void {
		for (const path of paths) {
			const node = this._findNode(path, this._lastRenderTree);
			if (!node?.meta.file) continue;
			node.count =
				this.propertyCountCache.get(path) ??
				this._propCountForFile(node.meta.file);
		}
	}

	// Patch statistics cells in place. Full model renders are reserved for sorts
	// whose order can actually change; Tasks may add/remove its badge dynamically.
	private readonly _handleStatsChange = (
		change: StatisticsCacheChange,
	): void => {
		if (change.kind === 'invalidated') return;
		if (change.kind === 'cleared') {
			this.statisticsWarmSignature = '';
			this.statisticsRetrySignature = '';
			this.lastStatisticsSortComplete = false;
			if (this._needsStatisticsWarmup()) this._warmStatisticsCache();
			return;
		}
		// LivreUI (U121-027): `statisticsCache` listens to vault `modify` and
		// emits `file-stats-refreshed` with the changed paths on every autosave
		// while the user is typing — so this handler must never buy a render it
		// cannot prove it needs (BT5-030). The decision is a pure function in
		// logicLiveCells so the no-render invariant stays behaviourally tested.
		const paths = change.paths ?? [];
		const action = resolveStatsChangeAction({
			kind: change.kind,
			primarySort: normalizeExplorerSortBy(this.sortBy),
			secondaryStatsSort: this._usesStatisticsSort(),
			secondaryTimeSort: this._usesSecondaryTimeSort(),
			statsCellVisible:
				this.visibleCells.has('words') || this.visibleCells.has('tasks'),
			timeCellVisible: this._timeCellVisible(),
			needsReorder: () => this._statisticsSortNeedsReorder(paths),
		});
		if (action === 'ignore') return;
		if (action === 'patch') {
			const pathSet = new Set(paths);
			this._patchVisibleStatisticsCells(pathSet);
			this._patchVisibleTimeCells(pathSet);
			return;
		}
		// The modified file is the new recency extreme under the Modified sort,
		// which is exactly BT5-089's Last-opened move — same shortcut, same
		// honest fallback to the debounced render when it does not provably land
		// where a full re-sort would.
		if (action === 'reorder' && this._tryMoveModifiedToEdge(paths)) return;
		this._scheduleStatsRefresh(paths);
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
			// Renders are reserved for orders the incremental path could not
			// preserve (tracked primary sorts that provably re-ordered, secondary
			// sorts, warmup retries). Everything else — visible words, tasks and
			// time cells included — is a targeted patch: `data-cell` gives every
			// date cell an addressable identity, so text lands without a render.
			const scheduled = resolveScheduledStatsAction({
				primarySort: normalizeExplorerSortBy(this.sortBy),
				secondaryStatsSort: this._usesStatisticsSort(),
				secondaryTimeSort: this._usesSecondaryTimeSort(),
				retryPending: this.statisticsRetrySignature !== '',
			});
			if (scheduled === 'render') {
				this._render();
			} else {
				this._patchVisibleStatisticsCells(changedPaths);
				this._patchVisibleTimeCells(changedPaths);
			}
		}, 60);
	}

	private _patchVisibleStatisticsCells(paths = new Set<string>()): void {
		const patchWords = this.visibleCells.has('words');
		const patchTasks =
			this.visibleCells.has('tasks') && this.viewMode === 'tree';
		if (!patchWords && !patchTasks) return;
		if (this.viewMode === 'tree') {
			this._patchCachedStatisticsNodes(paths, patchWords, patchTasks);
		}
		const rowSelector =
			this.viewMode === 'tree'
				? '.vaultman-tree-row[data-path]'
				: this.viewMode === 'table'
					? '.vaultman-file-table-row[data-path]'
					: '.vaultman-files-grid-card[data-path]';
		const wordsCellSelector =
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
			const file = this.plugin.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) continue;

			if (patchWords) {
				let cell = row.querySelector<HTMLElement>(wordsCellSelector);
				const wordCount = this.plugin.statisticsCache.getFileWordCount(file);
				if (wordCount !== null) {
					if (!cell && this.viewMode === 'tree') {
						let badgeZone = row.querySelector<HTMLElement>(
							'.vaultman-tree-badge-zone',
						);
						if (!badgeZone) {
							badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });
						}
						cell = badgeZone.createSpan({
							cls: 'vaultman-tree-words nav-file-tag',
						});
						const laterCell = badgeZone.querySelector<HTMLElement>(
							'.vaultman-tree-tasks, .vaultman-addon-cell, .vaultman-addon-toggle-cell, .vaultman-badge, .vaultman-tree-count',
						);
						if (laterCell) badgeZone.insertBefore(cell, laterCell);
					}
					const text = this._formatWordCountCell(wordCount);
					if (cell && cell.textContent !== text) cell.textContent = text;
				}
			}

			if (!patchTasks) continue;
			const remainingTasks =
				this.plugin.statisticsCache.getFileRemainingTasks(file);
			if (remainingTasks === null) continue;
			let taskCell = row.querySelector<HTMLElement>('.vaultman-tree-tasks');
			if (remainingTasks === 0) {
				taskCell?.remove();
				const badgeZone = row.querySelector<HTMLElement>(
					'.vaultman-tree-badge-zone',
				);
				if (badgeZone?.childElementCount === 0) badgeZone.remove();
				continue;
			}

			let badgeZone = row.querySelector<HTMLElement>(
				'.vaultman-tree-badge-zone',
			);
			if (!badgeZone) {
				badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });
			}
			if (!taskCell) {
				taskCell = badgeZone.createSpan({
					cls: 'vaultman-tree-tasks nav-file-tag',
				});
				const laterCell = badgeZone.querySelector<HTMLElement>(
					'.vaultman-addon-cell, .vaultman-addon-toggle-cell, .vaultman-badge, .vaultman-tree-count',
				);
				if (laterCell) badgeZone.insertBefore(taskCell, laterCell);
			}
			const text = String(remainingTasks);
			if (taskCell.textContent !== text) taskCell.textContent = text;
		}
	}

	private _patchCachedStatisticsNodes(
		paths: ReadonlySet<string>,
		patchWords: boolean,
		patchTasks: boolean,
	): void {
		const patchNode = (node: TreeNode<FileMeta>): void => {
			const file = node.meta.file;
			if (!file) return;
			if (patchWords) {
				const wordCount = this.plugin.statisticsCache.getFileWordCount(file);
				if (wordCount !== null) {
					node.wordCountText = this._formatWordCountCell(wordCount);
				}
			}
			if (patchTasks) {
				const remainingTasks =
					this.plugin.statisticsCache.getFileRemainingTasks(file);
				if (remainingTasks !== null) {
					node.tasksText =
						remainingTasks === 0 ? undefined : String(remainingTasks);
				}
			}
		};

		const visit = (nodes: TreeNode<FileMeta>[]): void => {
			for (const node of nodes) {
				if (paths.size === 0 || paths.has(node.id)) patchNode(node);
				if (node.children?.length) visit(node.children);
			}
		};
		visit(this._lastRenderTree);
	}

	/**
	 * LivreUI (U121-027): the words/tasks patcher generalized to the clock
	 * cells — fresh text written straight into the rendered rows, addressed by
	 * `data-cell`. No model rebuild, no re-sort, no `_render()`: the typing and
	 * ticker paths never pay for more than targeted DOM writes (BT5-030). An
	 * empty `paths` set means "every rendered row" — the minute tick.
	 */
	private _patchVisibleTimeCells(paths = new Set<string>()): void {
		if (!this._timeCellVisible()) return;
		if (paths.size === 0) {
			// Full tick: recompute the flag from what actually gets formatted, so
			// a vault whose last relative cell just aged past the threshold stops
			// paying for the interval. `_formatDateCell` re-raises it.
			this._hasLiveTimestamps = false;
		}
		// Model first: virtualized rows render from node text when they scroll
		// in, so a DOM-only patch would resurrect stale copy at the edges.
		if (this.viewMode === 'tree') this._patchCachedTimeNodes(paths);
		const cellIds: ('mtime' | 'ctime' | 'opened')[] = [];
		if (this.visibleCells.has('mtime')) cellIds.push('mtime');
		if (this.visibleCells.has('ctime')) cellIds.push('ctime');
		// The opened cell only exists in the tree; table columns and card meta
		// rows do not carry it.
		if (this.visibleCells.has('opened') && this.viewMode === 'tree') {
			cellIds.push('opened');
		}
		if (cellIds.length === 0) return;
		const rowSelector =
			this.viewMode === 'tree'
				? '.vaultman-tree-row[data-path]'
				: this.viewMode === 'table'
					? '.vaultman-file-table-row[data-path]'
					: '.vaultman-files-grid-card[data-path]';
		let structuralMiss = false;
		for (const row of Array.from(
			this.containerEl.querySelectorAll<HTMLElement>(rowSelector),
		)) {
			const path = row.dataset.path;
			if (!path) continue;
			if (paths.size > 0 && !paths.has(path)) continue;
			const file = this.plugin.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) continue;
			const times = this.plugin.statisticsCache.getFileTimes(file);
			for (const cellId of cellIds) {
				const text =
					cellId === 'opened'
						? this._formatOpenedCell(file)
						: this._formatDateCell(times[cellId]);
				const cell = row.querySelector<HTMLElement>(
					`[data-cell="${cellId}"]`,
				);
				if (!cell) {
					// The span only exists once the value does (BT5-013 keeps
					// never-opened files blank), so its first appearance is a
					// structural change — one viewport refresh absorbs it.
					if (text) structuralMiss = true;
					continue;
				}
				if (text !== undefined && cell.textContent !== text) {
					cell.textContent = text;
				}
			}
		}
		if (structuralMiss) {
			if (this.viewMode === 'tree') this.treeView?.refreshViewport();
			else if (this.viewMode === 'table') this.tableView?.refreshViewport();
			else this.gridView?.refreshViewport();
		}
	}

	/** Keep the cached tree nodes in step with what the DOM patch painted. */
	private _patchCachedTimeNodes(paths: ReadonlySet<string>): void {
		const visit = (nodes: TreeNode<FileMeta>[]): void => {
			for (const node of nodes) {
				if (node.meta.file && (paths.size === 0 || paths.has(node.id))) {
					this._refreshNodeTimeCells(node);
				}
				if (node.children?.length) visit(node.children);
			}
		};
		visit(this._lastRenderTree);
	}

	/**
	 * LivreUI (U121-027): under the Modified sort a vault write makes the file
	 * the new recency extreme — exactly BT5-089's Last-opened situation, so the
	 * modified note gets the same priority treatment as the opened one. Returns
	 * false whenever the move is not provably identical to a full re-sort, and
	 * the caller falls back to the honest debounced render.
	 */
	private _tryMoveModifiedToEdge(paths: readonly string[]): boolean {
		if (normalizeExplorerSortBy(this.sortBy) !== 'mtime') return false;
		if (paths.length !== 1) return false;
		if (this.viewMode !== 'tree') return false;
		if (!this.treeView || !this._treeRenderOpts || !this._canMoveOnOpen()) {
			return false;
		}
		const result = moveNodeToSiblingEdge(
			this._treeRenderOpts.nodes as TreeNode<FileMeta>[],
			paths[0],
			recencyEdgeForDirection(this.sortDir),
			{ partitionOf: (node) => node.meta.isFolder === true },
		);
		const moved = this._findNode(
			paths[0],
			(result.changed
				? result.nodes
				: this._treeRenderOpts.nodes) as TreeNode<FileMeta>[],
		);
		if (!moved) return false;
		this._refreshNodeTimeCells(moved);
		// The edit that moved the file also changed its statistics — the reorder
		// must not starve the words/tasks cells the patch path would have fed.
		// (QA 2026-07-31: words froze under the Modified sort because this
		// branch returned without them.)
		this._patchVisibleStatisticsCells(new Set(paths));
		// Keep the order snapshot in step with the move: without this every
		// following save re-answers "needs reorder" against the pre-move order,
		// loops through here forever and never takes the cheap patch path.
		this._rememberMovedFileAtEdge(paths[0]);
		if (!result.changed) {
			// Already at the edge — steady-state typing lands here after the
			// first save, so it must cost a DOM write, not a window render.
			this._patchVisibleTimeCells(new Set(paths));
			return true;
		}
		this._bubbleTree = result.nodes;
		this._treeRenderOpts = { ...this._treeRenderOpts, nodes: result.nodes };
		this.treeView.render(this._treeRenderOpts);
		return true;
	}

	/**
	 * Mirror `moveNodeToSiblingEdge` into `lastStatisticsSortOrder`, so the
	 * incremental order check agrees with what is on screen after an edge move.
	 */
	private _rememberMovedFileAtEdge(path: string): void {
		const index = this.lastStatisticsSortOrder.findIndex(
			(file) => file.path === path,
		);
		if (index === -1) return;
		const [file] = this.lastStatisticsSortOrder.splice(index, 1);
		if (recencyEdgeForDirection(this.sortDir) === 'start') {
			this.lastStatisticsSortOrder.unshift(file);
		} else {
			this.lastStatisticsSortOrder.push(file);
		}
	}

	private readonly _handleActiveFileChange = (file: TFile | null): void => {
		this._syncActiveFilePath(file ?? undefined);
		// BT5-013: Last opened is a recency order, so opening a file changes it
		// immediately — the note has to jump to the top the way a browser
		// history does. The microtask defers past the plugin's own file-open
		// listener, so the timestamp is already recorded when we re-sort, with
		// no dependency on listener registration order.
		// LivreUI (U121-027) vs BT5-030: opening a file bumps its Last opened value
		// whatever the sort is, so the cell is stale under every other order too.
		// BT5-030 forbids a render here (it is what removed the typing
		// micro-stalls): the patch pipeline writes the one opened row's cells in
		// place — model text plus a targeted DOM write, no render of any kind.
		// The microtask defers past the plugin's own file-open listener so the
		// timestamp is already recorded when the cell is formatted (BT5-013).
		if (normalizeExplorerSortBy(this.sortBy) !== 'opened') {
			if (!file || !this._timeCellVisible()) return;
			queueMicrotask(() => {
				if (!this.containerEl.isConnected) return;
				this._patchVisibleTimeCells(new Set([file.path]));
			});
			return;
		}
		queueMicrotask(() => {
			if (!this.containerEl.isConnected) return;
			// BT5-089: the new timestamp is the maximum, so the file moves to
			// one edge of its own partition and no other pair changes order.
			// Rebuilding the model for that made every tab switch stutter.
			//
			// The shortcut is only taken when it provably lands where a full
			// re-sort would: folders must be a fixed head partition, or the
			// level's real order depends on comparisons this move does not
			// perform. Anything else falls through to the honest rebuild.
			if (
				file &&
				this.treeView &&
				this._treeRenderOpts &&
				this._canMoveOnOpen()
			) {
				const result = moveNodeToSiblingEdge(
					this._treeRenderOpts.nodes as TreeNode<FileMeta>[],
					file.path,
					recencyEdgeForDirection(this.sortDir),
					{ partitionOf: (node) => node.meta.isFolder === true },
				);
				// Re-opening the file already at the edge, or bouncing between
				// the top two, changes nothing and must cost nothing.
				// LivreUI (U121-027): the node's own time cells are stale even when
				// it does not move — re-opening the file at the edge still bumps
				// Last opened. Refreshed before the early return so "no reorder"
				// never means "no repaint".
				const moved = this._findNode(
					file.path,
					(result.changed ? result.nodes : this._treeRenderOpts.nodes) as TreeNode<FileMeta>[],
				);
				if (moved) this._refreshNodeTimeCells(moved);
				if (!result.changed) {
					if (moved && this._timeCellVisible()) this.treeView.render(this._treeRenderOpts);
					return;
				}
				this._bubbleTree = result.nodes;
				this._treeRenderOpts = { ...this._treeRenderOpts, nodes: result.nodes };
				this.treeView.render(this._treeRenderOpts);
				return;
			}
			// Table and Cards have no equivalent projection yet, and neither do
			// the layouts the shortcut cannot reproduce.
			this._render();
		});
	};

	/**
	 * BT5-089: whether moving the opened file to its partition edge lands
	 * exactly where a full re-sort would.
	 *
	 * It does when folders lead every sibling group and hold a fixed order:
	 * the folder partition cannot react to the new timestamp, and inside the
	 * file partition the opened file is the new extreme. If folders are
	 * interleaved with files, or are themselves sorted by recency, then
	 * ancestors can move too and only a real re-sort is correct.
	 */
	private _canMoveOnOpen(): boolean {
		return this.parentsFirst && this.sortState.fixedFolders !== false;
	}

	private _syncActiveFilePath(
		file = this.plugin.app.workspace.getActiveFile(),
	): void {
		const nextPath = file?.path ?? null;
		if (this.activeRevealPath === nextPath) return;
		this.activeRevealPath = nextPath;
		this.tableView?.setActivePath(nextPath);
		this.gridView?.setActivePath(nextPath);
		this.treeView?.setActiveId(nextPath);
	}

	private _decorateTreeWithFileTimes(nodes: TreeNode<FileMeta>[]): void {
		// File cell values are prepared only as their rows enter the virtual
		// window. Recursive folder aggregates are the sole model-wide pass.
		this._decorateFoldersWithAggregates(nodes);
	}

	private _decorateFoldersWithAggregates(nodes: TreeNode<FileMeta>[]): void {
		const aggregateFiles = this.visibleCells.has('file-count');
		if (this.plugin.settings.folderAggregateCells !== true && !aggregateFiles) return;
		const aggregateCount = this.visibleCells.has('count');
		const aggregateWords = this.visibleCells.has('words');
		const aggregateTasks = this.visibleCells.has('tasks');
		if (!aggregateFiles && !aggregateCount && !aggregateWords && !aggregateTasks) return;
		const totals = aggregateFolderCells(
			nodes,
			(node) => ({
				files: node.meta.file ? 1 : 0,
				count: node.meta.file && aggregateCount ? (node.count ?? 0) : 0,
				words:
					node.meta.file && aggregateWords
						? (this.plugin.statisticsCache.getFileWordCount(node.meta.file) ??
							0)
						: 0,
				tasks:
					node.meta.file && aggregateTasks
						? (this.plugin.statisticsCache.getFileRemainingTasks(
								node.meta.file,
							) ?? 0)
						: 0,
			}),
			(node) => node.meta.isFolder,
		);
		const apply = (subtree: TreeNode<FileMeta>[]): void => {
			for (const node of subtree) {
				const total = node.meta.isFolder ? totals.get(node.id) : undefined;
				if (total) {
					node.fileCountText = aggregateFiles ? String(total.files) : undefined;
					node.count = total.count > 0 ? total.count : undefined;
					node.wordCountText =
						total.words > 0
							? this._formatWordCountCell(total.words)
							: undefined;
					node.tasksText = total.tasks > 0 ? String(total.tasks) : undefined;
				}
				if (node.children?.length) apply(node.children);
			}
		};
		apply(nodes);
	}

	private _formatWordCountCell(wordCount: number): string {
		return String(wordCount);
	}

	/** BT5-013: never-opened files stay blank instead of showing a fake epoch. */
	private _formatOpenedCell(
		file: TFile,
		formatter: (time: number) => string | undefined = this._formatDateCell,
	): string | undefined {
		const openedAt = this.plugin.lastOpenedService.getLastOpened(file);
		return openedAt === null ? undefined : formatter(openedAt);
	}

	/**
	 * U121-027: the single formatter for every time cell in this explorer. The
	 * grid and table views receive it as a callback so all surfaces switch modes
	 * together instead of each re-deriving the date.
	 */
	private _formatDateCell = (time: number): string | undefined => {
		const options = {
			now: Date.now(),
			mode: this.plugin.settings.timestampRelative
				? ('relative' as const)
				: ('specific' as const),
			window: this.plugin.settings.timestampRelativeWindow ?? '24h',
			cutoffs: this.plugin.settings.timestampRelativeCutoffs,
			hideRelativePredicate: this.plugin.settings.timestampRelativeHidePredicate === true,
		};
		// LivreUI: the flag is raised here rather than in the tree decoration
		// because tree, grid and table each reach this formatter by a different
		// path — only the formatter itself sees every rendered cell.
		if (isLiveTimestamp(time, options)) this._hasLiveTimestamps = true;
		return formatTimestampCell(time, { ...options, translate });
	};

	/**
	 * U121-027 (QA 2026-07-31): the hover tooltip formats its time entries from
	 * its own settings trio, so the Cells-section options shape only the cells.
	 * No liveness flag: tooltips are built fresh on every hover.
	 */
	private _formatHoverDateCell = (time: number): string | undefined =>
		formatTimestampCell(time, {
			now: Date.now(),
			mode: this.plugin.settings.tooltipTimestampRelative !== false
				? 'relative'
				: 'specific',
			window: this.plugin.settings.tooltipTimestampRelativeWindow ?? '24h',
			cutoffs: this.plugin.settings.tooltipTimestampRelativeCutoffs,
			hideRelativePredicate: this.plugin.settings.tooltipTimestampRelativeHidePredicate === true,
			translate,
		});

	private _filesHoverFields(): FileHoverInfoId[] {
		return resolveFileHoverEntries(
			this.plugin.settings.filesHoverInfo,
			this.plugin.settings.filesHoverInfoOrder,
		).map((entry) => entry.id);
	}

	private _fileHoverText(
		file: TFile,
		fields: readonly FileHoverInfoId[] = this._filesHoverFields(),
	): string {
		const times = this.plugin.statisticsCache.getFileTimes(file);
		const labels = Object.fromEntries(
			fileHoverEntries().map((entry) => [entry.id, translate(entry.labelKey)]),
		) as Record<FileHoverInfoId, string>;
		return buildFileHoverInfo(
			fields,
			{
				label:
					file.extension === 'md' || file.extension === 'markdown'
						? file.basename
						: file.name,
				path: file.path,
				opened: this._formatOpenedCell(file, this._formatHoverDateCell) ?? null,
				mtime: this._formatHoverDateCell(times.mtime) ?? null,
				ctime: this._formatHoverDateCell(times.ctime) ?? null,
				ext: file.extension,
				words: this.plugin.statisticsCache.getFileWordCount(file),
				characters: this.plugin.statisticsCache.getFileCharacterCount(file),
				tasks: this.plugin.statisticsCache.getFileRemainingTasks(file),
				count: this._propCountForFile(file),
			},
			labels,
		);
	}

	private _applyFileHoverTooltip(
		file: TFile,
		element: HTMLElement,
		fields: readonly FileHoverInfoId[],
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
		const missingTasks =
			fields.includes('tasks') &&
			this.plugin.statisticsCache.getFileRemainingTasks(file) === null;
		if (!missingWords && !missingCharacters && !missingTasks) return;

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

	/**
	 * LivreUI (U121-027): recompute one node's time cells in place. The BT5-089
	 * open-shortcut repositions a node without going through `_render()`, so the
	 * text it already carries is from before the file was opened — the node lands
	 * first while still reading "4 minutes ago". Refreshing the single moved node
	 * keeps that shortcut's whole point (no rebuild, no re-sort, no O(n) reformat).
	 */
	private _refreshNodeTimeCells(node: TreeNode<FileMeta>): void {
		const file = node.meta.file;
		if (!file) return;
		const times = this.plugin.statisticsCache.getFileTimes(file);
		node.mtimeText = this._formatDateCell(times.mtime);
		node.ctimeText = this._formatDateCell(times.ctime);
		node.openedText = this._formatOpenedCell(file);
	}

	/**
	 * Whether any scope-sort level orders by a file time that a vault `modify`
	 * changes. `opened` is excluded: it is driven by `file-open`, not by writes.
	 */
	private _usesSecondaryTimeSort(): boolean {
		return Object.values(this.sortState.sorts).some((sort) => {
			const sortBy = normalizeExplorerSortBy(sort?.sortBy ?? '');
			return sortBy === 'mtime' || sortBy === 'ctime';
		});
	}

	/** Whether any cell that goes stale on the wall clock is on screen. */
	private _timeCellVisible(): boolean {
		return (
			this.visibleCells.has('opened') ||
			this.visibleCells.has('mtime') ||
			this.visibleCells.has('ctime')
		);
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
			throw new Error(`${state}${detail}`, { cause: error });
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

	private _tryApplyFilterDelta(delta: FilterProjectionDelta): boolean {
		if (
			!delta.safe ||
			this.renderBatchDepth > 0 ||
			this.viewMode !== 'tree' ||
			this._nestedEnabled() ||
			this._currentFiles.length === 0 ||
			this._lastRenderTree.length === 0 ||
			this._pathLabelActive() ||
			this._activeFolderFilterPaths().length > 0 ||
			!this.treeView ||
			!this._treeRenderOpts ||
			this._lastRenderTree.some(
				(node) => node.meta.isFolder || !node.meta.file,
			)
		) {
			return false;
		}
		return this._applyFilterDeltaProjection(delta);
	}

	private _applyFilterDeltaProjection(delta: FilterProjectionDelta): boolean {
		if (!this.treeView || !this._treeRenderOpts) return false;
		const started = performance.now();
		const displayFiles = this._filesForDisplay();
		const sortedFiles = this._sortFiles(displayFiles);
		const previousNodesByPath = new Map(
			this._lastRenderTree.map((node) => [node.id, node] as const),
		);
		const enteredPaths = new Set(delta.entered);
		const enteredFiles = sortedFiles.filter((file) =>
			enteredPaths.has(file.path),
		);
		const enteredNodes = this.logic.buildFlatFileNodes(enteredFiles, {
			rebaseFolderPaths: [],
			labelMode: 'name',
		});
		const enteredNodesByPath = new Map(
			enteredNodes.map((node) => [node.id, node] as const),
		);
		const nextNodes = reconcileFilterProjectionItems(
			sortedFiles.map((file) => file.path),
			previousNodesByPath,
			enteredNodesByPath,
		);
		if (!nextNodes) return false;
		this._decorateTreeWithQueue(enteredNodes);
		const glyphChoice = normalizeGlyphColorChoice(
			this.plugin.settings.explorerGlyphColor,
		).choice;
		this._decorateTreeWithIcons(enteredNodes);
		if (glyphChoice === 'rainbow' || glyphChoice === 'rainbow-pastel') {
			this._decorateTreeWithIcons(nextNodes);
		}
		this.bubbleIndex = buildBubbleIndex(nextNodes);
		this._bubbleTree = nextNodes;
		this._applyBubbleDots();
		this._rememberStatisticsSortOrder(sortedFiles);

		// Row callbacks close over the full projection's array. Mutating that
		// array preserves correct lookup behavior and retained row identities.
		this._lastRenderTree.splice(
			0,
			this._lastRenderTree.length,
			...nextNodes,
		);
		this._setIndexRoots(this._lastRenderTree, []);
		this._treeRenderOpts = {
			...this._treeRenderOpts,
			nodes: this._lastRenderTree,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			cellRenderOrder: this._activationCellOrder(),
			prepareNode: (node) =>
				this._prepareTreeNode(node as TreeNode<FileMeta>),
		};
		this.treeView.render(this._treeRenderOpts);
		if (this._needsStatisticsWarmup()) this._warmStatisticsCache();
		vaultmanPerfMonitor.record(
			'explorer.files.filter-delta',
			performance.now() - started,
			{
				entered: delta.entered.length,
				exited: delta.exited.length,
				retained: delta.retained.length,
				orderChanged: delta.orderChanged,
				stateOnly: delta.stateOnly,
			},
		);
		return true;
	}

	private _refreshFromFilterService(): void {
		const previousSnapshot = this.filterProjectionSnapshot;
		this.hasSourceProjection = true;
		this._sourceFiles = this._filesForCurrentScope();
		this._currentFiles = this._sourceFiles;
		this._totalCount = this.plugin.app.vault.getFiles().length;
		this._syncSearchTermsFromActiveFilters();
		this._expandSearchMatches();
		const nextSnapshot: FilterProjectionSnapshot = {
			paths: this._sourceFiles.map((file) => file.path),
			stateSignature:
				this.plugin.filterService.getProjectionStateSignature(),
		};
		this.filterProjectionSnapshot = nextSnapshot;
		if (previousSnapshot) {
			const delta = resolveFilterProjectionDelta(
				previousSnapshot,
				nextSnapshot,
			);
			if (this._tryApplyFilterDelta(delta)) return;
		}
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
		const typeFilters = this.nodeTypeFilters.filter((t) => t !== 'folders-only');
		return (
			this.plugin.filterService.activeFilter.children.length > 0 ||
			Boolean(
				this.searchName || this.searchFolder || typeFilters.length > 0,
			)
		);
	}

	private _hasNarrowingConstraintsBeyondFolderScopes(): boolean {
		const typeFilters = this.nodeTypeFilters.filter((t) => t !== 'folders-only');
		return (
			Boolean(
				this.searchName || this.searchFolder || typeFilters.length > 0,
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
