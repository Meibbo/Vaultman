import { describe, expect, it } from 'vitest';
import {
	groupsForTarget,
	isCanonicalScopedGroupKey,
	isLegacyCustomGroupKey,
	makeScopedGroupKey,
	membershipsForTarget,
	normalizeScopedCustomGroups,
	parseScopedGroupKey,
	scopedNameOf,
	scopedTargetOf,
} from '../../src/logic/logicScopedCustomGroups';
import { resolveCustomGroups } from '../../src/logic/logicTreeGroupProjection';

describe('U130-GGC-011: nucleo de identidad custom por target', () => {
	it('mismo nombre en all/level:2/parent produce IDs distintos', () => {
		const all = makeScopedGroupKey('all', 'Mismo');
		const level = makeScopedGroupKey('level:2', 'Mismo');
		const parent = makeScopedGroupKey('parent:carpeta-a', 'Mismo');
		expect(new Set([all, level, parent]).size).toBe(3);
		expect(parseScopedGroupKey(all)).toEqual({
			target: 'all',
			name: 'Mismo',
			legacy: false,
		});
		expect(parseScopedGroupKey(level)).toEqual({
			target: 'level:2',
			name: 'Mismo',
			legacy: false,
		});
		expect(parseScopedGroupKey(parent)).toEqual({
			target: 'parent:carpeta-a',
			name: 'Mismo',
			legacy: false,
		});
	});

	it('resolveCustomGroups emite id=clave interna, label=nombre, scope=target', () => {
		const memberships = {
			[makeScopedGroupKey('all', 'Mismo')]: ['files:file:a|a'],
			[makeScopedGroupKey('level:2', 'Mismo')]: ['files:file:b|b'],
			[makeScopedGroupKey('parent:carpeta-a', 'Mismo')]: ['files:file:c|c'],
		};
		const groups = resolveCustomGroups(memberships);
		expect(groups).toHaveLength(3);
		expect(groups.map((group) => group.label)).toEqual([
			'Mismo',
			'Mismo',
			'Mismo',
		]);
		expect(groups.map((group) => group.scope)).toEqual([
			'all',
			'level:2',
			'parent:carpeta-a',
		]);
		expect(groups.map((group) => group.id)).toEqual(
			Object.keys(memberships),
		);
		expect(groups.every((group) => group.flavor === 'custom')).toBe(true);
		expect(
			groupsForTarget(groups, 'level:2').map((group) => group.scope),
		).toEqual(['level:2']);
		expect(
			Object.keys(membershipsForTarget(memberships, 'all')),
		).toEqual([makeScopedGroupKey('all', 'Mismo')]);
	});

	it('clave legacy sin prefijo se lee como target all', () => {
		const groups = resolveCustomGroups({ Favoritos: ['files:file:a|a'] });
		expect(groups).toEqual([
			{
				id: 'Favoritos',
				flavor: 'custom',
				label: 'Favoritos',
				parentId: null,
				scope: 'all',
			},
		]);
		expect(isLegacyCustomGroupKey('Favoritos')).toBe(true);
		expect(isLegacyCustomGroupKey(makeScopedGroupKey('all', 'Foo'))).toBe(
			false,
		);
		expect(scopedTargetOf('Favoritos')).toBe('all');
		expect(scopedNameOf('Favoritos')).toBe('Favoritos');
	});

	it('roundtrip Unicode en nombre y parentId', () => {
		const name = 'Café 🎉 / mañana: 100%';
		const parent = 'padre/niño 🎈: raíz';
		for (const target of [
			'all',
			'level:3',
			`parent:${parent}`,
		] as const) {
			const key = makeScopedGroupKey(target, name);
			const parsed = parseScopedGroupKey(key);
			expect(parsed.target).toBe(target);
			expect(parsed.name).toBe(name);
			expect(parsed.legacy).toBe(false);
			expect(isCanonicalScopedGroupKey(key)).toBe(true);
		}
		// El parentId con separadores y Unicode sobrevive al codec.
		const parentKey = makeScopedGroupKey(`parent:${parent}`, name);
		expect(parseScopedGroupKey(parentKey)).toEqual({
			target: `parent:${parent}`,
			name,
			legacy: false,
		});
	});

	it('normalizacion idempotente que preserva URNs', () => {
		const input = {
			Favoritos: ['files:file:b|b', 'files:file:a|a'],
			[makeScopedGroupKey('level:2', 'Vals')]: ['props:value:x|x'],
			[makeScopedGroupKey('parent:p1', 'Caja')]: [],
		};
		const first = normalizeScopedCustomGroups(input);
		expect(first.conflicts).toEqual([]);
		expect(first.memberships).toEqual({
			[makeScopedGroupKey('all', 'Favoritos')]: [
				'files:file:b|b',
				'files:file:a|a',
			],
			[makeScopedGroupKey('level:2', 'Vals')]: ['props:value:x|x'],
			[makeScopedGroupKey('parent:p1', 'Caja')]: [],
		});
		const second = normalizeScopedCustomGroups(first.memberships);
		expect(second.conflicts).toEqual([]);
		expect(second.memberships).toEqual(first.memberships);
		// resolveCustomGroups lee el mapa normalizado sin perder miembros.
		const groups = resolveCustomGroups(first.memberships);
		expect(groups.map((group) => group.scope).sort()).toEqual([
			'all',
			'level:2',
			'parent:p1',
		]);
	});

	it('colision legacy vs canonica: conserva la primera y la reporta', () => {
		const legacyKey = 'Foo';
		const canonicalKey = makeScopedGroupKey('all', 'Foo');
		const { memberships, conflicts } = normalizeScopedCustomGroups({
			[legacyKey]: ['files:file:a|a'],
			[canonicalKey]: ['files:file:b|b'],
		});
		// La normalizacion con conflicto no devuelve un mapa con pérdida.
		expect(memberships).toEqual({
			[legacyKey]: ['files:file:a|a'],
			[canonicalKey]: ['files:file:b|b'],
		});
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]?.canonical).toBe(canonicalKey);
		expect(conflicts[0]?.kept).toBe(legacyKey);
		expect(conflicts[0]?.dropped).toEqual([
			{ key: canonicalKey, urns: ['files:file:b|b'] },
		]);
	});

	it('claves malformadas se degradan a legacy sin lanzar', () => {
		for (const key of ['all:', 'all:Foo', 'level:x:Foo', 'level:0:Foo', 'level:2:Foo', 'parent:solo']) {
			expect(parseScopedGroupKey(key)).toEqual({
				target: 'all',
				name: key,
				legacy: true,
			});
			expect(resolveCustomGroups({ [key]: [] })[0]?.scope).toBe('all');
		}
	});
});
