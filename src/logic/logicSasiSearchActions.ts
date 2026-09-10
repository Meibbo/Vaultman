import type { SasiRegistry } from './logicSasiRegistry';

export const SEARCH_CYCLE_CATEGORY_ID = 'vaultman.search.cycleCategory';
export const SEARCH_CREATE_TARGET_ID = 'vaultman.search.createTarget';

/**
 * U130-05b: los dos controles que el searchbox pintaba a mano.
 *
 * Hasta ahora `categoryIcon` y `createIcon` no eran nodos de nada: eran strings
 * con un handler directo y sin id, asi que la celda unificada no podia
 * hospedarlos y el futuro layoutBuilder no podia componerlos.
 *
 * El `icon` de aqui es solo el respaldo. La cara real la proyecta el host
 * (`logicSearchCellProjection`), porque el de categoria CICLA -- el icono
 * depende de la pestana y de la categoria activa -- y una def estatica no puede
 * representar una cara que cambia. SASI guarda la identidad; el host proyecta
 * el ahora mismo.
 *
 * No se les inventa `supports` mas alla de `searchbox`: no hay quien los
 * consuma en otra superficie, y ponerlo seria alcance imaginado.
 */
export function registerSearchActions(registry: SasiRegistry): void {
	registry.register({
		id: SEARCH_CYCLE_CATEGORY_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.search.cycle_category',
		icon: 'lucide-search',
		supports: [{ surface: 'searchbox' }],
	});
	registry.register({
		id: SEARCH_CREATE_TARGET_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.search.create_target',
		icon: 'lucide-plus',
		supports: [{ surface: 'searchbox' }],
	});
}
