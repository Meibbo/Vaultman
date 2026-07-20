// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	applyBubbleDots,
	BUBBLE_COLOR_PRIORITY,
	buildBubbleIndex,
	bubbleDotsForExpansion,
	resolveCollapsedBubbleDots,
} from '../../src/logic/logicBadgeBubbling';
import type { NodeBadge, TreeNode } from '../../src/types/typeTree';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

function node(
	id: string,
	options: {
		badges?: NodeBadge[];
		children?: TreeNode[];
		depth?: number;
	} = {},
): TreeNode {
	return {
		id,
		label: id,
		depth: options.depth ?? 0,
		meta: {},
		...(options.badges ? { badges: options.badges } : {}),
		...(options.children ? { children: options.children } : {}),
	};
}

function badge(color: NodeBadge['color'], text = 'op'): NodeBadge {
	return { color, text, solid: true, icon: 'lucide-trash' };
}

describe('BT5-017 bubble index (one pass, expansion-independent)', () => {
	it('records descendant activity per ancestor and excludes the node itself', () => {
		const tree = [
			node('root', {
				children: [
					node('mid', {
						depth: 1,
						children: [node('leaf', { depth: 2, badges: [badge('red')] })],
					}),
				],
			}),
			node('lonely', { badges: [badge('blue')] }),
		];

		const index = buildBubbleIndex(tree);

		expect(index.nodesById.get('leaf')?.id).toBe('leaf');
		expect(index.descendantActivity.get('root')?.color).toBe('red');
		expect(index.descendantActivity.get('mid')?.color).toBe('red');
		// A node's own badge is not descendant activity.
		expect(index.descendantActivity.has('leaf')).toBe(false);
		expect(index.descendantActivity.has('lonely')).toBe(false);
	});

	it('counts every active descendant, not just the winning color', () => {
		const tree = [
			node('root', {
				children: [
					node('a', { depth: 1, badges: [badge('blue')] }),
					node('b', { depth: 1, badges: [badge('red')] }),
					node('c', { depth: 1 }),
				],
			}),
		];

		const dot = buildBubbleIndex(tree).descendantActivity.get('root');
		expect(dot).toEqual({ color: 'red', sourceCount: 2 });
	});

	it('counts a descendant once even when it owns several badges', () => {
		const tree = [
			node('root', {
				children: [
					node('child', {
						depth: 1,
						badges: [badge('blue'), badge('red')],
					}),
				],
			}),
		];

		expect(buildBubbleIndex(tree).descendantActivity.get('root')).toEqual({
			color: 'red',
			sourceCount: 1,
		});
	});

	it('ignores inherited badges so bubbling never feeds itself', () => {
		const tree = [
			node('root', {
				children: [
					node('child', {
						depth: 1,
						badges: [{ ...badge('red'), isInherited: true }],
					}),
				],
			}),
		];

		expect(buildBubbleIndex(tree).descendantActivity.has('root')).toBe(false);
	});

	it('resolves conflicting descendant colors by a deterministic priority', () => {
		expect(BUBBLE_COLOR_PRIORITY[0]).toBe('error');
		expect(BUBBLE_COLOR_PRIORITY).toContain('red');
		expect(BUBBLE_COLOR_PRIORITY.indexOf('red')).toBeLessThan(
			BUBBLE_COLOR_PRIORITY.indexOf('warning'),
		);
		expect(BUBBLE_COLOR_PRIORITY.indexOf('warning')).toBeLessThan(
			BUBBLE_COLOR_PRIORITY.indexOf('accent'),
		);

		for (const [left, right] of [
			['red', 'blue'],
			['warning', 'success'],
			['accent', 'faint'],
		] as const) {
			const forward = buildBubbleIndex([
				node('p', {
					children: [
						node('x', { depth: 1, badges: [badge(left)] }),
						node('y', { depth: 1, badges: [badge(right)] }),
					],
				}),
			]).descendantActivity.get('p');
			const reversed = buildBubbleIndex([
				node('p', {
					children: [
						node('y', { depth: 1, badges: [badge(right)] }),
						node('x', { depth: 1, badges: [badge(left)] }),
					],
				}),
			]).descendantActivity.get('p');
			// Order of traversal must not change the winner.
			expect(forward).toEqual(reversed);
			expect(forward?.color).toBe(left);
		}
	});

	it('treats a colorless badge as activity with the neutral fallback color', () => {
		const tree = [
			node('root', {
				children: [node('child', { depth: 1, badges: [{ text: 'plain' }] })],
			}),
		];
		expect(buildBubbleIndex(tree).descendantActivity.get('root')).toEqual({
			color: 'accent',
			sourceCount: 1,
		});
	});
});

describe('BT5-017 dots follow expansion without re-scanning the tree', () => {
	const tree = [
		node('root', {
			children: [
				node('mid', {
					depth: 1,
					children: [node('leaf', { depth: 2, badges: [badge('red')] })],
				}),
			],
		}),
	];

	it('shows the dot on every collapsed ancestor and on none when expanded', () => {
		const index = buildBubbleIndex(tree);

		const allCollapsed = bubbleDotsForExpansion(index, new Set());
		expect([...allCollapsed.keys()].sort()).toEqual(['mid', 'root']);

		const rootOpen = bubbleDotsForExpansion(index, new Set(['root']));
		expect([...rootOpen.keys()]).toEqual(['mid']);

		const allOpen = bubbleDotsForExpansion(index, new Set(['root', 'mid']));
		expect(allOpen.size).toBe(0);
	});

	it('re-projects expansion changes without touching the tree again', () => {
		let visited = 0;
		const counted = [
			node('root', {
				children: [
					node('mid', {
						depth: 1,
						children: [node('leaf', { depth: 2, badges: [badge('red')] })],
					}),
				],
			}),
		];
		const countingIndex = buildBubbleIndex(counted, {
			onVisit: () => {
				visited += 1;
			},
		});
		const afterBuild = visited;
		expect(afterBuild).toBe(3);

		bubbleDotsForExpansion(countingIndex, new Set());
		bubbleDotsForExpansion(countingIndex, new Set(['root']));
		bubbleDotsForExpansion(countingIndex, new Set(['root', 'mid']));
		// Expansion re-projection must not re-walk the tree.
		expect(visited).toBe(afterBuild);
	});

	it('returns an empty map when nothing is active (no decorative DOM)', () => {
		const quiet = [node('root', { children: [node('child', { depth: 1 })] })];
		const index = buildBubbleIndex(quiet);
		expect(index.descendantActivity.size).toBe(0);
		expect(bubbleDotsForExpansion(index, new Set()).size).toBe(0);
	});

	it('resolveCollapsedBubbleDots composes both steps', () => {
		expect([
			...resolveCollapsedBubbleDots(tree, new Set(['root'])).keys(),
		]).toEqual(['mid']);
	});

	it('writes dots onto the tree touching only activity carriers', () => {
		const big: TreeNode[] = [
			node('busy', {
				children: [node('hot', { depth: 1, badges: [badge('red')] })],
			}),
			// 500 quiet nodes that must never be visited on an expansion change.
			...Array.from({ length: 500 }, (_, i) =>
				node(`quiet-${i}`, {
					children: [node(`quiet-${i}-child`, { depth: 1 })],
				}),
			),
		];
		const index = buildBubbleIndex(big);
		expect(index.carriers.size).toBe(1);

		applyBubbleDots(index, new Set());
		expect(big[0].bubbleDot).toEqual({ color: 'red', sourceCount: 1 });
		expect(big[1].bubbleDot).toBeUndefined();

		// Expanding the carrier clears its dot; the quiet subtree is untouched.
		applyBubbleDots(index, new Set(['busy']));
		expect(big[0].bubbleDot).toBeUndefined();
		expect('bubbleDot' in big[0]).toBe(false);
	});

	it('a nested collapsed chain shows the dot at every collapsed level', () => {
		const deep: TreeNode[] = [
			node('l0', {
				children: [
					node('l1', {
						depth: 1,
						children: [
							node('l2', {
								depth: 2,
								children: [
									node('l3', { depth: 3, badges: [badge('warning')] }),
								],
							}),
						],
					}),
				],
			}),
		];
		const index = buildBubbleIndex(deep);
		applyBubbleDots(index, new Set(['l0']));

		// l0 is expanded → no dot; the still-collapsed descendants keep theirs.
		expect(deep[0].bubbleDot).toBeUndefined();
		expect(deep[0].children?.[0].bubbleDot?.color).toBe('warning');
		expect(deep[0].children?.[0].children?.[0].bubbleDot?.color).toBe(
			'warning',
		);
		// The node owning the badge never bubbles to itself.
		expect(
			deep[0].children?.[0].children?.[0].children?.[0].bubbleDot,
		).toBeUndefined();
	});
});

describe('BT5-017 wiring guards', () => {
	function sourceBetween(source: string, start: string, end: string): string {
		const startIndex = source.indexOf(start);
		const endIndex = source.indexOf(end, startIndex + start.length);
		expect(
			startIndex,
			`missing source marker: ${start}`,
		).toBeGreaterThanOrEqual(0);
		expect(endIndex, `missing source marker: ${end}`).toBeGreaterThan(
			startIndex,
		);
		return source.slice(startIndex, endIndex);
	}

	it('files explorer projects dots instead of duplicating inherited badges', () => {
		expect(explorerFilesSource).toMatch(
			/resolveCollapsedBubbleDots|buildBubbleIndex/,
		);
		expect(explorerFilesSource).not.toMatch(/_dedupeInheritedBadges/);
	});

	it('updates expansion from the cached projection instead of rebuilding the panel tree', () => {
		const onToggle = sourceBetween(
			explorerFilesSource,
			'onToggle: (id: string) => {',
			'onRecursiveExpand:',
		);
		const onRowClick = sourceBetween(
			explorerFilesSource,
			'onRowClick: (id: string, event?: MouseEvent) => {',
			'onRowHover:',
		);
		const expandNodeById = sourceBetween(
			explorerFilesSource,
			'expandNodeById(id: string): void {',
			'/** Floating TOC reveal port',
		);
		const expandSubtree = sourceBetween(
			explorerFilesSource,
			'private _expandSubtree(',
			'private _warmStatisticsCache(',
		);
		const toggleExpanded = sourceBetween(
			explorerFilesSource,
			'private _toggleExpanded(',
			'private _expandSubtree(',
		);

		for (const expansionPath of [
			onToggle,
			onRowClick,
			expandNodeById,
			expandSubtree,
		]) {
			expect(expansionPath).not.toMatch(/this\._render\(\)/);
			expect(expansionPath).toMatch(/_refreshTreeExpansion/);
		}

		const refreshProjection = sourceBetween(
			explorerFilesSource,
			'private _refreshTreeExpansion(',
			'private _warmStatisticsCache(',
		);
		expect(refreshProjection).toMatch(/this\._applyBubbleDots\(\)/);
		expect(refreshProjection).toMatch(/this\.treeView\?\.updateExpansion/);
		expect(refreshProjection).toMatch(/_refreshFolderIcon/);
		// Collapse notifications still reconcile the floating TOC, but expansion
		// must not trigger its potentially full-tree index derivation again.
		expect(toggleExpanded).toMatch(/_notifyExpansionChanged/);
		expect(expandNodeById).toMatch(/_notifyExpansionChanged/);
		expect(expandSubtree).toMatch(/_notifyExpansionChanged/);
		expect(refreshProjection).not.toMatch(/this\.onIndexChanged\?\.\(\)/);
		expect(refreshProjection).toMatch(/lucide-folder-open/);
		expect(refreshProjection).toMatch(/lucide-folder/);
	});

	it('patches the visible tree window without flattening the complete root model', () => {
		const updateExpansion = sourceBetween(
			viewTreeSource,
			'updateExpansion(',
			'updateVisibility(',
		);

		expect(updateExpansion).toMatch(/_replaceVisibleDescendants/);
		expect(updateExpansion).toMatch(/_renderWindow\(\)/);
		expect(updateExpansion).not.toMatch(/flattenVisibleTree\(.*opts\.nodes/);
		expect(updateExpansion).not.toMatch(/this\._buildIndex\(this\._rows\)/);
	});

	it('tree rows render the dot only when present and key it in the row signature', () => {
		expect(viewTreeSource).toMatch(/vaultman-tree-bubble-dot/);
		// Rendered behind a guard: no node without activity creates DOM.
		expect(viewTreeSource).toMatch(/if \(node\.bubbleDot\) \{/);
		// A bubble-only folder must still create the badge zone that owns the dot.
		expect(viewTreeSource).toMatch(/\|\|\s*node\.bubbleDot\s*\)\s*\{/);
		// Reused virtual rows must repaint when the dot appears/changes color.
		expect(viewTreeSource).toMatch(
			/node\.bubbleDot\.color\}:\$\{node\.bubbleDot\.sourceCount/,
		);
	});

	it('keeps the dot out of the interaction surface (not an action node)', () => {
		expect(viewTreeSource).not.toMatch(
			/dotEl\.(onclick|ondblclick|oncontextmenu|addEventListener)/,
		);
		expect(viewTreeSource).toMatch(/dotEl\.setAttribute\('role', 'img'\)/);
		expect(viewTreeSource).not.toMatch(/dotEl\.setAttribute\('tabindex'/);
		// It is still described for assistive tech.
		expect(viewTreeSource).toMatch(/dotEl\.setAttribute\('aria-label'/);
	});

	it('styles the dot as decoration that cannot capture the pointer', () => {
		const dotBlock = stylesSource.match(
			/\.vaultman-tree-bubble-dot \{[^}]+\}/,
		)?.[0];
		expect(dotBlock).toBeDefined();
		expect(dotBlock).toMatch(/pointer-events: none/);
		expect(dotBlock).toMatch(/border-radius: 50%/);
	});
});
