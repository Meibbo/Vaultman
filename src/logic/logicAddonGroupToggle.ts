import type { SasiRegistry } from './logicSasiRegistry';

/**
 * Spec 07 §2 (direccion descendente): el `cell_toggle` alojado en un
 * `node_group` aplica a todos sus miembros, en las Scenes de plugins y
 * snippets.
 *
 * Decisiones del dev (2026-09-06) que gobiernan este fichero:
 *
 * - **ACTION, no operation.** Se registra en SASI con categoria `action`:
 *   encender/apagar un addon es un cambio de estado del workspace, no una
 *   escritura sobre ficheros del vault. No pasa por la queue ni aparece en
 *   `OperationSummaryModal`. Este modulo no importa ninguno de los dos a
 *   proposito: si algun dia aparece ese import, es el error que hay que
 *   pillar en review.
 * - **Tri-estado: 1ª pulsacion APAGA todo, 2ª ENCIENDE todo.** Es la
 *   convencion del toggle de expansion/colapso
 *   (`src/components/pages/pageFilters.svelte:1720-1729`: `hasExpandedNodes()`
 *   decide entre `collapseAll()` y `expandAll()`). No se inventa una nueva:
 *   `resolveGroupToggleTarget` es esa misma regla sobre estados de addon.
 */

export const PLUGIN_GROUP_TOGGLE_ID = 'vaultman.addons.toggleGroupPlugins';
export const SNIPPET_GROUP_TOGGLE_ID = 'vaultman.addons.toggleGroupSnippets';

/**
 * Da de alta el toggle de grupo como ACTION. Sin `mutatesVault`: una action
 * que lo llevara saltaria la puerta de confirmacion de `logicSasiInvoke`.
 * `supports` no se inventa mas alla del panel que pinta la celda, igual que
 * `logicSasiSearchActions` no declara mas alla del searchbox.
 */
export function registerAddonGroupToggleActions(registry: SasiRegistry): void {
	registry.register({
		id: PLUGIN_GROUP_TOGGLE_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.addons.toggle_group_plugins',
		icon: 'lucide-toggle-right',
		supports: [{ surface: 'panelWidget' }],
	});
	registry.register({
		id: SNIPPET_GROUP_TOGGLE_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.addons.toggle_group_snippets',
		icon: 'lucide-toggle-right',
		supports: [{ surface: 'panelWidget' }],
	});
}

/**
 * Objetivo del toggle de grupo sobre los estados actuales de sus miembros.
 * Regla del toggle de expansion: si hay ALGO encendido, la primera pulsacion
 * APAGA todo; solo con todo apagado la siguiente ENCIENDE todo. El estado
 * mixto se PINTA como mixto (`summarizeGroupToggleState`), pero la accion no
 * es ambigua. Grupo vacio: nada encendido, objetivo encender (el panel no
 * despacha de todos modos sin hijos).
 */
export function resolveGroupToggleTarget(
	memberEnabled: readonly boolean[],
): boolean {
	return !memberEnabled.some(Boolean);
}

export interface GroupToggleSummary {
	/** Todos encendidos. */
	enabled: boolean;
	/** Algunos si, algunos no: se pinta mixto, la accion sigue siendo total. */
	mixed: boolean;
}

/** Agregado para pintar la celda `state` de la cabecera de grupo. */
export function summarizeGroupToggleState(
	memberEnabled: readonly boolean[],
): GroupToggleSummary {
	const anyOn = memberEnabled.some(Boolean);
	const allOn = memberEnabled.length > 0 && memberEnabled.every(Boolean);
	return { enabled: allOn, mixed: anyOn && !allOn };
}
