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

	// U121-101: el repro literal del dev -- propScene en Tree, a table, y de
	// vuelta a tree; salir a otra escena y volver la mostraba en Table. La capa
	// de scene se fusionaba, asi que el ultimo paso (que vuelve al baseline y por
	// tanto NO emite clave) dejaba vivo el `viewMode: 'table'` anterior.
	it('clears a stored override when the value returns to its baseline', async () => {
		const h = harness();
		await h.port.propose('props', { ...defaults, viewMode: 'table' });
		expect(h.registry.instances['vm-1'].scenes.props).toEqual({ viewMode: 'table' });

		await h.port.propose('props', { ...defaults, viewMode: 'tree' });
		expect(h.registry.instances['vm-1'].scenes.props).toEqual({});
		expect(h.port.read('props').viewMode).toBe('tree');
	});

	// El mismo fallo, con dos claves: soltar una NO puede arrastrar a la otra.
	it('drops only the key that went back to baseline', async () => {
		const h = harness();
		await h.port.propose('props', {
			...defaults,
			viewMode: 'table',
			visibleCells: ['name', 'ext'],
		});
		await h.port.propose('props', { ...defaults, visibleCells: ['name', 'ext'] });
		expect(h.registry.instances['vm-1'].scenes.props).toEqual({
			visibleCells: ['name', 'ext'],
		});
		expect(h.port.read('props').viewMode).toBe('tree');
		expect(h.port.read('props').visibleCells).toEqual(['name', 'ext']);
	});

	it('keeps two scenes of the same instance independent', async () => {
		const h = harness();
		await h.port.propose('files', { ...defaults, viewMode: 'table' });
		await h.port.propose('tags', { ...defaults, viewMode: 'grid' });
		expect(h.port.read('files').viewMode).toBe('table');
		expect(h.port.read('tags').viewMode).toBe('grid');
	});

	// U121-109: `onOpen()` corre antes que `setState()`, asi que el puerto nace
	// apuntando a una identidad recien acunada y el ancla real llega despues. Si
	// no se puede adoptar, la config de esa instancia queda huerfana -- que es el
	// defecto que el dev veia como "el checkbox no aparece".
	it('reads the adopted instance after a late re-anchor', async () => {
		let registry = ensureInstance(EMPTY_REGISTRY, 'vm-anchored').registry;
		registry = ensureInstance(registry, 'vm-minted').registry;
		const port = createSceneConfigPort({
			instanceId: 'vm-minted',
			readRegistry: () => registry,
			writeRegistry: (next) => {
				registry = next;
			},
			persist: async () => {},
			defaultsFor: () => defaults,
		});

		// La instancia anclada tiene configuracion; la acunada, no.
		const anchoredPort = createSceneConfigPort({
			instanceId: 'vm-anchored',
			readRegistry: () => registry,
			writeRegistry: (next) => {
				registry = next;
			},
			persist: async () => {},
			defaultsFor: () => defaults,
		});
		await anchoredPort.propose('files', { ...defaults, viewMode: 'table' });

		expect(port.read('files').viewMode).toBe('tree');
		let notified = 0;
		port.onInstanceChange(() => {
			notified += 1;
		});
		port.setInstanceId('vm-anchored');
		expect(notified).toBe(1);
		expect(port.read('files').viewMode).toBe('table');
	});

	it('ignores a re-anchor to the same instance, and lets listeners unsubscribe', () => {
		const h = harness();
		let notified = 0;
		const off = h.port.onInstanceChange(() => {
			notified += 1;
		});
		h.port.setInstanceId('vm-1');
		expect(notified).toBe(0);
		off();
		h.port.setInstanceId('vm-2');
		expect(notified).toBe(0);
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