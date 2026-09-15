import { describe, expect, it } from 'vitest';

import type { TreeNode } from '../../src/types/typeTree';
import { formatMembershipUrn } from '../../src/logic/logicMembershipUrn';
import {
	collectSelectedMembershipUrns,
	projectGroupedTree,
	resolveCustomGroups,
} from '../../src/logic/logicTreeGroupProjection';
import { bubbleMemberCountsToGroups } from '../../src/logic/logicBadgeBubbling';
import { translatedRangeLabels } from '../../src/utils/groupPresetLabels';

interface AddonMeta {
	name: string;
	enabled: boolean;
}

function pluginNode(name: string): TreeNode<AddonMeta> {
	return {
		id: `plugins:${name}`,
		label: name,
		depth: 0,
		meta: { name, enabled: true },
	};
}

function urnOf(node: TreeNode<AddonMeta>): string {
	return formatMembershipUrn({
		providerId: 'plugins',
		kind: 'plugin',
		canonicalId: node.meta.name,
		displayLabel: node.label,
	});
}

/**
 * A07b-2 · Crear un grupo en plugins produce un `node_group` con miembros.
 * El flujo es: seleccion (ids de FILA proyectadas) -> URNs de pertenencia ->
 * `groupMemberships` del layout -> proyeccion `custom` con cabecera y
 * miembros.
 *
 * RED: la escena de addons recorre el arbol SIN proyectar con los ids de la
 * seleccion proyectada. Cuando un miembro ya vive en otro grupo, su id de
 * fila es `id@grupo` y el recorrido sin proyectar no lo empareja: la URN se
 * pierde y el grupo nace sin ese miembro.
 */
describe('A07b-2 creating a group in the plugins explorer', () => {
	it('conserva los miembros ya agrupados (ids de fila id@grupo)', () => {
		const nodes = [pluginNode('Alpha'), pluginNode('Beta'), pluginNode('Gamma')];
		// Alpha vive en DOS grupos: sus filas proyectadas son ocurrencias
		// con sufijo (`id@grupo`), que es lo que la vista entrega como
		// seleccion al crear el siguiente grupo.
		const prior = { g0: [urnOf(nodes[0]!)], g0b: [urnOf(nodes[0]!)] };
		const groups = resolveCustomGroups(prior);
		const groupIds = new Set(groups.map((group) => group.id));
		const projected = projectGroupedTree<AddonMeta>({
			nodes,
			groups,
			memberships: prior,
			providerId: 'plugins',
			noGroupLabel: 'No group',
			filtered: false,
			urnOf,
			enabled: true,
			preset: { kind: 'custom', direction: 'asc' },
			rangeLabels: translatedRangeLabels(),
			expandedIds: new Set([...groupIds, 'no-group']),
		});
		// La fila proyectada del miembro de g0 lleva el sufijo de ocurrencia.
		const memberRow = projected
			.flatMap((row) => [row, ...(row.children ?? [])])
			.find((row) => (row.id.split('@')[0] ?? row.id) === nodes[0]!.id);
		expect(memberRow).toBeDefined();
		expect(memberRow!.id).toContain('@');

		// La escena recorre el arbol PROYECTADO con la seleccion proyectada,
		// igual que `explorerPlugins._groupCreationMenuCtx` tras A07b-2 (con
		// el arbol sin proyectar la ocurrencia `id@grupo` se perdia en
		// silencio y el grupo nacia sin ese miembro).
		const selected = new Set([memberRow!.id, nodes[2]!.id]);
		const urns = collectSelectedMembershipUrns(
			projected,
			selected,
			urnOf,
			groupIds,
		);
		expect(urns).toHaveLength(2);
		expect(urns).toContain(urnOf(nodes[0]!));
		expect(urns).toContain(urnOf(nodes[2]!));
	});

	it('la pertenencia nueva proyecta una cabecera con sus miembros', () => {
		const nodes = [pluginNode('Alpha'), pluginNode('Beta'), pluginNode('Gamma')];
		const memberships = {
			g1: [urnOf(nodes[0]!), urnOf(nodes[1]!)],
		};
		const groups = resolveCustomGroups(memberships);
		const projected = projectGroupedTree<AddonMeta>({
			nodes,
			groups,
			memberships,
			providerId: 'plugins',
			noGroupLabel: 'No group',
			filtered: false,
			urnOf,
			enabled: true,
			preset: { kind: 'custom', direction: 'asc' },
			rangeLabels: translatedRangeLabels(),
			expandedIds: new Set(['g1', 'no-group']),
		});
		const header = projected.find((row) => row.id === 'g1');
		expect(header).toBeDefined();
		expect(header?.children?.map((child) => child.label).sort()).toEqual([
			'Alpha',
			'Beta',
		]);
	});

	it('A07b-3 la cabecera burbujea el total de miembros (badges/bubbling)', () => {
		const nodes = [pluginNode('Alpha'), pluginNode('Beta')];
		const memberships = { g1: [urnOf(nodes[0]!), urnOf(nodes[1]!)] };
		const groups = resolveCustomGroups(memberships);
		const totals = bubbleMemberCountsToGroups({ groups, memberships });
		expect(totals.get('g1')).toBe(2);
	});
});
