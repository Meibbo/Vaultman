import { describe, expect, it } from 'vitest';

import {
	bubbleMemberCountsToGroups,
	buildBubbleIndex,
	bubbleDotsForExpansion,
} from '../../src/logic/logicBadgeBubbling';
import { projectGroupedTree } from '../../src/logic/logicTreeGroupProjection';
import type { NodeBadge, TreeNode } from '../../src/types/typeTree';

function node(
	id: string,
	options: { badges?: NodeBadge[]; children?: TreeNode[] } = {},
): TreeNode {
	return {
		id,
		label: id,
		depth: 0,
		meta: {},
		...(options.badges ? { badges: options.badges } : {}),
		...(options.children ? { children: options.children } : {}),
	};
}

function badge(color: NodeBadge['color']): NodeBadge {
	return { color, text: 'op', solid: true, icon: 'lucide-trash' };
}

/** Identidad de pertenencia: la tripleta `providerId:kind:canonicalId`. */
const identityOf = (n: TreeNode): string => `files:file:${n.id}`;

describe('S07A: las aristas de pertenencia entran en el indice de burbujeo', () => {
	it('el grupo recibe el dot aunque ninguna cabecera este en el arbol (indice pre-proyeccion)', () => {
		// El flujo vivo construye el indice ANTES de proyectar: el grupo es
		// padre por pertenencia, no por contencion. Sin aristas, no recibe nada.
		const tree = [
			node('a', { badges: [badge('blue')] }),
			node('quiet'),
		];
		const bare = buildBubbleIndex(tree);
		expect(bare.descendantActivity.has('G')).toBe(false);

		const index = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'a' ? ['G'] : []),
				parentOfGroup: () => null,
			},
		});
		expect(index.descendantActivity.get('G')).toEqual({
			color: 'blue',
			sourceCount: 1,
		});
	});

	it('el grupo padre agrega los miembros del hijo por la arista de anidado', () => {
		const tree = [node('m', { badges: [badge('green')] })];
		const index = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'm' ? ['H'] : []),
				parentOfGroup: (g) => (g === 'H' ? 'P' : null),
				identityOf,
			},
		});
		expect(index.descendantActivity.get('H')).toEqual({
			color: 'green',
			sourceCount: 1,
		});
		expect(index.descendantActivity.get('P')).toEqual({
			color: 'green',
			sourceCount: 1,
		});
	});

	it('agrega IDENTIDADES, no ocurrencias: dos filas de la misma identidad cuentan una vez', () => {
		// Caso S-26: `b1` en dos grupos son dos filas (`b1@g1`, `b1@g2`) y UNA
		// identidad. El total del padre no puede ver dos.
		const tree = [
			node('b1@g1', { badges: [badge('red')] }),
			node('b1@g2', { badges: [badge('red')] }),
		];
		const occurrences = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'b1@g1' ? ['G1'] : ['G2']),
				parentOfGroup: (g) => (g === 'G1' || g === 'G2' ? 'P' : null),
			},
		});
		expect(occurrences.descendantActivity.get('P')?.sourceCount).toBe(2);

		const identities = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'b1@g1' ? ['G1'] : ['G2']),
				parentOfGroup: (g) => (g === 'G1' || g === 'G2' ? 'P' : null),
				identityOf: (n) => n.id.split('@')[0] ?? n.id,
			},
		});
		expect(identities.descendantActivity.get('P')).toEqual({
			color: 'red',
			sourceCount: 1,
		});
	});

	it('GUARDA NEGATIVA S07A: un nodo en el grupo padre y en el hijo cuenta UNA vez en el total del padre', () => {
		// X tiene badge y pertenece a P y a H (H hija de P); Y tiene badge y
		// solo esta en H. Sin deduplicar, X subiria dos veces y P veria 3.
		const tree = [
			node('x', { badges: [badge('red')] }),
			node('y', { badges: [badge('blue')] }),
		];
		const index = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'x' ? ['P', 'H'] : ['H']),
				parentOfGroup: (g) => (g === 'H' ? 'P' : null),
				identityOf,
			},
		});
		expect(index.descendantActivity.get('H')).toEqual({
			color: 'red',
			sourceCount: 2,
		});
		expect(index.descendantActivity.get('P')?.sourceCount).toBe(2);
		expect(index.descendantActivity.get('P')?.color).toBe('red');
	});

	it('el dot del grupo respeta el colapso igual que el de una carpeta', () => {
		const tree = [node('m', { badges: [badge('green')] })];
		const index = buildBubbleIndex(tree, {
			membership: {
				groupsOf: (n) => (n.id === 'm' ? ['H'] : []),
				parentOfGroup: (g) => (g === 'H' ? 'P' : null),
				identityOf,
			},
		});
		const collapsed = bubbleDotsForExpansion(index, new Set());
		expect([...collapsed.keys()].sort()).toEqual(['H', 'P']);

		const parentOpen = bubbleDotsForExpansion(index, new Set(['P']));
		expect([...parentOpen.keys()]).toEqual(['H']);

		const allOpen = bubbleDotsForExpansion(index, new Set(['H', 'P']));
		expect(allOpen.size).toBe(0);
	});
});

describe('S07A: bubbleMemberCountsToGroups suma valores con dedup por canonicalId', () => {
	it('el total del padre incluye al hijo y el nodo compartido cuenta una vez', () => {
		const totals = bubbleMemberCountsToGroups({
			groups: [
				{ id: 'P', parentId: null },
				{ id: 'H', parentId: 'P' },
			],
			memberships: {
				P: ['files:file:x|x'],
				H: ['files:file:x|x', 'files:file:y|y', 'files:file:z|z'],
			},
		});
		expect(totals.get('H')).toBe(3);
		// Sin dedup por canonicalId saldria 4 (x directa + x,y,z del hijo).
		expect(totals.get('P')).toBe(3);
	});

	it('la tripleta evita el emparejado accidental entre kinds (spec-03)', () => {
		const totals = bubbleMemberCountsToGroups({
			groups: [{ id: 'G', parentId: null }],
			memberships: { G: ['files:file:lugar|lugar', 'files:folder:lugar|lugar'] },
		});
		expect(totals.get('G')).toBe(2);
	});

	it('una URN corrupta se salta, no tumba el total', () => {
		const totals = bubbleMemberCountsToGroups({
			groups: [{ id: 'G', parentId: null }],
			memberships: { G: ['not-a-urn', 'files:file:a|a'] },
		});
		expect(totals.get('G')).toBe(1);
	});

	it('un grupo sin miembros vivos no aparece, como las carpetas de bubbleMaxToFolders', () => {
		const totals = bubbleMemberCountsToGroups({
			groups: [{ id: 'E', parentId: null }],
			memberships: {},
		});
		expect(totals.has('E')).toBe(false);
	});
});

describe('S07A: la cabecera proyecta el total cuando se le pasa', () => {
	const base = {
		nodes: [node('b1', { badges: undefined })],
		groups: [
			{ id: 'g1', flavor: 'custom' as const, label: 'Uno', parentId: null, scope: 'all' as const },
		],
		memberships: { g1: ['props:prop:beta|beta'] as readonly string[] },
		providerId: 'props',
		urnOf: (n: TreeNode) => `props:prop:${n.label}|${n.label}`,
		noGroupLabel: 'Sin grupo',
		filtered: false,
	};

	it('sin groupTotals la cabecera cuenta sus hijos directos (cero regresion)', () => {
		const [header] = projectGroupedTree({ ...base, nodes: [{ ...base.nodes[0], label: 'beta' }] });
		expect(header.id).toBe('g1');
		expect(header.count).toBe(1);
	});

	it('con groupTotals la cabecera muestra el total anidado y deducido', () => {
		const [header] = projectGroupedTree({
			...base,
			nodes: [{ ...base.nodes[0], label: 'beta' }],
			groupTotals: new Map([['g1', 5]]),
		});
		expect(header.count).toBe(5);
	});
});
