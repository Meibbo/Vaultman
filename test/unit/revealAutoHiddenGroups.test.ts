import { describe, expect, it } from 'vitest';
import {
	resolveEmptyRevealCustomGroupIds,
	groupHasMatchingChildren,
} from '../../src/logic/logicRevealAutoHiddenGroups';
import type { NodeGroupDef } from '../../src/logic/logicNodeGroup';
import type { TreeNode } from '../../src/types/typeTree';

describe('logicRevealAutoHiddenGroups', () => {
	const groups: NodeGroupDef[] = [
		{ id: 'group-status', label: 'Status Group', flavor: 'custom', parentId: null, scope: 'all' },
		{ id: 'group-tags', label: 'Priority Tags', flavor: 'custom', parentId: null, scope: 'all' },
		{ id: 'group-empty-vault', label: 'Empty in Vault', flavor: 'custom', parentId: null, scope: 'all' },
	];

	const memberships: Record<string, string[]> = {
		'group-status': [
			'props:prop:status|Status',
			'props:value:status:done|Done',
		],
		'group-tags': [
			'tags:tag:urgent|Urgent',
			'tags:tag:wip|WIP',
		],
		'group-empty-vault': [],
	};

	it('identifies custom groups that have members in vault mode but 0 children in reveal mode', () => {
		// In this revealed note, neither 'status' nor 'done' is present
		const revealNodes: TreeNode<{ propName: string; isValueNode: boolean }>[] = [
			{
				id: 'prop:author',
				label: 'Author',
				count: 1,
				depth: 0,
				children: [],
				meta: { propName: 'author', isValueNode: false },
			},
		];

		const urnOf = (n: TreeNode<{ propName: string; isValueNode: boolean }>) =>
			`props:prop:${n.meta.propName}|${n.label}`;

		const empty = resolveEmptyRevealCustomGroupIds({
			groups,
			memberships,
			revealNodes,
			providerId: 'props',
			urnOf,
		});

		expect(empty.has('group-status')).toBe(true);
		// group-empty-vault had no memberships in vault mode, so it should not be flagged as an auto-hidden group
		expect(empty.has('group-empty-vault')).toBe(false);
		// group-tags belongs to provider 'tags', not 'props'
		expect(empty.has('group-tags')).toBe(false);
	});

	it('does not mark a group as empty when matching property is present in reveal note', () => {
		const revealNodes: TreeNode<{ propName: string; isValueNode: boolean }>[] = [
			{
				id: 'prop:status',
				label: 'Status',
				count: 1,
				depth: 0,
				children: [],
				meta: { propName: 'status', isValueNode: false },
			},
		];

		const urnOf = (n: TreeNode<{ propName: string; isValueNode: boolean }>) =>
			`props:prop:${n.meta.propName}|${n.label}`;

		const empty = resolveEmptyRevealCustomGroupIds({
			groups,
			memberships,
			revealNodes,
			providerId: 'props',
			urnOf,
		});

		expect(empty.has('group-status')).toBe(false);
	});

	it('matches nested value nodes inside property nodes', () => {
		const revealNodes: TreeNode<{ propName: string; rawValue?: string; isValueNode: boolean }>[] = [
			{
				id: 'prop:status',
				label: 'Status',
				count: 1,
				depth: 0,
				children: [
					{
						id: 'val:done',
						label: 'done',
						count: 1,
						depth: 1,
						meta: { propName: 'status', rawValue: 'done', isValueNode: true },
					},
				],
				meta: { propName: 'status', isValueNode: false },
			},
		];

		const urnOf = (n: TreeNode<{ propName: string; rawValue?: string; isValueNode: boolean }>) =>
			n.meta.isValueNode
				? `props:value:${n.meta.propName}:${n.meta.rawValue}|${n.label}`
				: `props:prop:${n.meta.propName}|${n.label}`;

		const empty = resolveEmptyRevealCustomGroupIds({
			groups,
			memberships,
			revealNodes,
			providerId: 'props',
			urnOf,
		});

		expect(empty.has('group-status')).toBe(false);
	});

	it('groupHasMatchingChildren returns true when children match and false otherwise', () => {
		const urnOf = (n: TreeNode<{ tagPath: string }>) =>
			`tags:tag:${n.meta.tagPath}|${n.label}`;

		const emptyNodes: TreeNode<{ tagPath: string }>[] = [
			{ id: 'tag:other', label: 'other', count: 1, depth: 0, meta: { tagPath: 'other' } },
		];
		expect(
			groupHasMatchingChildren({
				groupId: 'group-tags',
				memberships,
				nodes: emptyNodes,
				providerId: 'tags',
				urnOf,
			}),
		).toBe(false);

		const matchedNodes: TreeNode<{ tagPath: string }>[] = [
			{ id: 'tag:urgent', label: 'urgent', count: 1, depth: 0, meta: { tagPath: 'urgent' } },
		];
		expect(
			groupHasMatchingChildren({
				groupId: 'group-tags',
				memberships,
				nodes: matchedNodes,
				providerId: 'tags',
				urnOf,
			}),
		).toBe(true);
	});
});
