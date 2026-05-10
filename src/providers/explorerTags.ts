import { TagsLogic } from '../logic/logicTags';
import type { TFile } from 'obsidian';
import type { TreeNode, TagMeta, NodeBadge } from '../types/typeNode';
import type { VaultmanPlugin } from '../main';
import type { ExplorerProvider, ExplorerSortTarget, ExplorerViewMode } from '../types/typeExplorer';
import type { MenuCtx } from '../types/typeCtxMenu';
import {
	buildTagAddChange,
	buildTagDeleteChange,
	buildTagRenameChange,
	tagListContains,
} from '../services/serviceTagQueue';
import { createFnRState, startTagRenameHandoff } from '../services/serviceFnR';
import type { FnRRenameHandoff, FnRScope } from '../types/typeFnR';
import {
	operationScopeToFnRScope,
	resolveOperationScopeFiles,
} from '../services/serviceOperationScope';
import { showInputModal } from '../utils/inputModal';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../utils/utilViewLayers';
import { getActivePerfProbe } from '../dev/perfProbe';

export interface ExplorerTagsOptions {
	startRenameHandoff?: (handoff: FnRRenameHandoff) => void;
}

export class explorerTags implements ExplorerProvider<TagMeta> {
	id = 'tags';
	private plugin: VaultmanPlugin;
	private options: ExplorerTagsOptions;
	private logic: TagsLogic;
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private sortTarget: ExplorerSortTarget = 'top';
	private addMode = false;
	private unsubscribeTagsIndex: () => void;

	constructor(plugin: VaultmanPlugin, options: ExplorerTagsOptions = {}) {
		this.plugin = plugin;
		this.options = options;
		this.logic = new TagsLogic(plugin.app);
		this.unsubscribeTagsIndex = this.plugin.tagsIndex.subscribe(() => {
			getActivePerfProbe()?.count('explorerTags.invalidate');
			this.logic.invalidate();
		});
		this.registerActions();
	}

	destroy(): void {
		this.unsubscribeTagsIndex();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'tag.rename',
			nodeTypes: ['tag'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: async (ctx) => {
				const node = ctx.node as TreeNode<TagMeta>;
				await this._renameTag(node.meta.tagPath);
			},
		});

		svc.registerAction({
			id: 'tag.set',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: (ctx) => `Set tag "#${(ctx.node.meta as TagMeta).tagPath}"`,
			icon: 'lucide-plus-circle',
			run: (ctx) => {
				const node = ctx.node as TreeNode<TagMeta>;
				this._setTagOnFiltered(node.meta.tagPath);
			},
		});

		svc.registerAction({
			id: 'tag.bindingNote',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: 'Create / open binding note',
			icon: 'lucide-link',
			run: (ctx) => {
				const node = ctx.node as TreeNode<TagMeta>;
				void this.plugin.nodeBindingService?.bindOrCreate({
					kind: 'tag',
					label: node.meta.tagPath,
					tagPath: node.meta.tagPath,
				});
			},
		});

		svc.registerAction({
			id: 'tag.delete',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: (ctx) => {
				const nodes = this.contextTagNodes(ctx);
				return nodes.length > 1 ? `Delete ${nodes.length} tags` : 'Delete';
			},
			icon: 'lucide-trash-2',
			run: (ctx) => {
				for (const node of this.contextTagNodes(ctx)) this._deleteTag(node.meta.tagPath);
			},
		});
	}

	getTree(): TreeNode<TagMeta>[] {
		const probe = getActivePerfProbe();
		let tree =
			probe?.measure('explorerTags.logicTree', undefined, () => this.logic.getTree()) ??
			this.logic.getTree();
		if (this.searchMode === 'leaf') {
			const collectLeaves = () => this._collectLeaves(tree);
			tree =
				probe?.measure('explorerTags.collectLeaves', { nodes: tree.length }, collectLeaves) ??
				collectLeaves();
		}
		if (this.searchTerm) {
			const filterTree = () => this.logic.filterTree(tree, this.searchTerm);
			tree =
				probe?.measure('explorerTags.filterTree', { nodes: tree.length }, filterTree) ??
				filterTree();
		}
		const sortTree = () => this._applySort(tree);
		tree = probe?.measure('explorerTags.sort', { nodes: tree.length }, sortTree) ?? sortTree();

		const decorateTree = () => this._decorateTree(tree);
		return (
			probe?.measure(
				'explorerTags.decorateTree',
				{ nodes: probe ? countTreeNodes(tree) : 0 },
				decorateTree,
			) ?? decorateTree()
		);
	}

	private _decorateTree(nodes: TreeNode<TagMeta>[], parentDeleted = false): TreeNode<TagMeta>[] {
		const operations = this.plugin.operationsIndex.nodes;
		const activeFilters = this.plugin.activeFiltersIndex.nodes;
		const revisions = {
			tagsRevision: this.plugin.tagsIndex?.revision,
			queueRevision: this.plugin.operationsIndex?.revision,
			filterRevision: this.plugin.activeFiltersIndex?.revision,
		};
		return nodes.map((node) => {
			const meta = node.meta;
			let currentCls = node.cls || '';
			const viewRow = this.plugin.viewService.getModel({
				explorerId: this.id,
				mode: 'tree',
				nodes: [node],
				operations,
				activeFilters,
				revisions,
				getLabel: (item) => item.label,
				getDecorationContext: () => ({
					kind: 'tag',
					highlightQuery: this.searchTerm,
					iconicIcon: this.plugin.iconicService?.getTagIcon(meta.tagPath)?.icon ?? null,
					tagPath: meta.tagPath,
				}),
			}).rows[0];
			const highlights = highlightsFromViewLayers(viewRow.layers);
			if (highlights && !currentCls.includes('vm-search-highlight')) {
				currentCls = `${currentCls} vm-search-highlight`.trim();
			}
			currentCls = withViewStateClasses(currentCls, viewRow.layers, {
				deletedClass: 'is-deleted-tag',
			});
			if (parentDeleted) {
				currentCls = withViewStateClasses(
					currentCls,
					{ state: { deleted: true } },
					{ deletedClass: 'is-deleted-tag' },
				);
			}
			const isEffectivelyDeleted = parentDeleted || viewRow.layers.state?.deleted === true;
			const resolvedChildren = node.children
				? this._decorateTree(node.children, isEffectivelyDeleted)
				: [];

			return {
				...node,
				cls: currentCls,
				icon: viewRow.icon,
				highlights,
				badges: [
					...nodeBadgesFromViewLayers(viewRow.layers, operations),
					...this.quickActionBadges(meta),
				],
				children: resolvedChildren,
			};
		});
	}

	handleNodeClick(node: TreeNode<TagMeta>): void {
		const meta = node.meta;
		if (this.addMode) {
			this._addTag(meta.tagPath);
			return;
		}

		const tagId = `#${meta.tagPath}`;
		if (this.plugin.filterService.hasTagFilter(tagId)) {
			void this.plugin.filterService.removeNodeByTag(tagId);
		} else {
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'has_tag',
				property: '',
				values: [tagId],
			});
		}
	}

	handleNodeSecondaryAction(node: TreeNode<TagMeta>): void {
		const tagId = `#${node.meta.tagPath}`;
		if (this.plugin.openContentSearchHook) {
			this.plugin.openContentSearchHook(tagId);
			return;
		}
		this.plugin.contentIndex?.setQuery(tagId);
	}

	handleContextMenu(
		node: TreeNode<TagMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<TagMeta>[] = [],
	): void {
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'tag', node: node, selectedNodes, surface: 'panel' },
			e,
		);
	}

	getNodeType(_node: TreeNode<TagMeta>): 'tag' {
		return 'tag';
	}

	handleHoverBadge(
		node: TreeNode<TagMeta>,
		kind: string,
		selectedNodes: TreeNode<TagMeta>[] = [],
	): void {
		const nodes = selectedNodes.length > 0 ? selectedNodes : [node];
		if (kind === 'set') {
			for (const candidate of nodes) this._setTagOnFiltered(candidate.meta.tagPath);
			return;
		}
		if (kind === 'delete') {
			for (const candidate of nodes) this._deleteTag(candidate.meta.tagPath);
			return;
		}
		if (kind === 'filter') {
			for (const candidate of nodes) this.handleNodeClick(candidate);
			return;
		}
		if (kind === 'rename') void this._renameTag(node.meta.tagPath);
	}

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
	}

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}
	setSortTarget(target: ExplorerSortTarget): void {
		this.sortTarget = target;
	}

	setViewMode(_mode: ExplorerViewMode): void {}
	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		if (this.sortTarget === 'children') return this._sortDescendants(nodes);
		return this._sortNodeList(nodes);
	}

	private _sortNodeList(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private _sortDescendants(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		return nodes.map((node) => ({
			...node,
			children: node.children ? this._sortDescendants(this._sortNodeList(node.children)) : [],
		}));
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

	private _deleteTag(tagPath: string): void {
		const change = buildTagDeleteChange(tagPath, this.filesWithTag(tagPath));
		if (change) this.plugin.queueService.add(change);
	}

	private async _renameTag(oldTag: string): Promise<void> {
		const files = this.filesWithTag(oldTag);
		if (this.options.startRenameHandoff) {
			const state = startTagRenameHandoff(createFnRState(), {
				tagPath: oldTag,
				files,
				scope: this.fnrScope(),
			});
			this.options.startRenameHandoff(state.rename);
			return;
		}
		const newTag = await showInputModal(this.plugin.app, `Rename tag "#${oldTag}" to:`);
		if (!newTag) return;
		const change = buildTagRenameChange(oldTag, newTag, files);
		if (change) void this.plugin.queueService.add(change);
	}

	private _addTag(tagPath: string): void {
		const change = buildTagAddChange(tagPath, this.operationScopeFiles());
		if (change) void this.plugin.queueService.add(change);
	}

	/**
	 * Phase 7 `set` action: queue a NATIVE_ADD_TAG (`add` action on tag
	 * change) over every operation-scope file. The change builder skips files
	 * that already have the tag via `tagListContains`, so the queued op
	 * is silently a no-op for those entries.
	 */
	private _setTagOnFiltered(tagPath: string): void {
		const change = buildTagAddChange(tagPath, this.operationScopeFiles());
		if (change) void this.plugin.queueService.add(change);
	}

	private quickActionBadges(meta: TagMeta): NodeBadge[] {
		if (!this.addMode) return [];
		return [
			{
				text: 'add',
				icon: 'lucide-plus',
				color: 'green',
				quickAction: true,
				title: `Queue add tag "#${meta.tagPath}"`,
				ariaLabel: `Queue add tag "#${meta.tagPath}"`,
				onClick: () => this._addTag(meta.tagPath),
			},
		];
	}

	private contextTagNodes(ctx: MenuCtx): TreeNode<TagMeta>[] {
		const selected = (ctx.selectedNodes ?? []) as TreeNode<TagMeta>[];
		return selected.length > 0 ? selected : [ctx.node as TreeNode<TagMeta>];
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

	private fnrScope(): FnRScope {
		return operationScopeToFnRScope(this.plugin.settings?.explorerOperationScope);
	}

	private filesWithTag(tagPath: string): TFile[] {
		return this.operationScopeFiles().filter((file) => {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			return tagListContains(fm.tags, tagPath);
		});
	}
}

function countTreeNodes(nodes: TreeNode<TagMeta>[]): number {
	let count = 0;
	const stack = [...nodes];
	while (stack.length > 0) {
		const node = stack.pop()!;
		count += 1;
		if (node.children) stack.push(...node.children);
	}
	return count;
}
