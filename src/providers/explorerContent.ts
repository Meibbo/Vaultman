import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import type { ExplorerProvider } from '../types/typeExplorer';
import type { MenuCtx } from '../types/typeCtxMenu';
import type { ContentMeta, TreeNode } from '../types/typeNode';
import type { ContentMatch } from '../types/typeContracts';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
} from '../types/typeExplorerDataPlane';
import { buildFileDeleteChange } from '../services/serviceFileQueue';
import { buildExplorerSnapshot } from '../logic/logicExplorerSnapshot';
import { withViewStateClasses } from '../utils/utilViewLayers';
import { resolveIcon } from '../logic/logicIconResolver';

export class explorerContent implements ExplorerProvider<ContentMeta> {
	id = 'content';
	private plugin: VaultmanPlugin;

	constructor(plugin: VaultmanPlugin) {
		this.plugin = plugin;
		this.registerActions();
	}

	private registerActions(): void {
		this.plugin.contextMenuService?.registerAction?.({
			id: 'content.delete',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: 'Delete',
			icon: 'lucide-trash',
			when: (ctx: MenuCtx) => this.isContentNode(ctx.node as TreeNode<ContentMeta>),
			run: (ctx: MenuCtx) => {
				this.deleteFiles(this.contextFiles(ctx));
			},
		});
	}

	getTree(): TreeNode<ContentMeta>[] {
		const grouped = new Map<string, ContentMatch[]>();
		for (const match of this.plugin.contentIndex.nodes) {
			const list = grouped.get(match.filePath) ?? [];
			list.push(match);
			grouped.set(match.filePath, list);
		}

		const operations = this.plugin.operationsIndex.nodes;
		const activeFilters = this.plugin.activeFiltersIndex.nodes;
		const revisions = {
			contentRevision: this.plugin.contentIndex?.revision,
			queueRevision: this.plugin.operationsIndex?.revision,
			filterRevision: this.plugin.activeFiltersIndex?.revision,
		};

		return [...grouped.entries()].map(([filePath, matches]) => {
			const file = this.resolveFile(filePath);
			const node: TreeNode<ContentMeta> = {
				id: `content:file:${filePath}`,
				label: filePath,
				icon: 'lucide-file-text',
				count: matches.length,
				depth: 0,
				meta: {
					kind: 'file',
					filePath,
					file,
				},
				children: matches.map((match) => this.matchNode(match, file)),
			};

			// Group node decoration
			const viewRow = this.plugin.viewService.getModel({
				explorerId: 'content',
				mode: 'tree',
				nodes: [node],
				operations,
				activeFilters,
				revisions,
				getLabel: (item) => item.label,
				getDecorationContext: () => ({
					kind: 'file',
					filePath,
					basename: file?.basename,
				}),
			}).rows[0];

			node.icon = viewRow.icon;
			node.cls = withViewStateClasses(node.cls, viewRow.layers);

			return node;
		});
	}

	getFiles(): TFile[] {
		const files = new Map<string, TFile>();
		for (const match of this.plugin.contentIndex.nodes) {
			const file = this.resolveFile(match.filePath);
			if (file) files.set(file.path, file);
		}
		return [...files.values()];
	}

	/**
	 * Bare structural tree (group + match nodes) without view-state decoration.
	 * The decorated tree lives in {@link getTree}; the data-plane snapshot owns
	 * only structure (EDP-004 contract).
	 */
	private buildStructuralTree(): TreeNode<ContentMeta>[] {
		const grouped = new Map<string, ContentMatch[]>();
		for (const match of this.plugin.contentIndex.nodes) {
			const list = grouped.get(match.filePath) ?? [];
			list.push(match);
			grouped.set(match.filePath, list);
		}

		return [...grouped.entries()].map(([filePath, matches]) => {
			const file = this.resolveFile(filePath);
			return {
				id: `content:file:${filePath}`,
				label: filePath,
				icon: 'lucide-file-text',
				count: matches.length,
				depth: 0,
				meta: {
					kind: 'file',
					filePath,
					file,
				},
				children: matches.map((match) => this.matchNode(match, file)),
			} satisfies TreeNode<ContentMeta>;
		});
	}

	getStructuralTree(): TreeNode<ContentMeta>[] {
		return this.buildStructuralTree();
	}

	getStructuralRevisions(): ExplorerDataPlaneRevisions {
		// Only the structural content index revision belongs here. Queue/filter
		// (operations/activeFilters) revisions are reserved (EDP-004) and stay in
		// the decoration path in getTree(), never in the structural snapshot.
		return {
			contentRevision: this.plugin.contentIndex?.revision ?? 0,
		};
	}

	getSnapshot(expandedIds: ReadonlySet<string> = new Set()): ExplorerSnapshot<ContentMeta> {
		return buildExplorerSnapshot({
			explorerId: this.id,
			providerKey: this.id,
			tree: this.getStructuralTree(),
			expandedIds,
			revisions: this.getStructuralRevisions(),
			projection: {
				searchTerm: '',
				searchMode: 'all',
				sortBy: 'name',
				sortDirection: 'asc',
				sortTarget: 'top',
			},
			kindFor: ({ node }) => (node.meta.kind === 'file' ? 'file' : 'unknown'),
			// Only the file-group node is a stable reveal/domain target. Match
			// children share the same filePath, so they carry no path/domainKey to
			// keep the snapshot's pathToId/domainKeyToId maps file-unique.
			pathFor: ({ node }) => (node.meta.kind === 'file' ? node.meta.filePath : undefined),
			domainKeyFor: ({ node }) => (node.meta.kind === 'file' ? node.meta.filePath : undefined),
		});
	}

	subscribe(cb: () => void): () => void {
		return this.plugin.contentIndex.subscribe(cb);
	}

	handleNodeClick(node: TreeNode<ContentMeta>): void {
		const file = node.meta.file ?? this.resolveFile(node.meta.filePath);
		if (!file) return;
		const workspace = this.plugin.app.workspace as typeof this.plugin.app.workspace & {
			openLinkText?: (linktext: string, sourcePath: string, newLeaf?: boolean) => unknown;
		};
		void workspace.openLinkText?.(file.path, '', false);
	}

	handleNodeSecondaryAction(node: TreeNode<ContentMeta>): void {
		this.handleNodeClick(node);
	}

	handleContextMenu(
		node: TreeNode<ContentMeta>,
		e: MouseEvent,
		selectedNodes: TreeNode<ContentMeta>[] = [],
	): void {
		const file = node.meta.file ?? this.resolveFile(node.meta.filePath);
		if (!file) return;
		this.plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'file',
				node,
				selectedNodes,
				surface: 'panel',
				file,
			},
			e,
		);
	}

	getNodeType(): MenuCtx['nodeType'] {
		return 'file';
	}

	handleHoverBadge(
		node: TreeNode<ContentMeta>,
		kind: string,
		selectedNodes: TreeNode<ContentMeta>[] = [],
	): void {
		if (kind !== 'delete') return;
		this.deleteFiles(this.filesForNodes(selectedNodes.length > 0 ? selectedNodes : [node]));
	}

	setSearchTerm(term: string): void {
		this.plugin.contentIndex.setQuery(term);
	}

	private matchNode(match: ContentMatch, file: TFile | null): TreeNode<ContentMeta> {
		const labelPrefix = `${match.line + 1}: `;
		const label = `${match.before}${match.match}${match.after}`;
		const highlightStart = match.before.length;
		return {
			id: `content:match:${match.id}`,
			label,
			labelPrefix,
			icon: resolveIcon({ kind: 'match' }).iconId,
			depth: 1,
			meta: {
				kind: 'match',
				filePath: match.filePath,
				file,
				line: match.line,
				before: match.before,
				match: match.match,
				after: match.after,
			},
			highlights: [{ start: highlightStart, end: highlightStart + match.match.length }],
		};
	}

	private resolveFile(path: string): TFile | null {
		return this.plugin.app.vault.getFileByPath(path);
	}

	private contextFiles(ctx: MenuCtx): TFile[] {
		const selected = (ctx.selectedNodes ?? []) as TreeNode<ContentMeta>[];
		const nodes = selected.length > 0 ? selected : [ctx.node as TreeNode<ContentMeta>];
		return this.filesForNodes(nodes);
	}

	private filesForNodes(nodes: TreeNode<ContentMeta>[]): TFile[] {
		const files = new Map<string, TFile>();
		for (const node of nodes) {
			if (!this.isContentNode(node)) continue;
			const file = node.meta.file ?? this.resolveFile(node.meta.filePath);
			if (file) files.set(file.path, file);
		}
		return [...files.values()];
	}

	private deleteFiles(files: TFile[]): void {
		for (const file of files) {
			void this.plugin.queueService.add(buildFileDeleteChange(file));
		}
	}

	private isContentNode(node: TreeNode<ContentMeta> | undefined): boolean {
		return typeof node?.id === 'string' && node.id.startsWith('content:');
	}
}
