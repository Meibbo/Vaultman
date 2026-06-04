// src/components/FilesExplorerPanel.ts
import { Component, type TFile } from 'obsidian';
import type { VaultmanPlugin } from "../../main";
import { FilesLogic } from '../../logic/logicsFiles';
import { GridView } from '../layout/viewGrid';
import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, FileMeta } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';

export type FilesViewMode = 'grid' | 'tree';

export class FilesExplorerPanel extends Component {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private logic: FilesLogic;
	private gridView: GridView | null = null;
	private treeView: UnifiedTreeView | null = null;
	private expandedIds = new Set<string>();
	private viewMode: FilesViewMode = 'tree';
	private _currentFiles: TFile[] = [];
	private _totalCount = 0;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private visibleCells = new Set<string>(['icon', 'name', 'count', 'path']);

	private onSelectionChange?: (count: number) => void;

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin, onSelectionChange?: (count: number) => void) {
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
					(change) => this.plugin.queueService.add(change),
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
				return this.plugin.app.fileManager.trashFile(meta.file);
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
					(change) => this.plugin.queueService.add(change),
				).open();
			},
		});

		this._mountView();
		this._render();
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

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
		if (this.viewMode === 'grid' && this.gridView) {
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name', count: 'props', date: 'date', columns: 'name',
			};
			this.gridView.setSortColumn(COL_MAP[sortBy] ?? 'name', direction);
		}
		this._render();
	}

	render(filteredFiles: TFile[], totalCount: number): void {
		this._currentFiles = filteredFiles;
		this._totalCount = totalCount;
		this._render();
	}

	setSearchFilter(name: string, folder: string): void {
		const base = this.plugin.filterService.filteredFiles;
		const total = this.plugin.propertyIndex.fileCount;
		this._currentFiles = this.logic.filterFlat(base, name, folder);
		this._totalCount = total;
		this._render();
	}

	private _mountView(): void {
		this.containerEl.empty();
		this.gridView = null;
		this.treeView = null;
		if (this.viewMode === 'grid') {
			this.gridView = new GridView(this.containerEl, this.plugin.app, {
				onContextMenu: (file: TFile, e: MouseEvent) => {
					const syntheticNode = { id: file.path, label: file.name, meta: { file, isFolder: false } as FileMeta, icon: '', depth: 0 };
					this.plugin.contextMenuService.openPanelMenu(
						{ nodeType: 'file', node: syntheticNode, surface: 'panel', file },
						e,
					);
				},
				onSelectionChange: (selected: Set<string>) => {
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile) => {
					if (this.addMode) {
						const selected = this.getSelectedFiles();
						const targets = selected.length > 0 ? (selected.includes(file) ? selected : [...selected, file]) : [file];
						new PropertyManagerModal(
							this.plugin.app,
							this.plugin.propertyIndex,
							targets,
							(change) => this.plugin.queueService.add(change),
						).open();
						return;
					}
					void this.plugin.app.workspace.openLinkText(file.path, '', false);
				},
			});
			this.gridView.setVisibleCells(this.visibleCells);
			// Sync current sort state to grid on mount
			const COL_MAP: Record<string, import('../layout/viewGrid').SortColumn> = {
				name: 'name', count: 'props', date: 'date', columns: 'name',
			};
			this.gridView.setSortColumn(COL_MAP[this.sortBy] ?? 'name', this.sortDir);
		} else {
			this.treeView = new UnifiedTreeView(this.containerEl);
		}
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...files].sort((a, b) => {
			if (this.sortBy === 'date') return dir * (b.stat.mtime - a.stat.mtime);
			if (this.sortBy === 'count') {
				const aC = Object.keys(this.plugin.app.metadataCache.getFileCache(a)?.frontmatter ?? {}).filter(k => k !== 'position').length;
				const bC = Object.keys(this.plugin.app.metadataCache.getFileCache(b)?.frontmatter ?? {}).filter(k => k !== 'position').length;
				return dir * (aC - bC);
			}
			return dir * a.basename.localeCompare(b.basename);
		});
	}

	private _render(): void {
		if (this.viewMode === 'grid' && this.gridView) {
			// Grid owns sorting — pass unsorted; sort state synced via setSortColumn
			this.gridView.render(this._currentFiles, this._totalCount);
		} else if (this.viewMode === 'tree' && this.treeView) {
			const tree = this.logic.buildFileTree(this._sortFiles(this._currentFiles));
			const applyFolderIcons = (nodes: TreeNode<FileMeta>[], expanded: Set<string>): void => {
				for (const n of nodes) {
					if (n.meta.isFolder) {
						n.icon = expanded.has(n.id) ? 'lucide-folder-open' : 'lucide-folder';
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
					this._render();
				},
				onRowClick: (id: string) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta;
					if (!meta.isFolder && meta.file) {
						if (this.addMode) {
							new PropertyManagerModal(
								this.plugin.app,
								this.plugin.propertyIndex,
								[meta.file],
								(change) => this.plugin.queueService.add(change),
							).open();
							return;
						}
						void this.plugin.app.workspace.openLinkText(meta.file.path, '', false);
					}
				},
				onContextMenu: (id: string, e: MouseEvent) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta;
					if (meta.isFolder || !meta.file) return;
					this.plugin.contextMenuService.openPanelMenu(
						{ nodeType: 'file', node, surface: 'panel', file: meta.file },
						e,
					);
				},
			});
		}
	}

	private _findNode(id: string, nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta> | null {
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
}
