import { setSceneConfig } from './logicInstanceRegistry';
import { diffSceneConfig, resolveSceneConfig } from './logicSettingsCascade';
import type {
	InstanceRegistryData,
	SceneConfig,
	SceneDefinitionId,
	WorkspaceInstanceId,
} from '../types/typeInstance';

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