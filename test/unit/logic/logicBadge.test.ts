import { describe, it, expect } from 'vitest';
import {
	deriveNodeBadges,
	nodeBadgesFromLayers,
	bubbleNodeBadges,
	colorFromTone,
} from '../../../src/logic/logicBadge';
import type { TreeNode } from '../../../src/types/typeTreeNode';

describe('colorFromTone', () => {
	it('maps view tones to NodeBadge colors (single source of truth)', () => {
		expect(colorFromTone('danger')).toBe('red');
		expect(colorFromTone('success')).toBe('green');
		expect(colorFromTone('warning')).toBe('orange');
		expect(colorFromTone('info')).toBe('blue');
		expect(colorFromTone('accent')).toBe('purple');
		expect(colorFromTone('neutral')).toBe('faint');
		expect(colorFromTone(undefined)).toBe('faint');
	});
});

describe('deriveNodeBadges', () => {
	it('returns no badges for an idle node (no pending, no filter)', () => {
		expect(deriveNodeBadges({ pending: [] })).toEqual([]);
		expect(deriveNodeBadges({})).toEqual([]);
	});

	it('derives a pending (queued) badge with kind/color/icon from the operation intent', () => {
		const badges = deriveNodeBadges({
			pending: [{ tone: 'danger', label: 'delete', icon: 'lucide-trash-2' }],
		});
		expect(badges).toHaveLength(1);
		expect(badges[0]).toMatchObject({
			text: 'delete',
			icon: 'lucide-trash-2',
			color: 'red',
		});
	});

	it('attaches the queueIndex onto the pending badge for click-to-remove', () => {
		const badges = deriveNodeBadges({
			pending: [{ tone: 'success', label: 'add', icon: 'lucide-plus', queueIndex: 3 }],
		});
		expect(badges[0].queueIndex).toBe(3);
	});

	it('derives a filter badge when the node is filter-active', () => {
		const badges = deriveNodeBadges({
			filterActive: [{ tone: 'info', label: 'has tag', icon: 'lucide-filter' }],
		});
		expect(badges).toHaveLength(1);
		expect(badges[0]).toMatchObject({ text: 'has tag', icon: 'lucide-filter', color: 'blue' });
		// filter badges are visual-only (no queue removal)
		expect(badges[0].queueIndex).toBeUndefined();
	});

	it('combines pending and filter badges, pending first', () => {
		const badges = deriveNodeBadges({
			pending: [{ tone: 'warning', label: 'rename', icon: 'lucide-pencil', queueIndex: 0 }],
			filterActive: [{ tone: 'info', label: 'has property' }],
		});
		expect(badges.map((b) => b.text)).toEqual(['rename', 'has property']);
	});

	it('marks badges inherited when inheritedFrom is set, dropping queueIndex passthrough by default', () => {
		const badges = deriveNodeBadges({
			pending: [{ tone: 'danger', label: 'delete', icon: 'lucide-trash-2', queueIndex: 1 }],
			inheritedFrom: 'status:draft',
		});
		expect(badges).toHaveLength(1);
		expect(badges[0].isInherited).toBe(true);
		expect(badges[0].text).toBe('delete');
	});
});

describe('nodeBadgesFromLayers', () => {
	it('projects ops/filter/inherited/count view-badge layers into NodeBadge[]', () => {
		const badges = nodeBadgesFromLayers({
			badges: {
				ops: [{ id: 'n:op', label: 'delete', icon: 'lucide-trash-2', tone: 'danger' }],
				filters: [{ id: 'n:f', label: 'has tag', icon: 'lucide-filter', tone: 'info' }],
				inherited: [{ id: 'n:i', label: 'set', tone: 'info', inherited: true }],
				counts: [{ id: 'n:c', label: '4', tone: 'neutral' }],
			},
		});
		expect(badges.map((b) => b.text)).toEqual(['delete', 'has tag', 'set', '4']);
		expect(badges[0].color).toBe('red');
		expect(badges[2].isInherited).toBe(true);
		expect(badges[3].color).toBe('faint');
	});

	it('resolves queueIndex from operations for removable badges only', () => {
		const operations = [
			{ id: 'op-a', group: 'g', change: { id: 'c-a', type: 'tag', tag: 'x' } },
			{ id: 'op-b', group: 'g', change: { id: 'c-b', type: 'tag', tag: 'y' } },
		] as never[];
		const badges = nodeBadgesFromLayers(
			{
				badges: {
					ops: [
						{ id: 'n:1', label: 'add', tone: 'success', sourceId: 'op-b', actionId: 'remove' },
						{ id: 'n:2', label: 'x', tone: 'neutral' },
					],
				},
			},
			operations,
		);
		expect(badges[0].queueIndex).toBe(1);
		expect(badges[1].queueIndex).toBeUndefined();
	});

	it('returns an empty array when there are no badge layers', () => {
		expect(nodeBadgesFromLayers({})).toEqual([]);
	});
});

function node(id: string, children: TreeNode[] = [], badges: TreeNode['badges'] = []): TreeNode {
	return { id, label: id, depth: 0, meta: {}, badges, children };
}

describe('bubbleNodeBadges (inherited folder-badge bubbling — SDF-016/§06.17)', () => {
	it('adds hidden descendant badges to collapsed parents as inherited badges', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
				),
			]),
		];

		const bubbled = bubbleNodeBadges(tree, new Set());

		expect(bubbled[0].badges).toContainEqual(
			expect.objectContaining({
				text: 'delete',
				icon: 'lucide-trash-2',
				color: 'red',
				queueIndex: 0,
				isInherited: true,
			}),
		);
		// the child keeps its own (direct, non-inherited) badge
		expect(bubbled[0].children?.[0].badges?.[0]).toMatchObject({ text: 'delete' });
		expect(bubbled[0].children?.[0].badges?.[0].isInherited).toBeUndefined();
	});

	it('does not bubble child badges when the parent is expanded', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
				),
			]),
		];

		const bubbled = bubbleNodeBadges(tree, new Set(['status']));

		expect(bubbled[0].badges ?? []).toEqual([]);
		expect(bubbled[0].children?.[0].badges).toContainEqual(
			expect.objectContaining({ text: 'delete', queueIndex: 0 }),
		);
	});

	it('collapses duplicate inherited badges by stable operation identity', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 }],
				),
				node(
					'status:done',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 }],
				),
			]),
		];

		const bubbled = bubbleNodeBadges(tree, new Set());

		expect(bubbled[0].badges?.filter((badge) => badge.isInherited)).toHaveLength(1);
	});

	it('does not bubble quick-action badges', () => {
		const tree = [
			node('status', [
				node('status:draft', [], [{ text: '+', icon: 'lucide-plus', quickAction: true }]),
			]),
		];

		const bubbled = bubbleNodeBadges(tree, new Set());

		expect(bubbled[0].badges ?? []).toEqual([]);
	});

	it('reuses node references when no hidden descendant badges are present', () => {
		const child = node('status:draft');
		const parent = node('status', [child]);
		const tree = [parent];

		const bubbled = bubbleNodeBadges(tree, new Set());

		expect(bubbled[0]).toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
	});

	it('reuses expanded branch references when bubbling does not change badges', () => {
		const child = node(
			'status:draft',
			[],
			[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
		);
		const parent = node('status', [child]);
		const tree = [parent];

		const bubbled = bubbleNodeBadges(tree, new Set(['status']));

		expect(bubbled[0]).toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
	});

	it('clones only collapsed ancestors that receive inherited badges', () => {
		const child = node(
			'status:draft',
			[],
			[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
		);
		const stableSibling = node('status:done');
		const parent = node('status', [child, stableSibling]);
		const tree = [parent];

		const bubbled = bubbleNodeBadges(tree, new Set());

		expect(bubbled[0]).not.toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
		expect(bubbled[0].children?.[1]).toBe(stableSibling);
		expect(bubbled[0].badges).toContainEqual(
			expect.objectContaining({ text: 'delete', queueIndex: 0, isInherited: true }),
		);
	});
});
