import type { ExplorerTabId } from '../types/typeUI';
import type { SasiNode } from '../services/serviceSasiProvider';
import {
	SEARCH_CREATE_TARGET_ID,
	SEARCH_CYCLE_CATEGORY_ID,
} from './logicSasiSearchActions';

export const MOVE_TOGGLE_WRITE_ID = 'vaultman.move.toggleWrite';
export const MOVE_TOGGLE_ORIGIN_ID = 'vaultman.move.toggleOriginDisposition';
export const NODEMOVE_TOGGLE_WRITE_ID = 'vaultman.nodemove.toggleWrite';
export const NODEMOVE_TOGGLE_ORIGIN_ID =
	'vaultman.nodemove.toggleOriginDisposition';

/**
 * U130-I01: Files resuelve sus toggles por los ids NodeMove reales; el resto
 * de tabs mantiene los ids move.* (Props, sin regresion). Decision unica:
 * cara e invoker coinciden porque ambos leen este helper.
 */
export function moveToggleActionIds(
	tab: ExplorerTabId,
): readonly [string, string] {
	if (tab === 'files') {
		return [NODEMOVE_TOGGLE_WRITE_ID, NODEMOVE_TOGGLE_ORIGIN_ID];
	}
	return [MOVE_TOGGLE_WRITE_ID, MOVE_TOGGLE_ORIGIN_ID];
}

/**
 * U130-05b: el unico sitio donde vive "que cara lleva este control ahora".
 *
 * Salen de `navbarFilters.svelte`, donde eran constantes de componente y por
 * tanto no se podian probar sin DOM. Las etiquetas pasan a ser CLAVES porque
 * `cellAction` hace `translate(node.labelKey)`; los strings ya traducidos que
 * habia alli no le sirven.
 */
export const SEARCH_CATEGORY_ICONS: Record<ExplorerTabId, readonly string[]> = {
	props: ['lucide-search', 'lucide-tag'],
	tags: ['lucide-hash', 'lucide-git-branch'],
	files: ['lucide-file', 'lucide-folder'],
	snippets: ['lucide-file-code'],
	plugins: ['lucide-plug'],
};

const SEARCH_CATEGORY_LABEL_KEYS: Record<ExplorerTabId, readonly string[]> = {
	props: ['filter.category.all_props', 'filter.category.prop_names'],
	tags: ['filter.category.all_tags', 'filter.category.leaf_tags'],
	files: ['filter.category.files', 'filter.category.folders'],
	snippets: ['filter.tab.snippets'],
	plugins: ['filter.tab.plugins'],
};

export interface SearchCellMoveToggles {
	write: 'append' | 'replace';
	originDisposition: 'move' | 'copy';
}

export interface SearchCellContext {
	tab: ExplorerTabId;
	categoryIndex: number;
	canCreate: boolean;
	/** Depende de la pestana y de la categoria activa; lo resuelve el host. */
	createIcon: string;
	moveToggles: SearchCellMoveToggles | null;
}

/**
 * El reparto, en orden. Un control que no pertenece a la pestana actual NO
 * entra en la lista -- no entra deshabilitado.
 *
 * El estado deshabilitado de `cellAction` habla de una accion REGISTRADA que
 * ahora mismo no se puede usar (retirada, plugin apagado), no de un control que
 * no pertenece a esta superficie. Confundir las dos cosas pondria un boton gris
 * en el searchbox de Snippets, donde hoy no hay nada.
 */
export function searchCellIds(ctx: SearchCellContext): readonly string[] {
	if (ctx.moveToggles) {
		return moveToggleActionIds(ctx.tab);
	}
	const ids: string[] = [];
	if (SEARCH_CATEGORY_ICONS[ctx.tab].length > 1) {
		ids.push(SEARCH_CYCLE_CATEGORY_ID);
	}
	if (ctx.canCreate) ids.push(SEARCH_CREATE_TARGET_ID);
	return ids;
}

/**
 * La cara de una celda AHORA MISMO. `null` si ese id no esta en el reparto.
 *
 * Cada toggle se etiqueta con el estado en el que ESTA, no con el estado al que
 * iria: un control que nombra su destino se lee como una orden y se pulsa por
 * error.
 */
export function searchCellFace(
	id: string,
	ctx: SearchCellContext,
): SasiNode | null {
	if (!searchCellIds(ctx).includes(id)) return null;
	const [writeId, originId] = moveToggleActionIds(ctx.tab);
	if (id === writeId) {
		const appending = ctx.moveToggles!.write === 'append';
		return {
			id,
			kind: 'action',
			labelKey: appending
				? 'explorer.move_to_prop.write.append'
				: 'explorer.move_to_prop.write.replace',
			icon: appending ? 'lucide-list-plus' : 'lucide-replace',
		};
	}
	if (id === originId) {
		const moving = ctx.moveToggles!.originDisposition === 'move';
		return {
			id,
			kind: 'action',
			labelKey: moving
				? 'explorer.move_to_prop.origin.move'
				: 'explorer.move_to_prop.origin.copy',
			icon: moving ? 'lucide-scissors' : 'lucide-copy',
		};
	}
	if (id === SEARCH_CYCLE_CATEGORY_ID) {
		const icons = SEARCH_CATEGORY_ICONS[ctx.tab];
		const keys = SEARCH_CATEGORY_LABEL_KEYS[ctx.tab];
		const index = ctx.categoryIndex % icons.length;
		return {
			id,
			kind: 'action',
			labelKey: keys[index] ?? 'filter.search_mode',
			icon: icons[index] ?? 'lucide-search',
		};
	}
	return {
		id,
		kind: 'action',
		labelKey: 'filter.create',
		icon: ctx.createIcon,
	};
}

/**
 * Solo los toggles publican estado pulsado. Va aparte de `SasiNode` a
 * proposito: el nodo describe QUE ES la accion; si esta pulsada es del host, y
 * `SasiNode` no es solo del searchbox.
 */
export function searchCellToggleState(
	ctx: SearchCellContext,
): Readonly<Record<string, boolean>> {
	if (!ctx.moveToggles) return {};
	const [writeId, originId] = moveToggleActionIds(ctx.tab);
	return {
		[writeId]: ctx.moveToggles.write === 'replace',
		[originId]: ctx.moveToggles.originDisposition === 'copy',
	};
}
