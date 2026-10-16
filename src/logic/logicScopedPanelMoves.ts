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
 * U200-L4: scoped panel actions that really move. U200-L5: 19 moves +
 * maximize (3 cross-surface moves join the same scoped-target mechanism).
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
 * mover ENTRE grupos = trasplantar el `ViewState` a una hoja nueva y separar
 * la vieja. Reordenar DENTRO del grupo (L5 tabs-1) NUNCA trasplanta: mueve la
 * hoja existente dentro de su `WorkspaceTabs` (`children` + `tabHeaderEls` +
 * `selectTabIndex`, internos con chequeo de forma) preservando hoja, vista y
 * `containerEl`.
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
/** Entre superficies: el tab enfocado aterriza en la superficie destino. */
export const TAB_TO_LEFT_SIDEBAR_ID = 'vaultman.move.tabToLeftSidebar';
export const TAB_TO_RIGHT_SIDEBAR_ID = 'vaultman.move.tabToRightSidebar';
export const TAB_TO_MAIN_LEAF_ID = 'vaultman.move.tabToMainLeaf';
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
	TAB_TO_LEFT_SIDEBAR_ID,
	TAB_TO_RIGHT_SIDEBAR_ID,
	TAB_TO_MAIN_LEAF_ID,
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
	| 'surface-left'
	| 'surface-right'
	| 'surface-main'
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
	[TAB_TO_LEFT_SIDEBAR_ID]: 'surface-left',
	[TAB_TO_RIGHT_SIDEBAR_ID]: 'surface-right',
	[TAB_TO_MAIN_LEAF_ID]: 'surface-main',
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
	'surface-left': TAB_TO_LEFT_SIDEBAR_ID,
	'surface-right': TAB_TO_RIGHT_SIDEBAR_ID,
	'surface-main': TAB_TO_MAIN_LEAF_ID,
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

/**
 * U200-L5 (tabs-2): vocabulario exacto de los movimientos entre
 * superficies. `scope` es la fuente del panel (`surface_panel:current` =
 * el panel enfocado en su superficie actual) y `target` el destino
 * (`→surface:X`). Vive AQUI (fuente unica): `SasiDef.scope` y
 * `COMMAND_SCOPE_MAP` derivan del mismo `SCOPED_SURFACE_PANEL_SCOPE`, y
 * los render sites (inspector + meta ApiScene) reciben el objeto entero
 * sin segunda fuente de verdad. Strings exactos (documentados en el spec
 * L5): `surface_panel:current`, `→surface:left_sidebar`,
 * `→surface:right_sidebar`, `→surface:main_leaf`.
 */
export const SCOPED_SURFACE_PANEL_SCOPE = 'surface_panel:current';

function surfaceMoveCompatibility(target: ScopedSurface): SasiCompatibility {
	const label =
		target === 'left_sidebar'
			? '→surface:left_sidebar'
			: target === 'right_sidebar'
				? '→surface:right_sidebar'
				: '→surface:main_leaf';
	return {
		surfaces: [...SCOPED_PANEL_SURFACES],
		scopes: [SCOPED_SURFACE_PANEL_SCOPE],
		outOfRange: [...SCOPED_MOVE_COMPATIBILITY.outOfRange],
		scope: SCOPED_SURFACE_PANEL_SCOPE,
		target: label,
	};
}

export const SCOPED_SURFACE_LEFT_COMPATIBILITY: SasiCompatibility =
	surfaceMoveCompatibility('left_sidebar');
export const SCOPED_SURFACE_RIGHT_COMPATIBILITY: SasiCompatibility =
	surfaceMoveCompatibility('right_sidebar');
export const SCOPED_SURFACE_MAIN_COMPATIBILITY: SasiCompatibility =
	surfaceMoveCompatibility('main_leaf');

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
	{ id: TAB_TO_LEFT_SIDEBAR_ID, labelKey: 'sasi.move.tab_to_left_sidebar', icon: 'lucide-panel-left', compatibility: SCOPED_SURFACE_LEFT_COMPATIBILITY, scope: SCOPED_SURFACE_PANEL_SCOPE },
	{ id: TAB_TO_RIGHT_SIDEBAR_ID, labelKey: 'sasi.move.tab_to_right_sidebar', icon: 'lucide-panel-right', compatibility: SCOPED_SURFACE_RIGHT_COMPATIBILITY, scope: SCOPED_SURFACE_PANEL_SCOPE },
	{ id: TAB_TO_MAIN_LEAF_ID, labelKey: 'sasi.move.tab_to_main_leaf', icon: 'lucide-panel-top', compatibility: SCOPED_SURFACE_MAIN_COMPATIBILITY, scope: SCOPED_SURFACE_PANEL_SCOPE },
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
			scope: 'scope' in def ? def.scope : SCOPED_PANEL_DEFAULT_SCOPE,
			compatibility: def.compatibility,
		});
	}
}

//...----------—————————————(   SCOPE   )————————————------------...\\

/**
 * U200-L5 (tabs-3): tramo raiz->grupo para la regla direccional geometrica.
 * Cada segmento describe UN split ancestro: su `direction` propia
 * (`vertical` = columnas lado a lado, `horizontal` = filas apiladas,
 * `null` = direccion desconocida/no-split) y el indice del hijo por el que
 * baja la ruta. `main.ts` lo rellena al caminar el arbol; el planner solo ve
 * estos datos planos.
 */
export interface ScopedGroupTrailSegment {
	direction: 'vertical' | 'horizontal' | null;
	index: number;
}

export interface ScopedGroupSnapshot {
	id: string;
	surface: ScopedSurface;
	/** Claves opacas de hoja en orden visual (las resuelve `main.ts`). */
	leafKeys: readonly string[];
	/** Ruta del split raiz de la superficie hasta este grupo (L5). */
	trail: readonly ScopedGroupTrailSegment[];
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
 *
 * U200-L5: `surface_panel:current` (fuente de los movimientos entre
 * superficies) cubre todas las hojas como `workspace:*`: la fuente ES el
 * panel enfocado este donde este; el destino lo fija la accion, no el
 * alcance. El string honesto vive en el catalogo (`SasiDef.scope`,
 * `COMMAND_SCOPE_MAP` y `SasiCompatibility.scope` del mismo modulo).
 */
export function scopedCandidateKeys(
	snapshot: Pick<ScopedLayoutSnapshot, 'groups'>,
	scope: string,
): readonly string[] {
	if (
		scope === 'workspace:last_focused' ||
		scope === 'workspace:all' ||
		scope === SCOPED_SURFACE_PANEL_SCOPE
	) {
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
		scope === SCOPED_SURFACE_PANEL_SCOPE ||
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

/**
 * U200-L5 (tabs-1): reorden dentro del MISMO grupo SIN recrear. El ejecutor
 * mueve la hoja existente dentro de su contenedor (mismo objeto hoja, misma
 * vista, mismo `containerEl`): `detach`/`setViewState` PROHIBIDOS en esta
 * ruta. `fromIndex` es informativo (el ejecutor re-lee el indice vivo).
 */
export interface ScopedReorderPlan {
	kind: 'reorder';
	leafKey: string;
	fromGroupId: string;
	toGroupId: string;
	fromIndex: number;
	toIndex: number;
}

export interface ScopedSplitPlan {
	kind: 'leaf-split';
	leafKey: string;
	fromGroupId: string;
	direction: 'vertical' | 'horizontal';
	before: boolean;
}

/**
 * U200-L5 (tabs-2): la superficie destino no tiene ningun grupo (sidebar
 * vaciado). El ejecutor crea la hoja en la raiz de esa superficie.
 */
export interface ScopedSurfaceNewGroupPlan {
	kind: 'surface-new-group';
	leafKey: string;
	fromGroupId: string;
	surface: ScopedSurface;
}

export interface ScopedGroupSwapPlan {
	kind: 'group-swap';
	leafKey: string;
	activeGroupId: string;
	neighborGroupId: string;
}

export type ScopedMovePlan =
	| {
		ok: true;
		move:
		| ScopedLeafPlan
		| ScopedReorderPlan
		| ScopedSplitPlan
		| ScopedSurfaceNewGroupPlan
		| ScopedGroupSwapPlan;
	}
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
 * U200-L5 (tabs-3): regla direccional geometrica, adaptacion a Obsidian de
 * VSCode `moveCopyEditorsToGroup` + `AbstractMoveCopyGroupAction`.
 *
 * Un split `vertical` ordena hijos lado a lado (eje X: left/right);
 * un split `horizontal` los apila (eje Y: above/below). Solo el split
 * ancestro COMPATIBLE con el eje pedido puede aportar vecino; el orden de
 * caminata (`peers[i+-1]`, regla ingenua L4) se ignora. Sin vecino en el eje
 * a ningun nivel -> `null` (el llamante crea el grupo por split, como
 * VSCode `addGroup`, nunca no-op mudo). Ver spec L5 §3 con permalinks.
 */
export type ScopedMoveAxis = 'x' | 'y';

export function axisOfDirectionVariation(
	variation: 'direction-left' | 'direction-right' | 'direction-above' | 'direction-below',
): ScopedMoveAxis {
	return variation === 'direction-left' || variation === 'direction-right'
		? 'x'
		: 'y';
}

function isCompatibleSplitDirection(
	direction: ScopedGroupTrailSegment['direction'],
	axis: ScopedMoveAxis,
): boolean {
	return axis === 'x' ? direction === 'vertical' : direction === 'horizontal';
}

/**
 * Vecino geometrico del grupo activo en el eje+delta pedidos, o `null`.
 * Baja de niveles profundos a la raiz: el primer split ancestro compatible
 * con un hermano existente en la direccion manda; dentro del subarbol
 * hermano se elige el borde cercano a la fuente (delta -1 = ultimo en
 * orden de caminata, delta +1 = primero), aproximacion de `GRID_APPEARANCE`.
 * Solo grupos de la misma superficie.
 */
export function findDirectionalNeighbor(
	groups: readonly ScopedGroupSnapshot[],
	activeIndex: number,
	axis: ScopedMoveAxis,
	delta: -1 | 1,
): number | null {
	const active = groups[activeIndex];
	if (!active) return null;
	for (let level = active.trail.length - 1; level >= 0; level--) {
		const segment = active.trail[level];
		if (!isCompatibleSplitDirection(segment.direction, axis)) continue;
		const sibling = segment.index + delta;
		if (sibling < 0) continue;
		let best: number | null = null;
		for (let i = 0; i < groups.length; i++) {
			if (i === activeIndex) continue;
			const candidate = groups[i];
			if (candidate.surface !== active.surface) continue;
			if (candidate.trail.length <= level) continue;
			let prefix = true;
			for (let k = 0; k < level; k++) {
				const a = active.trail[k];
				const c = candidate.trail[k];
				if (!c || c.direction !== a.direction || c.index !== a.index) {
					prefix = false;
					break;
				}
			}
			if (!prefix) continue;
			const at = candidate.trail[level];
			if (at.direction !== segment.direction || at.index !== sibling) continue;
			if (best === null || (delta < 0 ? i > best : i < best)) best = i;
		}
		if (best !== null) return best;
	}
	return null;
}

/**
 * Vecino para mover el GRUPO entero: direccion pedida primero y, como VSCode
 * (`findTargetGroup`, issue #50741), reservas ortogonales despues
 * (LEFT/RIGHT prueban UP,DOWN; UP/DOWN prueban LEFT,RIGHT). Sin envoltura,
 * sin crear grupos: sin candidato = borde.
 */
export function findGroupMoveNeighbor(
	groups: readonly ScopedGroupSnapshot[],
	activeIndex: number,
	variation: 'move-group-left' | 'move-group-right' | 'move-group-up' | 'move-group-down',
): number | null {
	const axes: ScopedMoveAxis[] =
		variation === 'move-group-left' || variation === 'move-group-right'
			? ['x', 'y']
			: ['y', 'x'];
	const primaryDelta: -1 | 1 =
		variation === 'move-group-left' || variation === 'move-group-up' ? -1 : 1;
	for (let a = 0; a < axes.length; a++) {
		const axis = axes[a] as ScopedMoveAxis;
		const deltas: ReadonlyArray<-1 | 1> = a === 0 ? [primaryDelta] : [-1, 1];
		for (const delta of deltas) {
			const found = findDirectionalNeighbor(groups, activeIndex, axis, delta);
			if (found !== null) return found;
		}
	}
	return null;
}

/**
 * U200-L5 (tabs-1): padre reordenable sin recrear (forma minima de
 * `WorkspaceTabs`: `children` + `tabHeaderEls` en el mismo orden,
 * `selectTabIndex` para normalizar). Solo reordena lo existente: NUNCA
 * llama a `detach`/`setViewState`/creadores (no los conoce).
 */
export interface ReorderParentLike {
	children: unknown[];
	tabHeaderEls?: unknown;
	currentTab?: unknown;
	selectTabIndex?: unknown;
}

function headerElOf(leaf: unknown): unknown {
	try {
		return (leaf as { tabHeaderEl?: unknown })?.tabHeaderEl ?? null;
	} catch {
		return null;
	}
}

/**
 * Mueve `leaf` a `toIndex` dentro de su propio padre preservando identidad
 * (mismo objeto hoja/vista). Devuelve false ante cualquier anomalia de
 * forma (con rollback de los arrays) para que el llamante informe el
 * bloqueador preciso en vez de corromper el layout.
 */
export function reorderChildWithinParent(
	parent: ReorderParentLike | null | undefined,
	leaf: unknown,
	toIndex: number,
): boolean {
	try {
		if (!parent || !Array.isArray(parent.children)) return false;
		const children = parent.children;
		const from = children.indexOf(leaf);
		if (from < 0 || !Number.isInteger(toIndex)) return false;
		const to = Math.max(0, Math.min(toIndex, children.length - 1));
		const headers = Array.isArray(parent.tabHeaderEls)
			? (parent.tabHeaderEls as unknown[])
			: null;
		const headersAligned = headers !== null && headers.length === children.length;
		if (to === from) {
			if (typeof parent.selectTabIndex === 'function') {
				try {
					(parent.selectTabIndex as (index: number) => void).call(parent, to);
				} catch {
					return false;
				}
			}
			return true;
		}
		children.splice(from, 1);
		children.splice(to, 0, leaf);
		let movedHeader: unknown = null;
		if (headersAligned && headers !== null) {
			const spliced = headers.splice(from, 1);
			movedHeader = spliced[0] ?? null;
			headers.splice(to, 0, movedHeader);
		}
		const rollback = (): void => {
			try {
				children.splice(to, 1);
				children.splice(from, 0, leaf);
			} catch {
				// Best effort: el llamante ya informa el bloqueador.
			}
			if (headersAligned && headers !== null) {
				try {
					headers.splice(to, 1);
					headers.splice(from, 0, movedHeader);
				} catch {
					// Best effort.
				}
			}
		};
		const headerEl = headerElOf(leaf);
		if (headerEl !== null && headerEl !== undefined) {
			let container: unknown = null;
			try {
				container = (headerEl as { parentNode?: unknown }).parentNode ?? null;
			} catch {
				container = null;
			}
			const containerLike = container as {
				children?: unknown;
				insertBefore?: unknown;
			} | null;
			const remove = (headerEl as { remove?: unknown }).remove;
			if (
				!containerLike ||
				!Array.isArray(containerLike.children) ||
				typeof containerLike.insertBefore !== 'function' ||
				typeof remove !== 'function'
			) {
				rollback();
				return false;
			}
			try {
				(remove as () => void).call(headerEl);
				const ref = (containerLike.children as unknown[])[to] ?? null;
				(
					containerLike.insertBefore as (
						node: unknown,
						ref: unknown,
					) => void
				).call(containerLike, headerEl, ref);
			} catch {
				rollback();
				return false;
			}
		}
		if (typeof parent.selectTabIndex === 'function') {
			try {
				(parent.selectTabIndex as (index: number) => void).call(parent, to);
			} catch {
				rollback();
				return false;
			}
		}
		return true;
	} catch {
		return false;
	}
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

	const reorderTo = (toIndex: number): ScopedMovePlan => ({
		ok: true,
		move: {
			kind: 'reorder',
			leafKey: snapshot.focusedKey as string,
			fromGroupId: group.id,
			toGroupId: group.id,
			fromIndex: index,
			toIndex,
		},
	});

	switch (variation) {
		case 'reorder-left': {
			if (index <= 0) return { ok: false, reason: 'at-edge' };
			return reorderTo(index - 1);
		}
		case 'reorder-right': {
			if (index >= group.leafKeys.length - 1) return { ok: false, reason: 'at-edge' };
			return reorderTo(index + 1);
		}
		case 'reorder-start': {
			if (index <= 0) return { ok: false, reason: 'at-edge' };
			return reorderTo(0);
		}
		case 'reorder-end': {
			if (index >= group.leafKeys.length - 1) return { ok: false, reason: 'at-edge' };
			return reorderTo(group.leafKeys.length - 1);
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
			// U200-L5: vecino GEOMETRICO en el eje pedido (regla VSCode), no
			// aritmetica sobre el orden de caminata. Sin vecino en el eje ->
			// split en esa direccion (VSCode `addGroup`), nunca salto mudo
			// a un grupo de otro eje ni no-op.
			const axis = axisOfDirectionVariation(variation);
			const delta =
				variation === 'direction-left' || variation === 'direction-above'
					? (-1 as const)
					: (1 as const);
			const activeOrdinal = snapshot.groups.findIndex(
				(candidate) => candidate.id === group.id,
			);
			const neighborOrdinal = findDirectionalNeighbor(
				snapshot.groups,
				activeOrdinal,
				axis,
				delta,
			);
			if (neighborOrdinal === null) {
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
			const neighbor = snapshot.groups[neighborOrdinal] as ScopedGroupSnapshot;
			return leafTo(neighbor, neighbor.leafKeys.length);
		}
		case 'surface-left':
		case 'surface-right':
		case 'surface-main': {
			// U200-L5 (tabs-2): el tab enfocado aterriza al final del ultimo
			// grupo de la superficie destino. Nunca cruza ventanas/popouts
			// (guardia global). Si ya esta en ese grupo, reordena sin
			// recrear (principio tabs-1) o informa borde.
			const dest: ScopedSurface =
				variation === 'surface-left'
					? 'left_sidebar'
					: variation === 'surface-right'
						? 'right_sidebar'
						: 'main_leaf';
			const destGroups = surfaceGroups(snapshot, dest);
			if (destGroups.length === 0) {
				return {
					ok: true,
					move: {
						kind: 'surface-new-group',
						leafKey: snapshot.focusedKey as string,
						fromGroupId: group.id,
						surface: dest,
					},
				};
			}
			const target = destGroups[destGroups.length - 1] as ScopedGroupSnapshot;
			if (target.id === group.id) {
				if (index >= group.leafKeys.length - 1) {
					return { ok: false, reason: 'at-edge' };
				}
				return reorderTo(group.leafKeys.length - 1);
			}
			return leafTo(target, target.leafKeys.length);
		}
		case 'move-group-left':
		case 'move-group-up':
		case 'move-group-right':
		case 'move-group-down': {
			// U200-L5: como VSCode `findTargetGroup`: direccion pedida y
			// reservas ortogonales, sin envoltura y sin crear grupos.
			if (peers.length < 2) return { ok: false, reason: 'single-group' };
			const activeOrdinal = snapshot.groups.findIndex(
				(candidate) => candidate.id === group.id,
			);
			const neighborOrdinal = findGroupMoveNeighbor(
				snapshot.groups,
				activeOrdinal,
				variation,
			);
			// Sin vecino geometrico en ningun eje: borde, no salto mudo.
			if (neighborOrdinal === null) return { ok: false, reason: 'at-edge' };
			const neighbor = snapshot.groups[neighborOrdinal] as ScopedGroupSnapshot;
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
 * Fuente unica de (id, nombre de paleta) para las 20 acciones. `main.ts` las
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
		move(TAB_TO_LEFT_SIDEBAR_ID, 'surface-left'),
		move(TAB_TO_RIGHT_SIDEBAR_ID, 'surface-right'),
		move(TAB_TO_MAIN_LEAF_ID, 'surface-main'),
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
