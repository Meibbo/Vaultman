import { describe, expect, it, vi } from 'vitest';
import {
	deleteScopeTarget,
	normalizeExplorerSortState,
	resolveScopeSet,
	setScopeTargetHidden,
} from '../../src/logic/logicScopedSort';
import {
	makeScopedGroupKey,
	parseScopedGroupKey,
} from '../../src/logic/logicScopedCustomGroups';
import { resolveCustomGroups } from '../../src/logic/logicTreeGroupProjection';
import {
	encodeNoteGroupKey,
	isSameTarget,
	parseFrontmatterNoteGroups,
	type NoteGroupTarget,
} from '../../src/logic/logicNoteGroups';
import { removeCustomMemberships } from '../../src/logic/logicGroupSelectionTransaction';
import {
	applyLayoutToPort,
	captureSavedViewConfig,
	createSceneConfigPort,
	sceneFacetsOf,
} from '../../src/logic/logicSceneConfigPort';
import { ensureInstance } from '../../src/logic/logicInstanceRegistry';
import type { InstanceRegistryData } from '../../src/types/typeInstance';

const defaults = {
	viewMode: 'tree' as const,
	interactionMode: 'open' as const,
	visibleCells: ['name'],
	taskCellDisplayMode: 'auto' as const,
	sortState: normalizeExplorerSortState('props', null),
	stickyRows: true,
	compactFolders: false,
	indent: true,
	groupPreset: { kind: 'custom' as const, direction: 'asc' as const },
	hiddenGroupIds: [] as string[],
	sceneLabelMode: 'auto' as const,
	autoRevealMode: 'auto' as const,
	hiddenToolbarNodes: [] as string[],
	toolbarNodeIcons: {} as Record<string, string>,
	toolbarCommandActions: [] as string[],
	createActionsPlacement: 'auto' as const,
	tooltips: true,
	toolbarNodeOrder: [] as string[],
	groupMemberships: {} as Record<string, readonly string[]>,
};

function twoInstanceHarness() {
	let registry: InstanceRegistryData = ensureInstance(
		ensureInstance({ schema: 1, instances: {} }, 'vm-A').registry,
		'vm-B',
	).registry;
	const persist = vi.fn(async () => {});
	const portFor = (instanceId: string) =>
		createSceneConfigPort({
			instanceId: instanceId as never,
			readRegistry: () => registry,
			writeRegistry: (next) => {
				registry = next;
			},
			persist,
			defaultsFor: () => ({ ...defaults, sortState: normalizeExplorerSortState('props', null) }),
		});
	return { portFor, persist, get registry() { return registry; } };
}

/**
 * U130-GGC-011 + 029 acceptance (central, 2026-09-25):
 * dos configuraciones distintas de la MISMA Scene (`props`) en dos
 * instancias simultaneas (vm-A, vm-B), con acumulacion real por scope
 * (custom + Engine per-target) y persistencia. La misma nota en un grupo
 * custom y en un note del mismo nombre no colapsa identidad ni pierde
 * membresia; Hide/Delete vuelve a gobernar desde All levels (1ff00c5a).
 */
describe('U130-GGC-011/029 acceptance: misma Scene en dos instancias', () => {
	it('aisla groupMemberships y Engine per-target entre vm-A y vm-B', async () => {
		const h = twoInstanceHarness();
		const portA = h.portFor('vm-A');
		const portB = h.portFor('vm-B');

		// vm-A: custom en level:1 + Engine anidado; vm-B: custom en level:2 + Engine plano.
		const keyA = makeScopedGroupKey('level:1', 'Sprint');
		const keyB = makeScopedGroupKey('level:2', 'Sprint');
		expect(keyA).not.toBe(keyB);

		await portA.propose('props', {
			...portA.read('props'),
			groupPreset: { kind: 'custom', direction: 'asc' },
			groupMemberships: { [keyA]: ['props:prop:Status|Status'] },
			sortState: normalizeExplorerSortState('props', {
				sorts: { all: { sortBy: 'name', direction: 'asc' } },
				activeScope: 'all',
				scopeState: {
					cursor: 'all',
					sets: {
						all: { viewMode: 'tree', nested: true, indent: true },
						'level:1': { nested: true, stickyRows: false },
					},
				},
			}),
		});
		await portB.propose('props', {
			...portB.read('props'),
			groupPreset: { kind: 'custom', direction: 'asc' },
			groupMemberships: { [keyB]: ['props:value:Open|Open', 'props:value:Done|Done'] },
			sortState: normalizeExplorerSortState('props', {
				sorts: { all: { sortBy: 'name', direction: 'asc' } },
				activeScope: 'all',
				scopeState: {
					cursor: 'all',
					sets: {
						all: { viewMode: 'tree', nested: true, indent: true },
						'level:2': { nested: false, indent: false, stickyRows: true },
					},
				},
			}),
		});

		// Transaccion: cada instancia lee lo suyo, nada cruza.
		const liveA = portA.read('props');
		const liveB = portB.read('props');
		expect(Object.keys(liveA.groupMemberships)).toEqual([keyA]);
		expect(Object.keys(liveB.groupMemberships)).toEqual([keyB]);
		expect(liveA.groupMemberships[keyA]).toEqual(['props:prop:Status|Status']);
		expect(liveB.groupMemberships[keyB]).toEqual(['props:value:Open|Open', 'props:value:Done|Done']);

		// Acumulacion Engine real por scope y por instancia.
		const resA = resolveScopeSet(liveA.sortState.scopeState, { level: 1 });
		const resB = resolveScopeSet(liveB.sortState.scopeState, { level: 2 });
		expect(resA.nested).toBe(true);
		expect(resA.stickyRows).toBe(false);
		expect(resB.nested).toBe(false);
		expect(resB.indent).toBe(false);
		expect(resB.stickyRows).toBe(true);
		// El nivel no configurado en cada instancia cae a `all`.
		expect(resolveScopeSet(liveA.sortState.scopeState, { level: 2 }).nested).toBe(true);
		expect(resolveScopeSet(liveB.sortState.scopeState, { level: 1 }).nested).toBe(true);

		// Persistencia: foto -> JSON (data.json) -> restore en puerto fresco.
		for (const live of [liveA, liveB]) {
			const photo = captureSavedViewConfig(live);
			const json = JSON.stringify(photo);
			const revived = JSON.parse(json);
			const fresh = twoInstanceHarness();
			await applyLayoutToPort(fresh.portFor('vm-A'), {
				viewModeByTab: { props: revived.viewMode },
				interactionModeByTab: { props: revived.interactionMode },
				visibleCellsByTab: { props: revived.visibleCells },
				sortStateByTab: { props: revived.sortState },
				sceneFacetsByTab: { props: sceneFacetsOf(revived) },
			});
			expect(fresh.portFor('vm-A').read('props').groupMemberships).toEqual(
				live.groupMemberships,
			);
		}
	});

	it('misma nota en custom y en note del mismo nombre no colapsa ni pierde membresia', () => {
		const target: NoteGroupTarget = { kind: 'level', level: 1 };
		const customKey = makeScopedGroupKey('level:1', 'Sprint');

		// Misma nota miembro en ambos mundos: URN custom vs id de note.
		const customMemberships = { [customKey]: ['props:prop:Status|Status'] };
		const fm = { prop_Sprint_level1: ['Status', 'Other'] };
		const noteRes = parseFrontmatterNoteGroups(fm, 'prop', target);
		expect(noteRes.groups).toHaveLength(1);
		expect(noteRes.groups[0].id).toBe('Sprint');
		expect(noteRes.memberships['Sprint']).toEqual(['Status', 'Other']);

		// Identidades distintas: el custom lleva clave scoped, el note el nombre.
		const customGroups = resolveCustomGroups(customMemberships);
		expect(customGroups).toHaveLength(1);
		expect(customGroups[0].id).toBe(customKey);
		expect(customGroups[0].id).not.toBe(noteRes.groups[0].id);
		expect(customGroups[0].label).toBe('Sprint');
		expect(noteRes.groups[0].label).toBe('Sprint');
		expect(parseScopedGroupKey(customGroups[0].id).target).toBe('level:1');
		expect(noteRes.groups[0].scope).toBe('level:1');

		// Degroup/ocultar en custom no toca al note y viceversa.
		const afterDegroup = removeCustomMemberships(customMemberships, customKey, ['Status']);
		expect(afterDegroup[customKey]).toEqual([]);
		expect(noteRes.memberships['Sprint']).toEqual(['Status', 'Other']);
		const hiddenCustom = [customKey];
		expect(hiddenCustom.includes(customKey)).toBe(true);
		expect(hiddenCustom.includes('Sprint')).toBe(false);

		// Exclusividad solo dentro del mismo target (ya pactado en 029_011),
		// pero ambos stores coexisten: cambiar de preset no borra al otro.
		expect(isSameTarget(target, { kind: 'level', level: 1 })).toBe(true);
		expect(isSameTarget(target, { kind: 'level', level: 2 })).toBe(false);
	});

	it('mismo nombre custom en L1 y L2 coexiste en la MISMA instancia; note homonimo por target via frontmatter real', async () => {
		const h = twoInstanceHarness();
		const portA = h.portFor('vm-A');
		const portB = h.portFor('vm-B');

		// Mismo nombre custom en dos targets DENTRO de vm-A, con membresias distintas.
		const keyL1 = makeScopedGroupKey('level:1', 'Sprint');
		const keyL2 = makeScopedGroupKey('level:2', 'Sprint');
		await portA.propose('props', {
			...portA.read('props'),
			groupPreset: { kind: 'custom', direction: 'asc' },
			groupMemberships: {
				[keyL1]: ['props:prop:Status|Status'],
				[keyL2]: ['props:value:Open|Open', 'props:value:Done|Done'],
			},
			hiddenGroupIds: [keyL1],
		});
		const liveA = portA.read('props');
		expect(Object.keys(liveA.groupMemberships).sort()).toEqual([keyL1, keyL2].sort());
		expect(liveA.groupMemberships[keyL1]).toEqual(['props:prop:Status|Status']);
		expect(liveA.groupMemberships[keyL2]).toEqual(['props:value:Open|Open', 'props:value:Done|Done']);

		// Frontmatter REAL via encoder: mismo nombre en L1 y L2 conviven en una nota.
		const fmKeyL1 = encodeNoteGroupKey('prop', 'Sprint', { kind: 'level', level: 1 });
		const fmKeyL2 = encodeNoteGroupKey('prop', 'Sprint', { kind: 'level', level: 2 });
		expect(fmKeyL1).not.toBe(fmKeyL2);
		const fm = { [fmKeyL1]: ['Status', 'Other'], [fmKeyL2]: ['Open'] };
		const noteL1 = parseFrontmatterNoteGroups(fm, 'prop', { kind: 'level', level: 1 });
		const noteL2 = parseFrontmatterNoteGroups(fm, 'prop', { kind: 'level', level: 2 });
		expect(noteL1.groups).toHaveLength(1);
		expect(noteL1.groups[0].id).toBe('Sprint');
		expect(noteL1.groups[0].scope).toBe('level:1');
		expect(noteL1.memberships['Sprint']).toEqual(['Status', 'Other']);
		expect(noteL2.groups).toHaveLength(1);
		expect(noteL2.groups[0].scope).toBe('level:2');
		expect(noteL2.memberships['Sprint']).toEqual(['Open']);

		// Degroup del custom L1 no toca al custom L2 ni a los notes.
		const afterDegroup = removeCustomMemberships(liveA.groupMemberships, keyL1, ['Status']);
		expect(afterDegroup[keyL1]).toEqual([]);
		expect(afterDegroup[keyL2]).toEqual(['props:value:Open|Open', 'props:value:Done|Done']);
		expect(noteL1.memberships['Sprint']).toEqual(['Status', 'Other']);
		expect(noteL2.memberships['Sprint']).toEqual(['Open']);

		// Hide por puerto: solo keyL1 oculto en vm-A; vm-B intacta y L2 visible.
		expect(liveA.hiddenGroupIds).toEqual([keyL1]);
		expect(liveA.hiddenGroupIds.includes(keyL2)).toBe(false);
		const liveB = portB.read('props');
		expect(liveB.hiddenGroupIds).toEqual([]);
		expect(liveB.groupMemberships).toEqual({});
	});

	it('Engine distinto por target dentro de la misma instancia sobrevive a foto JSON + layout (029)', async () => {
		const h = twoInstanceHarness();
		const portA = h.portFor('vm-A');
		const keyL1 = makeScopedGroupKey('level:1', 'Sprint');
		const keyL2 = makeScopedGroupKey('level:2', 'Sprint');

		await portA.propose('props', {
			...portA.read('props'),
			groupPreset: { kind: 'custom', direction: 'asc' },
			groupMemberships: {
				[keyL1]: ['props:prop:Status|Status'],
				[keyL2]: ['props:value:Open|Open'],
			},
			hiddenGroupIds: [keyL2],
			sortState: normalizeExplorerSortState('props', {
				sorts: { all: { sortBy: 'name', direction: 'asc' } },
				activeScope: 'all',
				scopeState: {
					cursor: 'all',
					sets: {
						all: { viewMode: 'tree', nested: true, indent: true },
						'level:1': { nested: true, stickyRows: false },
						'level:2': { nested: false, indent: false, stickyRows: true },
					},
				},
			}),
		});
		const live = portA.read('props');

		// Dos targets simultaneos con Engine distinto en la MISMA instancia/scene.
		const resL1 = resolveScopeSet(live.sortState.scopeState, { level: 1 });
		const resL2 = resolveScopeSet(live.sortState.scopeState, { level: 2 });
		expect(resL1.nested).toBe(true);
		expect(resL1.stickyRows).toBe(false);
		expect(resL2.nested).toBe(false);
		expect(resL2.indent).toBe(false);
		expect(resL2.stickyRows).toBe(true);
		// Cambiar el cursor no altera la proyeccion ajena.
		expect(resolveScopeSet({ ...live.sortState.scopeState!, cursor: 'level:2' as never }, { level: 1 }).stickyRows).toBe(false);

		// Reload/layout: foto -> JSON (data.json) -> puerto fresco preserva TODO.
		const photo = captureSavedViewConfig(live);
		const revived = JSON.parse(JSON.stringify(photo));
		const fresh = twoInstanceHarness();
		await applyLayoutToPort(fresh.portFor('vm-A'), {
			viewModeByTab: { props: revived.viewMode },
			interactionModeByTab: { props: revived.interactionMode },
			visibleCellsByTab: { props: revived.visibleCells },
			sortStateByTab: { props: revived.sortState },
			sceneFacetsByTab: { props: sceneFacetsOf(revived) },
		});
		const restored = fresh.portFor('vm-A').read('props');
		expect(restored.groupMemberships).toEqual(live.groupMemberships);
		expect(restored.hiddenGroupIds).toEqual([keyL2]);
		const rL1 = resolveScopeSet(restored.sortState.scopeState, { level: 1 });
		const rL2 = resolveScopeSet(restored.sortState.scopeState, { level: 2 });
		expect(rL1.stickyRows).toBe(false);
		expect(rL1.nested).toBe(true);
		expect(rL2.nested).toBe(false);
		expect(rL2.indent).toBe(false);
		expect(rL2.stickyRows).toBe(true);
	});

	it('Hide/Delete de un scope devuelve el gobierno a All levels (1ff00c5a)', () => {
		const base = normalizeExplorerSortState('props', {
			sorts: {
				all: { sortBy: 'name', direction: 'asc' },
				'level:1': { sortBy: 'modified', direction: 'desc' },
			},
			activeScope: 'all',
			scopeState: {
				cursor: 'all',
				sets: {
					all: {
						sort: { sortBy: 'name', direction: 'asc' },
						groupPreset: { kind: 'letter', direction: 'asc' },
						nested: true,
					},
					'level:1': {
						sort: { sortBy: 'modified', direction: 'desc' },
						groupPreset: { kind: 'words', direction: 'desc' },
						nested: false,
					},
				},
			},
		});

		const deleted = deleteScopeTarget('props', base, 'level:1');
		expect(deleted.scopeState?.sets['level:1' as never]).toBeUndefined();
		const afterDelete = resolveScopeSet(deleted.scopeState, { level: 1 });
		expect(afterDelete.groupPreset?.kind).toBe('letter');
		expect(afterDelete.nested).toBe(true);

		const hidden = setScopeTargetHidden('props', base, 'level:1', true);
		const afterHide = resolveScopeSet(hidden.scopeState, { level: 1 });
		expect(afterHide.groupPreset?.kind).toBe('letter');
		expect(afterHide.nested).toBe(true);
	});
});
