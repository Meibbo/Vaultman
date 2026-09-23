import type { PluginMeta } from './typeTree';

/**
 * U130 Slice A: espejo mínimo del índice nativo de settings.
 *
 * `app.setting.searchIndex.search(q)` devuelve grupos
 * `{tab,page,pagePath,tabNameMatch,results[],bestScore}` con items
 * `{entry:{tab,definition,page,pagePath},nameMatch,descMatch,score}`.
 * `tab` llega como `{id,name}`: el adaptador parte el espejo en `tab`
 * (id, clave de la fila de tab) y `tabName` (nombre visible).
 * Solo lo declarativo indexado (`visible`/`searchable`) aparece; el
 * imperativo `display()` queda fuera del índice.
 *
 * Espejo, no extensión: estos tipos viven aquí y NO en `typeObsidian.ts`.
 */

/** Tramo resaltado sobre el texto del nombre/descripción/tab. */
export interface NativeSettingsSearchSpan {
	start: number;
	end: number;
}

export interface RawSettingsSearchTab {
	id?: unknown;
	name?: unknown;
}

export interface RawSettingsSearchPage {
	id?: unknown;
	name?: unknown;
}

export interface RawSettingsSearchDefinition {
	name?: unknown;
	desc?: unknown;
	aliases?: unknown;
	render?: unknown;
}

export interface RawSettingsSearchMatches {
	score?: unknown;
	matches?: unknown;
}

export interface RawSettingsSearchEntry {
	tab?: RawSettingsSearchTab | string;
	definition?: RawSettingsSearchDefinition | string;
	page?: RawSettingsSearchPage | string;
	pagePath?: unknown;
}

export interface RawSettingsSearchItem {
	entry?: RawSettingsSearchEntry;
	nameMatch?: RawSettingsSearchMatches | readonly unknown[];
	descMatch?: RawSettingsSearchMatches | readonly unknown[];
	score?: unknown;
}

export interface RawSettingsSearchGroup {
	tab?: RawSettingsSearchTab | string;
	page?: RawSettingsSearchPage | string;
	pagePath?: unknown;
	tabNameMatch?: RawSettingsSearchMatches | readonly unknown[];
	results?: readonly RawSettingsSearchItem[];
	bestScore?: unknown;
}

export interface NativeSettingsSearchEntry {
	tab: string;
	definition: string;
	page: string;
	pagePath: string;
}

export interface NativeSettingsSearchItem {
	entry: NativeSettingsSearchEntry;
	nameMatch: readonly NativeSettingsSearchSpan[];
	descMatch: readonly NativeSettingsSearchSpan[];
	score: number;
}

export interface NativeSettingsSearchGroup {
	tab: string;
	/** Nombre visible del tab (`tab.name` nativo; `tab` es el id/clave). */
	tabName: string;
	page: string;
	pagePath: string;
	/** Datos canónicos del tab/page del runtime nativo (1.13.7+). */
	tabIcon?: string;
	pageDesc?: string;
	pageType?: string;
	tabNameMatch: readonly NativeSettingsSearchSpan[];
	results: readonly NativeSettingsSearchItem[];
	bestScore: number;
}

/**
 * Referencia a la identidad nativa que originó una fila `node_settings`.
 * Una fila ambigua (sin plugin resoluble) NO se proyecta como tag ni como
 * plugin: va a `node_settings` con texto+highlights. Los tags no tienen
 * fechas en `TagMeta` y la intercepción sin `tagPath` canónico está
 * bloqueada, así que aquí no hay proyección de tags.
 */
export interface SettingsBridgeRef {
	tab: string;
	page: string;
	pagePath: string;
	definition: string;
}

/** Identidad estable de una fila `node_settings` (tripleta nativa). */
export function settingsBridgeIdentity(ref: SettingsBridgeRef): string {
	return `${ref.tab}::${ref.page}::${ref.definition}`;
}

/** Id de fila para una identidad de settings (nunca un id de entidad plugin). */
export function settingsBridgeRowId(ref: SettingsBridgeRef): string {
	return `settings:${settingsBridgeIdentity(ref)}`;
}

/** Id de fila para un grupo nativo (tab + pagePath, sin definition). */
export function settingsBridgeGroupRowId(tab: string, pagePath: string): string {
	return `settings:${tab}::${pagePath}::`;
}

/**
 * Meta de una fila del puente: un `PluginMeta` válido más el sidecar
 * opcional. Las filas de plugin resoluble NO llevan `settingsRef`
 * (conservan kind `plugin` y sus celdas/acciones); las ambiguas llevan
 * `settingsRef`, `pluginId: ''` y cero celdas (`node_settings`).
 */
export type SettingsBridgeMeta = PluginMeta & {
	settingsRef?: SettingsBridgeRef;
};

export function withSettingsRef(
	meta: PluginMeta,
	ref: SettingsBridgeRef,
): SettingsBridgeMeta {
	return { ...meta, settingsRef: ref };
}

/** `null` en vez de lanzar: una meta sin sidecar es una fila plugin normal. */
export function settingsBridgeRefOf(
	meta: PluginMeta,
): SettingsBridgeRef | null {
	const ref = (meta as SettingsBridgeMeta).settingsRef;
	if (!ref) return null;
	if (
		typeof ref.tab !== 'string' ||
		typeof ref.page !== 'string' ||
		typeof ref.pagePath !== 'string' ||
		typeof ref.definition !== 'string'
	) {
		return null;
	}
	return ref;
}
