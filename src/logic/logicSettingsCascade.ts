import type { SceneConfig } from '../types/typeInstance';

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
	};
	for (const layer of layers) {
		if (!layer) continue;
		if (layer.viewMode !== undefined) out.viewMode = layer.viewMode;
		if (layer.interactionMode !== undefined) out.interactionMode = layer.interactionMode;
		// Un array NO se fusiona: la capa que lo declara decide la lista entera.
		if (layer.visibleCells !== undefined) out.visibleCells = cloneCells(layer.visibleCells);
		if (layer.sortState !== undefined) out.sortState = { ...layer.sortState };
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
	return patch;
}