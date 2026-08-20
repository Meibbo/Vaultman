import { describe, expect, it } from 'vitest';
import { resolveSceneConfig } from '../../src/logic/logicSettingsCascade';
import type { SceneConfig } from '../../src/types/typeInstance';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';

// El estado de orden NO se escribe a mano: es un objeto con `sorts`, `activeScope` y
// compatibilidad heredada. Se construye con el mismo helper que usa el componente real, que es
// lo unico que garantiza que el fixture no idealice los datos.
const defaults: Required<SceneConfig> = {
	viewMode: 'tree',
	interactionMode: 'open',
	visibleCells: ['name', 'count'],
	sortState: normalizeExplorerSortState('files', null),
};

describe('resolveSceneConfig', () => {
	it('returns the defaults when every other layer is empty', () => {
		expect(resolveSceneConfig({ defaults })).toEqual(defaults);
	});

	it('lets each layer override the one above it', () => {
		const resolved = resolveSceneConfig({
			defaults,
			global: { viewMode: 'cards' },
			instanceSelf: { viewMode: 'table' },
			scene: { viewMode: 'grid' },
		});
		expect(resolved.viewMode).toBe('grid');
	});

	it('ignores undefined instead of letting it erase the layer above', () => {
		const resolved = resolveSceneConfig({
			defaults,
			instanceSelf: { viewMode: 'table' },
			scene: { viewMode: undefined, interactionMode: 'select' },
		});
		expect(resolved.viewMode).toBe('table');
		expect(resolved.interactionMode).toBe('select');
	});

	it('replaces visibleCells wholesale rather than merging the arrays', () => {
		const resolved = resolveSceneConfig({
			defaults,
			scene: { visibleCells: ['name'] },
		});
		expect(resolved.visibleCells).toEqual(['name']);
	});

	it('copies visibleCells so a consumer cannot mutate the stored layer', () => {
		const scene: SceneConfig = { visibleCells: ['name'] };
		const resolved = resolveSceneConfig({ defaults, scene });
		resolved.visibleCells.push('count');
		expect(scene.visibleCells).toEqual(['name']);
	});

	it('applies the outlet layer last of all', () => {
		const resolved = resolveSceneConfig({
			defaults,
			scene: { viewMode: 'grid' },
			outlet: { viewMode: 'cards' },
		});
		expect(resolved.viewMode).toBe('cards');
	});
});

describe('diffSceneConfig', () => {
	it('keeps only what differs from the resolved baseline', async () => {
		const { diffSceneConfig } = await import('../../src/logic/logicSettingsCascade');
		const patch = diffSceneConfig(defaults, { ...defaults, viewMode: 'table' });
		expect(patch).toEqual({ viewMode: 'table' });
	});

	it('returns an empty patch when nothing changed', async () => {
		const { diffSceneConfig } = await import('../../src/logic/logicSettingsCascade');
		expect(diffSceneConfig(defaults, { ...defaults })).toEqual({});
	});

	it('treats a reordered visibleCells as a real change', async () => {
		const { diffSceneConfig } = await import('../../src/logic/logicSettingsCascade');
		const patch = diffSceneConfig(defaults, { ...defaults, visibleCells: ['count', 'name'] });
		expect(patch).toEqual({ visibleCells: ['count', 'name'] });
	});
});