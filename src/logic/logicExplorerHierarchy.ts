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
				flatOwnLabel: node.label,
				flatParentLabel: ancestors.join(separator),
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
					flatOwnLabel: node.label,
					flatParentLabel: '',
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
					flatOwnLabel: value,
					flatParentLabel: node.meta.propName,
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

/**
 * U121-003: reorders an already-flattened projection.
 *
 * Flattening runs after the two-level sort, so a flat list came out grouped by
 * its parents no matter which sort was chosen — a Name sort that was really a
 * Parent sort. Once flat there is one level, so it is sorted as one list:
 * `parent` groups by ancestry and falls back to the name inside each group,
 * and every other sort compares the node's own name. Nodes that never went
 * through a flattener keep their order.
 */
export function sortFlatProjection<TMeta>(
	nodes: TreeNode<TMeta>[],
	sortBy: string,
	direction: 'asc' | 'desc',
	compareOwn?: (a: TreeNode<TMeta>, b: TreeNode<TMeta>) => number,
): TreeNode<TMeta>[] {
	const dir = direction === 'asc' ? 1 : -1;
	const own = (node: TreeNode<TMeta>): string =>
		node.flatOwnLabel ?? node.label;
	const parent = (node: TreeNode<TMeta>): string => node.flatParentLabel ?? '';
	const byName = (a: TreeNode<TMeta>, b: TreeNode<TMeta>): number =>
		own(a).localeCompare(own(b), undefined, {
			numeric: true,
			sensitivity: 'base',
		});

	// Decorate-sort-undecorate: the incoming order is the tie break, so equal
	// keys keep the order the projection already established.
	return nodes
		.map((node, index) => ({ node, index }))
		.sort((a, b) => {
			let result: number;
			if (sortBy === 'parent') {
				result = parent(a.node).localeCompare(parent(b.node), undefined, {
					numeric: true,
					sensitivity: 'base',
				});
				if (result === 0) result = byName(a.node, b.node);
			} else if (compareOwn) {
				result = compareOwn(a.node, b.node);
			} else {
				result = byName(a.node, b.node);
			}
			if (result !== 0) return dir * result;
			return a.index - b.index;
		})
		.map((entry) => entry.node);
}
