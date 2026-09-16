import type { SceneConfig } from '../types/typeInstance';
import { sameGroupPreset } from '../types/typeGroupPreset';

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
		sortState: { ...input.defaults.sortState },
		stickyRows: input.defaults.stickyRows,
		compactFolders: input.defaults.compactFolders,
		indent: input.defaults.indent,
		groupPreset: { ...input.defaults.groupPreset },
		hiddenGroupIds: cloneCells(input.defaults.hiddenGroupIds),
		sceneLabelMode: input.defaults.sceneLabelMode,
		autoRevealMode: input.defaults.autoRevealMode,
		hiddenToolbarNodes: cloneCells(input.defaults.hiddenToolbarNodes),
		toolbarNodeIcons: { ...input.defaults.toolbarNodeIcons },
	};
	for (const layer of layers) {
		if (!layer) continue;
		if (layer.viewMode !== undefined) out.viewMode = layer.viewMode;
		if (layer.interactionMode !== undefined) out.interactionMode = layer.interactionMode;
		// Un array NO se fusiona: la capa que lo declara decide la lista entera.
		if (layer.visibleCells !== undefined) out.visibleCells = cloneCells(layer.visibleCells);
		if (layer.sortState !== undefined) out.sortState = { ...layer.sortState };
		if (layer.stickyRows !== undefined) out.stickyRows = layer.stickyRows;
		if (layer.compactFolders !== undefined) out.compactFolders = layer.compactFolders;
		if (layer.indent !== undefined) out.indent = layer.indent;
		if (layer.groupPreset !== undefined) out.groupPreset = { ...layer.groupPreset };
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
	if (JSON.stringify(next.sortState) !== JSON.stringify(baseline.sortState)) {
		patch.sortState = { ...next.sortState };
	}
	if (next.stickyRows !== baseline.stickyRows) patch.stickyRows = next.stickyRows;
	if (next.compactFolders !== baseline.compactFolders) {
		patch.compactFolders = next.compactFolders;
	}
	if (next.indent !== baseline.indent) patch.indent = next.indent;
	if (!sameGroupPreset(next.groupPreset, baseline.groupPreset)) {
		patch.groupPreset = { ...next.groupPreset };
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
	return patch;
}