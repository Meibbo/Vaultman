import type { SasiRegistry } from './logicSasiRegistry';
import type { SasiCommandDescriptor } from './logicSasiCommands';

/**
 * U200-L2: workspace tab/group moves + Vaultman panel maximize as SASI
 * identities.
 *
 * Tres semanticas distintas comparten el prefijo `vaultman.move.*` por
 * convencion de la tarea, y se desambiguan de forma EXPLICITA (nunca
 * silenciosa, U130-02): `vaultman.move.*` = staging de valueMove en Props,
 * `vaultman.nodemove.*` = staging de movimientos de ficheros, y los ids de
 * ESTE modulo (`tabToPreviousGroup`, `tabToNextGroup`, `groupLeft`,
 * `groupRight`) = hojas del workspace entre grupos. La unicidad la impone el
 * registro (`id duplicado`); las labelKeys viven en el subarbol fresco
 * `sasi.move.tab_*` / `sasi.move.group_*`.
 *
 * Como en hover (`logicSasiHoverActions.ts`), aqui solo va la IDENTIDAD y
 * los guardas puros: la ejecucion vive en el publicador de comandos
 * (`main.ts`). Los snapshots son datos planos (sin handles de Obsidian)
 * para que los guardas sean unit-testeables.
 */

export const TAB_MOVE_PREVIOUS_ID = 'vaultman.move.tabToPreviousGroup';
export const TAB_MOVE_NEXT_ID = 'vaultman.move.tabToNextGroup';
export const GROUP_MOVE_LEFT_ID = 'vaultman.move.groupLeft';
export const GROUP_MOVE_RIGHT_ID = 'vaultman.move.groupRight';
export const TOGGLE_MAXIMIZE_ID = 'vaultman.toolbar.toggleMaximize';

/** Hook aditivo para el futuro overlay visual. Sin regla CSS en v1 (§5.2). */
export const MAXIMIZE_BODY_CLASS = 'vaultman-l2-maximized';

export type TabMoveDirection = 'previous' | 'next';
export type GroupMoveDirection = 'left' | 'right';

export function tabMoveActionId(direction: TabMoveDirection): string {
	return direction === 'previous' ? TAB_MOVE_PREVIOUS_ID : TAB_MOVE_NEXT_ID;
}

export function groupMoveActionId(direction: GroupMoveDirection): string {
	return direction === 'left' ? GROUP_MOVE_LEFT_ID : GROUP_MOVE_RIGHT_ID;
}

const TAB_MOVE_DEFS = [
	{
		id: TAB_MOVE_PREVIOUS_ID,
		labelKey: 'sasi.move.tab_to_previous_group',
		icon: 'lucide-arrow-left',
	},
	{
		id: TAB_MOVE_NEXT_ID,
		labelKey: 'sasi.move.tab_to_next_group',
		icon: 'lucide-arrow-right',
	},
	{
		id: GROUP_MOVE_LEFT_ID,
		labelKey: 'sasi.move.group_left',
		icon: 'lucide-chevrons-left',
	},
	{
		id: GROUP_MOVE_RIGHT_ID,
		labelKey: 'sasi.move.group_right',
		icon: 'lucide-chevrons-right',
	},
	{
		id: TOGGLE_MAXIMIZE_ID,
		labelKey: 'sasi.toolbar.toggle_maximize',
		icon: 'lucide-maximize',
	},
] as const;

export function registerTabMoveActions(registry: SasiRegistry): void {
	for (const def of TAB_MOVE_DEFS) {
		registry.register({
			id: def.id,
			axis: 'function',
			kind: 'action',
			labelKey: def.labelKey,
			icon: def.icon,
			// Comandos de paleta sobre chrome del workspace: sin superficie
			// de escena propia, igual que el catalogo estatico del toolbar.
			supports: [{ surface: 'panelWidget' }],
		});
	}
}

//...----------—————————————(   GUARDS   )————————————------------...\\

export interface TabMoveLayoutSnapshot {
	/** Ids de grupo en orden visual (solo ventana principal). */
	groupIds: readonly string[];
	activeGroupId: string | null;
	hasActiveLeaf: boolean;
	isPopout: boolean;
}

export interface GroupMoveLayoutSnapshot {
	groupIds: readonly string[];
	activeGroupId: string | null;
	isPopout: boolean;
}

export type TabMoveGuardReason =
	| 'no-active-leaf'
	| 'unknown-target'
	| 'ambiguous-target'
	| 'single-group'
	| 'popout';

export type GroupMoveGuardReason =
	| 'unknown-target'
	| 'ambiguous-target'
	| 'single-group'
	| 'popout';

export interface TabMoveTarget {
	fromGroupId: string;
	toGroupId: string;
}

export type TabMoveResolution =
	| { ok: true; target: TabMoveTarget }
	| { ok: false; reason: TabMoveGuardReason };

export type GroupMoveResolution =
	| { ok: true; target: TabMoveTarget }
	| { ok: false; reason: GroupMoveGuardReason };

function indexOfGroup(
	groupIds: readonly string[],
	activeGroupId: string | null,
): number {
	if (!activeGroupId) return -1;
	return groupIds.indexOf(activeGroupId);
}

/**
 * Guarda compartida tab/group: popout y grupo unico son no-ops v1
 * explicitos; duplicados o grupo desconocido degradan a Notice + false en
 * el llamante, nunca throw hacia el toolbar. Los bordes ENVUELVEN (wrap):
 * divergencia deliberada de VSCode (edge = no-op), asi el par nunca
 * presenta una tecla muerta y no hacen falta variantes first/last.
 */
function resolveGridMove(
	groupIds: readonly string[],
	activeGroupId: string | null,
	forward: boolean,
): { ok: true; target: TabMoveTarget } | { ok: false; reason: 'unknown-target' | 'ambiguous-target' | 'single-group' } {
	if (groupIds.length < 2) return { ok: false, reason: 'single-group' };
	if (new Set(groupIds).size !== groupIds.length) {
		return { ok: false, reason: 'ambiguous-target' };
	}
	const index = indexOfGroup(groupIds, activeGroupId);
	if (index < 0) return { ok: false, reason: 'unknown-target' };
	const next = forward
		? (index + 1) % groupIds.length
		: (index - 1 + groupIds.length) % groupIds.length;
	return {
		ok: true,
		target: { fromGroupId: groupIds[index], toGroupId: groupIds[next] },
	};
}

export function resolveTabMoveTarget(
	snapshot: TabMoveLayoutSnapshot,
	direction: TabMoveDirection,
): TabMoveResolution {
	if (!snapshot.hasActiveLeaf) return { ok: false, reason: 'no-active-leaf' };
	if (snapshot.isPopout) return { ok: false, reason: 'popout' };
	return resolveGridMove(
		snapshot.groupIds,
		snapshot.activeGroupId,
		direction === 'next',
	);
}

export function resolveGroupMoveTarget(
	snapshot: GroupMoveLayoutSnapshot,
	direction: GroupMoveDirection,
): GroupMoveResolution {
	if (snapshot.isPopout) return { ok: false, reason: 'popout' };
	return resolveGridMove(
		snapshot.groupIds,
		snapshot.activeGroupId,
		direction === 'right',
	);
}

export function guardMessageKey(
	reason: TabMoveGuardReason | GroupMoveGuardReason,
): string {
	switch (reason) {
		case 'no-active-leaf':
		case 'unknown-target':
			return 'sasi.move.tab.unknown_target';
		case 'ambiguous-target':
			return 'sasi.move.tab.ambiguous_target';
		case 'single-group':
			return 'sasi.move.tab.single_group';
		case 'popout':
			return 'sasi.move.tab.popout_unsupported';
	}
}

export interface MaximizeSnapshot {
	hasVaultmanLeaf: boolean;
}

export type MaximizeResolution =
	| { ok: true }
	| { ok: false; reason: 'unknown-target' };

export function resolveToggleMaximize(
	snapshot: MaximizeSnapshot,
): MaximizeResolution {
	if (!snapshot.hasVaultmanLeaf) return { ok: false, reason: 'unknown-target' };
	return { ok: true };
}

export function maximizeGuardMessageKey(): string {
	return 'sasi.toolbar.maximize_no_target';
}

/** Maquina de estado del toggle: reversible por construccion. */
export function nextMaximizedState(current: boolean): boolean {
	return !current;
}

//...----------—————————————(   COMMAND DESCRIPTORS   )————————————------------...\\

export interface TabMoveCommandRunner {
	runTabMove(direction: TabMoveDirection, checking: boolean): boolean;
	runGroupMove(direction: GroupMoveDirection, checking: boolean): boolean;
	runToggleMaximize(checking: boolean): boolean;
}

/**
 * U200-L2: la fuente unica de (id, nombre de paleta) para los 5 comandos.
 * `main.ts` los registra tal cual en el publisher; los tests afirman los
 * nombres exactos contra esta fabrica sin duplicar ids.
 */
export function createTabMoveCommandDescriptors(
	t: (key: string) => string,
	run: TabMoveCommandRunner,
): SasiCommandDescriptor[] {
	return [
		{
			id: TAB_MOVE_PREVIOUS_ID,
			name: t('sasi.move.tab_to_previous_group'),
			handler: (checking: boolean) => run.runTabMove('previous', checking),
		},
		{
			id: TAB_MOVE_NEXT_ID,
			name: t('sasi.move.tab_to_next_group'),
			handler: (checking: boolean) => run.runTabMove('next', checking),
		},
		{
			id: GROUP_MOVE_LEFT_ID,
			name: t('sasi.move.group_left'),
			handler: (checking: boolean) => run.runGroupMove('left', checking),
		},
		{
			id: GROUP_MOVE_RIGHT_ID,
			name: t('sasi.move.group_right'),
			handler: (checking: boolean) => run.runGroupMove('right', checking),
		},
		{
			id: TOGGLE_MAXIMIZE_ID,
			name: t('sasi.toolbar.toggle_maximize'),
			handler: (checking: boolean) => run.runToggleMaximize(checking),
		},
	];
}
