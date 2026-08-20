import { describe, expect, it, vi } from 'vitest';
import type { InstanceRegistryData } from '../../src/types/typeInstance';
// El estado de orden no se escribe a mano: se construye con el helper real del
// proyecto. `ExplorerSortState` no es {key,direction,filtered}.
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import { createSceneConfigPort } from '../../src/logic/logicSceneConfigPort';
import { EMPTY_REGISTRY, ensureInstance } from '../../src/logic/logicInstanceRegistry';

const defaults = {
	viewMode: 'tree' as const,
	interactionMode: 'open' as const,
	visibleCells: ['name'],
	sortState: normalizeExplorerSortState('files', null),
};

function harness() {
	let registry: InstanceRegistryData = ensureInstance(EMPTY_REGISTRY, 'vm-1').registry;
	const persist = vi.fn(async () => {});
	const port = createSceneConfigPort({
		instanceId: 'vm-1',
		readRegistry: () => registry,
		writeRegistry: (next) => {
			registry = next;
		},
		persist,
		defaultsFor: () => defaults,
	});
	return { port, persist, get registry() {
		return registry;
	} };
}

describe('createSceneConfigPort', () => {
	it('reads the defaults when the scene has no stored patch', () => {
		const { port } = harness();
		expect(port.read('files')).toEqual(defaults);
	});

	it('stores only what differs from the baseline', async () => {
		const h = harness();
		await h.port.propose('files', { ...defaults, viewMode: 'table' });
		expect(h.registry.instances['vm-1'].scenes.files).toEqual({ viewMode: 'table' });
	});

	it('does not touch the registry when nothing actually changed', async () => {
		const h = harness();
		await h.port.propose('files', { ...defaults });
		expect(h.registry.instances['vm-1'].scenes.files).toBeUndefined();
		expect(h.persist).not.toHaveBeenCalled();
	});

	it('keeps two scenes of the same instance independent', async () => {
		const h = harness();
		await h.port.propose('files', { ...defaults, viewMode: 'table' });
		await h.port.propose('tags', { ...defaults, viewMode: 'grid' });
		expect(h.port.read('files').viewMode).toBe('table');
		expect(h.port.read('tags').viewMode).toBe('grid');
	});

	it('survives a missing instance without throwing', async () => {
		const h = harness();
		const orphan = createSceneConfigPort({
			instanceId: 'vm-does-not-exist',
			readRegistry: () => h.registry,
			writeRegistry: () => {},
			persist: async () => {},
			defaultsFor: () => defaults,
		});
		expect(orphan.read('files')).toEqual(defaults);
		await expect(orphan.propose('files', { ...defaults, viewMode: 'table' })).resolves.toBeUndefined();
	});
});