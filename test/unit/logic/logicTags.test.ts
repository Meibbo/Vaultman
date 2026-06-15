import { describe, it, expect } from 'vitest';
import {
	buildTagTree,
	filterTagTree,
	tagDomainKey,
	tagNodeId,
	type TagNodeMeta,
} from '../../../src/logic/logicTags';
import type { TreeNode } from '../../../src/types/typeTreeNode';

describe('buildTagTree', () => {
	it('builds a nested tree from slash-separated tag paths with namespaced ids', () => {
		const tree = buildTagTree({ '#projects/work': 3, '#projects/home': 1, '#ideas': 5 });
		const projects = tree.find((n) => n.id === 'tag.projects');
		expect(projects).toBeDefined();
		expect(projects!.meta.tagPath).toBe('projects');
		expect(projects!.children?.map((c) => c.label).sort()).toEqual(['home', 'work']);
		expect(projects!.children?.map((c) => c.id).sort()).toEqual([
			'tag.projects/home',
			'tag.projects/work',
		]);
		expect(tree.find((n) => n.id === 'tag.ideas')?.count).toBe(5);
	});

	it('emits relation holarchy and depth on every node', () => {
		const tree = buildTagTree({ '#a/b': 1 });
		const a = tree.find((n) => n.id === 'tag.a')!;
		expect(a.relation).toBe('holarchy');
		expect(a.depth).toBe(0);
		const b = a.children![0];
		expect(b.relation).toBe('holarchy');
		expect(b.depth).toBe(1);
		expect(b.meta.tagPath).toBe('a/b');
	});

	it('parent count is the leaf count when the parent tag is also written explicitly', () => {
		const tree = buildTagTree({ '#a': 7, '#a/b': 2 });
		const a = tree.find((n) => n.id === 'tag.a');
		expect(a?.count).toBe(7);
		expect(a?.children?.[0].count).toBe(2);
	});

	it('intermediate-only paths get count 0', () => {
		const tree = buildTagTree({ '#a/b': 2 });
		expect(tree.find((n) => n.id === 'tag.a')?.count).toBe(0);
	});

	it('preserves tag path casing (no lowercase merge)', () => {
		const tree = buildTagTree({ '#Project': 1, '#project': 1 });
		expect(tree.map((n) => n.meta.tagPath).sort()).toEqual(['Project', 'project']);
	});

	it('returns an empty tree for empty/missing input', () => {
		expect(buildTagTree({})).toEqual([]);
		expect(buildTagTree(undefined as unknown as Record<string, number>)).toEqual([]);
	});
});

describe('tag id + domain key helpers', () => {
	it('namespaces ids and derives the raw `#`-prefixed domain key', () => {
		expect(tagNodeId('projects/work')).toBe('tag.projects/work');
		const meta: TagNodeMeta = { tagPath: 'projects/work' };
		expect(tagDomainKey(meta)).toBe('#projects/work');
	});
});

describe('filterTagTree', () => {
	function tree(): TreeNode<TagNodeMeta>[] {
		return buildTagTree({ '#projects/work': 1, '#projects/home': 1, '#unrelated': 1 });
	}

	it('keeps a parent if any descendant matches', () => {
		const filtered = filterTagTree(tree(), 'work');
		expect(filtered.find((n) => n.id === 'tag.projects')?.children?.[0].label).toBe('work');
		expect(filtered.find((n) => n.id === 'tag.unrelated')).toBeUndefined();
	});

	it('matches case-insensitively', () => {
		const filtered = filterTagTree(tree(), 'WORK');
		expect(filtered.find((n) => n.id === 'tag.projects')?.children?.[0].label).toBe('work');
	});

	it('empty term short-circuits to the original reference', () => {
		const t = tree();
		expect(filterTagTree(t, '')).toBe(t);
	});
});
