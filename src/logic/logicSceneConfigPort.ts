import { setSceneConfig } from './logicInstanceRegistry';
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
	const read = (scene: SceneDefinitionId): Required<SceneConfig> => {
		const record = deps.readRegistry().instances[deps.instanceId];
		return resolveSceneConfig({
			defaults: deps.defaultsFor(scene),
			global: deps.globalFor?.(scene),
			instanceSelf: record?.self,
			scene: record?.scenes[scene],
		});
	};

	const propose = async (scene: SceneDefinitionId, next: Required<SceneConfig>): Promise<void> => {
		const registry = deps.readRegistry();
		const record = registry.instances[deps.instanceId];
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
		deps.writeRegistry(setSceneConfig(registry, deps.instanceId, scene, patch));
		await deps.persist();
	};

	return { read, propose };
}
