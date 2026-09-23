import type { SettingsBridgeRef } from '../types/typeSettingsSearch';

/**
 * U130 parity C (F6): modo scene-local de settingScene.
 *
 * `explorer` (default) proyecta el árbol; `content` renderiza el
 * `node_settings` seleccionado vía el puente del renderer (semántica
 * design-02, reimplementada mínima desde el texto de la spec — sin
 * imports del scratch del spike). `input=open` sigue yendo al modal por
 * defecto (F5) con independencia de este modo.
 */
export const SETTING_SCENE_MODES = ['explorer', 'content'] as const;
export type SettingSceneMode = (typeof SETTING_SCENE_MODES)[number];

export function normalizeSettingSceneMode(value: unknown): SettingSceneMode {
	return value === 'content' ? 'content' : 'explorer';
}

/** Payload del botón toggle explorer/content del toolbar (checked state). */
export interface SettingSceneModeToggle {
	/** Id estable para que el navbar lo cablee al toolbar de la scene. */
	id: 'setting-scene-mode';
	icon: 'lucide-panel-right';
	labelKey: 'sasi.settingScene.action.go_to_setting_content';
	/** `true` en modo content (botón marcado), `false` en explorer. */
	checked: boolean;
	mode: SettingSceneMode;
}

/**
 * U130 parity C (F6): descriptor del toggle para el toolbar. El cableado
 * al `navbarFilters`/`navbarPanelWidgetHost` lo hace el merge coordinador;
 * aquí viven el estado y su payload con checked (contrato testeable).
 */
export function settingSceneModeToggle(
	mode: SettingSceneMode,
): SettingSceneModeToggle {
	return {
		id: 'setting-scene-mode',
		icon: 'lucide-panel-right',
		labelKey: 'sasi.settingScene.action.go_to_setting_content',
		checked: mode === 'content',
		mode,
	};
}

/** Clase de fila que alimenta al modo content. */
export type SettingSceneContentRowKind =
	| 'settings'
	| 'plugin'
	| 'group'
	| 'none';

export type SettingSceneContentStatus = 'ready' | 'unavailable';

/**
 * Estados unavailable explícitos (design-02 + spec-04 §aceptación-5):
 * - `no-selection`: nada seleccionado (o la fila ya no existe).
 * - `group-node`: cabecera/padre nativo, no es un setting direccionable.
 * - `plugin-node`: fila `node_plugin` sin `settingsRef`; el contenido a
 *   nivel de tab exige el executor de design-01 (fuera de alcance: OQ1/OQ3
 *   gatean el paso CREATE). Explícito, no a medio construir.
 * - `tab-removed`: el tab ya no está en `app.setting` (revalidación
 *   `tabRef()` de design-01 §1.3 a nivel de tab).
 * - `definition-missing`: la definición no se resolvió (scrape/render
 *   fallido o tab regenerado).
 * - `hidden-setting`: `visible === false` → no se renderiza ni se abre
 *   por ref (semántica C2/U2 de design-02).
 * - `unsupported-surface`: controles `file`/`folder`/`secret` (límite duro
 *   de design-02: clases internas no exportadas del bundle nativo,
 *   `SpikeUnsupportedError` en el scratch).
 */
export type SettingSceneContentReason =
	| 'no-selection'
	| 'group-node'
	| 'plugin-node'
	| 'tab-removed'
	| 'definition-missing'
	| 'hidden-setting'
	| 'unsupported-surface';

/** Superficies que el renderer externo no puede reproducir (design-02). */
const UNSUPPORTED_SETTING_SURFACES = ['file', 'folder', 'secret'] as const;

/** Definición nativa mínima que el renderer necesita evaluar. */
export interface SettingSceneDefinitionInfo {
	/** `false` = no renderizar ni abrir por ref (design-02 C2). */
	visible?: boolean;
	/** `false` = fuera del índice pero abrible desde ref válida. */
	searchable?: boolean;
	/** Tipo de control (`toggle`, `text`, `file`, `folder`, `secret`, …). */
	control?: string;
}

export interface SettingSceneContentModel {
	status: SettingSceneContentStatus;
	/** Solo en `unavailable`: por qué no hay contenido. */
	reason?: SettingSceneContentReason;
	/** Identidad nativa que originó el contenido (eco para el panel). */
	ref: SettingsBridgeRef | null;
	/** Etiqueta visible de la fila seleccionada (eco para el panel). */
	label: string | null;
	/**
	 * Assumpciones aplicadas si el dev está en silencio (parity F6):
	 * workspace = el de la instancia dueña; popout = adjuntar al documento
	 * del popout (evidencia Gate 2b de design-01). El executor real (paso
	 * CREATE) sigue pendiente de OQ1/OQ3: este puente no reparenta DOM.
	 */
	assumptions: readonly string[];
}

const CONTENT_ASSUMPTIONS = [
	'workspace: owning instance workspace (OQ1 default)',
	'popout: attach to popout document (Gate 2b evidence, OQ3 default)',
] as const;

/**
 * U130 parity C (F6): resuelve el modelo de contenido para la selección.
 *
 * Semántica design-02 reimplementada mínima:
 * - `visible === false` → unavailable `hidden-setting` (ni render ni ref).
 * - `searchable === false` → sigue `ready` desde ref válida (exclusión
 *   solo del índice).
 * - `control` en `file`/`folder`/`secret` → unavailable
 *   `unsupported-surface` (límite duro: omitir con estado, no scrape HTML
 *   como renderer principal — spec-04).
 * - Tab ausente / definición nula → `tab-removed` / `definition-missing`.
 *
 * Puro y testeable: el explorer lo alimenta con la selección + lecturas
 * del runtime (`pluginTabs` para `tabAvailable`, definición si el nativo
 * la expone); sin runtime, el modelo cae a unavailable explícito.
 */
export function resolveSettingSceneContent(input: {
	rowKind: SettingSceneContentRowKind;
	ref: SettingsBridgeRef | null;
	label: string | null;
	tabAvailable: boolean;
	definition: SettingSceneDefinitionInfo | null;
}): SettingSceneContentModel {
	const base = {
		ref: input.ref,
		label: input.label,
		assumptions: CONTENT_ASSUMPTIONS,
	};
	if (input.rowKind === 'none') {
		return { status: 'unavailable', reason: 'no-selection', ...base };
	}
	if (input.rowKind === 'group') {
		return { status: 'unavailable', reason: 'group-node', ...base };
	}
	if (input.rowKind === 'plugin') {
		return { status: 'unavailable', reason: 'plugin-node', ...base };
	}
	if (input.ref === null) {
		return { status: 'unavailable', reason: 'no-selection', ...base };
	}
	if (!input.tabAvailable) {
		return { status: 'unavailable', reason: 'tab-removed', ...base };
	}
	if (input.definition === null) {
		return { status: 'unavailable', reason: 'definition-missing', ...base };
	}
	if (input.definition.visible === false) {
		return { status: 'unavailable', reason: 'hidden-setting', ...base };
	}
	if (
		input.definition.control !== undefined &&
		(
			UNSUPPORTED_SETTING_SURFACES as readonly string[]
		).includes(input.definition.control)
	) {
		return {
			status: 'unavailable',
			reason: 'unsupported-surface',
			...base,
		};
	}
	return { status: 'ready', ...base };
}
