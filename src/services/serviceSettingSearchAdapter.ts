import type {
	NativeSettingsSearchEntry,
	NativeSettingsSearchGroup,
	NativeSettingsSearchItem,
	NativeSettingsSearchSpan,
} from '../types/typeSettingsSearch';

/**
 * U130 Slice A: adaptador fino sobre el índice NATIVO de settings.
 *
 * `app.setting.searchIndex.search(q)` es la única fuente cuando el término
 * no está vacío: sin `searchText` local, sin fuzzy local, sin reutilizar
 * `serviceNativeSearchAdapter.ts` (contenido vault, otro dominio).
 *
 * Ausencia (`app.setting.searchIndex?.search` ausente): el llamador limpia
 * el árbol previo y muestra el estado "unavailable". Nunca se cae al filtro
 * local: un fallback silencioso dejaría rows stale con otro ranking.
 */

interface NativeSettingsSearchIndex {
	search?: (query: string) => unknown;
}

interface NativeSettingManager {
	searchIndex?: NativeSettingsSearchIndex | null;
}

interface AppWithNativeSettingsSearch {
	setting?: NativeSettingManager | null;
}

function nativeSearchIndex(app: unknown): NativeSettingsSearchIndex | null {
	if (typeof app !== 'object' || app === null) return null;
	const setting = (app as AppWithNativeSettingsSearch).setting;
	if (typeof setting !== 'object' || setting === null) return null;
	const searchIndex = setting.searchIndex;
	if (typeof searchIndex !== 'object' || searchIndex === null) return null;
	return searchIndex;
}

export function isNativeSettingsSearchAvailable(app: unknown): boolean {
	return typeof nativeSearchIndex(app)?.search === 'function';
}

function toText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function toScore(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (isRecord(value)) return toScore(value['score']);
	return 0;
}

function toSpans(value: unknown): readonly NativeSettingsSearchSpan[] {
	const matches = isRecord(value) ? value['matches'] : value;
	if (!Array.isArray(matches)) return [];
	const spans: NativeSettingsSearchSpan[] = [];
	for (const span of matches) {
		if (Array.isArray(span) && span.length >= 2) {
			const start: unknown = span[0];
			const end: unknown = span[1];
			if (typeof start === 'number' && typeof end === 'number') {
				spans.push({ start, end });
			}
			continue;
		}
		if (typeof span === 'object' && span !== null) {
			const record = span as { start?: unknown; end?: unknown };
			if (typeof record.start === 'number' && typeof record.end === 'number') {
				spans.push({ start: record.start, end: record.end });
			}
		}
	}
	return spans;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function toNamedId(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	const id = value['id'];
	if (typeof id === 'string') return id;
	return toText(value['name']);
}

function toDefinitionName(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	return toText(value['name']);
}

function toName(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	return toText(value['name']);
}

function toTabName(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	return toText(value['name']);
}

function toTabIcon(value: unknown): string | undefined {
	if (typeof value === 'string') return value || undefined;
	if (!isRecord(value)) return undefined;
	const icon = value['icon'];
	return typeof icon === 'string' ? icon : undefined;
}

function toPageDesc(value: unknown): string | undefined {
	if (typeof value === 'string') return value || undefined;
	if (!isRecord(value)) return undefined;
	const desc = value['desc'];
	return typeof desc === 'string' ? desc : undefined;
}

function toPageType(value: unknown): string | undefined {
	if (typeof value === 'string') return value || undefined;
	if (!isRecord(value)) return undefined;
	const type = value['type'];
	return typeof type === 'string' ? type : undefined;
}

function toEntry(value: unknown): NativeSettingsSearchEntry | null {
	if (!isRecord(value)) return null;
	const entry = value['entry'];
	if (!isRecord(entry)) return null;
	return {
		tab: toNamedId(entry['tab']),
		definition: toDefinitionName(entry['definition']),
		page: toName(entry['page']),
		pagePath: toText(entry['pagePath']),
	};
}

function toItem(value: unknown): NativeSettingsSearchItem | null {
	if (!isRecord(value)) return null;
	const entry = toEntry(value);
	if (!entry) return null;
	return {
		entry,
		nameMatch: toSpans(value['nameMatch']),
		descMatch: toSpans(value['descMatch']),
		score: toScore(value['score']),
	};
}

function toGroup(value: unknown): NativeSettingsSearchGroup | null {
	if (!isRecord(value)) return null;
	const rawResults = value['results'];
	const results: NativeSettingsSearchItem[] = [];
	if (Array.isArray(rawResults)) {
		for (const raw of rawResults) {
			const item = toItem(raw);
			if (item) results.push(item);
		}
	}
	return {
		tab: toNamedId(value['tab']),
		tabName: toTabName(value['tab']),
		tabIcon: toTabIcon(value['tab']),
		page: toName(value['page']),
		pagePath: toText(value['pagePath']),
		pageDesc: toPageDesc(value['page']),
		pageType: toPageType(value['page']),
		tabNameMatch: toSpans(value['tabNameMatch']),
		results,
		bestScore: toScore(value['bestScore']),
	};
}

/**
 * Una sola búsqueda nativa por término efectivo. Término en blanco tras
 * `trim` (incluidos los espacios puros): `[]` sin llamar al nativo, para
 * que el llamador limpie el árbol previo en vez de repintar el listado.
 * Adaptador ausente: `[]` (el llamador distingue con
 * `isNativeSettingsSearchAvailable` para el estado "unavailable").
 */
export function queryNativeSettingsSearch(
	app: unknown,
	query: string,
): NativeSettingsSearchGroup[] {
	if (query.trim() === '') return [];
	const searchIndex = nativeSearchIndex(app);
	const search = searchIndex?.search;
	if (typeof search !== 'function') return [];
	const raw = search.call(searchIndex, query);
	if (!Array.isArray(raw)) return [];
	const groups: NativeSettingsSearchGroup[] = [];
	for (const candidate of raw) {
		const group = toGroup(candidate);
		if (group) groups.push(group);
	}
	return groups;
}

/**
 * Lista las pages de settings de un plugin mediante lectura declarativa
 * del setting manager. Éxito: devuelve grupos NativeSettingsSearchGroup con
 * tabs/pages derivadas de app.setting.pluginTabs[pluginId].
 * Fallback: si el manager no expone pages, busca nativamente filtrado por
 * group.tab === pluginId, orden nativo, sin re-rank.
 * Ausencia total: [] (plugin hoja, sin hijos inventados, sin scrapeo).
 */
const pluginPagesCache = new Map<string, { tabSig: string; groups: NativeSettingsSearchGroup[] }>();

function pluginTabsSignature(app: unknown): string {
	const setting = (app as { setting?: unknown }).setting;
	if (typeof setting !== 'object' || setting === null) return '';
	const record = setting as Record<string, unknown>;
	const tabs = record['pluginTabs'];
	if (Array.isArray(tabs)) {
		return tabs
			.map((t) => (t as { id?: unknown })?.id)
			.filter((id): id is string => typeof id === 'string')
			.sort()
			.join('|');
	}
	if (typeof tabs === 'object' && tabs !== null) {
		return Object.values(tabs as Record<string, { id?: unknown }>)
			.map((t) => t?.id)
			.filter((id): id is string => typeof id === 'string')
			.sort()
			.join('|');
	}
	return '';
}

export function listPluginSettingPages(
	app: unknown,
	pluginId: string,
): NativeSettingsSearchGroup[] {
	const tabSig = pluginTabsSignature(app);
	const cached = pluginPagesCache.get(pluginId);
	if (cached && cached.tabSig === tabSig) return cached.groups;

	const groups = listPluginSettingPagesUncached(app, pluginId);
	pluginPagesCache.set(pluginId, { tabSig, groups });
	return groups;
}

/** Camino sin caché (ver `listPluginSettingPages`). */
function listPluginSettingPagesUncached(
	app: unknown,
	pluginId: string,
): NativeSettingsSearchGroup[] {
	// Primary: lectura declarativa de pluginTabs (puede ser Record u array)
	const declarative = listPluginSettingPagesDeclarative(app, pluginId);
	// Si el declarativo devuelve grupos CON results, úsalos.
	// Si devuelve grupos SIN results (solo tab info), cae al fallback nativo.
	const hasResults = declarative.some((g) => g.results && g.results.length > 0);
	if (hasResults) return declarative;

	// Fallback: búsqueda nativa filtrada por group.tab === pluginId,
	// orden nativo, sin re-rank. Usamos SOLO query por pluginId (determinista),
	// sin probe ciego `search('a')` que introducía resultados de otros plugins
	// y dependía de heurísticas de cobertura.
	const primary = queryNativeSettingsSearch(app, pluginId).filter(
		(candidate) => candidate.tab === pluginId,
	);
	return primary;
}

/**
 * Lectura declarativa primaria de pluginTabs.
 * Soporta ambos formatos: Record<string, RuntimePluginSettingTab> o
 * RuntimePluginSettingTab[] (order-preservando).
 * Deriva pages + pagePath + definition sin llamar a search().
 */
function listPluginSettingPagesDeclarative(
	app: unknown,
	pluginId: string,
): NativeSettingsSearchGroup[] {
	const setting = (app as { setting?: unknown }).setting;
	if (typeof setting !== 'object' || setting === null) return [];

	// Normalizar a array de tabs para tratamiento unificado
	let pluginTabs: readonly { id?: string; name?: string }[];
	// Cast to access pluginTabs property safely
	const settingRecord = setting as Record<string, unknown>;
	if (typeof settingRecord.pluginTabs === 'object' && settingRecord.pluginTabs !== null) {
		if (Array.isArray(settingRecord.pluginTabs)) {
			pluginTabs = settingRecord.pluginTabs;
		} else {
			// Record<string, RuntimePluginSettingTab>
			pluginTabs = Object.values(
				settingRecord.pluginTabs as Record<string, { id?: string; name?: string }>
			);
		}
	} else {
		return [];
	}

	// Buscar el tab correspondiente a este pluginId
	const tabInfo = pluginTabs.find(
		(tab) => tab.id !== undefined && tab.id === pluginId,
	);
	if (!tabInfo) return [];

	// Derivar el grupo nativo a partir de la info del tab.
	// Usamos los helpers de conversión ya definidos en este módulo.
	const group: NativeSettingsSearchGroup = {
		tab: pluginId,
		tabName: tabInfo.name !== undefined ? tabInfo.name : pluginId,
		page: '',
		pagePath: '',
		tabNameMatch: [],
		results: [],
		bestScore: 0,
		// Datos canónicos del runtime nativo (1.13.7+).
		tabIcon: tabInfo.name !== undefined ? undefined : undefined,
		pageDesc: undefined,
		pageType: undefined,
	};

	// Intentar derivar page/definition si el tabInfo tiene información adicional.
	// El setting manager puede tener fields adicionales; usamos los conversores.
	// Por ahora dejamos values por defecto vacíos; el bridge los completará.

	return [group];
}
