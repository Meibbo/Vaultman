import { parseMembershipUrn, type MembershipRef } from './logicMembershipUrn';
import type { NodeGroupDef } from './logicNodeGroup';
import type { TreeNode } from '../types/typeTree';

export function identityKey(ref: MembershipRef): string {
	return `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
}

/**
 * Returns true if a tree node or any of its descendants matches any identity in `identities`.
 */
function nodeOrDescendantMatches<TMeta>(
	node: TreeNode<TMeta>,
	identities: ReadonlySet<string>,
	urnOf: (node: TreeNode<TMeta>) => string,
): boolean {
	const ref = parseMembershipUrn(urnOf(node));
	if (ref && identities.has(identityKey(ref))) return true;
	if (node.children?.length) {
		return node.children.some((child) =>
			nodeOrDescendantMatches(child, identities, urnOf),
		);
	}
	return false;
}

/**
 * Identifies which custom groups have members in vault mode (in `memberships` for `providerId`)
 * but 0 matching members among `revealNodes` for the current active file in reveal mode.
 */
export function resolveEmptyRevealCustomGroupIds<TMeta>(input: {
	groups: readonly NodeGroupDef[];
	memberships: Readonly<Record<string, readonly string[]>>;
	revealNodes: readonly TreeNode<TMeta>[];
	providerId: string;
	urnOf: (node: TreeNode<TMeta>) => string;
}): Set<string> {
	const { groups, memberships, revealNodes, providerId, urnOf } = input;
	const emptyGroupIds = new Set<string>();

	for (const group of groups) {
		const urns = memberships[group.id] ?? [];
		if (urns.length === 0) continue;
		const identities = new Set(
			urns
				.map((urn) => {
					const ref = parseMembershipUrn(urn);
					return ref && ref.providerId === providerId
						? identityKey(ref)
						: null;
				})
				.filter((id): id is string => Boolean(id)),
		);
		// If group has no members in this provider's vault snapshot, ignore
		if (identities.size === 0) continue;

		const hasMatchingChild = revealNodes.some((node) =>
			nodeOrDescendantMatches(node, identities, urnOf),
		);
		if (!hasMatchingChild) {
			emptyGroupIds.add(group.id);
		}
	}

	return emptyGroupIds;
}

/**
 * Checks whether a specific custom group now has at least 1 matching node/descendant
 * in `nodes`. Used to unhide an auto-hidden group when it gains children.
 */
export function groupHasMatchingChildren<TMeta>(input: {
	groupId: string;
	memberships: Readonly<Record<string, readonly string[]>>;
	nodes: readonly TreeNode<TMeta>[];
	providerId: string;
	urnOf: (node: TreeNode<TMeta>) => string;
}): boolean {
	const { groupId, memberships, nodes, providerId, urnOf } = input;
	const urns = memberships[groupId] ?? [];
	if (urns.length === 0) return false;
	const identities = new Set(
		urns
			.map((urn) => {
				const ref = parseMembershipUrn(urn);
				return ref && ref.providerId === providerId
					? identityKey(ref)
					: null;
			})
			.filter((id): id is string => Boolean(id)),
	);
	if (identities.size === 0) return false;

	return nodes.some((node) => nodeOrDescendantMatches(node, identities, urnOf));
}
