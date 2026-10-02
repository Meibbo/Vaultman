import { createInstanceRecord } from './logicInstanceRegistry';
import { createSceneConfigPort, type SceneConfigPort } from './logicSceneConfigPort';
import { normalizeExplorerSortState } from './logicScopedSort';
import type { SceneConfig, InstanceRegistryData } from '../types/typeInstance';
import type { VaultmanPlugin } from '../main';

/** Modal-local configuration owner, never inserted into the workspace instance registry. */
export function createApiSceneConfigPort(plugin: VaultmanPlugin): SceneConfigPort {
	const id = 'sasi.apiscene.config';
	const record = createInstanceRecord(id);
	record.scenes.plugins = plugin.settings.apiSceneConfig ?? {};
	let registry: InstanceRegistryData = { schema: 1, instances: { [id]: record } };
	const defaults: Required<SceneConfig> = {
		viewMode: 'tree', interactionMode: 'open',
		visibleCells: ['caret', 'icon', 'format', 'text', 'state', 'ctime', 'mtime', 'installed', 'updated'],
		taskCellDisplayMode: 'auto', sortState: normalizeExplorerSortState('plugins', null),
		stickyRows: true, compactFolders: false, indent: true, tooltips: true,
		groupPreset: { kind: 'sections', direction: 'asc' }, hiddenGroupIds: [],
		sceneLabelMode: 'on', autoRevealMode: 'auto', hiddenToolbarNodes: [],
		toolbarNodeIcons: {}, toolbarCommandActions: [], createActionsPlacement: 'auto',
		toolbarNodeOrder: [], groupMemberships: {}, showOptionsOverride: 'inherit',
	};
	const port = createSceneConfigPort({
		instanceId: id, readRegistry: () => registry,
		writeRegistry: (next) => { registry = next; },
		persist: async () => {
			plugin.settings.apiSceneConfig = registry.instances[id]?.scenes.plugins ?? {};
			await plugin.saveSettings();
		},
		defaultsFor: () => defaults,
	});
	return { ...port, readInstanceRecord: () => null };
}
