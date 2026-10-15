import type { SasiCompatibility, SasiRegistry } from './logicSasiRegistry';
import type { SasiCommandDescriptor } from './logicSasiCommands';
import { selectCommandFrame } from './logicFrameActivation';
import {
	GROUP_MOVE_LEFT_ID,
	GROUP_MOVE_RIGHT_ID,
	TAB_MOVE_NEXT_ID,
	TAB_MOVE_PREVIOUS_ID,
	TOGGLE_MAXIMIZE_ID,
} from './logicSasiTabMoveActions';

export {
	GROUP_MOVE_LEFT_ID,
	GROUP_MOVE_RIGHT_ID,
	TAB_MOVE_NEXT_ID,
	TAB_MOVE_PREVIOUS_ID,
	TOGGLE_MAXIMIZE_ID,
};

/**
 * U200-L4: scoped panel actions that really move.
 *
 * Objetivo (doctrina fijada por el dev): CUALQUIER panel enfocado (editores,
 * paneles laterales del plugin, instancias vaultman-frame enfocadas) es un
 * destino valido. Los esqueletos L2 (`vaultman.move.tabToPreviousGroup` /
 * `NextGroup` / `groupLeft` / `groupRight`, `vaultman.toolbar.toggleMaximize`)
 * solo hacian `Notice` + `false` en DOM: ese comportamiento era el bug.
 * Aqui cada variacion planifica contra el MISMO mecanismo (snapshot plano ->
 * chequeo de compatibilidad de superficie -> operacion de hoja -> restauracion
 * de foco) y o bien ejecuta el movimiento o bien informa del bloqueador
 * PRECISO (que superficie/alcance fallo y por que). `Notice` es solo para
 * errores genuinos.
 *
 * Solo hay API publica de Obsidian en la ruta de ejecucion (`main.ts`):
 * `createLeafInParent`, `createLeafBySplit`, `setViewState`/`getViewState`,
 * `getEphemeralState`/`setEphemeralState`, `detach`, `revealLeaf`,
 * `setActiveLeaf`, `getContainer`, `.parent` (publico desde 1.6.6).
 * NO existe `moveLeaf*` publico (verificado en
 * `node_modules/obsidian/obsidian.d.ts`: solo `moveLeafToPopout`), asi que
 * mover = trasplantar el `ViewState` a una hoja nueva y separar la vieja.
 * El orden de grupos/pestanas se lee del `children` interno (NO documentado,
 * fragil ante versiones): `main.ts` lo lee con chequeo de forma y este modulo
 * solo ve snapshots planos, unit-testeables con hojas simuladas.
 */

//...----------—————————————(   IDS   )————————————------------...\\

/** Reorden dentro del grupo. */
export const TAB_REORDER_LEFT_ID = 'vaultman.move.tabLeftInGroup';
export const TAB_REORDER_RIGHT_ID = 'vaultman.move.tabRightInGroup';
export const TAB_REORDER_START_ID = 'vaultman.move.tabToStartOfGroup';
export const TAB_REORDER_END_ID = 'vaultman.move.tabToEndOfGroup';
/** Salto a otro grupo (los dos centrales ya existian en L2). */
export const TAB_FIRST_GROUP_ID = 'vaultman.move.tabToFirstGroup';
export const TAB_LAST_GROUP_ID = 'vaultman.move.tabToLastGroup';
/** Direccionales: sin vecino crean el grupo por split (nunca no-op mudo). */
export const TAB_DIR_LEFT_ID = 'vaultman.move.tabToLeftGroup';
export const TAB_DIR_RIGHT_ID = 'vaultman.move.tabToRightGroup';
export const TAB_DIR_ABOVE_ID = 'vaultman.move.tabToAboveGroup';
export const TAB_DIR_BELOW_ID = 'vaultman.move.tabToBelowGroup';
/** Grupo entero (los dos horizontales ya existian en L2). */
export const GROUP_MOVE_UP_ID = 'vaultman.move.groupUp';
export const GROUP_MOVE_DOWN_ID = 'vaultman.move.groupDown';

export const ALL_SCOPED_PANEL_ACTION_IDS = [
	TAB_REORDER_LEFT_ID,
	TAB_REORDER_RIGHT_ID,
	TAB_REORDER_START_ID,
	TAB_REORDER_END_ID,
	TAB_MOVE_PREVIOUS_ID,
	TAB_MOVE_NEXT_ID,
	TAB_FIRST_GROUP_ID,
	TAB_LAST_GROUP_ID,
	TAB_DIR_LEFT_ID,
	TAB_DIR_RIGHT_ID,
	TAB_DIR_ABOVE_ID,
	TAB_DIR_BELOW_ID,
	GROUP_MOVE_LEFT_ID,
	GROUP_MOVE_RIGHT_ID,
	GROUP_MOVE_UP_ID,
	GROUP_MOVE_DOWN_ID,
	TOGGLE_MAXIMIZE_ID,
] as const;

export type ScopedMoveVariation =
	| 'reorder-left'
	| 'reorder-right'
	| 'reorder-start'
	| 'reorder-end'
	| 'group-previous'
	| 'group-next'
	| 'group-first'
	| 'group-last'
	| 'direction-left'
	| 'direction-right'
	| 'direction-above'
	| 'direction-below'
	| 'move-group-left'
	| 'move-group-right'
	| 'move-group-up'
	| 'move-group-down';

const ACTION_ID_TO_VARIATION: Readonly<Record<string, ScopedMoveVariation>> = {
	[TAB_REORDER_LEFT_ID]: 'reorder-left',
	[TAB_REORDER_RIGHT_ID]: 'reorder-right',
	[TAB_REORDER_START_ID]: 'reorder-start',
	[TAB_REORDER_END_ID]: 'reorder-end',
	[TAB_MOVE_PREVIOUS_ID]: 'group-previous',
	[TAB_MOVE_NEXT_ID]: 'group-next',
	[TAB_FIRST_GROUP_ID]: 'group-first',
	[TAB_LAST_GROUP_ID]: 'group-last',
	[TAB_DIR_LEFT_ID]: 'direction-left',
	[TAB_DIR_RIGHT_ID]: 'direction-right',
	[TAB_DIR_ABOVE_ID]: 'direction-above',
	[TAB_DIR_BELOW_ID]: 'direction-below',
	[GROUP_MOVE_LEFT_ID]: 'move-group-left',
	[GROUP_MOVE_RIGHT_ID]: 'move-group-right',
	[GROUP_MOVE_UP_ID]: 'move-group-up',
	[GROUP_MOVE_DOWN_ID]: 'move-group-down',
};

export function variationForActionId(actionId: string): ScopedMoveVariation | null {
	return ACTION_ID_TO_VARIATION[actionId] ?? null;
}

/** Inversa de `ACTION_ID_TO_VARIATION` (biyeccion: una variacion = una accion). */
export const ACTION_ID_FOR_VARIATION: Readonly<Record<ScopedMoveVariation, string>> = {
	'reorder-left': TAB_REORDER_LEFT_ID,
	'reorder-right': TAB_REORDER_RIGHT_ID,
	'reorder-start': TAB_REORDER_START_ID,
	'reorder-end': TAB_REORDER_END_ID,
	'group-previous': TAB_MOVE_PREVIOUS_ID,
	'group-next': TAB_MOVE_NEXT_ID,
	'group-first': TAB_FIRST_GROUP_ID,
	'group-last': TAB_LAST_GROUP_ID,
	'direction-left': TAB_DIR_LEFT_ID,
	'direction-right': TAB_DIR_RIGHT_ID,
	'direction-above': TAB_DIR_ABOVE_ID,
	'direction-below': TAB_DIR_BELOW_ID,
	'move-group-left': GROUP_MOVE_LEFT_ID,
	'move-group-right': GROUP_MOVE_RIGHT_ID,
	'move-group-up': GROUP_MOVE_UP_ID,
	'move-group-down': GROUP_MOVE_DOWN_ID,
};

/** Compatibilidad con la direccion de `main.ts` (`previous`/`next`, ...). */
export function variationForLegacyDirection(
	kind: 'tab' | 'group',
	direction: string,
): ScopedMoveVariation | null {
	if (kind === 'tab') {
		if (direction === 'previous') return 'group-previous';
		if (direction === 'next') return 'group-next';
		return null;
	}
	if (direction === 'left') return 'move-group-left';
	if (direction === 'right') return 'move-group-right';
	return null;
}

//...----------—————————————(   COMPATIBILIDAD   )————————————------------...\\

/**
 * Valor de compatibilidad por accion: la fuente unica de los limites de cada
 * accion (superficies soportadas, alcances, que queda explicitamente fuera).
 * Vive en el catalogo (`SasiDef.compatibility` en `logicSasiRegistry.ts`) y
 * se renderiza donde el catalogo ya muestra limites (entrada del inspector +
 * meta de nodos ApiScene). Sin segunda fuente de verdad.
 */
export const SCOPED_PANEL_SURFACES = [
	'left_sidebar',
	'main_leaf',
	'right_sidebar',
] as const;

export type ScopedSurface = (typeof SCOPED_PANEL_SURFACES)[number];

export const SCOPED_MOVE_COMPATIBILITY: SasiCompatibility = {
	surfaces: [...SCOPED_PANEL_SURFACES],
	scopes: ['workspace:last_focused'],
	outOfRange: [
		'popout windows',
		'move/copy to new window',
		'split vertical/horizontal',
	],
};

export const SCOPED_MAXIMIZE_COMPATIBILITY: SasiCompatibility = {
	surfaces: [...SCOPED_PANEL_SURFACES],
	scopes: ['workspace:last_focused'],
	outOfRange: [
		'popout windows',
		'single-group layouts',
		'move/copy to new window',
	],
};

/** Alcance por defecto, igual que los colegas de la tabla. */
export const SCOPED_PANEL_DEFAULT_SCOPE = 'workspace:last_focused';

//...----------—————————————(   REGISTRO   )————————————------------...\\

const SCOPED_PANEL_DEFS = [
	{ id: TAB_REORDER_LEFT_ID, labelKey: 'sasi.move.tab_left_in_group', icon: 'lucide-arrow-left', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_REORDER_RIGHT_ID, labelKey: 'sasi.move.tab_right_in_group', icon: 'lucide-arrow-right', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_REORDER_START_ID, labelKey: 'sasi.move.tab_to_start_of_group', icon: 'lucide-chevrons-left', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_REORDER_END_ID, labelKey: 'sasi.move.tab_to_end_of_group', icon: 'lucide-chevrons-right', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_MOVE_PREVIOUS_ID, labelKey: 'sasi.move.tab_to_previous_group', icon: 'lucide-arrow-left', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_MOVE_NEXT_ID, labelKey: 'sasi.move.tab_to_next_group', icon: 'lucide-arrow-right', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_FIRST_GROUP_ID, labelKey: 'sasi.move.tab_to_first_group', icon: 'lucide-skip-back', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_LAST_GROUP_ID, labelKey: 'sasi.move.tab_to_last_group', icon: 'lucide-skip-forward', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_DIR_LEFT_ID, labelKey: 'sasi.move.tab_to_left_group', icon: 'lucide-panel-left', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_DIR_RIGHT_ID, labelKey: 'sasi.move.tab_to_right_group', icon: 'lucide-panel-right', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_DIR_ABOVE_ID, labelKey: 'sasi.move.tab_to_above_group', icon: 'lucide-panel-top', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TAB_DIR_BELOW_ID, labelKey: 'sasi.move.tab_to_below_group', icon: 'lucide-panel-bottom', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: GROUP_MOVE_LEFT_ID, labelKey: 'sasi.move.group_left', icon: 'lucide-chevrons-left', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: GROUP_MOVE_RIGHT_ID, labelKey: 'sasi.move.group_right', icon: 'lucide-chevrons-right', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: GROUP_MOVE_UP_ID, labelKey: 'sasi.move.group_up', icon: 'lucide-chevrons-up', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: GROUP_MOVE_DOWN_ID, labelKey: 'sasi.move.group_down', icon: 'lucide-chevrons-down', compatibility: SCOPED_MOVE_COMPATIBILITY },
	{ id: TOGGLE_MAXIMIZE_ID, labelKey: 'sasi.toolbar.toggle_maximize', icon: 'lucide-maximize', compatibility: SCOPED_MAXIMIZE_COMPATIBILITY },
] as const;

export function registerScopedPanelActions(registry: SasiRegistry): void {
	for (const def of SCOPED_PANEL_DEFS) {
		registry.register({
			id: def.id,
			axis: 'function',
			kind: 'action',
			labelKey: def.labelKey,
			icon: def.icon,
			// Cualquier split de las tres superficies principales es destino
			// valido: el panel enfocado manda, sea o no de Vaultman.
			supports: SCOPED_PANEL_SURFACES.map((surface) => ({ surface })),
			scope: SCOPED_PANEL_DEFAULT_SCOPE,
			compatibility: def.compatibility,
		});
	}
}

//...----------—————————————(   SCOPE   )————————————------------...\\

export interface ScopedGroupSnapshot {
	id: string;
	surface: ScopedSurface;
	/** Claves opacas de hoja en orden visual (las resuelve `main.ts`). */
	leafKeys: readonly string[];
}

export interface ScopedLayoutSnapshot {
	groups: readonly ScopedGroupSnapshot[];
	/** Objetivo ya resuelto por alcance (null = sin foco utilizable). */
	focusedKey: string | null;
	isPopout: boolean;
}

export type ScopedFocusBlockReason =
	| 'no-focused-panel'
	| 'unknown-scope';

export type ScopedFocusResolution =
	| { ok: true; key: string }
	| { ok: false; reason: ScopedFocusBlockReason };

function surfaceOfScopeToken(scope: string): ScopedSurface | null {
	if (scope === 'surface:left-sidebar') return 'left_sidebar';
	if (scope === 'surface:main') return 'main_leaf';
	if (scope === 'surface:right-sidebar') return 'right_sidebar';
	return null;
}

/**
 * El alcance elige el CONJUNTO candidato; la eleccion dentro del conjunto es
 * `selectCommandFrame` (el ultimo foco vivo gana al orden de lista, igual que
 * los colegas). Cambiar el alcance cambia que objetos se ven afectados.
 */
export function scopedCandidateKeys(
	snapshot: Pick<ScopedLayoutSnapshot, 'groups'>,
	scope: string,
): readonly string[] {
	if (scope === 'workspace:last_focused' || scope === 'workspace:all') {
		return snapshot.groups.flatMap((group) => group.leafKeys);
	}
	const surface = surfaceOfScopeToken(scope);
	if (surface) {
		return snapshot.groups
			.filter((group) => group.surface === surface)
			.flatMap((group) => group.leafKeys);
	}
	return [];
}

export function isKnownPanelScope(scope: string): boolean {
	return (
		scope === 'workspace:last_focused' ||
		scope === 'workspace:all' ||
		surfaceOfScopeToken(scope) !== null
	);
}

export function resolveScopedFocus(
	snapshot: Pick<ScopedLayoutSnapshot, 'groups'>,
	scope: string,
	lastFocusedKey: string | null,
	activeKey: string | null,
): ScopedFocusResolution {
	if (!isKnownPanelScope(scope)) {
		return { ok: false, reason: 'unknown-scope' };
	}
	const candidates = scopedCandidateKeys(snapshot, scope);
	if (candidates.length === 0) {
		return { ok: false, reason: 'no-focused-panel' };
	}
	const anchor =
		lastFocusedKey !== null && candidates.includes(lastFocusedKey)
			? lastFocusedKey
			: activeKey !== null && candidates.includes(activeKey)
				? activeKey
				: null;
	const picked = selectCommandFrame(candidates, anchor);
	if (!picked) return { ok: false, reason: 'no-focused-panel' };
	return { ok: true, key: picked };
}

/** Clasifica una hoja por su cadena de `parent` (publico desde 1.6.6). */
export interface PanelParentLike {
	parent: PanelParentLike | null;
}

export function surfaceOfLeaf(
	leaf: { parent: PanelParentLike | null } | null,
	roots: {
		left: PanelParentLike;
		main: PanelParentLike;
		right: PanelParentLike;
	},
): ScopedSurface | 'unknown' {
	let node: PanelParentLike | null = leaf?.parent ?? null;
	while (node) {
		if (node === roots.left) return 'left_sidebar';
		if (node === roots.main) return 'main_leaf';
		if (node === roots.right) return 'right_sidebar';
		node = node.parent;
	}
	return 'unknown';
}

//...----------—————————————(   PLAN   )————————————------------...\\

export type ScopedMoveBlockReason =
	| 'no-focused-panel'
	| 'unknown-target'
	| 'ambiguous-target'
	| 'single-group'
	| 'popout'
	| 'at-edge';

export interface ScopedLeafPlan {
	kind: 'leaf';
	leafKey: string;
	fromGroupId: string;
	toGroupId: string;
	/** Indice final en el grupo destino (tamano original). */
	toIndex: number;
}

export interface ScopedSplitPlan {
	kind: 'leaf-split';
	leafKey: string;
	fromGroupId: string;
	direction: 'vertical' | 'horizontal';
	before: boolean;
}

export interface ScopedGroupSwapPlan {
	kind: 'group-swap';
	leafKey: string;
	activeGroupId: string;
	neighborGroupId: string;
}

export type ScopedMovePlan =
	| { ok: true; move: ScopedLeafPlan | ScopedSplitPlan | ScopedGroupSwapPlan }
	| { ok: false; reason: ScopedMoveBlockReason };

function locateFocus(
	snapshot: ScopedLayoutSnapshot,
): { group: ScopedGroupSnapshot; index: number } | { error: 'unknown-target' | 'ambiguous-target' } {
	if (new Set(snapshot.groups.map((group) => group.id)).size !== snapshot.groups.length) {
		return { error: 'ambiguous-target' };
	}
	let found: { group: ScopedGroupSnapshot; index: number } | null = null;
	for (const group of snapshot.groups) {
		const index = group.leafKeys.indexOf(snapshot.focusedKey ?? '');
		if (index >= 0) {
			if (found) return { error: 'ambiguous-target' };
			found = { group, index };
		}
	}
	if (!found) return { error: 'unknown-target' };
	return found;
}

function surfaceGroups(
	snapshot: ScopedLayoutSnapshot,
	surface: ScopedSurface,
): ScopedGroupSnapshot[] {
	return snapshot.groups.filter((group) => group.surface === surface);
}

/**
 * Indice de insercion para reordenar dentro del mismo grupo con la tactica
 * crear-primero-separar-despues: se inserta en `to+1` cuando la hoja viene de
 * antes, porque al separar la original todo lo posterior baja uno.
 */
export function adjustedInsertIndex(from: number, to: number): number {
	return from < to ? to + 1 : to;
}

export function planScopedMove(
	snapshot: ScopedLayoutSnapshot,
	variation: ScopedMoveVariation,
): ScopedMovePlan {
	if (snapshot.isPopout) return { ok: false, reason: 'popout' };
	if (snapshot.focusedKey === null) {
		return { ok: false, reason: 'no-focused-panel' };
	}
	const located = locateFocus(snapshot);
	if ('error' in located) return { ok: false, reason: located.error };
	const { group, index } = located;
	const peers = surfaceGroups(snapshot, group.surface);
	const peerIndex = peers.findIndex((candidate) => candidate.id === group.id);

	const leafTo = (toGroup: ScopedGroupSnapshot, toIndex: number): ScopedMovePlan => ({
		ok: true,
		move: {
			kind: 'leaf',
			leafKey: snapshot.focusedKey as string,
			fromGroupId: group.id,
			toGroupId: toGroup.id,
			toIndex,
		},
	});

	switch (variation) {
		case 'reorder-left': {
			if (index <= 0) return { ok: false, reason: 'at-edge' };
			return leafTo(group, index - 1);
		}
		case 'reorder-right': {
			if (index >= group.leafKeys.length - 1) return { ok: false, reason: 'at-edge' };
			return leafTo(group, index + 1);
		}
		case 'reorder-start': {
			if (index <= 0) return { ok: false, reason: 'at-edge' };
			return leafTo(group, 0);
		}
		case 'reorder-end': {
			if (index >= group.leafKeys.length - 1) return { ok: false, reason: 'at-edge' };
			return leafTo(group, group.leafKeys.length - 1);
		}
		case 'group-previous':
		case 'group-next': {
			// Divergencia deliberada de VSCode (heredada de L2): los bordes
			// ENVUELVEN para no presentar una tecla muerta; first/last cubren
			// los extremos de forma explicita.
			if (peers.length < 2) return { ok: false, reason: 'single-group' };
			const delta = variation === 'group-next' ? 1 : -1;
			const target = peers[(peerIndex + delta + peers.length) % peers.length];
			return leafTo(target, target.leafKeys.length);
		}
		case 'group-first':
		case 'group-last': {
			if (peers.length < 2) return { ok: false, reason: 'single-group' };
			const target = variation === 'group-first' ? peers[0] : peers[peers.length - 1];
			if (target.id === group.id) return { ok: false, reason: 'at-edge' };
			return leafTo(target, target.leafKeys.length);
		}
		case 'direction-left':
		case 'direction-right':
		case 'direction-above':
		case 'direction-below': {
			const delta =
				variation === 'direction-left' || variation === 'direction-above' ? -1 : 1;
			const neighbor = peers[peerIndex + delta];
			if (!neighbor) {
				return {
					ok: true,
					move: {
						kind: 'leaf-split',
						leafKey: snapshot.focusedKey,
						fromGroupId: group.id,
						direction:
							variation === 'direction-left' || variation === 'direction-right'
								? 'vertical'
								: 'horizontal',
						before:
							variation === 'direction-left' || variation === 'direction-above',
					},
				};
			}
			return leafTo(neighbor, neighbor.leafKeys.length);
		}
		case 'move-group-left':
		case 'move-group-up':
		case 'move-group-right':
		case 'move-group-down': {
			if (peers.length < 2) return { ok: false, reason: 'single-group' };
			const delta =
				variation === 'move-group-left' || variation === 'move-group-up' ? -1 : 1;
			const neighbor = peers[peerIndex + delta];
			// Sin envoltura: mover el grupo mas alla del borde no tiene
			// sentido y el split crearia un grupo vacio gemelo.
			if (!neighbor) return { ok: false, reason: 'at-edge' };
			return {
				ok: true,
				move: {
					kind: 'group-swap',
					leafKey: snapshot.focusedKey,
					activeGroupId: group.id,
					neighborGroupId: neighbor.id,
				},
			};
		}
	}
}

export function scopedMoveGuardMessageKey(
	reason: ScopedMoveBlockReason | ScopedFocusBlockReason,
): string {
	switch (reason) {
		case 'no-focused-panel':
			return 'sasi.move.tab.no_focused_panel';
		case 'unknown-scope':
			return 'sasi.move.tab.unknown_scope';
		case 'unknown-target':
			return 'sasi.move.tab.unknown_target';
		case 'ambiguous-target':
			return 'sasi.move.tab.ambiguous_target';
		case 'single-group':
			return 'sasi.move.tab.single_group';
		case 'popout':
			return 'sasi.move.tab.popout_unsupported';
		case 'at-edge':
			return 'sasi.move.tab.at_edge';
	}
}

//...----------—————————————(   MAXIMIZE   )————————————------------...\\

/**
 * Atributos reversibles sobre el panel enfocado (sin destruir el layout).
 * El atributo de superficie vive en el contenedor raiz de la superficie
 * (el CSS no puede alcanzar grupos precedentes desde el grupo activo, pero
 * si descendientes desde la raiz): maximizar oculta el resto de la
 * superficie, nunca otras superficies.
 */
export const MAXIMIZE_TABS_ATTR = 'data-vaultman-maxpanel';
export const MAXIMIZE_LEAF_ATTR = 'data-vaultman-maxpanel-leaf';
export const MAXIMIZE_SURFACE_ATTR = 'data-vaultman-maxsurface';

export interface ScopedMaximizeSnapshot {
	focusedKey: string | null;
	groupCount: number;
	isPopout: boolean;
}

export type ScopedMaximizeResolution =
	| { ok: true; key: string }
	| { ok: false; reason: 'unknown-target' | 'popout' | 'single-group' };

export function resolveScopedMaximize(
	snapshot: ScopedMaximizeSnapshot,
): ScopedMaximizeResolution {
	if (snapshot.focusedKey === null) {
		return { ok: false, reason: 'unknown-target' };
	}
	if (snapshot.isPopout) return { ok: false, reason: 'popout' };
	// Con un solo grupo no hay a que contraponer el panel: no-op explicito.
	if (snapshot.groupCount < 2) return { ok: false, reason: 'single-group' };
	return { ok: true, key: snapshot.focusedKey };
}

export function scopedMaximizeGuardMessageKey(
	reason: 'unknown-target' | 'popout' | 'single-group',
): string {
	if (reason === 'popout') return 'sasi.move.tab.popout_unsupported';
	if (reason === 'single-group') return 'sasi.move.tab.single_group';
	return 'sasi.toolbar.maximize_no_target';
}

//...----------—————————————(   DESCRIPTORES   )————————————------------...\\

export interface ScopedPanelCommandRunner {
	runPanelMove(variation: ScopedMoveVariation, checking: boolean): boolean;
	runToggleMaximize(checking: boolean): boolean;
}

/**
 * Fuente unica de (id, nombre de paleta) para las 17 acciones. `main.ts` las
 * registra tal cual en el publisher; los tests afirman presencia y
 * compatibilidad contra esta fabrica sin duplicar ids.
 */
export function createScopedPanelCommandDescriptors(
	t: (key: string) => string,
	run: ScopedPanelCommandRunner,
): SasiCommandDescriptor[] {
	const move = (
		id: string,
		variation: ScopedMoveVariation,
	): SasiCommandDescriptor => ({
		id,
		name: t(
			SCOPED_PANEL_DEFS.find((def) => def.id === id)?.labelKey ?? id,
		),
		handler: (checking: boolean) => run.runPanelMove(variation, checking),
	});
	return [
		move(TAB_REORDER_LEFT_ID, 'reorder-left'),
		move(TAB_REORDER_RIGHT_ID, 'reorder-right'),
		move(TAB_REORDER_START_ID, 'reorder-start'),
		move(TAB_REORDER_END_ID, 'reorder-end'),
		move(TAB_MOVE_PREVIOUS_ID, 'group-previous'),
		move(TAB_MOVE_NEXT_ID, 'group-next'),
		move(TAB_FIRST_GROUP_ID, 'group-first'),
		move(TAB_LAST_GROUP_ID, 'group-last'),
		move(TAB_DIR_LEFT_ID, 'direction-left'),
		move(TAB_DIR_RIGHT_ID, 'direction-right'),
		move(TAB_DIR_ABOVE_ID, 'direction-above'),
		move(TAB_DIR_BELOW_ID, 'direction-below'),
		move(GROUP_MOVE_LEFT_ID, 'move-group-left'),
		move(GROUP_MOVE_RIGHT_ID, 'move-group-right'),
		move(GROUP_MOVE_UP_ID, 'move-group-up'),
		move(GROUP_MOVE_DOWN_ID, 'move-group-down'),
		{
			id: TOGGLE_MAXIMIZE_ID,
			name: t('sasi.toolbar.toggle_maximize'),
			handler: (checking: boolean) => run.runToggleMaximize(checking),
		},
	];
}
