import type { TreeNode } from '../types/typeTree';

/**
 * Project exact active filters onto collapsed ancestors for presentation only.
 * The exact set is returned unchanged unless a parent actually needs bubbling.
 */
export function resolvePresentedActiveFilterIds(
	nodes: TreeNode[],
	expandedIds: ReadonlySet<string>,
	exactIds: Set<string>,
): Set<string> {
	if (exactIds.size === 0) return exactIds;
	let presented = exactIds;

	const addPresented = (id: string): void => {
		if (presented.has(id)) return;
		if (presented === exactIds) presented = new Set(exactIds);
		presented.add(id);
	};

	const visit = (node: TreeNode): boolean => {
		let subtreeActive = exactIds.has(node.id);
		let descendantActive = false;
		for (const child of node.children ?? []) {
			if (!visit(child)) continue;
			descendantActive = true;
			subtreeActive = true;
		}
		if (descendantActive && !expandedIds.has(node.id)) addPresented(node.id);
		return subtreeActive;
	};

	for (const node of nodes) visit(node);
	return presented;
}
