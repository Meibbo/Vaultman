/**
 * logicTags — PURE tags-domain logic (Q4 lane A, slice 3).
 *
 * Hierarchical tag-tree construction + name filtering for the Tags explorer.
 * ZERO `obsidian`, DOM, or Svelte imports (spec AC#1). The `metadataCache.getTags()`
 * read lives in the provider, which passes the resulting `Record<rawTag, count>`
 * (`#`-prefixed keys, as Obsidian reports them) into `buildTagTree`.
 *
 * Namespaced ids (D6): tag nodes -> `tag.<tagPath>`. The RAW tag path (slash
 * hierarchy, no leading `#`) is preserved in `meta.tagPath` and re-derived as the
 * snapshot `domainKey` (`#<tagPath>`), so the `has_tag` filter toggle and reveal
 * keep keying off the raw, un-namespaced tag. Nodes emit `relation: 'holarchy'`.
 *
 * Nested/Simple projection lives in `logicExplorerHierarchy.projectNestedSimple`
 * (SDF-008 corrected semantics); this module only builds the full nested tree.
 */
import type { NodeRelationKind, TreeNode } from '../types/typeTreeNode';

/** Structural meta carried by tag nodes (compatible with `TagMeta`). */
export interface TagNodeMeta {
	/** Raw, un-namespaced tag path (slash hierarchy, no leading `#`). */
	tagPath: string;
}

const HOLARCHY: NodeRelationKind = 'holarchy';
export const TAG_ID_PREFIX = 'tag.';

/** Namespaced node id (D6) from a raw tag path. */
export function tagNodeId(tagPath: string): string {
	return `${TAG_ID_PREFIX}${tagPath}`;
}

/** Raw (un-namespaced) domain key the snapshot/filter toggle keys off. */
export function tagDomainKey(meta: TagNodeMeta): string {
	return `#${meta.tagPath}`;
}

/**
 * Build the nested tag tree from raw `getTags()` counts.
 *
 * - Keys are `#`-prefixed as Obsidian reports them; the leading `#` is stripped
 *   and the remainder split on `/` to form the hierarchy.
 * - A node's `count` is the leaf count for the exact tag path (0 for an
 *   intermediate-only path). When a parent tag is ALSO written explicitly, its
 *   own count is added (mirrors the legacy `TagsLogic` semantics).
 * - Entries are processed in `localeCompare` order so sibling creation order is
 *   deterministic (the provider's sort runs afterward).
 * - Every node carries the raw path in `meta.tagPath`, a namespaced `tag.<path>`
 *   id, and `relation: 'holarchy'`. Does not mutate input.
 */
export function buildTagTree(rawTagCounts: Record<string, number>): TreeNode<TagNodeMeta>[] {
	const root: TreeNode<TagNodeMeta>[] = [];
	const nodeMap = new Map<string, TreeNode<TagNodeMeta>>();

	const entries = Object.entries(rawTagCounts ?? {}).sort(([a], [b]) => a.localeCompare(b));

	for (const [tagWithHash, count] of entries) {
		const fullPath = tagWithHash.replace(/^#/, '');
		const parts = fullPath.split('/');
		let currentPath = '';
		let currentLevel = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isLeaf = i === parts.length - 1;

			let node = nodeMap.get(currentPath);
			if (!node) {
				node = {
					id: tagNodeId(currentPath),
					label: part,
					count: isLeaf ? count : 0,
					children: [],
					depth: i,
					relation: HOLARCHY,
					meta: { tagPath: currentPath },
				};
				nodeMap.set(currentPath, node);
				currentLevel.push(node);
			} else if (isLeaf) {
				node.count = (node.count ?? 0) + count;
			}
			currentLevel = node.children!;
		}
	}

	return root;
}

/**
 * Pure name filter. A node is kept when its own label matches (case-insensitive
 * substring) OR any descendant matches; matched parents keep only their matching
 * descendants. Returns the original reference when `term` is empty. Does not
 * mutate input.
 */
export function filterTagTree(
	nodes: readonly TreeNode<TagNodeMeta>[],
	term: string,
): TreeNode<TagNodeMeta>[] {
	if (!term) return nodes as TreeNode<TagNodeMeta>[];
	const needle = term.toLowerCase();
	return filterNodes(nodes, needle);
}

function filterNodes(
	nodes: readonly TreeNode<TagNodeMeta>[],
	needle: string,
): TreeNode<TagNodeMeta>[] {
	const result: TreeNode<TagNodeMeta>[] = [];
	for (const node of nodes) {
		const filteredChildren = node.children ? filterNodes(node.children, needle) : [];
		const selfMatch = node.label.toLowerCase().includes(needle);
		if (selfMatch || filteredChildren.length > 0) {
			result.push({ ...node, children: filteredChildren });
		}
	}
	return result;
}
