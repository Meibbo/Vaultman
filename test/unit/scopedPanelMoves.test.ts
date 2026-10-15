import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/components/layout/apiSceneHost.svelte', () => ({
	default: {},
}));

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import { buildApiSceneNodes } from '../../src/logic/logicApiSceneNodes';
import { buildSasiInspectorModel } from '../../src/modals/modalSasiInspector';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import {
	ACTION_ID_FOR_VARIATION,
	ALL_SCOPED_PANEL_ACTION_IDS,
	MAXIMIZE_LEAF_ATTR,
	MAXIMIZE_SURFACE_ATTR,
	MAXIMIZE_TABS_ATTR,
	SCOPED_MAXIMIZE_COMPATIBILITY,
	SCOPED_MOVE_COMPATIBILITY,
	SCOPED_PANEL_DEFAULT_SCOPE,
	adjustedInsertIndex,
	createScopedPanelCommandDescriptors,
	isKnownPanelScope,
	planScopedMove,
	resolveScopedFocus,
	resolveScopedMaximize,
	scopedCandidateKeys,
	scopedMaximizeGuardMessageKey,
	scopedMoveGuardMessageKey,
	surfaceOfLeaf,
	variationForActionId,
	TOGGLE_MAXIMIZE_ID,
	type ScopedLayoutSnapshot,
	type ScopedMoveVariation,
} from '../../src/logic/logicScopedPanelMoves';

function layout(
	focusedKey: string | null,
	isPopout = false,
): ScopedLayoutSnapshot {
	return {
		groups: [
			{ id: 'main_leaf:0', surface: 'main_leaf', leafKeys: ['a1', 'a2'] },
			{
				id: 'main_leaf:1',
				surface: 'main_leaf',
				leafKeys: ['editor-tab-2', 'b2', 'b3'],
			},
			{ id: 'main_leaf:2', surface: 'main_leaf', leafKeys: ['c1'] },
			{ id: 'left_sidebar:0', surface: 'left_sidebar', leafKeys: ['v1', 'v2'] },
		],
		focusedKey,
		isPopout,
	};
}

describe('U200-L4 registro: 17 acciones con scope y compatibilidad', () => {
	it('registra las 17 como actions con las tres superficies', () => {
		const { registry } = createVaultmanSasi();
		expect(ALL_SCOPED_PANEL_ACTION_IDS).toHaveLength(17);
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const resolved = registry.resolve(id);
			expect(resolved.def, id).not.toBeNull();
			expect(resolved.def?.axis, id).toBe('function');
			expect(resolved.def?.kind, id).toBe('action');
			expect(resolved.def?.mutatesVault, id).toBeUndefined();
			expect(
				(resolved.def?.supports ?? []).map((s) => s.surface).sort(),
				id,
			).toEqual(['left_sidebar', 'main_leaf', 'right_sidebar']);
			expect(resolved.def?.scope, id).toBe(SCOPED_PANEL_DEFAULT_SCOPE);
			expect(resolved.def?.scope, id).toBe('workspace:last_focused');
		}
	});

	it('cada accion trae su valor de compatibilidad (fuente unica)', () => {
		const { registry } = createVaultmanSasi();
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const compat = registry.resolve(id).def?.compatibility;
			expect(compat, id).toBeDefined();
			expect([...(compat?.surfaces ?? [])].sort(), id).toEqual([
				'left_sidebar',
				'main_leaf',
				'right_sidebar',
			]);
			expect(compat?.scopes, id).toContain('workspace:last_focused');
			expect(compat?.outOfRange.join('|'), id).toContain('popout windows');
			expect(compat?.outOfRange.join('|'), id).toContain('new window');
		}
		// Maximize declara fuera de rango lo que moves no: layouts de un grupo.
		const maxCompat = registry.resolve(TOGGLE_MAXIMIZE_ID).def?.compatibility;
		expect(maxCompat?.outOfRange.join('|')).toContain('single-group');
		expect(SCOPED_MOVE_COMPATIBILITY.outOfRange.join('|')).not.toContain(
			'single-group',
		);
		expect(SCOPED_MAXIMIZE_COMPATIBILITY.scopes).toEqual(
			SCOPED_MOVE_COMPATIBILITY.scopes,
		);
	});

	it('el inspector expone la compatibilidad donde ya muestra limites', () => {
		const { registry } = createVaultmanSasi();
		const sections = buildSasiInspectorModel(registry);
		const entries = sections.flatMap((section) => section.entries);
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const entry = entries.find((candidate) => candidate.id === id);
			expect(entry, id).toBeDefined();
			expect(entry?.compatibility, id).toBeDefined();
			expect([...(entry?.surfaces ?? [])].sort(), id).toEqual([
				'left_sidebar',
				'main_leaf',
				'right_sidebar',
			]);
			expect(entry?.scope, id).toBe('workspace:last_focused');
		}
	});

	it('los nodos ApiScene llevan la compatibilidad en su meta', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry);
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const node = nodes.find((candidate) => candidate.meta.sasiId === id);
			expect(node, id).toBeDefined();
			expect(node?.meta.compatibility, id).toBeDefined();
			expect(node?.meta.scope, id).toBe('workspace:last_focused');
		}
	});
});

describe('U200-L4 scope: el alcance decide que objetos se ven afectados', () => {
	const snapshot = layout('editor-tab-2');

	it('workspace:last_focused cubre las tres superficies', () => {
		expect(scopedCandidateKeys(snapshot, 'workspace:last_focused')).toEqual([
			'a1',
			'a2',
			'editor-tab-2',
			'b2',
			'b3',
			'c1',
			'v1',
			'v2',
		]);
	});

	it('los alcances de superficie recortan el conjunto', () => {
		expect(scopedCandidateKeys(snapshot, 'surface:main')).toEqual([
			'a1',
			'a2',
			'editor-tab-2',
			'b2',
			'b3',
			'c1',
		]);
		expect(scopedCandidateKeys(snapshot, 'surface:left-sidebar')).toEqual([
			'v1',
			'v2',
		]);
		expect(scopedCandidateKeys(snapshot, 'surface:right-sidebar')).toEqual([]);
	});

	it('cambiar el alcance cambia el objetivo (incluida hoja no-Vaultman)', () => {
		// Foco global en una hoja del editor...
		expect(
			resolveScopedFocus(snapshot, 'workspace:last_focused', 'editor-tab-2', null),
		).toEqual({ ok: true, key: 'editor-tab-2' });
		// ...pero con alcance de sidebar el objetivo es otro objeto.
		expect(
			resolveScopedFocus(snapshot, 'surface:left-sidebar', 'editor-tab-2', null),
		).toEqual({ ok: true, key: 'v1' });
	});

	it('el ultimo foco vivo gana al orden de lista', () => {
		expect(
			resolveScopedFocus(snapshot, 'workspace:last_focused', 'b3', 'a1'),
		).toEqual({ ok: true, key: 'b3' });
		// Foco rancio fuera del alcance -> cae al activo, luego al primero.
		expect(
			resolveScopedFocus(snapshot, 'surface:main', 'v9', 'c1'),
		).toEqual({ ok: true, key: 'c1' });
		expect(resolveScopedFocus(snapshot, 'surface:main', 'v9', 'v9')).toEqual({
			ok: true,
			key: 'a1',
		});
	});

	it('alcance desconocido y conjunto vacio son bloqueadores precisos', () => {
		expect(resolveScopedFocus(snapshot, 'banana', 'a1', 'a1')).toEqual({
			ok: false,
			reason: 'unknown-scope',
		});
		expect(isKnownPanelScope('banana')).toBe(false);
		expect(isKnownPanelScope('surface:main')).toBe(true);
		expect(
			resolveScopedFocus(snapshot, 'surface:right-sidebar', 'a1', 'a1'),
		).toEqual({ ok: false, reason: 'no-focused-panel' });
	});
});

describe('U200-L4 plan: cada variacion mueve la hoja enfocada', () => {
	it('reorden dentro del grupo con indices exactos', () => {
		expect(planScopedMove(layout('b2'), 'reorder-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				toIndex: 0,
			},
		});
		expect(planScopedMove(layout('b2'), 'reorder-right')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('b3'), 'reorder-start')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b3',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				toIndex: 0,
			},
		});
		expect(planScopedMove(layout('editor-tab-2'), 'reorder-end')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'editor-tab-2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				toIndex: 2,
			},
		});
	});

	it('reorden en el borde es un bloqueador, no un no-op mudo', () => {
		expect(planScopedMove(layout('editor-tab-2'), 'reorder-left')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('b3'), 'reorder-right')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('editor-tab-2'), 'reorder-start')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('b3'), 'reorder-end')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
	});

	it('previous/next envuelven; first/last van a los extremos', () => {
		expect(planScopedMove(layout('editor-tab-2'), 'group-next')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'editor-tab-2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:2',
				toIndex: 1,
			},
		});
		expect(planScopedMove(layout('c1'), 'group-next')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'c1',
				fromGroupId: 'main_leaf:2',
				toGroupId: 'main_leaf:0',
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('a1'), 'group-previous')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'a1',
				fromGroupId: 'main_leaf:0',
				toGroupId: 'main_leaf:2',
				toIndex: 1,
			},
		});
		expect(planScopedMove(layout('b2'), 'group-first')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:0',
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('b2'), 'group-last')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:2',
				toIndex: 1,
			},
		});
		// Ya en el extremo -> bloqueador preciso.
		expect(planScopedMove(layout('a1'), 'group-first')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('c1'), 'group-last')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
	});

	it('los movimientos no cruzan superficies', () => {
		// v2 esta en el unico grupo del sidebar: previous/next es single-group
		// aunque el main tenga tres grupos.
		expect(planScopedMove(layout('v2'), 'group-next')).toEqual({
			ok: false,
			reason: 'single-group',
		});
		// Direccional en el borde del sidebar crea split en vez de cruzar.
		expect(planScopedMove(layout('v2'), 'direction-right')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'v2',
				fromGroupId: 'left_sidebar:0',
				direction: 'vertical',
				before: false,
			},
		});
	});

	it('direccionales con vecino mueven; sin vecino piden split', () => {
		expect(planScopedMove(layout('b2'), 'direction-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:0',
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('b2'), 'direction-right')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:2',
				toIndex: 1,
			},
		});
		expect(planScopedMove(layout('a1'), 'direction-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'a1',
				fromGroupId: 'main_leaf:0',
				direction: 'vertical',
				before: true,
			},
		});
		expect(planScopedMove(layout('c1'), 'direction-below')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'c1',
				fromGroupId: 'main_leaf:2',
				direction: 'horizontal',
				before: false,
			},
		});
		expect(planScopedMove(layout('c1'), 'direction-above')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'c1',
				fromGroupId: 'main_leaf:2',
				toGroupId: 'main_leaf:1',
				toIndex: 3,
			},
		});
	});

	it('grupo entero = intercambio con el vecino, sin envoltura', () => {
		expect(planScopedMove(layout('b2'), 'move-group-right')).toEqual({
			ok: true,
			move: {
				kind: 'group-swap',
				leafKey: 'b2',
				activeGroupId: 'main_leaf:1',
				neighborGroupId: 'main_leaf:2',
			},
		});
		expect(planScopedMove(layout('b2'), 'move-group-left')).toEqual({
			ok: true,
			move: {
				kind: 'group-swap',
				leafKey: 'b2',
				activeGroupId: 'main_leaf:1',
				neighborGroupId: 'main_leaf:0',
			},
		});
		expect(planScopedMove(layout('c1'), 'move-group-right')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('a1'), 'move-group-up')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('v1'), 'move-group-down')).toEqual({
			ok: false,
			reason: 'single-group',
		});
	});

	it('guardas globales: popout, sin foco, desconocido, ambiguo', () => {
		expect(planScopedMove(layout('b2', true), 'group-next')).toEqual({
			ok: false,
			reason: 'popout',
		});
		expect(planScopedMove(layout(null), 'group-next')).toEqual({
			ok: false,
			reason: 'no-focused-panel',
		});
		expect(planScopedMove(layout('zzz'), 'group-next')).toEqual({
			ok: false,
			reason: 'unknown-target',
		});
		const dup = layout('b2');
		expect(
			planScopedMove(
				{
					...dup,
					groups: [...dup.groups, { ...dup.groups[0] }],
				},
				'group-next',
			),
		).toEqual({ ok: false, reason: 'ambiguous-target' });
	});
});

describe('U200-L4 indices de insercion crear-primero-separar-despues', () => {
	it('compensa el desplazamiento al separar la original', () => {
		expect(adjustedInsertIndex(2, 0)).toBe(0);
		expect(adjustedInsertIndex(2, 1)).toBe(1);
		expect(adjustedInsertIndex(0, 2)).toBe(3);
		expect(adjustedInsertIndex(1, 2)).toBe(3);
	});
});

describe('U200-L4 maximize con scope: overlay reversible, no-ops explicitos', () => {
	it('resuelve la hoja enfocada cuando hay con que contraponerla', () => {
		expect(
			resolveScopedMaximize({ focusedKey: 'b2', groupCount: 3, isPopout: false }),
		).toEqual({ ok: true, key: 'b2' });
	});

	it('single-group y popout son no-ops documentados, no genericos', () => {
		expect(
			resolveScopedMaximize({ focusedKey: 'b2', groupCount: 1, isPopout: false }),
		).toEqual({ ok: false, reason: 'single-group' });
		expect(
			resolveScopedMaximize({ focusedKey: 'b2', groupCount: 3, isPopout: true }),
		).toEqual({ ok: false, reason: 'popout' });
		expect(
			resolveScopedMaximize({ focusedKey: null, groupCount: 3, isPopout: false }),
		).toEqual({ ok: false, reason: 'unknown-target' });
	});

	it('los atributos viven bajo el namespace del plugin', () => {
		expect(MAXIMIZE_TABS_ATTR).toBe('data-vaultman-maxpanel');
		expect(MAXIMIZE_LEAF_ATTR).toBe('data-vaultman-maxpanel-leaf');
		expect(MAXIMIZE_SURFACE_ATTR).toBe('data-vaultman-maxsurface');
	});

	it('cada reason mapea a una clave existente en ambos idiomas', () => {
		for (const key of [
			scopedMoveGuardMessageKey('no-focused-panel'),
			scopedMoveGuardMessageKey('unknown-scope'),
			scopedMoveGuardMessageKey('unknown-target'),
			scopedMoveGuardMessageKey('ambiguous-target'),
			scopedMoveGuardMessageKey('single-group'),
			scopedMoveGuardMessageKey('popout'),
			scopedMoveGuardMessageKey('at-edge'),
			scopedMaximizeGuardMessageKey('unknown-target'),
			scopedMaximizeGuardMessageKey('popout'),
			scopedMaximizeGuardMessageKey('single-group'),
		]) {
			expect(en[key], key).toBeTruthy();
			expect(es[key], key).toBeTruthy();
			expect(en[key], key).not.toBe(key);
			expect(es[key], key).not.toBe(key);
		}
	});
});

describe('U200-L4 superficie por cadena de parents (API publica)', () => {
	it('clasifica left/main/right y unknown', () => {
		const left = { parent: null };
		const main = { parent: null };
		const right = { parent: null };
		const roots = { left, main, right };
		const tabsInLeft = { parent: left };
		const leafInLeft = { parent: tabsInLeft };
		expect(surfaceOfLeaf(leafInLeft, roots)).toBe('left_sidebar');
		const deep = { parent: { parent: { parent: main } } };
		expect(surfaceOfLeaf(deep, roots)).toBe('main_leaf');
		expect(surfaceOfLeaf({ parent: right }, roots)).toBe('right_sidebar');
		expect(surfaceOfLeaf({ parent: { parent: null } }, roots)).toBe('unknown');
		expect(surfaceOfLeaf(null, roots)).toBe('unknown');
	});
});

describe('U200-L4 descriptores: 17 ids, nombres y biyeccion', () => {
	it('id <-> variacion es biyectiva', () => {
		const variations = Object.values(ACTION_ID_FOR_VARIATION);
		expect(new Set(variations).size).toBe(16);
		for (const [variation, id] of Object.entries(ACTION_ID_FOR_VARIATION)) {
			expect(variationForActionId(id)).toBe(variation);
		}
		expect(variationForActionId('vaultman.move.nope')).toBeNull();
		expect(variationForActionId(TOGGLE_MAXIMIZE_ID)).toBeNull();
	});

	it('los 17 descriptores son checkables con los nombres exactos', () => {
		const calls: Array<{ variation: ScopedMoveVariation; checking: boolean }> = [];
		const descriptors = createScopedPanelCommandDescriptors(
			(key) => en[key] ?? key,
			{
				runPanelMove: (variation, checking) => {
					calls.push({ variation, checking });
					return true;
				},
				runToggleMaximize: () => true,
			},
		);
		expect(descriptors.map((d) => d.id)).toEqual([
			...ALL_SCOPED_PANEL_ACTION_IDS,
		]);
		expect(descriptors.map((d) => d.name)).toEqual([
			'Move active tab left within its group',
			'Move active tab right within its group',
			'Move active tab to start of its group',
			'Move active tab to end of its group',
			'Move active tab to previous group',
			'Move active tab to next group',
			'Move active tab to first group',
			'Move active tab to last group',
			'Move active tab into the group to the left',
			'Move active tab into the group to the right',
			'Move active tab into the group above',
			'Move active tab into the group below',
			'Move active tab group left',
			'Move active tab group right',
			'Move active tab group up',
			'Move active tab group down',
			'Toggle focused panel maximize',
		]);
		for (const d of descriptors) expect(d.handler.length).toBe(1);
	});

	it('todas las claves nuevas existen traducidas en ambos idiomas', () => {
		const keys = [
			'sasi.move.tab_left_in_group',
			'sasi.move.tab_right_in_group',
			'sasi.move.tab_to_start_of_group',
			'sasi.move.tab_to_end_of_group',
			'sasi.move.tab_to_first_group',
			'sasi.move.tab_to_last_group',
			'sasi.move.tab_to_left_group',
			'sasi.move.tab_to_right_group',
			'sasi.move.tab_to_above_group',
			'sasi.move.tab_to_below_group',
			'sasi.move.group_up',
			'sasi.move.group_down',
			'sasi.move.tab.at_edge',
			'sasi.move.tab.no_focused_panel',
			'sasi.move.tab.unknown_scope',
		];
		for (const key of keys) {
			expect(en[key], key).toBeTruthy();
			expect(es[key], key).toBeTruthy();
			expect(en[key], key).not.toBe(key);
			expect(es[key], key).not.toBe(key);
			expect(es[key], key).not.toBe(en[key]);
		}
	});
});
