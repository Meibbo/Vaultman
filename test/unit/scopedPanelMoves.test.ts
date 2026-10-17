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
	SCOPED_SURFACE_PANEL_SCOPE,
	axisOfDirectionVariation,
	createScopedPanelCommandDescriptors,
	findDirectionalNeighbor,
	findGroupMoveNeighbor,
	isKnownPanelScope,
	planScopedMove,
	reorderChildWithinParent,
	resolveScopedFocus,
	resolveScopedMaximize,
	scopedCandidateKeys,
	scopedMaximizeGuardMessageKey,
	scopedMoveGuardMessageKey,
	surfaceOfLeaf,
	variationForActionId,
	TOGGLE_MAXIMIZE_ID,
	TAB_TO_LEFT_SIDEBAR_ID,
	TAB_TO_RIGHT_SIDEBAR_ID,
	TAB_TO_MAIN_LEAF_ID,
	type ScopedLayoutSnapshot,
	type ScopedMoveVariation,
} from '../../src/logic/logicScopedPanelMoves';

/**
 * U200-L5: plano con trails geometricos. Superficie main bajo UN split
 * vertical (columnas lado a lado); el sidebar es un unico grupo. Con padre
 * vertical, left/right mueven entre vecinos y above/below piden split
 * (regla madura: el eje manda, no el orden de caminata).
 */
function layout(
	focusedKey: string | null,
	isPopout = false,
): ScopedLayoutSnapshot {
	return {
		groups: [
			{
				id: 'main_leaf:0',
				surface: 'main_leaf',
				leafKeys: ['a1', 'a2'],
				trail: [{ direction: 'vertical', index: 0 }],
			},
			{
				id: 'main_leaf:1',
				surface: 'main_leaf',
				leafKeys: ['editor-tab-2', 'b2', 'b3'],
				trail: [{ direction: 'vertical', index: 1 }],
			},
			{
				id: 'main_leaf:2',
				surface: 'main_leaf',
				leafKeys: ['c1'],
				trail: [{ direction: 'vertical', index: 2 }],
			},
			{
				id: 'left_sidebar:0',
				surface: 'left_sidebar',
				leafKeys: ['v1', 'v2'],
				trail: [{ direction: 'horizontal', index: 0 }],
			},
		],
		focusedKey,
		isPopout,
	};
}

/**
 * U200-L5: anidado real (columna + subfilas). Main: split vertical con
 * [columna A, split horizontal [B, C]]. Trails de dos niveles para la
 * busqueda geometrica con subida de nivel.
 */
function nestedLayout(focusedKey: string | null): ScopedLayoutSnapshot {
	return {
		groups: [
			{
				id: 'main_leaf:0',
				surface: 'main_leaf',
				leafKeys: ['a1'],
				trail: [{ direction: 'vertical', index: 0 }],
			},
			{
				id: 'main_leaf:1',
				surface: 'main_leaf',
				leafKeys: ['b1'],
				trail: [
					{ direction: 'vertical', index: 1 },
					{ direction: 'horizontal', index: 0 },
				],
			},
			{
				id: 'main_leaf:2',
				surface: 'main_leaf',
				leafKeys: ['c1'],
				trail: [
					{ direction: 'vertical', index: 1 },
					{ direction: 'horizontal', index: 1 },
				],
			},
		],
		focusedKey,
		isPopout: false,
	};
}

/**
 * U200-L5 (tabs-4): par horizontal apilado (arriba 2 tabs, abajo 1),
 * como el caso de aceptacion A/B.
 */
function pairLayout(focusedKey: string | null): ScopedLayoutSnapshot {
	return {
		groups: [
			{
				id: 'main_leaf:0',
				surface: 'main_leaf',
				leafKeys: ['t1', 't2'],
				trail: [{ direction: 'horizontal', index: 0 }],
			},
			{
				id: 'main_leaf:1',
				surface: 'main_leaf',
				leafKeys: ['d1'],
				trail: [{ direction: 'horizontal', index: 1 }],
			},
		],
		focusedKey,
		isPopout: false,
	};
}

/**
 * U200-L5b (Briefing C): Grid 3x3 asimetrico con sub-splits a distintas profundidades.
 */
function grid3x3Layout(focusedKey: string | null): ScopedLayoutSnapshot {
	return {
		groups: [
			// Col 0: fila 0 normal, filas 1 y 2 en sub-split horizontal
			{
				id: 'grid:0:0',
				surface: 'main_leaf',
				leafKeys: ['cell-0-0'],
				trail: [
					{ direction: 'vertical', index: 0 },
					{ direction: 'horizontal', index: 0 },
				],
			},
			{
				id: 'grid:1:0',
				surface: 'main_leaf',
				leafKeys: ['cell-1-0'],
				trail: [
					{ direction: 'vertical', index: 0 },
					{ direction: 'horizontal', index: 1 },
					{ direction: 'horizontal', index: 0 },
				],
			},
			{
				id: 'grid:2:0',
				surface: 'main_leaf',
				leafKeys: ['cell-2-0'],
				trail: [
					{ direction: 'vertical', index: 0 },
					{ direction: 'horizontal', index: 1 },
					{ direction: 'horizontal', index: 1 },
				],
			},
			// Col 1: filas 0 y 1 en sub-split, fila 2 normal
			{
				id: 'grid:0:1',
				surface: 'main_leaf',
				leafKeys: ['cell-0-1'],
				trail: [
					{ direction: 'vertical', index: 1 },
					{ direction: 'horizontal', index: 0 },
					{ direction: 'horizontal', index: 0 },
				],
			},
			{
				id: 'grid:1:1',
				surface: 'main_leaf',
				leafKeys: ['cell-1-1'],
				trail: [
					{ direction: 'vertical', index: 1 },
					{ direction: 'horizontal', index: 0 },
					{ direction: 'horizontal', index: 1 },
				],
			},
			{
				id: 'grid:2:1',
				surface: 'main_leaf',
				leafKeys: ['cell-2-1'],
				trail: [
					{ direction: 'vertical', index: 1 },
					{ direction: 'horizontal', index: 1 },
				],
			},
			// Col 2: 3 filas en split horizontal directo
			{
				id: 'grid:0:2',
				surface: 'main_leaf',
				leafKeys: ['cell-0-2'],
				trail: [
					{ direction: 'vertical', index: 2 },
					{ direction: 'horizontal', index: 0 },
				],
			},
			{
				id: 'grid:1:2',
				surface: 'main_leaf',
				leafKeys: ['cell-1-2'],
				trail: [
					{ direction: 'vertical', index: 2 },
					{ direction: 'horizontal', index: 1 },
				],
			},
			{
				id: 'grid:2:2',
				surface: 'main_leaf',
				leafKeys: ['cell-2-2'],
				trail: [
					{ direction: 'vertical', index: 2 },
					{ direction: 'horizontal', index: 2 },
				],
			},
		],
		focusedKey,
		isPopout: false,
	};
}

describe('U200-L5 registro: 20 acciones con scope y compatibilidad', () => {
	it('registra las 20 como actions con las tres superficies', () => {
		const { registry } = createVaultmanSasi();
		expect(ALL_SCOPED_PANEL_ACTION_IDS).toHaveLength(20);
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
		}
		// 16+maximize con el alcance global; 3 entre-superficies con la fuente.
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const scope = registry.resolve(id).def?.scope;
			if (
				id === TAB_TO_LEFT_SIDEBAR_ID ||
				id === TAB_TO_RIGHT_SIDEBAR_ID ||
				id === TAB_TO_MAIN_LEAF_ID
			) {
				expect(scope, id).toBe(SCOPED_SURFACE_PANEL_SCOPE);
				expect(scope, id).toBe('surface_panel:current');
			} else {
				expect(scope, id).toBe(SCOPED_PANEL_DEFAULT_SCOPE);
				expect(scope, id).toBe('workspace:last_focused');
			}
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
		// tabs-2: vocabulario exacto solo en los 3 entre-superficies.
		expect(
			registry.resolve(TAB_TO_LEFT_SIDEBAR_ID).def?.compatibility,
		).toMatchObject({
			scope: 'surface_panel:current',
			target: '→surface:left_sidebar',
			scopes: ['surface_panel:current'],
		});
		expect(
			registry.resolve(TAB_TO_RIGHT_SIDEBAR_ID).def?.compatibility,
		).toMatchObject({
			scope: 'surface_panel:current',
			target: '→surface:right_sidebar',
		});
		expect(
			registry.resolve(TAB_TO_MAIN_LEAF_ID).def?.compatibility,
		).toMatchObject({
			scope: 'surface_panel:current',
			target: '→surface:main_leaf',
		});
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const compat = registry.resolve(id).def?.compatibility;
			if (
				id === TAB_TO_LEFT_SIDEBAR_ID ||
				id === TAB_TO_RIGHT_SIDEBAR_ID ||
				id === TAB_TO_MAIN_LEAF_ID
			) {
				continue;
			}
			expect(compat?.scope, id).toBeUndefined();
			expect(compat?.target, id).toBeUndefined();
		}
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
		}
		// tabs-2: scope/target viajan en el mismo objeto, sin segunda fuente.
		const left = entries.find(
			(candidate) => candidate.id === TAB_TO_LEFT_SIDEBAR_ID,
		);
		expect(left?.scope).toBe('surface_panel:current');
		expect(left?.compatibility?.scope).toBe('surface_panel:current');
		expect(left?.compatibility?.target).toBe('→surface:left_sidebar');
	});

	it('los nodos ApiScene llevan la compatibilidad en su meta', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry);
		for (const id of ALL_SCOPED_PANEL_ACTION_IDS) {
			const node = nodes.find((candidate) => candidate.meta.sasiId === id);
			expect(node, id).toBeDefined();
			expect(node?.meta.compatibility, id).toBeDefined();
		}
		const main = nodes.find(
			(candidate) => candidate.meta.sasiId === TAB_TO_MAIN_LEAF_ID,
		);
		expect(main?.meta.compatibility?.scope).toBe('surface_panel:current');
		expect(main?.meta.compatibility?.target).toBe('→surface:main_leaf');
		expect(main?.meta.scope).toBe('surface_panel:current');
	});
});

describe('U200 scope: el alcance decide que objetos se ven afectados', () => {
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

	it('surface_panel:current cubre lo enfocado este donde este', () => {
		expect(scopedCandidateKeys(snapshot, 'surface_panel:current')).toEqual(
			scopedCandidateKeys(snapshot, 'workspace:last_focused'),
		);
		expect(
			resolveScopedFocus(snapshot, 'surface_panel:current', 'v2', null),
		).toEqual({ ok: true, key: 'v2' });
		expect(isKnownPanelScope('surface_panel:current')).toBe(true);
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

describe('U200-L5 plan: reorden sin recrear (tabs-1)', () => {
	it('reorden dentro del grupo planifica SIN trasplante', () => {
		expect(planScopedMove(layout('b2'), 'reorder-left')).toEqual({
			ok: true,
			move: {
				kind: 'reorder',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				fromIndex: 1,
				toIndex: 0,
			},
		});
		expect(planScopedMove(layout('b2'), 'reorder-right')).toEqual({
			ok: true,
			move: {
				kind: 'reorder',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				fromIndex: 1,
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('b3'), 'reorder-start')).toEqual({
			ok: true,
			move: {
				kind: 'reorder',
				leafKey: 'b3',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				fromIndex: 2,
				toIndex: 0,
			},
		});
		expect(planScopedMove(layout('editor-tab-2'), 'reorder-end')).toEqual({
			ok: true,
			move: {
				kind: 'reorder',
				leafKey: 'editor-tab-2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:1',
				fromIndex: 0,
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
});

describe('U200-L5 reorderChildWithinParent: misma instancia, cero recreacion', () => {
	function mockTabs(count: number): {
		parent: {
			children: unknown[];
			tabHeaderEls: unknown[];
			currentTab: number;
			selectTabIndex: (index: number) => void;
		};
		leaves: { tabHeaderEl: unknown; detach: () => void; setViewState: () => void }[];
		selectSpy: (index: number) => void;
	} {
		class MockHTMLCollection {
			[index: number]: unknown;
			get length(): number {
				let count = 0;
				while (this[count] !== undefined) count++;
				return count;
			}
			push(item: unknown): void {
				const len = this.length;
				this[len] = item;
			}
			indexOf(item: unknown): number {
				const len = this.length;
				for (let i = 0; i < len; i++) {
					if (this[i] === item) return i;
				}
				return -1;
			}
			splice(start: number, deleteCount: number, ...items: unknown[]): void {
				const arr: unknown[] = [];
				const len = this.length;
				for (let i = 0; i < len; i++) {
					arr.push(this[i]);
					delete this[i];
				}
				arr.splice(start, deleteCount, ...items);
				for (let i = 0; i < arr.length; i++) {
					this[i] = arr[i];
				}
			}
		}
		const container = {
			children: new MockHTMLCollection(),
			insertBefore(node: unknown, ref: unknown) {
				const at = this.children.indexOf(node);
				if (at >= 0) this.children.splice(at, 1);
				const to = ref === null ? -1 : this.children.indexOf(ref);
				if (to < 0) this.children.push(node);
				else this.children.splice(to, 0, node);
			},
		};
		const leaves: {
			tabHeaderEl: unknown;
			detach: () => void;
			setViewState: () => void;
		}[] = [];
		for (let i = 0; i < count; i++) {
			const header = {
				id: `h${i}`,
				parentNode: container,
			};
			container.children.push(header);
			leaves.push({
				tabHeaderEl: header,
				detach: vi.fn(),
				setViewState: vi.fn(),
			});
		}
		const selectSpy = vi.fn((_index: number): void => undefined);
		const parent = {
			children: [...leaves] as unknown[],
			tabHeaderEls: Array.from({ length: count }, (_, i) => container.children[i]),
			currentTab: 1,
			selectTabIndex: selectSpy,
		};
		return { parent, leaves, selectSpy };
	}

	it('mueve la hoja existente: misma identidad, headers en orden, foco sigue', () => {
		const { parent, leaves, selectSpy } = mockTabs(3);
		const target = leaves[1];
		expect(reorderChildWithinParent(parent, target, 0)).toBe(true);
		// Misma instancia (toBe, no toEqual) en la nueva posicion.
		expect(parent.children[0]).toBe(target);
		expect(parent.children).toEqual([leaves[1], leaves[0], leaves[2]]);
		expect(parent.tabHeaderEls[0]).toBe(target?.tabHeaderEl);
		expect(selectSpy).toHaveBeenCalledWith(0);
		// Cero recreacion: la ruta no conoce detach/setViewState.
		for (const leaf of leaves) {
			expect(leaf.detach).not.toHaveBeenCalled();
			expect(leaf.setViewState).not.toHaveBeenCalled();
		}
	});

	it('al final y con indices recortados', () => {
		const { parent, leaves } = mockTabs(2);
		expect(reorderChildWithinParent(parent, leaves[0], 99)).toBe(true);
		expect(parent.children).toEqual([leaves[1], leaves[0]]);
	});

	it('anomalo: padre nulo, hoja ajena y header huerfano no corrompen', () => {
		const { parent, leaves } = mockTabs(2);
		const before = [...parent.children];
		expect(reorderChildWithinParent(null, leaves[0], 1)).toBe(false);
		expect(reorderChildWithinParent(undefined, leaves[0], 1)).toBe(false);
		expect(
			reorderChildWithinParent(parent, { tabHeaderEl: null }, 1),
		).toBe(false);
		expect(parent.children).toEqual(before);
		// Header sin parentNode: rollback de los arrays, orden intacto.
		const orphan = {
			tabHeaderEl: { remove: () => undefined },
			detach: vi.fn(),
			setViewState: vi.fn(),
		};
		(parent.children as unknown[]).push(orphan);
		expect(reorderChildWithinParent(parent, orphan, 0)).toBe(false);
		expect(parent.children[parent.children.length - 1]).toBe(orphan);
	});
});

describe('U200-L5 plan: movimientos entre superficies (tabs-2)', () => {
	it('aterrizan al final del ultimo grupo destino', () => {
		expect(planScopedMove(layout('b2'), 'surface-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'left_sidebar:0',
				toIndex: 2,
			},
		});
		expect(planScopedMove(layout('v1'), 'surface-main')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'v1',
				fromGroupId: 'left_sidebar:0',
				toGroupId: 'main_leaf:2',
				toIndex: 1,
			},
		});
	});

	it('ya en destino: reordena sin recrear o informa borde', () => {
		// v2 esta al final del sidebar -> borde (ya no hay adonde ir).
		expect(planScopedMove(layout('v2'), 'surface-left')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		// Mismo grupo sin estar al final -> reorder al final, sin recrear.
		const solo: ScopedLayoutSnapshot = {
			groups: [
				{
					id: 'main_leaf:0',
					surface: 'main_leaf',
					leafKeys: ['k1', 'k2', 'k3'],
					trail: [{ direction: 'vertical', index: 0 }],
				},
			],
			focusedKey: 'k1',
			isPopout: false,
		};
		expect(planScopedMove(solo, 'surface-main')).toEqual({
			ok: true,
			move: {
				kind: 'reorder',
				leafKey: 'k1',
				fromGroupId: 'main_leaf:0',
				toGroupId: 'main_leaf:0',
				fromIndex: 0,
				toIndex: 2,
			},
		});
		// c1 esta al final de su grupo (el ultimo del main): borde.
		expect(planScopedMove(layout('c1'), 'surface-main')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
	});

	it('superficie destino sin grupos: plan de grupo nuevo', () => {
		const snap = layout('b2');
		const noRight: ScopedLayoutSnapshot = {
			...snap,
			groups: snap.groups.filter((g) => g.surface !== 'right_sidebar'),
		};
		// right_sidebar no existe en este fixture: el destino sin grupos
		// pide creacion (el main si tiene grupos: caso leaf normal arriba).
		const noLeft: ScopedLayoutSnapshot = {
			...snap,
			groups: snap.groups.filter((g) => g.surface !== 'left_sidebar'),
		};
		expect(planScopedMove(noLeft, 'surface-left')).toEqual({
			ok: true,
			move: {
				kind: 'surface-new-group',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				surface: 'left_sidebar',
			},
		});
		expect(noRight.groups.some((g) => g.surface === 'right_sidebar')).toBe(
			false,
		);
		expect(planScopedMove(noRight, 'surface-right')).toEqual({
			ok: true,
			move: {
				kind: 'surface-new-group',
				leafKey: 'b2',
				fromGroupId: 'main_leaf:1',
				surface: 'right_sidebar',
			},
		});
	});

	it('guardas globales tambien valen entre superficies', () => {
		expect(planScopedMove(layout('b2', true), 'surface-left')).toEqual({
			ok: false,
			reason: 'popout',
		});
		expect(planScopedMove(layout(null), 'surface-main')).toEqual({
			ok: false,
			reason: 'no-focused-panel',
		});
	});
});

describe('U200-L5 plan: regla direccional geometrica (tabs-3)', () => {
	it('eje X bajo padre vertical: vecinos como L4', () => {
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
		// Borde X: split vertical, como L4.
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
	});

	it('eje Y bajo padre vertical: NO hay vecino (L4 saltaba mal)', () => {
		// L4 devolvia leaf a main_leaf:1 (un grupo LATERAL) para un
		// movimiento vertical. La regla madura pide split horizontal.
		expect(planScopedMove(layout('c1'), 'direction-above')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'c1',
				fromGroupId: 'main_leaf:2',
				direction: 'horizontal',
				before: true,
				targetLevel: 'root',
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
				targetLevel: 'root',
			},
		});
		// El sidebar de un grupo tampoco cruza superficies: split propio.
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

	it('par apilado (tabs-4A): arriba/abajo van al vecino real', () => {
		expect(planScopedMove(pairLayout('d1'), 'direction-above')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'd1',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:0',
				toIndex: 2,
			},
		});
		expect(planScopedMove(pairLayout('t2'), 'direction-below')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 't2',
				fromGroupId: 'main_leaf:0',
				toGroupId: 'main_leaf:1',
				toIndex: 1,
			},
		});
		// Eje contrario en par apilado: split de raiz, no salto lateral.
		expect(planScopedMove(pairLayout('d1'), 'direction-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'd1',
				fromGroupId: 'main_leaf:1',
				direction: 'vertical',
				before: true,
				targetLevel: 'root',
			},
		});
	});

	it('anidado: sube de nivel cuando el nivel propio no tiene el eje', () => {
		// B esta bajo split horizontal: left sube al vertical y da A.
		expect(planScopedMove(nestedLayout('b1'), 'direction-left')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'b1',
				fromGroupId: 'main_leaf:1',
				toGroupId: 'main_leaf:0',
				toIndex: 1,
			},
		});
		// A a la derecha: el subarbol hermano [B,C] aporta su borde (B).
		expect(planScopedMove(nestedLayout('a1'), 'direction-right')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'a1',
				fromGroupId: 'main_leaf:0',
				toGroupId: 'main_leaf:1',
				toIndex: 1,
			},
		});
		// B arriba: borde de su columna (aislada) -> at-edge (evita bucles infinitos de splits).
		expect(planScopedMove(nestedLayout('b1'), 'direction-above')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		// Si tiene multiples tabs, si hace split para separar la pestana activa.
		const nestedMulti = nestedLayout('b1');
		nestedMulti.groups[1]!.leafKeys = ['b1', 'b2'];
		expect(planScopedMove(nestedMulti, 'direction-above')).toEqual({
			ok: true,
			move: {
				kind: 'leaf-split',
				leafKey: 'b1',
				fromGroupId: 'main_leaf:1',
				direction: 'horizontal',
				before: true,
			},
		});
		// C arriba: B.
		expect(planScopedMove(nestedLayout('c1'), 'direction-above')).toEqual({
			ok: true,
			move: {
				kind: 'leaf',
				leafKey: 'c1',
				fromGroupId: 'main_leaf:2',
				toGroupId: 'main_leaf:1',
				toIndex: 1,
			},
		});
	});

	it('findDirectionalNeighbor: matriz de ejes y niveles', () => {
		const groups = nestedLayout('a1').groups;
		expect(axisOfDirectionVariation('direction-left')).toBe('x');
		expect(axisOfDirectionVariation('direction-above')).toBe('y');
		// A(0): x-1 nada, x+1 B(1), y nada.
		expect(findDirectionalNeighbor(groups, 0, 'x', -1)).toBeNull();
		expect(findDirectionalNeighbor(groups, 0, 'x', 1)).toBe(1);
		expect(findDirectionalNeighbor(groups, 0, 'y', -1)).toBeNull();
		expect(findDirectionalNeighbor(groups, 0, 'y', 1)).toBeNull();
		// B(1): y+1 C(2), y-1 nada, x-1 A(0), x+1 nada.
		expect(findDirectionalNeighbor(groups, 1, 'y', 1)).toBe(2);
		expect(findDirectionalNeighbor(groups, 1, 'y', -1)).toBeNull();
		expect(findDirectionalNeighbor(groups, 1, 'x', -1)).toBe(0);
		expect(findDirectionalNeighbor(groups, 1, 'x', 1)).toBeNull();
	});

	it('grupo entero: direccion + reservas ortogonales, sin envoltura', () => {
		// Plano vertical: left/right directos como L4.
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
		// c1 right: sin vecino en ningun eje -> borde (no wrap, no split).
		expect(planScopedMove(layout('c1'), 'move-group-right')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		// En layout de columnas verticales, up no tiene vecino vertical -> at-edge (sin falsos swaps laterales).
		expect(planScopedMove(layout('a1'), 'move-group-up')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(layout('v1'), 'move-group-down')).toEqual({
			ok: false,
			reason: 'single-group',
		});
		// Par apilado (tabs-4B): 1 swap basta en cada sentido vertical.
		expect(planScopedMove(pairLayout('t1'), 'move-group-down')).toEqual({
			ok: true,
			move: {
				kind: 'group-swap',
				leafKey: 't1',
				activeGroupId: 'main_leaf:0',
				neighborGroupId: 'main_leaf:1',
			},
		});
		expect(planScopedMove(pairLayout('d1'), 'move-group-up')).toEqual({
			ok: true,
			move: {
				kind: 'group-swap',
				leafKey: 'd1',
				activeGroupId: 'main_leaf:1',
				neighborGroupId: 'main_leaf:0',
			},
		});
		// En par apilado (horizontal), left/right no intercambian verticalmente.
		expect(planScopedMove(pairLayout('t1'), 'move-group-left')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(pairLayout('t1'), 'move-group-right')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
	});

	it('findGroupMoveNeighbor respeta el eje pedido sin saltos ortogonales involuntarios', () => {
		const groups = nestedLayout('b1').groups;
		// B up: sin vertical propio ni columna vecina arriba -> null (at-edge).
		expect(findGroupMoveNeighbor(groups, 1, 'move-group-up')).toBeNull();
		// B left: sube de nivel en el split vertical -> lateral A (0).
		expect(findGroupMoveNeighbor(groups, 1, 'move-group-left')).toBe(0);
		// B down: vecino en su propio sub-split horizontal -> C (2).
		expect(findGroupMoveNeighbor(groups, 1, 'move-group-down')).toBe(2);
		// A left: nada en ningun eje -> null (borde).
		expect(findGroupMoveNeighbor(groups, 0, 'move-group-left')).toBeNull();
		// C down: borde inferior -> null.
		expect(findGroupMoveNeighbor(groups, 2, 'move-group-down')).toBeNull();
		// Par apilado (horizontal): left/right son at-edge (null), NO intercambian verticalmente.
		const pairGroups = pairLayout('t1').groups;
		expect(findGroupMoveNeighbor(pairGroups, 0, 'move-group-left')).toBeNull();
		expect(findGroupMoveNeighbor(pairGroups, 0, 'move-group-right')).toBeNull();
		expect(findGroupMoveNeighbor(pairGroups, 0, 'move-group-down')).toBe(1);
		expect(findGroupMoveNeighbor(pairGroups, 1, 'move-group-up')).toBe(0);
	});

	it('grid 3x3 asimetrico: permite navegar entre celdas contiguas sin falsos at-edge', () => {
		// Vertical dentro de col 0 (anidamiento asimetrico)
		expect(planScopedMove(grid3x3Layout('cell-0-0'), 'direction-below')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:1:0' },
		});
		expect(planScopedMove(grid3x3Layout('cell-1-0'), 'direction-below')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:2:0' },
		});
		expect(planScopedMove(grid3x3Layout('cell-2-0'), 'direction-above')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:1:0' },
		});
		expect(planScopedMove(grid3x3Layout('cell-1-0'), 'direction-above')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:0:0' },
		});

		// Vertical dentro de col 1 (anidamiento asimetrico invertido)
		expect(planScopedMove(grid3x3Layout('cell-0-1'), 'direction-below')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:1:1' },
		});
		expect(planScopedMove(grid3x3Layout('cell-1-1'), 'direction-below')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:2:1' },
		});
		expect(planScopedMove(grid3x3Layout('cell-2-1'), 'direction-above')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:1:1' },
		});
		expect(planScopedMove(grid3x3Layout('cell-1-1'), 'direction-above')).toMatchObject({
			ok: true,
			move: { kind: 'leaf', toGroupId: 'grid:0:1' },
		});

		// Horizontal entre columnas contiguas
		expect(planScopedMove(grid3x3Layout('cell-0-0'), 'direction-right')).toMatchObject({
			ok: true,
		});
		expect(planScopedMove(grid3x3Layout('cell-1-0'), 'direction-right')).toMatchObject({
			ok: true,
		});
		expect(planScopedMove(grid3x3Layout('cell-2-0'), 'direction-right')).toMatchObject({
			ok: true,
		});
		expect(planScopedMove(grid3x3Layout('cell-0-1'), 'direction-left')).toMatchObject({
			ok: true,
		});
		expect(planScopedMove(grid3x3Layout('cell-1-1'), 'direction-left')).toMatchObject({
			ok: true,
		});
		expect(planScopedMove(grid3x3Layout('cell-2-1'), 'direction-left')).toMatchObject({
			ok: true,
		});

		// Bordes reales devuelven at-edge en celdas aisladas
		expect(planScopedMove(grid3x3Layout('cell-0-0'), 'direction-above')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(grid3x3Layout('cell-2-0'), 'direction-below')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
		expect(planScopedMove(grid3x3Layout('cell-2-2'), 'direction-below')).toEqual({
			ok: false,
			reason: 'at-edge',
		});
	});
});

describe('U200 plan: previous/next envuelven; first/last van a los extremos', () => {
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

	it('los previous/next no cruzan superficies', () => {
		// v2 esta en el unico grupo del sidebar: previous/next es single-group
		// aunque el main tenga tres grupos.
		expect(planScopedMove(layout('v2'), 'group-next')).toEqual({
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

describe('U200 maximize con scope: overlay reversible, no-ops explicitos', () => {
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

describe('U200 superficie por cadena de parents (API publica)', () => {
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

describe('U200 descriptores: 20 ids, nombres y biyeccion', () => {
	it('id <-> variacion es biyectiva', () => {
		const variations = Object.values(ACTION_ID_FOR_VARIATION);
		expect(new Set(variations).size).toBe(19);
		for (const [variation, id] of Object.entries(ACTION_ID_FOR_VARIATION)) {
			expect(variationForActionId(id)).toBe(variation);
		}
		expect(variationForActionId('vaultman.move.nope')).toBeNull();
		expect(variationForActionId(TOGGLE_MAXIMIZE_ID)).toBeNull();
	});

	it('los 20 descriptores son checkables con los nombres exactos', () => {
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
			'Move active tab to left sidebar',
			'Move active tab to right sidebar',
			'Move active tab to main area',
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
			'sasi.move.tab_to_left_sidebar',
			'sasi.move.tab_to_right_sidebar',
			'sasi.move.tab_to_main_leaf',
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
