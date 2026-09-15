import { describe, expect, it } from 'vitest';
import type { SceneConfig } from '../../src/types/typeInstance';
import type { SavedLayout, SavedViewConfig } from '../../src/types/typeSettings';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';

/**
 * U130-09 (dev 2026-09-15): los custom groups viven en la scene de la
 * instancia, no en el layout. El layout solo los fotografia por tab
 * (`SavedViewConfig`), y el mapa plano `SavedLayout.groupMemberships` se
 * retira del tipo sin migracion (la feature no salio del laboratorio).
 */
describe('U130-09 groupMemberships en SceneConfig', () => {
	it('acepta un mapa de groupId a URNs en la scene', () => {
		const scene: SceneConfig = {
			groupMemberships: {
				'grp-1': ['files:file:proyectos/alfa.md|alfa.md'],
			},
		};
		expect(scene.groupMemberships?.['grp-1']).toHaveLength(1);
	});

	it('es escaso: una scene sin grupos hereda de la capa de arriba', () => {
		const scene: SceneConfig = {};
		expect(scene.groupMemberships).toBeUndefined();
	});

	it('la foto por tab del layout captura el mapa junto al resto de facetas', () => {
		const tab: SavedViewConfig = {
			viewMode: 'tree',
			visibleCells: ['name'],
			sortState: normalizeExplorerSortState('tags', null),
			groupMemberships: { Work: ['tags:tag:work|work'] },
			groupPreset: { kind: 'custom', direction: 'asc' },
			hiddenGroupIds: [],
			stickyRows: true,
			compactFolders: false,
			indent: true,
		};
		expect(tab.groupMemberships?.Work).toEqual(['tags:tag:work|work']);
	});

	it('un layout sin foto de grupos sigue siendo valido', () => {
		const layout: SavedLayout = { name: 'x', summary: '', config: {} };
		expect(layout.config['tags']?.groupMemberships).toBeUndefined();
	});

	it('el layout ya no lleva el mapa plano: solo la foto por tab', () => {
		const layout: SavedLayout = { name: 'x', summary: '', config: {} };
		// Guarda de tipo: `pnpm run check` falla si la clave vuelve al tipo.
		// @ts-expect-error U130-09: `SavedLayout.groupMemberships` se retiro (decision 3 del dev).
		expect(layout.groupMemberships).toBeUndefined();
	});
});
