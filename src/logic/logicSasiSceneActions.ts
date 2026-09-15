import type { ExplorerViewMode } from '../types/typeUI';
import type { StatisticsDataTab } from './logicStatisticsNavigation';
import {
	selectableViewModesForDataSurface,
	viewModesForDataSurface,
} from './logicExplorerViewModes';
import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130: las opciones de instancia de escena como acciones SASI.
 *
 * Dos familias. Los engines por superficie (`vaultman.scene.engine.<surface>.<mode>`)
 * espejan las opciones del submenu `engines` del view_menu; los saltos de escena
 * (`vaultman.scene.goto.<tab>`) espejan el menu de escenas. Solo entran superficies
 * con mas de un modo seleccionable: snippets/plugins solo ofrecen `tree` y un
 * comando que no puede cambiar nada seria ruido en el palette. `dnd` esta
 * `locked` y `selectableViewModesForDataSurface` ya lo excluye.
 *
 * Como en hover/move, aqui solo va la IDENTIDAD (id + labelKey + icono): la
 * ejecucion es del publicador de comandos (main.ts), que llega a la instancia
 * por `vaultmanFrameForCommand()` y no toca este modulo.
 */

export const SCENE_ENGINE_SURFACES = ['files', 'props', 'tags'] as const;

export type SceneEngineSurface = (typeof SCENE_ENGINE_SURFACES)[number];

export const SCENE_GOTO_TABS: readonly StatisticsDataTab[] = [
	'files',
	'props',
	'tags',
	'content',
	'snippets',
	'plugins',
];

export function sceneEngineActionId(
	surface: SceneEngineSurface,
	mode: ExplorerViewMode,
): string {
	return `vaultman.scene.engine.${surface}.${mode}`;
}

export function sceneEngineLabelKey(
	surface: SceneEngineSurface,
	mode: ExplorerViewMode,
): string {
	return `sasi.scene.engine.${surface}.${mode}`;
}

export function sceneGotoActionId(tab: StatisticsDataTab): string {
	return `vaultman.scene.goto.${tab}`;
}

export function sceneGotoLabelKey(tab: StatisticsDataTab): string {
	return `sasi.scene.goto.${tab}`;
}

const GOTO_ICONS: Record<StatisticsDataTab, string> = {
	files: 'lucide-folder',
	props: 'lucide-archive',
	tags: 'lucide-tag',
	content: 'lucide-file-search',
	snippets: 'lucide-file-code',
	plugins: 'lucide-plug',
};

export function registerSceneInstanceActions(registry: SasiRegistry): void {
	for (const surface of SCENE_ENGINE_SURFACES) {
		const options = viewModesForDataSurface(surface).filter(
			(option) => !option.locked,
		);
		for (const option of options) {
			registry.register({
				id: sceneEngineActionId(surface, option.id),
				axis: 'function',
				kind: 'action',
				labelKey: sceneEngineLabelKey(surface, option.id),
				icon: option.icon,
				supports: [{ surface: 'panelWidget' }],
			});
		}
	}
	for (const tab of SCENE_GOTO_TABS) {
		registry.register({
			id: sceneGotoActionId(tab),
			axis: 'function',
			kind: 'action',
			labelKey: sceneGotoLabelKey(tab),
			icon: GOTO_ICONS[tab],
			supports: [{ surface: 'panelWidget' }],
		});
	}
}

/** Los modos publicables por superficie, sin los `locked`. Para tests. */
export function sceneEngineModes(
	surface: SceneEngineSurface,
): readonly ExplorerViewMode[] {
	return selectableViewModesForDataSurface(surface);
}
