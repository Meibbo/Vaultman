import {
	TOOLBAR_MENU_KINDS,
	toolbarMenuCatalog,
} from './logicToolbarMenuCatalog';
import type { SasiRegistry } from './logicSasiRegistry';

export const TOOLBAR_REVEAL_ACTIVE_FILE_ID = 'vaultman.toolbar.revealActiveFile';
export const TOOLBAR_TOGGLE_EXPANSION_ID = 'vaultman.toolbar.toggleExpansion';
export const TOOLBAR_SEARCHBOX_ID = 'vaultman.toolbar.searchbox';
export const TOOLBAR_FOCUS_SEARCH_ID = 'focus-active-explorer-search';

const TOOLBAR_ACTIONS = [
	{ id: TOOLBAR_REVEAL_ACTIVE_FILE_ID, labelKey: 'sasi.toolbar.reveal_active_file', icon: 'lucide-gallery-vertical' },
	{ id: TOOLBAR_TOGGLE_EXPANSION_ID, labelKey: 'sasi.toolbar.toggle_expansion', icon: 'lucide-chevrons-up-down' },
	{ id: TOOLBAR_SEARCHBOX_ID, labelKey: 'sasi.toolbar.searchbox', icon: 'lucide-search' },
	{ id: TOOLBAR_FOCUS_SEARCH_ID, labelKey: 'sasi.toolbar.searchbox', icon: 'lucide-search' },
] as const;

/**
 * U130-110: todo el catalogo estatico del toolbar como acciones SASI.
 *
 * Deriva las definiciones de `toolbarMenuCatalog` (scene/view/sort): mismos
 * ids, labelKey e icono. Los hijos runtime (layouts guardados, grupos custom,
 * filas de scope, tipos de fichero) no estan en el catalogo y por tanto no se
 * registran: solo entra lo estatico.
 *
 * Como en hover/move/scene, aqui solo va la IDENTIDAD. La publicacion de
 * comandos y el relay a la escena activa pertenecen al contrato de
 * instance-surfaces, todavia ausente: no se inventan handlers no-op.
 */
export function registerToolbarMenuActions(registry: SasiRegistry): void {
	for (const entry of TOOLBAR_ACTIONS) {
		registry.register({
			...entry,
			axis: 'function',
			kind: 'action',
			supports: [{ surface: 'panelWidget' }, { surface: 'searchbox' }],
		});
	}
	for (const kind of TOOLBAR_MENU_KINDS) {
		for (const entry of toolbarMenuCatalog(kind)) {
			registry.register({
				id: entry.id,
				axis: 'function',
				kind: 'action',
				labelKey: entry.labelKey,
				icon: entry.icon,
				supports: [{ surface: 'panelWidget' }],
			});
		}
	}
}
