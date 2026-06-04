// src/components/TagsExplorerPanel.ts
import { Component, App, Notice, setIcon } from 'obsidian';
import { TagsLogic } from '../../logic/logicTags';
import { FilterService } from '../../services/serviceFilter';
import { IconicService } from '../../services/serviceIcons';
import { ContextMenuService } from '../../services/serviceContextMenu';
import { OperationQueueService } from '../../services/serviceOperationQueue';

export interface PanelPluginCtx {
	app: App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
	queueService: OperationQueueService;
}
import { UnifiedTreeView } from '../layout/viewTree';
import type { TreeNode, TagMeta } from '../../types/typeTree';
import type { MenuCtx } from '../../types/typeCMenu';

export class TagsExplorerPanel extends Component {
	private plugin: PanelPluginCtx;
	private logic: TagsLogic;
	private containerEl: HTMLElement;
	private view: UnifiedTreeView;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';
	private editingId: string | null = null;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private sortChildLevel = false;
	private nodeTypeFilter: string | null = null;
	private viewMode: 'tree' | 'grid' = 'tree';
	private visibleCells = new Set<string>(['icon', 'text', 'count']);

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.plugin = plugin;
		this.logic = new TagsLogic(plugin.app);
		this.containerEl = containerEl;
		this.view = new UnifiedTreeView(containerEl);
	}

	onload(): void {
		// Register context menu actions through the service
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'tag.rename',
			nodeTypes: ['tag'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				this.editingId = ctx.node.id;
				this._render();
			},
		});

		svc.registerAction({
			id: 'tag.delete',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: 'Delete',
			icon: 'lucide-trash-2',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				return this._deleteTag(meta.tagPath);
			},
		});

		svc.registerAction({
			id: 'tag.inline-to-frontmatter',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: 'Send all inline to frontmatter',
			icon: 'lucide-arrow-up-to-line',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as TagMeta;
				return this._sendToFrontmatter(meta.tagPath);
			},
		});

		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		// Re-render after Iconic finishes loading
		this.plugin.iconicService?.onLoaded(() => this._render());

		// Re-render dynamically when filters or queues change
		this.plugin.filterService.on('changed', this._handleStateChange);
		this.plugin.queueService.on('changed', this._handleStateChange);

		this._render();
	}

	onunload(): void {
		this.plugin.filterService.off('changed', this._handleStateChange);
		this.plugin.queueService.off('changed', this._handleStateChange);
		super.onunload();
	}

	private addMode = false;

	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private readonly _handleStateChange = () => this._render();

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
		this._render();
	}

	setSortBy(
		sortBy: string,
		direction: 'asc' | 'desc',
		childLevel = false,
		nodeTypeFilter: string | null = null,
	): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
		this.sortChildLevel = childLevel;
		this.nodeTypeFilter = nodeTypeFilter;
		this._render();
	}

	setViewMode(mode: 'tree' | 'grid'): void {
		this.viewMode = mode;
		if (mode === 'tree') {
			this.containerEl.empty();
			this.view = new UnifiedTreeView(this.containerEl);
		}
		this._render();
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
		this._render();
	}

	private _sortNodes(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		if (this.sortBy === 'date') {
			const mtimeMap = new Map<string, number>();
			for (const node of nodes) {
				const tagPath = node.meta.tagPath;
				let maxMtime = 0;
				for (const file of this.plugin.app.vault.getMarkdownFiles()) {
					const cache = this.plugin.app.metadataCache.getFileCache(file);
					const hasFmTag = (cache?.frontmatter?.tags as unknown[] | undefined)?.some(
						t => String(t).replace(/^#/, '') === tagPath
					);
					const hasInlineTag = cache?.tags?.some(t => t.tag === `#${tagPath}`);
					if ((hasFmTag || hasInlineTag) && file.stat.mtime > maxMtime) {
						maxMtime = file.stat.mtime;
					}
				}
				mtimeMap.set(node.id, maxMtime);
			}
			return [...nodes].sort((a, b) => dir * ((mtimeMap.get(a.id) ?? 0) - (mtimeMap.get(b.id) ?? 0)));
		}
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
			if (this.sortBy === 'sub')   return dir * ((a.children?.length ?? 0) - (b.children?.length ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		if (!this.sortChildLevel) {
			return this._sortNodes(nodes).map((node) => ({
				...node,
				children: node.children ? [...node.children] : [],
			}));
		}

		return nodes.map((node) => ({
			...node,
			children: node.children ? this._sortNodes(node.children) : [],
		}));
	}

	private _expandAll(nodes: TreeNode<TagMeta>[]): void {
		for (const n of nodes) {
			if (n.children && n.children.length > 0) {
				this.expandedIds.add(n.id);
				this._expandAll(n.children);
			}
		}
	}

	private _render(): void {
		let tree = this.logic.getTree();

		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.nodeTypeFilter) {
			tree = this._filterByNodeType(tree, this.nodeTypeFilter);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
			this._expandAll(tree);
		}
		tree = this._applySort(tree);

		if (this.viewMode === 'grid') {
			this._renderGrid(tree);
			return;
		}

		const activeFilterIds = new Set<string>();
		for (const node of this._flattenTree(tree)) {
			if (this.plugin.filterService.hasTagFilter(`#${node.meta.tagPath}`)) {
				activeFilterIds.add(node.id);
			}
		}

		// For highlighting search text specifically on matching nodes
		interface ObsMetadataCache {
			prepareSimpleSearch?(query: string): (text: string) => unknown;
		}
		const cache = this.plugin.app.metadataCache as unknown as ObsMetadataCache;
		const searchFunc: ((text: string) => unknown) | null = this.searchTerm
			? (cache.prepareSimpleSearch ? cache.prepareSimpleSearch(this.searchTerm) : ((text: string) => text.toLowerCase().includes(this.searchTerm.toLowerCase()) ? {} : null))
			: null;

		const highlightIds = new Set<string>();

		// Resolve icons via Iconic
		const nodesWithIcons = this._resolveIcons(tree, highlightIds, searchFunc);

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			visibleCells: this.visibleCells,
			activeFilterIds,
			searchHighlightIds: highlightIds,
			editingId: this.editingId,
			onRename: (id, newLabel) => {
				const node = this._findNode(id, tree);
				if (node) void this._renameTag(node.meta.tagPath, newLabel);
				this.editingId = null;
				void this._render();
			},
			onCancelRename: () => {
				this.editingId = null;
				this._render();
			},
			onToggle: (id: string) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				void this._render();
			},
			onRowClick: (id: string) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;

				// ADD MODE: queue add-tag operation instead of toggling filter
				if (this.addMode) {
					this.plugin.queueService.addOrRun({
						type: 'tag',
						tag: meta.tagPath,
						action: 'add',
						details: `Add tag "#${meta.tagPath}"`,
						files: this.plugin.filterService.filteredFiles,
						customLogic: true,
						logicFunc: (_file, fm) => {
							const raw: unknown = fm.tags;
							const existing: string[] = Array.isArray(raw)
								? (raw as unknown[]).map(v => String(v))
								: (typeof raw === 'string' ? [raw] : []);
							if (existing.includes(meta.tagPath)) return null;
							fm.tags = [...existing, meta.tagPath];
							return fm;
						},
					});
					return;
				}

				this._toggleTagFilter(meta.tagPath);
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType: 'tag', node, surface: 'panel' },
					e,
				);
			},
			onBadgeDoubleClick: (queueIndex: number) => {
				this.plugin.queueService.remove(queueIndex);
				void this._render();
			},
		});
	}

	private _toggleTagFilter(tagPath: string): void {
		const tagId = `#${tagPath}`;
		if (this.plugin.filterService.hasTagFilter(tagId)) {
			void this.plugin.filterService.removeNodeByTag(tagId);
			return;
		}

		void this.plugin.filterService.addNode({
			type: 'rule',
			filterType: 'has_tag',
			property: '',
			values: [tagId],
		});
	}

	private _renderGrid(tree: TreeNode<TagMeta>[]): void {
		this.containerEl.empty();
		const activeFilterIds = new Set<string>();
		const flatNodes = this._flattenTree(tree);
		const grid = this.containerEl.createDiv({ cls: 'vaultman-tags-grid' });

		for (const node of flatNodes) {
			if (this.plugin.filterService.hasTagFilter(`#${node.meta.tagPath}`)) {
				activeFilterIds.add(node.id);
			}

			const card = grid.createDiv({ cls: 'vaultman-tag-card' });
			card.toggleClass('is-active-filter', activeFilterIds.has(node.id));
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', node.meta.tagPath);

			if (this.visibleCells.has('icon')) {
				const iconEl = card.createDiv({ cls: 'vaultman-tag-card-icon' });
				setIcon(
					iconEl,
					this.plugin.iconicService?.getTagIcon(node.meta.tagPath)?.icon ??
						'lucide-tag',
				);
			}
			if (this.visibleCells.has('text')) {
				card.createDiv({ cls: 'vaultman-tag-card-name', text: node.label });
			}
			if (this.visibleCells.has('nested') && node.children?.length) {
				card.createDiv({
					cls: 'vaultman-tag-card-meta',
					text: String(node.children.length),
				});
			}
			if (this.visibleCells.has('count') && node.count) {
				card.createDiv({ cls: 'vaultman-tag-card-count', text: String(node.count) });
			}

			card.addEventListener('click', () => this._toggleTagFilter(node.meta.tagPath));
			card.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					this._toggleTagFilter(node.meta.tagPath);
				}
			});
			card.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType: 'tag', node, surface: 'panel' },
					event,
				);
			});
		}

		if (flatNodes.length === 0) {
			this.containerEl.createDiv({ cls: 'vaultman-empty-state', text: 'No tags' });
		}
	}

	private _resolveIcons(nodes: TreeNode<TagMeta>[], highlightIds: Set<string>, searchFunc: ((text: string) => unknown) | null, parentDeleted = false): TreeNode<TagMeta>[] {
		const queue = this.plugin.queueService.queue;

		return nodes.map(node => {
			const meta = node.meta;
			const currentCls = node.cls || '';

			// Highlight System
			if (searchFunc && searchFunc(node.label)) {
				highlightIds.add(node.id);
			}

			const relevantOps = queue.filter((op): op is import('../../types/typeOps').TagChange =>
				op.type === 'tag' && op.tag === meta.tagPath
			);

			const isDeletedInQueue = relevantOps.some(op => op.action === 'delete');
			const isEffectivelyDeleted = parentDeleted || isDeletedInQueue;

			const cls = isEffectivelyDeleted
				? (currentCls + ' is-deleted-tag').trim()
				: currentCls;

			const resolvedChildren = node.children
				? this._resolveIcons(node.children, highlightIds, searchFunc, isEffectivelyDeleted)
				: [];

			const badges: import('../../types/typeTree').NodeBadge[] = [];
			for (const op of relevantOps) {
				const opIdx = queue.indexOf(op);
				if (op.action === 'delete') {
					badges.push({ text: 'Delete', icon: 'lucide-trash-2', color: 'red', queueIndex: opIdx });
				} else if (op.action === 'rename') {
					badges.push({ text: 'Update', icon: 'lucide-pencil', color: 'blue', queueIndex: opIdx });
				} else if (op.action === 'add') {
					badges.push({ text: 'Add', icon: 'lucide-plus', color: 'green', queueIndex: opIdx });
				} else badges.push({ text: 'In Queue', icon: 'lucide-clock', color: 'purple', queueIndex: opIdx });
			}

			// BUBBLE UP child badges if parent is collapsed
			const isExpanded = this.expandedIds.has(node.id);
			if (!isExpanded && resolvedChildren.length > 0) {
				const childBadges = resolvedChildren.flatMap(c => c.badges || []);
				const seen = new Set<string>();
				for (const b of childBadges) {
					const key = `${b.text}-${b.icon}`;
					if (!seen.has(key)) {
						badges.push({ ...b, isInherited: true });
						seen.add(key);
					}
				}
			}

			return {
				...node,
				cls: cls,
				icon: this.plugin.iconicService?.getTagIcon(meta.tagPath)?.icon ?? 'lucide-tag',
				badges: badges,
				children: resolvedChildren,
			};
		});
	}

	private async _renameTag(tagPath: string, newName: string): Promise<void> {
		if (!newName || newName === tagPath) return;
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'rename',
			details: `Rename tag "#${tagPath}" to "#${newName}"`,
			files: this._getFilesWithTag(tagPath),
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!fm.tags) return null;
				const raw: unknown = fm.tags;
				const tags: string[] = Array.isArray(raw)
					? (raw as unknown[]).map(v => String(v))
					: (typeof raw === 'string' ? [raw] : []);

				const newTags = tags.map((t: string) => {
					const cleanT = t.startsWith('#') ? t.slice(1) : t;
					return (cleanT === tagPath) ? newName : t;
				});
				fm.tags = newTags;
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private async _deleteTag(tagPath: string): Promise<void> {
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'delete',
			details: `Delete tag "#${tagPath}"`,
			files: this._getFilesWithTag(tagPath),
			customLogic: true,
			logicFunc: (_file, fm) => {
				if (!fm.tags) return null;
				const raw: unknown = fm.tags;
				const tags: string[] = Array.isArray(raw)
					? (raw as unknown[]).map(v => String(v))
					: (typeof raw === 'string' ? [raw] : []);
				const filtered = tags.filter((t: string) => t !== tagPath && t !== `#${tagPath}`);
				fm.tags = filtered.length > 0 ? filtered : undefined;
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private async _sendToFrontmatter(tagPath: string): Promise<void> {
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'add',
			details: `Send inline "#${tagPath}" to frontmatter`,
			files: this._getFilesWithInlineTag(tagPath),
			customLogic: true,
			logicFunc: (file, fm) => {
				const cache = this.plugin.app.metadataCache.getFileCache(file);
				const inlineTags = (cache?.tags ?? []).map((t) => t.tag);
				if (inlineTags.some((t: string) => t === `#${tagPath}` || t === tagPath)) {
					const raw: unknown = fm.tags;
					const existing: string[] = Array.isArray(raw)
						? (raw as unknown[]).map(v => String(v))
						: (typeof raw === 'string' ? [raw] : []);
					if (!existing.includes(tagPath)) {
						fm.tags = [...existing, tagPath];
					}
					return fm;
				}
				return null;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	createFromSearch(term: string): void {
		const tagPath = term.trim().replace(/^#/, '').replace(/\s+/g, '-');
		if (!tagPath) {
			this.addMode = true;
			new Notice('Select a tag to stage it');
			return;
		}
		this.plugin.queueService.addOrRun({
			type: 'tag',
			tag: tagPath,
			action: 'add',
			details: `Add tag "#${tagPath}"`,
			files: this.plugin.filterService.filteredFiles,
			customLogic: true,
			logicFunc: (_file, fm) => {
				const raw: unknown = fm.tags;
				const existing: string[] = Array.isArray(raw)
					? (raw as unknown[]).map(v => String(v))
					: (typeof raw === 'string' ? [raw] : []);
				if (existing.includes(tagPath)) return null;
				fm.tags = [...existing, tagPath];
				return fm;
			},
		});
		this.logic.invalidate();
		this._render();
	}

	private _collectLeaves(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const leaves: TreeNode<TagMeta>[] = [];
		const walk = (ns: TreeNode<TagMeta>[]) => {
			for (const n of ns) {
				if (!n.children || n.children.length === 0) leaves.push({ ...n, children: [] });
				else walk(n.children);
			}
		};
		walk(nodes);
		return leaves;
	}

	private _collectNested(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const nested: TreeNode<TagMeta>[] = [];
		for (const node of nodes) {
			if (node.children?.length) {
				nested.push({
					...node,
					children: this._collectNested(node.children),
				});
			}
		}
		return nested;
	}

	private _filterByNodeType(
		nodes: TreeNode<TagMeta>[],
		nodeTypeFilter: string,
	): TreeNode<TagMeta>[] {
		if (nodeTypeFilter === 'simple') return this._collectLeaves(nodes);
		if (nodeTypeFilter === 'nested') return this._collectNested(nodes);
		return nodes;
	}

	private _findNode(id: string, nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	private _flattenTree(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const result: TreeNode<TagMeta>[] = [];
		for (const n of nodes) {
			result.push(n);
			if (n.children) result.push(...this._flattenTree(n.children));
		}
		return result;
	}

	private _getFilesWithTag(tagPath: string): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter((file) => {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fmTags = cache?.frontmatter?.tags as unknown;
			const frontmatterTags = Array.isArray(fmTags)
				? fmTags.map((tag) => String(tag))
				: typeof fmTags === 'string'
					? [fmTags]
					: [];
			const inlineTags = (cache?.tags ?? []).map((tag) => tag.tag);
			return (
				frontmatterTags.some((tag) => tag === tagPath || tag === `#${tagPath}`) ||
				inlineTags.some((tag) => tag === tagPath || tag === `#${tagPath}`)
			);
		});
	}

	private _getFilesWithInlineTag(tagPath: string): import('obsidian').TFile[] {
		return this.plugin.app.vault.getMarkdownFiles().filter((file) => {
			const inlineTags = this.plugin.app.metadataCache.getFileCache(file)?.tags ?? [];
			return inlineTags.some((tag) => tag.tag === tagPath || tag.tag === `#${tagPath}`);
		});
	}
}
