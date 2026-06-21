import type { TreeNode } from '../types/typeTree';

export type RootHierarchyGroup = 'all' | 'nested' | 'simple';

export function cloneTree<TMeta>(
	nodes: TreeNode<TMeta>[],
): TreeNode<TMeta>[] {
	return nodes.map((node) => ({
		...node,
		children: node.children ? cloneTree(node.children) : [],
	}));
}

export function groupRootHierarchy<TMeta>(
	nodes: TreeNode<TMeta>[],
	group: RootHierarchyGroup,
): TreeNode<TMeta>[] {
	if (group === 'all') return cloneTree(nodes);
	if (group === 'nested') {
		return nodes
			.filter((node) => Boolean(node.children?.length))
			.map((node) => ({
				...node,
				children: node.children ? cloneTree(node.children) : [],
			}));
	}
	// simple: keep leaves + parents that have direct occurrences (count > 0)
	return nodes
		.filter((node) => !node.children?.length || (node.count ?? 0) > 0)
		.map((node) => ({ ...node, children: [] }));
}

export function flattenTreeToPathLabels<TMeta>(
	nodes: TreeNode<TMeta>[],
	separator = '/',
): TreeNode<TMeta>[] {
	const flat: TreeNode<TMeta>[] = [];

	const walk = (items: TreeNode<TMeta>[], ancestors: string[]): void => {
		for (const node of items) {
			const labelParts = [...ancestors, node.label].filter(Boolean);
			flat.push({
				...node,
				label: labelParts.join(separator),
				children: [],
				depth: 0,
				showCaret: false,
			});
			if (node.children?.length) walk(node.children, labelParts);
		}
	};

	walk(nodes, []);
	return flat;
}
