import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { buildTransactionBarState } from '../../src/logic/logicTransactionBarState';
import type { BarNode } from '../../src/logic/logicTransactionBar';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerTabId } from '../../src/types/typeUI';
import type { PropMeta, TreeNode } from '../../src/types/typeTree';

/** L-CABLE: el interruptor es el scope `groups`, no un estado paralelo. */
function sortStateWithScope(tab: ExplorerTabId, activeScope: 'all' | 'groups') {
	return normalizeExplorerSortState(tab, {
		sorts: {},
		activeScope,
		nodeTypeFilter: null,
	});
}

const nodes: TreeNode<PropMeta>[] = [
	{
		id: 'prop-status',
		label: 'status',
		depth: 0,
		meta: { propName: 'status', propType: 'text', isValueNode: false },
	},
	{
		id: 'prop-author',
		label: 'author',
		depth: 0,
		meta: { propName: 'author', propType: 'text', isValueNode: false },
	},
];

function propsPanelWith(memberships: Record<string, string[]>, scope: 'all' | 'groups'): any {
	const panel = Object.create(PropsExplorerPanel.prototype) as any;
	panel._groupIds = new Set<string>();
	panel.sortState = sortStateWithScope('props', scope);
	panel.activeLayoutName = 'layout-props';
	panel.plugin = {
		settings: {
			savedLayouts: [
				{
					name: 'layout-props',
					summary: 'test',
					config: {},
					groupMemberships: memberships,
				},
			],
		},
	};
	return panel;
}

const owner = { instanceId: 'inst-t36', scene: 'props' };
const barNodes: BarNode[] = [
	{ id: 'prop-status', label: 'status', childIds: [] },
	{ id: 'prop-author', label: 'author', childIds: [] },
];

function barStateFor(groupsAvailable: boolean) {
	return buildTransactionBarState({
		transaction: {
			owner,
			originIds: ['prop-status'],
			destinationIds: ['prop-author'],
			rejection: null,
			moveKind: 'node',
		},
		current: owner,
		nodes: barNodes,
		variant: 'row',
		groupsAvailable,
	});
}

describe('U130-03 / Task 3.6: el toggle node/group se habilita con grupos proyectados', () => {
	it('GUARDA NEGATIVA: sin grupos definidos el toggle NO queda habilitado', () => {
		// Un test que solo comprueba el caso habilitado lo satisface un stub:
		// este afirma con el simbolo exacto lo que no puede pasar.
		const panel = propsPanelWith({}, 'groups');
		panel.projectedNodes(nodes);
		expect(panel.hasProjectedGroups()).toBe(false);
		expect(barStateFor(panel.hasProjectedGroups()).moveKindAvailable).toBe(
			false,
		);
	});

	it('lectura (ii): con grupos definidos pero el scope apagado, el toggle VALE', () => {
		// spec-04 test 4: el toggle cambia el modo con la agrupacion apagada.
		// `groupsAvailable` refleja "existen grupos definidos", no
		// "la agrupacion esta activa": la proyeccion devuelve la lista tal cual
		// (sin cabeceras) pero `_groupIds` ya esta poblado.
		const panel = propsPanelWith(
			{ 'grp-prop': ['props:prop:status|status'] },
			'all',
		);
		const raw = panel.projectedNodes(nodes);
		expect(raw).toBe(nodes);
		expect(panel.hasProjectedGroups()).toBe(true);
		expect(barStateFor(panel.hasProjectedGroups()).moveKindAvailable).toBe(
			true,
		);
	});

	it('con el scope groups activo y miembros, el toggle queda habilitado', () => {
		const panel = propsPanelWith(
			{ 'grp-prop': ['props:prop:status|status'] },
			'groups',
		);
		const projected = panel.projectedNodes(nodes);
		expect(projected.find((g: any) => g.id === 'grp-prop')).toBeDefined();
		expect(panel.hasProjectedGroups()).toBe(true);
		expect(barStateFor(panel.hasProjectedGroups()).moveKindAvailable).toBe(
			true,
		);
	});

	it('hasProjectedGroups mira _groupIds.size, no un flag de agrupacion', () => {
		// La aparente contradiccion de la spec (Step 1 vs lectura (ii)):
		// el metodo corregido NO menciona `groupingEnabled`.
		const src = readFileSync(
			new URL(
				'../../src/components/containers/explorerProps.ts',
				import.meta.url,
			),
			'utf8',
		);
		const at = src.indexOf('hasProjectedGroups()');
		expect(at).toBeGreaterThan(-1);
		const block = src.slice(at, at + 400);
		expect(block).not.toContain('groupingEnabled');
		expect(block).toContain('_groupIds.size');
	});

	it('pageFilters cablea el toggle a hasProjectedGroups, no a `false`', () => {
		const src = readFileSync(
			new URL('../../src/components/pages/pageFilters.svelte', import.meta.url),
			'utf8',
		);
		expect(src).toContain(
			'groupsAvailable: propExplorer?.hasProjectedGroups() ?? false',
		);
	});
});
