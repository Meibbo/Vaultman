import type { SceneConfig } from '../types/typeInstance';
import { cloneGroupPreset, sameGroupPreset } from '../types/typeGroupPreset';
import { cloneGroupMemberships } from './logicMembershipUrn';
import { cloneExplorerSortState } from './logicScopedSort';

/**
 * Las capas de la cascada, en el orden EXACTO del diseño aprobado:
 * `defaults -> global -> WorkspaceInstance self -> Scene -> panelWidget outlet`.
 * Cada capa es escasa: lo que no declara, lo hereda.
 */
export interface CascadeInput {
	defaults: Required<SceneConfig>;
	global?: SceneConfig;
	instanceSelf?: SceneConfig;
	scene?: SceneConfig;
	outlet?: SceneConfig;
}

/** Copia defensiva: los arrays de una capa almacenada nunca salen por referencia. */
function cloneCells(cells: readonly string[]): string[] {
	return [...cells];
}

export function resolveSceneConfig(input: CascadeInput): Required<SceneConfig> {
	const layers: readonly (SceneConfig | undefined)[] = [
		input.global,
		input.instanceSelf,
		input.scene,
		input.outlet,
	];
	const out: Required<SceneConfig> = {
		viewMode: input.defaults.viewMode,
		interactionMode: input.defaults.interactionMode,
		visibleCells: cloneCells(input.defaults.visibleCells),
		taskCellDisplayMode: input.defaults.taskCellDisplayMode,
		sortState: cloneExplorerSortState(input.defaults.sortState),
		stickyRows: input.defaults.stickyRows,
		compactFolders: input.defaults.compactFolders,
		indent: input.defaults.indent,
		tooltips: input.defaults.tooltips,
		groupPreset: cloneGroupPreset(input.defaults.groupPreset),
		hiddenGroupIds: cloneCells(input.defaults.hiddenGroupIds),
		sceneLabelMode: input.defaults.sceneLabelMode,
		autoRevealMode: input.defaults.autoRevealMode,
		hiddenToolbarNodes: cloneCells(input.defaults.hiddenToolbarNodes),
		toolbarNodeIcons: { ...input.defaults.toolbarNodeIcons },
		toolbarCommandActions: cloneCells(input.defaults.toolbarCommandActions),
		createActionsPlacement: input.defaults.createActionsPlacement,
		toolbarNodeOrder: cloneCells(input.defaults.toolbarNodeOrder),
		groupMemberships: cloneGroupMemberships(input.defaults.groupMemberships),
		showOptionsOverride: input.defaults.showOptionsOverride,
	};
	for (const layer of layers) {
		if (!layer) continue;
		if (layer.viewMode !== undefined) out.viewMode = layer.viewMode;
		if (layer.interactionMode !== undefined) out.interactionMode = layer.interactionMode;
		// Un array NO se fusiona: la capa que lo declara decide la lista entera.
		if (layer.visibleCells !== undefined) out.visibleCells = cloneCells(layer.visibleCells);
		if (layer.taskCellDisplayMode !== undefined) out.taskCellDisplayMode = layer.taskCellDisplayMode;
		if (layer.sortState !== undefined) {
			out.sortState = cloneExplorerSortState(layer.sortState);
		}
		if (layer.stickyRows !== undefined) out.stickyRows = layer.stickyRows;
		if (layer.compactFolders !== undefined) out.compactFolders = layer.compactFolders;
		if (layer.indent !== undefined) out.indent = layer.indent;
		if (layer.tooltips !== undefined) out.tooltips = layer.tooltips;
		if (layer.groupPreset !== undefined) out.groupPreset = cloneGroupPreset(layer.groupPreset);
		if (layer.hiddenGroupIds !== undefined) {
			out.hiddenGroupIds = cloneCells(layer.hiddenGroupIds);
		}
		if (layer.sceneLabelMode !== undefined)
			out.sceneLabelMode = layer.sceneLabelMode;
		if (layer.autoRevealMode !== undefined)
			out.autoRevealMode = layer.autoRevealMode;
		if (layer.hiddenToolbarNodes !== undefined) {
			out.hiddenToolbarNodes = cloneCells(layer.hiddenToolbarNodes);
		}
		if (layer.toolbarNodeIcons !== undefined) {
			out.toolbarNodeIcons = { ...layer.toolbarNodeIcons };
		}
		if (layer.toolbarCommandActions !== undefined) {
			out.toolbarCommandActions = cloneCells(layer.toolbarCommandActions);
		}
		if (layer.createActionsPlacement !== undefined) {
			out.createActionsPlacement = layer.createActionsPlacement;
		}
		if (layer.toolbarNodeOrder !== undefined) {
			out.toolbarNodeOrder = cloneCells(layer.toolbarNodeOrder);
		}
		// U130-09: como los arrays, el mapa NO se fusiona: la capa que lo
		// declara decide los grupos enteros de esa scene.
		if (layer.groupMemberships !== undefined) {
			out.groupMemberships = cloneGroupMemberships(layer.groupMemberships);
		}
		// U130 spec-02: tri-estado concreto (`inherit` es la ausencia); la
		// capa que lo declara decide, como `sceneLabelMode`.
		if (layer.showOptionsOverride !== undefined) {
			out.showOptionsOverride = layer.showOptionsOverride;
		}
	}
	return out;
}

/**
 * Lo contrario del resolutor: dado lo que el usuario acaba de dejar en pantalla, devuelve el
 * parche MÍNIMO que hay que guardar. Es lo que mantiene escasa la configuración y lo que evita
 * que un cambio de defaults en una versión futura quede enterrado bajo copias literales.
 */
export function diffSceneConfig(
	baseline: Required<SceneConfig>,
	next: Required<SceneConfig>,
): SceneConfig {
	const patch: SceneConfig = {};
	if (next.viewMode !== baseline.viewMode) patch.viewMode = next.viewMode;
	if (next.interactionMode !== baseline.interactionMode) {
		patch.interactionMode = next.interactionMode;
	}
	if (
		next.visibleCells.length !== baseline.visibleCells.length ||
		next.visibleCells.some((cell, i) => cell !== baseline.visibleCells[i])
	) {
		patch.visibleCells = cloneCells(next.visibleCells);
	}
	if (next.taskCellDisplayMode !== baseline.taskCellDisplayMode) {
		patch.taskCellDisplayMode = next.taskCellDisplayMode;
	}
	if (JSON.stringify(next.sortState) !== JSON.stringify(baseline.sortState)) {
		patch.sortState = cloneExplorerSortState(next.sortState);
	}
	if (next.stickyRows !== baseline.stickyRows) patch.stickyRows = next.stickyRows;
	if (next.compactFolders !== baseline.compactFolders) {
		patch.compactFolders = next.compactFolders;
	}
	if (next.indent !== baseline.indent) patch.indent = next.indent;
	if (next.tooltips !== baseline.tooltips) patch.tooltips = next.tooltips;
	if (!sameGroupPreset(next.groupPreset, baseline.groupPreset)) {
		patch.groupPreset = cloneGroupPreset(next.groupPreset);
	}
	if (
		next.hiddenGroupIds.length !== baseline.hiddenGroupIds.length ||
		next.hiddenGroupIds.some((id, i) => id !== baseline.hiddenGroupIds[i])
	) {
		patch.hiddenGroupIds = cloneCells(next.hiddenGroupIds);
	}
	if (next.sceneLabelMode !== baseline.sceneLabelMode) {
		patch.sceneLabelMode = next.sceneLabelMode;
	}
	if (next.autoRevealMode !== baseline.autoRevealMode) {
		patch.autoRevealMode = next.autoRevealMode;
	}
	if (
		next.hiddenToolbarNodes.length !== baseline.hiddenToolbarNodes.length ||
		next.hiddenToolbarNodes.some(
			(id, i) => id !== baseline.hiddenToolbarNodes[i],
		)
	) {
		patch.hiddenToolbarNodes = cloneCells(next.hiddenToolbarNodes);
	}
	if (
		JSON.stringify(next.toolbarNodeIcons) !==
		JSON.stringify(baseline.toolbarNodeIcons)
	) {
		patch.toolbarNodeIcons = { ...next.toolbarNodeIcons };
	}
	if (
		next.toolbarCommandActions.length !== baseline.toolbarCommandActions.length ||
		next.toolbarCommandActions.some(
			(id, i) => id !== baseline.toolbarCommandActions[i],
		)
	) {
		patch.toolbarCommandActions = cloneCells(next.toolbarCommandActions);
	}
	if (next.createActionsPlacement !== baseline.createActionsPlacement) {
		patch.createActionsPlacement = next.createActionsPlacement;
	}
	if (
		next.toolbarNodeOrder.length !== baseline.toolbarNodeOrder.length ||
		next.toolbarNodeOrder.some((id, i) => id !== baseline.toolbarNodeOrder[i])
	) {
		patch.toolbarNodeOrder = cloneCells(next.toolbarNodeOrder);
	}
	// U130-09: el orden de las claves es el orden de las cabeceras, asi que
	// una reordenacion cuenta como cambio, igual que en `visibleCells`.
	if (
		JSON.stringify(next.groupMemberships) !==
		JSON.stringify(baseline.groupMemberships)
	) {
		patch.groupMemberships = cloneGroupMemberships(next.groupMemberships);
	}
	if (next.showOptionsOverride !== baseline.showOptionsOverride) {
		patch.showOptionsOverride = next.showOptionsOverride;
	}
	return patch;
}
