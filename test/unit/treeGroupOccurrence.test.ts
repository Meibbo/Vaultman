import { describe, expect, it } from 'vitest';
import {
	collectGroupMemberIds,
	collectSelectedMembershipUrns,
	entityIdOf,
	NO_GROUP_ID,
	occurrenceOwnerOf,
	projectGroupedTree,
	rowIdForOccurrence,
} from '../../src/logic/logicTreeGroupProjection';
import type { TreeNode } from '../../src/types/typeTree';

type Meta = null;

const leaf = (id: string, label?: string): TreeNode<Meta> => ({
	id,
	label: label ?? id,
	depth: 0,
	meta: null,
});

/** Shallow depth fixup: roots at 0, children at 1, grandchildren at 2. */
function withDepths(
	node: TreeNode<Meta>,
	depth: number,
): TreeNode<Meta> {
	return {
		...node,
		depth,
		children: node.children?.map((child) => withDepths(child, depth + 1)),
	};
}

const pnode = (
	id: string,
	children: TreeNode<Meta>[],
	label?: string,
): TreeNode<Meta> =>
	withDepths(
		{ id, label: label ?? id, depth: 0, meta: null, children },
		0,
	);

const urnOf = (n: TreeNode<Meta>) => `test:item:${n.id}|${n.label}`;
const membershipsFor = (groups: Record<string, readonly string[]>) => groups;
const presetCustom = { kind: 'custom', direction: 'asc' } as const;

function allRowIds(tree: readonly TreeNode<Meta>[]): string[] {
	const out: string[] = [];
	const walk = (rows: readonly TreeNode<Meta>[]) => {
		for (const row of rows) {
			out.push(row.id);
			if (row.children?.length) walk(row.children);
		}
	};
	walk(tree);
	return out;
}

function descendantsByEntity(
	root: TreeNode<Meta> | undefined,
): string[] {
	const out: string[] = [];
	const walk = (rows: readonly TreeNode<Meta>[] | undefined) => {
		for (const row of rows ?? []) {
			out.push(entityIdOf(row));
			walk(row.children);
		}
	};
	walk(root?.children);
	return out;
}

describe('U130 Spec 01: identidad por ocurrencia', () => {
	it('entityIdOf conserva literalmente un id crudo con @', () => {
		expect(entityIdOf(leaf('user@domain'))).toBe('user@domain');
	});

	it('duplicado en dos grupos: dos rowIds, una identidad, un owner por ocurrencia', () => {
		const out = projectGroupedTree({
			nodes: [leaf('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({
				g1: ['test:item:b1|beta'],
				g2: ['test:item:b1|beta'],
			}),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const g1 = out.find((h) => h.id === 'g1');
		const g2 = out.find((h) => h.id === 'g2');
		const r1 = g1?.children?.[0];
		const r2 = g2?.children?.[0];
		expect(r1).toBeDefined();
		expect(r2).toBeDefined();
		expect(r1?.id).not.toBe(r2?.id);
		expect(r1?.id).toBe('b1@g1');
		expect(r2?.id).toBe('b1@g2');
		expect(entityIdOf(r1!)).toBe('b1');
		expect(entityIdOf(r2!)).toBe('b1');
		expect(occurrenceOwnerOf(r1!)).toBe('g1');
		expect(occurrenceOwnerOf(r2!)).toBe('g2');
		expect(r1?.occurrenceRoot).toBe('b1');
		expect(r2?.occurrenceRoot).toBe('b1');
	});

	it('gc-node vs p-node: el leaf clona solo la raiz; el p-node clona todo el subarbol', () => {
		const grandchild = leaf('n1', 'nieto');
		const child = pnode('c1', [grandchild], 'hijo');
		const parent = pnode('p1', [child], 'padre');
		const out = projectGroupedTree({
			nodes: [leaf('g1leaf', 'gc'), parent],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({
				g1: ['test:item:g1leaf|gc', 'test:item:p1|padre'],
				g2: ['test:item:g1leaf|gc', 'test:item:p1|padre'],
			}),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const occ1 = out
			.find((h) => h.id === 'g1')
			?.children?.find((c) => entityIdOf(c) === 'g1leaf');
		const occ2 = out
			.find((h) => h.id === 'g2')
			?.children?.find((c) => entityIdOf(c) === 'g1leaf');
		// gc-node: clon terminal en la raiz, sin hijos inventados ni perdidos.
		expect(occ1?.children ?? []).toHaveLength(0);
		expect(occ2?.children ?? []).toHaveLength(0);

		const p1 = out
			.find((h) => h.id === 'g1')
			?.children?.find((c) => entityIdOf(c) === 'p1');
		const p2 = out
			.find((h) => h.id === 'g2')
			?.children?.find((c) => entityIdOf(c) === 'p1');
		// p-node: el mismo conjunto visible en cada ocurrencia, por entidad.
		expect(descendantsByEntity(p1)).toEqual(['c1', 'n1']);
		expect(descendantsByEntity(p2)).toEqual(['c1', 'n1']);
	});

	it('clonacion recursiva: ningun duplicado queda con cero hijos y los hijos tienen rowIds unicos', () => {
		const parent = pnode('p1', [pnode('c1', [leaf('n1')])], 'padre');
		const out = projectGroupedTree({
			nodes: [parent],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({
				g1: ['test:item:p1|padre'],
				g2: ['test:item:p1|padre'],
			}),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const p1 = out
			.find((h) => h.id === 'g1')
			?.children?.find((c) => entityIdOf(c) === 'p1');
		const p2 = out
			.find((h) => h.id === 'g2')
			?.children?.find((c) => entityIdOf(c) === 'p1');
		expect(p1?.children).toHaveLength(1);
		expect(p2?.children).toHaveLength(1);
		expect(p1?.children?.[0].children).toHaveLength(1);
		expect(p2?.children?.[0].children).toHaveLength(1);
		// Entidad original conservada en raiz y descendientes.
		expect(entityIdOf(p1!.children![0])).toBe('c1');
		expect(entityIdOf(p1!.children![0].children![0])).toBe('n1');
		// Hijos clonados con rowIds unicos derivados de owner+root+ruta.
		const childIds = [
			p1?.children?.[0].id,
			p2?.children?.[0].id,
			p1?.children?.[0].children?.[0].id,
			p2?.children?.[0].children?.[0].id,
		];
		expect(new Set(childIds).size).toBe(childIds.length);
		expect(p1?.children?.[0].id).toContain('@g1');
		expect(p2?.children?.[0].id).toContain('@g2');
		expect(occurrenceOwnerOf(p1!.children![0])).toBe('g1');
		expect(p1?.children?.[0].occurrenceRoot).toBe('p1');
		// Depth desplazado exactamente una vez en todo el subarbol.
		expect(p1?.depth).toBe(1);
		expect(p1?.children?.[0].depth).toBe(2);
		expect(p1?.children?.[0].children?.[0].depth).toBe(3);
	});

	it('cero rowIds duplicados en un recorrido exhaustivo, incluso con `@` en la entidad', () => {
		const parent = pnode('user@domain', [leaf('c1')], 'con arroba');
		const out = projectGroupedTree({
			nodes: [parent, leaf('solo', 'unica')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({
				g1: ['test:item:user@domain|con arroba', 'test:item:solo|unica'],
				g2: ['test:item:user@domain|con arroba'],
			}),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const ids = allRowIds(out);
		expect(new Set(ids).size).toBe(ids.length);
		// La entidad con `@` no se trunca: la identidad es exacta.
		const atRows = out.flatMap((h) => h.children ?? []).filter(
			(c) => entityIdOf(c) === 'user@domain',
		);
		expect(atRows).toHaveLength(2);
		for (const row of atRows) expect(entityIdOf(row)).toBe('user@domain');
		// La entidad unica conserva su ID historico.
		const solo = out
			.flatMap((h) => h.children ?? [])
			.find((c) => entityIdOf(c) === 'solo');
		expect(solo?.id).toBe('solo');
	});

	it('toda raiz agrupada expone su owner, incluso no duplicada (Degroup selected)', () => {
		const out = projectGroupedTree({
			nodes: [leaf('a1', 'alfa'), leaf('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({ g1: ['test:item:a1|alfa'] }),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const single = out
			.find((h) => h.id === 'g1')
			?.children?.find((c) => entityIdOf(c) === 'a1');
		expect(single?.id).toBe('a1');
		expect(occurrenceOwnerOf(single!)).toBe('g1');
		expect(single?.occurrenceRoot).toBe('a1');
		expect(single?.entityId).toBe('a1');
	});

	it('colision con la cabecera: la ocurrencia unica no pisa el id del grupo', () => {
		const out = projectGroupedTree({
			nodes: [leaf('g1', 'choque')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({ g1: ['test:item:g1|choque'] }),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const ids = allRowIds(out);
		expect(new Set(ids).size).toBe(ids.length);
		const member = out
			.find((h) => h.id === 'g1')
			?.children?.find((c) => entityIdOf(c) === 'g1');
		expect(member).toBeDefined();
		expect(member?.id).not.toBe('g1');
		expect(entityIdOf(member!)).toBe('g1');
		expect(occurrenceOwnerOf(member!)).toBe('g1');
	});

	it('helpers consumen entityId explicito: deduplican por entidad y aceptan rowId o entidad', () => {
		const parent = pnode('p1', [leaf('c1')], 'padre');
		const out = projectGroupedTree({
			nodes: [parent],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: membershipsFor({
				g1: ['test:item:p1|padre'],
				g2: ['test:item:p1|padre'],
			}),
			providerId: 'test',
			urnOf,
			preset: presetCustom,
			noGroupLabel: 'No group',
			filtered: false,
		});
		const g1 = out.find((h) => h.id === 'g1');
		// collectGroupMemberIds recorre descendientes clonados y deduplica.
		expect(collectGroupMemberIds(g1?.children)).toEqual(['p1', 'c1']);
		// Seleccionar una ocurrencia por rowId y la otra por entidad colapsa a una URN.
		const urns = collectSelectedMembershipUrns(
			out,
			new Set(['p1@g1', 'p1']),
			(node) => `urn:${entityIdOf(node)}`,
			new Set(['g1', 'g2']),
		);
		expect(urns).toEqual(['urn:p1']);
		// rowIdForOccurrence es la unica forma canonica de componer rowIds.
		expect(rowIdForOccurrence('b1', 'g1')).toBe('b1@g1');
		expect(
			rowIdForOccurrence('c1', 'g1', { rootEntityId: 'p1', relPath: '0' }),
		).toBe('c1@g1::p1::0');
	});

	it('reordenar (sort) tras proyectar no pierde la correspondencia entity/occurrence', () => {
		const project = (ordered: TreeNode<Meta>[]) =>
			projectGroupedTree({
				nodes: ordered,
				groups: [
					{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
					{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
				],
				memberships: membershipsFor({
					g1: ['test:item:a1|alfa', 'test:item:shared|s'],
					g2: ['test:item:b1|beta', 'test:item:shared|s'],
				}),
				providerId: 'test',
				urnOf,
				preset: presetCustom,
				noGroupLabel: 'No group',
				filtered: false,
			});
		const base = project([leaf('a1', 'alfa'), leaf('b1', 'beta'), leaf('shared', 's')]);
		const sorted = project([leaf('shared', 's'), leaf('b1', 'beta'), leaf('a1', 'alfa')]);
		const entitiesOf = (tree: readonly TreeNode<Meta>[], header: string) =>
			tree
				.find((h) => h.id === header)
				?.children?.map((c) => entityIdOf(c))
				.sort();
		expect(entitiesOf(base, 'g1')).toEqual(entitiesOf(sorted, 'g1'));
		expect(entitiesOf(base, 'g2')).toEqual(entitiesOf(sorted, 'g2'));
		expect(
			sorted
				.find((h) => h.id === 'g1')
				?.children?.find((c) => entityIdOf(c) === 'shared')?.membershipOwner,
		).toBe('g1');
		expect(NO_GROUP_ID).toBe('vaultman.group.none');
	});
});
