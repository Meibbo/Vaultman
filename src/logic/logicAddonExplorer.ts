import type {
	ExplorerSortState,
	ExplorerViewMode,
	ScopeSort,
} from '../types/typeUI';
import type { FloatingTocPanel } from '../services/routerFloatingToc';
import type { AddonCellStyle } from '../types/typeSettings';
import type { PluginMeta, TreeNode } from '../types/typeTree';
import type { NativeSettingsSearchGroup } from '../types/typeSettingsSearch';
import type { App } from 'obsidian';
import {
	settingsBridgeRowId,
	settingsBridgeGroupRowId,
	withSettingsRef,
} from '../types/typeSettingsSearch';
import { hasPluginSettingsTab } from '../logic/logicAddonCells';
import {
	listPluginSettingPages,
} from '../services/serviceSettingSearchAdapter';
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
 *
 * El resultado preserva la jerarquía nativa: cada grupo native tab+page
 * se convierte en un padre `node_group` con hijos (definitions resolubles
 * o rows settings). Los padres son p-nodes authoritative; los hijos
 * conservan identidades estables settings/plugin.
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
/**
 * Resuelve cada item nativo en una jerarquía de filas:
 *
 * - Cada grupo native tab+page/pagePath se convierte en un padre
 *   `node_group` (p-node authoritative) con `showCaret`.
 *   Hijo label = definition.name; type/description disponibles.
 *   Identidad de padre estable: `settings:${tab}::${pagePath}::`.
 *
 * - Resolución de plugin: SOLO cuando el tab nativo es
 *   `community-plugins` o `core-plugins` Y `definition.name`
 *   coincide exactamente (case-sensitive) con UNA entry conocida.
 *   El plugin resuelto se convierte en hijo del padre native,
 *   conservando celdas (toggle/config/icon). Duplicados → settings.
 *
 * - Sin resoluble → hijo `node_settings` con texto + highlights.
 *
 * - Grupo vacío con tabNameMatch → padre sin hijos (no se inventa
 *   fila child). Grupo vacío sin tabNameMatch → ausente.
 *
 * - Dedup de plugins global: una entidad plugin solo aparece como
 *   hijo bajo su primer padre nativo; ocurrencias posteriores
 *   solo contribuyen al highlight si tienen match.
 *
 * Highlight: solo filas con matches reales (nameMatch/descMatch del
 * item, o tabNameMatch del grupo) entran en highlightIds.
 */
export function resolveSettingsBridgeNodes(
	input: SettingsBridgeInput,
): SettingsBridgeResult {
	const nodes: TreeNode<PluginMeta>[] = [];
	const highlightIds = new Set<string>();
	// Dedup global de plugins resolubles: una entidad → un hijo.
	const emittedPluginIds = new Set<string>();
	// Dedup global de settings children: una identidad → un hijo.
	const emittedSettingsIds = new Set<string>();
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

	for (const group of input.groups) {
		const results = group.results ?? [];
		const groupId = settingsBridgeGroupRowId(group.tab, group.pagePath);

		// Grupo vacío con tabNameMatch → padre sin hijos (terminal gc-node).
		if (results.length === 0) {
			if (group.tabNameMatch.length === 0) continue;
			const tabLabel =
				group.tabName !== '' ? group.tabName : group.tab;
			const ref = {
				tab: group.tab,
				page: group.page,
				pagePath: group.pagePath,
				definition: '',
			};
			nodes.push({
				id: groupId,
				label: tabLabel,
				...(group.tabIcon
					? { icon: group.tabIcon }
					: {}),
				depth: 0,
				cells: [],
				showCaret: false,
				children: [],
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
				coreCls:
					'tree-item-self nav-file-title tappable is-clickable',
			});
			highlightIds.add(groupId);
			continue;
		}

		// Construir hijos del padre native.
		const children: TreeNode<PluginMeta>[] = [];
		for (const item of results) {
			const tab = item.entry?.tab ?? '';
			const definition = item.entry?.definition ?? '';
			const isPluginTab =
				tab === 'community-plugins' || tab === 'core-plugins';
			const candidates =
				definition !== '' ? nodesByName.get(definition) : undefined;
			const uniquePlugin =
				isPluginTab && candidates?.length === 1
					? candidates[0]
					: null;

			if (uniquePlugin) {
				if (emittedPluginIds.has(uniquePlugin.meta.pluginId)) {
					if (hasRealMatch(item))
						highlightIds.add(uniquePlugin.id);
					continue;
				}
				emittedPluginIds.add(uniquePlugin.meta.pluginId);
				children.push(uniquePlugin);
				if (hasRealMatch(item))
					highlightIds.add(uniquePlugin.id);
				continue;
			}

			// Fila settings: identidad estable por tripleta nativa.
			const ref = {
				tab,
				page: item.entry?.page ?? '',
				pagePath: item.entry?.pagePath ?? '',
				definition: item.entry?.definition ?? '',
			};
			// F4: cadena definition → page → pagePath → tab; vacía = skip.
			// (Las filas tab-only con solo `tab` se conservan: el bridge
			// de búsqueda las proyecta con label = tab.)
			const label =
				ref.definition !== ''
					? ref.definition
					: ref.page !== ''
						? ref.page
						: ref.pagePath !== ''
							? ref.pagePath
							: tab;
			if (label === '') continue; // F4: Skip empty labels

			const rowId = settingsBridgeRowId(ref);
			if (emittedSettingsIds.has(rowId)) continue;
			emittedSettingsIds.add(rowId);
			const typeText =
				ref.pagePath !== ''
					? ref.pagePath
					: ref.page !== ''
						? ref.page
						: undefined;
			children.push({
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
				coreCls:
					'tree-item-self nav-file-title tappable is-clickable',
			});
			if (hasRealMatch(item)) highlightIds.add(rowId);
		}

		// Padre native (orden nativo de grupos preservado: sin re-sort;
		// el plugin matched viaja COMO HIJO y nunca se hoistea sobre su
		// sección, F3). El padre se emite aunque sus hijos se hayan
		// dedupado a otra sección (el grupo nativo sigue existiendo);
		// "sin grupos vacíos" (F4) aplica al camino de hijos de plugin,
		// no a las secciones nativas de búsqueda.
		const tabLabel =
			group.tabName !== '' ? group.tabName : group.tab;
		if (tabLabel === '') continue; // F4: padre sin label no se emite
		const ref = {
			tab: group.tab,
			page: group.page,
			pagePath: group.pagePath,
			definition: '',
		};
		nodes.push({
			id: groupId,
			label: tabLabel,
			...(group.tabIcon ? { icon: group.tabIcon } : {}),
			depth: 0,
			cells: [],
			showCaret: true,
			children,
			...(group.pageDesc !== undefined
				? { pageDesc: group.pageDesc }
				: {}),
			...(group.pageType !== undefined
				? { pageType: group.pageType }
				: {}),
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
		if (group.tabNameMatch.length > 0) {
			highlightIds.add(groupId);
		}
	}
	return { nodes, highlightIds };
}

/**
 * U130 Spec 07 + parity A2 (F2/F3/F4): catálogo de hijos `node_settings`
 * bajo un nodo de plugin (term vacío).
 *
 * - Padre: p-node (`showCaret: true` + `children`) IFF
 *   `meta.enabled === true && hasPluginSettingsTab(app, pluginId)`;
 *   de lo contrario hoja (`showCaret: false`, `children: []`).
 * - Dos niveles bajo el plugin (orden nativo, sin re-sort):
 *   nivel 1 = un `node_setting_tab` por tab distinto publicado (tabs
 *   primero, en orden nativo de primera aparición);
 *   nivel 2 = un `node_setting_page` por page distinta de ese tab
 *   (pages después, en orden nativo). Con un solo tab hay un único
 *   nodo tab con N page hijos (p. ej. vaultman: 1 tab + 21 pages live).
 * - Ids estables que EXTIENDEN `settingsBridgeGroupRowId` con sufijo
 *   `#tab` / `#page` (p. ej. `settings:vaultman::Files tooltip::#page`).
 *   El sufijo `#` nunca aparece en ids del camino de búsqueda (ni en
 *   `settingsBridgeRowId` ni en `settingsBridgeGroupRowId` ni en
 *   `plugin:<id>`), así que no hay colisión con filas de búsqueda aunque
 *   page === pagePath: misma `SettingsBridgeRef` canónica (tab, page,
 *   pagePath, definition), distinta identidad de fila por camino.
 *   `SettingsBridgeRef` sigue siendo canónico (`typeSettingsSearch.ts`).
 * - NUNCA emite la fila espejo: se omite cualquier page con
 *   `tab===pluginId && page==='' && pagePath===''`
 *   (el plugin ya existe como `node_plugin`; el hijo idéntico no debe
 *   existir). Sin pages tras el filtrado el plugin queda hoja (F4: nada
 *   de grupos vacíos en este camino).
 * - F4: se omite todo hijo cuya label quede vacía tras la cadena
 *   (page → pagePath → tab para pages; tabName → tab para tabs).
 * - Zero highlight ids para este camino (no entran en
 *   settingsSearchHighlightIds).
 */
export function resolvePluginSettingsChildren(
	app: unknown,
	pluginId: string,
	baseNode: TreeNode<PluginMeta>,
): TreeNode<PluginMeta>[] {
	// Condición conjunta: plugin activado y tiene tab de settings
	const hasSettingsTab = hasPluginSettingsTab(app as App, pluginId);
	if (!baseNode.meta?.enabled || !hasSettingsTab) {
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			} as TreeNode<PluginMeta>,
		];
	}

	// Catálogo de pages para este plugin (nativo filtrado + broaden,
	// orden nativo, ver serviceSettingSearchAdapter).
	const groups = listPluginSettingPages(app as unknown as App, pluginId);
	if (groups.length === 0) {
		// F4: sin fuente de pages el plugin queda hoja (nunca p-node vacío).
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			} as TreeNode<PluginMeta>,
		];
	}

	// Nivel 1: tabs distintos en orden nativo de primera aparición.
	// Nivel 2: pages distintas por tab en orden nativo.
	const baseDepth = baseNode.depth;
	const tabOrder: string[] = [];
	const tabNameById = new Map<string, string>();
	const pagesByTab = new Map<string, { page: string; pagePath: string }[]>();
	const seenPages = new Set<string>();
	for (const group of groups) {
		const tab = group.tab ?? '';
		if (tab === '') continue; // F4: tab sin identidad no se emite
		if (!pagesByTab.has(tab)) {
			tabOrder.push(tab);
			pagesByTab.set(tab, []);
			const tabName = group.tabName !== '' ? group.tabName : tab;
			tabNameById.set(tab, tabName);
		}
		const page = group.page ?? '';
		const pagePath = group.pagePath ?? '';
		// Espejo: page idéntica al plugin (tab===pluginId sin page ni
		// path) no se emite como page; el tab ya representa esa entrada.
		if (tab === pluginId && page === '' && pagePath === '') continue;
		const pageKey = `${tab}::${pagePath || page}`;
		if (seenPages.has(pageKey)) continue;
		seenPages.add(pageKey);
		// F4: label vacía tras la cadena page → pagePath → tab: no se emite.
		const pageLabel = page !== '' ? page : pagePath !== '' ? pagePath : tab;
		if (pageLabel === '') continue;
		pagesByTab.get(tab)?.push({ page, pagePath });
	}

	// Tabs sin label visible no se emiten (F4: nada de grupos vacíos).
	const tabNodes: TreeNode<PluginMeta>[] = [];
	for (const tab of tabOrder) {
		const pages = pagesByTab.get(tab) ?? [];
		if (pages.length === 0) continue; // F4: tab sin pages = ausente
		const tabLabel = tabNameById.get(tab) ?? tab;
		if (tabLabel === '') continue;
		const tabRef = { tab, page: '', pagePath: '', definition: '' };
		const pageNodes: TreeNode<PluginMeta>[] = [];
		for (const { page, pagePath } of pages) {
			const pageLabel =
				page !== '' ? page : pagePath !== '' ? pagePath : tab;
			if (pageLabel === '') continue;
			const pageRef = { tab, page, pagePath, definition: '' };
			pageNodes.push({
				id: `${settingsBridgeGroupRowId(tab, pagePath || page)}#page`,
				label: pageLabel,
				...(pagePath !== ''
					? { typeText: pagePath }
					: page !== ''
						? { typeText: page }
						: {}),
				depth: baseDepth + 2,
				cells: [],
				showCaret: false,
				children: [],
				meta: withSettingsRef(
					{
						pluginId: '',
						name: pageLabel,
						enabled: false,
						loaded: false,
						isVaultman: false,
					},
					pageRef,
				),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			});
		}
		if (pageNodes.length === 0) continue; // F4: sin pages no hay tab
		tabNodes.push({
			id: `${settingsBridgeGroupRowId(tab, '')}#tab`,
			label: tabLabel,
			depth: baseDepth + 1,
			cells: [],
			showCaret: true,
			children: pageNodes,
			meta: withSettingsRef(
				{
					pluginId: '',
					name: tabLabel,
					enabled: false,
					loaded: false,
					isVaultman: false,
				},
				tabRef,
			),
			coreCls: 'tree-item-self nav-file-title tappable is-clickable',
		});
	}

	// F4: sin hijos tras el filtrado el plugin queda hoja.
	if (tabNodes.length === 0) {
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			} as TreeNode<PluginMeta>,
		];
	}

	// El padre se mantiene con showCaret: true y los tabs como hijos.
	return [
		{
			...baseNode,
			showCaret: true,
			children: tabNodes,
		} as TreeNode<PluginMeta>,
	];
}
