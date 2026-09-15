import { describe, expect, it } from 'vitest';
import {
	isGroupHeader,
	NO_GROUP_ID,
	PRESET_GROUP_PREFIX,
	projectGroupedTree,
	resolveCustomGroups,
} from '../../src/logic/logicTreeGroupProjection';
import { bubbleMemberCountsToGroups } from '../../src/logic/logicBadgeBubbling';
import type { TreeNode } from '../../src/types/typeTree';

const node = (id: string, label: string): TreeNode<null> => ({
	id,
	label,
	depth: 0,
	meta: null,
});

const nodes = [
	node('a1', 'alfa'),
	node('b1', 'beta'),
	node('a2', 'ancla'),
];

const NO_GROUP = 'Sin grupo';

describe('U130-03: cabeceras de grupo en el arbol', () => {
	it('reparte los nodos bajo cabeceras y los saca del nivel raiz', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(out.map((group) => group.label)).toEqual(['A', 'B']);
		expect(out[0].children?.map((child) => child.id)).toEqual(['a1', 'a2']);
		expect(out[1].children?.map((child) => child.id)).toEqual(['b1']);
	});

	it('la cabecera es un TreeNode con caret y clase propia, no un componente', () => {
		// viewTree ya aplica node.cls y ya gobierna el colapso con expandedIds.
		const [header] = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(header.showCaret).toBe(true);
		expect(header.cls).toContain('vaultman-tree-row--group-header');
		expect(header.depth).toBe(0);
		expect(header.count).toBe(2);
	});

	it('los hijos bajan un nivel de profundidad', () => {
		const [header] = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(header.children?.every((child) => child.depth === 1)).toBe(true);
	});

	it('sin grupos activos devuelve la lista TAL CUAL', () => {
		// Regresion cero: si nadie activo la agrupacion, el arbol no cambia ni un
		// nodo. Es la puerta que protege a los cinco explorers.
		const out = projectGroupedTree({
			nodes,
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: NO_GROUP,
			filtered: false,
			enabled: false,
		});
		expect(out).toBe(nodes);
	});

	it('los miembros de un grupo custom van a su grupo, no al preset', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Favoritos', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:beta|beta'] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const favoritos = out.find((group) => group.label === 'Favoritos');
		expect(favoritos?.children?.map((child) => child.id)).toEqual(['b1']);
	});

	it('los nodos sin pertenencia caen en "no group", que va el ULTIMO', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Favoritos', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:beta|beta'] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const last = out[out.length - 1];
		expect(last.label).toBe(NO_GROUP);
		expect(last.children?.map((child) => child.id)).toEqual(['a1', 'a2']);
	});

	it('"no group" no se puede borrar ni renombrar: no lleva id de grupo custom', () => {
		const out = projectGroupedTree({
			nodes,
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Favoritos', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:beta|beta'] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(out[out.length - 1].id).toBe('vaultman.group.none');
	});

	it('con filtros activos un grupo vacio NO se proyecta', () => {
		// No es inmunidad: es poda normal del pipeline, igual que `filtered`.
		const out = projectGroupedTree({
			nodes: [node('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Favoritos', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Vacio', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:beta|beta'], g2: [] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: true,
		});
		expect(out.map((group) => group.label)).not.toContain('Vacio');
	});

	it('sin filtros el grupo vacio SIGUE siendo un p-node', () => {
		const out = projectGroupedTree({
			nodes: [node('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Favoritos', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Vacio', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:beta|beta'], g2: [] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(out.map((group) => group.label)).toContain('Vacio');
	});

	it('un nodo en dos grupos es UNA identidad y DOS ocurrencias', () => {
		// Caso S-26. No hay copia: el mismo id aparece bajo dos cabeceras.
		const out = projectGroupedTree({
			nodes: [node('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: {
				g1: ['props:prop:beta|beta'],
				g2: ['props:prop:beta|beta'],
			},
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const ocurrencias = out.flatMap((group) => group.children ?? [])
			.filter((child) => child.id.startsWith('b1'));
		expect(ocurrencias).toHaveLength(2);
	});

	it('las ocurrencias de un mismo nodo tienen ids de FILA distintos', () => {
		// `viewTree` indexa las filas por `node.id` (rowEls: Map<string,...>).
		// Dos filas con el mismo id se pisarian y solo se pintaria una.
		const out = projectGroupedTree({
			nodes: [node('b1', 'beta')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
				{ id: 'g2', flavor: 'custom', label: 'Dos', parentId: null, scope: 'all' },
			],
			memberships: {
				g1: ['props:prop:beta|beta'],
				g2: ['props:prop:beta|beta'],
			},
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const ids = out.flatMap((group) =>
			(group.children ?? []).map((child) => child.id),
		);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('la pertenencia empareja por la TRIPLETA, no solo por la ruta', () => {
		// spec-03: el prefijo `providerId:kind:` existe para que una ruta que
		// coincide entre kinds NO empareje por accidente. Aqui la pertenencia es
		// de un value y el nodo es un prop, con el mismo canonicalId.
		const out = projectGroupedTree({
			nodes: [node('p1', 'lugar')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:value:lugar|lugar'] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const uno = out.find((group) => group.label === 'Uno');
		expect(uno?.children ?? []).toHaveLength(0);
		// Y el nodo no se pierde: cae en `no group`.
		expect(out[out.length - 1].children?.map((child) => child.id)).toEqual(['p1']);
	});

	it('el displayLabel NO forma parte de la identidad', () => {
		// Va dentro de la URN para que una referencia rota siga diciendo como se
		// llamaba, pero es etiqueta: si emparejara, renombrar romperia la
		// pertenencia, que es justo lo que la reconciliacion evita.
		const out = projectGroupedTree({
			nodes: [node('p1', 'lugar')],
			groups: [
				{ id: 'g1', flavor: 'custom', label: 'Uno', parentId: null, scope: 'all' },
			],
			memberships: { g1: ['props:prop:lugar|etiqueta vieja'] },
			providerId: 'props',
			urnOf: (n) => `props:prop:${n.label}|${n.label}`,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(
			out.find((group) => group.label === 'Uno')?.children?.map((c) => c.id),
		).toEqual(['p1']);
	});

	it('el desplazamiento de profundidad alcanza al SUBARBOL, no solo a la raiz', () => {
		// viewTree indenta por `--depth`. Si el hijo conserva su profundidad
		// mientras el padre baja un nivel, el arbol sale torcido en cuanto se
		// agrupan files o tags, que si son jerarquicos.
		const nieto: TreeNode<null> = { id: 'n1', label: 'nieto', depth: 2, meta: null };
		const hijo: TreeNode<null> = {
			id: 'c1',
			label: 'hijo',
			depth: 1,
			meta: null,
			children: [nieto],
		};
		const padre: TreeNode<null> = {
			id: 'p1',
			label: 'padre',
			depth: 0,
			meta: null,
			children: [hijo],
		};
		const [header] = projectGroupedTree({
			nodes: [padre],
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(header.children?.[0].depth).toBe(1);
		expect(header.children?.[0].children?.[0].depth).toBe(2);
		expect(header.children?.[0].children?.[0].children?.[0].depth).toBe(3);
	});
});

describe('U130-09: guarda de provider — un grupo de Tags no existe en Files', () => {
	// Defensa, no logica de negocio: el mapa ya es el de la scene. Pero una
	// URN de otro provider (datos corruptos, una foto en la tab equivocada) no
	// puede casar ni contar, y un grupo cuyas URNs son TODAS ajenas no
	// produce cabecera: antes salia «Foo (3)» con 0 hijos.
	const foreign = { Foo: ['tags:tag:alfa|alfa', 'tags:tag:beta|beta'] };
	const files = [node('f1', 'alfa'), node('f2', 'beta')];
	const urnOfFile = (n: TreeNode<null>) => `files:file:${n.label}|${n.label}`;

	it('un mapa con URNs `tags:` proyectado en `files` no produce cabecera', () => {
		const out = projectGroupedTree({
			nodes: files,
			groups: resolveCustomGroups(foreign),
			memberships: foreign,
			providerId: 'files',
			preset: { kind: 'custom', direction: 'asc' },
			urnOf: urnOfFile,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(out.map((group) => group.label)).not.toContain('Foo');
		// Sin ningun grupo propio la lista vuelve TAL CUAL, por identidad.
		expect(out).toBe(files);
	});

	it('ni count: bubbleMemberCountsToGroups ignora las URNs de otro provider', () => {
		const totals = bubbleMemberCountsToGroups({
			groups: resolveCustomGroups(foreign),
			memberships: foreign,
			providerId: 'files',
		});
		expect(totals.get('Foo')).toBeUndefined();
		// Sin providerId se conserva el contrato anterior (cuenta todo).
		expect(
			bubbleMemberCountsToGroups({
				groups: resolveCustomGroups(foreign),
				memberships: foreign,
			}).get('Foo'),
		).toBe(2);
	});

	it('URNs mixtas: las propias casan y cuentan, las ajenas se ignoran', () => {
		const mixed = { Foo: ['tags:tag:alfa|alfa', 'files:file:beta|beta'] };
		const out = projectGroupedTree({
			nodes: files,
			groups: resolveCustomGroups(mixed),
			memberships: mixed,
			providerId: 'files',
			preset: { kind: 'custom', direction: 'asc' },
			urnOf: urnOfFile,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		const foo = out.find((group) => group.label === 'Foo');
		expect(foo?.children?.map((child) => child.id)).toEqual(['f2']);
		expect(
			bubbleMemberCountsToGroups({
				groups: resolveCustomGroups(mixed),
				memberships: mixed,
				providerId: 'files',
			}).get('Foo'),
		).toBe(1);
	});

	it('un grupo propio pero vacio sigue siendo un p-node: la guarda no lo toca', () => {
		const own = { Nuevo: [] as string[] };
		const out = projectGroupedTree({
			nodes: files,
			groups: resolveCustomGroups(own),
			memberships: own,
			providerId: 'files',
			preset: { kind: 'custom', direction: 'asc' },
			urnOf: urnOfFile,
			noGroupLabel: NO_GROUP,
			filtered: false,
		});
		expect(out.map((group) => group.label)).toEqual(['Nuevo', NO_GROUP]);
	});
});

describe('isGroupHeader', () => {
	it('reconoce NO_GROUP_ID como cabecera', () => {
		expect(isGroupHeader(NO_GROUP_ID)).toBe(true);
	});

	it('reconoce IDs con prefijo de preset como cabecera', () => {
		expect(isGroupHeader(`${PRESET_GROUP_PREFIX}A`)).toBe(true);
		expect(isGroupHeader('vaultman.group.preset:X')).toBe(true);
	});

	it('reconoce IDs de grupos custom activos', () => {
		const customGroups = new Set(['custom-group-1', 'g2']);
		expect(isGroupHeader('custom-group-1', customGroups)).toBe(true);
		expect(isGroupHeader('g2', customGroups)).toBe(true);
		expect(isGroupHeader('other', customGroups)).toBe(false);
	});

	it('devuelve false para nodos normales', () => {
		expect(isGroupHeader('note.md')).toBe(false);
		expect(isGroupHeader('prop:tag')).toBe(false);
		expect(isGroupHeader('')).toBe(false);
	});
});

describe('resolveCustomGroups', () => {
	it('devuelve array vacio si no hay memberships', () => {
		expect(resolveCustomGroups(undefined)).toEqual([]);
		expect(resolveCustomGroups({})).toEqual([]);
	});

	it('deriva NodeGroupDef custom de las claves de memberships usando el id como label', () => {
		const memberships = {
			'grupo-1': ['files:file:a.md|a.md'],
			'grupo-2': ['snippets:snippet:s1|s1'],
		};
		const groups = resolveCustomGroups(memberships);
		expect(groups).toHaveLength(2);
		expect(groups[0]).toEqual({
			id: 'grupo-1',
			flavor: 'custom',
			label: 'grupo-1',
			parentId: null,
			scope: 'all',
		});
		expect(groups[1]).toEqual({
			id: 'grupo-2',
			flavor: 'custom',
			label: 'grupo-2',
			parentId: null,
			scope: 'all',
		});
	});
});
