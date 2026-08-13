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
 * first" — the reason the CUSTOM_SORT option exists. Frontmatter is read
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
