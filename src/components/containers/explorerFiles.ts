// src/components/FilesExplorerPanel.ts
import { Component, Notice, type TFile, type TFolder } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { FilesLogic } from '../../logic/logicsFiles';
import { GridView } from '../layout/viewGrid';
import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, FileMeta, NodeBadge } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';
import type { FilterNode } from '../../types/typeFilter';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import { DELETE_FILE } from '../../types/typeOps';
import { translate } from '../../i18n/index';
import { showInputModal } from '../../utils/inputModal';

export type FilesViewMode = 'grid' | 'tree';

export class FilesExplorerPanel extends Component {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private logic: FilesLogic;
	private gridView: GridView | null = null;
	private treeView: UnifiedTreeView | null = null;
	private expandedIds = new Set<string>();
	private viewMode: FilesViewMode = 'tree';
	private _sourceFiles: TFile[] = [];
	private _currentFiles: TFile[] = [];
	private _totalCount = 0;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private visibleCells = new Set<string>(['name', 'ext', 'path']);
	private searchName = '';
	private searchFolder = '';
	private refreshTimer: number | null = null;
	private activeRevealPath: string | null = null;
	private sparseAutoExpandSignature = '';

	private onSelectionChange?: (count: number) => void;
	private onExpansionChange?: () => void;

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
			label: 'Move file',
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
				await this.plugin.app.fileManager.renameFile(folder, newPath);
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
				await this.plugin.app.fileManager.renameFile(folder, newPath);
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
				await this.plugin.app.fileManager.trashFile(folder);
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

		this._mountView();
		this._syncActiveFilePath();
		this._render();
	}

	onunload(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
		this.treeView?.destroy();
		super.onunload();
	}

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	setViewMode(mode: FilesViewMode): void {
		this.viewMode = mode;
		this._mountView();
		this._render();
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
		this.gridView?.setVisibleCells(this.visibleCells);
		this._render();
	}

	hasExpandedNodes(): boolean {
		return this.expandedIds.size > 0;
	}

	setExpansionChangeHandler(handler?: () => void): void {
		this.onExpansionChange = handler;
	}

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
		if (this.viewMode === 'grid' && this.gridView) {
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				ext: 'ext',
				date: 'date',
				path: 'path',
			};
			this.gridView.setSortColumn(COL_MAP[sortBy] ?? 'name', direction);
		}
		this._render();
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
		const tree = this.logic.buildFileTree(
			this._sortFiles(this._currentFiles),
			this._foldersForCurrentView(),
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
		this.treeView?.destroy();
		this.containerEl.empty();
		this.gridView = null;
		this.treeView = null;
		if (this.viewMode === 'grid') {
			this.gridView = new GridView(this.containerEl, this.plugin.app, {
				onContextMenu: (file: TFile, e: MouseEvent) => {
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
						{ nodeType: 'file', node: syntheticNode, surface: 'panel', file },
						e,
					);
				},
				onSelectionChange: (selected: Set<string>) => {
					this.plugin.filterService.setSelectedFiles(
						this.gridView?.getSelectedFiles() ?? [],
					);
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile) => {
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
				},
			});
			this.gridView.setVisibleCells(this.visibleCells);
			this.gridView.setActivePath(this.activeRevealPath);
			// Sync current sort state to grid on mount
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name',
				count: 'props',
				ext: 'ext',
				date: 'date',
				path: 'path',
			};
			this.gridView.setSortColumn(COL_MAP[this.sortBy] ?? 'name', this.sortDir);
		} else {
			this.treeView = new UnifiedTreeView(this.containerEl);
		}
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...files].sort((a, b) => {
			if (this.sortBy === 'path') return dir * a.path.localeCompare(b.path);
			if (this.sortBy === 'ext')
				return dir * a.extension.localeCompare(b.extension);
			if (this.sortBy === 'date') return dir * (b.stat.mtime - a.stat.mtime);
			if (this.sortBy === 'count') {
				const aC = Object.keys(
					this.plugin.app.metadataCache.getFileCache(a)?.frontmatter ?? {},
				).filter((k) => k !== 'position').length;
				const bC = Object.keys(
					this.plugin.app.metadataCache.getFileCache(b)?.frontmatter ?? {},
				).filter((k) => k !== 'position').length;
				return dir * (aC - bC);
			}
			return dir * a.basename.localeCompare(b.basename);
		});
	}

	private _render(): void {
		if (this._shouldShowEmptyFilteredState()) {
			this._renderEmptyFilteredState();
			return;
		}
		if (this.viewMode === 'grid' && this.gridView) {
			// Grid owns sorting — pass unsorted; sort state synced via setSortColumn
			this.gridView.setActivePath(this.activeRevealPath);
			this.gridView.render(this._currentFiles, this._totalCount);
		} else if (this.viewMode === 'tree' && this.treeView) {
			const tree = this.logic.buildFileTree(
				this._sortFiles(this._currentFiles),
				this._foldersForCurrentView(),
			);
			this._autoExpandSparseTopLevel(tree);
			this._decorateTreeWithQueue(tree);
			this._decorateTreeWithActiveReveal(tree);
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
			applyFolderIcons(tree, this.expandedIds);
			this.treeView.render({
				nodes: tree,
				expandedIds: this.expandedIds,
				visibleCells: this.visibleCells,
				onToggle: (id: string) => {
					if (this.expandedIds.has(id)) this.expandedIds.delete(id);
					else this.expandedIds.add(id);
					this._notifyExpansionChanged();
					this._render();
				},
				onRowClick: (id: string) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
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
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder) {
						this.plugin.contextMenuService.openPanelMenu(
							{ nodeType: 'folder', node, surface: 'panel' },
							e,
						);
						return;
					}
					if (!meta.file) return;
					this.plugin.contextMenuService.openPanelMenu(
						{ nodeType: 'file', node, surface: 'panel', file: meta.file },
						e,
					);
				},
				onBadgeDoubleClick: (queueIndex: number) => {
					this.plugin.queueService.remove(queueIndex);
					this._render();
				},
			});
		}
	}

	private _folderFromCtx(ctx: MenuCtx): TFolder | null {
		const meta = ctx.node.meta as Partial<FileMeta> | undefined;
		return meta?.folder ?? null;
	}

	private _notifyExpansionChanged(): void {
		this.onExpansionChange?.();
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
		return this.gridView?.getSelectedFiles() ?? [];
	}

	private _shouldShowEmptyFilteredState(): boolean {
		return (
			this.plugin.filterService.activeFilter.children.length > 0 &&
			this._currentFiles.length === 0
		);
	}

	private _renderEmptyFilteredState(): void {
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
		return this.plugin.filterService.filteredVaultFiles;
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
		if (this._hasActiveConstraints()) return [];
		if (this.searchName && !this.searchFolder) return [];
		if (!this.searchFolder) return folders;
		const term = this.searchFolder.toLowerCase();
		return folders.filter((folder) => folder.path.toLowerCase().includes(term));
	}

	private _hasActiveConstraints(): boolean {
		return (
			this.plugin.filterService.activeFilter.children.length > 0 ||
			Boolean(this.searchName || this.searchFolder)
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

	private _safeName(term: string, fallback: string): string {
		const cleaned = term
			.trim()
			.replace(/[\\/#^[\]|?*:<>"]/g, '-')
			.replace(/\s+/g, ' ')
			.slice(0, 80);
		return cleaned || fallback;
	}

	private _uniquePath(path: string): string {
		const dot = path.endsWith('.md') ? '.md' : '';
		const base = dot ? path.slice(0, -dot.length) : path;
		let candidate = path;
		let counter = 1;
		while (this.plugin.app.vault.getAbstractFileByPath(candidate)) {
			candidate = `${base} ${counter}${dot}`;
			counter += 1;
		}
		return candidate;
	}
}
