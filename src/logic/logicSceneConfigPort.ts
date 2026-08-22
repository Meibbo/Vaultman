import { replaceSceneConfig, setActiveScene } from './logicInstanceRegistry';
import { diffSceneConfig, resolveSceneConfig } from './logicSettingsCascade';
import type {
	InstanceRegistryData,
	SceneConfig,
	SceneDefinitionId,
	WorkspaceInstanceId,
} from '../types/typeInstance';
import type {
	ExplorerSortState,
	ExplorerTabId,
	ExplorerViewMode,
} from '../types/typeUI';
import type { InteractionMode } from './logicInteractionMode';

export interface SceneConfigPortDeps {
	instanceId: WorkspaceInstanceId;
	readRegistry: () => InstanceRegistryData;
	writeRegistry: (next: InstanceRegistryData) => void;
	persist: () => Promise<void>;
	/** defaults calculados por scene: `defaultVisibleCells`, `DEFAULT_SORT_STATE`, etc. */
	defaultsFor: (scene: SceneDefinitionId) => Required<SceneConfig>;
	/** capa global opcional; hoy no existe ninguna, y por eso es opcional y no un hueco. */
	globalFor?: (scene: SceneDefinitionId) => SceneConfig | undefined;
}

export interface SceneConfigPort {
	read: (scene: SceneDefinitionId) => Required<SceneConfig>;
	propose: (scene: SceneDefinitionId, next: Required<SceneConfig>) => Promise<void>;
	/** La scene en la que estaba la instancia, o `null` si nunca se guardo. */
	readActiveScene: () => string | null;
	proposeActiveScene: (scene: string) => Promise<void>;
	/**
	 * U121-109: Obsidian llama `onOpen()` ANTES que `setState()`, asi que cuando
	 * se construye este puerto el ancla de la hoja **todavia no existe** y la
	 * vista acaba de acunar una identidad nueva. El ancla buena llega despues.
	 * Sin poder re-anclar, la configuracion de esa instancia queda huerfana y
	 * cada recarga acuna una instancia mas.
	 *
	 * Esto NO adivina identidades -- que es lo que se retiro el 2026-08-20-:
	 * adopta la que el propio workspace persistio para ESTA hoja.
	 */
	setInstanceId: (id: WorkspaceInstanceId) => void;
	/** Avisa a quien haya cacheado config de que hay que releerla. Devuelve la baja. */
	onInstanceChange: (listener: () => void) => () => void;
}

export interface SavedLayoutConfig {
	viewModeByTab: Partial<Record<ExplorerTabId, ExplorerViewMode>>;
	interactionModeByTab: Partial<Record<ExplorerTabId, InteractionMode>>;
	visibleCellsByTab: Partial<Record<ExplorerTabId, string[]>>;
	sortStateByTab: Partial<Record<ExplorerTabId, ExplorerSortState>>;
}

export async function applyLayoutToPort(
	port: SceneConfigPort,
	layout: SavedLayoutConfig,
): Promise<void> {
	const tabs = new Set<ExplorerTabId>([
		...(Object.keys(layout.viewModeByTab) as ExplorerTabId[]),
		...(Object.keys(layout.interactionModeByTab) as ExplorerTabId[]),
		...(Object.keys(layout.visibleCellsByTab) as ExplorerTabId[]),
		...(Object.keys(layout.sortStateByTab) as ExplorerTabId[]),
	]);
	for (const tab of tabs) {
		const current = port.read(tab);
		await port.propose(tab, {
			viewMode: layout.viewModeByTab[tab] ?? current.viewMode,
			interactionMode: layout.interactionModeByTab[tab] ?? current.interactionMode,
			visibleCells: layout.visibleCellsByTab[tab] ?? current.visibleCells,
			sortState: layout.sortStateByTab[tab] ?? current.sortState,
		});
	}
}

export function createSceneConfigPort(deps: SceneConfigPortDeps): SceneConfigPort {
	// U121-109: la identidad es tardia, asi que vive en una variable y no en `deps`.
	let currentId: WorkspaceInstanceId = deps.instanceId;
	const listeners = new Set<() => void>();
	const setInstanceId = (id: WorkspaceInstanceId): void => {
		if (!id || id === currentId) return;
		currentId = id;
		for (const listener of [...listeners]) listener();
	};
	const onInstanceChange = (listener: () => void): (() => void) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	};

	const read = (scene: SceneDefinitionId): Required<SceneConfig> => {
		const record = deps.readRegistry().instances[currentId];
		return resolveSceneConfig({
			defaults: deps.defaultsFor(scene),
			global: deps.globalFor?.(scene),
			instanceSelf: record?.self,
			scene: record?.scenes[scene],
		});
	};

	const propose = async (scene: SceneDefinitionId, next: Required<SceneConfig>): Promise<void> => {
		const registry = deps.readRegistry();
		const record = registry.instances[currentId];
		if (!record) return; // instancia desconocida: no acuñamos aquí, eso es del shard 01
		// El baseline es todo MENOS la capa de scene: así el parche es el mínimo real.
		const baseline = resolveSceneConfig({
			defaults: deps.defaultsFor(scene),
			global: deps.globalFor?.(scene),
			instanceSelf: record.self,
		});
		const patch = diffSceneConfig(baseline, next);
		const stored = record.scenes[scene] ?? {};
		if (JSON.stringify(patch) === JSON.stringify(stored)) return;
		// U121-101: `patch` ES la capa entera, no un retoque: sustituye, no fusiona.
		deps.writeRegistry(
			replaceSceneConfig(registry, currentId, scene, patch),
		);
		await deps.persist();
	};

	const readActiveScene = (): string | null =>
		deps.readRegistry().instances[currentId]?.activeScene ?? null;

	const proposeActiveScene = async (scene: string): Promise<void> => {
		const registry = deps.readRegistry();
		const next = setActiveScene(registry, currentId, scene);
		if (next === registry) return; // sin cambio: no se escribe ni se persiste
		deps.writeRegistry(next);
		await deps.persist();
	};

	return {
		read,
		propose,
		readActiveScene,
		proposeActiveScene,
		setInstanceId,
		onInstanceChange,
	};
}
