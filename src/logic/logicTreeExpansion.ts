import type { TreeNode } from '../types/typeTree';

/** Return every expandable node in a subtree, including the pressed root. */
export function collectExpandableSubtreeIds(root: TreeNode): string[] {
	const expandableIds: string[] = [];
	const pending: TreeNode[] = [root];
	while (pending.length > 0) {
		const node = pending.pop();
		if (!node?.children?.length) continue;
		expandableIds.push(node.id);
		for (let index = node.children.length - 1; index >= 0; index -= 1) {
			pending.push(node.children[index]);
		}
	}
	return expandableIds;
}
