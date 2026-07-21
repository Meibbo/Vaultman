import { describe, expect, it } from 'vitest';

import {
	collectDescendantBadges,
	resolveCollapsedBubbleDots,
} from '../../src/logic/logicBadgeBubbling';
import type { NodeBadge, TreeNode } from '../../src/types/typeTree';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

function leaf(id: string, badges: NodeBadge[] = []): TreeNode {
	return { id, label: id, depth: 1, meta: {}, badges };
}

const tree: TreeNode[] = [
	{
		id: 'folder',
		label: 'folder',
		depth: 0,
		meta: {},
		children: [
			leaf('a.md', [{ text: 'del', color: 'red', queueIndex: 3 }]),
			leaf('b.md', [{ text: 'mv', color: 'orange', queueIndex: 4 }]),
			leaf('c.md'),
		],
	},
];

describe('BT5-042 collapsed folder badge modes', () => {
	it('defaults to the single dot mode', () => {
		expect(DEFAULT_SETTINGS.collapsedFolderBadges).toBe('dot');
	});

	it('dot mode: a collapsed folder carries one activity dot', () => {
		const dots = resolveCollapsedBubbleDots(tree, new Set());
		expect(dots.get('folder')).toEqual({ color: 'red', sourceCount: 2 });
	});

	it('badges mode: a collapsed folder shows its descendants own badges, deduped and inherited', () => {
		const inherited = collectDescendantBadges(tree, new Set());
		const folderBadges = inherited.get('folder') ?? [];
		expect(folderBadges.map((b) => b.text).sort()).toEqual(['del', 'mv']);
		// Bubbled badges are inherited and non-removable.
		expect(folderBadges.every((b) => b.isInherited === true)).toBe(true);
		expect(folderBadges.every((b) => b.queueIndex === undefined)).toBe(true);
	});

	it('badges mode: an expanded folder shows none (the real badges are visible)', () => {
		expect(collectDescendantBadges(tree, new Set(['folder'])).has('folder')).toBe(
			false,
		);
	});

	it('wires the mode toggle in the explorer and settings', () => {
		expect(explorerFilesSource).toContain('_collapsedBadgesMode()');
		expect(explorerFilesSource).toContain('collectDescendantBadges(');
		expect(settingsSource).toContain('collapsedFolderBadges');
	});
});
