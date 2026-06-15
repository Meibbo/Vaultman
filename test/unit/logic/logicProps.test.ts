import { describe, it, expect } from 'vitest';
import {
	buildPropTree,
	filterPropTree,
	isCompatible,
	propDomainKey,
	propNodeId,
	propValueNodeId,
	sortPropValuesByFrequency,
	type PropNodeMeta,
	type PropTreeSource,
} from '../../../src/logic/logicProps';
import type { TreeNode } from '../../../src/types/typeTreeNode';

/**
 * Pure `logicProps` contract (Q4 slice 2). No `obsidian`/`app` — the builder takes
 * plain index rows + a `prop -> type` map. Covers tree shape, namespaced ids, raw
 * domain keys, honest casing, value-frequency sort, type-incompatibility, and the
 * mode 0/1 filter semantics.
 */

function source(rows: PropTreeSource[]): PropTreeSource[] {
	return rows;
}

describe('buildPropTree', () => {
	it('builds a 2-level prop -> value tree with counts and holarchy relation', () => {
		const tree = buildPropTree(
			source([
				{ property: 'status', valueFrequencies: { draft: 1, done: 1 }, fileCount: 2 },
			]),
			{ status: { type: 'text' } },
		);

		const status = tree.find((n) => n.label === 'status');
		expect(status).toBeDefined();
		expect(status!.count).toBe(2);
		expect(status!.relation).toBe('holarchy');
		expect(status!.meta.isValueNode).toBe(false);
		expect(status!.children?.map((c) => c.label).sort()).toEqual(['done', 'draft']);
		expect(status!.children?.every((c) => c.relation === 'holarchy')).toBe(true);
	});

	it('emits D6 namespaced ids (note.<prop>, note.<prop>::<rawValue>) but keeps raw value in meta', () => {
		const tree = buildPropTree(
			source([{ property: 'status', valueFrequencies: { draft: 3 }, fileCount: 1 }]),
			{ status: { type: 'text' } },
		);

		const prop = tree[0];
		const value = prop.children![0];
		expect(prop.id).toBe('note.status');
		expect(value.id).toBe('note.status::draft');
		expect(value.label).toBe('draft');
		expect(value.meta.rawValue).toBe('draft');
		// raw domain key stays un-namespaced for filter toggles / reveal
		expect(propDomainKey(prop.meta)).toBe('status');
		expect(propDomainKey(value.meta)).toBe('status::draft');
	});

	it('honest casing: distinct-cased keys are NOT merged and type lookup is case-sensitive', () => {
		const tree = buildPropTree(
			source([
				{ property: 'Status', valueFrequencies: { A: 1 }, fileCount: 1 },
				{ property: 'status', valueFrequencies: { b: 1 }, fileCount: 1 },
			]),
			// only the capitalized key declares a number type; lowercase falls back to text
			{ Status: { type: 'number' } },
		);

		expect(tree.map((n) => n.label).sort()).toEqual(['Status', 'status']);
		expect(tree.find((n) => n.label === 'Status')!.meta.propType).toBe('number');
		expect(tree.find((n) => n.label === 'status')!.meta.propType).toBe('text');
		expect(tree.map((n) => n.id).sort()).toEqual(['note.Status', 'note.status']);
	});

	it('sorts value nodes by frequency (desc) and top-level props by fileCount (desc)', () => {
		const tree = buildPropTree(
			source([
				{ property: 'low', valueFrequencies: {}, fileCount: 1 },
				{ property: 'high', valueFrequencies: { rare: 1, common: 5, mid: 3 }, fileCount: 9 },
			]),
			{},
		);

		expect(tree.map((n) => n.label)).toEqual(['high', 'low']);
		expect(tree[0].children?.map((c) => c.label)).toEqual(['common', 'mid', 'rare']);
	});

	it('flags isTypeIncompatible when a value does not satisfy the declared type', () => {
		const tree = buildPropTree(
			source([{ property: 'age', valueFrequencies: { 'not-a-number': 1 }, fileCount: 1 }]),
			{ age: { type: 'number' } },
		);

		expect(tree[0].children![0].meta.isTypeIncompatible).toBe(true);
	});

	it('does not mutate the input rows', () => {
		const rows = source([
			{ property: 'b', valueFrequencies: { y: 1 }, fileCount: 1 },
			{ property: 'a', valueFrequencies: { x: 1 }, fileCount: 2 },
		]);
		const snapshot = JSON.stringify(rows);
		buildPropTree(rows, {});
		expect(JSON.stringify(rows)).toBe(snapshot);
	});
});

describe('isCompatible', () => {
	it('treats text/list/multitext/unknown as always compatible', () => {
		expect(isCompatible('anything', 'text')).toBe(true);
		expect(isCompatible('anything', 'list')).toBe(true);
		expect(isCompatible('anything', 'multitext')).toBe(true);
	});

	it('validates number / checkbox / date / datetime values', () => {
		expect(isCompatible('42', 'number')).toBe(true);
		expect(isCompatible('nope', 'number')).toBe(false);
		expect(isCompatible('true', 'checkbox')).toBe(true);
		expect(isCompatible('maybe', 'checkbox')).toBe(false);
		expect(isCompatible('2026-06-14', 'date')).toBe(true);
		expect(isCompatible('2026/06/14', 'date')).toBe(false);
	});
});

describe('sortPropValuesByFrequency', () => {
	it('orders by count desc and is stable for equal counts', () => {
		const nodes: TreeNode<PropNodeMeta>[] = [
			{ id: 'a', label: 'a', count: 1, depth: 1, meta: {} as PropNodeMeta },
			{ id: 'b', label: 'b', count: 5, depth: 1, meta: {} as PropNodeMeta },
			{ id: 'c', label: 'c', count: 1, depth: 1, meta: {} as PropNodeMeta },
		];
		expect(sortPropValuesByFrequency(nodes).map((n) => n.label)).toEqual(['b', 'a', 'c']);
		// input untouched
		expect(nodes.map((n) => n.label)).toEqual(['a', 'b', 'c']);
	});
});

describe('filterPropTree', () => {
	function tree(): TreeNode<PropNodeMeta>[] {
		return buildPropTree(
			source([
				{ property: 'status', valueFrequencies: { draft: 1, done: 1 }, fileCount: 2 },
			]),
			{ status: { type: 'text' } },
		);
	}

	it('mode 0 (Property name): keeps all child values when the parent matches', () => {
		const filtered = filterPropTree(tree(), 'status', 0);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].children?.length).toBe(2);
	});

	it('mode 1 (Value): keeps only the matching child', () => {
		const filtered = filterPropTree(tree(), 'draft', 1);
		const status = filtered.find((n) => n.id === propNodeId('status'));
		expect(status?.children?.map((c) => c.label)).toEqual(['draft']);
	});

	it('matching is case-insensitive on the label', () => {
		const filtered = filterPropTree(tree(), 'STATUS', 0);
		expect(filtered).toHaveLength(1);
	});

	it('empty term returns the original reference', () => {
		const t = tree();
		expect(filterPropTree(t, '', 0)).toBe(t);
	});
});

describe('id + domain-key helpers', () => {
	it('namespace props and values consistently', () => {
		expect(propNodeId('Tags')).toBe('note.Tags');
		expect(propValueNodeId('Tags', 'x')).toBe('note.Tags::x');
	});

	it('propDomainKey returns the raw (un-namespaced) key', () => {
		expect(propDomainKey({ propName: 'p', propType: 'text', isValueNode: false })).toBe('p');
		expect(
			propDomainKey({ propName: 'p', propType: 'text', isValueNode: true, rawValue: 'v' }),
		).toBe('p::v');
	});
});
