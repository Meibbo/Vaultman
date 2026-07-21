import type { TreeNode } from '../types/typeTree';

/**
 * A collapsed parent that hides an active-filter descendant should signal it
 * with a small dot — not by wearing the full active-filter decoration, which
 * made the parent read as if it were itself a filter (BT5-038). This returns
 * the exact set (the nodes that really are active filters, which keep the
 * decoration) and the bubble set (collapsed ancestors that only get a dot).
 */
export function resolveActiveFilterPresentation(
	nodes: TreeNode[],
	expandedIds: ReadonlySet<string>,
	exactIds: Set<string>,
): { exact: Set<string>; bubbled: Set<string> } {
	const bubbled = new Set<string>();
	if (exactIds.size === 0) return { exact: exactIds, bubbled };

	const visit = (node: TreeNode): boolean => {
		let subtreeActive = exactIds.has(node.id);
		let descendantActive = false;
		for (const child of node.children ?? []) {
			if (!visit(child)) continue;
			descendantActive = true;
			subtreeActive = true;
		}
		// A collapsed node that is not itself a filter but hides one gets a dot.
		if (descendantActive && !expandedIds.has(node.id) && !exactIds.has(node.id)) {
			bubbled.add(node.id);
		}
		return subtreeActive;
	};

	for (const node of nodes) visit(node);
	return { exact: exactIds, bubbled };
}
