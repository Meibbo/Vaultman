import {
	TOOLBAR_MENU_KINDS,
	toolbarMenuCatalog,
} from './logicToolbarMenuCatalog';
import type { SasiRegistry } from './logicSasiRegistry';

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
