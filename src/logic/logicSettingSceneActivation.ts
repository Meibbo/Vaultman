import type { App } from 'obsidian';
import type { SettingSceneGoToTarget } from '../types/typeSettings';
import { SETTING_SCENE_GO_TO_TARGETS } from '../types/typeSettings';
import { openPluginSettings } from './logicAddonCells';

interface RuntimeSettingManager {
	open?: () => void;
	openTabById?: (id: string) => unknown;
	navigateToSearchResult?: (group: unknown, item?: unknown) => void;
	searchIndex?: { search?: (query: string) => unknown } | null;
}

interface AppWithRuntimeSettings extends App {
	setting?: RuntimeSettingManager;
}

function runtimeSettings(app: App): RuntimeSettingManager | undefined {
	return (app as AppWithRuntimeSettings).setting;
}

export function nativeSettingsTabId(tabId: string): string {
	const key = tabId.trim().toLowerCase();
	if (key === 'general') return 'about';
	if (key === 'files and links' || key === 'files') return 'file';
	if (key === 'core-plugins') return 'plugins';
	return tabId;
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
	settings.openTabById(nativeSettingsTabId(tabId));
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
	const tab = nativeSettingsTabId(input.row.settingsTab);
	if (page === '' && pagePath === '' && definition === '') {
		return { kind: 'open-settings-tab', tab };
	}
	return {
		kind: 'open-settings-tab',
		tab,
		target: { tab, page, pagePath, definition },
	};
}

/** La API nativa mínima para abrir el modal (`open` + `openTabById`). */
export function hasSettingOpenApi(app: App): boolean {
	const settings = runtimeSettings(app);
	return !!settings?.open && !!settings.openTabById;
}

type NativeNavigationResult = 'exact' | 'not-found' | 'error';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function nativeId(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	return typeof value['id'] === 'string' ? value['id'] : '';
}

function nativeName(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!isRecord(value)) return '';
	return typeof value['name'] === 'string' ? value['name'] : '';
}

function nativePagePath(value: unknown): readonly string[] {
	if (!Array.isArray(value)) return [];
	return value.map(nativeName).filter((part) => part !== '');
}

function navigateToSettingTarget(
	app: App,
	target: SettingSceneTarget,
): NativeNavigationResult {
	const settings = runtimeSettings(app);
	const navigate = settings?.navigateToSearchResult;
	const searchIndex = settings?.searchIndex;
	if (!navigate || !searchIndex?.search) return 'not-found';
	const def = target.definition.trim();
	const pageNames = new Set(
		[
			target.page.trim(),
			target.pagePath.trim(),
			...target.pagePath.split(' > ').map((s) => s.trim()),
		].filter((value) => value !== ''),
	);
	const queries = def !== '' ? [def] : [...pageNames];
	if (queries.length === 0) return 'not-found';
	try {
		for (const query of queries) {
			const results = searchIndex.search.call(searchIndex, query);
			if (!Array.isArray(results)) continue;
			for (const group of results) {
				if (!isRecord(group)) continue;
				if (
					nativeSettingsTabId(nativeId(group['tab'])) !==
					nativeSettingsTabId(target.tab)
				) {
					continue;
				}
				const pagePath = nativePagePath(group['pagePath']);
				if (
					(target.pagePath.trim() !== '' && pagePath.join(' > ') !== target.pagePath.trim()) ||
					(target.pagePath.trim() === '' && target.page.trim() !== '' &&
					 nativeName(group['page']) !== target.page.trim() &&
					 pagePath.at(-1) !== target.page.trim())
				) {
					continue;
				}
				const rawResults = group['results'];
				if (def !== '') {
					if (!Array.isArray(rawResults)) continue;
					for (const item of rawResults) {
						if (!isRecord(item)) continue;
						const entry = item['entry'];
						if (!isRecord(entry)) continue;
						if (nativeName(entry['definition']) !== def) continue;
						navigate.call(settings, group, item);
						return 'exact';
					}
					continue;
				}
				navigate.call(settings, group);
				return 'exact';
			}
		}
		return 'not-found';
	} catch {
		return 'error';
	}
}

export function scrollToSettingTarget(
	app: App,
	target: SettingSceneTarget,
): boolean {
	return navigateToSettingTarget(app, target) === 'exact';
}

export type SettingSceneActivationOutcome =
	| {
			status: 'success';
			destination: 'plugin-tab' | 'settings-tab' | 'settings-row';
	  }
	| {
			status: 'degraded';
			reason: 'target-not-found' | 'native-navigation-failed';
	  }
	| { status: 'failed' };

export function executeSettingSceneActivation(
	app: App,
	activation: SettingSceneActivation,
): SettingSceneActivationOutcome {
	if (activation.kind === 'open-plugin-tab') {
		return openPluginSettings(app, activation.pluginId)
			? { status: 'success', destination: 'plugin-tab' }
			: { status: 'failed' };
	}
	if (activation.kind === 'open-settings-tab') {
		if (!activation.target) {
			return openSettingsTabById(app, activation.tab)
				? { status: 'success', destination: 'settings-tab' }
				: { status: 'failed' };
		}
		const settings = runtimeSettings(app);
		if (!settings?.open || !settings.openTabById) return { status: 'failed' };
		settings.open();
		const navigation = navigateToSettingTarget(app, activation.target);
		if (navigation === 'exact') {
			return { status: 'success', destination: 'settings-row' };
		}
		settings.openTabById(nativeSettingsTabId(activation.tab));
		return {
			status: 'degraded',
			reason:
				navigation === 'error'
					? 'native-navigation-failed'
					: 'target-not-found',
		};
	}
	return { status: 'failed' };
}
