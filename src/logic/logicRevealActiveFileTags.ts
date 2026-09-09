import type { TagMeta, TreeNode } from '../types/typeTree';
import {
	tagOccurrences,
	type TagCacheLike,
	type TagSource,
} from './logicTagSource';

/**
 * `reveal this file` for the Tags explorer: the note's own tags, projected over
 * the index the explorer already built.
 *
 * The same contract the Props reveal signed (`logicRevealActiveFileProps`): a
 * filter over the snapshot, never a second index. Reverting the toggle costs
 * nothing because nothing was torn down, and a tag the vault already knows
 * keeps its node — id, icon, color and badges included.
 *
 * What it does NOT take from the snapshot is order. A note writes its tags in
 * an order, and that order is the answer to "which tag did I put on this note
 * first" — the reason the note-order option exists. Frontmatter is read
 * before the body because the block physically comes first.
 */

/**
 * Entry points that would rebuild the vault-wide index. Named so the guard
 * fails loudly if one is ever added to the toggle path, rather than silently
 * turning a filter into a scan.
 */
export const TAG_REVEAL_FORBIDDEN_REBUILD_SYMBOLS: readonly string[] = [
	'_buildTree',
	'getMarkdownFiles',
	'logic.invalidate',
];

/**
 * The note's tags as flat nodes, in the note's order.
 *
 * Flat on purpose: a revealed note holds whole tag paths, not a hierarchy.
 * Projecting `parent` as a row because the note wrote `#parent/child` would
 * claim an occurrence the note does not have, so the label carries the full
 * path and the row has no children.
 *
 * `cache` is `null` when there is no such note. That and a note with no tags
 * both produce the canonical empty state rather than falling back to the
 * vault-wide set: showing tags the note does not carry, while claiming to show
 * the note, is worse than showing nothing.
 */
export function projectActiveFileTags(
	snapshot: readonly TreeNode<TagMeta>[],
	cache: TagCacheLike | null,
): TreeNode<TagMeta>[] {
	if (!cache) return [];

	const byPath = new Map<string, TreeNode<TagMeta>>();
	const index = (nodes: readonly TreeNode<TagMeta>[]): void => {
		for (const node of nodes) {
			byPath.set(node.meta.tagPath, node);
			if (node.children?.length) index(node.children);
		}
	};
	index(snapshot);

	const nodes: TreeNode<TagMeta>[] = [];
	const seen = new Map<string, TreeNode<TagMeta>>();

	for (const occurrence of tagOccurrences(cache)) {
		const existing = seen.get(occurrence.tagPath);
		if (existing) {
			// The same tag twice in one note is one row with a count of two —
			// the count is this note's occurrences, not the vault's.
			existing.count = (existing.count ?? 0) + 1;
			(existing.meta.tagSources as Set<TagSource>).add(occurrence.source);
			continue;
		}

		const source = byPath.get(occurrence.tagPath);
		const node: TreeNode<TagMeta> = {
			// A tag the index has not seen yet is projected rather than dropped:
			// the cache can lag a just-typed tag, and hiding it would make the
			// note look like it does not carry what the user just wrote.
			...(source ?? {
				id: occurrence.tagPath,
				icon: 'lucide-tag',
				coreCls: 'tree-item-self tag-pane-tag is-clickable',
			}),
			label: occurrence.tagPath,
			count: 1,
			depth: 0,
			showCaret: false,
			children: [],
			// The sources are this note's, so the `type` cell answers for the
			// note rather than repeating what the rest of the vault does.
			meta: {
				tagPath: occurrence.tagPath,
				tagSources: new Set<TagSource>([occurrence.source]),
			},
		};
		seen.set(occurrence.tagPath, node);
		nodes.push(node);
	}

	return nodes;
}

/**
 * Nest a reveal projection the way the vault-wide index nests its own tree
 * (`TagsLogic._buildTree`): leaf-segment labels, depth per level, structural
 * parents with zero own occurrences.
 *
 * The projection is flat on purpose — a note holds whole tag paths, not a
 * hierarchy — so with `nested` off it renders as is. With `nested` on,
 * leaving it flat showed the same plane for on and off, which is the defect.
 * Grouping here (rather than in the explorer) keeps the note order for roots
 * and the snapshot's identity for parents the index already knows.
 *
 * A structural parent claims no occurrence of its own: its count is the sum
 * of the note-occurrences below it and its sources their union, so the type
 * cell and the source filter answer for the subtree, not for the vault.
 */
export function nestProjectedTagNodes(
	projected: readonly TreeNode<TagMeta>[],
	snapshot: readonly TreeNode<TagMeta>[],
): TreeNode<TagMeta>[] {
	const byPath = new Map<string, TreeNode<TagMeta>>();
	const index = (nodes: readonly TreeNode<TagMeta>[]): void => {
		for (const node of nodes) {
			byPath.set(node.meta.tagPath, node);
			if (node.children?.length) index(node.children);
		}
	};
	index(snapshot);

	const roots: TreeNode<TagMeta>[] = [];
	const placed = new Map<string, TreeNode<TagMeta>>();
	// Paths the note writes itself (as opposed to structural parents the
	// nesting invents): their own occurrences survive the rollup below.
	const written = new Set<TreeNode<TagMeta>>();

	const parentFor = (prefix: string, depth: number): TreeNode<TagMeta> => {
		const known = placed.get(prefix);
		if (known) {
			// A written leaf met through its descendants: it parents now, so
			// it must offer the caret whatever the projection said.
			known.showCaret = true;
			return known;
		}
		const segment = prefix.split('/').at(-1) ?? prefix;
		const source = byPath.get(prefix);
		const node: TreeNode<TagMeta> = {
			...(source ?? {
				id: prefix,
				icon: 'lucide-tag',
				coreCls: 'tree-item-self tag-pane-tag is-clickable',
			}),
			id: prefix,
			label: segment,
			count: 0,
			depth,
			showCaret: true,
			children: [],
			meta: {
				tagPath: prefix,
				tagSources: new Set<TagSource>(),
			},
		};
		placed.set(prefix, node);
		if (depth === 0) roots.push(node);
		else
			parentFor(
				prefix.split('/').slice(0, -1).join('/'),
				depth - 1,
			).children!.push(node);
		return node;
	};

	for (const flat of projected) {
		const segments = flat.meta.tagPath.split('/').filter(Boolean);
		if (segments.length === 0) continue;
		const fullPath = segments.join('/');
		const prev = placed.get(fullPath);
		if (prev?.children?.length) {
			// Written tag that already parents projected descendants (the
			// note carries `#a` and `#a/b`): keep the children, fold the own
			// occurrences and sources in, and let the rollup add the rest.
			prev.label = segments.at(-1) ?? prev.label;
			prev.depth = segments.length - 1;
			prev.showCaret = true;
			prev.count = (prev.count ?? 0) + (flat.count ?? 0);
			for (const source of flat.meta.tagSources ?? []) {
				(prev.meta.tagSources as Set<TagSource> | undefined)?.add(source);
			}
			written.add(prev);
			continue;
		}
		const leaf: TreeNode<TagMeta> = {
			...flat,
			label: segments.at(-1) ?? flat.label,
			depth: segments.length - 1,
			showCaret: false,
			children: [],
		};
		placed.set(fullPath, leaf);
		written.add(leaf);
		if (segments.length === 1) roots.push(leaf);
		else {
			parentFor(
				segments.slice(0, -1).join('/'),
				segments.length - 2,
			).children!.push(leaf);
		}
	}

	// Bottom-up: a structural parent sums the note-occurrences below it and
	// unions their sources, so counts and the type cell stay note-local. A
	// written parent keeps its own occurrences on top of the children's.
	const rollup = (node: TreeNode<TagMeta>): void => {
		if (!node.children?.length) return;
		let count = written.has(node) ? (node.count ?? 0) : 0;
		const sources = new Set<TagSource>(node.meta.tagSources ?? []);
		for (const child of node.children) {
			rollup(child);
			count += child.count ?? 0;
			for (const source of child.meta.tagSources ?? []) sources.add(source);
		}
		node.count = count;
		node.meta = { ...node.meta, tagSources: sources };
	};
	for (const root of roots) rollup(root);

	return roots;
}
