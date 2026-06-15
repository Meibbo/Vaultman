import { describe, it, expect } from 'vitest';
import { projectNestedSimple } from '../../../src/logic/logicExplorerHierarchy';
import { buildTagTree } from '../../../src/logic/logicTags';
import type { TreeNode } from '../../../src/types/typeTreeNode';

/**
 * SDF-007 / SDF-008 corrected semantics (ledger cluster 01 CONTRADICE ->
 * ADOPT-stable):
 *   - Nested = level-1 roots WITH children (full hierarchy preserved).
 *   - Simple = level-1 roots WITHOUT children (childless roots only).
 * The old/wrong sandbox shape was "Simple = all leaves at any depth"; these
 * tests pin the corrected behavior.
 */

function tagTree(): TreeNode<{ tagPath: string }>[] {
	// roots: `projects` (has children), `ideas` (has children), `inbox` (childless).
	return buildTagTree({
		'#projects/work': 1,
		'#projects/home': 1,
		'#ideas/new': 1,
		'#inbox': 1,
	});
}

describe('projectNestedSimple — SDF-008', () => {
	it('Nested returns the roots-with-children hierarchy unchanged', () => {
		const roots = tagTree();
		const nested = projectNestedSimple(roots, 'nested');

		// No-op: same reference, descendants preserved.
		expect(nested).toBe(roots);
		const projects = nested.find((n) => n.meta.tagPath === 'projects');
		expect(projects?.children?.map((c) => c.meta.tagPath).sort()).toEqual([
			'projects/home',
			'projects/work',
		]);
	});

	it('Simple keeps only childless level-1 roots and drops roots that have children', () => {
		const simple = projectNestedSimple(tagTree(), 'simple');

		// `inbox` is the only childless root; `projects` and `ideas` are dropped.
		expect(simple.map((n) => n.meta.tagPath)).toEqual(['inbox']);
		expect(simple.every((n) => (n.children ?? []).length === 0)).toBe(true);
	});

	it('Simple does NOT hoist nested leaves to the top level (old/wrong shape)', () => {
		const simple = projectNestedSimple(tagTree(), 'simple');
		const paths = simple.map((n) => n.meta.tagPath);
		expect(paths).not.toContain('projects/work');
		expect(paths).not.toContain('ideas/new');
	});

	it('Simple returns a new array and does not mutate the input roots', () => {
		const roots = tagTree();
		const before = roots.map((n) => n.meta.tagPath);
		const simple = projectNestedSimple(roots, 'simple');
		expect(simple).not.toBe(roots);
		expect(roots.map((n) => n.meta.tagPath)).toEqual(before);
	});

	it('all-childless roots survive Simple intact', () => {
		const roots = buildTagTree({ '#a': 1, '#b': 1 });
		const simple = projectNestedSimple(roots, 'simple');
		expect(simple.map((n) => n.meta.tagPath).sort()).toEqual(['a', 'b']);
	});
});
