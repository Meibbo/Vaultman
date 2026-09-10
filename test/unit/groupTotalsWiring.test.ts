import { describe, expect, it } from 'vitest';

import { bubbleMemberCountsToGroups } from '../../src/logic/logicBadgeBubbling';
import { projectGroupedTree } from '../../src/logic/logicTreeGroupProjection';
import type { TreeNode } from '../../src/types/typeTree';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import explorerPropsSource from '../../src/components/containers/explorerProps.ts?raw';
import explorerTagsSource from '../../src/components/containers/explorerTags.ts?raw';
import explorerSnippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import explorerPluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';

const EXPLORER_SOURCES: Readonly<Record<string, string>> = {
	explorerFiles: explorerFilesSource,
	explorerProps: explorerPropsSource,
	explorerTags: explorerTagsSource,
	explorerSnippets: explorerSnippetsSource,
	explorerPlugins: explorerPluginsSource,
};

const node = (id: string): TreeNode<null> => ({
	id,
	label: id,
	depth: 0,
	meta: null,
});

describe('L-07AW GUARDA NEGATIVA: ningun explorer proyecta el count sin totales', () => {
	it('los cinco explorers pasan groupTotals (simbolo exacto) a projectGroupedTree', () => {
		expect(Object.keys(EXPLORER_SOURCES)).toHaveLength(5);
		for (const [name, source] of Object.entries(EXPLORER_SOURCES)) {
			expect(
				source.includes('projectGroupedTree'),
				`${name} ya no proyecta grupos`,
			).toBe(true);
			// El simbolo exacto: sin `groupTotals` la cabecera cae al
			// `children.length` de antes y el test de numero lo seguiria pasando.
			expect(
				source.includes('groupTotals'),
				`${name} proyecta sin groupTotals`,
			).toBe(true);
			expect(
				source.includes(
					'groupTotals: bubbleMemberCountsToGroups({ groups, memberships })',
				),
				`${name} no cablea los totales burbujeados a la proyeccion`,
			).toBe(true);
		}
	});
});

describe('L-07AW: la cabecera muestra el agregado burbujeado, no children.length', () => {
	const groups = [
		{ id: 'P', flavor: 'custom' as const, label: 'Padre', parentId: null as null, scope: 'all' as const },
		{ id: 'H', flavor: 'custom' as const, label: 'Hijo', parentId: 'P', scope: 'all' as const },
	];
	// x pertenece al padre Y al hijo: es UNA identidad en DOS grupos.
	const memberships = {
		P: ['files:file:x|x'] as readonly string[],
		H: ['files:file:x|x', 'files:file:y|y', 'files:file:z|z'] as readonly string[],
	};
	const nodes = [node('x'), node('y'), node('z')];
	const base = {
		nodes,
		groups,
		memberships,
		providerId: 'files',
		urnOf: (n: TreeNode<null>) => `files:file:${n.label}|${n.label}`,
		noGroupLabel: 'Sin grupo',
		filtered: false,
	};

	it('ANTES: sin groupTotals el padre solo cuenta su hijo directo', () => {
		const [padre] = projectGroupedTree(base);
		expect(padre.id).toBe('P');
		// x esta en P y en H: dos ocurrencias, ids de FILA distintos (caso S-26).
		expect(padre.children?.map((c) => c.id)).toEqual(['x@P']);
		expect(padre.count).toBe(1);
	});

	it('DESPUES: con groupTotals el padre agrega al hijo con dedup por identidad', () => {
		const groupTotals = bubbleMemberCountsToGroups({ groups, memberships });
		// Sin dedup saldria 4 (x directa + x,y,z del hijo).
		expect(groupTotals.get('P')).toBe(3);
		expect(groupTotals.get('H')).toBe(3);
		const [padre] = projectGroupedTree({ ...base, groupTotals });
		expect(padre.id).toBe('P');
		expect(padre.count).toBe(3);
	});

	it('DEDUP INTACTA: el cableado usa bubbleMemberCountsToGroups, no una suma propia', () => {
		// La agregacion cuenta identidades (tripleta providerId:kind:canonicalId),
		// no ocurrencias: x esta en P y en H y suma una vez en el total de P.
		const totals = bubbleMemberCountsToGroups({ groups, memberships });
		expect(totals.get('P')).toBe(3);
	});
});
