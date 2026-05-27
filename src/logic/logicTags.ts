// src/logic/TagsLogic.ts
import { prepareSimpleSearch, type App } from 'obsidian';
import type { TreeNode, TagMeta } from '../types/typeTree';

export class TagsLogic {
	private app: App;
	private _cache: TreeNode<TagMeta>[] | null = null;
	private _stale = true;

	constructor(app: App) {
		this.app = app;
	}

	/** Mark cache as stale — call when metadataCache 'resolved' fires */
	invalidate(): void {
		this._stale = true;
	}

	/** Returns cached tree, rebuilding only when stale */
	getTree(): TreeNode<TagMeta>[] {
		if (this._stale || !this._cache) {
			this._cache = this._buildTree();
			this._stale = false;
		}
		return this._cache;
	}

	/**
	 * Filter a tree in memory using prepareSimpleSearch.
	 * Returns a new array — does NOT mutate the cache.
	 * A parent node is included if it or any descendant matches.
	 */
	filterTree(nodes: TreeNode<TagMeta>[], term: string): TreeNode<TagMeta>[] {
		if (!term) return nodes;
		const search = prepareSimpleSearch(term);
		return this._filterNodes(nodes, search);
	}

	private _filterNodes(
		nodes: TreeNode<TagMeta>[],
		search: (text: string) => { score: number } | null,
	): TreeNode<TagMeta>[] {
		const result: TreeNode<TagMeta>[] = [];
		for (const node of nodes) {
			const filteredChildren = node.children
				? this._filterNodes(node.children, search)
				: [];
			const selfMatch = !!search(node.label);
			if (selfMatch || filteredChildren.length > 0) {
				result.push({ ...node, children: filteredChildren });
			}
		}
		return result;
	}

	private _buildTree(): TreeNode<TagMeta>[] {
		const rawTags = (
			this.app.metadataCache as unknown as {
				getTags(): Record<string, number>;
			}
		).getTags() ?? {};

		const root: TreeNode<TagMeta>[] = [];
		const nodeMap = new Map<string, TreeNode<TagMeta>>();

		const entries = Object.entries(rawTags).sort(([a], [b]) =>
			a.localeCompare(b),
		);

		for (const [tagWithHash, count] of entries) {
			const fullPath = tagWithHash.replace(/^#/, '');
			const parts = fullPath.split('/');
			let currentPath = '';
			let currentLevel = root;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				currentPath = currentPath ? `${currentPath}/${part}` : part;

				if (!nodeMap.has(currentPath)) {
					const node: TreeNode<TagMeta> = {
						id: currentPath,
						label: part,
						count: i === parts.length - 1 ? count : 0,
						children: [],
						depth: i,
						meta: { tagPath: currentPath },
					};
					nodeMap.set(currentPath, node);
					currentLevel.push(node);
				} else if (i === parts.length - 1) {
					nodeMap.get(currentPath)!.count =
						(nodeMap.get(currentPath)!.count ?? 0) + count;
				}
				currentLevel = nodeMap.get(currentPath)!.children!;
			}
		}
		return root;
	}
}
