import { createInstanceRecord } from './logicInstanceRegistry';
import { createSceneConfigPort, type SceneConfigPort } from './logicSceneConfigPort';
import { normalizeExplorerSortState } from './logicScopedSort';
import type { SceneConfig, InstanceRegistryData } from '../types/typeInstance';
import type { VaultmanPlugin } from '../main';

/** Modal-local configuration owner, never inserted into the workspace instance registry. */
export function createApiSceneConfigPort(plugin: VaultmanPlugin): SceneConfigPort {
	const id = 'sasi.apiscene.config';
	const record = createInstanceRecord(id);
	const stored = { ...(plugin.settings.apiSceneConfig ?? {}) };
	if (stored.visibleCells) {
		const set = new Set(stored.visibleCells);
		if (set.has('ctime')) { set.delete('ctime'); set.add('installed'); }
		if (set.has('mtime')) { set.delete('mtime'); set.add('updated'); }
		stored.visibleCells = Array.from(set);
	}
	record.scenes.plugins = stored;
	let registry: InstanceRegistryData = { schema: 1, instances: { [id]: record } };
	const defaults: Required<SceneConfig> = {
		viewMode: 'tree', interactionMode: 'open',
		visibleCells: ['caret', 'icon', 'format', 'text', 'state', 'installed', 'updated'],
		taskCellDisplayMode: 'auto', sortState: normalizeExplorerSortState('plugins', null),
		stickyRows: true, compactFolders: false, indent: true, tooltips: true,
		groupPreset: { kind: 'sections', direction: 'asc' }, hiddenGroupIds: [],
		sceneLabelMode: 'on', autoRevealMode: 'auto', hiddenToolbarNodes: [],
		toolbarNodeIcons: {}, toolbarNodeLabels: {}, toolbarCommandActions: [], createActionsPlacement: 'auto',
		toolbarNodeOrder: [], groupMemberships: {}, showOptionsOverride: 'inherit',
		textCase: {}, nativeCompat: {},
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
