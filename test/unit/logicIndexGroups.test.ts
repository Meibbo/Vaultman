import { describe, expect, it } from 'vitest';

import { buildIndexGroups } from '../../src/logic/logicIndexGroups';

function refs(...labels: string[]) {
	return labels.map((label, i) => ({ id: `id-${i}-${label}`, label }));
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
