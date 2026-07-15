import { describe, expect, it } from 'vitest';

import {
	buildIndexGroups,
	indexLevel,
	scopeAfterExpansionChange,
} from '../../src/logic/logicIndexGroups';

function refs(...labels: string[]) {
	return labels.map((label, i) => ({
		id: `id-${i}-${label}`,
		label,
		isContainer: false,
	}));
}

describe('buildIndexGroups', () => {
	it('keys by the upper-cased first glyph and merges case', () => {
		const groups = buildIndexGroups(refs('alpha', 'Arbol', 'beta'));
		expect(groups.map((g) => g.key)).toEqual(['A', 'B']);
		expect(groups[0].count).toBe(2);
	});

	it('preserves caller (explorer) order instead of re-sorting', () => {
		const groups = buildIndexGroups(refs('zeta', 'apple', 'mango'));
		expect(groups.map((g) => g.key)).toEqual(['Z', 'A', 'M']);
	});

	it('firstId is the first node in caller order for each glyph', () => {
		const groups = buildIndexGroups(refs('zeta', 'zulu', 'apple'));
		expect(groups.find((g) => g.key === 'Z')?.firstId).toBe('id-0-zeta');
	});

	it('indexes sigils and digits by their literal first glyph', () => {
		const groups = buildIndexGroups(refs('_templates', '+maps', '2do', 'notes'));
		expect(groups.map((g) => g.key)).toEqual(['_', '+', '2', 'N']);
	});

	it('skips unnamed nodes without inventing a bucket', () => {
		const groups = buildIndexGroups(refs('zed', '', '   ', 'ann'));
		expect(groups.map((g) => g.key)).toEqual(['Z', 'A']);
	});

	it('keeps each key to one complete glyph (unicode)', () => {
		const groups = buildIndexGroups(refs('ávila', '𐐨uro', 'ñu'));
		expect(groups.every((g) => Array.from(g.key).length === 1)).toBe(true);
		expect(groups.find((g) => g.firstId === 'id-0-ávila')?.key).toBe('Á');
	});

	it('returns a single group untouched (visibility >1 rule lives in the component)', () => {
		expect(buildIndexGroups(refs('a1', 'a2'))).toHaveLength(1);
	});

	it('tolerates null/undefined input', () => {
		expect(buildIndexGroups(null)).toEqual([]);
		expect(buildIndexGroups(undefined)).toEqual([]);
	});
});

describe('indexLevel', () => {
	const tree = [
		{
			id: 'folderA',
			label: 'Alpha',
			children: [
				{ id: 'a/one.md', label: 'one' },
				{ id: 'a/sub', label: 'sub', children: [{ id: 'a/sub/deep.md', label: 'deep' }] },
			],
		},
		{ id: 'root.md', label: 'root' },
	];
	const isContainer = (n: { children?: unknown[] }) =>
		(n.children?.length ?? 0) > 0;

	it('projects the top level with container flags when rootId is null', () => {
		const level = indexLevel(tree, null, isContainer);
		expect(level).toEqual([
			{ id: 'folderA', label: 'Alpha', isContainer: true },
			{ id: 'root.md', label: 'root', isContainer: false },
		]);
	});

	it('drills into a node and returns its direct children', () => {
		const level = indexLevel(tree, 'folderA', isContainer);
		expect(level.map((n) => n.id)).toEqual(['a/one.md', 'a/sub']);
		expect(level.find((n) => n.id === 'a/sub')?.isContainer).toBe(true);
	});

	it('returns empty for an unknown or leaf rootId', () => {
		expect(indexLevel(tree, 'missing', isContainer)).toEqual([]);
		expect(indexLevel(tree, 'root.md', isContainer)).toEqual([]);
	});
});

describe('scopeAfterExpansionChange', () => {
	const parents = new Map<string, string | null>([
		['projects', null],
		['projects/alpha', 'projects'],
		['projects/alpha/deep', 'projects/alpha'],
		['archive', null],
	]);
	const parentForNode = (id: string) => parents.get(id) ?? null;

	it('returns to the top level after collapse-all', () => {
		expect(
			scopeAfterExpansionChange(
				'projects/alpha/deep',
				{ type: 'collapse-all' },
				parentForNode,
			),
		).toBeNull();
	});

	it('moves to the parent when the current scoped node collapses', () => {
		expect(
			scopeAfterExpansionChange(
				'projects/alpha',
				{ type: 'collapse-node', id: 'projects/alpha' },
				parentForNode,
			),
		).toBe('projects');
	});

	it('moves above a collapsed ancestor of the current scope', () => {
		expect(
			scopeAfterExpansionChange(
				'projects/alpha/deep',
				{ type: 'collapse-node', id: 'projects/alpha' },
				parentForNode,
			),
		).toBe('projects');
	});

	it('preserves the scope when an unrelated branch collapses', () => {
		expect(
			scopeAfterExpansionChange(
				'projects/alpha/deep',
				{ type: 'collapse-node', id: 'archive' },
				parentForNode,
			),
		).toBe('projects/alpha/deep');
	});

	it('returns to top when a top-level scope collapses', () => {
		expect(
			scopeAfterExpansionChange(
				'projects',
				{ type: 'collapse-node', id: 'projects' },
				parentForNode,
			),
		).toBeNull();
	});

	it('terminates safely when a broken parent resolver contains a cycle', () => {
		expect(
			scopeAfterExpansionChange(
				'projects/alpha',
				{ type: 'collapse-node', id: 'archive' },
				() => 'projects/alpha',
			),
		).toBe('projects/alpha');
	});
});
