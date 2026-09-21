import type {
	ExplorerSortState,
	ExplorerViewMode,
	ScopeSort,
} from '../types/typeUI';
import type { FloatingTocPanel } from '../services/routerFloatingToc';
import type { AddonCellStyle } from '../types/typeSettings';
import type { PluginMeta, TreeNode } from '../types/typeTree';
import type { NativeSettingsSearchGroup } from '../types/typeSettingsSearch';
import {
	settingsBridgeRowId,
	withSettingsRef,
} from '../types/typeSettingsSearch';
import type { InteractionMode } from './logicInteractionMode';

export interface AddonEntryProjection {
	name: string;
	enabled: boolean;
	installedTime?: number;
	updatedTime?: number;
}

export interface AddonExplorerPanelPort extends FloatingTocPanel {
	refresh(): Promise<void>;
	setSearchTerm(term: string): void;
	setSortState(state: ExplorerSortState): void;
	setVisibleCells(cells: Set<string>): void;
	setViewMode(mode: ExplorerViewMode): void;
	setInteractionMode(mode: InteractionMode): void;
	setCellStyle(style: AddonCellStyle): void;
}

export function sortAddonEntries<T extends AddonEntryProjection>(
	entries: readonly T[],
	sort: ScopeSort,
): T[] {
	const direction = sort.direction === 'asc' ? 1 : -1;
	const numeric = { numeric: true, sensitivity: 'base' } as const;
	return [...entries].sort((a, b) => {
		if (sort.sortBy === 'state' && a.enabled !== b.enabled) {
			return direction * (Number(a.enabled) - Number(b.enabled));
		}
		if (sort.sortBy === 'installed' || sort.sortBy === 'updated') {
			const field =
				sort.sortBy === 'installed' ? 'installedTime' : 'updatedTime';
			const left = a[field];
			const right = b[field];
			if (left == null && right != null) return 1;
			if (left != null && right == null) return -1;
			if (left != null && right != null && left !== right) {
				return direction * (left - right);
			}
		}
		const byName = a.name.localeCompare(b.name, undefined, numeric);
		return sort.sortBy === 'name' ? direction * byName : byName;
	});
}

export function filterAddonEntries<T>(
	entries: readonly T[],
	term: string,
	searchableText: (entry: T) => string,
): T[] {
	const query = term.trim().toLocaleLowerCase();
	if (!query) return [...entries];
	return entries.filter((entry) =>
		searchableText(entry).toLocaleLowerCase().includes(query),
	);
}

export interface AddonHoverData {
	name: string;
	installed?: string;
	updated?: string;
	version?: string;
	author?: string;
}

export function buildAddonHoverInfo(
	data: AddonHoverData,
	labels: Record<'installed' | 'updated' | 'version' | 'author', string>,
): string {
	const lines = [data.name];
	for (const field of ['installed', 'updated', 'version', 'author'] as const) {
		const value = data[field];
		if (value) lines.push(`${labels[field]}: ${value}`);
	}
	return lines.join('\n');
}

export function formatAddonTimestamp(timestamp?: number): string | undefined {
	return timestamp == null ? undefined : new Date(timestamp).toLocaleString();
}

/**
 * U130 Slice A: el puente provider/search de la scene de plugins.
 *
 * Término vacío (`''` exacto) = listado legacy idéntico (ids/sort/cells de
 * antes del puente). Cualquier otro término (incluidos los espacios puros)
 * = una sola búsqueda nativa por cambio efectivo, SIN `searchText` local:
 * el ranking es el orden nativo (grupos e items tal cual llegan) y los
 * espacios/cero-resultados/adapter-off limpian el árbol previo.
 */
export function isSettingsSearchActive(term: string): boolean {
	return term.length > 0;
}

export interface SettingsBridgeInput {
	/** Nodos legacy ya construidos (mismas celdas/acciones), por pluginId. */
	pluginNodesById: ReadonlyMap<string, TreeNode<PluginMeta>>;
	/** Grupos nativos en orden de ranking; NO se reordenan ni se filtran. */
	groups: readonly NativeSettingsSearchGroup[];
}

export interface SettingsBridgeResult {
	/** Filas en ranking nativo: plugin resoluble o `node_settings`. */
	nodes: TreeNode<PluginMeta>[];
	/**
	 * Solo las filas con match real (mecanismo estándar
	 * `settingsSearchHighlightIds`): al menos un span en `nameMatch` o
	 * `descMatch` del item (filas plugin/settings) o en `tabNameMatch`
	 * del grupo (filas de tab). Sin matches → fila normal sin highlight.
	 */
	highlightIds: Set<string>;
}

/**
 * Resuelve cada item nativo a una fila:
 *
 * - `entry.tab` idéntico a un `plugin:<id>` conocido = la MISMA fila legacy
 *   (conserva kind `plugin` y sus celdas toggle/config). Sin fuzzy: la
 *   igualdad es exacta y case-sensitive, como los ids de plugin.
 * - Si el tab no resuelve (caso real: `community-plugins`), `definition.name`
 *   idéntico al `meta.name` de UNA entry conocida = la MISMA fila legacy.
 *   Igualdad exacta y case-sensitive; cero o dos+ candidatas con ese nombre
 *   (duplicado/ambiguo) = fila `node_settings`, nunca adivinar.
 * - Sin resoluble (tab desconocido, nombre sin candidato único, intercepción
 *   sin identidad canónica, tag sin `tagPath`) = `node_settings` con texto
 *   y SIN celdas (highlight solo si el item trae matches, ver abajo).
 *   Nunca una segunda entidad para la misma identidad: un plugin que sale
 *   en dos grupos nativos emite UNA fila (su primera posición de ranking);
 *   las dos ocurrencias `adopted` (`id@grupo`) las pone la proyección de
 *   grupos custom cuando el toggle está on, no el puente.
 * - Grupo con cero resultados y `tabNameMatch` NO vacío (editor custom no
 *   indexado, caso real: `hotkeys`) = UNA fila con el nombre del tab
 *   (`tabName`, clave `tab.id`), navegable por selección y highlighted.
 *   Grupo vacío SIN `tabNameMatch` = cero filas, no se inventa nada.
 *
 * Highlight: solo entran las filas cuyo item tenga `nameMatch`/`descMatch`
 * NO vacíos (o la fila de tab, cuyo `tabNameMatch` es NO vacío por
 * construcción). Sin matches → fila normal sin highlight.
 *
 * Las fechas de plugins llegan con la fila legacy (vía `obsidianAddons`
 * `addonTimes` + la proyección existente). Las filas `node_settings` y los
 * tags no reciben fechas: `TagMeta` no las tiene y no hay proyección
 * interceptada que cablear.
 */
export function resolveSettingsBridgeNodes(
	input: SettingsBridgeInput,
): SettingsBridgeResult {
	const nodes: TreeNode<PluginMeta>[] = [];
	const highlightIds = new Set<string>();
	const emittedIds = new Set<string>();
	// Intercepción por nombre de definición: índice exacto y case-sensitive
	// de `meta.name` → filas legacy. Lista por nombre para detectar
	// duplicados (ambiguo = no adivinar).
	const nodesByName = new Map<string, TreeNode<PluginMeta>[]>();
	for (const node of input.pluginNodesById.values()) {
		const list = nodesByName.get(node.meta.name);
		if (list) list.push(node);
		else nodesByName.set(node.meta.name, [node]);
	}
	const hasRealMatch = (item: {
		readonly nameMatch: readonly unknown[];
		readonly descMatch: readonly unknown[];
	}): boolean => item.nameMatch.length > 0 || item.descMatch.length > 0;
	const emitPluginRow = (
		row: TreeNode<PluginMeta>,
		matched: boolean,
	): void => {
		if (emittedIds.has(row.id)) {
			if (matched) highlightIds.add(row.id);
			return;
		}
		emittedIds.add(row.id);
		nodes.push(row);
		if (matched) highlightIds.add(row.id);
	};
	for (const group of input.groups) {
		const results = group.results ?? [];
		if (results.length === 0) {
			// Grupo vacío sin match en el nombre del tab: no inventa filas.
			if (group.tabNameMatch.length === 0) continue;
			const tabLabel = group.tabName !== '' ? group.tabName : group.tab;
			const ref = {
				tab: group.tab,
				page: group.page,
				pagePath: group.pagePath,
				definition: '',
			};
			const rowId = settingsBridgeRowId(ref);
			if (emittedIds.has(rowId)) continue;
			emittedIds.add(rowId);
			nodes.push({
				id: rowId,
				label: tabLabel,
				depth: 0,
				cells: [],
				meta: withSettingsRef(
					{
						pluginId: '',
						name: tabLabel,
						enabled: false,
						loaded: false,
						isVaultman: false,
					},
					ref,
				),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			});
			highlightIds.add(rowId);
			continue;
		}
		for (const item of results) {
			const tab = item.entry?.tab ?? '';
			const resolved = tab !== '' ? input.pluginNodesById.get(tab) : undefined;
			if (resolved) {
				emitPluginRow(resolved, hasRealMatch(item));
				continue;
			}
			const definition = item.entry?.definition ?? '';
			const candidates =
				definition !== '' ? nodesByName.get(definition) : undefined;
			if (candidates?.length === 1 && candidates[0]) {
				emitPluginRow(candidates[0], hasRealMatch(item));
				continue;
			}
			const ref = {
				tab,
				page: item.entry?.page ?? '',
				pagePath: item.entry?.pagePath ?? '',
				definition: item.entry?.definition ?? '',
			};
			const rowId = settingsBridgeRowId(ref);
			if (emittedIds.has(rowId)) continue;
			emittedIds.add(rowId);
			const label = ref.definition !== '' ? ref.definition : (ref.page !== '' ? ref.page : tab);
			const typeText =
				ref.pagePath !== '' ? ref.pagePath : (ref.page !== '' ? ref.page : undefined);
			nodes.push({
				id: rowId,
				label,
				...(typeText !== undefined ? { typeText } : {}),
				depth: 0,
				cells: [],
				meta: withSettingsRef(
					{
						pluginId: '',
						name: label,
						enabled: false,
						loaded: false,
						isVaultman: false,
					},
					ref,
				),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			});
			if (hasRealMatch(item)) highlightIds.add(rowId);
		}
	}
	return { nodes, highlightIds };
}
