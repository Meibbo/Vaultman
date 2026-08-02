import type { TreeNode } from '../types/typeTree';

export type RootHierarchyGroup = 'all' | 'nested' | 'simple';
export type TagStructure = Exclude<RootHierarchyGroup, 'all'>;

export const TAG_STRUCTURE_ORDER = ['nested', 'simple'] as const;

export function classifyTagStructure(node: {
	children?: readonly unknown[];
}): TagStructure {
	return node.children?.length ? 'nested' : 'simple';
}

export function matchesRootHierarchy(
	node: { children?: readonly unknown[]; count?: number },
	group: RootHierarchyGroup,
): boolean {
	if (group === 'all') return true;
	if (group === 'nested') return classifyTagStructure(node) === 'nested';
	return classifyTagStructure(node) === 'simple' || (node.count ?? 0) > 0;
}

export function compareTagStructure(
	left: { children?: readonly unknown[]; label: string },
	right: { children?: readonly unknown[]; label: string },
	direction: 'asc' | 'desc',
): number {
	const leftRank = TAG_STRUCTURE_ORDER.indexOf(classifyTagStructure(left));
	const rightRank = TAG_STRUCTURE_ORDER.indexOf(classifyTagStructure(right));
	const rankDifference = leftRank - rightRank;
	if (rankDifference !== 0) {
		return direction === 'asc' ? rankDifference : -rankDifference;
	}
	return left.label.localeCompare(right.label, undefined, {
		numeric: true,
		sensitivity: 'base',
	});
}

export function cloneTree<TMeta>(nodes: TreeNode<TMeta>[]): TreeNode<TMeta>[] {
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
			.filter((node) => matchesRootHierarchy(node, group))
			.map((node) => ({
				...node,
				children: node.children ? cloneTree(node.children) : [],
			}));
	}
	// simple: keep leaves + parents that have direct occurrences (count > 0)
	return nodes
		.filter((node) => matchesRootHierarchy(node, group))
		.map((node) => ({ ...node, children: [] }));
}

/**
 * U121-003: `showParent` backs the `parent` cell, which mirrors `path` in the
 * file explorer. Turning it off shortens the label to the node's own name; node
 * identity is untouched, so filters and operations keep targeting the same node.
 */
export function flattenTreeToPathLabels<TMeta>(
	nodes: TreeNode<TMeta>[],
	separator = '/',
	options: { showParent?: boolean } = {},
): TreeNode<TMeta>[] {
	const { showParent = true } = options;
	const flat: TreeNode<TMeta>[] = [];

	const walk = (items: TreeNode<TMeta>[], ancestors: string[]): void => {
		for (const node of items) {
			const labelParts = [...ancestors, node.label].filter(Boolean);
			flat.push({
				...node,
				label: showParent ? labelParts.join(separator) : node.label,
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

export function flattenPropertyValues<
	TMeta extends { isValueNode: boolean; propName: string; rawValue?: string },
>(
	nodes: TreeNode<TMeta>[],
	options: { showParent?: boolean } = {},
): TreeNode<TMeta & { flatLabelPrefix?: string }>[] {
	const { showParent = true } = options;
	const flat: TreeNode<TMeta & { flatLabelPrefix?: string }>[] = [];
	const visit = (items: TreeNode<TMeta>[]): void => {
		for (const node of items) {
			if (!node.meta.isValueNode) {
				flat.push({
					...node,
					depth: 0,
					showCaret: false,
					children: [],
					meta: { ...node.meta },
				});
			} else {
				const value = node.meta.rawValue ?? node.label;
				// `parent` off leaves the value alone. The prefix is dropped from
				// the meta too, so the renderer has nothing to draw rather than a
				// prefix it must remember to suppress.
				flat.push({
					...node,
					label: showParent ? `${node.meta.propName}: ${value}` : value,
					depth: 0,
					showCaret: false,
					children: [],
					meta: showParent
						? { ...node.meta, flatLabelPrefix: `${node.meta.propName}: ` }
						: { ...node.meta },
				});
			}
			if (node.children?.length) visit(node.children);
		}
	};
	visit(nodes);
	return flat;
}
