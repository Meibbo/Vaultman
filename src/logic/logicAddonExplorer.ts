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
	settingsBridgeGroupRowId,
	withSettingsRef,
} from '../types/typeSettingsSearch';
import {
	listPluginSettingPages,
} from '../services/serviceSettingSearchAdapter';
import type { InteractionMode } from './logicInteractionMode';
import type { GroupPreset } from '../types/typeGroupPreset';
import { nativeSettingsTabId } from './logicSettingSceneActivation';
import { discoverCorePlugins } from './logicCorePluginDiscovery';

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

export function canonicalPluginId(id: string): string {
	return id.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

const NATIVE_PLUGIN_SECTIONS = {
	'core-plugins': {
		id: 'group:core-plugins',
		label: 'Core plugins',
	},
	'community-plugins': {
		id: 'group:community-plugins',
		label: 'Community plugins',
	},
} as const;

const GLOBAL_SETTINGS_SECTION = {
	id: 'group:global-settings',
	label: 'Global settings',
} as const;

function nativePluginSection(tab: string) {
	if (tab === 'core-plugins' || tab === 'plugins') return NATIVE_PLUGIN_SECTIONS['core-plugins'];
	if (tab === 'community-plugins')
		return NATIVE_PLUGIN_SECTIONS['community-plugins'];
	return null;
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
 * - Si el tab no resuelve (caso real: `community-plugins`),
 *   `definition.name` canonicalizado a espacio de ids (F10:
 *   `canonicalPluginId`) idéntico al `pluginId` canonicalizado de UNA
 *   entry conocida = la MISMA fila legacy. Cero o dos+ candidatas
 *   con ese id canónico = fila `node_settings`, nunca adivinar.
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
 * - Resolución de plugin: PRIMERO self-tab (§1 MECH): `group.tab` o
 *   `entry.tab` estrictamente igual a un pluginId conocido = la fila
 *   legacy `node_plugin` (padre del grupo, o hija si el tab es de otro
 *   grupo). SEGUNDO la regla community/core + nombre único (abajo).
 *   Plugins con grupo self-tab propio son "parent-owned": nunca una
 *   segunda fila en otro grupo (solo highlight). Tabs desconocidos =
 *   fila nativa de grupo actual.
 *
 * - Resolución de plugin (segundo resolver, F10): SOLO cuando el tab
 *   nativo es `community-plugins` o `core-plugins` Y `definition.name`
 *   canonicalizado (`canonicalPluginId`: trim + lowercase + runs de
 *   espacio/`_` → `-`) coincide con el `pluginId` canonicalizado de
 *   UNA entry conocida. Comparación en espacio de ids — nunca contra
 *   `meta.name` (display renombrable/duplicable). Cero o dos+
 *   candidatas = fila `node_settings`, nunca adivinar.
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
	// Native plugin sections may arrive split across multiple pages. They
	// share one canonical group identity and absorb all matching children.
	const nativeSectionParents = new Map<string, TreeNode<PluginMeta>>();
	// F10: resolución por id canónico, NUNCA por display name. Índice
	// `canonicalPluginId(pluginId)` → filas legacy. Los ids de plugin
	// son únicos por construcción, así que la ambigüedad por display
	// name duplicado desaparece; se conserva el guard de unicidad por
	// seguridad (cero o dos+ candidatas = fila `node_settings`).
	const nodesByCanonicalId = new Map<string, TreeNode<PluginMeta>[]>();
	for (const node of input.pluginNodesById.values()) {
		const key = canonicalPluginId(node.meta.pluginId);
		const list = nodesByCanonicalId.get(key);
		if (list) list.push(node);
		else nodesByCanonicalId.set(key, [node]);
	}
	const hasRealMatch = (item: {
		readonly nameMatch: readonly unknown[];
		readonly descMatch: readonly unknown[];
	}): boolean => item.nameMatch.length > 0 || item.descMatch.length > 0;
	/**
	 * U130 parity MECH §1: self-tab interception (systematic). En 1.13.7
	 * cada plugin posee su tab (`tabId === pluginId`), así que un grupo
	 * (o item) nativo con `tab` estrictamente igual a un pluginId CONOCIDO
	 * (igualdad exacta, case-sensitive, vía `Map.get` sobre
	 * `pluginNodesById`) resuelve a la fila legacy `node_plugin` (misma
	 * identidad `plugin:<id>`, CON toggle/config/icon cells) como padre
	 * del grupo en modo búsqueda, con los hijos nativos page/definition
	 * debajo. Pre-scan de propiedad: los plugins con al menos un grupo
	 * emisible (con resultados, o vacío con `tabNameMatch`) son
	 * "parent-owned": sus ocurrencias en otros grupos no emiten una
	 * segunda fila (solo aportan highlight al padre), así cada identidad
	 * plugin aparece UNA vez. Ids de tab desconocidos/obsoletos conservan
	 * la fila nativa de grupo actual.
	 */
	const selfTabOwned = new Set<string>();
	for (const group of input.groups) {
		if (!input.pluginNodesById.has(group.tab)) continue;
		if ((group.results ?? []).length > 0 || group.tabNameMatch.length > 0) {
			selfTabOwned.add(group.tab);
		}
	}
	// Padres self-tab ya emitidos (pluginId → pluginNode), para fusionar los
	// grupos repetidos del mismo tab (p. ej. `search("vaultman")` trae un
	// grupo page-null + N grupos page-X con el mismo tab).
	const selfTabPluginParents = new Map<string, TreeNode<PluginMeta>>();
	// Nodos de tab bajo cada plugin self-tab (pluginId → tabNode), para
	// agregar pages/definitions al tab correcto.
	const selfTabTabNodes = new Map<string, TreeNode<PluginMeta>>();

	for (const group of input.groups) {
		const results = group.results ?? [];
		const pluginSection = nativePluginSection(group.tab);
		const selfPlugin = input.pluginNodesById.get(group.tab) ?? null;
		const nativeSection = selfPlugin ? null : (pluginSection ?? (group.tab !== '' ? GLOBAL_SETTINGS_SECTION : null));
		const groupId =
			nativeSection?.id ??
			settingsBridgeGroupRowId(group.tab, group.pagePath);
		// Resolver §1 (padre): tab conocido = fila legacy como padre.

		// Grupo vacío con tabNameMatch → padre sin hijos (terminal gc-node).
		if (results.length === 0) {
			if (group.tabNameMatch.length === 0) continue;
			if (nativeSection) {
				const existing = nativeSectionParents.get(nativeSection.id);
				if (!existing) {
					const parent = {
					...canonicalGroupRoot(nativeSection.id, nativeSection.label, []),
					showCaret: false,
					...(group.tabIcon ? { icon: group.tabIcon } : {}),
					};
					nativeSectionParents.set(nativeSection.id, parent);
					nodes.push(parent);
				}
				highlightIds.add(nativeSection.id);
				continue;
			}
			if (selfPlugin) {
				// Self-tab vacío: aseguramos que el plugin exista como padre
				// con un tab hijo (aunque sin páginas). El tab es un contenedor
				// que permite mantener la jerarquía plugin → tab → page.
				let pluginParent = selfTabPluginParents.get(group.tab);
				let tabNode = selfTabTabNodes.get(group.tab);
				if (!pluginParent) {
					// Primera vez que vemos este self-tab: crear plugin + tab
					tabNode = {
						id: `${settingsBridgeGroupRowId(group.tab, group.pagePath)}#tab`,
						label: group.tabName !== '' ? group.tabName : group.tab,
						depth: 1,
						cells: [],
						showCaret: false,
						children: [],
						meta: withSettingsRef(
							{
								pluginId: '',
								name: group.tabName !== '' ? group.tabName : group.tab,
								enabled: false,
								loaded: false,
								isVaultman: false,
							},
							{ tab: group.tab, page: '', pagePath: '', definition: '' },
						),
						coreCls: 'tree-item-self nav-file-title tappable is-clickable',
					};
					pluginParent = {
						...selfPlugin,
						depth: 0,
						showCaret: true,
						children: [tabNode],
					};
					selfTabPluginParents.set(group.tab, pluginParent);
					selfTabTabNodes.set(group.tab, tabNode);
					emittedPluginIds.add(selfPlugin.meta.pluginId);
					nodes.push(pluginParent);
				} else if (!tabNode) {
					// Plugin ya existía pero sin tab (raro, pero por seguridad)
					tabNode = {
						id: `${settingsBridgeGroupRowId(group.tab, group.pagePath)}#tab`,
						label: group.tabName !== '' ? group.tabName : group.tab,
						depth: 1,
						cells: [],
						showCaret: false,
						children: [],
						meta: withSettingsRef(
							{
								pluginId: '',
								name: group.tabName !== '' ? group.tabName : group.tab,
								enabled: false,
								loaded: false,
								isVaultman: false,
							},
							{ tab: group.tab, page: '', pagePath: '', definition: '' },
						),
						coreCls: 'tree-item-self nav-file-title tappable is-clickable',
					};
					pluginParent.children = [...(pluginParent.children ?? []), tabNode];
					selfTabTabNodes.set(group.tab, tabNode);
				}
				if (group.tabNameMatch.length > 0) {
					highlightIds.add(tabNode.id);
					highlightIds.add(pluginParent.id);
				}
				continue;
			}
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
			const itemPluginSection = nativePluginSection(tab);
			// Resolver §1 (item): `entry.tab` conocido y DISTINTO del tab
			// del grupo = la fila legacy como hija (con celdas). Cuando
			// coincide con el padre self-tab, el item pertenece al padre
			// y cae a fila settings (definition) — nunca un duplicado.
			const selfTabEntry = input.pluginNodesById.get(tab) ?? null;
			if (selfTabEntry && !(selfPlugin !== null && tab === group.tab)) {
				const entryId = selfTabEntry.meta.pluginId;
				if (emittedPluginIds.has(entryId)) {
					if (hasRealMatch(item)) highlightIds.add(selfTabEntry.id);
					continue;
				}
				if (selfTabOwned.has(tab)) {
					// El padre self-tab (anterior o posterior: mismo id
					// estable `plugin:<id>`) posee la identidad; aquí solo
					// highlight, sin segunda fila.
					if (hasRealMatch(item)) highlightIds.add(selfTabEntry.id);
					continue;
				}
				emittedPluginIds.add(entryId);
				children.push(selfTabEntry);
				if (hasRealMatch(item)) highlightIds.add(selfTabEntry.id);
				continue;
			}

			// Native plugin sections prefer an exact canonical entity id. The
			// resulting row is the existing `node_plugin`, never a settings copy.
			const exactPlugin =
				itemPluginSection && definition !== ''
					? (input.pluginNodesById.get(definition) ?? null)
					: null;
			// TODO(U130 canonical-id): NativeSettingsSearchEntry currently exposes
			// no plugin-id sidecar for aggregate core/community rows. Keep the
			// established definition fallback until the adapter can supply that id;
			// do not compare against mutable `meta.name` display values.
			const candidates =
				itemPluginSection && definition !== ''
					? nodesByCanonicalId.get(canonicalPluginId(definition))
					: undefined;
			const uniquePlugin =
				exactPlugin ?? (candidates?.length === 1 ? candidates[0] : null);

			if (uniquePlugin) {
				if (emittedPluginIds.has(uniquePlugin.meta.pluginId)) {
					if (hasRealMatch(item))
						highlightIds.add(uniquePlugin.id);
					continue;
				}
				if (selfTabOwned.has(uniquePlugin.meta.pluginId)) {
					// Resolver §2 supeditado al §1: el plugin ya tiene
					// padre self-tab propio; no adivinar una segunda fila.
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
		// Padre self-tab (§1): el plugin legacy `node_plugin` (misma
		// identidad `plugin:<id>`, CON celdas) es el padre de nivel superior.
		// Debajo va un nodo `node_setting_tab` (nivel 1) que contiene
		// los hijos nativos page/definition (nivel 2). Esto preserva
		// SIEMPRE la jerarquía plugin → tab → page. Grupos repetidos
		// del mismo tab fusionan sus hijos en el mismo tabNode.
		if (selfPlugin) {
			let pluginParent = selfTabPluginParents.get(group.tab);
			let tabNode = selfTabTabNodes.get(group.tab);
			// Canónica 2026-09-25 (absorción, cero duplicados): tab
			// homónimo (label nativo igual al nombre del plugin) NO se
			// emite como fila; los hijos cuelgan directos del plugin.
			const selfTabLabel =
				group.tabName !== '' ? group.tabName : group.tab;
			const selfPluginName = (selfPlugin.meta?.name ?? '').trim().toLowerCase();
			const selfHomonym =
				selfTabLabel.trim().toLowerCase() !== '' &&
				selfTabLabel.trim().toLowerCase() === selfPluginName;
			if (selfHomonym) {
				const direct = children.map((child) => ({ ...child, depth: 1 }));
				if (!pluginParent) {
					pluginParent = {
						...selfPlugin,
						depth: 0,
						showCaret: direct.length > 0,
						children: direct,
					};
					selfTabPluginParents.set(group.tab, pluginParent);
					emittedPluginIds.add(selfPlugin.meta.pluginId);
					nodes.push(pluginParent);
				} else {
					pluginParent.children = [
						...(pluginParent.children ?? []),
						...direct,
					];
					pluginParent.showCaret =
						(pluginParent.children?.length ?? 0) > 0;
				}
				if (group.tabNameMatch.length > 0) {
					highlightIds.add(pluginParent.id);
				}
				continue;
			}
			if (!pluginParent) {
				// Primera vez que vemos este self-tab: crear plugin + tab
				tabNode = {
					id: `${settingsBridgeGroupRowId(group.tab, group.pagePath)}#tab`,
					label: group.tabName !== '' ? group.tabName : group.tab,
					depth: 1,
					cells: [],
					showCaret: children.length > 0,
					children,
					...(group.tabIcon ? { icon: group.tabIcon } : {}),
					...(group.pageDesc !== undefined ? { pageDesc: group.pageDesc } : {}),
					...(group.pageType !== undefined ? { pageType: group.pageType } : {}),
					meta: withSettingsRef(
						{
							pluginId: '',
							name: group.tabName !== '' ? group.tabName : group.tab,
							enabled: false,
							loaded: false,
							isVaultman: false,
						},
						{ tab: group.tab, page: group.page, pagePath: group.pagePath, definition: '' },
					),
					coreCls: 'tree-item-self nav-file-title tappable is-clickable',
				};
				pluginParent = {
					...selfPlugin,
					depth: 0,
					showCaret: true,
					children: [tabNode],
				};
				selfTabPluginParents.set(group.tab, pluginParent);
				selfTabTabNodes.set(group.tab, tabNode);
				emittedPluginIds.add(selfPlugin.meta.pluginId);
				nodes.push(pluginParent);
			} else {
				// Plugin ya existe: fusionar hijos en el tabNode existente
				if (!tabNode) {
					// Plugin existía pero sin tabNode (caso edge: grupo vacío previo)
					tabNode = {
						id: `${settingsBridgeGroupRowId(group.tab, group.pagePath)}#tab`,
						label: group.tabName !== '' ? group.tabName : group.tab,
						depth: 1,
						cells: [],
						showCaret: children.length > 0,
						children,
						...(group.tabIcon ? { icon: group.tabIcon } : {}),
						...(group.pageDesc !== undefined ? { pageDesc: group.pageDesc } : {}),
						...(group.pageType !== undefined ? { pageType: group.pageType } : {}),
						meta: withSettingsRef(
							{
								pluginId: '',
								name: group.tabName !== '' ? group.tabName : group.tab,
								enabled: false,
								loaded: false,
								isVaultman: false,
							},
							{ tab: group.tab, page: group.page, pagePath: group.pagePath, definition: '' },
						),
						coreCls: 'tree-item-self nav-file-title tappable is-clickable',
					};
					pluginParent.children = [...(pluginParent.children ?? []), tabNode];
					selfTabTabNodes.set(group.tab, tabNode);
				} else {
					// Agregar hijos al tabNode existente
					for (const child of children) {
						(tabNode.children ?? []).push(child);
					}
					tabNode.showCaret = (tabNode.children?.length ?? 0) > 0;
				}
			}
			if (group.tabNameMatch.length > 0) {
				highlightIds.add(tabNode.id);
				highlightIds.add(pluginParent.id);
			}
			continue;
		}

		if (nativeSection) {
			const sectionChildren = children.map((child) => ({ ...child, depth: 1 }));
			const existing = nativeSectionParents.get(nativeSection.id);
			if (existing) {
				existing.children = [...(existing.children ?? []), ...sectionChildren];
				existing.showCaret = existing.children.length > 0;
			} else {
				const parent = {
					...canonicalGroupRoot(
						nativeSection.id,
						nativeSection.label,
						sectionChildren,
					),
					...(group.tabIcon ? { icon: group.tabIcon } : {}),
				};
				nativeSectionParents.set(nativeSection.id, parent);
				nodes.push(parent);
			}
			if (group.tabNameMatch.length > 0) {
				highlightIds.add(nativeSection.id);
			}
			continue;
		}

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
 * U130 Spec 07 + parity A2 (F2/F3/F4) + forma canónica 2026-09-25:
 * catálogo de hijos bajo un nodo de plugin (term vacío).
 *
 * - Padre: p-node (`showCaret: true` + `children`) IFF
 *   `meta.enabled === true` y el nativo publica contenido para el plugin
 *   (`listPluginSettingPages` no vacío: vía declarativa `pluginTabs` o
 *   fallback de búsqueda nativa filtrada por `tab === pluginId`); de lo
 *   contrario hoja (`showCaret: false`, `children: []`).
 * - Dos niveles bajo el plugin (orden nativo, sin re-sort):
 *   nivel 1 = un `node_setting_tab` por tab distinto publicado (tabs
 *   primero, en orden nativo de primera aparición);
 *   nivel 2 = un `node_setting_page` por page distinta de ese tab
 *   (pages después, en orden nativo).
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
 * - U130 F9 (regla `page:''`): el contenedor `page:''` (grupo sin
 *   page ni pagePath) NUNCA se emite como page hija, para ningún tab.
 *   Sus definiciones no vacías se cosechan como hijas directas del tab
 *   con `settingsBridgeRowId` (tras las pages, orden nativo). Sin pages
 *   NI definiciones el plugin queda hoja (F4: nada de grupos vacíos).
 * - U130 F10 REVOCADA 2026-09-25 (forma canónica): los core-plugins se
 *   proyectan DIFERENCIADOS como cualquier plugin. La puerta ya no exige
 *   entrada en `app.setting.pluginTabs`: basta `meta.enabled === true` +
 *   contenido nativo (el fallback de `listPluginSettingPages` cubre los
 *   tabs core vía búsqueda nativa). Sin contenido el nodo queda hoja
 *   (F4), pero nunca por ser core.
 * - U130 forma canónica 2026-09-25 (revisión de F8): NINGÚN nodo repite
 *   el nombre de su plugin padre. Todo tab homónimo (label nativo igual
 *   al nombre del plugin: comparación trim + case-insensitive, p. ej.
 *   plugin `Vaultman` / tab `Vaultman`) NO se emite como fila: sus
 *   pages/definitions cuelgan DIRECTAS del plugin en `baseDepth + 1`.
 *   El tab existe como identidad (cada hijo lleva su `tab` en el ref)
 *   pero no como fila duplicada. Con tab distinto o multi-tab la
 *   nivelación `plugin → tab → page` se conserva intacta
 *   (tabs en `baseDepth + 1`, pages/definitions en `baseDepth + 2`).
 *   Ids/refs intactos (`#tab` / `#page`).
 * - Tab = nombre nativo del tab SIEMPRE (`tabName` nativo, fallback id);
 *   page = nombre nativo (`page`, fallback `pagePath`, fallback tab).
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
	// Puerta canónica 2026-09-25: solo el estado habilitado. La exigencia
	// de entrada en `pluginTabs` (prohibición F10) queda revocada: los
	// core-plugins resuelven por el fallback nativo de
	// `listPluginSettingPages` igual que los community.
	if (!baseNode.meta?.enabled) {
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			},
		];
	}

	// Catálogo de pages para este plugin (nativo filtrado + broaden,
	// orden nativo, ver serviceSettingSearchAdapter).
	const groups = listPluginSettingPages(app, pluginId);
	if (groups.length === 0) {
		// F4: sin fuente de pages el plugin queda hoja (nunca p-node vacío).
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			},
		];
	}

	interface PageBuilder {
		name: string;
		page: string;
		pagePath: string;
		definitions: string[];
		subpages: Map<string, PageBuilder>;
	}

	function buildPageTreeNode(
		tab: string,
		builder: PageBuilder,
		depth: number,
	): TreeNode<PluginMeta> {
		const subpageNodes: TreeNode<PluginMeta>[] = [];
		for (const sub of builder.subpages.values()) {
			subpageNodes.push(buildPageTreeNode(tab, sub, depth + 1));
		}
		const defNodes: TreeNode<PluginMeta>[] = [];
		for (const def of builder.definitions) {
			const defRef = {
				tab,
				page: builder.page,
				pagePath: builder.pagePath,
				definition: def,
			};
			defNodes.push({
				id: settingsBridgeRowId(defRef),
				label: def,
				depth: depth + 1,
				cells: [],
				showCaret: false,
				children: [],
				meta: withSettingsRef(
					{
						pluginId: '',
						name: def,
						enabled: false,
						loaded: false,
						isVaultman: false,
					},
					defRef,
				),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			});
		}
		const allKids = [...subpageNodes, ...defNodes];
		const pageRef = {
			tab,
			page: builder.page,
			pagePath: builder.pagePath,
			definition: '',
		};
		return {
			id: `${settingsBridgeGroupRowId(tab, builder.pagePath || builder.page)}#page`,
			label: builder.name,
			...(builder.pagePath !== ''
				? { typeText: builder.pagePath }
				: builder.page !== ''
					? { typeText: builder.page }
					: {}),
			depth,
			cells: [],
			showCaret: allKids.length > 0,
			children: allKids,
			meta: withSettingsRef(
				{
					pluginId: '',
					name: builder.name,
					enabled: false,
					loaded: false,
					isVaultman: false,
				},
				pageRef,
			),
			coreCls: 'tree-item-self nav-file-title tappable is-clickable',
		};
	}

	const baseDepth = baseNode.depth;
	const tabOrder: string[] = [];
	const tabNameById = new Map<string, string>();
	const tabIconById = new Map<string, string>();
	const rootPagesByTab = new Map<string, Map<string, PageBuilder>>();
	const rootDefsByTab = new Map<string, string[]>();
	const seenDefs = new Set<string>();

	for (const group of groups) {
		const tab = group.tab ?? '';
		if (tab === '') continue; // F4: tab sin identidad no se emite
		if (!rootPagesByTab.has(tab)) {
			tabOrder.push(tab);
			rootPagesByTab.set(tab, new Map());
			rootDefsByTab.set(tab, []);
			const tabName = group.tabName !== '' ? group.tabName : tab;
			tabNameById.set(tab, tabName);
			if (group.tabIcon) tabIconById.set(tab, group.tabIcon);
		}

		const rawPath = (group.pagePath ?? '').trim();
		const rawPage = (group.page ?? '').trim();
		const segments: string[] = rawPath !== ''
			? rawPath.split(' > ').map((s) => s.trim()).filter((s) => s !== '')
			: rawPage !== ''
				? [rawPage]
				: [];

		if (segments.length === 0) {
			for (const item of group.results ?? []) {
				const def = item.entry?.definition ?? '';
				if (def === '') continue; // F4: definition vacía no se emite
				const defKey = `${tab}::::${def}`;
				if (seenDefs.has(defKey)) continue;
				seenDefs.add(defKey);
				rootDefsByTab.get(tab)?.push(def);
			}
			continue;
		}

		let pageMap = rootPagesByTab.get(tab)!;
		let targetBuilder: PageBuilder | null = null;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const partialPath = segments.slice(0, i + 1).join(' > ');
			let builder = pageMap.get(seg);
			if (!builder) {
				builder = {
					name: seg,
					page: seg,
					pagePath: partialPath,
					definitions: [],
					subpages: new Map(),
				};
				pageMap.set(seg, builder);
			}
			targetBuilder = builder;
			pageMap = builder.subpages;
		}

		if (targetBuilder) {
			for (const item of group.results ?? []) {
				const def = item.entry?.definition ?? '';
				if (def === '') continue;
				const defKey = `${tab}::${targetBuilder.pagePath}::${def}`;
				if (seenDefs.has(defKey)) continue;
				seenDefs.add(defKey);
				targetBuilder.definitions.push(def);
			}
		}
	}

	const pluginName = (baseNode.meta?.name ?? '').trim().toLowerCase();
	const childNodes: TreeNode<PluginMeta>[] = [];
	for (const tab of tabOrder) {
		const rootPageMap = rootPagesByTab.get(tab) ?? new Map();
		const rootDefs = rootDefsByTab.get(tab) ?? [];
		if (rootPageMap.size === 0 && rootDefs.length === 0) continue; // F4: tab sin contenido = ausente
		const tabLabel = tabNameById.get(tab) ?? tab;
		if (tabLabel === '') continue;

		const homonymLabel = tabNameById.get(tab) ?? tab;
		const isHomonym =
			homonymLabel.trim().toLowerCase() !== '' &&
			homonymLabel.trim().toLowerCase() === pluginName;

		const targetDepth = isHomonym ? baseDepth + 1 : baseDepth + 2;

		const pageNodes: TreeNode<PluginMeta>[] = [];
		for (const rootPage of rootPageMap.values()) {
			pageNodes.push(buildPageTreeNode(tab, rootPage, targetDepth));
		}

		const defNodes: TreeNode<PluginMeta>[] = [];
		for (const def of rootDefs) {
			const defRef = { tab, page: '', pagePath: '', definition: def };
			defNodes.push({
				id: settingsBridgeRowId(defRef),
				label: def,
				depth: targetDepth,
				cells: [],
				showCaret: false,
				children: [],
				meta: withSettingsRef(
					{
						pluginId: '',
						name: def,
						enabled: false,
						loaded: false,
						isVaultman: false,
					},
					defRef,
				),
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			});
		}

		if (pageNodes.length === 0 && defNodes.length === 0) continue; // F4: sin contenido no hay tab

		if (isHomonym) {
			for (const n of [...pageNodes, ...defNodes]) {
				childNodes.push(n);
			}
			continue;
		}

		const tabRef = { tab, page: '', pagePath: '', definition: '' };
		childNodes.push({
			id: `${settingsBridgeGroupRowId(tab, '')}#tab`,
			label: tabLabel,
			...(tabIconById.get(tab) ? { icon: tabIconById.get(tab) } : {}),
			depth: baseDepth + 1,
			cells: [],
			showCaret: true,
			children: [...pageNodes, ...defNodes],
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
	if (childNodes.length === 0) {
		return [
			{
				...baseNode,
				showCaret: false,
				children: [],
			},
		];
	}

	// El padre se mantiene con showCaret: true y los hijos canónicos
	// (tabs en baseDepth + 1, pages/definitions en baseDepth + 2).
	return [
		{
			...baseNode,
			showCaret: true,
			children: childNodes,
		},
	];
}

/**
 * U130 forma canónica 2026-09-25: partición core/community en reposo.
 *
 * MISMO criterio que la búsqueda (F10): por id canónico
 * (`canonicalPluginId`: trim + lowercase + runs de espacio/`_` → `-`),
 * NUNCA por display name (renombrable/duplicable). `communityIds` son
 * los ids de plugin community conocidos (p. ej. los manifests
 * listados); todo tab nativo fuera de ese conjunto es core.
 */
export type CanonicalPluginGroup = 'core' | 'community';

export function pluginCanonicalGroup(
	pluginId: string,
	communityIds: Iterable<string>,
): CanonicalPluginGroup {
	const key = canonicalPluginId(pluginId);
	for (const id of communityIds) {
		if (canonicalPluginId(id) === key) return 'community';
	}
	return 'core';
}

export interface CorePluginStub {
	pluginId: string;
	name: string;
	enabled: boolean;
}

/**
 * Core membership/state comes from app.internalPlugins, including plugins
 * without settings tabs. Native tab labels take precedence where available;
 * community IDs remain excluded. Settings children still require native pages.
 */
export function listCorePluginStubs(
	app: unknown,
	communityIds: Iterable<string>,
): CorePluginStub[] {
	const community = new Set([...communityIds].map(canonicalPluginId));
	const seen = new Set<string>();
	return discoverCorePlugins(app).filter((stub) => {
		const key = canonicalPluginId(stub.pluginId);
		if (seen.has(key) || community.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export interface CanonicalRestRootsInput {
	app: unknown;
	/**
	 * Filas `node_plugin` ya construidas (mismas celdas/acciones del
	 * listado, community + stubs core), en orden de sort ya aplicado.
	 */
	pluginNodes: readonly TreeNode<PluginMeta>[];
	/** Ids de plugin community conocidos (criterio F10: por id). */
	communityIds: Iterable<string>;
	/**
	 * U130-C1 (Defecto 1): el preset de agrupación activo. Con preset
	 * presente la salida es PLANA (depth 0, sin cabeceras `group:*`):
	 * la agrupación la gobierna `projectGroupedTree` (preset
	 * `sections`), no esta función. Ausente = forma canónica legacy
	 * agrupada core/community (compat con llamadores no migrados).
	 */
	groupPreset?: GroupPreset;
}

/**
 * Ajustes generales de Obsidian: tabs nativos que no pertenecen a ningún
 * plugin. Se proyectan como filas `node_settings` (`pluginId: ''`).
 */
export const GLOBAL_SETTINGS_TAB_IDS: readonly string[] = [
	'general',
	'appearance',
	'interface',
	'editor',
	'files and links',
	'keychain',
	'hotkeys',
	'plugins',
	'community-plugins',
];

/** Identidad canónica del grupo de primer orden de ajustes globales. */
export const GLOBAL_SETTINGS_GROUP_ID = 'group:global-settings';

/** Etiqueta del grupo de primer orden de ajustes globales. */
export const GLOBAL_SETTINGS_GROUP_LABEL = 'Global settings';

const GLOBAL_SETTINGS_FALLBACK_LABELS: Readonly<Record<string, string>> = {
	general: 'General',
	appearance: 'Appearance',
	interface: 'Interface',
	editor: 'Editor',
	'files and links': 'Files and links',
	keychain: 'Keychain',
	hotkeys: 'Hotkeys',
	plugins: 'Core plugins',
	'community-plugins': 'Community plugins',
};

const GLOBAL_SETTINGS_FALLBACK_ICONS: Readonly<Record<string, string>> = {
	general: 'lucide-circle-user',
	about: 'lucide-circle-user',
	appearance: 'lucide-palette',
	interface: 'lucide-layout',
	editor: 'lucide-edit',
	'files and links': 'lucide-folder-cog',
	file: 'lucide-folder-cog',
	keychain: 'lucide-key',
	hotkeys: 'lucide-keyboard',
	plugins: 'lucide-toy-brick',
	'core-plugins': 'lucide-toy-brick',
	'community-plugins': 'lucide-puzzle',
};

export function isGlobalSettingsTab(tab: string): boolean {
	const key = (tab ?? '').trim().toLowerCase();
	return GLOBAL_SETTINGS_TAB_IDS.some((id) => id === key);
}

interface RuntimeSettingTabEntry {
	id?: unknown;
	name?: unknown;
	icon?: unknown;
}

function nativeTabEntries(app: unknown): RuntimeSettingTabEntry[] {
	if (typeof app !== 'object' || app === null) return [];
	const setting = (app as { setting?: unknown }).setting;
	if (typeof setting !== 'object' || setting === null) return [];
	const record = setting as Record<string, unknown>;
	const entries: RuntimeSettingTabEntry[] = [];
	for (const key of ['settingTabs', 'pluginTabs']) {
		const rawTabs = record[key];
		if (Array.isArray(rawTabs)) {
			entries.push(...(rawTabs as RuntimeSettingTabEntry[]));
		} else if (typeof rawTabs === 'object' && rawTabs !== null) {
			for (const [id, raw] of Object.entries(
				rawTabs as Record<string, RuntimeSettingTabEntry>,
			)) {
				entries.push({ ...raw, id: raw?.id ?? id });
			}
		}
	}
	return entries;
}

function normalizeTabIcon(icon?: string): string | undefined {
	if (!icon) return undefined;
	return icon.startsWith('lucide-') ? icon : `lucide-${icon}`;
}

function nativeTabInfo(
	app: unknown,
	tabId: string,
): { name?: string; icon?: string } | null {
	const targetId = nativeSettingsTabId(tabId);
	for (const entry of nativeTabEntries(app)) {
		if (entry?.id !== tabId && entry?.id !== targetId) continue;
		return {
			...(typeof entry.name === 'string' && entry.name !== ''
				? { name: entry.name }
				: {}),
			...(typeof entry.icon === 'string' && entry.icon !== ''
				? { icon: normalizeTabIcon(entry.icon) }
				: {}),
		};
	}
	return null;
}

/**
 * Filas `node_settings` de profundidad 0 para los ajustes globales que no
 * son plugins. Omite los ids que colisionan con plugins conocidos
 * (community o stubs core ya listados): un tab con identidad de plugin
 * se proyecta como `node_plugin`, nunca duplicado como settings.
 */
export function buildGlobalSettingsNodes(
	app: unknown,
	communityIds: Iterable<string>,
	groupPreset?: GroupPreset,
): TreeNode<PluginMeta>[] {
	const known = new Set<string>();
	for (const id of communityIds) known.add(canonicalPluginId(id));
	const stubs = listCorePluginStubs(app, communityIds);
	for (const stub of stubs) known.add(canonicalPluginId(stub.pluginId));
	const out: TreeNode<PluginMeta>[] = [];
	for (const tabId of GLOBAL_SETTINGS_TAB_IDS) {
		if (known.has(canonicalPluginId(tabId))) continue;
		if (
			groupPreset?.kind === 'sections' &&
			(tabId === 'plugins' || tabId === 'community-plugins')
		) {
			continue;
		}
		const tabInfo = nativeTabInfo(app, tabId);
		const label =
			tabInfo?.name ?? GLOBAL_SETTINGS_FALLBACK_LABELS[tabId] ?? tabId;
		if (label === '') continue; // F4: sin label no se emite
		const targetId = nativeSettingsTabId(tabId);
		const icon =
			tabInfo?.icon ??
			GLOBAL_SETTINGS_FALLBACK_ICONS[tabId] ??
			GLOBAL_SETTINGS_FALLBACK_ICONS[targetId];
		const ref = { tab: tabId, page: '', pagePath: '', definition: '' };
		out.push({
			id: `${settingsBridgeGroupRowId(tabId, '')}#tab`,
			label,
			...(icon ? { icon } : {}),
			depth: 0,
			cells: [],
			showCaret: false,
			children: [],
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
	}
	return out;
}

function resolveRestPluginNode(
	app: unknown,
	node: TreeNode<PluginMeta>,
	depth: number,
): TreeNode<PluginMeta> | null {
	const pluginId = node.meta?.pluginId ?? '';
	if (pluginId === '') return null; // F4: sin identidad no se agrupa
	const base: TreeNode<PluginMeta> = { ...node, depth };
	const resolved = resolvePluginSettingsChildren(app, pluginId, base);
	return (
		resolved[0] ?? {
			...base,
			showCaret: false,
			children: [],
		}
	);
}

/**
 * Raíces canónicas en reposo (term vacío).
 *
 * - Sin `groupPreset` (llamadores legacy): `node_group` "Core plugins" →
 *   `node_plugin` core → tabs/pages + `node_group` "Community plugins" →
 *   `node_plugin` community → tabs/pages. Intacto para no romper la
 *   paridad reposo/búsqueda de los tests existentes.
 * - Con `groupPreset` presente (camino del explorer): árbol PLANO
 *   (depth 0, sin cabeceras `group:*`): plugins con hijos resueltos +
 *   `node_settings` globales. La agrupación (`sections`: Core /
 *   Community / Global settings) la gobierna `projectGroupedTree` vía
 *   el extractor de la scene (`_groupPresetValue`), no esta función.
 *
 * Cada plugin resuelve sus hijos con `resolvePluginSettingsChildren`
 * (nombres nativos, sin espejos, tabs homónimos hoisteados). Los grupos
 * vacíos no se emiten (F4). La búsqueda comparte parentage: sus padres
 * `plugin:<id>` son las MISMAS identidades (mismas celdas), solo filtra
 * + highlights (spec-01 ranking intacto).
 */
export function buildCanonicalRestRoots(
	input: CanonicalRestRootsInput,
): TreeNode<PluginMeta>[] {
	if (input.groupPreset) {
		const flat: TreeNode<PluginMeta>[] = [];
		for (const global of buildGlobalSettingsNodes(input.app, input.communityIds, input.groupPreset)) {
			flat.push(global);
		}
		for (const node of input.pluginNodes) {
			const withKids = resolveRestPluginNode(input.app, node, 0);
			if (withKids) flat.push(withKids);
		}
		return flat;
	}
	const coreKids: TreeNode<PluginMeta>[] = [];
	const communityKids: TreeNode<PluginMeta>[] = [];
	for (const node of input.pluginNodes) {
		const pluginId = node.meta?.pluginId ?? '';
		const withKids = resolveRestPluginNode(input.app, node, 1);
		if (!withKids) continue;
		if (pluginCanonicalGroup(pluginId, input.communityIds) === 'core') {
			coreKids.push(withKids);
		} else {
			communityKids.push(withKids);
		}
	}
	const roots: TreeNode<PluginMeta>[] = [];
	if (coreKids.length > 0) {
		const section = NATIVE_PLUGIN_SECTIONS['core-plugins'];
		roots.push(canonicalGroupRoot(section.id, section.label, coreKids));
	}
	if (communityKids.length > 0) {
		const section = NATIVE_PLUGIN_SECTIONS['community-plugins'];
		roots.push(
			canonicalGroupRoot(section.id, section.label, communityKids),
		);
	}
	return roots;
}

function canonicalGroupRoot(
	id: string,
	label: string,
	children: TreeNode<PluginMeta>[],
): TreeNode<PluginMeta> {
	return {
		id,
		label,
		depth: 0,
		cells: [],
		isGroupHeader: true,
		showCaret: true,
		children,
		meta: {
			pluginId: '',
			name: label,
			enabled: false,
			loaded: false,
			isVaultman: false,
		},
		coreCls: 'tree-item-self nav-file-title tappable is-clickable',
	};
}
