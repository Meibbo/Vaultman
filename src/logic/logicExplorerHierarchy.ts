/**
 * logicExplorerHierarchy — PURE, reusable hierarchy projections (Q4 lane A).
 *
 * Shared shaping helpers over a built `TreeNode[]` hierarchy that any explorer
 * domain can reuse. ZERO `obsidian`, DOM, or Svelte imports (spec AC#1).
 *
 * The first occupant is the tags Nested/Simple projection. SDF-007 / SDF-008
 * (ledger cluster 01 CONTRADICE -> ADOPT-stable): the corrected, stable
 * semantics are
 *
 *   - **Nested** = the level-1 roots WITH children — i.e. the full hierarchy is
 *     preserved (parents keep their descendants).
 *   - **Simple** = the level-1 roots WITHOUT children — i.e. only the childless
 *     top-level roots survive, and every root that has children is dropped.
 *
 * The old/wrong sandbox shape projected Simple as "all leaves at any depth"
 * (a recursive leaf collection). That is explicitly NOT what Simple means; this
 * module replaces it.
 */
import type { TreeNode } from '../types/typeTreeNode';

export type HierarchyMode = 'nested' | 'simple';

/**
 * Project a built root list into its Nested or Simple shape.
 *
 * - `'nested'` returns the input roots unchanged (full hierarchy, descendants
 *   preserved). The original array reference is returned so callers can cheaply
 *   detect the no-op.
 * - `'simple'` returns a NEW array containing only the level-1 roots that have
 *   no children (childless roots), each emitted with an empty `children` array.
 *   Roots that have children are dropped entirely (their descendants do NOT get
 *   hoisted — that was the old, misleading behavior).
 *
 * Pure: never mutates the input.
 */
export function projectNestedSimple<TMeta>(
	roots: readonly TreeNode<TMeta>[],
	mode: HierarchyMode,
): TreeNode<TMeta>[] {
	if (mode === 'nested') return roots as TreeNode<TMeta>[];
	return roots
		.filter((root) => !hasChildren(root))
		.map((root) => ({ ...root, children: [] }));
}

function hasChildren<TMeta>(node: TreeNode<TMeta>): boolean {
	return Array.isArray(node.children) && node.children.length > 0;
}
