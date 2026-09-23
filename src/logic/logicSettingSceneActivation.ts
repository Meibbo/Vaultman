import type { App } from 'obsidian';
import type { SettingSceneGoToTarget } from '../types/typeSettings';
import { SETTING_SCENE_GO_TO_TARGETS } from '../types/typeSettings';
import { openPluginSettings } from './logicAddonCells';

interface RuntimeSettingManager {
	open?: () => void;
	openTabById?: (id: string) => unknown;
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
}

export type SettingSceneActivation =
	| { kind: 'open-plugin-tab'; pluginId: string }
	| { kind: 'open-settings-tab'; tab: string }
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
 *   (`openTabById(ref.tab)` path).
 * - Sin destino resoluble → `select-only` (el click nunca muere: cae a
 *   selección). Formas sin destino: plugin sin tab registrado
 *   (`plugin-without-tab`: plugin sin settings o tab aún no montado),
 *   settings sin tab (`settings-without-tab`: `ref.tab === ''`, p. ej. el
 *   padre nativo terminal `settings:<tab>::<pagePath>::` con definition
 *   vacía), o API nativa ausente (`settings-api-missing`: sin
 *   `app.setting.open/openTabById`, p. ej. en tests o mocks parciales).
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
	return { kind: 'open-settings-tab', tab: input.row.settingsTab };
}

/** La API nativa mínima para abrir el modal (`open` + `openTabById`). */
export function hasSettingOpenApi(app: App): boolean {
	const settings = runtimeSettings(app);
	return !!settings?.open && !!settings.openTabById;
}

/**
 * U130 parity C (F5): ejecuta la activación resuelta. Devuelve `true` si
 * abrió el modal nativo, `false` si el llamador debe aplicar el fallback
 * de selección (`select-only` o apertura fallida: nunca un click muerto).
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
		return openSettingsTabById(app, activation.tab);
	}
	return false;
}
