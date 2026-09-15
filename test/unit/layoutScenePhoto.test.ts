import { describe, expect, it, vi } from 'vitest';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import {
	applyLayoutToPort,
	captureSceneFacets,
	createSceneConfigPort,
	sceneFacetsOf,
	type SavedLayoutConfig,
} from '../../src/logic/logicSceneConfigPort';
import { EMPTY_REGISTRY, ensureInstance } from '../../src/logic/logicInstanceRegistry';
import type { InstanceRegistryData, SceneConfig } from '../../src/types/typeInstance';
import type { SavedViewConfig } from '../../src/types/typeSettings';

/**
 * U130-09 (dev 2026-09-15): «el layout-config deberia servir para
 * inmortalizar un layout-state del cual forman parte los grupos». The layout
 * is a PHOTO of the scene: `captureSceneFacets` takes it (copies), the photo
 * rides `SavedViewConfig`, and `applyLayoutToPort` copies it into another
 * instance's scene. Nothing here references the live state.
 */
const defaults: Required<SceneConfig> = {
	viewMode: 'tree',
	interactionMode: 'open',
	visibleCells: ['name'],
	sortState: normalizeExplorerSortState('files', null),
	stickyRows: true,
	compactFolders: false,
	indent: true,
	groupPreset: { kind: 'none', direction: 'asc' },
	hiddenGroupIds: [],
	sceneLabelMode: 'auto',
	autoRevealMode: 'auto',
	hiddenToolbarNodes: [],
	toolbarNodeIcons: {},
	groupMemberships: {},
};

function instance(id: string) {
	let registry: InstanceRegistryData = ensureInstance(EMPTY_REGISTRY, id).registry;
	const port = createSceneConfigPort({
		instanceId: id,
		readRegistry: () => registry,
		writeRegistry: (next) => {
			registry = next;
		},
		persist: vi.fn(async () => {}),
		defaultsFor: () => defaults,
	});
	return {
		port,
		get registry() {
			return registry;
		},
	};
}

const TAGS_GROUPS = {
	Work: ['tags:tag:work|work', 'tags:tag:work/urgent|urgent'],
	Home: ['tags:tag:home|home'],
};

/** What navbar `saveLayout` stores per tab: the four historical facets plus the photo. */
function photoOf(config: Required<SceneConfig>): SavedViewConfig {
	return {
		viewMode: config.viewMode,
		visibleCells: [...config.visibleCells],
		interactionMode: config.interactionMode,
		sortState: config.sortState,
		...captureSceneFacets(config),
	};
}

/** What navbar `loadLayout` hands to the port for one tab. */
function layoutFor(tab: 'tags' | 'files', saved: SavedViewConfig): SavedLayoutConfig {
	return {
		viewModeByTab: {},
		interactionModeByTab: {},
		visibleCellsByTab: {},
		sortStateByTab: {},
		sceneFacetsByTab: { [tab]: sceneFacetsOf(saved) },
	};
}

describe('U130-09 — the layout photographs the scene; it does not own it', () => {
	it('captureSceneFacets returns copies: mutating the photo leaves the scene alone', () => {
		const scene: Required<SceneConfig> = {
			...defaults,
			groupMemberships: { Work: ['tags:tag:work|work'] },
			hiddenGroupIds: ['Old'],
			groupPreset: { kind: 'custom', direction: 'asc' },
		};
		const photo = captureSceneFacets(scene);
		(photo.groupMemberships.Work as string[]).push('tags:tag:x|x');
		photo.groupMemberships.Extra = [];
		photo.hiddenGroupIds.push('Other');
		photo.groupPreset.direction = 'desc';
		expect(scene.groupMemberships).toEqual({ Work: ['tags:tag:work|work'] });
		expect(scene.hiddenGroupIds).toEqual(['Old']);
		expect(scene.groupPreset).toEqual({ kind: 'custom', direction: 'asc' });
	});

	it('save in one instance, activate in a clean one: read(tab).groupMemberships is equal', async () => {
		const a = instance('vm-a');
		await a.port.propose('tags', {
			...defaults,
			groupMemberships: TAGS_GROUPS,
			groupPreset: { kind: 'custom', direction: 'asc' },
			hiddenGroupIds: ['Home'],
			indent: false,
		});
		const saved = photoOf(a.port.read('tags'));

		const b = instance('vm-b');
		await applyLayoutToPort(b.port, layoutFor('tags', saved));

		const tags = b.port.read('tags');
		expect(tags.groupMemberships).toEqual(TAGS_GROUPS);
		expect(tags.groupPreset).toEqual({ kind: 'custom', direction: 'asc' });
		expect(tags.hiddenGroupIds).toEqual(['Home']);
		expect(tags.indent).toBe(false);
		// Per scene: the Tags photo never touches Files.
		expect(b.port.read('files').groupMemberships).toEqual({});
		expect(b.registry.instances['vm-b'].scenes.files).toBeUndefined();
		// And the two instances share nothing but the photo.
		expect(b.registry.instances['vm-b'].scenes.tags?.groupMemberships).not.toBe(
			a.registry.instances['vm-a'].scenes.tags?.groupMemberships,
		);
	});

	it('saving twice under the same name cannot lose the groups: the photo is lossless', async () => {
		// Census row 9: `saveLayout` used to omit the groups and pageFilters
		// replaced the entry, so re-saving dropped them. Now the second photo
		// of the same scene equals the first, groups included.
		const a = instance('vm-a');
		await a.port.propose('tags', { ...defaults, groupMemberships: TAGS_GROUPS });
		const first = photoOf(a.port.read('tags'));
		const second = photoOf(a.port.read('tags'));
		expect(second).toEqual(first);
		expect(second.groupMemberships).toEqual(TAGS_GROUPS);
		// Round trip through another instance and back: still the same photo.
		const b = instance('vm-b');
		await applyLayoutToPort(b.port, layoutFor('tags', first));
		expect(photoOf(b.port.read('tags'))).toEqual(first);
	});

	it('a photo taken before U130-09 preserves the current groups of the scene', async () => {
		const b = instance('vm-b');
		await b.port.propose('files', {
			...defaults,
			groupMemberships: { Mine: ['files:file:a.md|a'] },
		});
		const legacy: SavedViewConfig = {
			viewMode: 'table',
			visibleCells: ['name'],
			sortState: normalizeExplorerSortState('files', null),
		};
		await applyLayoutToPort(b.port, {
			...layoutFor('files', legacy),
			viewModeByTab: { files: 'table' },
		});
		const files = b.port.read('files');
		expect(files.viewMode).toBe('table');
		expect(files.groupMemberships).toEqual({ Mine: ['files:file:a.md|a'] });
	});

	it('sceneFacetsOf carries only what the photo has, as copies', () => {
		const saved: SavedViewConfig = {
			viewMode: 'tree',
			visibleCells: [],
			sortState: normalizeExplorerSortState('tags', null),
			groupMemberships: { Work: ['tags:tag:work|work'] },
			stickyRows: false,
		};
		const facets = sceneFacetsOf(saved);
		expect(Object.keys(facets).sort()).toEqual(['groupMemberships', 'stickyRows']);
		expect(facets.groupMemberships).toEqual(saved.groupMemberships);
		expect(facets.groupMemberships).not.toBe(saved.groupMemberships);
		expect(facets.groupMemberships?.Work).not.toBe(saved.groupMemberships?.Work);
	});
});
