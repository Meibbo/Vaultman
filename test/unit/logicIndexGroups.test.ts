import { describe, expect, it } from 'vitest';

import {
	buildIndexGroups,
	INDEX_FALLBACK_KEY,
} from '../../src/logic/logicIndexGroups';

function refs(...labels: string[]) {
	return labels.map((label, i) => ({ id: `id-${i}-${label}`, label }));
}

describe('buildIndexGroups', () => {
	it('groups by uppercased first letter of the label', () => {
		const groups = buildIndexGroups(refs('alpha', 'Arbol', 'beta'));
		expect(groups.map((g) => g.key)).toEqual(['A', 'B']);
		expect(groups[0].count).toBe(2);
		expect(groups[1].count).toBe(1);
	});

	it('keeps firstId in caller node order (current sort contract)', () => {
		const groups = buildIndexGroups(refs('zeta', 'zulu', 'apple'));
		const z = groups.find((g) => g.key === 'Z');
		expect(z?.firstId).toBe('id-0-zeta');
	});

	it('buckets digits per digit and orders them numerically before letters', () => {
		const groups = buildIndexGroups(refs('10 things', '2 do', 'notes'));
		expect(groups.map((g) => g.key)).toEqual(['1', '2', 'N']);
	});

	it('indexes sigil-prefixed labels by their first real glyph', () => {
		const groups = buildIndexGroups(refs('_templates', '+maps', 'notes'));
		expect(groups.map((g) => g.key)).toEqual(['M', 'N', 'T']);
	});

	it('sends only glyph-less labels to # and sorts # last', () => {
		const groups = buildIndexGroups(refs('_draft', '', '  ', '#tag', 'zed'));
		expect(groups.map((g) => g.key)).toEqual(['D', 'T', 'Z', INDEX_FALLBACK_KEY]);
		expect(groups.find((g) => g.key === INDEX_FALLBACK_KEY)?.count).toBe(2);
	});

	it('handles unicode letters as their own uppercase buckets', () => {
		const groups = buildIndexGroups(refs('ávila', 'ñu', 'nube'));
		expect(groups.map((g) => g.key)).toContain('Á');
		expect(groups.map((g) => g.key)).toContain('Ñ');
		expect(groups.map((g) => g.key)).toContain('N');
	});

	it('keeps unicode buckets to one complete glyph', () => {
		const groups = buildIndexGroups(refs('𐐨uro', 'ßeta', 'alpha'));
		expect(groups.find((group) => group.firstId === 'id-0-𐐨uro')?.key).toBe(
			'𐐀',
		);
		expect(groups.find((group) => group.firstId === 'id-1-ßeta')?.key).toBe(
			'S',
		);
		expect(groups.every((group) => Array.from(group.key).length === 1)).toBe(
			true,
		);
	});

	it('returns single group untouched (visibility >1 rule lives in the component)', () => {
		const groups = buildIndexGroups(refs('a1', 'a2'));
		expect(groups).toHaveLength(1);
	});

	it('tolerates null/undefined input', () => {
		expect(buildIndexGroups(null)).toEqual([]);
		expect(buildIndexGroups(undefined)).toEqual([]);
	});
});
