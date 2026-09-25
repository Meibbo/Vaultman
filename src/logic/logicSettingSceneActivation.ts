import type { App } from 'obsidian';
import type { SettingSceneGoToTarget } from '../types/typeSettings';
import { SETTING_SCENE_GO_TO_TARGETS } from '../types/typeSettings';
import { openPluginSettings } from './logicAddonCells';

interface RuntimeSettingManager {
	open?: () => void;
	openTabById?: (id: string) => unknown;
	/** Helper nativo del spike: reveal de fila exacta en settings search. */
	navigateToSearchResult?: (group: unknown, item?: unknown) => void;
	/** Helper nativo del spike: scroll a definition por identidad. */
	scrollToDefinition?: (tab: unknown, definition: unknown) => void;
	/** Índice nativo de settings (re-búsqueda en activación, sin perder identidad). */
	searchIndex?: { search?: (query: string) => unknown[] } | null;
}

interface AppWithRuntimeSettings extends App {
	setting?: RuntimeSettingManager;
}

function runtimeSettings(app: App): RuntimeSettingManager | undefined {
	return (app as AppWithRuntimeSettings).setting;
}

/**
 * U130 parity C (F5): normaliza el destino del `go_to` de `input=open`.
 * Cualquier valor ajeno (dato guardado corrupto, versión futura) cae al
 * default `modal`: el click nunca queda en un estado imposible.
 */
export function normalizeSettingSceneGoToTarget(
	value: unknown,
): SettingSceneGoToTarget {
	return SETTING_SCENE_GO_TO_TARGETS.includes(
		value as SettingSceneGoToTarget,
	) && value === 'panel_content'
		? 'panel_content'
		: 'modal';
}

/**
 * U130 parity C (F5): abre el tab de settings EXACTO por id nativo
 * (`node_settings` → `openTabById(ref.tab)`).
 *
 * Espejo de `openPluginSettings` sin el gate de plugin-tab: los tabs
 * nativos (`editor`, `hotkeys`, …) no están en `pluginTabs` pero sí son
 * direccionables por `openTabById`. `logicAddonCells.ts` queda intacto;
 * este helper vive aquí, en el carril que lo usa.
 *
 * Page-level: la API pública nativa solo direcciona tabs
 * (`openTabById(id)`); la page dentro del tab no es direccionable sin el
 * executor de design-01 (fuera de alcance de este carril). Abrir el tab
 * exacto es el máximo direccionable hoy; nunca un click muerto.
 */
export function openSettingsTabById(app: App, tabId: string): boolean {
	if (!tabId) return false;
	const settings = runtimeSettings(app);
	if (!settings?.open || !settings.openTabById) return false;
	settings.open();
	settings.openTabById(tabId);
	return true;
}

/** Fila mínima que la activación necesita resolver (sin DOM). */
export interface SettingSceneActivatableRow {
	/** `pluginId` no vacío = fila `node_plugin`; vacío = `node_settings`. */
	pluginId: string;
	/** Tab nativo de la fila (`ref.tab` en `node_settings`, pluginId si aplica). */
	settingsTab: string;
	/** La fila `node_plugin` tiene tab registrado en `app.setting.pluginTabs`. */
	hasPluginTab: boolean;
	/** Page nativa (`ref.page`); opcional, solo `node_settings` exacto. */
	settingsPage?: string;
	/** PagePath nativo (`ref.pagePath`); opcional, solo `node_settings` exacto. */
	settingsPagePath?: string;
	/** Definition nativa (`ref.definition`); opcional, exact-destination. */
	settingsDefinition?: string;
}

/** Destino exacto dentro del tab ya abierto (page/definition targeting). */
export interface SettingSceneTarget {
	/** Tab nativo de la fila (ref.tab). */
	tab: string;
	page: string;
	pagePath: string;
	definition: string;
}

export type SettingSceneActivation =
	| { kind: 'open-plugin-tab'; pluginId: string }
	| { kind: 'open-settings-tab'; tab: string; target?: SettingSceneTarget }
	| {
			kind: 'select-only';
			reason:
				| 'plugin-without-tab'
				| 'settings-without-tab'
				| 'settings-api-missing';
	  };

/**
 * U130 parity C (F5): resuelve qué hace la activación en modo `open`.
 *
 * - `node_plugin` con tab registrado → su tab (`openPluginSettings` path).
 * - `node_settings` con `ref.tab` no vacío → el tab exacto
 *   (`openTabById(ref.tab)` path) + targeting exacto opcional
 *   (U130 parity NAV: `target` con page/pagePath/definition cuando la
 *   fila los trae; el executor abre el tab y luego localiza + scroll +
 *   highlight; row-not-found cae a tab-only abierto, nunca un click
 *   muerto).
 * - Sin destino resoluble → `select-only` (el click nunca muere: cae a
 *   selección). Formas sin destino: plugin sin tab registrado
 *   (`plugin-without-tab`: plugin sin settings o tab aún no montado),
 *   settings sin tab (`settings-without-tab`: `ref.tab === ''`, p. ej. el
 *   padre nativo terminal `settings:<tab>::<pagePath>::` con definition
 *   vacía), o API nativa ausente (`settings-api-missing`: sin
 *   `app.setting.open/openTabById`, p. ej. en tests o mocks parciales).
 *
 * Compat: sin page/definition en la fila no se emite `target` (la forma
 * `{kind:'open-settings-tab', tab}` intacta; los tests F5 existentes
 * siguen pasando).
 *
 * File/folder/secret: filas `node_settings` como las demás en este
 * carril (modal nativo con targeting exacto); el modo content las
 * mantiene como `unsupported-surface` (ver `logicSettingSceneContent`),
 * por decisión dev quedan en el modal nativo.
 *
 * Las cabeceras de grupo no llegan aquí: las atiende `_activateGroupRow`
 * (toggle en `open`, como una carpeta). El modo `select` tampoco: su
 * comportamiento queda intacto.
 */
export function resolveSettingSceneActivation(input: {
	row: SettingSceneActivatableRow;
	settingApiAvailable: boolean;
}): SettingSceneActivation {
	if (!input.settingApiAvailable) {
		return { kind: 'select-only', reason: 'settings-api-missing' };
	}
	if (input.row.pluginId !== '') {
		if (!input.row.hasPluginTab) {
			return { kind: 'select-only', reason: 'plugin-without-tab' };
		}
		return { kind: 'open-plugin-tab', pluginId: input.row.pluginId };
	}
	if (input.row.settingsTab === '') {
		return { kind: 'select-only', reason: 'settings-without-tab' };
	}
	const page = input.row.settingsPage ?? '';
	const pagePath = input.row.settingsPagePath ?? '';
	const definition = input.row.settingsDefinition ?? '';
	if (page === '' && pagePath === '' && definition === '') {
		return { kind: 'open-settings-tab', tab: input.row.settingsTab };
	}
	return {
		kind: 'open-settings-tab',
		tab: input.row.settingsTab,
		target: { tab: input.row.settingsTab, page, pagePath, definition },
	};
}

/** La API nativa mínima para abrir el modal (`open` + `openTabById`). */
export function hasSettingOpenApi(app: App): boolean {
	const settings = runtimeSettings(app);
	return !!settings?.open && !!settings.openTabById;
}

/**
 * U130 parity NAV (spike Help PASS): localiza la fila exacta dentro del
 * tab ya abierto usando el helper nativo del spike
 * (`navigateToSearchResult` / `scrollToDefinition`), con identidad
 * cruda de `searchIndex.search` (no strings del adaptador).
 *
 * - Con `definition` no vacía: busca nativamente el grupo + item,
 *   llama `navigateToSearchResult(group, item)` (reveal exacto).
 * - Sin definition pero con page/pagePath: busca el grupo nativo,
 *   llama `navigateToSearchResult(group)` (tab+page, sin reveal).
 * - Sin nada que buscar → `false` (el llamador ya abrió el tab:
 *   cae a tab-only, nunca un click muerto).
 * - Sin API nativa o sin resultados → `false` (degradado: el tab
 *   ya quedó abierto por el llamador).
 */
export function scrollToSettingTarget(
	app: App,
	target: SettingSceneTarget,
): boolean {
	const settings = runtimeSettings(app);
	const navigate = settings?.navigateToSearchResult;
	const searchIndex = settings?.searchIndex;
	if (!navigate || !searchIndex?.search) return false;
	const def = (target.definition ?? '').trim();
	const pageLabel = (target.page || target.pagePath || '').trim();
	const query = def || pageLabel;
	if (!query) return false;
	try {
		const results = searchIndex.search.call(searchIndex, query);
		if (!Array.isArray(results)) return false;
		for (const group of results) {
			if (!group || typeof group !== 'object') continue;
			const groupTab = (group as { tab?: string })['tab'];
			if (!groupTab) continue;
			if (target.tab && groupTab !== target.tab) continue;
			const rawResults = (group as { results?: unknown[] })['results'];
			if (!Array.isArray(rawResults)) continue;
			if (def) {
				for (const item of rawResults) {
					if (!item || typeof item !== 'object') continue;
					const entry = (item as { entry?: unknown })['entry'];
					if (!entry || typeof entry !== 'object') continue;
					const entryDef = (entry as { definition?: string })['definition'];
					if (entryDef === def) {
						navigate(group, item);
						return true;
					}
				}
			} else {
				const groupPage = (group as { page?: string })['page'];
				if (groupPage && groupPage.includes(pageLabel)) {
					navigate(group);
					return true;
				}
			}
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * U130 parity C (F5) + NAV exact-destination: ejecuta la activación
 * resuelta. Devuelve `true` si abrió el modal nativo, `false` si el
 * llamador debe aplicar el fallback de selección (`select-only` o
 * apertura fallida: nunca un click muerto).
 *
 * - `open-settings-tab` con `target`: abre el tab y luego intenta el
 *   scroll+highlight exacto (best-effort); row-not-found → tab-only
 *   abierto (`true` igualmente, nunca un click muerto).
 * - File/folder/secret: mismo path modal (el content los mantiene como
 *   `unsupported-surface`; aquí siempre modal nativo).
 *
 * `logicAddonCells.openPluginSettings` se reutiliza tal cual (keep intact).
 */
export function executeSettingSceneActivation(
	app: App,
	activation: SettingSceneActivation,
): boolean {
	if (activation.kind === 'open-plugin-tab') {
		return openPluginSettings(app, activation.pluginId);
	}
	if (activation.kind === 'open-settings-tab') {
		const opened = openSettingsTabById(app, activation.tab);
		if (!opened) return false;
		if (activation.target) {
			try {
				scrollToSettingTarget(app, activation.target);
			} catch {
				// Best-effort: el tab ya quedó abierto.
			}
		}
		return true;
	}
	return false;
}
