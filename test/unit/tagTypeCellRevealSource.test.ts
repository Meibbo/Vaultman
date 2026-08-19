import { describe, expect, it } from 'vitest';

import { projectActiveFileTags } from '../../src/logic/logicRevealActiveFileTags';
import { tagSourceLabelKey } from '../../src/logic/logicTagSource';
import { flattenTreeToPathLabels } from '../../src/logic/logicExplorerHierarchy';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';

import type { TagMeta, TreeNode } from '../../src/types/typeTree';

function tagNode(
	tagPath: string,
	children: readonly string[] = [],
): TreeNode<TagMeta> {
	const label = tagPath.split('/').at(-1) ?? tagPath;
	return {
		id: tagPath,
		label,
		count: 9,
		depth: tagPath.split('/').length - 1,
		icon: 'lucide-sparkles',
		coreCls: 'tree-item-self tag-pane-tag is-clickable',
		children: children.map((child) => tagNode(`${tagPath}/${child}`)),
		meta: { tagPath },
	};
}

// The vault-wide snapshot: `estado` and `leido` exist in every note, so the
// vault index legitimately answers `both` for them. The revealed note, though,
// writes each in a single place, and that answer must win.
const snapshot: TreeNode<TagMeta>[] = [
	tagNode('proyecto', ['casa']),
	tagNode('estado'),
	tagNode('leido'),
];

describe('reveal answers the type cell for the note, not the vault', () => {
	it('carries the note\x27s own sources through the whole render pipeline', () => {
		const projected = projectActiveFileTags(snapshot, {
			frontmatter: { tags: ['estado'] },
			tags: [{ tag: '#leido', position: { start: { offset: 400 } } }],
		});

		// The steps between the projection and the type-cell decoration only
		// spread the nodes (icon resolution, flat relabeling), so the note's
		// sources must arrive at the cell untouched.
		const resolved = projected.map((node) => ({ ...node }));
		const flattened = flattenTreeToPathLabels(resolved, '/', {
			showParent: true,
		});

		const byPath = new Map(
			flattened.map((node) => [node.meta.tagPath, node]),
		);
		expect(
			tagSourceLabelKey(byPath.get('estado')?.meta.tagSources),
		).toBe('tags.source.frontmatter');
		expect(tagSourceLabelKey(byPath.get('leido')?.meta.tagSources)).toBe(
			'tags.source.inline',
		);
	});

	it('keeps _sourcesFor from falling back to the vault index while revealing', () => {
		const sourcesForBlock = tagsExplorerSource.slice(
			tagsExplorerSource.indexOf('private _sourcesFor('),
			tagsExplorerSource.indexOf('private _decorateTypeText('),
		);
		expect(sourcesForBlock).not.toBe('');

		// The reveal branch is the node's own answer alone — no `_sourceIndex`
		// consult. The vault-wide index only answers when there is no reveal.
		expect(sourcesForBlock).toContain('this.revealActiveFile');
		expect(
			/if \(this\.revealActiveFile\) return node\.meta\.tagSources;/.test(
				sourcesForBlock,
			),
		).toBe(true);
		expect(sourcesForBlock).not.toContain(
			'if (this.revealActiveFile) return node.meta.tagSources ?? this._sourceIndex',
		);
	});
});