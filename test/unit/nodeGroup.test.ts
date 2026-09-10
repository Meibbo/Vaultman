import { describe, expect, it } from 'vitest';

import { canNest, canAddMember } from '../../src/logic/logicNodeGroup';

const custom = (id: string, parentId: string | null = null) => ({
	id,
	flavor: 'custom' as const,
	label: id,
	parentId,
	scope: 'all' as const,
});
const preset = (id: string, parentId: string | null = null) => ({
	id,
	flavor: 'preset' as const,
	label: id,
	parentId,
	scope: 'all' as const,
});

describe('U130-03 anidacion de grupos', () => {
	const tree = [custom('a'), custom('b', 'a'), preset('p', 'b')];

	it('un custom anida bajo otro custom', () => {
		expect(canNest(tree, 'b', 'a')).toEqual({ ok: true });
	});

	it('un custom NO puede anidar bajo su propio descendiente', () => {
		expect(canNest(tree, 'a', 'b')).toEqual({
			ok: false,
			reason: 'would-create-cycle',
		});
	});

	it('nada anida bajo un preset: es gc-node terminal', () => {
		// El ciclo no se detecta, se vuelve INEXPRESABLE: un preset nunca puede
		// estar en mitad de una cadena.
		expect(canNest(tree, 'b', 'p')).toEqual({
			ok: false,
			reason: 'preset-is-terminal',
		});
	});
});

describe('U130-03 canAddMember', () => {
	it('un grupo de properties no admite un value', () => {
		const g = { ...custom('g'), scope: 'properties' as const };
		expect(canAddMember(g, { kind: 'value' })).toBe(false);
		expect(canAddMember(g, { kind: 'prop' })).toBe(true);
	});

	it('un grupo `all` admite cualquier kind', () => {
		expect(canAddMember(custom('g'), { kind: 'value' })).toBe(true);
	});
});
