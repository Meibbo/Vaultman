import type { SceneConfig } from '../types/typeInstance';
import {
	cloneGroupPreset,
	normalizeGroupPreset,
	sameGroupPreset,
} from '../types/typeGroupPreset';
import { cloneGroupMemberships } from './logicMembershipUrn';
import { cloneExplorerSortState } from './logicScopedSort';
import {
	normalizeNativeCompatPolicy,
	sameNativeCompatPolicy,
} from './logicNativeTreeCompat';
import {
	normalizeTextCaseMap,
	sameTextCaseMap,
} from './logicTextCaseProjection';
import type { ExplorerTabId } from '../types/typeUI';

/**
 * Las capas de la cascada, en el orden EXACTO del diseño aprobado:
 * `defaults -> global -> WorkspaceInstance self -> Scene -> panelWidget outlet`.
 * Cada capa es escasa: lo que no declara, lo hereda.
 */
export interface CascadeInput {
	defaults: Required<SceneConfig>;
	window?: SceneConfig;
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
		toolbarNodeLabels: { ...input.defaults.toolbarNodeLabels },
		toolbarCommandActions: cloneCells(input.defaults.toolbarCommandActions),
		createActionsPlacement: input.defaults.createActionsPlacement,
		toolbarNodeOrder: cloneCells(input.defaults.toolbarNodeOrder),
		groupMemberships: cloneGroupMemberships(input.defaults.groupMemberships),
		showOptionsOverride: input.defaults.showOptionsOverride,
		textCase: { ...(input.defaults.textCase ?? {}) },
		nativeCompat: { ...(input.defaults.nativeCompat ?? {}) },
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
		if (layer.toolbarNodeLabels !== undefined) {
			out.toolbarNodeLabels = { ...layer.toolbarNodeLabels };
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
		// Sparse maps inherit independently per cell and compatibility boundary.
		if (layer.textCase !== undefined) {
			out.textCase = { ...out.textCase, ...normalizeTextCaseMap(layer.textCase) };
		}
		if (layer.nativeCompat !== undefined) {
			out.nativeCompat = { ...out.nativeCompat, ...normalizeNativeCompatPolicy(layer.nativeCompat) };
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
		JSON.stringify(next.toolbarNodeLabels) !==
		JSON.stringify(baseline.toolbarNodeLabels)
	) {
		patch.toolbarNodeLabels = { ...next.toolbarNodeLabels };
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
	if (!sameTextCaseMap(next.textCase, baseline.textCase)) {
		patch.textCase = { ...(next.textCase ?? {}) };
	}
	if (!sameNativeCompatPolicy(next.nativeCompat, baseline.nativeCompat)) {
		patch.nativeCompat = { ...(next.nativeCompat ?? {}) };
	}
	return patch;
}

/**
 * U130 native polish: sanitize one raw persisted scene layer into a sparse
 * `SceneConfig`. Unknown values are dropped field by field (never throw, never
 * invent); what survives is exactly what the cascade layers accept. Used on
 * registry load/migration so a hand-edited or legacy `data.json` cannot
 * poison resolution.
 */
export function normalizeSceneConfig(
	value: unknown,
	tab?: ExplorerTabId,
): SceneConfig {
	if (typeof value !== 'object' || value === null) return {};
	const raw = value as Record<string, unknown>;
	const out: SceneConfig = {};
	const asStrings = (input: unknown): string[] | undefined =>
		Array.isArray(input) && input.every((item) => typeof item === 'string')
			? [...input]
			: undefined;
	if (
		raw.viewMode === 'tree' ||
		raw.viewMode === 'grid' ||
		raw.viewMode === 'table' ||
		raw.viewMode === 'dnd' ||
		raw.viewMode === 'cards'
	) {
		out.viewMode = raw.viewMode;
	}
	if (
		raw.interactionMode === 'open' ||
		raw.interactionMode === 'filter' ||
		raw.interactionMode === 'add' ||
		raw.interactionMode === 'select' ||
		raw.interactionMode === 'input'
	) {
		out.interactionMode = raw.interactionMode;
	}
	const visibleCells = asStrings(raw.visibleCells);
	if (visibleCells) out.visibleCells = visibleCells;
	if (typeof raw.stickyRows === 'boolean') out.stickyRows = raw.stickyRows;
	if (typeof raw.compactFolders === 'boolean') out.compactFolders = raw.compactFolders;
	if (typeof raw.indent === 'boolean') out.indent = raw.indent;
	if (typeof raw.tooltips === 'boolean') out.tooltips = raw.tooltips;
	if (typeof raw.groupPreset === 'object' && raw.groupPreset !== null) {
		out.groupPreset = normalizeGroupPreset(tab ?? 'files', raw.groupPreset);
	}
	const hiddenGroupIds = asStrings(raw.hiddenGroupIds);
	if (hiddenGroupIds) out.hiddenGroupIds = hiddenGroupIds;
	if (
		raw.sceneLabelMode === 'auto' ||
		raw.sceneLabelMode === 'on' ||
		raw.sceneLabelMode === 'off'
	) {
		out.sceneLabelMode = raw.sceneLabelMode;
	}
	if (
		raw.autoRevealMode === 'auto' ||
		raw.autoRevealMode === 'on' ||
		raw.autoRevealMode === 'off'
	) {
		out.autoRevealMode = raw.autoRevealMode;
	}
	const hiddenToolbarNodes = asStrings(raw.hiddenToolbarNodes);
	if (hiddenToolbarNodes) out.hiddenToolbarNodes = hiddenToolbarNodes;
	if (typeof raw.toolbarNodeIcons === 'object' && raw.toolbarNodeIcons !== null) {
		const icons: Record<string, string> = {};
		for (const [key, icon] of Object.entries(
			raw.toolbarNodeIcons as Record<string, unknown>,
		)) {
			if (key && typeof icon === 'string') icons[key] = icon;
		}
		out.toolbarNodeIcons = icons;
	}
	const toolbarCommandActions = asStrings(raw.toolbarCommandActions);
	if (toolbarCommandActions) out.toolbarCommandActions = toolbarCommandActions;
	if (
		raw.createActionsPlacement === 'auto' ||
		raw.createActionsPlacement === 'searchbox' ||
		raw.createActionsPlacement === 'toolbar'
	) {
		out.createActionsPlacement = raw.createActionsPlacement;
	}
	const toolbarNodeOrder = asStrings(raw.toolbarNodeOrder);
	if (toolbarNodeOrder) out.toolbarNodeOrder = toolbarNodeOrder;
	if (typeof raw.taskCellDisplayMode === 'string') {
		out.taskCellDisplayMode =
			raw.taskCellDisplayMode as SceneConfig['taskCellDisplayMode'];
	}
	if (
		raw.showOptionsOverride === 'inherit' ||
		raw.showOptionsOverride === 'show' ||
		raw.showOptionsOverride === 'plugins-only'
	) {
		out.showOptionsOverride = raw.showOptionsOverride;
	}
	if (typeof raw.textCase === 'object' && raw.textCase !== null) {
		out.textCase = normalizeTextCaseMap(raw.textCase);
	}
	if (typeof raw.nativeCompat === 'object' && raw.nativeCompat !== null) {
		out.nativeCompat = normalizeNativeCompatPolicy(raw.nativeCompat);
	}
	return out;
}
