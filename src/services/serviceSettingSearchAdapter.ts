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
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toSpans(value: unknown): readonly NativeSettingsSearchSpan[] {
	if (!Array.isArray(value)) return [];
	const spans: NativeSettingsSearchSpan[] = [];
	for (const span of value) {
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

function toEntry(value: unknown): NativeSettingsSearchEntry | null {
	if (!isRecord(value)) return null;
	const entry = value['entry'];
	if (!isRecord(entry)) return null;
	return {
		tab: toText(entry['tab']),
		definition: toText(entry['definition']),
		page: toText(entry['page']),
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
		tab: toText(value['tab']),
		page: toText(value['page']),
		pagePath: toText(value['pagePath']),
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
